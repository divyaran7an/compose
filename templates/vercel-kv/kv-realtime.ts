import { KVOperations, KVOperationResult, setJSON, getJSON, safeIncrement } from './operations';

/**
 * Vercel KV Real-Time Data Management
 * 
 * This module provides real-time data management patterns using Vercel KV.
 * It includes pub/sub patterns, real-time counters, and leaderboards.
 */

export interface PubSubMessage {
  id: string;
  channel: string;
  data: any;
  timestamp: number;
  sender?: string;
}

export interface CounterData {
  value: number;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface LeaderboardOptions {
  maxEntries?: number;
  sortOrder?: 'asc' | 'desc';
  namespace?: string;
}

/**
 * Pub/Sub Pattern Implementation
 * Note: This is a simple implementation. For production use, consider using
 * Vercel's built-in real-time features or external services like Pusher/Ably.
 */
export class PubSubManager {
  private namespace: string;
  private messageTTL: number;

  constructor(namespace: string = 'pubsub', messageTTL: number = 3600) {
    this.namespace = namespace;
    this.messageTTL = messageTTL;
  }

  private getChannelKey(channel: string): string {
    return `${this.namespace}:channel:${channel}`;
  }

  private getMessageKey(channel: string, messageId: string): string {
    return `${this.namespace}:message:${channel}:${messageId}`;
  }

  private getSubscribersKey(channel: string): string {
    return `${this.namespace}:subscribers:${channel}`;
  }

  /**
   * Publish a message to a channel
   */
  async publish(
    channel: string, 
    data: any, 
    sender?: string
  ): Promise<KVOperationResult<string>> {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message: PubSubMessage = {
      id: messageId,
      channel,
      data,
      timestamp: Date.now(),
      sender
    };

    // Store the message
    const messageKey = this.getMessageKey(channel, messageId);
    const setResult = await setJSON(messageKey, message, { ex: this.messageTTL });
    
    if (!setResult.success) {
      return setResult;
    }

    // Add message to channel's message list
    const channelKey = this.getChannelKey(channel);
    const messagesResult = await getJSON<string[]>(channelKey);
    const messages = messagesResult.data || [];
    
    messages.push(messageId);
    
    // Keep only recent messages (last 100)
    const recentMessages = messages.slice(-100);
    await setJSON(channelKey, recentMessages, { ex: this.messageTTL });

    return {
      success: true,
      data: messageId
    };
  }

  /**
   * Subscribe to a channel (register subscriber)
   */
  async subscribe(channel: string, subscriberId: string): Promise<KVOperationResult<boolean>> {
    const subscribersKey = this.getSubscribersKey(channel);
    const subscribersResult = await getJSON<string[]>(subscribersKey);
    const subscribers = subscribersResult.data || [];
    
    if (!subscribers.includes(subscriberId)) {
      subscribers.push(subscriberId);
      await setJSON(subscribersKey, subscribers, { ex: this.messageTTL * 2 });
    }

    return {
      success: true,
      data: true
    };
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, subscriberId: string): Promise<KVOperationResult<boolean>> {
    const subscribersKey = this.getSubscribersKey(channel);
    const subscribersResult = await getJSON<string[]>(subscribersKey);
    const subscribers = subscribersResult.data || [];
    
    const filteredSubscribers = subscribers.filter(id => id !== subscriberId);
    await setJSON(subscribersKey, filteredSubscribers, { ex: this.messageTTL * 2 });

    return {
      success: true,
      data: true
    };
  }

  /**
   * Get recent messages from a channel
   */
  async getMessages(
    channel: string, 
    limit: number = 50, 
    since?: number
  ): Promise<KVOperationResult<PubSubMessage[]>> {
    const channelKey = this.getChannelKey(channel);
    const messagesResult = await getJSON<string[]>(channelKey);
    
    if (!messagesResult.data) {
      return {
        success: true,
        data: []
      };
    }

    const messageIds = messagesResult.data.slice(-limit);
    const messages: PubSubMessage[] = [];

    for (const messageId of messageIds) {
      const messageKey = this.getMessageKey(channel, messageId);
      const messageResult = await getJSON<PubSubMessage>(messageKey);
      
      if (messageResult.success && messageResult.data) {
        const message = messageResult.data;
        if (!since || message.timestamp > since) {
          messages.push(message);
        }
      }
    }

    return {
      success: true,
      data: messages.sort((a, b) => a.timestamp - b.timestamp)
    };
  }

  /**
   * Get channel subscribers
   */
  async getSubscribers(channel: string): Promise<KVOperationResult<string[]>> {
    const subscribersKey = this.getSubscribersKey(channel);
    const result = await getJSON<string[]>(subscribersKey);
    
    return {
      success: true,
      data: result.data || []
    };
  }

  /**
   * Clear channel messages
   */
  async clearChannel(channel: string): Promise<KVOperationResult<number>> {
    const channelKey = this.getChannelKey(channel);
    const messagesResult = await getJSON<string[]>(channelKey);
    
    let deletedCount = 0;
    
    if (messagesResult.data) {
      for (const messageId of messagesResult.data) {
        const messageKey = this.getMessageKey(channel, messageId);
        const deleteResult = await KVOperations.del(messageKey);
        if (deleteResult.success) {
          deletedCount += deleteResult.data || 0;
        }
      }
    }

    // Clear channel index
    await KVOperations.del(channelKey);
    deletedCount++;

    return {
      success: true,
      data: deletedCount
    };
  }
}

/**
 * Real-Time Counters
 */
export class RealtimeCounters {
  private namespace: string;

  constructor(namespace: string = 'counters') {
    this.namespace = namespace;
  }

  private getCounterKey(counterId: string): string {
    return `${this.namespace}:${counterId}`;
  }

  /**
   * Initialize or get a counter
   */
  async getCounter(counterId: string): Promise<KVOperationResult<CounterData>> {
    const counterKey = this.getCounterKey(counterId);
    const result = await getJSON<CounterData>(counterKey);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    if (!result.data) {
      // Initialize counter
      const initialData: CounterData = {
        value: 0,
        lastUpdated: Date.now()
      };
      
      const setResult = await setJSON(counterKey, initialData);
      if (!setResult.success) {
        return {
          success: false,
          error: setResult.error
        };
      }

      return {
        success: true,
        data: initialData
      };
    }

    return {
      success: true,
      data: result.data
    };
  }

  /**
   * Increment a counter
   */
  async increment(
    counterId: string, 
    amount: number = 1, 
    metadata?: Record<string, any>
  ): Promise<KVOperationResult<CounterData>> {
    const counterKey = this.getCounterKey(counterId);
    
    // Get current counter data
    const currentResult = await this.getCounter(counterId);
    if (!currentResult.success) {
      return currentResult;
    }

    const current = currentResult.data!;
    const updated: CounterData = {
      value: current.value + amount,
      lastUpdated: Date.now(),
      metadata: metadata || current.metadata
    };

    const setResult = await setJSON(counterKey, updated);
    if (!setResult.success) {
      return {
        success: false,
        error: setResult.error
      };
    }

    return {
      success: true,
      data: updated
    };
  }

  /**
   * Decrement a counter
   */
  async decrement(
    counterId: string, 
    amount: number = 1, 
    metadata?: Record<string, any>
  ): Promise<KVOperationResult<CounterData>> {
    return this.increment(counterId, -amount, metadata);
  }

  /**
   * Set counter to specific value
   */
  async setCounter(
    counterId: string, 
    value: number, 
    metadata?: Record<string, any>
  ): Promise<KVOperationResult<CounterData>> {
    const counterKey = this.getCounterKey(counterId);
    
    const counterData: CounterData = {
      value,
      lastUpdated: Date.now(),
      metadata
    };

    const setResult = await setJSON(counterKey, counterData);
    if (!setResult.success) {
      return {
        success: false,
        error: setResult.error
      };
    }

    return {
      success: true,
      data: counterData
    };
  }

  /**
   * Reset counter to zero
   */
  async reset(counterId: string): Promise<KVOperationResult<CounterData>> {
    return this.setCounter(counterId, 0);
  }

  /**
   * Get multiple counters
   */
  async getMultipleCounters(counterIds: string[]): Promise<KVOperationResult<Record<string, CounterData>>> {
    const results: Record<string, CounterData> = {};
    
    for (const counterId of counterIds) {
      const result = await this.getCounter(counterId);
      if (result.success && result.data) {
        results[counterId] = result.data;
      }
    }

    return {
      success: true,
      data: results
    };
  }

  /**
   * Delete a counter
   */
  async deleteCounter(counterId: string): Promise<KVOperationResult<number>> {
    const counterKey = this.getCounterKey(counterId);
    return KVOperations.del(counterKey);
  }
}

/**
 * Leaderboards
 */
export class Leaderboard {
  private namespace: string;
  private options: Required<LeaderboardOptions>;

  constructor(
    leaderboardId: string, 
    options: LeaderboardOptions = {}
  ) {
    this.namespace = `leaderboard:${leaderboardId}`;
    this.options = {
      maxEntries: options.maxEntries || 100,
      sortOrder: options.sortOrder || 'desc',
      namespace: options.namespace || 'leaderboards'
    };
  }

  private getLeaderboardKey(): string {
    return `${this.options.namespace}:${this.namespace}`;
  }

  private getEntryKey(entryId: string): string {
    return `${this.options.namespace}:entry:${this.namespace}:${entryId}`;
  }

  /**
   * Add or update a leaderboard entry
   */
  async addEntry(entry: Omit<LeaderboardEntry, 'timestamp'>): Promise<KVOperationResult<LeaderboardEntry>> {
    const fullEntry: LeaderboardEntry = {
      ...entry,
      timestamp: Date.now()
    };

    // Store the entry
    const entryKey = this.getEntryKey(entry.id);
    const setResult = await setJSON(entryKey, fullEntry);
    
    if (!setResult.success) {
      return {
        success: false,
        error: setResult.error
      };
    }

    // Update leaderboard index
    await this.updateLeaderboardIndex(fullEntry);

    return {
      success: true,
      data: fullEntry
    };
  }

  /**
   * Update leaderboard index with new entry
   */
  private async updateLeaderboardIndex(entry: LeaderboardEntry): Promise<void> {
    const leaderboardKey = this.getLeaderboardKey();
    const entriesResult = await getJSON<LeaderboardEntry[]>(leaderboardKey);
    let entries = entriesResult.data || [];

    // Remove existing entry if it exists
    entries = entries.filter(e => e.id !== entry.id);
    
    // Add new entry
    entries.push(entry);
    
    // Sort entries
    entries.sort((a, b) => {
      return this.options.sortOrder === 'desc' 
        ? b.score - a.score 
        : a.score - b.score;
    });
    
    // Limit entries
    if (entries.length > this.options.maxEntries) {
      entries = entries.slice(0, this.options.maxEntries);
    }
    
    // Store updated leaderboard
    await setJSON(leaderboardKey, entries);
  }

  /**
   * Get leaderboard entries
   */
  async getEntries(limit?: number): Promise<KVOperationResult<LeaderboardEntry[]>> {
    const leaderboardKey = this.getLeaderboardKey();
    const result = await getJSON<LeaderboardEntry[]>(leaderboardKey);
    
    let entries = result.data || [];
    
    if (limit && limit < entries.length) {
      entries = entries.slice(0, limit);
    }

    return {
      success: true,
      data: entries
    };
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(entryId: string): Promise<KVOperationResult<LeaderboardEntry | null>> {
    const entryKey = this.getEntryKey(entryId);
    return getJSON<LeaderboardEntry>(entryKey);
  }

  /**
   * Get entry rank (position in leaderboard)
   */
  async getEntryRank(entryId: string): Promise<KVOperationResult<number>> {
    const entriesResult = await this.getEntries();
    
    if (!entriesResult.success || !entriesResult.data) {
      return {
        success: false,
        error: 'Failed to get leaderboard entries'
      };
    }

    const rank = entriesResult.data.findIndex(entry => entry.id === entryId);
    
    return {
      success: true,
      data: rank >= 0 ? rank + 1 : -1 // 1-based ranking, -1 if not found
    };
  }

  /**
   * Remove an entry from leaderboard
   */
  async removeEntry(entryId: string): Promise<KVOperationResult<boolean>> {
    // Remove from index
    const leaderboardKey = this.getLeaderboardKey();
    const entriesResult = await getJSON<LeaderboardEntry[]>(leaderboardKey);
    
    if (entriesResult.data) {
      const filteredEntries = entriesResult.data.filter(e => e.id !== entryId);
      await setJSON(leaderboardKey, filteredEntries);
    }

    // Remove entry data
    const entryKey = this.getEntryKey(entryId);
    const deleteResult = await KVOperations.del(entryKey);

    return {
      success: true,
      data: deleteResult.success
    };
  }

  /**
   * Clear entire leaderboard
   */
  async clear(): Promise<KVOperationResult<number>> {
    const leaderboardKey = this.getLeaderboardKey();
    const entriesResult = await getJSON<LeaderboardEntry[]>(leaderboardKey);
    
    let deletedCount = 0;
    
    if (entriesResult.data) {
      for (const entry of entriesResult.data) {
        const entryKey = this.getEntryKey(entry.id);
        const deleteResult = await KVOperations.del(entryKey);
        if (deleteResult.success) {
          deletedCount += deleteResult.data || 0;
        }
      }
    }

    // Clear leaderboard index
    await KVOperations.del(leaderboardKey);
    deletedCount++;

    return {
      success: true,
      data: deletedCount
    };
  }

  /**
   * Get leaderboard statistics
   */
  async getStats(): Promise<KVOperationResult<{
    totalEntries: number;
    topScore: number;
    averageScore: number;
    lastUpdated: number;
  }>> {
    const entriesResult = await this.getEntries();
    
    if (!entriesResult.success || !entriesResult.data) {
      return {
        success: false,
        error: 'Failed to get leaderboard entries'
      };
    }

    const entries = entriesResult.data;
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      return {
        success: true,
        data: {
          totalEntries: 0,
          topScore: 0,
          averageScore: 0,
          lastUpdated: 0
        }
      };
    }

    const topScore = entries[0]?.score || 0;
    const averageScore = entries.reduce((sum, entry) => sum + entry.score, 0) / totalEntries;
    const lastUpdated = Math.max(...entries.map(entry => entry.timestamp));

    return {
      success: true,
      data: {
        totalEntries,
        topScore,
        averageScore,
        lastUpdated
      }
    };
  }
}

// Export convenience instances
export const defaultPubSub = new PubSubManager();
export const defaultCounters = new RealtimeCounters();

// Utility function to create leaderboards
export function createLeaderboard(
  leaderboardId: string, 
  options?: LeaderboardOptions
): Leaderboard {
  return new Leaderboard(leaderboardId, options);
} 