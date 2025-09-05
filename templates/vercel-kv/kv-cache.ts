import { KVOperations, KVOperationResult, setJSON, getJSON } from './operations';

/**
 * Vercel KV Caching Mechanisms
 * 
 * This module provides advanced caching patterns and strategies for Vercel KV.
 * It includes time-based expiration, LRU cache, and cache invalidation patterns.
 */

export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Namespace for cache keys */
  namespace?: string;
  /** Whether to use JSON serialization */
  useJSON?: boolean;
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  namespace: string;
}

/**
 * Time-based Cache with automatic expiration
 */
export class TimeBasedCache {
  private namespace: string;
  private defaultTTL: number;

  constructor(namespace: string = 'cache', defaultTTL: number = 3600) {
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getStatsKey(): string {
    return `${this.namespace}:stats`;
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<KVOperationResult<string>> {
    const cacheKey = this.getKey(key);
    const expiryTime = ttl || this.defaultTTL;
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: expiryTime,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    return setJSON(cacheKey, entry, { ex: expiryTime });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<KVOperationResult<T>> {
    const cacheKey = this.getKey(key);
    const result = await getJSON<CacheEntry<T>>(cacheKey);

    if (!result.success || !result.data) {
      await this.incrementMisses();
      return {
        success: false,
        error: 'Cache miss'
      };
    }

    // Update access statistics
    const entry = result.data;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update the entry with new stats (without changing TTL)
    await setJSON(cacheKey, entry);
    await this.incrementHits();

    return {
      success: true,
      data: entry.value
    };
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<KVOperationResult<number>> {
    const cacheKey = this.getKey(key);
    return KVOperations.del(cacheKey);
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<KVOperationResult<boolean>> {
    const cacheKey = this.getKey(key);
    return KVOperations.exists(cacheKey);
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl?: number
  ): Promise<KVOperationResult<T>> {
    const cached = await this.get<T>(key);
    if (cached.success) {
      return cached;
    }

    try {
      const computed = await computeFn();
      await this.set(key, computed, ttl);
      return {
        success: true,
        data: computed
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Computation failed'
      };
    }
  }

  /**
   * Clear all cache entries for this namespace
   */
  async clear(): Promise<KVOperationResult<number>> {
    const pattern = `${this.namespace}:*`;
    const keysResult = await KVOperations.keys(pattern);
    
    if (!keysResult.success || !keysResult.data) {
      return {
        success: false,
        error: 'Failed to get keys for clearing'
      };
    }

    let deletedCount = 0;
    for (const key of keysResult.data) {
      const deleteResult = await KVOperations.del(key);
      if (deleteResult.success) {
        deletedCount += deleteResult.data || 0;
      }
    }

    return {
      success: true,
      data: deletedCount
    };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<KVOperationResult<CacheStats>> {
    const statsKey = this.getStatsKey();
    const statsResult = await getJSON<{ hits: number; misses: number }>(statsKey);
    
    const hits = statsResult.data?.hits || 0;
    const misses = statsResult.data?.misses || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? hits / total : 0;

    // Count total keys
    const keysResult = await KVOperations.keys(`${this.namespace}:*`);
    const totalKeys = keysResult.data?.length || 0;

    return {
      success: true,
      data: {
        hits,
        misses,
        hitRate,
        totalKeys,
        namespace: this.namespace
      }
    };
  }

  private async incrementHits(): Promise<void> {
    const statsKey = this.getStatsKey();
    await KVOperations.incr(`${statsKey}:hits`);
  }

  private async incrementMisses(): Promise<void> {
    const statsKey = this.getStatsKey();
    await KVOperations.incr(`${statsKey}:misses`);
  }
}

/**
 * LRU (Least Recently Used) Cache implementation
 */
export class LRUCache {
  private namespace: string;
  private maxSize: number;
  private defaultTTL: number;

  constructor(namespace: string = 'lru', maxSize: number = 100, defaultTTL: number = 3600) {
    this.namespace = namespace;
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getIndexKey(): string {
    return `${this.namespace}:index`;
  }

  /**
   * Set a value in LRU cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<KVOperationResult<string>> {
    const cacheKey = this.getKey(key);
    const expiryTime = ttl || this.defaultTTL;
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: expiryTime,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    // Set the cache entry
    const setResult = await setJSON(cacheKey, entry, { ex: expiryTime });
    if (!setResult.success) {
      return setResult;
    }

    // Update LRU index
    await this.updateLRUIndex(key);
    
    // Enforce size limit
    await this.enforceSizeLimit();

    return setResult;
  }

  /**
   * Get a value from LRU cache
   */
  async get<T>(key: string): Promise<KVOperationResult<T>> {
    const cacheKey = this.getKey(key);
    const result = await getJSON<CacheEntry<T>>(cacheKey);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Cache miss'
      };
    }

    // Update access statistics
    const entry = result.data;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update the entry and LRU index
    await setJSON(cacheKey, entry);
    await this.updateLRUIndex(key);

    return {
      success: true,
      data: entry.value
    };
  }

  /**
   * Update LRU index to track access order
   */
  private async updateLRUIndex(key: string): Promise<void> {
    const indexKey = this.getIndexKey();
    const indexResult = await getJSON<string[]>(indexKey);
    
    let index = indexResult.data || [];
    
    // Remove key if it exists
    index = index.filter(k => k !== key);
    
    // Add key to front (most recently used)
    index.unshift(key);
    
    // Store updated index
    await setJSON(indexKey, index, { ex: this.defaultTTL * 2 });
  }

  /**
   * Enforce cache size limit by removing least recently used items
   */
  private async enforceSizeLimit(): Promise<void> {
    const indexKey = this.getIndexKey();
    const indexResult = await getJSON<string[]>(indexKey);
    
    if (!indexResult.data || indexResult.data.length <= this.maxSize) {
      return;
    }

    const index = indexResult.data;
    const itemsToRemove = index.slice(this.maxSize);
    
    // Remove excess items
    for (const key of itemsToRemove) {
      await KVOperations.del(this.getKey(key));
    }
    
    // Update index
    const newIndex = index.slice(0, this.maxSize);
    await setJSON(indexKey, newIndex, { ex: this.defaultTTL * 2 });
  }

  /**
   * Get cache size
   */
  async size(): Promise<KVOperationResult<number>> {
    const indexKey = this.getIndexKey();
    const indexResult = await getJSON<string[]>(indexKey);
    
    return {
      success: true,
      data: indexResult.data?.length || 0
    };
  }

  /**
   * Clear LRU cache
   */
  async clear(): Promise<KVOperationResult<number>> {
    const indexKey = this.getIndexKey();
    const indexResult = await getJSON<string[]>(indexKey);
    
    let deletedCount = 0;
    
    if (indexResult.data) {
      for (const key of indexResult.data) {
        const deleteResult = await KVOperations.del(this.getKey(key));
        if (deleteResult.success) {
          deletedCount += deleteResult.data || 0;
        }
      }
    }
    
    // Clear index
    await KVOperations.del(indexKey);
    deletedCount++;
    
    return {
      success: true,
      data: deletedCount
    };
  }
}

/**
 * Cache Invalidation Strategies
 */
export class CacheInvalidation {
  private namespace: string;

  constructor(namespace: string = 'invalidation') {
    this.namespace = namespace;
  }

  /**
   * Tag-based invalidation - associate cache entries with tags
   */
  async setWithTags<T>(
    key: string, 
    value: T, 
    tags: string[], 
    ttl: number = 3600
  ): Promise<KVOperationResult<string>> {
    const cacheKey = `${this.namespace}:${key}`;
    
    // Set the cache entry
    const setResult = await setJSON(cacheKey, value, { ex: ttl });
    if (!setResult.success) {
      return setResult;
    }

    // Associate with tags
    for (const tag of tags) {
      const tagKey = `${this.namespace}:tag:${tag}`;
      const taggedKeysResult = await getJSON<string[]>(tagKey);
      const taggedKeys = taggedKeysResult.data || [];
      
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await setJSON(tagKey, taggedKeys, { ex: ttl * 2 });
      }
    }

    return setResult;
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<KVOperationResult<number>> {
    const tagKey = `${this.namespace}:tag:${tag}`;
    const taggedKeysResult = await getJSON<string[]>(tagKey);
    
    if (!taggedKeysResult.data) {
      return {
        success: true,
        data: 0
      };
    }

    let deletedCount = 0;
    for (const key of taggedKeysResult.data) {
      const cacheKey = `${this.namespace}:${key}`;
      const deleteResult = await KVOperations.del(cacheKey);
      if (deleteResult.success) {
        deletedCount += deleteResult.data || 0;
      }
    }

    // Clear the tag index
    await KVOperations.del(tagKey);

    return {
      success: true,
      data: deletedCount
    };
  }

  /**
   * Pattern-based invalidation
   */
  async invalidateByPattern(pattern: string): Promise<KVOperationResult<number>> {
    const searchPattern = `${this.namespace}:${pattern}`;
    const keysResult = await KVOperations.keys(searchPattern);
    
    if (!keysResult.success || !keysResult.data) {
      return {
        success: false,
        error: 'Failed to get keys for pattern invalidation'
      };
    }

    let deletedCount = 0;
    for (const key of keysResult.data) {
      const deleteResult = await KVOperations.del(key);
      if (deleteResult.success) {
        deletedCount += deleteResult.data || 0;
      }
    }

    return {
      success: true,
      data: deletedCount
    };
  }

  /**
   * Time-based invalidation - invalidate entries older than specified time
   */
  async invalidateOlderThan(seconds: number): Promise<KVOperationResult<number>> {
    const cutoffTime = Date.now() - (seconds * 1000);
    const pattern = `${this.namespace}:*`;
    const keysResult = await KVOperations.keys(pattern);
    
    if (!keysResult.success || !keysResult.data) {
      return {
        success: false,
        error: 'Failed to get keys for time-based invalidation'
      };
    }

    let deletedCount = 0;
    for (const key of keysResult.data) {
      const entryResult = await getJSON<CacheEntry>(key);
      if (entryResult.success && entryResult.data) {
        if (entryResult.data.timestamp < cutoffTime) {
          const deleteResult = await KVOperations.del(key);
          if (deleteResult.success) {
            deletedCount += deleteResult.data || 0;
          }
        }
      }
    }

    return {
      success: true,
      data: deletedCount
    };
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  private cache: TimeBasedCache;

  constructor(cache: TimeBasedCache) {
    this.cache = cache;
  }

  /**
   * Warm cache with predefined data
   */
  async warmCache<T>(
    data: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<KVOperationResult<number>> {
    let successCount = 0;
    
    for (const item of data) {
      const result = await this.cache.set(item.key, item.value, item.ttl);
      if (result.success) {
        successCount++;
      }
    }

    return {
      success: true,
      data: successCount
    };
  }

  /**
   * Warm cache using a data fetcher function
   */
  async warmCacheWithFetcher<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<KVOperationResult<number>> {
    let successCount = 0;
    
    for (const key of keys) {
      try {
        const value = await fetcher(key);
        const result = await this.cache.set(key, value, ttl);
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to warm cache for key ${key}:`, error);
      }
    }

    return {
      success: true,
      data: successCount
    };
  }
}

// Export convenience instances
export const defaultCache = new TimeBasedCache();
export const defaultLRUCache = new LRUCache();
export const defaultInvalidation = new CacheInvalidation(); 