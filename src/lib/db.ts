import { Pool } from "pg";

let pool: Pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  return getPool().query(text, params);
}
