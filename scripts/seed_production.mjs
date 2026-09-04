import pg from "../node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/index.js";
import crypto from "node:crypto";

const { Client } = pg;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function seed() {
  const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ngtravels";
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected to PostgreSQL for seeding...");

  // 1. Check if drivers exist
  const dRes = await client.query("SELECT id FROM drivers LIMIT 1;");
  let driverId = 1;
  if (dRes.rows.length === 0) {
    console.log("Seeding initial driver Suresh K...");
    const insDriver = await client.query(`
      INSERT INTO drivers (
        driver_code, name, mobile, email, license_number, license_expiry,
        emergency_contact, status, availability, rating, notes
      ) VALUES (
        'DRV-101', 'Suresh K', '+91 98450 11223', 'suresh.driver@ngtravels.in',
        'DL-KA01-2018004921', '2029-12-31', '+91 98450 99887 (Wife)',
        'active', 'available', '4.9', 'Senior driver. Expert in Bangalore-Mysore-Coorg outstation routes.'
      ) RETURNING id;
    `);
    driverId = insDriver.rows[0].id;
    console.log(`Driver created with ID ${driverId}`);
  } else {
    driverId = dRes.rows[0].id;
  }

  // 2. Check if users exist
  const uRes = await client.query("SELECT id FROM users LIMIT 1;");
  if (uRes.rows.length === 0) {
    console.log("Seeding initial users (Admin and Driver)...");
    const adminHash = hashPassword("NGTravels@2026");
    const driverHash = hashPassword("123456");

    await client.query(`
      INSERT INTO users (
        name, email, phone, password_hash, role, status
      ) VALUES (
        'Operations Admin', 'admin@ngtravels.in', '+91 98427 12345',
        $1, 'owner', 'active'
      );
    `, [adminHash]);

    await client.query(`
      INSERT INTO users (
        name, email, phone, password_hash, role, driver_id, status
      ) VALUES (
        'Suresh K (Pilot)', 'suresh.driver@ngtravels.in', '+91 98450 11223',
        $1, 'driver', $2, 'active'
      );
    `, [driverHash, driverId]);

    console.log("Admin and Driver users seeded successfully!");
  }

  // 3. Check if vehicles exist
  const vRes = await client.query("SELECT id FROM vehicles LIMIT 1;");
  if (vRes.rows.length === 0) {
    console.log("Seeding initial commercial fleet vehicle...");
    await client.query(`
      INSERT INTO vehicles (
        vehicle_number, vehicle_type, brand, model, year, capacity, fuel_type,
        assigned_driver_id, status, maintenance_status, current_odometer_km,
        insurance_expiry, permit_expiry, fitness_expiry, pollution_expiry, notes
      ) VALUES (
        'KA-01-MJ-5050', 'Innova Crysta', 'Toyota', 'Innova Crysta 2.4 ZX', 2023, 7, 'Diesel',
        $1, 'active', 'good', '45200',
        '2027-01-10', '2027-05-15', '2027-08-20', '2026-12-15', 'Flagship operations commercial vehicle'
      );
    `, [driverId]);
    console.log("Vehicle KA-01-MJ-5050 seeded!");
  }

  // 4. Check if customers exist
  const cRes = await client.query("SELECT id FROM customers LIMIT 1;");
  if (cRes.rows.length === 0) {
    console.log("Seeding initial verified customer...");
    await client.query(`
      INSERT INTO customers (
        customer_code, name, mobile, whatsapp, email, address, notes
      ) VALUES (
        'CUST-001', 'Rajesh Sharma', '+91 98451 23456', '+91 98451 23456',
        'rajesh.sharma@infosys.com', 'Prestige Tech Park, Marathahalli, Bangalore',
        'Corporate client. Prefers Innova Crysta for airport pickups.'
      );
    `);
    console.log("Customer CUST-001 seeded!");
  }

  console.log("Seed complete! Production database ready.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
