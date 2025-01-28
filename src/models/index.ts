import fs from "fs";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import process from "process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const configPath = path.join(__dirname, "..", "config", "config.json");

async function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(data);
    const configForEnv = config[env];
    console.log(configForEnv);
    return configForEnv;
  } catch (err) {
    console.error("Failed to load config", err);
    throw err;
  }
}

const config = await loadConfig();
const db: { [key: string]: any } = {};

let sequelize: Sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

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
