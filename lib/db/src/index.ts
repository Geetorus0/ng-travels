import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ngtravels";
const isRemote = Boolean(
  connectionString &&
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1")
);

export const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  idleTimeoutMillis: 30000,
});
// Idle pooled connections dropped by the upstream (e.g. Supabase's pgbouncer)
// otherwise surface as an unhandled 'error' event and can crash the process.
pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client:", err.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export { eq, and, or, desc, asc } from "drizzle-orm";
