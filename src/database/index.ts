import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { elizaLogger } from "@elizaos/core";

export function initializeDatabase() {
  if (process.env.POSTGRES_URL) {
    const db = new PostgresDatabaseAdapter({
      connectionString: process.env.POSTGRES_URL,
      allowExitOnIdle: true,
      max: 1000,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    });
    return db;
  } else {
    elizaLogger.error(
      `POSTGRES_URL still not set`);
  }
}
