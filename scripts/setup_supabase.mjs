import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=================================================");
  console.log("NG Travels — Fresh Supabase Database Setup");
  console.log("Supabase Project: ddysnnfnzlhiidxkuvmh.supabase.co");
  console.log("=================================================\n");

  const migrationPath = path.resolve(__dirname, "../supabase/migrations/20260904_production_schema.sql");
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found at:", migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, "utf8");

  // Check for DB connection string
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes("localhost")) {
    console.log("ℹ️  To automatically execute this migration from CLI:");
    console.log("   Set your Supabase PostgreSQL connection string:");
    console.log("   $env:DATABASE_URL=\"postgresql://postgres:[YOUR-PASSWORD]@db.ddysnnfnzlhiidxkuvmh.supabase.co:5432/postgres\"\n");
    console.log("ℹ️  Alternatively, execute directly via Supabase Web Dashboard (Recommended):");
    console.log("   1. Open: https://supabase.com/dashboard/project/ddysnnfnzlhiidxkuvmh/sql/new");
    console.log("   2. Copy and paste the contents of: supabase/migrations/20260904_production_schema.sql");
    console.log("   3. Click 'Run' to establish all tables, RLS policies, triggers, and Realtime publications.\n");
    return;
  }

  console.log("Connecting to PostgreSQL at:", dbUrl.replace(/:[^:@]+@/, ":****@"));
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL! Executing schema migration...");
    await client.query(sql);
    console.log("✓ Schema migration executed successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
