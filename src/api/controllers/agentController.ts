import express from "express";
import { elizaLogger, validateCharacterConfig } from "@elizaos/core";
import db from "../../models/index.js";
import { stringToUuid } from "@elizaos/core";
import { GoalType } from "../../database/enum-database.js";
import { goalsToElizaGoals, personalityToCharacter } from "../../services/openAiService.js";
import { TwitterCheckOnly } from "foru-client-twitter";

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

  router.post("/agents/:agentId/twitter/cookies", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      let agent = agents.get(agentId);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      console.log("inisiagent");
      console.log(agent);
      const character = JSON.parse(JSON.stringify(agent.character));
      delete character.id;

      character.settings.secrets = {
        ...character.settings.secrets,
        ...req.body.cookies
      };

      const agentProxy = await db.AgentProxy.findOne({
        where: { agentId: null },
        attributes: ["id", "host", "port", "username", "password"],
        raw: true
      });

      // character.settings.secrets.TWITTER_SOCKS_PROXY = "socks5://rduuoqxa-id-31:87njuuziu5v6@p.webshare.io:80"
      character.settings.secrets.TWITTER_SOCKS_PROXY = `socks5://${agentProxy.username}:${agentProxy.password}@${agentProxy.host}:${agentProxy.port}`;

      // if (!character.clients.includes("twitter")) {
      //   character.clients.push("twitter");
      // }

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

      await db.AgentProxy.update(
        { agentId: agentId, updatedAt: new Date() },
        { where: { id: agentProxy.id } }
      );

      if (agent) {
        agent.stop();
        directClient.unregisterAgent(agent);
      }
      // (Assuming startAgent returns a promise for a new agent)
      agent = await directClient.startAgent(character);
      elizaLogger.log(`${character.name} started`);

      res.json({ id: character.id, status: "OK", character });
    } catch (e) {
      elizaLogger.error(`Error processing cookies update: ${e}`);
      res.status(400).json({
        id: req.params.agentId,
        success: false,
        message: e.message,
        character: null 
      });
    };
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

  // POST /agents-create — create a new agent
  router.post("/agents-create", async (req, res) => {
    try {
      const { goals, ...unprocessedCharacter } = req.body;

      const [character, elizaGoals] = await Promise.all([
        personalityToCharacter(unprocessedCharacter),
        goalsToElizaGoals(goals),
      ]);

      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name },
      });
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
        config_value: elizaGoals,
      });

      elizaLogger.log(`${character.name} secondary goals inserted`);
      res.status(201).json({ id: agentResult.agentID, character });
    } catch (e) {
      elizaLogger.error(`Error processing create character: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message,
      });
      return;
    }
  });

  // POST /agents/:agentId/twitter/check-cookies — check Twitter cookies valid or not
  router.post("/agents/:agentId/twitter/check-cookies", async (req, res) => {
    const agentId = req.params.agentId;
    const runtime = agents.get(agentId);
    if (!runtime) {
      res.status(404).send("Agent not found");
      return;
    }
    const { auth_token, ct0, guest_id } = req.body;
    try {
      const resultLogin = await TwitterCheckOnly.checkCookies(
        runtime,
        auth_token,
        ct0,
        guest_id
      );
      elizaLogger.info("Twitter login result: ", resultLogin);
      res.json({ resultLogin });
    } catch (error) {
      elizaLogger.error("Error checking cookies:", error);
      res.status(500).json({ error: "Failed to check cookies" });
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
