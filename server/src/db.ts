import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Apply sql/schema.sql on boot (idempotent — everything is IF NOT EXISTS). */
export async function initDb(): Promise<void> {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  console.log('✓ PostgreSQL schema ready');
}
