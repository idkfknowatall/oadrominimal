import { LRUCache } from 'lru-cache';

/**
 * Creates a cache for API responses using LRU (Least Recently Used) strategy.
 *
 * @param max - Maximum number of items to store in the cache. Default is 200.
 * @param ttl - Time-to-live for cache items in milliseconds. Default is 5 minutes (300000 ms).
 * @returns An instance of LRUCache with the specified configuration.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function createApiCache<T extends {}>(
  max: number = 200,
  ttl: number = 1000 * 60 * 5
) {
  return new LRUCache<string, T>({
    max,
    ttl,
  });
}
