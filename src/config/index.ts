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

// Firebase configuration for development
export const firebaseConfig = {
  apiKey: 'AIzaSyBLvjmSr6veKWXza12BABz9KdhSCz1A4tk',
  authDomain: 'sweepsteak-64dd0.firebaseapp.com',
  projectId: 'sweepsteak-64dd0',
  storageBucket: 'sweepsteak-64dd0.firebasestorage.app',
  messagingSenderId: '230553092247',
  appId: '1:230553092247:web:755825b939a886633ce9d2',
  measurementId: 'G-ZB9L5P1S5E',
};

export const links = {
  BACKEND: process.env.SELF_URL || 'http://localhost:8080',
  FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
};
