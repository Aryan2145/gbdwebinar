import { Pool } from "pg";

let pool: Pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.match(/@(localhost|127\.0\.0\.1|db):/) ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  return getPool().query(text, params);
}
