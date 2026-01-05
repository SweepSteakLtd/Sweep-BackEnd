import cors from 'cors';
import { env } from '../config';

/**
 * CORS configuration based on environment
 */
const allowedOrigins = {
  local: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  development: [
    'https://dev.sweepsteak.com',
    'https://sweepsteak-dev.web.app',
    'http://localhost:3000',
  ],
  production: ['https://sweepsteak.com', 'https://www.sweepsteak.com'],
};

const getCurrentOrigins = (): string[] => {
  const currentEnv = env.CURRENT as keyof typeof allowedOrigins;
  return allowedOrigins[currentEnv] || allowedOrigins.local;
};

export const CorsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedList = getCurrentOrigins();

    if (allowedList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Id'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
});

/**
 * Permissive CORS for development/testing
 * Use only in local/development environments
 */
export const PermissiveCorsMiddleware = cors({
  origin: true,
  credentials: true,
});
