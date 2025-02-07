import fs from "fs";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import process from "process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = path.basename(__filename);

// Read connection URL from environment variable
const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  throw new Error("POSTGRES_URL environment variable not set");
}

const db: { [key: string]: any } = {};

let sequelize: Sequelize;

sequelize = new Sequelize(postgresUrl, {
  logging: console.log,
  dialect: "postgres", // ensure you specify the dialect if needed
});

// Load models asynchronously
const modelFiles = fs.readdirSync(__dirname).filter((file) => {
  return (
    file.indexOf(".") !== 0 &&
    file !== basename &&
    file.slice(-3) === ".ts" &&
    file.indexOf(".test.ts") === -1
  );
});

const modelPromises = modelFiles.map(async (file) => {
  try {
    const modelPath = path.join(__dirname, file);
    const modelModule = await import(modelPath);
    const model = modelModule.default(sequelize, DataTypes);

    console.log("Loaded model:", model);

    if (model.name) {
      db[model.name] = model; // Store the model in the db object
      console.log(`Added model to db: ${model.name}`);
    } else {
      console.error(`Model does not have a valid modelName:`, model);
    }
  } catch (err) {
    console.error(`Failed to load model ${file}:`, err);
  }
});

// Wait for all models to load
await Promise.all(modelPromises);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
