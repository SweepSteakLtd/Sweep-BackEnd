import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models';

const connector = new Connector();
export let database;

const getDatabaseConnection = async () => {
  const clientOptions = await connector.getOptions({
    instanceConnectionName: 'sweepsteak-64dd0:europe-west2:sweep-development',
    ipType: IpAddressTypes.PUBLIC,
  });

  const pool = new Pool({
    ...clientOptions,
    user: 'postgres',
    password: process.env.BE_DATABASE_PASSWORD,
    database: 'postgres',
    max: 5,
  });

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
