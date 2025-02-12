import swaggerAutogen from "swagger-autogen";

const swaggerAutogenInstance = swaggerAutogen({ openapi: "3.0.0" });

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./routes.ts", "./controllers/*.ts"];

const doc = {
  info: {
    title: "AI Agent API",
    description: "ForU AI Agent API Documentation",
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};

swaggerAutogenInstance(outputFile, endpointsFiles, doc);
