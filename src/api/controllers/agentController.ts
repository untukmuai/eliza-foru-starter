import express from "express";
import { elizaLogger, validateCharacterConfig } from "@elizaos/core";
import db from "../../models/index.js";
import { stringToUuid } from "@elizaos/core";
import { GoalType } from "../../database/enum-database.js";
import { readFile } from "fs/promises";
import OpenAI from 'openai'
import { character } from "../../character.js";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
})

const router = express.Router();

const agentsRoutes = (agents: Map<any, any>, directClient: any) => {

  // GET /agents — list all agents
  router.get("/agents", (req, res) => {
    const agentsList = Array.from(agents.values()).map((agent) => ({
      id: agent.agentId,
      name: agent.character.name,
      clients: Object.keys(agent.clients),
    }));
    res.json({ agents: agentsList });
  });

  // GET /agents/:agentId — get a specific agent
  router.get("/agents/:agentId", (req, res) => {
    const agentId = req.params.agentId;
    const agent = agents.get(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({
      id: agent.agentId,
      character: agent.character,
    });
  });

  // POST /agents/:agentId/set — update an agent’s character config
  router.post("/agents/:agentId/set", async (req, res) => {
    const agentId = req.params.agentId;
    elizaLogger.debug(`Update character config: ${agentId}`);
    let agent = await agents.get(agentId);
    const character = req.body;
    try {
      elizaLogger.debug(`Validate character config payload: ${character.name}`);
      await validateCharacterConfig(character);
      elizaLogger.debug(`Character config validated: ${character.name}`);

      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name },
      });
      if (!characterConfig) {
        throw new Error(
          `CharacterConfig with name "${character.name}" not found.`
        );
      }

      await db.CharacterConfig.update(
        { character, updatedAt: new Date() },
        { where: { name: character.name } }
      );
      elizaLogger.info(`CharacterConfig updated: ${character.name}`);

      if (agent) {
        agent.stop();
        directClient.unregisterAgent(agent);
      }
      // (Assuming startAgent returns a promise for a new agent)
      agent = await directClient.startAgent(character);
      elizaLogger.log(`${character.name} started`);

      res.json({ id: character.id, character });
    } catch (e) {
      elizaLogger.error(`Error processing character update: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message,
      });
    }
  });

  async function goalsToElizaGoals(goals) {
    const elizaGoals = await readFile('src/api/data/sample/goals.json', 'utf8');
    const chatCompletion = await client.chat.completions.create({
      response_format:{type:"json_object"},
      messages: [
        {
          role:"system",
          content: "You are a helpful assistant designed to process previous narrative goals to the subsequent json format."
        },
        {
          role:"user",
          content: `
          Convert this narrative goal               

          ${goals}

          To this format (these values only as example).
          
          ${elizaGoals}
          `
        }
      ],
      model: "gpt-4o-mini"
    });
    const responseText = chatCompletion.choices[0].message.content;
    const mainResult = JSON.parse(responseText);
    return mainResult.secondary_goals
  };

  async function personalityToCharacter(theContent) {
    const char = await readFile('src/api/data/sample/character.json', 'utf8');
    const chatCompletion = await client.chat.completions.create({
      response_format:{type:"json_object"},
      messages: [
        {
          role:"system",
          content: "You are a helpful assistant designed to process previous json to the subsequent given json format."
        },
        {
          role:"user",
          content: `
          given an agent data that will be created inside a community in a json format we have
          
          Agent Name: ${theContent.agent_name}
          Personality: ${theContent.agent_personality}
          Agent's Traits: ${theContent.traits.join(' ')}
          Agent's Tone of Voice: ${theContent.tone_voice.join(' ')}
          Community Name: ${theContent.community_name}
          Community Description: ${theContent.community_description}
          
          filled up this character.json values.
          Use this format (this and the value only as example). 
          ${char}
          Generate 3-6 question-answer examples (messageExamples)
          `
        }
      ],
      model: "gpt-4o-mini"
    });
    const responseText = chatCompletion.choices[0].message.content;
    const mainResult = JSON.parse(responseText);
    const additional = {
      clients: ["direct"],
      modelProvider: "openai",
      plugins: []
    };
    const finalResult = { ...mainResult, ...additional};
    return finalResult
  };

  // POST /agents-create — create a new agent
  router.post("/agents-create", async (req, res) => {
    try {
      const { unprocessedGoals, ...unprocessedCharacter } = req.body;

      const [character, elizaGoals] = await Promise.all([
        personalityToCharacter(unprocessedCharacter);
        goalsToElizaGoals(unprocessedGoals);
      ]);
      
      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name},
      })
      if (characterConfig) {
        throw new Error(
          `CharacterConfig with name '${character.name}' already exists.`
        );
      }
      await validateCharacterConfig(character);
      await db.CharacterConfig.create({
        name: character.name,
        character,
      });

      const agentResult = await directClient.startAgent(character);
      elizaLogger.log(`${character.name} started`);

      await db.AgentConfig.create({
        agent_id: agentResult.agentId,
        config_key: GoalType.SECONDARY,
        config_value: elizaGoals
      });

      elizaLogger.log(`${character.name} secondary goals inserted`);
      res.json(201).json({ id: agentResult.agentID, character });
    } catch (e) {
      elizaLogger.error(`Error processing create character: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message,
      });
      return;
    }
  });

  // GET /agents/:agentId/:roomId/memories — retrieve agent memories
  router.get("/agents/:agentId/:roomId/memories", async (req, res) => {
    const agentId = req.params.agentId;
    const roomId = stringToUuid(req.params.roomId);
    let runtime = agents.get(agentId);
    if (!runtime) {
      runtime = Array.from(agents.values()).find(
        (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
      );
    }
    if (!runtime) {
      res.status(404).send("Agent not found");
      return;
    }
    try {
      const memories = await runtime.messageManager.getMemories({ roomId });
      const response = {
        agentId,
        roomId,
        memories: memories.map((memory) => ({
          id: memory.id,
          userId: memory.userId,
          agentId: memory.agentId,
          createdAt: memory.createdAt,
          content: memory.content,
          embedding: memory.embedding,
          roomId: memory.roomId,
          unique: memory.unique,
          similarity: memory.similarity,
        })),
      };
      res.json(response);
    } catch (error) {
      elizaLogger.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  return router;
};
export default agentsRoutes;
