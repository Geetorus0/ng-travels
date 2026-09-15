import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=================================================");
  console.log("NG Travels — Supabase Database Migration Runner");
  console.log("=================================================\n");

  const migrationsDir = path.resolve(__dirname, "../supabase/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error("Migrations directory not found at:", migrationsDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No .sql migration files found in:", migrationsDir);
    process.exit(1);
  }

  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes("localhost")) {
    console.log("ℹ️  To automatically execute these migrations from CLI:");
    console.log("   Set your Supabase PostgreSQL connection string:");
    console.log("   $env:DATABASE_URL=\"postgresql://postgres:[YOUR-PASSWORD]@db.<project-ref>.supabase.co:5432/postgres\"\n");
    console.log("ℹ️  Alternatively, run them via the Supabase CLI:");
    console.log("   supabase db push\n");
    console.log("ℹ️  Or execute directly via the Supabase Web Dashboard SQL editor, in order:");
    for (const f of files) console.log("   -", f);
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
    console.log("Connected. Applying migrations in order:\n");

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`→ ${file}`);
      await client.query(sql);
      console.log(`✓ ${file} applied\n`);
    }

    console.log("✓ All migrations applied successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
