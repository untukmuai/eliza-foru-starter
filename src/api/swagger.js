import swaggerAutogen from "swagger-autogen";

const swaggerAutogenInstance = swaggerAutogen({ openapi: "3.0.0" });

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./index.js"]; // Add paths to your route files if separate

const doc = {
  info: {
    title: "AI Agent API",
    description: "ForU AI Agent API Documentation",
  },
};

swaggerAutogenInstance(outputFile, endpointsFiles, doc);
