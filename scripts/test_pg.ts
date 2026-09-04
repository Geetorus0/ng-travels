import pg from "pg";

const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/ngtravels";

interface TableRow {
  table_name: string;
}

async function testPostgresConnection() {
  console.log("Connecting to PostgreSQL at:", connectionString.replace(/:[^:@]+@/, ":***@"));
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL successfully!\n");

    const res = await client.query<TableRow>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC"
    );

    console.log(`Found ${res.rows.length} public tables in database:`);
    res.rows.forEach((r: TableRow) => {
      console.log(`  - ${r.table_name}`);
    });

    const userCount = await client.query("SELECT count(*) FROM users");
    const driverCount = await client.query("SELECT count(*) FROM drivers");
    const vehicleCount = await client.query("SELECT count(*) FROM vehicles");
    const tripCount = await client.query("SELECT count(*) FROM trips");

    console.log("\nTable Record Counts:");
    console.log(`  - users: ${userCount.rows[0].count}`);
    console.log(`  - drivers: ${driverCount.rows[0].count}`);
    console.log(`  - vehicles: ${vehicleCount.rows[0].count}`);
    console.log(`  - trips: ${tripCount.rows[0].count}`);
  } catch (err: any) {
    console.error("✗ PostgreSQL connection error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPostgresConnection();
