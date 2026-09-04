import type { Response } from "express";

export type RealtimeEventType =
  | "TRIP_CREATED"
  | "TRIP_UPDATED"
  | "TRIP_ASSIGNED"
  | "TRIP_STATUS_CHANGED"
  | "DRIVER_STATUS_CHANGED"
  | "TRIP_STARTED"
  | "REACHED_PICKUP"
  | "CUSTOMER_PICKED"
  | "JOURNEY_STARTED"
  | "REACHED_DESTINATION"
  | "TRIP_COMPLETED"
  | "PAYMENT_ADDED"
  | "PAYMENT_UPDATED"
  | "EXPENSE_SUBMITTED"
  | "EXPENSE_APPROVED"
  | "EXPENSE_REJECTED"
  | "TRIP_CANCELLED"
  | "NOTIFICATION_CREATED"
  | "AUDIT_LOG_CREATED"
  | "LOCATION_UPDATED"
  | "DRIVER_ARRIVED"
  | "TRIP_ACCEPTED"
  | "VEHICLE_CREATED"
  | "VEHICLE_UPDATED";

export interface RealtimeMessage {
  type: RealtimeEventType;
  payload: any;
  timestamp: string;
}

const clients = new Set<Response>();

/**
 * Register a new Server-Sent Events client connection
 */
export function addRealtimeClient(res: Response): void {
  clients.add(res);

  // Send initial connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`);

  res.on("close", () => {
    clients.delete(res);
  });
}

/**
 * Broadcast an event to all connected clients in real-time
 */
export function broadcastRealtimeEvent(type: RealtimeEventType, payload: any): void {
  const message: RealtimeMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  const payloadStr = JSON.stringify(message);

  clients.forEach((client) => {
    try {
      client.write(`event: message\ndata: ${payloadStr}\n\n`);
    } catch {
      clients.delete(client);
    }
  });
}

/**
 * Keep-alive heartbeat ticker every 20 seconds to prevent connection timeouts
 */
setInterval(() => {
  clients.forEach((client) => {
    try {
      client.write(`: heartbeat\n\n`);
    } catch {
      clients.delete(client);
    }
  });
}, 20000);
