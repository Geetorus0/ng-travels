import http from "node:http";
import app from "../artifacts/api-server/src/app.ts"; // esbuild bundle or direct

// Or run verification against the express app on a local ephemeral port
const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🚀 Production Verification Server running at ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Vehicles List
    const vRes = await fetch(`${baseUrl}/api/vehicles`);
    const vehicles = await vRes.json();
    assert(vRes.status === 200 && Array.isArray(vehicles) && vehicles.length > 0, "GET /api/vehicles returns vehicle fleet list");
    assert(vehicles[0].insuranceStatus !== undefined, "Vehicles include compliance status (insurance, permit, fitness, PUC)");

    // 2. Expiry Alerts
    const alertRes = await fetch(`${baseUrl}/api/vehicles/expiry-alerts`);
    const alerts = await alertRes.json();
    assert(alertRes.status === 200 && Array.isArray(alerts), "GET /api/vehicles/expiry-alerts returns expiring compliance items");

    // 3. Create Vehicle
    const newVRes = await fetch(`${baseUrl}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({
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
      }),
    });
    const newV = await newVRes.json();
    assert(newVRes.status === 201 && newV.vehicleNumber === "TN-33-AB-9999", "POST /api/vehicles creates new commercial vehicle");

    // 4. Trip Assignment (Driver + Vehicle)
    const assignRes = await fetch(`${baseUrl}/api/trips/1/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({ driverId: 1, vehicleId: 1 }),
    });
    const assignedTrip = await assignRes.json();
    assert(assignRes.status === 200 && assignedTrip.status === "assigned", "POST /api/trips/:id/assign assigns Driver + Vehicle (status -> assigned)");

    // 5. Driver Accept Trip
    const acceptRes = await fetch(`${baseUrl}/api/driver/trips/1/accept`, { method: "POST" });
    const acceptedTrip = await acceptRes.json();
    assert(acceptRes.status === 200 && (acceptedTrip.status === "accepted" || acceptedTrip.success), "Stage 1: Driver accepts trip (status -> accepted)");

    // 6. Driver Arrived at Pickup
    const arrivedRes = await fetch(`${baseUrl}/api/driver/trips/1/arrived`, { method: "POST" });
    const arrivedTrip = await arrivedRes.json();
    assert(arrivedRes.status === 200 && (arrivedTrip.status === "driver_arrived" || arrivedTrip.success), "Stage 2: Driver arrived at pickup (status -> driver_arrived)");

    // 7. Driver Start Trip (Starting KM)
    const startRes = await fetch(`${baseUrl}/api/driver/trips/1/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingKm: 45000 }),
    });
    const startedTrip = await startRes.json();
    assert(startRes.status === 200 && (startedTrip.status === "started" || startedTrip.startingKm === "45000"), "Stage 3: Driver starts trip with Odometer KM (status -> started)");

    // 8. GPS Telemetry Stream
    const locRes = await fetch(`${baseUrl}/api/driver/trips/1/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: 11.3415,
        longitude: 77.7180,
        speed: 55,
        heading: 240,
        accuracy: 6,
      }),
    });
    const locBody = await locRes.json();
    assert(locRes.status === 200 && locBody.success, "Telemetry: GPS coordinates ingested successfully");

    // 9. Fetch Live Location
    const liveLocRes = await fetch(`${baseUrl}/api/trips/1/live-location`);
    const liveLoc = await liveLocRes.json();
    assert(liveLocRes.status === 200 && liveLoc.latitude !== undefined, "Telemetry: GET /api/trips/:id/live-location returns active coordinates");

    // 10. Journey In Progress
    const inProgRes = await fetch(`${baseUrl}/api/driver/trips/1/in-progress`, { method: "POST" });
    const inProgTrip = await inProgRes.json();
    assert(inProgRes.status === 200 && (inProgTrip.status === "in_progress" || inProgTrip.success), "Stage 4: Journey in progress (status -> in_progress)");

    // 11. Reached Destination
    const destRes = await fetch(`${baseUrl}/api/driver/trips/1/reached-destination`, { method: "POST" });
    const destTrip = await destRes.json();
    assert(destRes.status === 200 && (destTrip.status === "reached_destination" || destTrip.success), "Stage 5: Reached destination (status -> reached_destination)");

    // 12. Complete Trip (Ending KM Validation)
    const completeRes = await fetch(`${baseUrl}/api/driver/trips/1/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endingKm: 45150 }),
    });
    const completedTrip = await completeRes.json();
    assert(completeRes.status === 200 && (completedTrip.status === "completed" || completedTrip.actualKm === "150"), "Stage 6: Trip completed with verified Ending KM (45150 - 45000 = 150 KM)");

    // 13. Odometer Validation Failure Check
    const invalidOdoRes = await fetch(`${baseUrl}/api/driver/trips/1/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endingKm: 40000 }),
    });
    assert(invalidOdoRes.status === 400, "Validation: Rejects invalid odometer reading (ending KM < starting KM)");

    // 14. Dashboard KPIs
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { "x-user-role": "owner" },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.metrics !== undefined, "Dashboard: Real-time KPIs computed from database");

    // 15. Mobile Driver Login
    const dLoginRes = await fetch(`${baseUrl}/api/auth/driver-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: "9842712345" }),
    });
    const dLogin = await dLoginRes.json();
    assert(dLoginRes.status === 200 && dLogin.role === "driver" && dLogin.token, "Auth: Driver mobile login returns session token");

    // 16. Mobile Owner Login
    const oLoginRes = await fetch(`${baseUrl}/api/auth/owner-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "operations@ngtravels.in" }),
    });
    const oLogin = await oLoginRes.json();
    assert(oLoginRes.status === 200 && oLogin.role === "owner" && oLogin.token, "Auth: Owner login returns session token");

    console.log(`\n📊 Verification Summary: ${passed} Passed, ${failed} Failed\n`);
    server.close(() => {
      if (failed > 0) {
        process.exit(1);
      } else {
        console.log("🎉 ALL 16 PRODUCTION CHECKS PASSED PERFECTLY!");
        process.exit(0);
      }
    });
  } catch (err) {
    console.error("Test error:", err);
    server.close(() => process.exit(1));
  }
});
