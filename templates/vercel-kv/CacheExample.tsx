'use client';

import { useState, useEffect } from 'react';

/**
 * CacheExample Component
 * 
 * Demonstrates Vercel KV caching mechanisms including:
 * - Time-based caching
 * - Cache statistics
 * - Cache invalidation
 * - Performance metrics
 */

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  namespace: string;
}

interface CacheEntry {
  key: string;
  value: any;
  cached: boolean;
  computeTime?: number;
  timestamp: number;
}

export default function CacheExample() {
  const [cacheKey, setCacheKey] = useState('');
  const [computeDelay, setComputeDelay] = useState(2000);
  const [ttl, setTtl] = useState(300); // 5 minutes default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cacheEntry, setCacheEntry] = useState<CacheEntry | null>(null);
  const [stats, setStats] = useState<CacheStats | null>(null);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Load cache stats on component mount
  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    }
  };

  const handleCacheOperation = async () => {
    if (!cacheKey) {
      setError('Please provide a cache key');
      return;
    }

    setLoading(true);
    setError(null);
    setCacheEntry(null);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/cache/get-or-compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: cacheKey, 
          computeDelay,
          ttl 
        })
      });

      const result = await response.json();
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (result.success) {
        setCacheEntry({
          key: cacheKey,
          value: result.data.value,
          cached: result.data.cached,
          computeTime: totalTime,
          timestamp: Date.now()
        });

        if (result.data.cached) {
          setSuccess(`Cache HIT! Retrieved in ${totalTime}ms`);
        } else {
          setSuccess(`Cache MISS! Computed and cached in ${totalTime}ms`);
        }

        // Refresh stats
        await loadCacheStats();
      } else {
        setError(result.error || 'Cache operation failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateKey = async () => {
    if (!cacheKey) {
      setError('Please provide a cache key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cacheKey })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully invalidated cache key: ${cacheKey}`);
        setCacheEntry(null);
        await loadCacheStats();
      } else {
        setError(result.error || 'Failed to invalidate cache');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cache/clear', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully cleared cache (${result.data} keys deleted)`);
        setCacheEntry(null);
        await loadCacheStats();
      } else {
        setError(result.error || 'Failed to clear cache');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomKey = () => {
    const keys = ['user_data', 'api_response', 'expensive_calc', 'db_query', 'external_api'];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const randomId = Math.floor(Math.random() * 1000);
    setCacheKey(`${randomKey}_${randomId}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vercel KV Caching Demo</h2>
      
      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Cache Controls</h3>
          
          <div>
            <label htmlFor="cacheKey" className="block text-sm font-medium text-gray-700 mb-1">
              Cache Key
            </label>
            <div className="flex gap-2">
              <input
                id="cacheKey"
                type="text"
                value={cacheKey}
                onChange={(e) => setCacheKey(e.target.value)}
                placeholder="Enter cache key (e.g., user_data_123)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={generateRandomKey}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Random
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="computeDelay" className="block text-sm font-medium text-gray-700 mb-1">
              Compute Delay (ms) - Simulates expensive operation
            </label>
            <input
              id="computeDelay"
              type="number"
              value={computeDelay}
              onChange={(e) => setComputeDelay(Number(e.target.value))}
              min="100"
              max="10000"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="ttl" className="block text-sm font-medium text-gray-700 mb-1">
              TTL (seconds)
            </label>
            <select
              id="ttl"
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={3600}>1 hour</option>
              <option value={86400}>24 hours</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleCacheOperation}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Get or Compute'}
            </button>

            <button
              onClick={handleInvalidateKey}
              disabled={loading || !cacheKey}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Invalidate Key
            </button>

            <button
              onClick={handleClearCache}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Cache
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Cache Statistics</h3>
          
          {stats && (
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Hit Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(stats.hitRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Total Keys</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalKeys}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Cache Hits</p>
                  <p className="text-lg font-semibold text-green-600">{stats.hits}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Cache Misses</p>
                  <p className="text-lg font-semibold text-red-600">{stats.misses}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Hits</span>
                  <span>Misses</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.hitRate * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Last Operation Result */}
          {cacheEntry && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-semibold text-gray-800 mb-2">Last Operation</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Key:</strong> 
                  <code className="bg-gray-200 px-1 rounded ml-1">{cacheEntry.key}</code>
                </p>
                <p>
                  <strong>Status:</strong> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                    cacheEntry.cached 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {cacheEntry.cached ? 'CACHE HIT' : 'CACHE MISS'}
                  </span>
                </p>
                <p><strong>Response Time:</strong> {cacheEntry.computeTime}ms</p>
                <p><strong>Value:</strong></p>
                <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto">
                  {typeof cacheEntry.value === 'string' 
                    ? cacheEntry.value 
                    : JSON.stringify(cacheEntry.value, null, 2)
                  }
                </pre>
                <p><strong>Timestamp:</strong> {new Date(cacheEntry.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">🚀 Performance Tips</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Cache Hit:</strong> Data retrieved from cache (fast)</p>
          <p><strong>Cache Miss:</strong> Data computed and stored in cache (slower first time)</p>
          <p><strong>TTL:</strong> Time To Live - how long data stays in cache</p>
          <p><strong>Hit Rate:</strong> Higher is better (aim for 80%+ for frequently accessed data)</p>
        </div>
      </div>
    </div>
  );
} 