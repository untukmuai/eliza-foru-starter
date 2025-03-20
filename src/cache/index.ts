
import { CacheManager, Character, DbCacheAdapter, IDatabaseCacheAdapter } from "@elizaos/core";

export function initializeDbCache(
  character: Character,
  db: any
) {
  const cache = new CacheManager(new DbCacheAdapter(db, character.id));
  return cache;
}