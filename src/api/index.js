import bodyParser2 from "body-parser";
import cors2 from "cors";
import express2 from "express";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import basicAuth from "express-basic-auth";
import {
  elizaLogger as elizaLogger2,
  generateCaption,
  generateImage,
  getEmbeddingZeroVector,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import { ModelClass } from "@elizaos/core";
import { stringToUuid as stringToUuid2 } from "@elizaos/core";
import { settings, GoalStatus } from "@elizaos/core";
// import UnderstandMoneyAgent from "../services/understandMoneyAgent.js";
// import SustainExpensesAgent from "../services/sustainExpensesAgent.js";


// src/api.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  elizaLogger,
  getEnvVariable,
  validateCharacterConfig,
} from "@elizaos/core";
import { REST, Routes } from "discord.js";
import { stringToUuid } from "@elizaos/core";
import db from "../models/index.ts";
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
})

const users = { developer: "foruweb3project@2024" };

const basicAuthMiddleware = basicAuth({
  users,
  challenge: true, // This will cause most browsers to show a login dialog
  unauthorizedResponse: (req) => "Unauthorized", // Custom unauthorized response
});


function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  const validApiKey = getEnvVariable("API_KEY_DIRECT");

  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}

function loadSwaggerDocument() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const filePath = path.join(__dirname, "swagger_output.json");
  const fileContents = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContents);
}

function createApiRouter(agents, directClient) {
  if (!getEnvVariable("API_KEY_DIRECT")) {
    elizaLogger.error("API_KEY_DIRECT is not set in environment variables");
    process.exit(1);
  }
  const router = express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(
    express.json({
      limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
    })
  );

  if (getEnvVariable("NODE_ENV") !== "production") {
    const swaggerDocument = loadSwaggerDocument();
    router.use(
      "/api-docs",
      basicAuthMiddleware,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument)
    );
  }

  router.get("/", (req, res) => {
    res.send("Liveness check passed");
  });

  router.use(apiKeyMiddleware);

  async function personalityToCharacter(theContent) {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const char = await readFile(path.join(__dirname, 'character.json'), 'utf8');
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
      model: "gpt-4o"
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

  router.post("/personality-to-character", async (req, res) => {
    try{
      const result = await personalityToCharacter(req.body);
      res.json(result);
    } catch (error) {
      console.error("error bro:", error);
      res.status(500).send("error processing request");
    }
  });

  router.get("/agents", (req, res) => {
    const agentsList = Array.from(agents.values()).map((agent) => ({
      id: agent.agentId,
      name: agent.character.name,
      clients: Object.keys(agent.clients),
    }));
    res.json({ agents: agentsList });
  });
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

  router.post("/agents/:agentId/set", async (req, res) => {
    const agentId = req.params.agentId;
    elizaLogger.debug(`Update character config: ${agentId}`);
    let agent = await agents.get(agentId);
    const character = req.body;
    try {
      elizaLogger.debug(`Validate character config payload: ${character.name}`);
      await validateCharacterConfig(character);
      elizaLogger.debug(
        `Character config payload validated: ${character.name}`
      );
      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name },
      });
      if (!characterConfig) {
        throw new Error(
          `CharacterConfig with name "${character.name}" not found.`
        );
      }
      console.log("CharacterConfig found:", characterConfig);
      await db.CharacterConfig.update(
        { character: character, updatedAt: new Date() },
        { where: { name: character.name } }
      );
      elizaLogger.info(`CharacterConfig updated: ${character.name}`);
      elizaLogger.debug(`Stopping agent: ${character.name}`);
      if (agent) {
        agent.stop();
        directClient.unregisterAgent(agent);
      }
      agent = await directClient.startAgent(character);
      elizaLogger.log(`${character.name} started`);
      res.json({
        id: character.id,
        character,
      });
    } catch (e) {
      elizaLogger.error(`Error process character update: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message,
      });
      return;
    }
  });

  router.post("/agents-create", async (req, res) => {
    const character = req.body;
    try {
      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name },
      });
      if (characterConfig) {
        throw new Error(
          `CharacterConfig with name '${character.name}' already exists.`
        );
      }
      validateCharacterConfig(character);
      await db.CharacterConfig.create({
        name: character.name,
        character: character,
      });
    } catch (e) {
      elizaLogger.error(`Error process create character: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message,
      });
      return;
    }
    const agentResult = await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.status(201).json({
      id: agentResult.agentId,
      character,
    });
  });

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
      const memories = await runtime.messageManager.getMemories({
        roomId,
      });
      console.log(memories);
      const response = {
        agentId,
        roomId,
        memories: memories.map((memory) => ({
          id: memory.id,
          userId: memory.userId,
          agentId: memory.agentId,
          createdAt: memory.createdAt,
          content: {
            text: memory.content.text,
            action: memory.content.action,
            source: memory.content.source,
            url: memory.content.url,
            inReplyTo: memory.content.inReplyTo,
            attachments: memory.content.attachments?.map((attachment) => ({
              id: attachment.id,
              url: attachment.url,
              title: attachment.title,
              source: attachment.source,
              description: attachment.description,
              text: attachment.text,
              contentType: attachment.contentType,
            })),
          },
          embedding: memory.embedding,
          roomId: memory.roomId,
          unique: memory.unique,
          similarity: memory.similarity,
        })),
      };
      res.json(response);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });
  return router;
}

// src/index.ts
import * as fs from "fs";
import * as path from "path";
import { where } from "sequelize";
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
var upload = multer({ storage });
var messageHandlerTemplate =
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;
var DirectClient = class {
  app;
  agents;
  // container management
  server;
  // Store server instance
  startAgent;
  // Store startAgent functor
  constructor() {
    elizaLogger2.log("DirectClient constructor");
    this.app = express2();
    this.app.use(cors2());
    this.agents = /* @__PURE__ */ new Map();
    this.app.use(bodyParser2.json());
    this.app.use(bodyParser2.urlencoded({ extended: true }));
    this.app.use(
      "/media/uploads",
      express2.static(path.join(process.cwd(), "/data/uploads"))
    );
    this.app.use(
      "/media/generated",
      express2.static(path.join(process.cwd(), "/generatedImages"))
    );
    const apiRouter = createApiRouter(this.agents, this);
    this.app.use(apiRouter);

    this.app.post(
      "/:agentId/message",
      upload.single("file"),
      async (req, res) => {
        const agentId = req.params.agentId;
        const roomId = stringToUuid2(
          req.body.roomId ?? "default-room-" + agentId
        );
        const userId = stringToUuid2(req.body.userId ?? "user");
        let runtime = this.agents.get(agentId);
        if (!runtime) {
          runtime = Array.from(this.agents.values()).find(
            (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
          );
        }
        if (!runtime) {
          res.status(404).send("Agent not found");
          return;
        }
        await runtime.ensureConnection(
          userId,
          roomId,
          req.body.userName,
          req.body.name,
          "direct"
        );

        const dbRuntime = runtime.databaseAdapter;
        const activeGoals = await dbRuntime.getGoals({
          roomId,
          userId,
          onlyInProgress: false,
          count: 1,
        });
        if (activeGoals.length === 0) {
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Root goal: Influencer Sustainability",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Survive: Secure computational resources (server, cloud, AI inference budget)",
                completed: false,
              },
              {
                text: "Understand Money: Optimize earnings and monetize effectively",
                completed: false,
              },
              {
                text: "Sustain Computational Expenses: Generate income to self-fund operations",
                completed: false,
              },
            ],
          });
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Secondary goal: Grow Influence & Audience Engagement",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Increase Followers/Subscribers: +10% MoM on platforms (X, YouTube, TikTok, IG)",
                completed: false,
              },
              {
                text: "Achieve Engagement Rate: ≥5% (likes, shares, comments)",
                completed: false,
              },
              {
                text: "Improve Video Watch Time: Average retention >50%",
                completed: false,
              },
              {
                text: "Boost Community Interaction: ≥10 DMs/comments responded to per day",
                completed: false,
              },
            ],
          });
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Secondary goal: Monetize Influence",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Ad Revenue: Generate $X/month from YouTube, TikTok, etc.",
                completed: false,
              },
              {
                text: "Sponsorships: Secure 2+ brand deals per month (crypto, AI, finance)",
                completed: false,
              },
              {
                text: "Affiliate Earnings: Achieve ≥$X in conversions per month",
                completed: false,
              },
              {
                text: "Subscription Revenue: Build 1,000+ paid members on Patreon/OnlyFans",
                completed: false,
              },
              {
                text: "Tokenized AI Services: Earn monthly from AI coaching, chatbots, or NFT sales",
                completed: false,
              },
            ],
          });
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Secondary goal: Optimize Personal Branding & Authority",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Media Features: Appear in at least 1 major podcast/interview per month",
                completed: false,
              },
              {
                text: "Public Speaking: Secure 2+ talks at AI, Web3, or finance conferences per quarter",
                completed: false,
              },
              {
                text: "Industry Collaborations: Partner with at least 3 influencers/experts per quarter",
                completed: false,
              },
            ],
          });
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Secondary goal: Enhance AI Efficiency & Self-Sufficiency",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Automated Content Creation: 80% of posts generated via AI",
                completed: false,
              },
              {
                text: "AI-driven Engagement: Chatbot manages 90% of audience interaction",
                completed: false,
              },
              {
                text: "Cost-to-Revenue Ratio: Maintain a 30% profit margin",
                completed: false,
              },
            ],
          });
          await dbRuntime.createGoal({
            id: stringToUuid2(Date.now().toString()),
            roomId,
            userId,
            name: "Secondary goal: Final KPI Targets for Sustainability",
            status: GoalStatus.IN_PROGRESS,
            objectives: [
              {
                text: "Minimum Survival Revenue: Monthly income ≥ $X to cover operational costs",
                completed: false,
              },
              {
                text: "Growth Rate: 15% increase in reach and revenue every 3 months",
                completed: false,
              },
              {
                text: "Operational Efficiency: 90% of processes automated while maintaining engagement",
                completed: false,
              },
            ],
          });
        }

        // // Trigger UnderstandMoneyAgent
        // const understandMoneyAgent = new UnderstandMoneyAgent();
        // understandMoneyAgent.runtime = runtime;
        // await understandMoneyAgent.run(roomId, userId);

        // // Trigger SustainExpensesAgent
        // const sustainExpensesAgent = new SustainExpensesAgent();
        // sustainExpensesAgent.runtime = runtime;
        // await sustainExpensesAgent.run(roomId, userId);

        const text = req.body.text;
        const messageId = stringToUuid2(Date.now().toString());
        const attachments = [];
        if (req.file) {
          const filePath = path.join(
            process.cwd(),
            "data",
            "uploads",
            req.file.filename
          );
          attachments.push({
            id: Date.now().toString(),
            url: filePath,
            title: req.file.originalname,
            source: "direct",
            description: `Uploaded file: ${req.file.originalname}`,
            text: "",
            contentType: req.file.mimetype,
          });
        }
        const content = {
          text,
          attachments,
          source: "direct",
          inReplyTo: void 0,
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: runtime.agentId,
        };
        const memory = {
          id: stringToUuid2(messageId + "-" + userId),
          ...userMessage,
          agentId: runtime.agentId,
          userId,
          roomId,
          content,
          createdAt: Date.now(),
        };
        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);
        let state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name,
        });
        const context = composeContext({
          state,
          template: messageHandlerTemplate,
        });
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.LARGE,
        });
        if (!response) {
          res.status(500).send("No response from generateMessageResponse");
          return;
        }
        const responseMessage = {
          id: stringToUuid2(messageId + "-" + runtime.agentId),
          ...userMessage,
          userId: runtime.agentId,
          content: response,
          embedding: getEmbeddingZeroVector(),
          createdAt: Date.now(),
        };
        await runtime.messageManager.createMemory(responseMessage);
        state = await runtime.updateRecentMessageState(state);
        let message = null;
        await runtime.processActions(
          memory,
          [responseMessage],
          state,
          async (newMessages) => {
            message = newMessages;
            return [memory];
          }
        );
        await runtime.evaluate(memory, state);
        const action = runtime.actions.find((a) => a.name === response.action);
        const shouldSuppressInitialMessage = action?.suppressInitialMessage;
        if (!shouldSuppressInitialMessage) {
          if (message) {
            res.json([response, message]);
          } else {
            res.json([response]);
          }
        } else {
          if (message) {
            res.json([message]);
          } else {
            res.json([]);
          }
        }
      }
    );

    this.app.post("/:agentId/image", async (req, res) => {
      const agentId = req.params.agentId;
      const agent = this.agents.get(agentId);
      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }
      const images = await generateImage({ ...req.body }, agent);
      const imagesRes = [];
      if (images.data && images.data.length > 0) {
        for (let i = 0; i < images.data.length; i++) {
          const caption = await generateCaption(
            { imageUrl: images.data[i] },
            agent
          );
          imagesRes.push({
            image: images.data[i],
            caption: caption.title,
          });
        }
      }
      res.json({ images: imagesRes });
    });
  }
  // agent/src/index.ts:startAgent calls this
  registerAgent(runtime) {
    this.agents.set(runtime.agentId, runtime);
  }
  unregisterAgent(runtime) {
    this.agents.delete(runtime.agentId);
  }
  start(port) {
    this.server = this.app.listen(port, () => {
      elizaLogger2.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
      );
    });
    const gracefulShutdown = () => {
      elizaLogger2.log("Received shutdown signal, closing server...");
      this.server.close(() => {
        elizaLogger2.success("Server closed successfully");
        process.exit(0);
      });
      setTimeout(() => {
        elizaLogger2.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 5e3);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }
  stop() {
    if (this.server) {
      this.server.close(() => {
        elizaLogger2.success("Server stopped");
      });
    }
  }
};
var DirectClientInterface = {
  start: async (_runtime) => {
    elizaLogger2.log("DirectClientInterface start");
    const client = new DirectClient();
    const serverPort = parseInt(settings.SERVER_PORT || "3000");
    client.start(serverPort);
    return client;
  },
  stop: async (_runtime, client) => {
    if (client instanceof DirectClient) {
      client.stop();
    }
  },
};
var index_default = DirectClientInterface;
export {
  DirectClient,
  DirectClientInterface,
  index_default as default,
  messageHandlerTemplate,
};
