# Vercel KV Integration Template

A comprehensive template for integrating Vercel KV (Redis) into your Next.js applications. This template provides key-value storage, advanced caching mechanisms, and real-time data management capabilities.

## 🚀 Features

- **Key-Value Operations**: Complete CRUD operations with error handling
- **Advanced Caching**: Time-based cache, LRU cache, and cache invalidation strategies
- **Real-Time Data**: Pub/Sub patterns, counters, and leaderboards
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Production Ready**: Error handling, health checks, and monitoring utilities

## 📋 Prerequisites

- Next.js 14+ application
- Vercel account with KV database enabled
- Node.js 18+ 

## 🛠️ Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Required - Get these from your Vercel KV dashboard
KV_URL=redis://your-kv-url
KV_REST_API_URL=https://your-rest-api-url
KV_REST_API_TOKEN=your-rest-api-token

# Optional - For read-only operations
KV_REST_API_READ_ONLY_TOKEN=your-read-only-token
```

### 2. Getting Vercel KV Credentials

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project
3. Go to **Storage** tab
4. Create a new **KV Database** or select an existing one
5. Copy the environment variables from the **Settings** tab

### 3. Installation

The required dependencies are automatically installed when using this template:

```bash
npm install @vercel/kv
```

### 4. Initialize KV Connection

Add this to your `pages/_app.tsx` or `app/layout.tsx`:

```typescript
import { initializeKV } from '@/lib/vercel-kv';

// Initialize KV connection on app startup
initializeKV().catch(console.error);
```

## 📚 API Documentation

### Basic Operations

```typescript
import { KVOperations } from '@/lib/vercel-kv';

// Set a value
await KVOperations.set('user:123', { name: 'John', email: 'john@example.com' });

// Get a value
const user = await KVOperations.get('user:123');

// Delete a value
await KVOperations.del('user:123');

// Check if key exists
const exists = await KVOperations.exists('user:123');

// Increment a counter
await KVOperations.incr('page_views');
```

### Caching

```typescript
import { TimeBasedCache, LRUCache } from '@/lib/vercel-kv';

// Time-based cache
const cache = new TimeBasedCache('api_cache', 3600); // 1 hour TTL

// Cache with automatic computation
const data = await cache.getOrSet('expensive_operation', async () => {
  return await fetchExpensiveData();
}, 1800); // 30 minutes

// LRU Cache
const lruCache = new LRUCache('user_cache', 1000); // Max 1000 entries
await lruCache.set('user:123', userData);
const user = await lruCache.get('user:123');
```

### Real-Time Counters

```typescript
import { RealtimeCounters } from '@/lib/vercel-kv';

const counters = new RealtimeCounters();

// Increment page views
await counters.increment('page_views');

// Get counter value
const pageViews = await counters.getCounter('page_views');

// Set specific value
await counters.setCounter('downloads', 1000);
```

### Pub/Sub Messaging

```typescript
import { PubSubManager } from '@/lib/vercel-kv';

const pubsub = new PubSubManager();

// Publish a message
await pubsub.publish('notifications', {
  type: 'user_signup',
  userId: '123',
  timestamp: Date.now()
});

// Subscribe to channel
await pubsub.subscribe('notifications', 'subscriber_id');

// Get recent messages
const messages = await pubsub.getMessages('notifications', 10);
```

### Leaderboards

```typescript
import { Leaderboard } from '@/lib/vercel-kv';

const gameLeaderboard = new Leaderboard('game_scores', {
  maxEntries: 100,
  sortOrder: 'desc'
});

// Add entry
await gameLeaderboard.addEntry({
  id: 'player_123',
  name: 'John Doe',
  score: 9500,
  metadata: { level: 10, achievements: ['speedrun'] }
});

// Get top 10
const topPlayers = await gameLeaderboard.getEntries(10);

// Get player rank
const rank = await gameLeaderboard.getEntryRank('player_123');
```

## 🔧 Configuration Options

### Cache Configuration

```typescript
// Time-based cache options
const cache = new TimeBasedCache('namespace', 3600); // 1 hour default TTL

// LRU cache options
const lruCache = new LRUCache('namespace', 1000, 7200); // 1000 max entries, 2 hour TTL

// Cache invalidation
const invalidation = new CacheInvalidation('namespace');
await invalidation.setWithTags('key', data, ['tag1', 'tag2']);
await invalidation.invalidateByTag('tag1');
```

### Leaderboard Configuration

```typescript
const leaderboard = new Leaderboard('leaderboard_id', {
  maxEntries: 50,        // Maximum entries to keep
  sortOrder: 'desc',     // 'desc' for highest first, 'asc' for lowest first
  namespace: 'custom'    // Custom namespace for keys
});
```

## 🎯 Usage Examples

### API Route Example

```typescript
// pages/api/cache-example.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { defaultCache } from '@/lib/vercel-kv';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cacheKey = `api_data_${req.query.id}`;
    
    const cachedData = await defaultCache.getOrSet(cacheKey, async () => {
      // Expensive operation
      const response = await fetch(`https://api.example.com/data/${req.query.id}`);
      return response.json();
    }, 1800); // Cache for 30 minutes
    
    if (cachedData.success) {
      res.status(200).json(cachedData.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Server Component Example

```typescript
// app/dashboard/page.tsx
import { defaultCounters } from '@/lib/vercel-kv';

export default async function DashboardPage() {
  const pageViews = await defaultCounters.getCounter('dashboard_views');
  await defaultCounters.increment('dashboard_views');
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Page views: {pageViews.data?.value || 0}</p>
    </div>
  );
}
```

### Client Component Example

```typescript
// components/RealtimeCounter.tsx
'use client';

import { useState, useEffect } from 'react';

export default function RealtimeCounter({ counterId }: { counterId: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Fetch initial count
    fetch(`/api/counters/${counterId}`)
      .then(res => res.json())
      .then(data => setCount(data.value));
      
    // Poll for updates (in production, use WebSockets or Server-Sent Events)
    const interval = setInterval(async () => {
      const response = await fetch(`/api/counters/${counterId}`);
      const data = await response.json();
      setCount(data.value);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [counterId]);
  
  const increment = async () => {
    await fetch(`/api/counters/${counterId}/increment`, { method: 'POST' });
    setCount(prev => prev + 1);
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## 🔍 Health Checks and Monitoring

### Health Check Endpoint

```typescript
// pages/api/health/kv.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { checkKVHealth } from '@/lib/vercel-kv';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isHealthy = await checkKVHealth();
  
  res.status(isHealthy ? 200 : 503).json({
    service: 'vercel-kv',
    healthy: isHealthy,
    timestamp: new Date().toISOString()
  });
}
```

### Cache Statistics

```typescript
import { defaultCache } from '@/lib/vercel-kv';

// Get cache performance metrics
const stats = await defaultCache.getStats();
console.log(`Cache hit rate: ${(stats.data?.hitRate * 100).toFixed(2)}%`);
```

## 🚨 Error Handling

All operations return a consistent result format:

```typescript
interface KVOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Always check for success
const result = await KVOperations.get('key');
if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Errors**
   ```
   Error: Missing required Vercel KV environment variables
   ```
   - Ensure all required environment variables are set
   - Check that KV_URL, KV_REST_API_URL, and KV_REST_API_TOKEN are correct

2. **Permission Errors**
   ```
   Error: Unauthorized
   ```
   - Verify your KV_REST_API_TOKEN is valid
   - Check that your Vercel KV database is active

3. **Timeout Errors**
   ```
   Error: Request timeout
   ```
   - Check your network connection
   - Verify Vercel KV service status

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

### Performance Optimization

1. **Use appropriate TTL values**
   - Short TTL (5-15 minutes) for frequently changing data
   - Long TTL (1-24 hours) for static data

2. **Batch operations when possible**
   ```typescript
   // Instead of multiple individual sets
   await KVOperations.mset({
     'key1': 'value1',
     'key2': 'value2',
     'key3': 'value3'
   });
   ```

3. **Use namespaces to organize data**
   ```typescript
   const userCache = new TimeBasedCache('users');
   const apiCache = new TimeBasedCache('api_responses');
   ```

## 📈 Best Practices

1. **Always handle errors gracefully**
2. **Use appropriate cache TTL values**
3. **Implement cache warming for critical data**
4. **Monitor cache hit rates**
5. **Use namespaces to organize keys**
6. **Implement proper cleanup for temporary data**
7. **Use read-only tokens for read operations when possible**

## 🔗 Related Resources

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Redis Commands Reference](https://redis.io/commands)
- [Next.js Documentation](https://nextjs.org/docs)

## 📄 License

This template is part of the capx-compose project and follows the same license terms. 