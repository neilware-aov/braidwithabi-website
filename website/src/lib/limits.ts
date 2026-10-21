// Simple limits so nobody can flood Abi's calendar or use the site to send
// lots of emails. A real client never comes close to these.
import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { overLimit } from "./db";

/** Hashed, so the database never stores anyone's IP address or email. */
export const limitKey = (kind: string, value: string) =>
  `${kind}:${createHash("sha256").update(value.toLowerCase()).digest("base64url").slice(0, 22)}`;

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** True when this visitor (or this email) is booking far more than any real client would. */
export async function bookingSpam(req: NextRequest, email: string) {
  const [byIp, byEmail, everyone] = await Promise.all([
    overLimit(limitKey("book-ip", clientIp(req)), 6, 60), // 6 tries an hour from one connection
    overLimit(limitKey("book-email", email), 3, 24 * 60), // 3 bookings a day for one email
    overLimit("book-all", 60, 24 * 60), // ~10 a week is normal; 60 in a day is an attack
  ]);
  return byIp || byEmail || everyone;
}

export const manageSpam = (token: string) => overLimit(limitKey("manage", token), 10, 60);

export const badKeySpam = (req: NextRequest) => overLimit(limitKey("bad-key", clientIp(req)), 20, 60);
