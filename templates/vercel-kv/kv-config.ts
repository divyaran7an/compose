import { kv } from '@vercel/kv';

/**
 * Vercel KV Configuration
 * 
 * This module provides configuration and connection setup for Vercel KV.
 * It handles environment variable validation and provides a configured KV instance.
 */

// Environment variable validation
const requiredEnvVars = [
  'KV_URL',
  'KV_REST_API_URL', 
  'KV_REST_API_TOKEN'
] as const;

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
export function validateKVConfig(): void {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Vercel KV environment variables: ${missing.join(', ')}\n` +
      'Please ensure these are set in your .env.local file or deployment environment.'
    );
  }
}

/**
 * KV Configuration object with environment variables
 */
export const kvConfig = {
  url: process.env.KV_URL!,
  restApiUrl: process.env.KV_REST_API_URL!,
  restApiToken: process.env.KV_REST_API_TOKEN!,
  restApiReadOnlyToken: process.env.KV_REST_API_READ_ONLY_TOKEN,
} as const;

/**
 * Configured KV instance
 * This is the main instance to use for all KV operations
 */
export const kvInstance = kv;

/**
 * Connection health check
 * @returns Promise<boolean> True if connection is healthy
 */
export async function checkKVHealth(): Promise<boolean> {
  try {
    validateKVConfig();
    
    // Simple ping test
    const testKey = '__health_check__';
    const testValue = Date.now().toString();
    
    await kvInstance.set(testKey, testValue, { ex: 10 }); // Expire in 10 seconds
    const retrieved = await kvInstance.get(testKey);
    await kvInstance.del(testKey);
    
    return retrieved === testValue;
  } catch (error) {
    console.error('KV health check failed:', error);
    return false;
  }
}

/**
 * Initialize KV connection with validation
 * Call this at application startup to ensure KV is properly configured
 */
export async function initializeKV(): Promise<void> {
  try {
    validateKVConfig();
    
    const isHealthy = await checkKVHealth();
    if (!isHealthy) {
      throw new Error('KV health check failed - connection may be invalid');
    }
    
    console.log('✅ Vercel KV initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Vercel KV:', error);
    throw error;
  }
}

export default kvInstance; 