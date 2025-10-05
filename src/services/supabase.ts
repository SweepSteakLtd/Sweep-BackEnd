import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models';

const connectionString = process.env.SUPABASE_DATABASE_PASSWORD;

if (!connectionString) {
  console.log('SUPABASE CONNECTION STRING MISSING 🛑');
  throw new Error('SUPABASE_CONNECTION_STRING environment variable is required');
}

const client = postgres(connectionString);
export const database = drizzle({ client, schema });
export const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
