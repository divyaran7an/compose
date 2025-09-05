'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Database, Zap, Trophy, Activity, Settings, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface KVData {
  key: string;
  value: any;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export default function VercelKVDemo() {
  // Environment setup state
  const [copiedEnvVar, setCopiedEnvVar] = useState<string | null>(null);
  
  // KV Operations state
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [retrievedData, setRetrievedData] = useState<KVData | null>(null);
  
  // Cache state
  const [cacheKey, setCacheKey] = useState('');
  const [computeDelay, setComputeDelay] = useState(2000);
  const [ttl, setTtl] = useState(300);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  
  // Leaderboard state
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  
  // Global state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Environment variables to display
  const envVars = [
    { name: 'KV_URL', description: 'Vercel KV database URL', example: 'redis://your-kv-url' },
    { name: 'KV_REST_API_URL', description: 'Vercel KV REST API URL', example: 'https://your-rest-api-url' },
    { name: 'KV_REST_API_TOKEN', description: 'Vercel KV REST API token', example: 'your-rest-api-token' },
    { name: 'KV_REST_API_READ_ONLY_TOKEN', description: 'Vercel KV REST API read-only token (optional)', example: 'your-read-only-token' }
  ];

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

  const copyToClipboard = async (text: string, envVar: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEnvVar(envVar);
      setTimeout(() => setCopiedEnvVar(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // KV Operations
  const handleSetKV = async () => {
    if (!key || !value) {
      setError('Please provide both key and value');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kv/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully set key: ${key}`);
        setValue('');
      } else {
        setError(result.error || 'Failed to set value');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGetKV = async () => {
    if (!key) {
      setError('Please provide a key');
      return;
    }

    setLoading(true);
    setError(null);
    setRetrievedData(null);

    try {
      const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);
      const result = await response.json();

      if (result.success && result.data !== null) {
        setRetrievedData({
          key,
          value: result.data,
          timestamp: Date.now()
        });
        setSuccess(`Successfully retrieved key: ${key}`);
      } else {
        setError('Key not found');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Cache Operations
  const handleCacheOperation = async () => {
    if (!cacheKey) {
      setError('Please provide a cache key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cache/get-or-compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cacheKey, computeDelay, ttl })
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.cached) {
          setSuccess(`Cache HIT! Retrieved from cache`);
        } else {
          setSuccess(`Cache MISS! Computed and cached`);
        }
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

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      const result = await response.json();
      if (result.success) {
        setCacheStats(result.data);
      }
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    }
  };

  // Leaderboard Operations
  const handleAddToLeaderboard = async () => {
    if (!playerId || !playerName || score < 0) {
      setError('Please provide valid player ID, name, and score');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leaderboard/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: playerId,
          name: playerName,
          score,
          metadata: { timestamp: Date.now() }
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Added ${playerName} to leaderboard!`);
        setScore(0);
        await loadLeaderboard();
      } else {
        setError(result.error || 'Failed to add to leaderboard');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard/entries?limit=5');
      const result = await response.json();
      if (result.success) {
        setLeaderboardEntries(result.data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    loadCacheStats();
    loadLeaderboard();
  }, []);

  const getRankDisplay = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Check if environment is configured
  const isConfigured = !!process.env.KV_REST_API_URL;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex justify-between items-center p-6">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <a href="https://twitter.com/0xcapx" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <svg width="40" height="14" viewBox="0 0 735 257" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M393.371 60.1076C428.418 39.3368 466.736 49.4457 488.168 73.7358C510.685 99.1 513.774 136.777 495.43 165.276C484.54 181.975 469.643 192.797 450.397 197.607C431.15 202.417 412.435 199.002 395.185 189.59V235.814C395.185 247.037 388.286 255.478 378.117 256.215C367.583 257.13 358.681 249.225 358.143 238.203C357.96 235.99 358.143 233.786 358.143 231.581V71.1384C358.042 68.2175 358.409 65.2993 359.228 62.4966C361.77 55.6906 366.49 51.4658 373.578 50.3596C380.295 49.0769 386.108 51.4658 390.829 56.6124C391.762 57.7109 392.612 58.8793 393.371 60.1076ZM395.367 124.071C394.282 141.355 408.626 162.495 433.138 162.495C453.842 162.679 470.736 145.396 470.918 124.256C470.918 102.932 454.206 85.6563 433.138 85.8406C409.354 86.025 394.456 106.427 395.367 124.071Z" fill="#E6E6E6"/>
              <path d="M284.264 64.3382C285.539 63.4244 285.539 62.318 285.896 61.3962C289.713 53.3075 297.704 49.0828 306.242 50.7342C310.287 51.4901 313.961 53.6097 316.664 56.748C319.368 59.8862 320.943 63.8584 321.132 68.0178V179.96C321.259 182.897 320.826 185.831 319.857 188.602C316.95 195.953 311.509 200.178 303.7 200.731C296.072 201.1 290.236 197.605 286.442 190.991C285.827 189.862 285.282 188.694 284.81 187.496C283.535 187.127 282.815 188.233 282.086 188.787C239.404 219.482 180.707 197.789 166.95 145.586C156.416 105.88 178.933 64.1538 217.069 52.4176C239.404 45.4272 260.629 48.9224 280.272 61.9733C281.718 62.5428 283.065 63.341 284.264 64.3382ZM201.632 125.737C201.608 129.27 202.036 132.792 202.907 136.214C209.624 162.869 240.497 174.26 261.564 157.722C280.454 143.012 282.268 114.521 265.524 97.4304C256.812 88.6122 246.097 84.5559 233.749 86.584C214.891 89.8868 201.814 106.064 201.632 125.737Z" fill="#E6E6E6"/>
              <path d="M594.467 93.1272C594.575 93.257 594.709 93.3614 594.861 93.433C595.013 93.5046 595.178 93.5417 595.346 93.5417C595.514 93.5417 595.679 93.5046 595.831 93.433C595.983 93.3614 596.117 93.257 596.225 93.1272C600.835 87.4355 605.437 81.9041 609.88 76.5571C615.511 69.751 620.968 62.929 626.591 56.155C631.676 50.2709 638.028 47.6976 645.655 49.7418C648.438 50.4709 651.012 51.8541 653.167 53.7789C655.322 55.7037 657 58.1159 658.061 60.8196C659.123 63.5234 659.54 66.4425 659.278 69.3399C659.016 72.2373 658.083 75.0313 656.554 77.495C655.2 79.5623 653.683 81.5142 652.015 83.331C641.846 95.8288 631.676 108.183 621.324 120.648C618.101 124.729 619.123 123.374 622.401 127.863L654.082 166.158C663.88 176.828 659.627 192.941 646.416 197.278C639.153 199.683 631.526 197.278 626.441 191.025C617.356 179.994 608.462 169.148 599.377 158.157C598.474 157.051 597.746 156.129 596.835 155.031C595.021 152.826 594.839 152.826 593.026 155.215C584.852 164.955 576.861 174.88 568.687 184.62C566.873 186.832 565.234 189.037 563.42 191.033C556.521 199.122 545.259 200.404 537.283 193.791C529.11 186.993 528.207 175.409 534.908 166.951C546.17 153.171 557.424 139.567 568.687 125.963C570.865 123.205 570.865 123.205 568.687 120.632C557.788 107.396 546.898 94.1774 536.001 81.1104C531.588 75.8035 529.213 70.1038 531.066 63.2897C531.804 60.0836 533.368 57.1326 535.6 54.7373C537.831 52.3419 540.649 50.5878 543.768 49.6534C546.887 48.719 550.194 48.6378 553.354 49.4179C556.514 50.1981 559.413 51.8118 561.757 54.0948C562.842 55.201 563.935 56.4997 565.02 57.7744C573.462 68.0996 590.412 88.3013 594.467 93.1272Z" fill="#8DBC1A"/>
              <path d="M79.6253 45.4856C99.4258 45.4856 116.494 52.2917 131.383 65.1581C139.739 72.5093 140.824 84.2695 133.759 92.1739C130.85 95.5177 126.849 97.6916 122.487 98.2994C118.125 98.9071 113.693 97.9081 109.999 95.4847C108.367 94.3783 107.092 93.0797 105.46 91.9895C86.3809 76.3653 56.7436 81.1431 43.303 101.738C28.4131 124.529 40.7607 155.961 67.6418 162.943C81.8033 166.623 94.6971 164.05 106.142 154.67C111.947 149.708 118.49 148.057 125.57 150.814C128.313 151.846 130.773 153.526 132.745 155.714C134.718 157.901 136.145 160.535 136.909 163.394C137.673 166.253 137.751 169.255 137.137 172.151C136.524 175.047 135.235 177.753 133.379 180.043C131.884 181.666 130.298 183.199 128.627 184.636C111.203 198.264 91.4024 204.301 69.4238 201.367C40.9112 197.359 19.6613 182.248 7.31376 155.961C-10.8472 117.177 5.1357 66.9779 52.7122 50.0791C61.3292 46.8913 70.4517 45.3343 79.6253 45.4856Z" fill="#E6E6E6"/>
              <rect x="675.089" y="3.13166" width="56.1296" height="56.9095" rx="27.877" stroke="#E6E6E6" strokeWidth="6.26869"/>
              <path d="M695.457 40.8973V21.3586H703.891C705.341 21.3586 706.61 21.6225 707.698 22.1504C708.785 22.6783 709.631 23.4384 710.235 24.4306C710.84 25.4228 711.142 26.6122 711.142 27.9987C711.142 29.398 710.83 30.5778 710.207 31.5382C709.59 32.4986 708.722 33.2237 707.602 33.7134C706.489 34.2031 705.188 34.448 703.7 34.448H698.663V30.3266H702.632C703.255 30.3266 703.786 30.2502 704.225 30.0976C704.67 29.9386 705.01 29.6874 705.246 29.3439C705.487 29.0004 705.608 28.552 705.608 27.9987C705.608 27.439 705.487 26.9842 705.246 26.6344C705.01 26.2782 704.67 26.0175 704.225 25.8521C703.786 25.6804 703.255 25.5945 702.632 25.5945H700.762V40.8973H695.457ZM706.906 31.9293L711.79 40.8973H706.028L701.258 31.9293H706.906Z" fill="#E6E6E6"/>
            </svg>
          </a>
        </div>

        {/* Hero Section */}
        <section className="px-6 pt-8 pb-16">
          <div className="mx-auto max-w-6xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                Ship KV Apps
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400 md:text-xl">
              Build high-performance applications with Vercel KV (Redis). Key-value storage, 
              advanced caching, and real-time data management.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-sm text-zinc-400">Redis-powered • Real-time • Scalable</span>
            </div>
          </div>
        </section>

        {/* Environment Setup Alert */}
        {!isConfigured && (
          <section className="px-6 pb-8">
            <div className="mx-auto max-w-4xl">
              <Alert className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <Settings className="h-4 w-4" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium text-white mb-1">Quick Setup</p>
                    <p className="text-zinc-400">
                      Configure your Vercel KV environment variables to start using Redis operations.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </section>
        )}

        {/* Status Messages */}
        <section className="px-6 pb-4">
          <div className="mx-auto max-w-4xl">
            {error && (
              <Alert variant="destructive" className="mb-4 border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 border-green-800 bg-green-900/20">
                <Check className="h-4 w-4" />
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <Tabs defaultValue="operations" className="space-y-8">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-800/50">
                <TabsTrigger value="operations" className="data-[state=active]:bg-zinc-700">
                  <Database className="h-4 w-4 mr-2" />
                  KV Operations
                </TabsTrigger>
                <TabsTrigger value="cache" className="data-[state=active]:bg-zinc-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Cache Demo
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="data-[state=active]:bg-zinc-700">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="setup" className="data-[state=active]:bg-zinc-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Setup
                </TabsTrigger>
              </TabsList>

              {/* KV Operations Tab */}
              <TabsContent value="operations">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Basic KV Operations
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Store and retrieve key-value pairs with Redis-like operations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="kv-key" className="text-white">Key</Label>
                        <Input
                          id="kv-key"
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                          placeholder="user:123"
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="kv-value" className="text-white">Value (JSON supported)</Label>
                        <Textarea
                          id="kv-value"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder='{"name": "John", "score": 1000}'
                          className="bg-zinc-800 border-zinc-600 text-white min-h-[100px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSetKV} 
                          disabled={loading}
                          className="bg-white text-black hover:bg-zinc-200"
                        >
                          Set
                        </Button>
                        <Button 
                          onClick={handleGetKV} 
                          disabled={loading}
                          variant="outline"
                          className="border-zinc-700 hover:border-zinc-600 text-white"
                        >
                          Get
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {retrievedData && (
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Retrieved Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <span className="text-zinc-400">Key:</span>
                            <Badge variant="secondary" className="ml-2 bg-zinc-700 text-white">
                              {retrievedData.key}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-zinc-400">Value:</span>
                            <pre className="mt-2 p-3 bg-zinc-800 rounded-lg text-sm overflow-x-auto">
                              {typeof retrievedData.value === 'string' 
                                ? retrievedData.value 
                                : JSON.stringify(retrievedData.value, null, 2)
                              }
                            </pre>
                          </div>
                          <div className="text-xs text-zinc-500">
                            Retrieved at: {new Date(retrievedData.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Cache Demo Tab */}
              <TabsContent value="cache">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Cache Performance
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Test caching with simulated expensive operations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="cache-key" className="text-white">Cache Key</Label>
                        <Input
                          id="cache-key"
                          value={cacheKey}
                          onChange={(e) => setCacheKey(e.target.value)}
                          placeholder="expensive_operation_123"
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="compute-delay" className="text-white">
                          Compute Delay (ms)
                        </Label>
                        <Input
                          id="compute-delay"
                          type="number"
                          value={computeDelay}
                          onChange={(e) => setComputeDelay(Number(e.target.value))}
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ttl" className="text-white">TTL (seconds)</Label>
                        <Input
                          id="ttl"
                          type="number"
                          value={ttl}
                          onChange={(e) => setTtl(Number(e.target.value))}
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <Button 
                        onClick={handleCacheOperation} 
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-zinc-200"
                      >
                        {loading ? 'Processing...' : 'Get or Compute'}
                      </Button>
                    </CardContent>
                  </Card>

                  {cacheStats && (
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Cache Statistics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">
                              {(cacheStats.hitRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-zinc-400">Hit Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {cacheStats.totalKeys}
                            </div>
                            <div className="text-sm text-zinc-400">Total Keys</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-400">
                              {cacheStats.hits}
                            </div>
                            <div className="text-sm text-zinc-400">Hits</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-red-400">
                              {cacheStats.misses}
                            </div>
                            <div className="text-sm text-zinc-400">Misses</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${cacheStats.hitRate * 100}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Add Player
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Add entries to the real-time leaderboard
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="player-id" className="text-white">Player ID</Label>
                        <Input
                          id="player-id"
                          value={playerId}
                          onChange={(e) => setPlayerId(e.target.value)}
                          placeholder="player_123"
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="player-name" className="text-white">Player Name</Label>
                        <Input
                          id="player-name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="John Doe"
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="score" className="text-white">Score</Label>
                        <Input
                          id="score"
                          type="number"
                          value={score}
                          onChange={(e) => setScore(Number(e.target.value))}
                          className="bg-zinc-800 border-zinc-600 text-white"
                        />
                      </div>
                      <Button 
                        onClick={handleAddToLeaderboard} 
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-zinc-200"
                      >
                        Add to Leaderboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-white">Top Players</CardTitle>
                      <Button 
                        onClick={loadLeaderboard}
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 hover:border-zinc-600 text-white"
                      >
                        Refresh
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {leaderboardEntries.length === 0 ? (
                          <div className="text-center py-6 text-zinc-400">
                            No entries yet
                          </div>
                        ) : (
                          leaderboardEntries.map((entry, index) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold min-w-[2rem]">
                                  {getRankDisplay(index)}
                                </span>
                                <div>
                                  <div className="font-medium text-white">{entry.name}</div>
                                  <div className="text-sm text-zinc-400">{entry.id}</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-blue-400">
                                {entry.score.toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Setup Tab */}
              <TabsContent value="setup">
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Environment Setup
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Configure your Vercel KV environment variables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {envVars.map((envVar) => (
                        <div key={envVar.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-white font-medium">{envVar.name}</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`${envVar.name}=${envVar.example}`, envVar.name)}
                              className="border-zinc-700 hover:border-zinc-600 text-white"
                            >
                              {copiedEnvVar === envVar.name ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-zinc-400">{envVar.description}</p>
                          <code className="block p-2 bg-zinc-800 rounded text-sm text-zinc-300">
                            {envVar.name}={envVar.example}
                          </code>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6 bg-zinc-700" />

                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Quick Setup Steps</h4>
                      <ol className="space-y-2 text-sm text-zinc-300">
                        <li>1. Create a Vercel KV database in your Vercel dashboard</li>
                        <li>2. Copy the environment variables from the KV settings</li>
                        <li>3. Add them to your <code className="bg-zinc-800 px-1 rounded">.env.local</code> file</li>
                        <li>4. Restart your development server</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Key Features</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardContent className="p-6">
                  <Database className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Redis Operations</h3>
                  <p className="text-zinc-400 text-sm">
                    Full CRUD operations with atomic transactions, TTL support, and pattern matching
                  </p>
                </CardContent>
              </Card>
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardContent className="p-6">
                  <Zap className="h-8 w-8 text-orange-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Smart Caching</h3>
                  <p className="text-zinc-400 text-sm">
                    Time-based cache, LRU policies, and automatic cache warming for optimal performance
                  </p>
                </CardContent>
              </Card>
              <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <CardContent className="p-6">
                  <Trophy className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Leaderboards</h3>
                  <p className="text-zinc-400 text-sm">
                    Real-time sorted sets for rankings, counters, and competitive features
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-zinc-400">
              Crafted with ❤️ at{' '}
              <a 
                href="https://twitter.com/0xcapx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-zinc-300 transition-colors"
              >
                Capx
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}