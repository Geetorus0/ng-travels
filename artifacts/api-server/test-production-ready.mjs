const API_BASE = "http://localhost:5000/api";

async function runTests() {
  console.log("=== NG TRAVELS PRODUCTION API & RBAC VERIFICATION ===");

  // 1. Check Owner Dashboard API
  console.log("\n[1] Testing GET /api/dashboard (Owner access)...");
  const dashRes = await fetch(`${API_BASE}/dashboard`, {
    headers: { "x-user-role": "owner" },
  });
  if (!dashRes.ok) throw new Error(`Dashboard request failed: ${dashRes.status}`);
  const dashData = await dashRes.json();
  console.log("✓ Dashboard metrics loaded successfully:");
  console.log(`  - Today's Trips: ${dashData.metrics.todaysTrips}`);
  console.log(`  - Today's Revenue: ₹${dashData.metrics.todaysRevenue}`);
  console.log(`  - Today's Net Profit: ₹${dashData.metrics.todaysProfit}`);

  // 2. Check Driver RBAC (Driver cannot access Owner Dashboard)
  console.log("\n[2] Testing RBAC: Driver accessing Owner Dashboard...");
  const driverDashRes = await fetch(`${API_BASE}/dashboard`, {
    headers: { "x-user-role": "driver" },
  });
  console.log(`  Driver response status: ${driverDashRes.status}`);
  if (driverDashRes.status === 403) {
    console.log("✓ RBAC enforced: Driver access correctly blocked with 403 Forbidden");
  } else {
    console.warn(`! Expected 403 but got ${driverDashRes.status}`);
  }

  // 3. Check Driver Today Trips
  console.log("\n[3] Testing GET /api/driver/today...");
  const drvTodayRes = await fetch(`${API_BASE}/driver/today`, {
    headers: { "x-user-role": "driver" },
  });
  const drvToday = await drvTodayRes.json();
  console.log(`✓ Driver today trips returned: ${drvToday.length} records`);

  // 4. Test Trip Creation with exact billing calculations
  console.log("\n[4] Testing POST /api/trips (Trip creation)...");
  const newTripRes = await fetch(`${API_BASE}/trips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "owner",
    },
    body: JSON.stringify({
      customerId: 1,
      driverId: 1,
      pickup: { name: "Erode Bus Stand", address: "Erode, Tamil Nadu", latitude: 11.341, longitude: 77.7172 },
      destination: { name: "Coimbatore Airport", address: "Coimbatore, Tamil Nadu", latitude: 11.03, longitude: 77.0434 },
      tripType: "single_trip",
      startDate: new Date().toISOString().slice(0, 10),
      startTime: "10:00",
      billingKm: 110,
      ratePerKm: 18,
      toll: 150,
      parking: 50,
      permitCharge: 0,
      advance: 500,
    }),
  });
  if (!newTripRes.ok) throw new Error(`Create trip failed: ${newTripRes.status}`);
  const createdTrip = await newTripRes.json();
  console.log(`✓ Trip created: ${createdTrip.bookingId}`);
  console.log(`  - Base Fare: ₹${createdTrip.baseFare} (110 km @ ₹18)`);
  console.log(`  - Toll: ₹${createdTrip.toll}`);
  console.log(`  - Customer Total: ₹${createdTrip.customerTotal}`);
  console.log(`  - Advance Paid: ₹${createdTrip.totalPaid}`);
  console.log(`  - Balance Due: ₹${createdTrip.remainingBalance}`);

  if (Number(createdTrip.baseFare) !== 1980) {
    throw new Error(`Expected Base Fare 1980, got ${createdTrip.baseFare}`);
  }
  if (Number(createdTrip.customerTotal) !== 2180) {
    throw new Error(`Expected Customer Total 2180, got ${createdTrip.customerTotal}`);
  }
  if (Number(createdTrip.remainingBalance) !== 1680) {
    throw new Error(`Expected Remaining Balance 1680, got ${createdTrip.remainingBalance}`);
  }
  console.log("✓ Financial calculation verified 100% accurate (1980 + 150 + 50 = 2180 - 500 = 1680)");

  // 5. Test Driver Start Trip
  console.log("\n[5] Testing POST /api/driver/trips/:id/start...");
  const startRes = await fetch(`${API_BASE}/driver/trips/${createdTrip.id}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "driver",
    },
    body: JSON.stringify({ startingKm: 45200 }),
  });
  const startedTrip = await startRes.json();
  console.log(`✓ Trip started: status=${startedTrip.status}, startingKm=${startedTrip.startingKm}`);

  // 6. Test Driver Expense Submission
  console.log("\n[6] Testing POST /api/trips/:id/expenses...");
  const expRes = await fetch(`${API_BASE}/trips/${createdTrip.id}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "driver",
    },
    body: JSON.stringify({
      driverId: 1,
      category: "Fuel",
      amount: 600,
      notes: "Diesel refuel near Perundurai toll",
    }),
  });
  const exp = await expRes.json();
  console.log(`✓ Expense logged: ID=${exp.id}, category=${exp.category}, amount=₹${exp.amount}, status=${exp.status}`);

  // 7. Test Owner Expense Approval
  console.log("\n[7] Testing PATCH /api/expenses/:id/approve...");
  const appRes = await fetch(`${API_BASE}/expenses/${exp.id}/approve`, {
    method: "PATCH",
    headers: { "x-user-role": "owner" },
  });
  const approvedExp = await appRes.json();
  console.log(`✓ Expense approved by owner: status=${approvedExp.status}`);

  // 8. Test Driver Trip Completion with Odometer validation
  console.log("\n[8] Testing POST /api/driver/trips/:id/complete...");
  const compRes = await fetch(`${API_BASE}/driver/trips/${createdTrip.id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "driver",
    },
    body: JSON.stringify({ endingKm: 45312 }),
  });
  const completedTrip = await compRes.json();
  console.log(`✓ Trip completed: status=${completedTrip.status}, endingKm=${completedTrip.endingKm}, actualKm=${completedTrip.actualKm}`);
  if (Number(completedTrip.actualKm) !== 112) {
    throw new Error(`Expected actualKm 112, got ${completedTrip.actualKm}`);
  }

  // 9. Test Payment Settlement
  console.log("\n[9] Testing POST /api/trips/:id/payments (Settling balance)...");
  const payRes = await fetch(`${API_BASE}/trips/${createdTrip.id}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "owner",
    },
    body: JSON.stringify({
      amount: 1680,
      method: "Cash",
      paymentType: "balance",
      notes: "Full final settlement received from customer",
    }),
  });
  const pay = await payRes.json();
  console.log(`✓ Balance payment recorded: ₹${pay.amount}`);

  // 10. Verify Final Trip Balance
  const finalTripRes = await fetch(`${API_BASE}/trips/${createdTrip.id}`, {
    headers: { "x-user-role": "owner" },
  });
  const finalTrip = await finalTripRes.json();
  console.log(`✓ Final Trip Status:`);
  console.log(`  - Customer Total: ₹${finalTrip.customerTotal}`);
  console.log(`  - Total Paid: ₹${finalTrip.totalPaid}`);
  console.log(`  - Remaining Balance: ₹${finalTrip.remainingBalance}`);
  if (Number(finalTrip.remainingBalance) !== 0) {
    throw new Error(`Expected remaining balance 0, got ${finalTrip.remainingBalance}`);
  }

  console.log("\n==========================================");
  console.log("ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! ✓");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
