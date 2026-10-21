import { DateTime } from "luxon";

export const money = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h} hr${h > 1 ? "s" : ""}`;
}

/** "about 5–6 hrs" style rounding is friendlier than exact minutes for long styles. */
export function approxDuration(minutes: number) {
  if (minutes < 120) return duration(minutes);
  const h = minutes / 60;
  return Number.isInteger(h) ? `~${h} hrs` : `~${Math.floor(h)}–${Math.ceil(h)} hrs`;
}

export function fmtDateTime(iso: string, tz: string) {
  return DateTime.fromISO(iso, { zone: tz }).toFormat("cccc, LLLL d 'at' h:mm a");
}

export function fmtTime(iso: string, tz: string) {
  return DateTime.fromISO(iso, { zone: tz }).toFormat("h:mm a");
}

/** "14:30" → "2:30 PM" */
export function hhmmTo12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
