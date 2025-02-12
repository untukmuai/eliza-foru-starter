import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { createApiRoutes } from "./routes.js";
import { elizaLogger } from "@elizaos/core";
import { messageHandlerTemplate } from "./controllers/messageController.js";

class DirectApi {
  app: express.Application;
  agents: Map<any, any>;
  server: any;
  startAgent: any;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    // Serve static assets
    this.app.use(
      "/media/uploads",
      express.static(path.join(process.cwd(), "data", "uploads"))
    );
    this.app.use(
      "/media/generated",
      express.static(path.join(process.cwd(), "generatedImages"))
    );

    // Create a Map to hold agent instances
    this.agents = new Map();

    // Mount the API routes (all controllers)
    const apiRouter = createApiRoutes(
      this.agents,
      this,
      messageHandlerTemplate
    );
    this.app.use(apiRouter);
  }

  // Methods for agent registration management
  registerAgent(runtime) {
    this.agents.set(runtime.agentId, runtime);
  }
  unregisterAgent(runtime) {
    this.agents.delete(runtime.agentId);
  }

  // Start the HTTP server
  start(port) {
    this.server = this.app.listen(port, () => {
      elizaLogger.success(`Server listening on port ${port}`);
    });
    this._setupGracefulShutdown();
  }

  // Graceful shutdown handler
  _setupGracefulShutdown() {
    const gracefulShutdown = () => {
      elizaLogger.log("Received shutdown signal, closing server...");
      this.server.close(() => {
        elizaLogger.success("Server closed successfully");
        process.exit(0);
      });
      setTimeout(() => {
        elizaLogger.error("Force shutdown");
        process.exit(1);
      }, 5000);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        elizaLogger.success("Server stopped");
      });
    }
  }
}

export default DirectApi;