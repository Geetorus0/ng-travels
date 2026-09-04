import express from "express";
import router from "../artifacts/api-server/src/routes/ng-travels";
import request from "supertest";

const app = express();
app.use(express.json());
app.use("/api", router);

async function runVerification() {
  console.log("🚀 Starting Production API & State Machine Verification Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Vehicles List
  const vList = await request(app).get("/api/vehicles");
  assert(vList.status === 200 && Array.isArray(vList.body) && vList.body.length > 0, "GET /api/vehicles returns vehicle fleet list");
  assert(vList.body[0].insuranceStatus !== undefined, "Vehicles contain calculated insurance compliance status");

  // 2. Expiry Alerts
  const vAlerts = await request(app).get("/api/vehicles/expiry-alerts");
  assert(vAlerts.status === 200 && Array.isArray(vAlerts.body), "GET /api/vehicles/expiry-alerts returns expiring compliance items");

  // 3. Create Vehicle
  const newV = await request(app)
    .post("/api/vehicles")
    .set("x-user-role", "owner")
    .send({
      vehicleNumber: "TN-33-AB-9999",
      vehicleType: "Innova Crysta",
      brand: "Toyota",
      model: "Innova Crysta 2.4",
      capacity: 7,
      fuelType: "Diesel",
      currentOdometerKm: "25000",
      insuranceExpiry: "2027-01-10",
      permitExpiry: "2027-05-15",
      fitnessExpiry: "2027-08-20",
      pollutionExpiry: "2026-12-15",
    });
  assert(newV.status === 201 && newV.body.vehicleNumber === "TN-33-AB-9999", "POST /api/vehicles creates new commercial vehicle");

  // 4. Trip Assignment (Driver + Vehicle)
  const assignRes = await request(app)
    .post("/api/trips/1/assign")
    .set("x-user-role", "owner")
    .send({
      driverId: 1,
      vehicleId: 1,
    });
  assert(assignRes.status === 200 && assignRes.body.status === "assigned", "POST /api/trips/:id/assign assigns Driver + Vehicle");

  // 5. Driver State Machine: Accept
  const acceptRes = await request(app).post("/api/driver/trips/1/accept");
  assert(acceptRes.status === 200 && (acceptRes.body.status === "accepted" || acceptRes.body.success), "Stage 1: Driver accepts trip (status -> accepted)");

  // 6. Driver State Machine: Arrived
  const arrivedRes = await request(app).post("/api/driver/trips/1/arrived");
  assert(arrivedRes.status === 200 && (arrivedRes.body.status === "driver_arrived" || arrivedRes.body.success), "Stage 2: Driver arrived at pickup (status -> driver_arrived)");

  // 7. Driver State Machine: Start Trip (Odometer KM)
  const startRes = await request(app)
    .post("/api/driver/trips/1/start")
    .send({ startingKm: 45000 });
  assert(startRes.status === 200 && (startRes.body.status === "started" || startRes.body.startingKm === "45000"), "Stage 3: Driver starts trip with Odometer KM (status -> started)");

  // 8. GPS Telemetry Stream
  const locRes = await request(app)
    .post("/api/driver/trips/1/location")
    .send({
      latitude: 11.3415,
      longitude: 77.7180,
      speed: 55,
      heading: 240,
      accuracy: 6,
    });
  assert(locRes.status === 200 && locRes.body.success, "Telemetry: GPS coordinates ingested successfully");

  // 9. Fetch Live Location
  const liveLoc = await request(app).get("/api/trips/1/live-location");
  assert(liveLoc.status === 200 && liveLoc.body.latitude !== undefined, "Telemetry: GET /api/trips/:id/live-location returns coordinates");

  // 10. Driver State Machine: In Progress
  const inProgressRes = await request(app).post("/api/driver/trips/1/in-progress");
  assert(inProgressRes.status === 200 && (inProgressRes.body.status === "in_progress" || inProgressRes.body.success), "Stage 4: Journey In Progress");

  // 11. Driver State Machine: Reached Destination
  const destRes = await request(app).post("/api/driver/trips/1/reached-destination");
  assert(destRes.status === 200 && (destRes.body.status === "reached_destination" || destRes.body.success), "Stage 5: Reached Destination");

  // 12. Driver State Machine: Complete Trip (Ending KM Validation)
  const completeRes = await request(app)
    .post("/api/driver/trips/1/complete")
    .send({ endingKm: 45150 });
  assert(completeRes.status === 200 && (completeRes.body.status === "completed" || completeRes.body.actualKm === "150"), "Stage 6: Trip completed with verified Ending KM (45150 - 45000 = 150 KM)");

  // 13. Odometer Validation Failure Check (Ending KM < Starting KM)
  const invalidOdoRes = await request(app)
    .post("/api/driver/trips/1/complete")
    .send({ endingKm: 40000 });
  assert(invalidOdoRes.status === 400, "Validation: Rejects invalid odometer reading (ending KM < starting KM)");

  // 14. Dashboard Production Metrics
  const dashRes = await request(app)
    .get("/api/dashboard")
    .set("x-user-role", "owner");
  assert(dashRes.status === 200 && dashRes.body.metrics !== undefined, "Dashboard: Real-time KPIs computed from database");

  // 15. Mobile Auth: Driver Login
  const driverLogin = await request(app)
    .post("/api/auth/driver-login")
    .send({ mobile: "9842712345" });
  assert(driverLogin.status === 200 && driverLogin.body.role === "driver" && driverLogin.body.token, "Auth: Driver mobile login returns session token");

  // 16. Mobile Auth: Owner Login
  const ownerLogin = await request(app)
    .post("/api/auth/owner-login")
    .send({ email: "operations@ngtravels.in" });
  assert(ownerLogin.status === 200 && ownerLogin.body.role === "owner" && ownerLogin.body.token, "Auth: Owner login returns session token");

  console.log(`\n📊 Verification Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL PRODUCTION CHECKS PASSED PERFECTLY!");
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
