'use client';

import { useState, useEffect } from 'react';

/**
 * LeaderboardExample Component
 * 
 * Demonstrates Vercel KV leaderboard functionality including:
 * - Adding/updating entries
 * - Real-time leaderboard display
 * - Player ranking
 * - Leaderboard statistics
 */

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface LeaderboardStats {
  totalEntries: number;
  topScore: number;
  averageScore: number;
  lastUpdated: number;
}

export default function LeaderboardExample() {
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Load leaderboard on component mount
  useEffect(() => {
    loadLeaderboard();
    loadStats();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard/entries?limit=10');
      const result = await response.json();
      
      if (result.success) {
        setEntries(result.data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/leaderboard/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleAddEntry = async () => {
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
          metadata: { level, timestamp: Date.now() }
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully added ${playerName} with score ${score}!`);
        await loadLeaderboard();
        await loadStats();
        await checkPlayerRank();
        
        // Clear form
        setScore(0);
      } else {
        setError(result.error || 'Failed to add entry');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkPlayerRank = async () => {
    if (!playerId) return;

    try {
      const response = await fetch(`/api/leaderboard/rank?playerId=${encodeURIComponent(playerId)}`);
      const result = await response.json();
      
      if (result.success && result.data > 0) {
        setPlayerRank(result.data);
      } else {
        setPlayerRank(null);
      }
    } catch (err) {
      console.error('Failed to get player rank:', err);
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leaderboard/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully removed entry`);
        await loadLeaderboard();
        await loadStats();
        
        if (entryId === playerId) {
          setPlayerRank(null);
        }
      } else {
        setError(result.error || 'Failed to remove entry');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLeaderboard = async () => {
    if (!confirm('Are you sure you want to clear the entire leaderboard?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leaderboard/clear', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully cleared leaderboard`);
        setEntries([]);
        setStats(null);
        setPlayerRank(null);
      } else {
        setError(result.error || 'Failed to clear leaderboard');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPlayer = () => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomId = Math.floor(Math.random() * 10000);
    const randomScore = Math.floor(Math.random() * 10000) + 100;
    const randomLevel = Math.floor(Math.random() * 20) + 1;
    
    setPlayerId(`player_${randomId}`);
    setPlayerName(randomName);
    setScore(randomScore);
    setLevel(randomLevel);
  };

  const getRankDisplay = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vercel KV Leaderboard Demo</h2>
      
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Entry Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Add Player</h3>
          
          <div>
            <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-1">
              Player ID
            </label>
            <input
              id="playerId"
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Enter unique player ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
              Score
            </label>
            <input
              id="score"
              type="number"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <input
              id="level"
              type="number"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={handleAddEntry}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add to Leaderboard'}
            </button>

            <button
              onClick={generateRandomPlayer}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Generate Random Player
            </button>

            <button
              onClick={checkPlayerRank}
              disabled={!playerId}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Check My Rank
            </button>

            <button
              onClick={handleClearLeaderboard}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Clear Leaderboard
            </button>
          </div>

          {/* Player Rank Display */}
          {playerRank && (
            <div className="p-3 bg-blue-50 rounded-md">
              <h4 className="font-semibold text-blue-800">Your Rank</h4>
              <p className="text-2xl font-bold text-blue-600">#{playerRank}</p>
            </div>
          )}
        </div>

        {/* Leaderboard Display */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Top 10 Players</h3>
            <button
              onClick={loadLeaderboard}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No entries yet. Add some players to get started!
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-md border ${
                    entry.id === playerId 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-gray-600 min-w-[2rem]">
                        {getRankDisplay(index)}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800">{entry.name}</p>
                        <p className="text-sm text-gray-600">
                          Level {entry.metadata?.level || 1} • {entry.id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{entry.score.toLocaleString()}</p>
                      <button
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Statistics Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Statistics</h3>
          
          {stats ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Total Players</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalEntries}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Top Score</p>
                <p className="text-2xl font-bold text-green-600">{stats.topScore.toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Average Score</p>
                <p className="text-2xl font-bold text-orange-600">{Math.round(stats.averageScore).toLocaleString()}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">Last Updated</p>
                <p className="text-sm text-gray-600">
                  {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No statistics available
            </div>
          )}

          {/* Score Distribution */}
          {entries.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-md">
              <h4 className="font-semibold text-gray-800 mb-2">Score Distribution</h4>
              <div className="space-y-1">
                {entries.slice(0, 5).map((entry, index) => {
                  const maxScore = entries[0]?.score || 1;
                  const percentage = (entry.score / maxScore) * 100;
                  
                  return (
                    <div key={entry.id} className="flex items-center space-x-2">
                      <span className="text-xs w-12 text-gray-600">{entry.name.slice(0, 8)}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs w-16 text-gray-600">{entry.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Tips */}
      <div className="mt-8 p-4 bg-green-50 rounded-md">
        <h3 className="font-semibold text-green-800 mb-2">🎮 Leaderboard Features</h3>
        <div className="text-sm text-green-700 space-y-1">
          <p><strong>Real-time Updates:</strong> Leaderboard automatically sorts by score</p>
          <p><strong>Player Ranking:</strong> Check your position among all players</p>
          <p><strong>Metadata Support:</strong> Store additional player information (level, achievements, etc.)</p>
          <p><strong>Statistics:</strong> Track total players, top scores, and averages</p>
        </div>
      </div>
    </div>
  );
} 