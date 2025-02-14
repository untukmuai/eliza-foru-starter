// routes/apiRoutes.js
import express, { RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import agentsRoutes from "./controllers/agentController.js";
import imageRoutes from "./controllers/imageController.js";
import { messageRoutes } from "./controllers/messageController.js";
import basicAuth from "express-basic-auth";
import { getEnvVariable } from "@elizaos/core";


const users = { developer: "foruweb3project@2024" };
const basicAuthMiddleware: RequestHandler = basicAuth({
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

export function createApiRoutes(agents, directClient, messageHandlerTemplate) {
  const router = express.Router();
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  // Enable Swagger docs if not in production
  if (process.env.NODE_ENV !== "production") {
    // Determine __dirname in ES modules
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const swaggerDocument = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../data/swagger_output.json"), "utf8")
    );
    router.use(
      "/api-docs",
      basicAuthMiddleware,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument)
    );
  }

  // Global middleware
  router.use(apiKeyMiddleware);
  // Liveness check
  router.get("/", (req, res) => {
    res.send("Liveness check passed");
  });
  // Mount controllers
  router.use(agentsRoutes(agents, directClient));
  router.use(messageRoutes(agents, directClient, messageHandlerTemplate));
  router.use(imageRoutes(agents));

  return router;
}
