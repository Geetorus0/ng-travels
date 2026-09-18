import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { supabaseServer } from "../lib/supabase.js";

export interface UserViewer {
  id: number;
  name: string;
  fullName?: string;
  email: string | null;
  phone: string | null;
  role: "super_admin" | "owner" | "admin" | "manager" | "dispatcher" | "driver" | "accountant";
  driverId: number | null;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      viewer?: UserViewer | null;
    }
  }
}

/**
 * Extract the Supabase access token from the Authorization header.
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Resolve the authenticated user by verifying the Supabase access token
 * and loading the matching application user row by auth_user_id.
 */
export async function viewerFor(req: Request): Promise<UserViewer | null> {
  if (req.viewer !== undefined) {
    return req.viewer;
  }

  const token = extractAuthToken(req);
  if (!token) {
    console.warn(`[auth] ${req.method} ${req.originalUrl}: 401 — no Authorization bearer token on request`);
    req.viewer = null;
    return null;
  }

  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data?.user) {
      console.warn(`[auth] ${req.method} ${req.originalUrl}: 401 — Supabase rejected the token: ${error?.message || "no user in response"}`);
      req.viewer = null;
      return null;
    }

    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.authUserId, data.user.id))
      .limit(1);

    if (rows.length === 0) {
      console.warn(`[auth] ${req.method} ${req.originalUrl}: 401 — no users row with authUserId=${data.user.id} (Supabase auth user ${data.user.email || data.user.id} has no linked app account)`);
      req.viewer = null;
      return null;
    }
    if (rows[0].status !== "active") {
      console.warn(`[auth] ${req.method} ${req.originalUrl}: 401 — user id=${rows[0].id} (${rows[0].email}) has status="${rows[0].status}", not "active"`);
      req.viewer = null;
      return null;
    }

    const u = rows[0];
    const viewer: UserViewer = {
      id: u.id,
      name: u.name,
      fullName: u.name,
      email: u.email,
      phone: u.phone,
      role: (u.role as any) || "owner",
      driverId: u.driverId,
      status: u.status,
    };
    req.viewer = viewer;
    return viewer;
  } catch (err) {
    console.error("[auth] Error resolving Supabase session:", err);
    req.viewer = null;
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please sign in to access NG Travels operations.",
      },
    });
    return;
  }
  next();
}

export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
    return;
  }

  if (viewer.role === "driver") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Owner/Admin authorization required for this resource.",
      },
    });
    return;
  }
  next();
}

export async function requireDriver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const viewer = await viewerFor(req);
  if (!viewer) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Driver authentication required.",
      },
    });
    return;
  }

  if (viewer.role !== "driver" && viewer.role !== "owner" && viewer.role !== "admin") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Driver duty authorization required.",
      },
    });
    return;
  }
  next();
}
