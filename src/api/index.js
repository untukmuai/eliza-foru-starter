import bodyParser2 from "body-parser";
import cors2 from "cors";
import express2 from "express";
import multer from "multer";
import {
  elizaLogger as elizaLogger2,
  generateCaption,
  generateImage,
  getEmbeddingZeroVector
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { stringToUuid as stringToUuid2 } from "@elizaos/core";
import { settings } from "@elizaos/core";

// src/api.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  elizaLogger,
  getEnvVariable,
  validateCharacterConfig
} from "@elizaos/core";
import { REST, Routes } from "discord.js";
import { stringToUuid } from "@elizaos/core";
import db from "../models/index.ts";

function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  const validApiKey = getEnvVariable("API_KEY_DIRECT");

  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}

function createApiRouter(agents, directClient) {
  if (!getEnvVariable("API_KEY_DIRECT")){
    elizaLogger.error("API_KEY_DIRECT is not set in environment variables");
    process.exit(1);
  }
  const router = express.Router();
  router.use(cors());
  router.use(apiKeyMiddleware);
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(
    express.json({
      limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb"
    })
  );
  router.get("/", (req, res) => {
    res.send("Welcome to untukmu AI Agent");
  });
  router.get("/agents", (req, res) => {
    const agentsList = Array.from(agents.values()).map((agent) => ({
      id: agent.agentId,
      name: agent.character.name,
      clients: Object.keys(agent.clients)
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
      character: agent.character
    });
  });

  router.post("/agents/:agentId/set", async (req, res) => {
    const agentId = req.params.agentId;
    console.log("agentId", agentId);
    let agent = agents.get(agentId);
    if (agent) {
      agent.stop();
      directClient.unregisterAgent(agent);
    }
    const character = req.body;
    try {
      validateCharacterConfig(character);
      const characterConfig = await db.CharacterConfig.findOne({ where: { name: character.name } });
      if (!characterConfig) {
        throw new Error(`CharacterConfig with name "${name}" not found.`);
      }
      characterConfig.character = newCharacterData;
      await characterConfig.save();
    } catch (e) {
      elizaLogger.error(`Error process character update: ${e}`);
      res.status(400).json({
        success: false,
        message: e.message
      });
      return;
    }
    agent = await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.json({
      id: character.id,
      character
    });
  });

  router.post("/agents-create", async (req, res) => {
    const character = req.body;
    try {
      const characterConfig = await db.CharacterConfig.findOne({
        where: { name: character.name },
      });
      if (characterConfig){
        throw new Error(`CharacterConfig with name "${name}" already exists.`);
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
    agent = await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.json({
      id: character.id,
      character,
      agent,
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
        roomId
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
            attachments: memory.content.attachments?.map(
              (attachment) => ({
                id: attachment.id,
                url: attachment.url,
                title: attachment.title,
                source: attachment.source,
                description: attachment.description,
                text: attachment.text,
                contentType: attachment.contentType
              })
            )
          },
          embedding: memory.embedding,
          roomId: memory.roomId,
          unique: memory.unique,
          similarity: memory.similarity
        }))
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
  }
});
var upload = multer({ storage });
var messageHandlerTemplate = (
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
` + messageCompletionFooter
);
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
            contentType: req.file.mimetype
          });
        }
        const content = {
          text,
          attachments,
          source: "direct",
          inReplyTo: void 0
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: runtime.agentId
        };
        const memory = {
          id: stringToUuid2(messageId + "-" + userId),
          ...userMessage,
          agentId: runtime.agentId,
          userId,
          roomId,
          content,
          createdAt: Date.now()
        };
        await runtime.messageManager.addEmbeddingToMemory(memory);
        await runtime.messageManager.createMemory(memory);
        let state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name
        });
        const context = composeContext({
          state,
          template: messageHandlerTemplate
        });
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.LARGE
        });
        if (!response) {
          res.status(500).send(
            "No response from generateMessageResponse"
          );
          return;
        }
        const responseMessage = {
          id: stringToUuid2(messageId + "-" + runtime.agentId),
          ...userMessage,
          userId: runtime.agentId,
          content: response,
          embedding: getEmbeddingZeroVector(),
          createdAt: Date.now()
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
        const action = runtime.actions.find(
          (a) => a.name === response.action
        );
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
    this.app.post(
      "/:agentId/image",
      async (req, res) => {
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
              caption: caption.title
            });
          }
        }
        res.json({ images: imagesRes });
      }
    );
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
  }
};
var index_default = DirectClientInterface;
export {
  DirectClient,
  DirectClientInterface,
  index_default as default,
  messageHandlerTemplate
};
