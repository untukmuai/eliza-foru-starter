
import {
  AgentRuntime,
  Clients,
  elizaLogger,
  getEnvVariable,
  ModelProviderName,
  settings,
  stringToUuid,
  type Character,
} from "@elizaos/core";
import { bootstrapPlugin } from "@elizaos/plugin-bootstrap";
import { createNodePlugin } from "@elizaos/plugin-node";
import { solanaPlugin } from "@elizaos/plugin-solana";
import net from "net";
import { initializeDbCache } from "./cache/index.ts";
import { character } from "./character.ts";
import { startChat } from "./chat/index.ts";
import { initializeClients } from "./clients/index.ts";
import {
  getTokenForProvider,
  loadCharactersFromDB,
  parseArguments,
} from "./config/index.ts";
import { initializeDatabase } from "./database/index.ts";
import DirectApi from "./api/DirectApi.ts";

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
  const waitTime =
    Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};

let nodePlugin: any | undefined;

export function createAgent(
  character: Character,
  db: any,
  cache: any,
  token: string
) {
  elizaLogger.success(
    elizaLogger.successesTitle,
    "Creating runtime for character",
    character.name
  );

  nodePlugin ??= createNodePlugin();

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins: [
      bootstrapPlugin,
      nodePlugin,
      character.settings?.secrets?.WALLET_PUBLIC_KEY ? solanaPlugin : null,
    ].filter(Boolean),
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
    conversationLength: 32,
  });
}

async function startAgent(character: Character, directApi: DirectApi) {
  try {
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);

    const db = initializeDatabase();

    await db.init();

    const cache = initializeDbCache(character, db);
    const runtime = createAgent(character, db, cache, token);

    await runtime.initialize();
    if (runtime.databaseAdapter.db === undefined) {
      runtime.databaseAdapter.db = db;
    }

    runtime.clients = await initializeClients(character, runtime);

    directApi.registerAgent(runtime);

    // report to console
    elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

    return runtime;
  } catch (error) {
    elizaLogger.error(
      `Error starting agent for character ${character.name}:`,
      error
    );
    console.error(error);
    throw error;
  }
}

const checkPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
};

const startAgents = async () => {
  const directApi = new DirectApi();
  let serverPort = parseInt(settings.SERVER_PORT || "3000");

  let characters = [];

  if (getEnvVariable("LOAD_CHARACTER_INTERNAL", "false") === "true") {
    console.log("loading preload characters");
    if (getEnvVariable("DISABLE_ALL_CLIENTS_INTERACTION", "false") === "true") {
      console.log("Disabling all clients interaction");
      character.clients = [Clients.DIRECT]; 
    }
    characters.push(character);
  }
  if (getEnvVariable("LOAD_CHARACTER_FROM_DB", "false") === "true") {
    console.log("loading characters from db");
    characters.push(...(await loadCharactersFromDB()));
  } 

  if (getEnvVariable("LOAD_CHARACTER_FROM_DB", "false") === "false" && getEnvVariable("LOAD_CHARACTER_INTERNAL", "false") === "false") {
    console.log("No characters loaded");
    throw new Error("No characters loaded");
  }
  
  console.log("characters", characters);
  try {
    const startPromises = characters.map((character) => {
      character.modelProvider ??= ModelProviderName.OPENAI;
      character.settings ??= {
        modelConfig: {
          temperature: 0.2,
          max_response_length: 400,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        },
        embeddingModel: "all-MiniLM-L6-v2",
      };

      if (getEnvVariable("DISABLE_ALL_CLIENTS_INTERACTION", "false") === "true") {
        console.log("Disabling all clients interaction");
        character.clients = [Clients.DIRECT];
      }
      return startAgent(character, directApi as DirectApi);
    });
    await Promise.all(startPromises);
  } catch (error) {
    elizaLogger.error("Error starting agents concurrently:", error);
  }

  while (!(await checkPortAvailable(serverPort))) {
    elizaLogger.warn(`Port ${serverPort} is in use, trying ${serverPort + 1}`);
    serverPort++;
  }

  directApi.startAgent = async (character: Character) => {
    return startAgent(character, directApi);
  };

  directApi.start(serverPort);

  if (serverPort !== parseInt(settings.SERVER_PORT || "3000")) {
    elizaLogger.log(`Server started on alternate port ${serverPort}`);
  }

  const isDaemonProcess = process.env.DAEMON_PROCESS === "true";
  if (!isDaemonProcess) {
    elizaLogger.log("Chat started. Type 'exit' to quit.");
    const chat = startChat(characters);
    chat();
  }
};

startAgents().catch((error) => {
  elizaLogger.error("Unhandled error in startAgents:", error);
  process.exit(1);
});
