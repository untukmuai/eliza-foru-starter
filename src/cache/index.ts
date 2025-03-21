
import PostgresDatabaseAdapter from "@elizaos/adapter-postgres";
import { CacheManager, Character, DbCacheAdapter, elizaLogger, IDatabaseAdapter, IDatabaseCacheAdapter, UUID } from "@elizaos/core";

export function initializeDbCache(
  character: Character,
  db: IDatabaseCacheAdapter
) {
  const cache = new CacheManager(new DbCacheAdapter(db, character.id));
  return cache;
}

export class PostgreSQLCacheAdapter implements IDatabaseCacheAdapter {
  db: PostgresDatabaseAdapter;

  constructor(db: PostgresDatabaseAdapter) {
    this.db = db;
  }

  async getCache(params: {
    agentId: UUID;
    key: string;
  }): Promise<string | undefined> {
    try {
      const result = await this.db.db.query(
        "SELECT value::text AS value FROM cache WHERE agentId = $1 AND key = $2",
        [params.agentId, params.key]
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      // Return the string result from the JSONB column
      return result.rows[0].value;
    } catch (error) {
      elizaLogger.error("error getting cache using own PG Adapter ", error);
      return undefined;
    }
  }

  async setCache(params: {
    agentId: UUID;
    key: string;
    value: string;
  }): Promise<boolean> {
    try {
      await this.db.db.query(
        "INSERT INTO cache (agentId, key, value) VALUES ($1, $2, $3)",
        [params.agentId, params.key, params.value]
      );
      return true;
    } catch (error) {
      elizaLogger.error('error setting cache using own PG Adapter ', error);
      return false;
    }
  }

  async deleteCache(params: { agentId: UUID; key: string }): Promise<boolean> {
    try {
      await this.db.db.query(
        "DELETE FROM cache WHERE agentId = $1 AND key = $2",
        [params.agentId, params.key]
      );
      return true;
    } catch (error) {
      elizaLogger.error("error delete cache using own PG Adapter ", error);
      return false;
    }
  }
}