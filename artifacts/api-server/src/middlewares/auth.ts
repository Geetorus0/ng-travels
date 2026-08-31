import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export async function viewerFor(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) return null;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, auth.userId))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId: auth.userId,
      name: "NG Travels user",
      role: "owner",
    })
    .returning();
  return created;
}

export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const viewer = await viewerFor(req);
  if (!viewer || viewer.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
}