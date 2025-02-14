// controllers/messageController.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  stringToUuid,
  composeContext,
  generateMessageResponse,
  messageCompletionFooter,
  ModelClass,
  getEmbeddingZeroVector,
  GoalStatus,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { stringToUuid as stringToUuid2 } from "@elizaos/core";
import db from "../../models/index.ts";
import { GoalType } from "../../database/enum-database.ts";
import {
  convertGoalsListToString,
  formatPrimaryGoal,
} from "../../services/goalManagementServices.ts";

// Configure multer storage for file uploads
const storage = multer.diskStorage({
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

const upload = multer({ storage });

var messageHandlerTemplate =
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

# Goals
{{primaryGoals}}

{{secondaryGoals}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;

const router = express.Router();

const messageRoutes = (
  agents: Map<any, any>,
  directClient,
  messageHandlerTemplate
) => {
  router.post("/:agentId/message", upload.single("file"), async (req, res) => {
    const agentId = req.params.agentId;
    const roomId = stringToUuid2(req.body.roomId ?? "default-room-" + agentId);
    const userId = stringToUuid2(req.body.userId ?? "user");
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
    await runtime.ensureConnection(
      userId,
      roomId,
      req.body.userName,
      req.body.name,
      "direct"
    );

    const dbRuntime = runtime.databaseAdapter;

    const agentConfigPrimary = await db.AgentConfig.findOne({
      where: { config_key: GoalType.PRIMARY },
    });
    if (!agentConfigPrimary) {
      throw new Error(
        `Primary Goal Config not found for agent ${runtime.agentId}`
      );
    }
    const agentConfigSecondary = await db.AgentConfig.findOne({
      where: {
        config_key: GoalType.SECONDARY,
        agent_id: runtime.agentId,
      },
    });
    if (!agentConfigSecondary) {
      throw new Error(
        `Secondary Goal Config not found for agent ${runtime.agentId}`
      );
    }

    await autoCreateGoals(dbRuntime, roomId, userId, agentConfigSecondary);

    const secondaryGoalList = await dbRuntime.getGoals({
      roomId,
      userId,
    });

    const primaryGoals: string = formatPrimaryGoal(
      agentConfigPrimary.dataValues.config_value
    );
    const secondaryGoals: string = convertGoalsListToString(secondaryGoalList);

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
      primaryGoals,
      secondaryGoals,
    });
    elizaLogger.debug("State messages : ", state);
    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });
    const response = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.SMALL,
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
  });

  async function autoCreateGoals(
    dbRuntime,
    roomId,
    userId,
    agentConfigSecondary
  ) {
    const secondaryGoalList = agentConfigSecondary.dataValues.config_value;

    const activeGoals = await dbRuntime.getGoals({
      roomId,
      userId,
      onlyInProgress: false,
      count: 1,
    });

    if (activeGoals.length === 0) {
      for (const goalItem of secondaryGoalList) {
        await dbRuntime.createGoal({
          id: stringToUuid2(Date.now().toString()),
          roomId,
          userId,
          name: goalItem.name,
          status: GoalStatus.IN_PROGRESS,
          objectives: goalItem.objectives.map((objective) => ({
            text: objective,
            completed: false,
          })),
        });
      }
    }
  }

  return router;
};

export { messageRoutes, messageHandlerTemplate };
