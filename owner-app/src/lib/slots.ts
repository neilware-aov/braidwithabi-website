import type { Booking } from "./types";

/** Build a local Date from a day + "HH:MM". */
export function at(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

/** Start times on `day` (every 30 min, 07:00–20:00) that would overlap another booked appointment. */
export function busyStarts(bookings: Booking[], day: Date, minutes: number, excludeId?: string) {
  const out = new Set<string>();
  const live = bookings.filter((b) => b.id !== excludeId && b.status === "booked");
  for (let n = 7 * 60; n <= 20 * 60; n += 30) {
    const t = `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
    const s = at(day, t).getTime();
    const e = s + minutes * 60000;
    if (live.some((b) => Date.parse(b.starts_at) < e && Date.parse(b.ends_at) > s)) out.add(t);
  }
  return out;
}
