import crypto from "node:crypto";

/**
 * Hash a plain text password using scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verify a plain text password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, expectedKey] = parts;
    if (!salt || !expectedKey) return false;

    const actualKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expectedKey, "hex"),
      Buffer.from(actualKey, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return "ngt_" + crypto.randomBytes(32).toString("hex");
}
