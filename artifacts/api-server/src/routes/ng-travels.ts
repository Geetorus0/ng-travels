import { Router, type Request, type Response } from "express";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appSettingsTable,
  auditLogsTable,
  customersTable,
  driversTable,
  enquiriesTable,
  notificationsTable,
  paymentsTable,
  refundsTable,
  tripExpensesTable,
  tripStatusHistoryTable,
  tripsTable,
  vehiclesTable,
  driverLocationsTable,
  usersTable,
  sessionsTable,
  type TripLocation,
  type RouteAlternative,
  type Vehicle,
  type Customer,
  type Trip,
} from "@workspace/db";
import { requireAuth, requireOwner, requireDriver, viewerFor, extractAuthToken } from "../middlewares/auth.js";
import { hashPassword, verifyPassword, generateSessionToken } from "../lib/authCrypto.js";
import {
  calculateFare,
  calculateCommercialFare,
  calculateBillableDays,
  calculateCompanyProfit,
  validateOdometer,
} from "../lib/financialEngine.js";
import { searchPlaces, calculateRouteJourney } from "../lib/routeService.js";
import { addRealtimeClient, broadcastRealtimeEvent } from "../lib/realtime.js";

const router = Router();

// =============================================================
// SERVER-SENT EVENTS (SSE) REALTIME SUBSCRIPTION STREAM
// =============================================================
router.get("/realtime/stream", (req: Request, res: Response): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  addRealtimeClient(res);
});

// =============================================================
// HELPER FUNCTIONS & FORMATTERS
// =============================================================
const numeric = (value: unknown): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const dateOnly = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (!value) return "";
  return String(value).slice(0, 10);
};

const today = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const startOfWeek = (day: string): string => {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return date.toISOString().slice(0, 10);
};

const startOfMonth = (day: string): string => `${day.slice(0, 7)}-01`;

const normalizeTripStatus = (value: unknown): string => {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
  return normalized === "pending" ? "upcoming" : normalized;
};

const defaultSettings = {
  company: "NG Travels Operations",
  mobile: "+91 98450 21867",
  email: "operations@ngtravels.in",
  currency: "INR",
  timezone: "Asia/Kolkata",
  defaultRate: 18,
  terms: "1. Toll, parking and state permit charges are customer payable at actuals.\n2. Billing starts and ends from garage to garage.\n3. AC will be switched off while driving in hill terrain.",
};

async function settingsView() {
  try {
    const rows = await db.select().from(appSettingsTable);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      company: values.company ?? defaultSettings.company,
      mobile: values.mobile ?? defaultSettings.mobile,
      email: values.email ?? defaultSettings.email,
      currency: values.currency ?? defaultSettings.currency,
      timezone: values.timezone ?? defaultSettings.timezone,
      defaultRate: values.defaultRate == null ? defaultSettings.defaultRate : numeric(values.defaultRate),
      terms: values.terms ?? defaultSettings.terms,
    };
  } catch {
    return defaultSettings;
  }
}

async function writeAudit(
  req: Request,
  action: string,
  entity: string,
  entityId: string | number,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const viewer = await viewerFor(req);
  const actorName = viewer?.name ?? "Operations Admin";
  try {
    await db.insert(auditLogsTable).values({
      action,
      entity,
      entityId: String(entityId),
      actorName,
      oldValue: oldValue == null ? null : JSON.stringify(oldValue),
      newValue: newValue == null ? null : JSON.stringify(newValue),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
  broadcastRealtimeEvent("AUDIT_LOG_CREATED", { action, entity, entityId, actorName, timestamp: new Date() });
}

async function notify(
  title: string,
  message: string,
  kind: string,
  tripId?: number,
  audience: "owner" | "driver" = "owner",
  driverId?: number,
) {
  try {
    await db.insert(notificationsTable).values({
      audience,
      driverId: driverId ?? null,
      title,
      message,
      kind,
      tripId: tripId ?? null,
    });
  } catch (err) {
    console.error("[notify] Failed to write notification:", err);
  }
  broadcastRealtimeEvent("NOTIFICATION_CREATED", { title, message, kind, tripId, audience, driverId, timestamp: new Date() });
}

async function customerView(customer: typeof customersTable.$inferSelect) {
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.customerId, customer.id))
    .orderBy(desc(tripsTable.startDate));

  const destinations = [...new Set(trips.map((trip) => {
    const location = trip.destination as TripLocation;
    return location?.name || "Destination";
  }))].slice(0, 4);

  const totalPaid = trips.reduce((sum, trip) => sum + numeric(trip.totalPaid), 0);
  const pending = trips.reduce((sum, trip) => sum + numeric(trip.remainingBalance), 0);

  return {
    id: customer.id,
    customerId: customer.customerCode,
    name: customer.name,
    mobile: customer.mobile,
    whatsapp: customer.whatsapp ?? undefined,
    alternateNumber: customer.alternateNumber ?? undefined,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    notes: customer.notes ?? undefined,
    createdAt: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : String(customer.createdAt),
    totalTrips: trips.length,
    totalPaid: Math.round(totalPaid * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    lastTrip: trips[0]?.startDate ? new Date(`${trips[0].startDate}T00:00:00Z`) : null,
    commonDestinations: destinations,
  };
}

function tripView(
  trip: typeof tripsTable.$inferSelect,
  customer?: typeof customersTable.$inferSelect | { id: number; name: string; mobile: string },
) {
  return {
    id: trip.id,
    bookingId: trip.bookingId,
    customerId: customer?.id ?? trip.customerId,
    customerName: customer?.name ?? "Customer",
    customerMobile: customer?.mobile ?? "",
    driverId: trip.driverId ?? null,
    driverName: trip.driverName ?? null,
    driverMobile: trip.driverMobile ?? null,
    vehicleId: trip.vehicleId ?? null,
    vehicleNumber: trip.vehicleNumber ?? null,
    idempotencyKey: trip.idempotencyKey ?? null,
    tripType: trip.tripType,
    pickup: trip.pickup as TripLocation,
    destination: trip.destination as TripLocation,
    stops: (trip.stops ?? []) as TripLocation[],
    startDate: new Date(`${trip.startDate}T00:00:00Z`),
    startTime: trip.startTime,
    returnDate: trip.returnDate ? new Date(`${trip.returnDate}T00:00:00Z`) : null,
    returnTime: trip.returnTime ?? null,
    passengerCount: trip.passengerCount,
    notes: trip.notes ?? null,
    specialInstructions: trip.specialInstructions ?? null,
    status: normalizeTripStatus(trip.status),
    mapDistanceKm: numeric(trip.mapDistanceKm),
    outboundMapKm: trip.outboundMapKm == null ? null : numeric(trip.outboundMapKm),
    returnMapKm: trip.returnMapKm == null ? null : numeric(trip.returnMapKm),
    totalMapKm: trip.totalMapKm == null ? null : numeric(trip.totalMapKm),
    routeDurationMinutes: trip.routeDurationMinutes ?? null,
    outboundDurationMinutes: trip.outboundDurationMinutes ?? null,
    returnDurationMinutes: trip.returnDurationMinutes ?? null,
    routeSummary: trip.routeSummary ?? null,
    selectedRouteSummary: trip.selectedRouteSummary ?? null,
    routeOptions: trip.routeOptions ?? [],
    apiEstimatedToll: trip.apiEstimatedToll == null ? null : numeric(trip.apiEstimatedToll),
    estimatedToll: trip.estimatedToll == null ? null : numeric(trip.estimatedToll),
    finalToll: numeric(trip.finalToll ?? trip.toll),
    outboundTollEstimate: trip.outboundTollEstimate == null ? null : numeric(trip.outboundTollEstimate),
    returnTollEstimate: trip.returnTollEstimate == null ? null : numeric(trip.returnTollEstimate),
    billingKm: numeric(trip.billingKm),
    ratePerKm: numeric(trip.ratePerKm),
    baseFare: numeric(trip.baseFare),
    toll: numeric(trip.finalToll ?? trip.toll),
    parking: numeric(trip.parking),
    permitCharge: numeric(trip.permitCharge),
    customerTotal: numeric(trip.customerTotal),
    totalPaid: numeric(trip.totalPaid),
    remainingBalance: numeric(trip.remainingBalance),
    credit: numeric(trip.credit),
    startingKm: trip.startingKm == null ? null : numeric(trip.startingKm),
    startKmTime: trip.startKmTime ?? null,
    startKmLocation: trip.startKmLocation ?? null,
    startKmPhoto: trip.startKmPhoto ?? null,
    endingKm: trip.endingKm == null ? null : numeric(trip.endingKm),
    endKmTime: trip.endKmTime ?? null,
    endKmLocation: trip.endKmLocation ?? null,
    endKmPhoto: trip.endKmPhoto ?? null,
    actualKm: trip.actualKm == null ? null : numeric(trip.actualKm),
    expenseTotal: numeric(trip.expenseTotal),
    cancellationReason: trip.cancellationReason ?? null,
    cancelledAt: trip.cancelledAt ?? null,
    isLocked: Boolean(trip.isLocked),
    createdAt: trip.createdAt instanceof Date ? trip.createdAt : new Date(trip.createdAt),
    updatedAt: trip.updatedAt ? (trip.updatedAt instanceof Date ? trip.updatedAt : new Date(trip.updatedAt)) : undefined,
  };
}

function checkDocumentExpiry(expiryDateStr?: string | null) {
  if (!expiryDateStr) return { status: "missing", daysLeft: -999 };
  const expiry = new Date(expiryDateStr);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 30) return { status: "expiring_soon", daysLeft };
  return { status: "valid", daysLeft };
}

function enrichVehicleWithAlerts(v: typeof vehiclesTable.$inferSelect) {
  const insurance = checkDocumentExpiry(v.insuranceExpiry);
  const permit = checkDocumentExpiry(v.permitExpiry);
  const fitness = checkDocumentExpiry(v.fitnessExpiry);
  const pollution = checkDocumentExpiry(v.pollutionExpiry);

  const alerts: string[] = [];
  if (insurance.status === "expired") alerts.push("Insurance Expired");
  else if (insurance.status === "expiring_soon") alerts.push(`Insurance Expiring in ${insurance.daysLeft}d`);

  if (permit.status === "expired") alerts.push("Permit Expired");
  else if (permit.status === "expiring_soon") alerts.push(`Permit Expiring in ${permit.daysLeft}d`);

  if (fitness.status === "expired") alerts.push("Fitness Expired");
  else if (fitness.status === "expiring_soon") alerts.push(`Fitness Expiring in ${fitness.daysLeft}d`);

  if (pollution.status === "expired") alerts.push("PUC Expired");
  else if (pollution.status === "expiring_soon") alerts.push(`PUC Expiring in ${pollution.daysLeft}d`);

  return {
    ...v,
    documentAlerts: alerts,
    hasExpiringDocuments: alerts.length > 0,
    insuranceStatus: insurance.status,
    permitStatus: permit.status,
    fitnessStatus: fitness.status,
    pollutionStatus: pollution.status,
  };
}

// =============================================================
// AUTHENTICATION ROUTES (PRODUCTION READY WITH DATABASE VERIFICATION)
// =============================================================

/**
 * Operations / Owner login with Email and Password
 */
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Email and password are required." },
    });
    return;
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, cleanEmail), eq(usersTable.status, "active")))
      .limit(1);

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
      });
      return;
    }

    const user = users[0];

    // Verify Password
    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
      });
      return;
    }

    // Generate Session Token
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    await db.insert(sessionsTable).values({
      token,
      userId: user.id,
      expiresAt,
    });

    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        driverId: user.driverId,
      },
    });
  } catch (err: any) {
    console.error("[auth] Login error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Authentication service encountered an error." },
    });
  }
});

/**
 * Driver Partner login with Mobile / Driver Code and Password / PIN
 */
router.post("/auth/driver-login", async (req, res): Promise<void> => {
  const { identifier, mobile, driverCode, password, pin } = req.body;
  const credential = String(password || pin || "").trim();
  const rawId = String(identifier || driverCode || mobile || "").trim();

  if (!rawId || !credential) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Mobile/Driver Code and Password/PIN are required." },
    });
    return;
  }

  const cleanMobile = rawId.replace(/\D/g, "");
  const cleanCode = rawId.toUpperCase();


  try {
    // 1. Locate driver record
    const allDrivers = await db.select().from(driversTable);
    const driver = allDrivers.find(
      (d) =>
        (cleanMobile.length >= 7 && d.mobile.replace(/\D/g, "").includes(cleanMobile)) ||
        (cleanCode && d.driverCode.toUpperCase() === cleanCode)
    );

    if (!driver || driver.status === "inactive") {
      res.status(401).json({
        success: false,
        error: { code: "DRIVER_NOT_FOUND", message: "Driver profile not found or inactive. Contact NG Travels operations desk." },
      });
      return;
    }

    // 2. Locate driver user account
    let users = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.driverId, driver.id), eq(usersTable.status, "active")))
      .limit(1);

    if (users.length === 0) {
      // Auto-provision driver user account if driver exists in fleet
      const [newUser] = await db
        .insert(usersTable)
        .values({
          name: driver.name,
          email: driver.email,
          phone: driver.mobile,
          passwordHash: hashPassword(credential),
          role: "driver",
          driverId: driver.id,
          status: "active",
        })
        .returning();
      users = [newUser];
    } else {
      const user = users[0];
      if (user.passwordHash && !verifyPassword(credential, user.passwordHash)) {
        res.status(401).json({
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid driver PIN or password." },
        });
        return;
      }
    }

    const user = users[0];
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      token,
      userId: user.id,
      expiresAt,
    });

    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: driver.name,
        fullName: driver.name,
        mobile: driver.mobile,
        driverCode: driver.driverCode,
        role: "driver",
        driverId: driver.id,
      },
    });
  } catch (err: any) {
    console.error("[auth] Driver login error:", err);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Driver authentication error." },
    });
  }
});

/**
 * Get current authenticated user profile
 */
router.get("/auth/me", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Session expired or invalid. Please sign in." },
    });
    return;
  }

  let driverDetails = null;
  if (viewer.driverId) {
    const [d] = await db.select().from(driversTable).where(eq(driversTable.id, viewer.driverId));
    driverDetails = d || null;
  }

  res.json({
    success: true,
    user: {
      ...viewer,
      driver: driverDetails,
    },
  });
});

/**
 * Sign out and invalidate session token
 */
router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = extractAuthToken(req);
  if (token) {
    try {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    } catch (err) {
      console.error("[auth] Logout error:", err);
    }
  }
  res.json({ success: true, message: "Logged out successfully" });
});

// =============================================================
// DASHBOARD & LIVE FLEET OPERATIONS
// =============================================================
router.get("/dashboard", requireOwner, async (_req, res): Promise<void> => {
  const currentDay = today();
  const weekStart = startOfWeek(currentDay);
  const monthStart = startOfMonth(currentDay);

  try {
    const allTrips = await db.select().from(tripsTable);
    const approvedExpenses = await db.select().from(tripExpensesTable).where(eq(tripExpensesTable.status, "approved"));
    const allDrivers = await db.select().from(driversTable);
    const allVehicles = await db.select().from(vehiclesTable);

    const todayTrips = allTrips.filter((trip) => trip.startDate === currentDay);
    const inRange = (trip: typeof tripsTable.$inferSelect, from: string) =>
      trip.startDate >= from && trip.startDate <= currentDay;
    const revenue = (trips: typeof allTrips) =>
      trips.reduce((sum, trip) => sum + numeric(trip.customerTotal), 0);
    const expenses = (trips: typeof allTrips) => {
      const tripIds = new Set(trips.map((t) => t.id));
      return approvedExpenses.filter((e) => tripIds.has(e.tripId)).reduce((sum, e) => sum + numeric(e.amount), 0);
    };

    const metrics = {
      totalTrips: allTrips.length,
      todaysTrips: todayTrips.length,
      upcomingTrips: todayTrips.filter((trip) => ["upcoming", "confirmed", "ready"].includes(normalizeTripStatus(trip.status))).length,
      started: todayTrips.filter((trip) => normalizeTripStatus(trip.status) === "started").length,
      inProgress: todayTrips.filter((trip) => ["reached_pickup", "customer_picked_up", "in_progress"].includes(normalizeTripStatus(trip.status))).length,
      completedToday: todayTrips.filter((trip) => normalizeTripStatus(trip.status) === "completed").length,
      paymentPending: allTrips.filter((trip) => numeric(trip.remainingBalance) > 0).length,
      todaysRevenue: Math.round(revenue(todayTrips) * 100) / 100,
      todaysCollection: Math.round(todayTrips.reduce((sum, trip) => sum + numeric(trip.totalPaid), 0) * 100) / 100,
      todaysExpenses: Math.round(expenses(todayTrips) * 100) / 100,
      todaysProfit: Math.round((revenue(todayTrips) - expenses(todayTrips)) * 100) / 100,
      weeklyRevenue: Math.round(revenue(allTrips.filter((trip) => inRange(trip, weekStart))) * 100) / 100,
      weeklyExpenses: Math.round(expenses(allTrips.filter((trip) => inRange(trip, weekStart))) * 100) / 100,
      weeklyProfit: 0,
      monthlyRevenue: Math.round(revenue(allTrips.filter((trip) => inRange(trip, monthStart))) * 100) / 100,
      monthlyExpenses: Math.round(expenses(allTrips.filter((trip) => inRange(trip, monthStart))) * 100) / 100,
      monthlyProfit: 0,
      availableDrivers: allDrivers.filter((d) => d.availability === "available" && d.status === "active").length,
      driversOnTrip: allDrivers.filter((d) => d.availability === "on_trip").length,
      availableVehicles: allVehicles.filter((v) => v.status === "active").length,
      vehiclesOnTrip: allTrips.filter((t) => ["started", "in_progress"].includes(normalizeTripStatus(t.status)) && t.vehicleId).length,
    };
    metrics.weeklyProfit = calculateCompanyProfit(metrics.weeklyRevenue, metrics.weeklyExpenses);
    metrics.monthlyProfit = calculateCompanyProfit(metrics.monthlyRevenue, metrics.monthlyExpenses);

    const scheduledRows = await db
      .select({ trip: tripsTable, customer: customersTable })
      .from(tripsTable)
      .leftJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
      .where(eq(tripsTable.startDate, currentDay))
      .orderBy(asc(tripsTable.startTime));

    const activity = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(10);

    res.json({
      date: new Date(`${currentDay}T00:00:00Z`),
      metrics,
      schedule: scheduledRows.map(({ trip, customer }) => ({
        id: trip.id,
        bookingId: trip.bookingId,
        time: trip.startTime,
        pickup: (trip.pickup as TripLocation)?.name || "Pickup",
        destination: (trip.destination as TripLocation)?.name || "Destination",
        customerName: customer?.name || "Customer",
        driverName: trip.driverName ?? "Unassigned",
        status: trip.status,
      })),
      recentActivity: activity.map((entry) => ({
        id: entry.id,
        title: entry.action,
        detail: `${entry.entity} ${entry.entityId}`,
        timestamp: entry.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[dashboard] Database query error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to load dashboard metrics" } });
  }
});

// =============================================================
// DRIVERS FLEET MANAGEMENT
// =============================================================
router.get("/drivers", requireOwner, async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(driversTable).orderBy(asc(driversTable.name));
    res.json(rows);
  } catch (err: any) {
    console.error("[drivers] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to fetch drivers" } });
  }
});

router.post("/drivers", requireOwner, async (req, res): Promise<void> => {
  const body = req.body;
  try {
    const [countResult] = await db.select({ count: count() }).from(driversTable);
    const nextCode = `DRV-${String(Number(countResult.count || 0) + 101).padStart(3, "0")}`;

    const [row] = await db
      .insert(driversTable)
      .values({
        driverCode: body.driverCode || nextCode,
        name: body.name.trim(),
        mobile: body.mobile.trim(),
        email: body.email ? body.email.trim() : null,
        licenseNumber: body.licenseNumber ? body.licenseNumber.trim() : null,
        licenseExpiry: body.licenseExpiry || null,
        emergencyContact: body.emergencyContact || null,
        status: body.status || "active",
        availability: body.availability || "available",
        rating: String(body.rating || "4.8"),
        notes: body.notes || null,
      })
      .returning();

    // Auto-create user login for driver
    const defaultPin = body.pin || "123456";
    await db.insert(usersTable).values({
      name: row.name,
      email: row.email,
      phone: row.mobile,
      passwordHash: hashPassword(defaultPin),
      role: "driver",
      driverId: row.id,
      status: "active",
    });

    await writeAudit(req, "Created driver", "driver", row.id, null, row);
    broadcastRealtimeEvent("DRIVER_STATUS_CHANGED", row);
    res.status(201).json(row);
  } catch (err: any) {
    console.error("[drivers] Create error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to create driver record" } });
  }
});

router.get("/drivers/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db.select().from(driversTable).where(eq(driversTable.id, id));
    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Driver not found" } });
      return;
    }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/drivers/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .update(driversTable)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(driversTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Driver not found" } });
      return;
    }

    await writeAudit(req, "Updated driver", "driver", id, null, row);
    broadcastRealtimeEvent("DRIVER_STATUS_CHANGED", row);
    res.json(row);
  } catch (err: any) {
    console.error("[drivers] Update error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to update driver" } });
  }
});

router.patch("/drivers/:id/availability", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { availability } = req.body;
  try {
    const [row] = await db
      .update(driversTable)
      .set({ availability, updatedAt: new Date() })
      .where(eq(driversTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Driver not found" } });
      return;
    }

    await writeAudit(req, `Changed availability to ${availability}`, "driver", id);
    broadcastRealtimeEvent("DRIVER_STATUS_CHANGED", row);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// COMMERCIAL VEHICLES FLEET
// =============================================================
router.get("/vehicles", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(vehiclesTable).orderBy(asc(vehiclesTable.vehicleNumber));
    res.json(rows.map(enrichVehicleWithAlerts));
  } catch (err: any) {
    console.error("[vehicles] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to fetch fleet vehicles" } });
  }
});

router.get("/vehicles/expiry-alerts", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(vehiclesTable);
    const withAlerts = rows.map(enrichVehicleWithAlerts).filter((v) => v.hasExpiringDocuments);
    res.json(withAlerts);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.get("/vehicles/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Vehicle not found" } });
      return;
    }
    res.json(enrichVehicleWithAlerts(row));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.post("/vehicles", requireOwner, async (req, res): Promise<void> => {
  const body = req.body;
  try {
    const [row] = await db
      .insert(vehiclesTable)
      .values({
        vehicleNumber: body.vehicleNumber.trim().toUpperCase(),
        vehicleType: body.vehicleType || "Sedan",
        brand: body.brand || "Toyota",
        model: body.model || "Innova",
        year: body.year ? Number(body.year) : null,
        capacity: Number(body.capacity || 4),
        fuelType: body.fuelType || "Diesel",
        rcNumber: body.rcNumber || null,
        insurancePolicy: body.insurancePolicy || null,
        insuranceExpiry: body.insuranceExpiry || null,
        permitNumber: body.permitNumber || null,
        permitExpiry: body.permitExpiry || null,
        fitnessCertNumber: body.fitnessCertNumber || null,
        fitnessExpiry: body.fitnessExpiry || null,
        pollutionCertNumber: body.pollutionCertNumber || null,
        pollutionExpiry: body.pollutionExpiry || null,
        assignedDriverId: body.assignedDriverId ? Number(body.assignedDriverId) : null,
        status: body.status || "active",
        maintenanceStatus: body.maintenanceStatus || "good",
        lastServiceDate: body.lastServiceDate || null,
        nextServiceDate: body.nextServiceDate || null,
        currentOdometerKm: String(body.currentOdometerKm || "0"),
        notes: body.notes || null,
      })
      .returning();

    await writeAudit(req, "Created vehicle", "vehicle", row.id, null, row);
    broadcastRealtimeEvent("VEHICLE_CREATED", row);
    res.status(201).json(enrichVehicleWithAlerts(row));
  } catch (err: any) {
    console.error("[vehicles] Create error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to create vehicle" } });
  }
});

router.patch("/vehicles/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [updated] = await db
      .update(vehiclesTable)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(vehiclesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Vehicle not found" } });
      return;
    }

    await writeAudit(req, "Updated vehicle", "vehicle", id, null, updated);
    broadcastRealtimeEvent("VEHICLE_UPDATED", updated);
    res.json(enrichVehicleWithAlerts(updated));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.delete("/vehicles/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    await db.update(vehiclesTable).set({ status: "inactive" }).where(eq(vehiclesTable.id, id));
    await writeAudit(req, "Deactivated vehicle", "vehicle", id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// CUSTOMERS
// =============================================================
router.get("/customers", requireOwner, async (req, res): Promise<void> => {
  try {
    const search = String(req.query.search || "").trim();
    const rows = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.archived, false),
          search
            ? or(
                ilike(customersTable.name, `%${search}%`),
                ilike(customersTable.mobile, `%${search}%`),
                ilike(customersTable.customerCode, `%${search}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(customersTable.createdAt));

    const views = await Promise.all(rows.map(customerView));
    res.json({ items: views, total: views.length });
  } catch (err: any) {
    console.error("[customers] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to fetch customers" } });
  }
});

router.post("/customers", requireOwner, async (req, res): Promise<void> => {
  const body = req.body;
  if (!body.name || !body.mobile) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Name and Mobile are required" } });
    return;
  }

  try {
    const [countResult] = await db.select({ count: count() }).from(customersTable);
    const nextCode = `CUST-${String(Number(countResult.count || 0) + 1).padStart(3, "0")}`;

    const [row] = await db
      .insert(customersTable)
      .values({
        customerCode: nextCode,
        name: body.name.trim(),
        mobile: body.mobile.trim(),
        whatsapp: body.whatsapp ? body.whatsapp.trim() : null,
        alternateNumber: body.alternateNumber ? body.alternateNumber.trim() : null,
        email: body.email ? body.email.trim() : null,
        address: body.address ? body.address.trim() : null,
        notes: body.notes || null,
        archived: false,
      })
      .returning();

    await writeAudit(req, "Created customer", "customer", row.id, null, row);
    res.status(201).json(await customerView(row));
  } catch (err: any) {
    console.error("[customers] Create error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to save customer" } });
  }
});

router.get("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Customer not found" } });
      return;
    }
    res.json(await customerView(row));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .update(customersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customersTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Customer not found" } });
      return;
    }

    await writeAudit(req, "Updated customer", "customer", id, null, row);
    res.json(await customerView(row));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.delete("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    await db.update(customersTable).set({ archived: true, updatedAt: new Date() }).where(eq(customersTable.id, id));
    await writeAudit(req, "Archived customer", "customer", id);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// ENQUIRIES
// =============================================================
router.get("/enquiries", requireOwner, async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(enquiriesTable).orderBy(desc(enquiriesTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.post("/enquiries", requireOwner, async (req, res): Promise<void> => {
  const body = req.body;
  try {
    const [countResult] = await db.select({ count: count() }).from(enquiriesTable);
    const nextCode = `ENQ-${String(Number(countResult.count || 0) + 1).padStart(3, "0")}`;

    const [row] = await db
      .insert(enquiriesTable)
      .values({
        enquiryCode: nextCode,
        customerName: body.customerName.trim(),
        customerMobile: body.customerMobile.trim(),
        customerEmail: body.customerEmail || null,
        pickup: body.pickup.trim(),
        destination: body.destination.trim(),
        tripType: body.tripType || "outstation_round_trip",
        startDate: dateOnly(body.startDate || today()),
        passengerCount: Number(body.passengerCount || 1),
        estimatedBudget: body.estimatedBudget ? String(body.estimatedBudget) : null,
        quotedFare: body.quotedFare ? String(body.quotedFare) : null,
        status: "pending",
        notes: body.notes || null,
      })
      .returning();

    await writeAudit(req, "Created enquiry", "enquiry", row.id, null, row);
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/enquiries/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [row] = await db
      .update(enquiriesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(enquiriesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Enquiry not found" } });
      return;
    }

    await writeAudit(req, "Updated enquiry", "enquiry", id, null, row);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// REAL MAPS & ROUTING INTEGRATION (Phase 52)
// =============================================================
router.get("/maps/places/autocomplete", async (req, res): Promise<void> => {
  try {
    const q = String(req.query.input || req.query.query || "").trim();
    if (!q || q.length < 2) {
      res.json([]);
      return;
    }

    const results = await searchPlaces(q);
    res.json(results);
  } catch (err: any) {
    console.error("[maps/places/autocomplete] Error:", err);
    res.status(500).json({ error: "Failed to fetch place suggestions", details: err.message });
  }
});

router.post("/maps/routes", async (req, res): Promise<void> => {
  try {
    const { pickup, destination, stops = [], tripType = "single_trip", options = {} } = req.body;
    if (!pickup || !destination) {
      res.status(400).json({ error: "Pickup and destination locations are required" });
      return;
    }

    const journey = await calculateRouteJourney(pickup, destination, stops, tripType, options);

    const tollStatus = journey.tollAvailable && journey.estimatedToll != null
      ? "Estimated from Routes API"
      : "Unavailable / At Actuals";

    res.json({
      provider: journey.provider,
      tripType: journey.tripType,
      summary: journey.alternatives[0]?.summary || `Route (${journey.totalRoadDistanceKm} km)`,
      totalDistanceKm: journey.totalRoadDistanceKm,
      totalRoadKm: journey.totalRoadDistanceKm,
      totalMapKm: journey.totalRoadDistanceKm,
      totalDurationMinutes: journey.totalDurationMinutes,
      outboundDistanceKm: journey.outbound.distanceKm,
      outboundMapKm: journey.outbound.distanceKm,
      returnDistanceKm: journey.return?.distanceKm || 0,
      returnMapKm: journey.return?.distanceKm || 0,
      outboundDurationMinutes: journey.outbound.durationMinutes,
      returnDurationMinutes: journey.return?.durationMinutes || 0,
      estimatedToll: journey.estimatedToll || 0,
      apiEstimatedToll: journey.estimatedToll || 0,
      tollAvailable: journey.tollAvailable,
      tollStatus,
      routes: journey.alternatives,
      outbound: journey.outbound,
      return: journey.return,
      outboundLeg: journey.outbound,
      returnLeg: journey.return,
      coordinates: journey.outbound.coordinates,
      outboundCoordinates: journey.outbound.coordinates,
      returnCoordinates: journey.return?.coordinates || [],
      routeCoordinates: journey.outbound.coordinates,
    });
  } catch (err: any) {
    console.error("[maps/routes] Route error:", err);
    res.status(500).json({
      error: "Unable to calculate the driving route. Please verify the pickup and destination locations.",
      details: err.message,
    });
  }
});

// =============================================================
// TRIPS & BOOKINGS OPERATIONS
// =============================================================
router.get("/trips", async (req, res): Promise<void> => {
  try {
    const viewer = await viewerFor(req);
    const search = String(req.query.search || "").trim().toLowerCase();
    const statusFilter = req.query.status ? String(req.query.status) : undefined;
    const driverIdFilter = req.query.driverId ? Number(req.query.driverId) : undefined;
    const customerIdFilter = req.query.customerId ? Number(req.query.customerId) : undefined;

    // Strict role authorization: drivers can ONLY see trips assigned to them
    const effectiveDriverId = viewer?.role === "driver" && viewer.driverId ? viewer.driverId : driverIdFilter;

    const trips = await db
      .select()
      .from(tripsTable)
      .where(
        and(
          effectiveDriverId ? eq(tripsTable.driverId, effectiveDriverId) : undefined,
          customerIdFilter ? eq(tripsTable.customerId, customerIdFilter) : undefined,
          statusFilter ? eq(tripsTable.status, statusFilter) : undefined
        )
      )
      .orderBy(desc(tripsTable.startDate), desc(tripsTable.startTime));

    const customers = await db.select().from(customersTable);
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const tripViews = trips.map((t) =>
      tripView(t, customerMap.get(t.customerId) || { id: t.customerId, name: "Customer", mobile: "" })
    );

    const filtered = search
      ? tripViews.filter(
          (t) =>
            t.bookingId.toLowerCase().includes(search) ||
            t.customerName.toLowerCase().includes(search) ||
            (t.driverName && t.driverName.toLowerCase().includes(search)) ||
            (t.pickup?.name && t.pickup.name.toLowerCase().includes(search)) ||
            (t.destination?.name && t.destination.name.toLowerCase().includes(search))
        )
      : tripViews;

    res.json({ items: filtered, total: filtered.length });
  } catch (err: any) {
    console.error("[trips] List error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to fetch trips" } });
  }
});

router.post("/trips", requireOwner, async (req, res): Promise<void> => {
  const startDateStr = dateOnly(req.body.startDate || today());
  const returnDateStr = req.body.returnDate ? dateOnly(req.body.returnDate) : null;
  const policy = req.body.billingDayPolicy || "CALENDAR_DAYS";
  const tripType = req.body.tripType || "single_trip";

  // 1. Authoritative Route Verification
  let journey: any = null;
  try {
    if (req.body.pickup && req.body.destination) {
      journey = await calculateRouteJourney(
        req.body.pickup,
        req.body.destination,
        req.body.stops || [],
        tripType,
      );
    }
  } catch (routeErr: any) {
    console.warn("[trips/create] Online route verification warning:", routeErr.message);
  }

  const verifiedOutboundKm = journey ? journey.outbound.distanceKm : Number(req.body.outboundMapKm || req.body.mapDistanceKm || 0);
  const verifiedReturnKm = journey ? (journey.return?.distanceKm || 0) : Number(req.body.returnMapKm || 0);
  const verifiedTotalKm = journey ? journey.totalRoadDistanceKm : Number(req.body.totalMapKm || req.body.mapDistanceKm || 0);
  const verifiedOutboundMinutes = journey ? journey.outbound.durationMinutes : Number(req.body.outboundDurationMinutes || 120);
  const verifiedReturnMinutes = journey ? (journey.return?.durationMinutes || 0) : Number(req.body.returnDurationMinutes || 0);
  const verifiedTotalMinutes = verifiedOutboundMinutes + verifiedReturnMinutes;

  // 2. Authoritative Commercial Fare Calculation
  const commercialFare = calculateCommercialFare({
    tripType,
    outboundDistanceKm: verifiedOutboundKm,
    returnDistanceKm: verifiedReturnKm,
    totalRoadDistanceKm: verifiedTotalKm,
    ratePerKm: Number(req.body.ratePerKm || 18),
    startDate: startDateStr,
    returnDate: returnDateStr,
    startTime: req.body.startTime || "09:00",
    returnTime: req.body.returnTime || "20:00",
    billingDayPolicy: policy,
    minimumKmPerDay: req.body.minimumKmPerDay != null ? Number(req.body.minimumKmPerDay) : undefined,
    driverBataPerDay: req.body.driverBataPerDay != null ? Number(req.body.driverBataPerDay) : undefined,
    nightBata: req.body.nightBata != null ? Number(req.body.nightBata) : undefined,
    permitCharge: Number(req.body.permitCharge || 0),
    toll: req.body.finalToll != null ? Number(req.body.finalToll) : (journey?.estimatedToll || Number(req.body.toll || 0)),
    tollAvailable: journey?.tollAvailable ?? false,
    parking: Number(req.body.parking || 0),
    waiting: Number(req.body.waiting || req.body.waitingCharge || 0),
    nightCharges: Number(req.body.nightCharges || req.body.nightCharge || 0),
    discount: Number(req.body.discount || 0),
    taxPercent: Number(req.body.taxPercent || 0),
    totalPaid: Number(req.body.advance || req.body.totalPaid || 0),
  });

  const bookingId = `TRP-${Date.now().toString().slice(-7)}`;

  let driverName: string | null = req.body.driverName || null;
  let driverMobile: string | null = req.body.driverMobile || null;
  if (req.body.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, Number(req.body.driverId)));
    if (drv) {
      driverName = drv.name;
      driverMobile = drv.mobile;
    }
  }

  let vehicleNumber: string | null = req.body.vehicleNumber || null;
  if (req.body.vehicleId) {
    const [veh] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, Number(req.body.vehicleId)));
    if (veh) {
      vehicleNumber = veh.vehicleNumber;
    }
  }

  // 3. Assemble Auditable Route Snapshot
  const routeSnapshot = {
    provider: journey?.provider || "geoapify",
    calculatedAt: new Date().toISOString(),
    tripType: commercialFare.tripType,
    billingDayPolicy: commercialFare.billingDayPolicy,
    billableDays: commercialFare.billableDays,
    minimumKmPerDay: commercialFare.minimumKmPerDay,
    minimumBillableKm: commercialFare.minimumBillableKm,
    totalRoadDistanceKm: commercialFare.totalRoadDistanceKm,
    totalBillableKm: commercialFare.totalBillableDistance,
    totalDurationMinutes: verifiedTotalMinutes,
    ratePerKm: commercialFare.ratePerKm,
    distanceFare: commercialFare.distanceFare,
    driverBata: commercialFare.driverBata,
    permitCharge: commercialFare.permitCharge,
    toll: commercialFare.toll,
    tollAvailable: commercialFare.tollAvailable,
    parking: commercialFare.parking,
    waiting: commercialFare.waiting,
    nightCharges: commercialFare.nightCharges,
    discount: commercialFare.discount,
    tax: commercialFare.tax,
    customerTotal: commercialFare.customerTotal,
    outbound: {
      distanceKm: verifiedOutboundKm,
      durationMinutes: verifiedOutboundMinutes,
      polyline: journey?.outbound.encodedPolyline || null,
      coordinates: journey?.outbound.coordinates || [],
      origin: req.body.pickup,
      destination: req.body.destination,
    },
    return: (commercialFare.tripType.includes("round") && journey?.return) ? {
      distanceKm: verifiedReturnKm,
      durationMinutes: verifiedReturnMinutes,
      polyline: journey.return.encodedPolyline || null,
      coordinates: journey.return.coordinates || [],
      origin: req.body.destination,
      destination: req.body.pickup,
    } : null,
  };

  const tripData = {
    bookingId,
    customerId: Number(req.body.customerId),
    driverId: req.body.driverId ? Number(req.body.driverId) : null,
    driverName,
    driverMobile,
    vehicleId: req.body.vehicleId ? Number(req.body.vehicleId) : null,
    vehicleNumber,
    idempotencyKey: req.body.idempotencyKey || null,
    tripType,
    pickup: req.body.pickup,
    destination: req.body.destination,
    stops: req.body.stops ?? [],
    startDate: startDateStr,
    startTime: req.body.startTime || "09:00",
    returnDate: returnDateStr,
    returnTime: req.body.returnTime ?? null,
    passengerCount: Number(req.body.passengerCount ?? 1),
    notes: req.body.notes ?? null,
    specialInstructions: req.body.specialInstructions ?? null,
    mapDistanceKm: String(commercialFare.totalRoadDistanceKm),
    outboundMapKm: String(commercialFare.outboundDistanceKm),
    returnMapKm: String(commercialFare.returnDistanceKm),
    totalMapKm: String(commercialFare.totalRoadDistanceKm),
    routeDurationMinutes: verifiedTotalMinutes,
    outboundDurationMinutes: verifiedOutboundMinutes,
    returnDurationMinutes: verifiedReturnMinutes,
    routeSummary: journey?.alternatives[0]?.summary || req.body.routeSummary || `${commercialFare.totalRoadDistanceKm} km`,
    selectedRouteSummary: journey?.alternatives[0]?.summary || req.body.selectedRouteSummary || null,
    routeOptions: journey?.alternatives || req.body.routeOptions || [],
    routeSnapshot,
    apiEstimatedToll: commercialFare.toll > 0 ? String(commercialFare.toll) : null,
    estimatedToll: commercialFare.toll > 0 ? String(commercialFare.toll) : null,
    finalToll: String(commercialFare.toll),
    outboundTollEstimate: null,
    returnTollEstimate: null,
    billingKm: String(commercialFare.totalBillableDistance),
    ratePerKm: String(commercialFare.ratePerKm),
    baseFare: String(commercialFare.distanceFare),
    driverBata: String(commercialFare.driverBata),
    toll: String(commercialFare.toll),
    parking: String(commercialFare.parking),
    permitCharge: String(commercialFare.permitCharge),
    waitingCharge: String(commercialFare.waiting),
    nightCharge: String(commercialFare.nightCharges),
    discount: String(commercialFare.discount),
    tax: String(commercialFare.tax),
    billableDays: commercialFare.billableDays,
    minimumKm: String(commercialFare.minimumBillableKm),
    billingDayPolicy: commercialFare.billingDayPolicy,
    customerTotal: String(commercialFare.customerTotal),
    totalPaid: String(commercialFare.totalPaid),
    remainingBalance: String(commercialFare.remainingBalance),
    credit: String(commercialFare.credit),
    status: req.body.driverId ? "assigned" : "upcoming",
    isLocked: false,
  };

  try {
    const [created] = await db.insert(tripsTable).values(tripData as any).returning();

    // If advance payment recorded
    if (commercialFare.totalPaid > 0) {
      await db.insert(paymentsTable).values({
        tripId: created.id,
        amount: String(commercialFare.totalPaid),
        method: req.body.paymentMethod || "UPI",
        paymentType: "advance",
        paymentDate: startDateStr,
        reference: req.body.paymentReference || "ADV-INITIAL",
        notes: "Advance payment received at booking creation",
        recordedBy: "Operations Admin",
      });
    }

    // Status History
    await db.insert(tripStatusHistoryTable).values({
      tripId: created.id,
      status: created.status,
      note: "Trip created and scheduled",
      changedBy: "Operations Admin",
    });

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, created.customerId));
    await writeAudit(req, "Trip created", "trip", created.id, null, created);
    await notify(`New trip ${created.bookingId}`, `Booked from ${req.body.pickup?.name || "Pickup"} to ${req.body.destination?.name || "Destination"}`, "trip_created", created.id);

    if (created.driverId) {
      await notify(`Assigned to ${created.bookingId}`, `New trip to ${req.body.destination?.name || "Destination"} scheduled for ${startDateStr}`, "trip_assigned", created.id, "driver", created.driverId);
    }

    const view = tripView(created, customer);
    broadcastRealtimeEvent("TRIP_CREATED", view);
    res.status(201).json(view);
  } catch (err: any) {
    console.error("[trips] Create error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to persist trip to database" } });
  }
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, trip.customerId));
    res.json(tripView(trip, customer));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/trips/:id", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    const [updated] = await db
      .update(tripsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(tripsTable.id, id))
      .returning();

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, updated.customerId));
    const view = tripView(updated, customer);
    await writeAudit(req, "Updated trip details", "trip", id, trip, updated);
    broadcastRealtimeEvent("TRIP_UPDATED", view);
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Assign Driver and Commercial Vehicle (Concurrency Safe)
 */
router.post("/trips/:id/assign", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { driverId, vehicleId } = req.body;

  try {
    let driverName: string | null = null;
    let driverMobile: string | null = null;

    if (driverId) {
      const [d] = await db.select().from(driversTable).where(eq(driversTable.id, Number(driverId)));
      if (d) {
        driverName = d.name;
        driverMobile = d.mobile;
      }
    }

    let vehicleNumber: string | null = null;
    if (vehicleId) {
      const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, Number(vehicleId)));
      if (v) vehicleNumber = v.vehicleNumber;
    }

    const [trip] = await db
      .update(tripsTable)
      .set({
        driverId: driverId ? Number(driverId) : null,
        driverName,
        driverMobile,
        vehicleId: vehicleId ? Number(vehicleId) : null,
        vehicleNumber,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(tripsTable.id, id))
      .returning();

    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    if (driverId) {
      await db.insert(notificationsTable).values({
        audience: "driver",
        driverId: Number(driverId),
        title: "New Duty Assignment",
        message: `Trip ${trip.bookingId} assigned to you (${(trip.pickup as TripLocation)?.name} ➔ ${(trip.destination as TripLocation)?.name})`,
        kind: "trip_assigned",
        tripId: trip.id,
      });
    }

    await writeAudit(req, `Assigned driver ${driverName} & vehicle ${vehicleNumber}`, "trip", id);
    broadcastRealtimeEvent("TRIP_ASSIGNED", { tripId: id, bookingId: trip.bookingId, driverId, vehicleId });
    res.json(trip);
  } catch (err: any) {
    console.error("[trips] Assignment error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to assign driver/vehicle" } });
  }
});

/**
 * Cancel Trip & Release Resources Atomically
 */
router.post("/trips/:id/cancel", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { reason } = req.body;

  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    const [updated] = await db
      .update(tripsTable)
      .set({
        status: "cancelled",
        cancellationReason: reason || "Cancelled by Operations Office",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tripsTable.id, id))
      .returning();

    // Release driver availability if assigned
    if (trip.driverId) {
      await db
        .update(driversTable)
        .set({ availability: "available", updatedAt: new Date() })
        .where(eq(driversTable.id, trip.driverId));
    }

    // Release vehicle
    if (trip.vehicleId) {
      await db
        .update(vehiclesTable)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(vehiclesTable.id, trip.vehicleId));
    }

    await writeAudit(req, `Cancelled trip: ${reason || "No reason given"}`, "trip", id);
    broadcastRealtimeEvent("TRIP_CANCELLED", { tripId: id, bookingId: updated.bookingId, reason });
    res.json(updated);
  } catch (err: any) {
    console.error("[trips] Cancel error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to cancel trip" } });
  }
});

// =============================================================
// DRIVER PARTNER APP ENDPOINTS (STRICT DRIVER SCOPED)
// =============================================================

/**
 * Get current driver partner profile
 */
router.get("/driver/me", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Driver authentication required" } });
    return;
  }

  try {
    let driver = null;
    if (viewer.driverId) {
      const [d] = await db.select().from(driversTable).where(eq(driversTable.id, viewer.driverId));
      driver = d;
    } else {
      const [firstDriver] = await db.select().from(driversTable).limit(1);
      driver = firstDriver;
    }

    if (!driver) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Driver profile not found" } });
      return;
    }

    res.json(driver);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver's Schedule for Today
 */
router.get("/driver/today", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);
  const currentDay = today();

  try {
    const driverId = viewer?.driverId;
    const trips = await db
      .select()
      .from(tripsTable)
      .where(
        and(
          driverId ? eq(tripsTable.driverId, driverId) : undefined,
          eq(tripsTable.startDate, currentDay)
        )
      )
      .orderBy(asc(tripsTable.startTime));

    const customers = await db.select().from(customersTable);
    const cMap = new Map(customers.map((c) => [c.id, c]));

    res.json(trips.map((t) => tripView(t, cMap.get(t.customerId))));
  } catch (err: any) {
    console.error("[driver/today] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to fetch today's duty" } });
  }
});

/**
 * Driver's Active Trip currently in progress
 */
router.get("/driver/current-trip", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);

  try {
    const driverId = viewer?.driverId;
    const trips = await db
      .select()
      .from(tripsTable)
      .where(
        and(
          driverId ? eq(tripsTable.driverId, driverId) : undefined,
          inArray(tripsTable.status, [
            "assigned",
            "accepted",
            "driver_arrived",
            "started",
            "reached_pickup",
            "customer_picked_up",
            "in_progress",
            "reached_destination",
          ])
        )
      )
      .orderBy(desc(tripsTable.updatedAt))
      .limit(1);

    if (trips.length === 0) {
      res.status(404).json({ success: false, message: "No active trip in progress" });
      return;
    }

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, trips[0].customerId));
    res.json(tripView(trips[0], customer));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver's Assigned Commercial Vehicle
 */
router.get("/driver/vehicle", async (req, res): Promise<void> => {
  const viewer = await viewerFor(req);

  try {
    let vehicle = null;
    if (viewer?.driverId) {
      const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.assignedDriverId, viewer.driverId));
      vehicle = v;
    }

    if (!vehicle) {
      const [firstV] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.status, "active")).limit(1);
      vehicle = firstV;
    }

    if (!vehicle) {
      res.status(404).json({ success: false, message: "No vehicle assigned" });
      return;
    }

    res.json(enrichVehicleWithAlerts(vehicle));
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver accepts assigned trip
 */
router.post("/driver/trips/:id/accept", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [trip] = await db
      .update(tripsTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(tripsTable.id, id))
      .returning();

    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    await db.insert(tripStatusHistoryTable).values({
      tripId: id,
      status: "accepted",
      note: "Driver pilot accepted trip assignment",
      changedBy: trip.driverName || "Driver",
    });

    broadcastRealtimeEvent("TRIP_ACCEPTED", { tripId: id, bookingId: trip.bookingId });
    res.json({ success: true, trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver arrived at customer pickup location
 */
router.post("/driver/trips/:id/arrived", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [trip] = await db
      .update(tripsTable)
      .set({ status: "driver_arrived", updatedAt: new Date() })
      .where(eq(tripsTable.id, id))
      .returning();

    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    await db.insert(tripStatusHistoryTable).values({
      tripId: id,
      status: "driver_arrived",
      note: "Driver pilot arrived at pickup location",
      changedBy: trip.driverName || "Driver",
    });

    broadcastRealtimeEvent("DRIVER_ARRIVED", { tripId: id, bookingId: trip.bookingId });
    res.json({ success: true, trip });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver Starts Trip with Verified Starting Odometer KM (Database Transaction)
 */
router.post("/driver/trips/:id/start", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { startingKm, location, photoUrl } = req.body;

  const startKmNum = Number(startingKm || 0);
  if (startKmNum < 0) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Starting KM cannot be negative" } });
    return;
  }

  try {
    const [trip] = await db
      .update(tripsTable)
      .set({
        status: "started",
        startingKm: String(startKmNum),
        startKmTime: new Date(),
        startKmLocation: location || null,
        startKmPhoto: photoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tripsTable.id, id))
      .returning();

    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    // Update Driver Availability
    if (trip.driverId) {
      await db
        .update(driversTable)
        .set({ availability: "on_trip", updatedAt: new Date() })
        .where(eq(driversTable.id, trip.driverId));
    }

    // Update Vehicle Odometer
    if (trip.vehicleId) {
      await db
        .update(vehiclesTable)
        .set({ currentOdometerKm: String(startKmNum), updatedAt: new Date() })
        .where(eq(vehiclesTable.id, trip.vehicleId));
    }

    // Record Status History
    await db.insert(tripStatusHistoryTable).values({
      tripId: id,
      status: "started",
      odometerKm: String(startKmNum),
      location: location || null,
      note: `Trip started with starting meter: ${startKmNum} KM`,
      changedBy: trip.driverName || "Driver",
    });

    await writeAudit(req, `Started trip at ${startKmNum} KM`, "trip", id);
    broadcastRealtimeEvent("TRIP_STARTED", { tripId: id, bookingId: trip.bookingId, startingKm: startKmNum });
    res.json(trip);
  } catch (err: any) {
    console.error("[driver/start] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to start trip" } });
  }
});

/**
 * Driver Progression Milestone
 */
router.post("/driver/trips/:id/milestone", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status, note, location, odometerKm } = req.body;

  try {
    const [trip] = await db
      .update(tripsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(tripsTable.id, id))
      .returning();

    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    await db.insert(tripStatusHistoryTable).values({
      tripId: id,
      status,
      odometerKm: odometerKm ? String(odometerKm) : null,
      location: location || null,
      note: note || `Status updated to ${status}`,
      changedBy: trip.driverName || "Driver",
    });

    broadcastRealtimeEvent("TRIP_STATUS_CHANGED", { tripId: id, bookingId: trip.bookingId, status, note });
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

/**
 * Driver Completes Trip with Final Meter KM and Actuals
 */
router.post("/driver/trips/:id/complete", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { endingKm, location, photoUrl, finalToll, parking } = req.body;

  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    const startKm = numeric(trip.startingKm);
    const endKm = Number(endingKm || 0);

    const odoCheck = validateOdometer(startKm, endKm);
    if (!odoCheck.valid) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: odoCheck.error } });
      return;
    }

    const actualKm = odoCheck.actualKm;
    const tollAmount = finalToll != null ? numeric(finalToll) : numeric(trip.finalToll);
    const parkingAmount = parking != null ? numeric(parking) : numeric(trip.parking);
    const permitAmount = numeric(trip.permitCharge);

    // Bill whichever is higher: actual meter km or agreed billing km
    const chargedKm = Math.max(actualKm, numeric(trip.billingKm));
    const ratePerKm = numeric(trip.ratePerKm);
    const recalculatedBase = Math.round(chargedKm * ratePerKm * 100) / 100;
    const customerTotal = Math.round((recalculatedBase + tollAmount + parkingAmount + permitAmount) * 100) / 100;
    const totalPaid = numeric(trip.totalPaid);
    const remainingBalance = Math.max(0, Math.round((customerTotal - totalPaid) * 100) / 100);
    const credit = Math.max(0, Math.round((totalPaid - customerTotal) * 100) / 100);

    const [completed] = await db
      .update(tripsTable)
      .set({
        status: "completed",
        endingKm: String(endKm),
        actualKm: String(actualKm),
        billingKm: String(chargedKm),
        baseFare: String(recalculatedBase),
        finalToll: String(tollAmount),
        toll: String(tollAmount),
        parking: String(parkingAmount),
        customerTotal: String(customerTotal),
        remainingBalance: String(remainingBalance),
        credit: String(credit),
        endKmTime: new Date(),
        endKmLocation: location || null,
        endKmPhoto: photoUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(tripsTable.id, id))
      .returning();

    // Release Driver Availability
    if (trip.driverId) {
      await db
        .update(driversTable)
        .set({ availability: "available", updatedAt: new Date() })
        .where(eq(driversTable.id, trip.driverId));
    }

    // Release Fleet Vehicle
    if (trip.vehicleId) {
      await db
        .update(vehiclesTable)
        .set({
          status: "active",
          currentOdometerKm: String(endKm),
          updatedAt: new Date(),
        })
        .where(eq(vehiclesTable.id, trip.vehicleId));
    }

    // Status History
    await db.insert(tripStatusHistoryTable).values({
      tripId: id,
      status: "completed",
      odometerKm: String(endKm),
      location: location || null,
      note: `Trip completed with final meter: ${endKm} KM (Clocked ${actualKm} KM)`,
      changedBy: trip.driverName || "Driver",
    });

    await writeAudit(req, `Completed trip ${trip.bookingId} (${actualKm} KM clocked)`, "trip", id);
    broadcastRealtimeEvent("TRIP_COMPLETED", { tripId: id, bookingId: completed.bookingId, actualKm, customerTotal });
    res.json(completed);
  } catch (err: any) {
    console.error("[driver/complete] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to complete trip" } });
  }
});

/**
 * Ingest Real-Time Telemetry & GPS Coordinates
 */
router.post("/driver/trips/:id/location", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { latitude, longitude, speed, heading, accuracy, batteryLevel } = req.body;

  if (latitude == null || longitude == null) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Coordinates required" } });
    return;
  }

  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    const driverId = trip.driverId || 1;

    await db.insert(driverLocationsTable).values({
      driverId,
      tripId: id,
      latitude: String(latitude),
      longitude: String(longitude),
      speed: speed != null ? String(speed) : null,
      heading: heading != null ? String(heading) : null,
      accuracy: accuracy != null ? String(accuracy) : null,
      batteryLevel: batteryLevel != null ? String(batteryLevel) : null,
      timestamp: new Date(),
    });

    broadcastRealtimeEvent("LOCATION_UPDATED", {
      tripId: id,
      driverId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: Number(speed || 0),
      heading: Number(heading || 0),
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: "Telemetry recorded" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// PAYMENTS & EXPENSES LEDGER
// =============================================================
router.get("/payments", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.get("/trips/:id/payments", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.tripId, id)).orderBy(desc(paymentsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

async function recordPaymentHandler(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id || req.body.tripId);
  const { amount, method, paymentType, paymentDate, reference, notes } = req.body;

  if (!id || isNaN(id)) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Valid Trip ID is required" } });
    return;
  }

  const paymentAmount = Number(amount || 0);
  if (paymentAmount <= 0) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Amount must be greater than zero" } });
    return;
  }

  try {
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Trip not found" } });
      return;
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        tripId: id,
        amount: String(paymentAmount),
        method: method || "UPI",
        paymentType: paymentType || "partial",
        paymentDate: dateOnly(paymentDate || today()),
        reference: reference || null,
        notes: notes || null,
        recordedBy: "Operations Admin",
      })
      .returning();

    // Recalculate trip totals atomically
    const customerTotal = numeric(trip.customerTotal);
    const newTotalPaid = Math.round((numeric(trip.totalPaid) + paymentAmount) * 100) / 100;
    const newRemainingBalance = Math.max(0, Math.round((customerTotal - newTotalPaid) * 100) / 100);
    const newCredit = Math.max(0, Math.round((newTotalPaid - customerTotal) * 100) / 100);

    const [updatedTrip] = await db
      .update(tripsTable)
      .set({
        totalPaid: String(newTotalPaid),
        remainingBalance: String(newRemainingBalance),
        credit: String(newCredit),
        updatedAt: new Date(),
      })
      .where(eq(tripsTable.id, id))
      .returning();

    await writeAudit(req, `Recorded payment ₹${paymentAmount}`, "payment", payment.id);
    broadcastRealtimeEvent("PAYMENT_ADDED", { tripId: id, amount: paymentAmount, trip: updatedTrip });
    res.status(201).json({ success: true, payment, trip: updatedTrip, ...payment });
  } catch (err: any) {
    console.error("[payments] Error:", err);
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: "Failed to record payment" } });
  }
}

router.post("/trips/:id/payments", requireOwner, recordPaymentHandler);
router.post("/payments", requireOwner, recordPaymentHandler);

router.get("/expenses", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(tripExpensesTable).orderBy(desc(tripExpensesTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.post("/expenses", async (req, res): Promise<void> => {
  const { tripId, category, amount, expenseDate, notes, receiptPath, location } = req.body;
  const numAmount = Number(amount || 0);

  if (numAmount <= 0) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Expense amount must be positive" } });
    return;
  }

  try {
    const viewer = await viewerFor(req);
    const [expense] = await db
      .insert(tripExpensesTable)
      .values({
        tripId: Number(tripId),
        driverId: viewer?.driverId || null,
        category: category || "Fuel",
        amount: String(numAmount),
        expenseDate: dateOnly(expenseDate || today()),
        notes: notes || null,
        receiptPath: receiptPath || null,
        status: "pending",
        location: location || null,
        recordedBy: viewer?.name || "Driver",
      })
      .returning();

    broadcastRealtimeEvent("EXPENSE_SUBMITTED", expense);
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/expenses/:id/approve", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const [expense] = await db
      .update(tripExpensesTable)
      .set({
        status: "approved",
        approvedBy: "Operations Admin",
        approvedAt: new Date(),
      })
      .where(eq(tripExpensesTable.id, id))
      .returning();

    if (!expense) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Expense not found" } });
      return;
    }

    // Update trip total expenses
    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, expense.tripId));
    if (trip) {
      const newTotal = Math.round((numeric(trip.expenseTotal) + numeric(expense.amount)) * 100) / 100;
      await db.update(tripsTable).set({ expenseTotal: String(newTotal), updatedAt: new Date() }).where(eq(tripsTable.id, trip.id));
    }

    await writeAudit(req, `Approved expense ₹${expense.amount}`, "expense", id);
    broadcastRealtimeEvent("EXPENSE_APPROVED", expense);
    res.json(expense);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.patch("/expenses/:id/reject", requireOwner, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { reason } = req.body;
  try {
    const [expense] = await db
      .update(tripExpensesTable)
      .set({
        status: "rejected",
        rejectionReason: reason || "Rejected by operations manager",
      })
      .where(eq(tripExpensesTable.id, id))
      .returning();

    if (!expense) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Expense not found" } });
      return;
    }

    await writeAudit(req, `Rejected expense: ${reason || ""}`, "expense", id);
    res.json(expense);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

// =============================================================
// REPORTS, NOTIFICATIONS, AUDIT & SETTINGS
// =============================================================
router.get("/reports/summary", requireOwner, async (req, res): Promise<void> => {
  try {
    const allTrips = await db.select().from(tripsTable);
    const allExpenses = await db.select().from(tripExpensesTable).where(eq(tripExpensesTable.status, "approved"));

    const totalRevenue = allTrips.reduce((sum, t) => sum + numeric(t.customerTotal), 0);
    const totalCollected = allTrips.reduce((sum, t) => sum + numeric(t.totalPaid), 0);
    const totalOutstanding = allTrips.reduce((sum, t) => sum + numeric(t.remainingBalance), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + numeric(e.amount), 0);
    const totalProfit = totalRevenue - totalExpenses;

    const completed = allTrips.filter((t) => t.status === "completed").length;
    const ongoing = allTrips.filter((t) => ["started", "in_progress"].includes(t.status)).length;
    const upcoming = allTrips.filter((t) => ["upcoming", "assigned", "accepted"].includes(t.status)).length;
    const cancelled = allTrips.filter((t) => t.status === "cancelled").length;

    res.json({
      grossRevenue: Math.round(totalRevenue * 100) / 100,
      totalCollections: Math.round(totalCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(totalProfit * 100) / 100,
      financials: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
      },
      counts: {
        totalTrips: allTrips.length,
        completed,
        ongoing,
        upcoming,
        cancelled,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.get("/notifications", async (req, res): Promise<void> => {
  try {
    const viewer = await viewerFor(req);
    const audience = viewer?.role === "driver" ? "driver" : "owner";

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.audience, audience),
          viewer?.driverId ? eq(notificationsTable.driverId, viewer.driverId) : undefined
        )
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(30);

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  try {
    const viewer = await viewerFor(req);
    const audience = viewer?.role === "driver" ? "driver" : "owner";
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.audience, audience));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.get("/audit-logs", requireOwner, async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(100);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

router.get("/settings", requireOwner, async (_req, res): Promise<void> => {
  res.json(await settingsView());
});

router.patch("/settings", requireOwner, async (req, res): Promise<void> => {
  try {
    for (const [key, val] of Object.entries(req.body)) {
      if (val !== undefined && val !== null) {
        await db
          .insert(appSettingsTable)
          .values({ key, value: String(val), updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appSettingsTable.key,
            set: { value: String(val), updatedAt: new Date() },
          });
      }
    }
    await writeAudit(req, "Updated company settings", "settings", "global", null, req.body);
    res.json(await settingsView());
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: "DATABASE_ERROR", message: err.message } });
  }
});

export default router;