import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  appSettingsTable,
  auditLogsTable,
  customersTable,
  notificationsTable,
  paymentsTable,
  tripExpensesTable,
  tripStatusHistoryTable,
  tripsTable,
  type TripLocation,
} from "@workspace/db";
import {
  ArchiveCustomerParams,
  CreateCustomerBody,
  CreateCustomerResponse,
  CreateTripBody,
  CreateTripExpenseBody,
  CreateTripExpenseParams,
  CreateTripExpenseResponse,
  CreateTripPaymentBody,
  CreateTripPaymentParams,
  CreateTripPaymentResponse,
  CreateTripResponse,
  GetCustomerParams,
  GetCustomerResponse,
  GetDashboardResponse,
  GetReportSummaryQueryParams,
  GetReportSummaryResponse,
  GetTripParams,
  GetTripResponse,
  ListAuditLogsResponse,
  ListCustomersQueryParams,
  ListCustomersResponse,
  ListNotificationsResponse,
  ListTripExpensesParams,
  ListTripExpensesResponse,
  ListTripPaymentsParams,
  ListTripPaymentsResponse,
  ListTripsQueryParams,
  ListTripsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  UpdateCustomerBody,
  UpdateCustomerParams,
  UpdateCustomerResponse,
  UpdateTripBody,
  UpdateTripOperationsBody,
  UpdateTripOperationsParams,
  UpdateTripOperationsResponse,
  UpdateTripParams,
  UpdateTripResponse,
  UpdateTripStatusBody,
  UpdateTripStatusParams,
  UpdateTripStatusResponse,
} from "@workspace/api-zod";
import { requireOwner, viewerFor } from "../middlewares/auth";

const router: IRouter = Router();

const numeric = (value: unknown): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const dateOnly = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
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

function calculateFare(input: {
  billingKm: number;
  ratePerKm: number;
  toll?: number;
  parking?: number;
  otherCharges?: number;
  totalPaid?: number;
}) {
  const baseFare = Math.round(input.billingKm * input.ratePerKm * 100) / 100;
  const toll = Math.max(0, input.toll ?? 0);
  const parking = Math.max(0, input.parking ?? 0);
  const otherCharges = Math.max(0, input.otherCharges ?? 0);
  const customerTotal =
    Math.round((baseFare + toll + parking + otherCharges) * 100) / 100;
  const totalPaid = Math.max(0, Math.round((input.totalPaid ?? 0) * 100) / 100);
  const remainingBalance = Math.max(
    0,
    Math.round((customerTotal - totalPaid) * 100) / 100,
  );
  const credit = Math.max(
    0,
    Math.round((totalPaid - customerTotal) * 100) / 100,
  );
  return {
    baseFare,
    toll,
    parking,
    otherCharges,
    customerTotal,
    totalPaid,
    remainingBalance,
    credit,
  };
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
  await db.insert(auditLogsTable).values({
    action,
    entity,
    entityId: String(entityId),
    actorName: viewer?.name ?? "Authenticated user",
    oldValue: oldValue == null ? null : JSON.stringify(oldValue),
    newValue: newValue == null ? null : JSON.stringify(newValue),
  });
}

async function notify(
  title: string,
  message: string,
  kind: string,
  tripId?: number,
) {
  await db.insert(notificationsTable).values({
    audience: "owner",
    title,
    message,
    kind,
    tripId: tripId ?? null,
  });
}

async function customerView(customer: typeof customersTable.$inferSelect) {
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.customerId, customer.id))
    .orderBy(desc(tripsTable.startDate));
  const destinations = [...new Set(trips.map((trip) => {
    const location = trip.destination as TripLocation;
    return location.name;
  }))].slice(0, 4);
  const totalPaid = trips.reduce((sum, trip) => sum + numeric(trip.totalPaid), 0);
  const pending = trips.reduce(
    (sum, trip) => sum + numeric(trip.remainingBalance),
    0,
  );
  return {
    id: customer.id,
    customerId: customer.customerCode,
    name: customer.name,
    mobile: customer.mobile,
    whatsapp: customer.whatsapp,
    alternateNumber: customer.alternateNumber,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    createdAt: customer.createdAt,
    totalTrips: trips.length,
    totalPaid: Math.round(totalPaid * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    lastTrip: trips[0]?.startDate ? new Date(`${trips[0].startDate}T00:00:00Z`) : null,
    commonDestinations: destinations,
  };
}

function tripView(
  trip: typeof tripsTable.$inferSelect,
  customer: typeof customersTable.$inferSelect,
) {
  return {
    id: trip.id,
    bookingId: trip.bookingId,
    customerId: customer.id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    tripType: trip.tripType,
    pickup: trip.pickup,
    destination: trip.destination,
    stops: trip.stops ?? [],
    startDate: new Date(`${trip.startDate}T00:00:00Z`),
    startTime: trip.startTime,
    returnDate: trip.returnDate
      ? new Date(`${trip.returnDate}T00:00:00Z`)
      : null,
    returnTime: trip.returnTime,
    passengerCount: trip.passengerCount,
    notes: trip.notes,
    specialInstructions: trip.specialInstructions,
    status: trip.status,
    mapDistanceKm: numeric(trip.mapDistanceKm),
    routeDurationMinutes: trip.routeDurationMinutes,
    routeSummary: trip.routeSummary,
    apiEstimatedToll:
      trip.apiEstimatedToll == null ? null : numeric(trip.apiEstimatedToll),
    billingKm: numeric(trip.billingKm),
    ratePerKm: numeric(trip.ratePerKm),
    baseFare: numeric(trip.baseFare),
    toll: numeric(trip.toll),
    parking: numeric(trip.parking),
    otherCharges: numeric(trip.otherCharges),
    customerTotal: numeric(trip.customerTotal),
    totalPaid: numeric(trip.totalPaid),
    remainingBalance: numeric(trip.remainingBalance),
    credit: numeric(trip.credit),
    startingKm: trip.startingKm == null ? null : numeric(trip.startingKm),
    endingKm: trip.endingKm == null ? null : numeric(trip.endingKm),
    actualKm: trip.actualKm == null ? null : numeric(trip.actualKm),
    expenseTotal: numeric(trip.expenseTotal),
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
}

async function getTripJoined(id: number) {
  const rows = await db
    .select({ trip: tripsTable, customer: customersTable })
    .from(tripsTable)
    .innerJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
    .where(eq(tripsTable.id, id))
    .limit(1);
  return rows[0];
}

router.get("/dashboard", requireOwner, async (req, res): Promise<void> => {
  const currentDay = today();
  const weekStart = startOfWeek(currentDay);
  const monthStart = startOfMonth(currentDay);
  const allTrips = await db.select().from(tripsTable);
  const todayTrips = allTrips.filter((trip) => trip.startDate === currentDay);
  const inRange = (trip: typeof tripsTable.$inferSelect, from: string) =>
    trip.startDate >= from && trip.startDate <= currentDay;
  const revenue = (trips: typeof allTrips) =>
    trips.reduce((sum, trip) => sum + numeric(trip.customerTotal), 0);
  const expenses = (trips: typeof allTrips) =>
    trips.reduce((sum, trip) => sum + numeric(trip.expenseTotal), 0);
  const metrics = {
    todaysTrips: todayTrips.length,
    upcomingTrips: todayTrips.filter((trip) =>
       ["upcoming", "confirmed", "ready"].includes(trip.status),
    ).length,
    started: todayTrips.filter((trip) => trip.status === "started").length,
    inProgress: todayTrips.filter((trip) =>
      ["reached_pickup", "customer_picked_up", "in_progress"].includes(trip.status),
    ).length,
    completedToday: todayTrips.filter((trip) => trip.status === "completed").length,
    paymentPending: allTrips.filter((trip) => numeric(trip.remainingBalance) > 0).length,
    todaysCollection: Math.round(
      todayTrips.reduce((sum, trip) => sum + numeric(trip.totalPaid), 0) * 100,
    ) / 100,
    todaysExpenses: Math.round(expenses(todayTrips) * 100) / 100,
    todaysProfit: Math.round((revenue(todayTrips) - expenses(todayTrips)) * 100) / 100,
    weeklyRevenue: Math.round(revenue(allTrips.filter((trip) => inRange(trip, weekStart))) * 100) / 100,
    weeklyExpenses: Math.round(expenses(allTrips.filter((trip) => inRange(trip, weekStart))) * 100) / 100,
    weeklyProfit: 0,
    monthlyRevenue: Math.round(revenue(allTrips.filter((trip) => inRange(trip, monthStart))) * 100) / 100,
    monthlyExpenses: Math.round(expenses(allTrips.filter((trip) => inRange(trip, monthStart))) * 100) / 100,
    monthlyProfit: 0,
  };
  metrics.weeklyProfit = Math.round((metrics.weeklyRevenue - metrics.weeklyExpenses) * 100) / 100;
  metrics.monthlyProfit = Math.round((metrics.monthlyRevenue - metrics.monthlyExpenses) * 100) / 100;

  const scheduledRows = await db
    .select({ trip: tripsTable, customer: customersTable })
    .from(tripsTable)
    .innerJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
    .where(eq(tripsTable.startDate, currentDay))
    .orderBy(asc(tripsTable.startTime));
  const activity = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(6);
  const response = {
    date: new Date(`${currentDay}T00:00:00Z`),
    metrics,
    schedule: scheduledRows.map(({ trip, customer }) => ({
      id: trip.id,
      bookingId: trip.bookingId,
      time: trip.startTime,
      pickup: (trip.pickup as TripLocation).name,
      destination: (trip.destination as TripLocation).name,
      customerName: customer.name,
      status: trip.status,
    })),
    recentActivity: activity.map((entry) => ({
      id: entry.id,
      title: entry.action,
      detail: `${entry.entity} ${entry.entityId}`,
      timestamp: entry.createdAt,
    })),
  };
  res.json(GetDashboardResponse.parse(response));
});

router.get("/customers", requireOwner, async (req, res): Promise<void> => {
  const parsed = ListCustomersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, page, limit } = parsed.data;
  const searchFilter = search
    ? or(
        ilike(customersTable.name, `%${search}%`),
        ilike(customersTable.mobile, `%${search}%`),
        ilike(customersTable.whatsapp, `%${search}%`),
      )
    : undefined;
  const filters = [eq(customersTable.archived, false), searchFilter].filter(
    Boolean,
  );
  const rows = await db
    .select()
    .from(customersTable)
    .where(and(...filters))
    .orderBy(desc(customersTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ count }] = await db
    .select({ count: customersTable.id })
    .from(customersTable)
    .where(and(...filters));
  const items = await Promise.all(rows.map(customerView));
  res.json(
    ListCustomersResponse.parse({
      items,
      total: Number(count ?? 0),
      page,
      limit,
    }),
  );
});

router.post("/customers", requireOwner, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db
    .insert(customersTable)
    .values({
      ...parsed.data,
      customerCode: `CUS-${Date.now().toString().slice(-7)}`,
    })
    .returning();
  await writeAudit(req, "Customer created", "customer", customer.id);
  res.status(201).json(CreateCustomerResponse.parse(await customerView(customer)));
});

router.get("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .limit(1);
  if (!customer || customer.archived) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(GetCustomerResponse.parse(await customerView(customer)));
});

router.patch("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  const body = UpdateCustomerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const [previous] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .limit(1);
  if (!previous || previous.archived) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  const [customer] = await db
    .update(customersTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(customersTable.id, params.data.id))
    .returning();
  await writeAudit(req, "Customer updated", "customer", customer.id, previous, customer);
  res.json(UpdateCustomerResponse.parse(await customerView(customer)));
});

router.delete("/customers/:id", requireOwner, async (req, res): Promise<void> => {
  const params = ArchiveCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db
    .update(customersTable)
    .set({ archived: true, updatedAt: new Date() })
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  await writeAudit(req, "Customer archived", "customer", customer.id);
  res.sendStatus(204);
});

router.get("/trips", async (req, res): Promise<void> => {
  const parsed = ListTripsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, status, date, page, limit } = parsed.data;
  const searchFilter = search
    ? or(
        ilike(tripsTable.bookingId, `%${search}%`),
        ilike(customersTable.name, `%${search}%`),
        ilike(customersTable.mobile, `%${search}%`),
      )
    : undefined;
  const filters = [
    status ? eq(tripsTable.status, status) : undefined,
    date ? eq(tripsTable.startDate, dateOnly(date)) : undefined,
    searchFilter,
  ].filter(Boolean);
  const rows = await db
    .select({ trip: tripsTable, customer: customersTable })
    .from(tripsTable)
    .innerJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(tripsTable.startDate), asc(tripsTable.startTime))
    .limit(limit)
    .offset((page - 1) * limit);
  const countRows = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .innerJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
    .where(filters.length ? and(...filters) : undefined);
  res.json(
    ListTripsResponse.parse({
      items: rows.map(({ trip, customer }) => tripView(trip, customer)),
      total: countRows.length,
      page,
      limit,
    }),
  );
});

router.post("/trips", requireOwner, async (req, res): Promise<void> => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const start = dateOnly(data.startDate);
  const returnDate = data.returnDate == null ? null : dateOnly(data.returnDate);
  if (returnDate && `${returnDate}T${data.returnTime ?? "00:00"}` < `${start}T${data.startTime}`) {
    res.status(400).json({ error: "Return date and time cannot be before start" });
    return;
  }
  const customer = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, data.customerId))
    .limit(1);
  if (!customer[0] || customer[0].archived) {
    res.status(400).json({ error: "Customer not found" });
    return;
  }
  const fare = calculateFare({
    billingKm: data.billingKm,
    ratePerKm: data.ratePerKm,
    toll: data.toll,
    parking: data.parking,
    otherCharges: data.otherCharges,
    totalPaid: data.advance,
  });
  const created = await db.transaction(async (tx) => {
    const [trip] = await tx
      .insert(tripsTable)
      .values({
        bookingId: `NG-${new Date().getUTCFullYear()}-TEMP-${Date.now()}`,
        customerId: data.customerId,
        tripType: data.tripType,
        pickup: data.pickup,
        destination: data.destination,
        stops: data.stops ?? [],
        startDate: start,
        startTime: data.startTime,
        returnDate,
        returnTime: data.returnTime ?? null,
        passengerCount: data.passengerCount,
        notes: data.notes ?? null,
        specialInstructions: data.specialInstructions ?? null,
        status: "upcoming",
        mapDistanceKm: String(data.mapDistanceKm ?? 0),
        routeDurationMinutes: data.routeDurationMinutes ?? null,
        routeSummary: data.routeSummary ?? null,
        apiEstimatedToll:
          data.apiEstimatedToll == null ? null : String(data.apiEstimatedToll),
        billingKm: String(data.billingKm),
        ratePerKm: String(data.ratePerKm),
        ...Object.fromEntries(
          Object.entries(fare).map(([key, value]) => [key, String(value)]),
        ),
      })
      .returning();
    const bookingId = `NG-${new Date().getUTCFullYear()}-${String(trip.id).padStart(6, "0")}`;
    const [updatedTrip] = await tx
      .update(tripsTable)
      .set({ bookingId })
      .where(eq(tripsTable.id, trip.id))
      .returning();
    if (data.advance && data.advance > 0) {
      await tx.insert(paymentsTable).values({
        tripId: trip.id,
        amount: String(data.advance),
        method: "Cash",
        paymentType: "Advance",
        paymentDate: start,
      });
    }
    await tx.insert(tripStatusHistoryTable).values({
      tripId: trip.id,
      status: "upcoming",
      changedBy: "owner",
    });
    return updatedTrip;
  });
  await notify("New trip created", `${created.bookingId} is scheduled for ${start}`, "trip_created", created.id);
  await writeAudit(req, "Trip created", "trip", created.id);
  const joined = await getTripJoined(created.id);
  res.status(201).json(CreateTripResponse.parse(tripView(joined!.trip, joined!.customer)));
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const params = GetTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(GetTripResponse.parse(tripView(joined.trip, joined.customer)));
});

router.patch("/trips/:id", requireOwner, async (req, res): Promise<void> => {
  const params = UpdateTripParams.safeParse(req.params);
  const body = UpdateTripBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const data = body.data;
  const values = {
    tripType: data.tripType ?? joined.trip.tripType,
    pickup: data.pickup ?? joined.trip.pickup,
    destination: data.destination ?? joined.trip.destination,
    stops: data.stops ?? joined.trip.stops,
    startDate: data.startDate == null ? joined.trip.startDate : dateOnly(data.startDate),
    startTime: data.startTime ?? joined.trip.startTime,
    returnDate: data.returnDate == null
      ? joined.trip.returnDate
      : dateOnly(data.returnDate),
    returnTime: data.returnTime ?? joined.trip.returnTime,
    passengerCount: data.passengerCount ?? joined.trip.passengerCount,
    notes: data.notes ?? joined.trip.notes,
    specialInstructions: data.specialInstructions ?? joined.trip.specialInstructions,
    mapDistanceKm: data.mapDistanceKm == null ? joined.trip.mapDistanceKm : String(data.mapDistanceKm),
    routeDurationMinutes: data.routeDurationMinutes ?? joined.trip.routeDurationMinutes,
    routeSummary: data.routeSummary ?? joined.trip.routeSummary,
    apiEstimatedToll: data.apiEstimatedToll == null ? joined.trip.apiEstimatedToll : String(data.apiEstimatedToll),
    billingKm: data.billingKm == null ? numeric(joined.trip.billingKm) : data.billingKm,
    ratePerKm: data.ratePerKm == null ? numeric(joined.trip.ratePerKm) : data.ratePerKm,
    toll: data.toll == null ? numeric(joined.trip.toll) : data.toll,
    parking: data.parking == null ? numeric(joined.trip.parking) : data.parking,
    otherCharges: data.otherCharges == null ? numeric(joined.trip.otherCharges) : data.otherCharges,
  };
  const fare = calculateFare({
    billingKm: Number(values.billingKm),
    ratePerKm: Number(values.ratePerKm),
    toll: Number(values.toll),
    parking: Number(values.parking),
    otherCharges: Number(values.otherCharges),
    totalPaid: numeric(joined.trip.totalPaid),
  });
  const [updated] = await db
    .update(tripsTable)
    .set({
      ...values,
      billingKm: String(values.billingKm),
      ratePerKm: String(values.ratePerKm),
      toll: String(fare.toll),
      parking: String(fare.parking),
      otherCharges: String(fare.otherCharges),
      baseFare: String(fare.baseFare),
      customerTotal: String(fare.customerTotal),
      totalPaid: String(fare.totalPaid),
      remainingBalance: String(fare.remainingBalance),
      credit: String(fare.credit),
      updatedAt: new Date(),
    })
    .where(eq(tripsTable.id, params.data.id))
    .returning();
  await writeAudit(req, "Trip updated", "trip", updated.id, joined.trip, updated);
  const fresh = await getTripJoined(updated.id);
  res.json(UpdateTripResponse.parse(tripView(fresh!.trip, fresh!.customer)));
});

router.post("/trips/:id/status", async (req, res): Promise<void> => {
  const params = UpdateTripStatusParams.safeParse(req.params);
  const body = UpdateTripStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [updated] = await db
    .update(tripsTable)
    .set({
      status: body.data.status.toLowerCase().replaceAll(" ", "_"),
      updatedAt: new Date(),
    })
    .where(eq(tripsTable.id, params.data.id))
    .returning();
  const viewer = await viewerFor(req);
  await db.insert(tripStatusHistoryTable).values({
    tripId: updated.id,
    status: updated.status,
    note: body.data.note ?? null,
    changedBy: viewer?.name ?? "driver",
  });
  await notify(
    `Trip ${updated.status.replaceAll("_", " ")}`,
    `${updated.bookingId} moved to ${updated.status}`,
    "trip_status",
    updated.id,
  );
  await writeAudit(req, "Trip status changed", "trip", updated.id, joined.trip.status, updated.status);
  const fresh = await getTripJoined(updated.id);
  res.json(UpdateTripStatusResponse.parse(tripView(fresh!.trip, fresh!.customer)));
});

router.patch("/trips/:id/operations", async (req, res): Promise<void> => {
  const params = UpdateTripOperationsParams.safeParse(req.params);
  const body = UpdateTripOperationsBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const startingKm = body.data.startingKm ?? numeric(joined.trip.startingKm);
  const endingKm = body.data.endingKm ?? numeric(joined.trip.endingKm);
  if (body.data.endingKm != null && joined.trip.startingKm == null && body.data.startingKm == null) {
    res.status(400).json({ error: "Starting KM is required before ending KM" });
    return;
  }
  if (body.data.endingKm != null && endingKm < startingKm) {
    res.status(400).json({ error: "Ending KM must be greater than or equal to starting KM" });
    return;
  }
  const [updated] = await db
    .update(tripsTable)
    .set({
      startingKm: body.data.startingKm == null ? joined.trip.startingKm : String(body.data.startingKm),
      endingKm: body.data.endingKm == null ? joined.trip.endingKm : String(body.data.endingKm),
      actualKm:
        joined.trip.startingKm != null || body.data.startingKm != null
          ? String(Math.max(0, endingKm - startingKm))
          : null,
      updatedAt: new Date(),
    })
    .where(eq(tripsTable.id, params.data.id))
    .returning();
  await writeAudit(req, "Trip operations updated", "trip", updated.id);
  const fresh = await getTripJoined(updated.id);
  res.json(UpdateTripOperationsResponse.parse(tripView(fresh!.trip, fresh!.customer)));
});

router.get("/trips/:id/payments", async (req, res): Promise<void> => {
  const params = ListTripPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.tripId, params.data.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(
    ListTripPaymentsResponse.parse(
      rows.map((row) => ({
        ...row,
        amount: numeric(row.amount),
        paymentDate: new Date(`${row.paymentDate}T00:00:00Z`),
      })),
    ),
  );
});

router.post("/trips/:id/payments", requireOwner, async (req, res): Promise<void> => {
  const params = CreateTripPaymentParams.safeParse(req.params);
  const body = CreateTripPaymentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const signedAmount = body.data.paymentType === "Refund" ? -body.data.amount : body.data.amount;
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      tripId: params.data.id,
      amount: String(body.data.amount),
      method: body.data.method,
      paymentType: body.data.paymentType,
      paymentDate: dateOnly(body.data.paymentDate),
      reference: body.data.reference ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();
  const totalPaid = Math.max(0, numeric(joined.trip.totalPaid) + signedAmount);
  const fare = calculateFare({
    billingKm: numeric(joined.trip.billingKm),
    ratePerKm: numeric(joined.trip.ratePerKm),
    toll: numeric(joined.trip.toll),
    parking: numeric(joined.trip.parking),
    otherCharges: numeric(joined.trip.otherCharges),
    totalPaid,
  });
  await db
    .update(tripsTable)
    .set({
      ...Object.fromEntries(Object.entries(fare).map(([key, value]) => [key, String(value)])),
      updatedAt: new Date(),
    })
    .where(eq(tripsTable.id, params.data.id));
  await notify("Payment recorded", `${joined.trip.bookingId} received ₹${body.data.amount}`, "payment", joined.trip.id);
  await writeAudit(req, "Payment created", "payment", payment.id);
  res.status(201).json(
    CreateTripPaymentResponse.parse({
      ...payment,
      amount: numeric(payment.amount),
      paymentDate: new Date(`${payment.paymentDate}T00:00:00Z`),
    }),
  );
});

router.get("/trips/:id/expenses", async (req, res): Promise<void> => {
  const params = ListTripExpensesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(tripExpensesTable)
    .where(eq(tripExpensesTable.tripId, params.data.id))
    .orderBy(desc(tripExpensesTable.expenseDate));
  res.json(
    ListTripExpensesResponse.parse(
      rows.map((row) => ({
        ...row,
        amount: numeric(row.amount),
        expenseDate: new Date(`${row.expenseDate}T00:00:00Z`),
      })),
    ),
  );
});

router.post("/trips/:id/expenses", async (req, res): Promise<void> => {
  const params = CreateTripExpenseParams.safeParse(req.params);
  const body = CreateTripExpenseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success
        ? params.error.message
        : body.success
          ? "Invalid request body"
          : body.error.message,
    });
    return;
  }
  const joined = await getTripJoined(params.data.id);
  if (!joined) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [expense] = await db
    .insert(tripExpensesTable)
    .values({
      tripId: params.data.id,
      category: body.data.category,
      amount: String(body.data.amount),
      expenseDate: dateOnly(body.data.expenseDate),
      notes: body.data.notes ?? null,
      receiptPath: body.data.receiptPath ?? null,
    })
    .returning();
  const expenseTotal = numeric(joined.trip.expenseTotal) + body.data.amount;
  await db
    .update(tripsTable)
    .set({ expenseTotal: String(Math.round(expenseTotal * 100) / 100), updatedAt: new Date() })
    .where(eq(tripsTable.id, params.data.id));
  await notify("Expense added", `${body.data.category} recorded for ${joined.trip.bookingId}`, "expense", joined.trip.id);
  await writeAudit(req, "Expense added", "expense", expense.id);
  res.status(201).json(
    CreateTripExpenseResponse.parse({
      ...expense,
      amount: numeric(expense.amount),
      expenseDate: new Date(`${expense.expenseDate}T00:00:00Z`),
    }),
  );
});

router.get("/reports/summary", requireOwner, async (req, res): Promise<void> => {
  const parsed = GetReportSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const from = parsed.data.from ? dateOnly(parsed.data.from) : startOfMonth(today());
  const to = parsed.data.to ? dateOnly(parsed.data.to) : today();
  const all = await db
    .select({ trip: tripsTable, customer: customersTable })
    .from(tripsTable)
    .innerJoin(customersTable, eq(tripsTable.customerId, customersTable.id));
  const filtered = all.filter(({ trip }) =>
    trip.startDate >= from &&
    trip.startDate <= to &&
    (!parsed.data.status || trip.status === parsed.data.status) &&
    (!parsed.data.tripType || trip.tripType === parsed.data.tripType),
  );
  const rows = filtered.map(({ trip, customer }) => tripView(trip, customer));
  const methodRows = await db.select().from(paymentsTable);
  const payments = methodRows.filter((payment) =>
    filtered.some(({ trip }) => trip.id === payment.tripId),
  );
  const paymentMethods = [...new Set(payments.map((payment) => payment.method))].map((method) => ({
    method,
    amount: payments
      .filter((payment) => payment.method === method)
      .reduce((sum, payment) => sum + numeric(payment.amount), 0),
  }));
  const revenue = rows.reduce((sum, trip) => sum + trip.customerTotal, 0);
  const expenses = rows.reduce((sum, trip) => sum + trip.expenseTotal, 0);
  const response = {
    from: new Date(`${from}T00:00:00Z`),
    to: new Date(`${to}T00:00:00Z`),
    totalTrips: rows.length,
    completed: rows.filter((trip) => trip.status === "completed").length,
    cancelled: rows.filter((trip) => trip.status === "cancelled").length,
    billingKm: rows.reduce((sum, trip) => sum + trip.billingKm, 0),
    grossFare: revenue,
    toll: rows.reduce((sum, trip) => sum + trip.toll, 0),
    parking: rows.reduce((sum, trip) => sum + trip.parking, 0),
    otherCharges: rows.reduce((sum, trip) => sum + trip.otherCharges, 0),
    collection: rows.reduce((sum, trip) => sum + trip.totalPaid, 0),
    expenses,
    profit: revenue - expenses,
    pendingBalance: rows.reduce((sum, trip) => sum + trip.remainingBalance, 0),
    averageFare: rows.length ? revenue / rows.length : 0,
    topCustomer: rows[0]?.customerName ?? null,
    topDestination: rows[0] ? (rows[0].destination as TripLocation).name : null,
    paymentMethods,
    rows,
  };
  res.json(GetReportSummaryResponse.parse(response));
});

router.get("/notifications", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.audience, "owner"))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(ListNotificationsResponse.parse(rows));
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(MarkNotificationReadResponse.parse(row));
});

router.get("/audit-logs", requireOwner, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(100);
  res.json(ListAuditLogsResponse.parse(rows));
});

export default router;