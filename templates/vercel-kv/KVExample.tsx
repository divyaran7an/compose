'use client';

import { useState, useEffect } from 'react';

/**
 * KVExample Component
 * 
 * Demonstrates basic Vercel KV operations including:
 * - Setting and getting values
 * - JSON data handling
 * - Key existence checking
 * - Error handling
 */

interface KVData {
  key: string;
  value: any;
  timestamp: number;
}

export default function KVExample() {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [retrievedData, setRetrievedData] = useState<KVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keyExists, setKeyExists] = useState<boolean | null>(null);

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

  const handleSet = async () => {
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

  const handleGet = async () => {
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

      if (result.success && result.data) {
        setRetrievedData({
          key,
          value: result.data,
          timestamp: Date.now()
        });
        setSuccess(`Successfully retrieved key: ${key}`);
      } else {
        setError(result.error || 'Key not found');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!key) {
      setError('Please provide a key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kv/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(`Successfully deleted key: ${key}`);
        setRetrievedData(null);
        setKeyExists(null);
      } else {
        setError(result.error || 'Failed to delete key');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExists = async () => {
    if (!key) {
      setError('Please provide a key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kv/exists?key=${encodeURIComponent(key)}`);
      const result = await response.json();

      if (result.success) {
        setKeyExists(result.data);
        setSuccess(`Key existence check completed`);
      } else {
        setError(result.error || 'Failed to check key existence');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setKey('');
    setValue('');
    setRetrievedData(null);
    setKeyExists(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vercel KV Operations</h2>
      
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

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
            Key
          </label>
          <input
            id="key"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter key (e.g., user:123)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
            Value (JSON supported)
          </label>
          <textarea
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Enter value (e.g., {"name": "John", "age": 30})'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={handleSet}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting...' : 'Set'}
        </button>

        <button
          onClick={handleGet}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Getting...' : 'Get'}
        </button>

        <button
          onClick={handleExists}
          disabled={loading}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Exists'}
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      <button
        onClick={handleClear}
        className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 mb-6"
      >
        Clear All
      </button>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Key Existence */}
        {keyExists !== null && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-800 mb-2">Key Existence</h3>
            <p className="text-sm">
              Key <code className="bg-gray-200 px-1 rounded">{key}</code> 
              <span className={keyExists ? 'text-green-600' : 'text-red-600'}>
                {keyExists ? ' exists' : ' does not exist'}
              </span>
            </p>
          </div>
        )}

        {/* Retrieved Data */}
        {retrievedData && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-800 mb-2">Retrieved Data</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Key:</strong> <code className="bg-gray-200 px-1 rounded">{retrievedData.key}</code></p>
              <p><strong>Value:</strong></p>
              <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto">
                {typeof retrievedData.value === 'string' 
                  ? retrievedData.value 
                  : JSON.stringify(retrievedData.value, null, 2)
                }
              </pre>
              <p><strong>Retrieved at:</strong> {new Date(retrievedData.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Examples */}
      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Usage Examples</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Simple string:</strong> <code>Hello World</code></p>
          <p><strong>JSON object:</strong> <code>{"{"}"name": "John", "age": 30{"}"}</code></p>
          <p><strong>Array:</strong> <code>[1, 2, 3, "test"]</code></p>
          <p><strong>Number:</strong> <code>42</code></p>
        </div>
      </div>
    </div>
  );
} 