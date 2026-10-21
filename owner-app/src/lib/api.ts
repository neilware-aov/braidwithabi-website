// Talks to the website (braidwithabi.ca/api/owner/…). No login — the app
// carries a private key that matches OWNER_KEY on the website.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { Booking, Settings, Status, Style, TimeOff } from "./types";

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const OWNER_KEY = process.env.EXPO_PUBLIC_OWNER_KEY ?? "";
export const isConfigured = !!SITE_URL && !!OWNER_KEY;

/** Style photos can live on the website ("/images/…") or be full URLs. */
export const imageUrl = (u: string) => (u.startsWith("/") ? SITE_URL + u : u);

export class OverlapError extends Error {}

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SITE_URL}/api/owner/${path}`, {
      method,
      headers: { Authorization: `Bearer ${OWNER_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach your website. Check your internet connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? `Something went wrong (${res.status}).`;
    throw res.status === 409 ? new OverlapError(msg) : new Error(msg);
  }
  if (method !== "GET") emitChange();
  return json as T;
}

// ── Appointments ───────────────────────────────────────────────

export const listBookings = (fromISO: string, toISO: string) =>
  call<Booking[]>(`bookings?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);

export const getBooking = (id: string) => call<Booking>(`bookings/${id}`);

export type NewBooking = {
  style_id: string;
  variant_label: string | null;
  blow_dry: boolean;
  starts_at: string;
  price_total: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_notes: string;
  deposit_paid: boolean;
};
export const createBooking = (b: NewBooking) => call<Booking>("bookings", "POST", b);

export const markDone = (id: string) => call<Booking>(`bookings/${id}`, "POST", { action: "done" });
export const markBooked = (id: string) => call<Booking>(`bookings/${id}`, "POST", { action: "undo" });
export const setDepositPaid = (id: string, paid: boolean) =>
  call<Booking>(`bookings/${id}`, "POST", { action: "deposit", paid });
export const cancelBooking = (id: string, tellClient: boolean) =>
  call<Booking>(`bookings/${id}`, "POST", { action: "cancel", tellClient });
export const saveNotes = (id: string, notes: string) =>
  call<Booking>(`bookings/${id}`, "POST", { action: "notes", notes });
export const deleteBooking = (id: string) => call<{ ok: true }>(`bookings/${id}`, "DELETE");

// ── Styles & prices ────────────────────────────────────────────

export const listStyles = () => call<Style[]>("styles");
export const saveStyle = (s: Partial<Style> & { id?: string }) =>
  s.id ? call<Style>(`styles/${s.id}`, "PUT", s) : call<Style>("styles", "POST", s);
export const deleteStyle = (id: string) => call<{ ok: true }>(`styles/${id}`, "DELETE");

/** Shrinks the photo (phones take huge pictures) and uploads it. */
export async function uploadStylePhoto(styleId: string, uri: string): Promise<Style> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1000 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.75, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error("Couldn't read that photo.");
  return call<Style>(`styles/${styleId}/photo`, "POST", { mime: "image/jpeg", data: out.base64 });
}

// ── Settings & days off ────────────────────────────────────────

export const getSettings = () => call<Settings>("settings");
export const saveSettings = (patch: Partial<Settings>) => call<Settings>("settings", "PUT", patch);

export const listTimeOff = () => call<TimeOff[]>("time-off");
export const addTimeOff = (t: Omit<TimeOff, "id">) => call<TimeOff>("time-off", "POST", t);
export const deleteTimeOff = (id: string) => call<{ ok: true }>(`time-off/${id}`, "DELETE");

// ── Phone alerts ───────────────────────────────────────────────

export const savePushSubscription = (s: { kind: "expo" | "web"; token: string; p256dh?: string; auth?: string }) =>
  call<{ ok: true }>("push", "POST", s);
export const sendTestAlert = () => call<{ ok: true }>("push/test", "POST", {});
export const getStatus = () => call<Status>("status");

// ── "Something changed, reload" ────────────────────────────────

const listeners = new Set<() => void>();
export function onDataChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function emitChange() {
  listeners.forEach((f) => f());
}
