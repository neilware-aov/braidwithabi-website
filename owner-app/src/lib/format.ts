// Small date helpers in the device's local time (Abi's phone is in the
// business timezone). Hand-rolled names so output is identical on Android,
// iPhone Safari and desktop browsers.
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const dayName = (d: Date, short = false) => (short ? DAYS[d.getDay()].slice(0, 3) : DAYS[d.getDay()]);
export const monthName = (m: number, short = false) => (short ? MONTHS[m].slice(0, 3) : MONTHS[m]);

export function time12(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "14:30" → "2:30 PM" */
export function hhmm12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export const dateLong = (d: Date) => `${dayName(d)}, ${monthName(d.getMonth())} ${d.getDate()}`;
export const dateShort = (d: Date) => `${dayName(d, true)} ${monthName(d.getMonth(), true)} ${d.getDate()}`;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function relativeDay(d: Date) {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return dateLong(d);
}

export function money(n: number) {
  const v = Math.round(n * 100) / 100;
  return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function countdown(to: Date) {
  const mins = Math.round((to.getTime() - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h}h ${mins % 60}m`;
  const d = Math.round(h / 24);
  return `in ${d} day${d > 1 ? "s" : ""}`;
}

export const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000);

export const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/** "Oct 20 – 26" or "Oct 27 – Nov 2" */
export function weekLabel(monday: Date) {
  const sun = addDays(monday, 6);
  const a = `${monthName(monday.getMonth(), true)} ${monday.getDate()}`;
  return sun.getMonth() === monday.getMonth() ? `${a} – ${sun.getDate()}` : `${a} – ${monthName(sun.getMonth(), true)} ${sun.getDate()}`;
}

/** "2 min ago", "3 hours ago" */
export function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h > 1 ? "s" : ""} ago`;
  return `${Math.round(h / 24)} days ago`;
}
