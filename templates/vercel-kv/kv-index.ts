/**
 * Vercel KV Integration - Main Export
 * 
 * This is the main entry point for the Vercel KV integration template.
 * It provides a comprehensive set of tools for key-value storage, caching,
 * and real-time data management using Vercel KV.
 */

// Configuration and connection
export {
  kvInstance,
  kvConfig,
  validateKVConfig,
  checkKVHealth,
  initializeKV
} from './config';

// Basic operations
export {
  KVOperations,
  setJSON,
  getJSON,
  setWithExpiry,
  safeIncrement,
  type KVSetOptions,
  type KVOperationResult,
  type KVBatchResult
} from './operations';

// Caching mechanisms
export {
  TimeBasedCache,
  LRUCache,
  CacheInvalidation,
  CacheWarmer,
  defaultCache,
  defaultLRUCache,
  defaultInvalidation,
  type CacheOptions,
  type CacheEntry,
  type CacheStats
} from './cache';

// Real-time data management
export {
  PubSubManager,
  RealtimeCounters,
  Leaderboard,
  createLeaderboard,
  defaultPubSub,
  defaultCounters,
  type PubSubMessage,
  type CounterData,
  type LeaderboardEntry,
  type LeaderboardOptions
} from './realtime';

// Import classes for default export
import { KVOperations } from './operations';
import { TimeBasedCache, LRUCache } from './cache';
import { PubSubManager, RealtimeCounters, Leaderboard } from './realtime';

// Default export
export default {
  KVOperations,
  TimeBasedCache,
  LRUCache,
  PubSubManager,
  RealtimeCounters,
  Leaderboard
}; 