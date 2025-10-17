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

(async () => {
  database = await getDatabaseConnection();
})();
