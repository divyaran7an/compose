import { kvInstance } from './config';

/**
 * Vercel KV Operations
 * 
 * This module provides a comprehensive set of operations for interacting with Vercel KV.
 * It includes basic CRUD operations, batch operations, and utility functions.
 */

export interface KVSetOptions {
  /** Expiration time in seconds */
  ex?: number;
  /** Expiration time in milliseconds */
  px?: number;
  /** Expiration timestamp in seconds */
  exat?: number;
  /** Expiration timestamp in milliseconds */
  pxat?: number;
  /** Only set if key doesn't exist */
  nx?: boolean;
  /** Only set if key exists */
  xx?: boolean;
}

export interface KVOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface KVBatchResult {
  success: boolean;
  results: Array<{ key: string; success: boolean; error?: string }>;
  successCount: number;
  errorCount: number;
}

/**
 * Basic KV Operations
 */
export class KVOperations {
  /**
   * Set a key-value pair
   * @param key The key to set
   * @param value The value to store
   * @param options Optional settings for expiration and conditions
   * @returns Promise<KVOperationResult<string>>
   */
  static async set(
    key: string, 
    value: any, 
    options?: KVSetOptions
  ): Promise<KVOperationResult<string>> {
    try {
      // Convert our options to Vercel KV format
      const kvOptions: any = {};
      if (options?.ex) kvOptions.ex = options.ex;
      if (options?.px) kvOptions.px = options.px;
      if (options?.exat) kvOptions.exat = options.exat;
      if (options?.pxat) kvOptions.pxat = options.pxat;
      if (options?.nx) kvOptions.nx = options.nx;
      if (options?.xx) kvOptions.xx = options.xx;
      
      const result = await kvInstance.set(key, value, Object.keys(kvOptions).length > 0 ? kvOptions : undefined);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a value by key
   * @param key The key to retrieve
   * @returns Promise<KVOperationResult<T>>
   */
  static async get<T = any>(key: string): Promise<KVOperationResult<T | null>> {
    try {
      const data = await kvInstance.get<T>(key);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a key
   * @param key The key to delete
   * @returns Promise<KVOperationResult<number>>
   */
  static async del(key: string): Promise<KVOperationResult<number>> {
    try {
      const result = await kvInstance.del(key);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a key exists
   * @param key The key to check
   * @returns Promise<KVOperationResult<boolean>>
   */
  static async exists(key: string): Promise<KVOperationResult<boolean>> {
    try {
      const result = await kvInstance.exists(key);
      return {
        success: true,
        data: result === 1
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Increment a numeric value
   * @param key The key to increment
   * @param increment The amount to increment by (default: 1)
   * @returns Promise<KVOperationResult<number>>
   */
  static async incr(key: string, increment: number = 1): Promise<KVOperationResult<number>> {
    try {
      const result = increment === 1 
        ? await kvInstance.incr(key)
        : await kvInstance.incrby(key, increment);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Decrement a numeric value
   * @param key The key to decrement
   * @param decrement The amount to decrement by (default: 1)
   * @returns Promise<KVOperationResult<number>>
   */
  static async decr(key: string, decrement: number = 1): Promise<KVOperationResult<number>> {
    try {
      const result = decrement === 1 
        ? await kvInstance.decr(key)
        : await kvInstance.decrby(key, decrement);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get multiple values by keys
   * @param keys Array of keys to retrieve
   * @returns Promise<KVOperationResult<Array<T | null>>>
   */
  static async mget<T = any>(keys: string[]): Promise<KVOperationResult<Array<T | null>>> {
    try {
      const results = await kvInstance.mget(...keys);
      return {
        success: true,
        data: results as Array<T | null>
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set multiple key-value pairs
   * @param keyValuePairs Object with key-value pairs or array of [key, value] tuples
   * @returns Promise<KVBatchResult>
   */
  static async mset(
    keyValuePairs: Record<string, any> | Array<[string, any]>
  ): Promise<KVBatchResult> {
    const pairs = Array.isArray(keyValuePairs) 
      ? keyValuePairs 
      : Object.entries(keyValuePairs);

    const results: Array<{ key: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (const [key, value] of pairs) {
      try {
        await kvInstance.set(key, value);
        results.push({ key, success: true });
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ key, success: false, error: errorMessage });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      results,
      successCount,
      errorCount
    };
  }

  /**
   * Get keys matching a pattern
   * @param pattern Pattern to match (supports * wildcards)
   * @returns Promise<KVOperationResult<string[]>>
   */
  static async keys(pattern: string = '*'): Promise<KVOperationResult<string[]>> {
    try {
      const keys = await kvInstance.keys(pattern);
      return {
        success: true,
        data: keys
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set expiration for a key
   * @param key The key to set expiration for
   * @param seconds Expiration time in seconds
   * @returns Promise<KVOperationResult<boolean>>
   */
  static async expire(key: string, seconds: number): Promise<KVOperationResult<boolean>> {
    try {
      const result = await kvInstance.expire(key, seconds);
      return {
        success: true,
        data: result === 1
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get time to live for a key
   * @param key The key to check
   * @returns Promise<KVOperationResult<number>> TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  static async ttl(key: string): Promise<KVOperationResult<number>> {
    try {
      const result = await kvInstance.ttl(key);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Flush all keys (use with caution!)
   * @returns Promise<KVOperationResult<string>>
   */
  static async flushall(): Promise<KVOperationResult<string>> {
    try {
      const result = await kvInstance.flushall();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Convenience functions for common operations
 */

/**
 * Set a value with automatic JSON serialization
 */
export async function setJSON(key: string, value: any, options?: KVSetOptions): Promise<KVOperationResult<string>> {
  return KVOperations.set(key, JSON.stringify(value), options);
}

/**
 * Get a value with automatic JSON deserialization
 */
export async function getJSON<T = any>(key: string): Promise<KVOperationResult<T | null>> {
  const result = await KVOperations.get<string>(key);
  if (!result.success) {
    return result as KVOperationResult<T | null>;
  }

  if (!result.data) {
    return {
      success: true,
      data: null
    };
  }

  try {
    const parsed = JSON.parse(result.data);
    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse JSON data'
    };
  }
}

/**
 * Set a value with automatic expiration (default: 1 hour)
 */
export async function setWithExpiry(
  key: string, 
  value: any, 
  expirySeconds: number = 3600
): Promise<KVOperationResult<string>> {
  return KVOperations.set(key, value, { ex: expirySeconds });
}

/**
 * Atomic increment with initialization
 */
export async function safeIncrement(
  key: string, 
  increment: number = 1, 
  initialValue: number = 0
): Promise<KVOperationResult<number>> {
  const exists = await KVOperations.exists(key);
  if (!exists.success) {
    return {
      success: false,
      error: exists.error
    };
  }

  if (!exists.data) {
    const setResult = await KVOperations.set(key, initialValue);
    if (!setResult.success) {
      return {
        success: false,
        error: setResult.error
      };
    }
  }

  return KVOperations.incr(key, increment);
}

export default KVOperations; 