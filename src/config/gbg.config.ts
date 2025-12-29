/**
 * GBG Identity Verification Configuration
 */

import { isProduction } from './validateEnv';

export interface GBGConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  tokenRefreshBuffer: number; // Seconds before expiry to refresh token
  maxRetries: number;
  timeout: number; // Request timeout in milliseconds
}

/**
 * Get GBG configuration based on environment
 */
export function getGBGConfig(): GBGConfig {
  const isProd = isProduction();

  // Base URL - defaults to EU region
  const baseUrl =
    process.env.GBG_BASE_URL ||
    (isProd
      ? 'https://eu.platform.go.gbgplc.com'
      : 'https://eu.platform.go.gbgplc.com'); // Same for staging/dev

  // Authentication URL - uses centralized auth service
  // Note: Auth is centralized, not regional. Journey APIs use baseUrl.
  const authUrl =
    process.env.GBG_AUTH_URL || 'https://api.auth.gbgplc.com/as/token.oauth2';

  return {
    baseUrl,
    authUrl,
    clientId: process.env.GBG_CLIENT_ID!,
    clientSecret: process.env.GBG_CLIENT_SECRET!,
    username: process.env.GBG_USERNAME!,
    password: process.env.GBG_PASSWORD!,
    tokenRefreshBuffer: parseInt(process.env.GBG_TOKEN_REFRESH_BUFFER || '300', 10), // 5 minutes
    maxRetries: parseInt(process.env.GBG_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.GBG_TIMEOUT || '30000', 10), // 30 seconds
  };
}

/**
 * GBG API Endpoints
 * Note: AUTH uses centralized endpoint (api.auth.gbgplc.com)
 * Journey endpoints use regional baseUrl with /captain/api prefix
 */
export const GBG_ENDPOINTS = {
  AUTH: '/as/token.oauth2', // Used with api.auth.gbgplc.com
  JOURNEY_START: '/captain/api/journey/start', // Used with regional baseUrl
  JOURNEY_STATE: '/captain/api/journey/state/fetch',
  JOURNEY_TASK_LIST: '/captain/api/journey/task/list',
  JOURNEY_TASK_UPDATE: '/captain/api/journey/task/update',
} as const;
