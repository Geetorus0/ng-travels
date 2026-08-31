import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type TripLocation = {
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
};

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkId: text("clerk_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_clerk_id_idx").on(table.clerkId)],
);

export const customersTable = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    customerCode: text("customer_code").notNull(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    whatsapp: text("whatsapp"),
    alternateNumber: text("alternate_number"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("customers_code_idx").on(table.customerCode),
    index("customers_search_idx").on(table.name, table.mobile, table.whatsapp),
  ],
);

export const tripsTable = pgTable(
  "trips",
  {
    id: serial("id").primaryKey(),
    bookingId: text("booking_id").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id),
    tripType: text("trip_type").notNull(),
    pickup: jsonb("pickup").$type<TripLocation>().notNull(),
    destination: jsonb("destination").$type<TripLocation>().notNull(),
    stops: jsonb("stops").$type<TripLocation[]>().notNull().default([]),
    startDate: date("start_date", { mode: "string" }).notNull(),
    startTime: text("start_time").notNull(),
    returnDate: date("return_date", { mode: "string" }),
    returnTime: text("return_time"),
    passengerCount: integer("passenger_count").notNull().default(1),
    notes: text("notes"),
    specialInstructions: text("special_instructions"),
    status: text("status").notNull().default("Upcoming"),
    mapDistanceKm: numeric("map_distance_km", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),
    routeDurationMinutes: integer("route_duration_minutes"),
    routeSummary: text("route_summary"),
    apiEstimatedToll: numeric("api_estimated_toll", {
      precision: 12,
      scale: 2,
    }),
    billingKm: numeric("billing_km", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    ratePerKm: numeric("rate_per_km", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    baseFare: numeric("base_fare", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    toll: numeric("toll", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    parking: numeric("parking", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    otherCharges: numeric("other_charges", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    customerTotal: numeric("customer_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalPaid: numeric("total_paid", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    remainingBalance: numeric("remaining_balance", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    credit: numeric("credit", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    startingKm: numeric("starting_km", { precision: 12, scale: 2 }),
    endingKm: numeric("ending_km", { precision: 12, scale: 2 }),
    actualKm: numeric("actual_km", { precision: 12, scale: 2 }),
    expenseTotal: numeric("expense_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("trips_booking_id_idx").on(table.bookingId),
    index("trips_customer_id_idx").on(table.customerId),
    index("trips_schedule_idx").on(table.startDate, table.startTime),
    index("trips_status_idx").on(table.status),
  ],
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => tripsTable.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: text("method").notNull(),
    paymentType: text("payment_type").notNull(),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("payments_trip_id_idx").on(table.tripId)],
);

export const tripExpensesTable = pgTable(
  "trip_expenses",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => tripsTable.id),
    category: text("category").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    receiptPath: text("receipt_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("trip_expenses_trip_id_idx").on(table.tripId)],
);

export const tripStatusHistoryTable = pgTable(
  "trip_status_history",
  {
    id: serial("id").primaryKey(),
    tripId: integer("trip_id")
      .notNull()
      .references(() => tripsTable.id),
    status: text("status").notNull(),
    note: text("note"),
    changedBy: text("changed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("trip_status_history_trip_id_idx").on(table.tripId)],
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    audience: text("audience").notNull().default("owner"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    kind: text("kind").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    tripId: integer("trip_id").references(() => tripsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_audience_idx").on(table.audience, table.isRead)],
);

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    actorName: text("actor_name"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_logs_created_at_idx").on(table.createdAt)],
);

export const appSettingsTable = pgTable(
  "app_settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("app_settings_key_idx").on(table.key)],
);

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  customerCode: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
export type Trip = typeof tripsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type TripExpense = typeof tripExpensesTable.$inferSelect;