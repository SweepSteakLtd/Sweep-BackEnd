import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models';

const client = postgres(process.env.SUPABASE_DATABASE_PASSWORD);
export const database = drizzle({ client, schema });
