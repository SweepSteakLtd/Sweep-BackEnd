import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models';

const connector = new Connector();
export let database;

const getDatabaseConnection = async () => {
  // When running in GitHub Actions with Cloud SQL Proxy, connect via localhost
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  let pool: Pool;

  if (isGitHubActions) {
    // Connect through Cloud SQL Proxy running on localhost
    pool = new Pool({
      host: '127.0.0.1',
      port: 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.BE_DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'postgres',
      max: 5,
    });
    console.log('📡 Connecting to Cloud SQL via proxy (localhost)');
  } else {
    // Use Cloud SQL Connector for direct connection (local/Cloud Run)
    const clientOptions = await connector.getOptions({
      instanceConnectionName: 'sweepsteak-64dd0:europe-west2:sweep-development',
      ipType: IpAddressTypes.PUBLIC,
    });

    pool = new Pool({
      ...clientOptions,
      user: 'postgres',
      password: process.env.BE_DATABASE_PASSWORD,
      database: 'postgres',
      max: 5,
    });
    console.log('📡 Connecting to Cloud SQL via Connector');
  }

  return drizzle({ client: pool, schema });
};

// Create a promise that resolves when database is ready
export const databaseReady = (async () => {
  database = await getDatabaseConnection();
  return database;
})();

// Helper function to ensure database is initialized
export const ensureDatabaseReady = async () => {
  await databaseReady;
  return database;
};
