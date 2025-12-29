/**
 * GamStop Self-Exclusion Configuration
 */

import { isProduction } from './validateEnv';

export interface GamStopConfig {
  apiUrl: string;
  batchApiUrl: string;
  apiKey: string;
  batchSize: number;
  rateLimitDelay: number; // Milliseconds between batch requests
  timeout: number; // Request timeout in milliseconds
}

/**
 * Get GamStop configuration based on environment
 */
export function getGamStopConfig(): GamStopConfig {
  const isProd = isProduction();

  // API URLs - switch between staging and production
  const apiUrl =
    process.env.GAMSTOP_API_URL ||
    (isProd ? 'https://api.gamstop.io/v2' : 'https://api.stage.gamstop.io/v2');

  const batchApiUrl =
    process.env.GAMSTOP_BATCH_API_URL ||
    (isProd ? 'https://batch.gamstop.io/v2' : 'https://batch.stage.gamstop.io/v2');

  return {
    apiUrl,
    batchApiUrl,
    apiKey: process.env.GAMSTOP_API_KEY!,
    batchSize: 1000, // Max allowed by GamStop API
    rateLimitDelay: parseInt(process.env.GAMSTOP_RATE_LIMIT_DELAY || '1000', 10), // 1 second
    timeout: parseInt(process.env.GAMSTOP_TIMEOUT || '30000', 10), // 30 seconds
  };
}
