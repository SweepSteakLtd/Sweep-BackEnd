export const secrets = {
  MONGO_URI: process.env.MONGO_URI || '',
};

export const config = {
  NODE_JS_VERSION: process.version,
};

export const env = {
  CURRENT: process.env.APPLIED_ENV,
  TEST: 'test',
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  LOCAL: 'local',
};

export const links = {
  BACKEND: process.env.SELF_URL || 'http://localhost:8080',
  FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
};
