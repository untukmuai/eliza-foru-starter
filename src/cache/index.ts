
import { CacheManager, Character, DbCacheAdapter, IDatabaseAdapter, IDatabaseCacheAdapter, UUID } from "@elizaos/core";

export function initializeDbCache(
  character: Character,
  db: IDatabaseCacheAdapter
) {
  const cache = new CacheManager(new DbCacheAdapter(db, character.id));
  return cache;
}

export class PostgreSQLCacheAdapter implements IDatabaseCacheAdapter {
  db: IDatabaseAdapter;

  constructor(db: IDatabaseAdapter) {
    this.db = db;
  }

  getCache(params: {
    agentId: UUID;
    key: string;
  }): Promise<string | undefined> {
    this.db.db.query("SELECT * FROM cache WHERE agentId = $1 AND key = $2", [
      params.agentId,
      params.key,
    ]);
    return Promise.resolve("value");
  }
  setCache(params: {
    agentId: UUID;
    key: string;
    value: string;
  }): Promise<boolean> {
    this.db.db.query("INSERT INTO cache (agentId, key, value) VALUES ($1, $2, $3)", [
      params.agentId,
      params.key,
      params.value,
    ]);
    return Promise.resolve(true);
  }
  deleteCache(params: { agentId: UUID; key: string }): Promise<boolean> {
    this.db.db.query("DELETE FROM cache WHERE agentId = $1 AND key = $2", [
      params.agentId,
      params.key,
    ]);
    return Promise.resolve(true);
  }
}