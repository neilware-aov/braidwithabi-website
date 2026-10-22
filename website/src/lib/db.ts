// Everything the website and the owner app read or write.
import "server-only";
import { q, tx, type Query } from "./sql";
import type { Booking, PushSubscriptionRow, Settings, Style, TimeOff } from "./types";

/** Thrown when the requested time overlaps another appointment. */
export class SlotTakenError extends Error {
  constructor() {
    super("That time was just taken. Please pick another slot.");
  }
}

// ── Settings ───────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  timezone: "America/Toronto",
  etransfer_email: "nadia-karen@braidwithabi.ca",
  default_deposit: 50,
  deposit_hold_hours: 24,
  blow_dry_price: 25,
  blow_dry_minutes: 45,
  slot_interval_minutes: 30,
  buffer_minutes: 30,
  min_notice_hours: 24,
  max_days_ahead: 60,
  reschedule_cutoff_hours: 48,
  working_hours: {
    mon: { open: "09:00", close: "18:00" },
    tue: { open: "09:00", close: "18:00" },
    wed: { open: "09:00", close: "18:00" },
    thu: { open: "09:00", close: "18:00" },
    fri: { open: "09:00", close: "18:00" },
    sat: { open: "08:00", close: "17:00" },
    sun: null,
  },
  address_details: "",
  accepting_bookings: true,
};

export async function getSettings(): Promise<Settings> {
  const [row] = await q<{ data: Partial<Settings> }>(`select data from settings where id = 1`);
  return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const allowed = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== "timezone");
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  await q(`update settings set data = data || $1::text::jsonb, updated_at = now() where id = 1`, [JSON.stringify(clean)]);
  return getSettings();
}

// ── Styles ─────────────────────────────────────────────────────

const STYLE_FIELDS = [
  "name",
  "description",
  "image_url",
  "duration_minutes",
  "price",
  "deposit",
  "variants",
  "hair_included",
  "is_active",
  "sort_order",
] as const;

export async function getStyles(includeHidden = false): Promise<Style[]> {
  return q<Style>(
    `select * from styles ${includeHidden ? "" : "where is_active"} order by sort_order, name`
  );
}

export async function getStyle(id: string): Promise<Style | null> {
  if (!isUuid(id)) return null;
  const [row] = await q<Style>(`select * from styles where id = $1`, [id]);
  return row ?? null;
}

export async function saveStyle(id: string | null, data: Partial<Style>): Promise<Style> {
  const entries = STYLE_FIELDS.filter((k) => k in data).map((k) => [k, data[k]] as const);
  const value = (k: string, v: unknown) => (k === "variants" ? JSON.stringify(v ?? []) : v);
  const cast = (k: string) => (k === "variants" ? "::text::jsonb" : "");
  if (id) {
    if (!entries.length) return (await getStyle(id))!;
    const sets = entries.map(([k], i) => `${k} = $${i + 2}${cast(k)}`).join(", ");
    const [row] = await q<Style>(`update styles set ${sets} where id = $1 returning *`, [
      id,
      ...entries.map(([k, v]) => value(k, v)),
    ]);
    if (!row) throw new Error("Style not found");
    return row;
  }
  const cols = entries.map(([k]) => k).join(", ");
  const vals = entries.map(([k], i) => `$${i + 1}${cast(k)}`).join(", ");
  const [row] = await q<Style>(`insert into styles (${cols}) values (${vals}) returning *`, entries.map(([k, v]) => value(k, v)));
  return row;
}

export async function deleteStyle(id: string) {
  await q(`delete from styles where id = $1`, [id]);
}

export async function setStylePhoto(id: string, mime: string, base64: string): Promise<Style> {
  await q(
    `insert into style_photos (style_id, mime, data) values ($1, $2, $3)
     on conflict (style_id) do update set mime = excluded.mime, data = excluded.data, updated_at = now()`,
    [id, mime, base64]
  );
  return saveStyle(id, { image_url: `/api/photo/${id}?v=${Date.now().toString(36)}` });
}

export async function getStylePhoto(id: string): Promise<{ mime: string; data: string } | null> {
  if (!isUuid(id)) return null;
  const [row] = await q<{ mime: string; data: string }>(`select mime, data from style_photos where style_id = $1`, [id]);
  return row ?? null;
}

// ── Bookings ───────────────────────────────────────────────────

export interface Interval {
  start: number; // epoch ms
  end: number;
}

/** Booked appointments and days off overlapping [from, to). */
export async function getBusy(fromISO: string, toISO: string, excludeBookingId?: string): Promise<Interval[]> {
  const rows = await q<{ starts_at: string; ends_at: string }>(
    `select starts_at, ends_at from bookings
       where status = 'booked' and starts_at < $2 and ends_at > $1 and id <> coalesce($3::uuid, '00000000-0000-0000-0000-000000000000')
     union all
     select starts_at, ends_at from time_off where starts_at < $2 and ends_at > $1`,
    [fromISO, toISO, excludeBookingId ?? null]
  );
  return rows.map((r) => ({ start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) }));
}

/** Inside a transaction: one booking change at a time, and no overlaps. */
async function lockAndCheck(t: Query, startsAt: string, endsAt: string, excludeId?: string) {
  await t(`select pg_advisory_xact_lock(73101)`);
  const clash = await t(
    `select 1 from bookings
      where status = 'booked' and starts_at < $2 and ends_at > $1
        and id <> coalesce($3::uuid, '00000000-0000-0000-0000-000000000000')
      limit 1`,
    [startsAt, endsAt, excludeId ?? null]
  );
  if (clash.length) throw new SlotTakenError();
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  let c = "BWA-";
  for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}

export type NewBooking = Pick<
  Booking,
  | "style_id"
  | "style_name"
  | "variant_label"
  | "blow_dry"
  | "starts_at"
  | "ends_at"
  | "price_total"
  | "deposit_amount"
  | "deposit_paid"
  | "client_name"
  | "client_email"
  | "client_phone"
  | "client_notes"
  | "source"
>;

export async function insertBooking(b: NewBooking): Promise<Booking> {
  return tx(async (t) => {
    await lockAndCheck(t, b.starts_at, b.ends_at);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeCode();
      const [taken] = await t(`select 1 from bookings where code = $1`, [code]);
      if (taken) continue;
      const [row] = await t<Booking>(
        `insert into bookings (code, style_id, style_name, variant_label, blow_dry, starts_at, ends_at, price_total,
           deposit_amount, deposit_paid, client_name, client_email, client_phone, client_notes, source)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         returning *`,
        [
          code,
          b.style_id,
          b.style_name,
          b.variant_label,
          b.blow_dry,
          b.starts_at,
          b.ends_at,
          Math.round(b.price_total),
          Math.round(b.deposit_amount),
          b.deposit_paid,
          b.client_name,
          b.client_email,
          b.client_phone,
          b.client_notes,
          b.source,
        ]
      );
      return row;
    }
    throw new Error("Could not create a booking code");
  });
}

const BOOKING_FIELDS = [
  "starts_at",
  "ends_at",
  "status",
  "deposit_paid",
  "owner_notes",
  "reschedule_count",
  "remind_day_at",
  "remind_soon_at",
  "cancelled_by",
] as const;
export type BookingPatch = Partial<Pick<Booking, (typeof BOOKING_FIELDS)[number]>>;

export async function updateBooking(id: string, patch: BookingPatch): Promise<Booking> {
  const entries = BOOKING_FIELDS.filter((k) => k in patch).map((k) => [k, patch[k]] as const);
  return tx(async (t) => {
    const [current] = await t<Booking>(`select * from bookings where id = $1`, [id]);
    if (!current) throw new Error("Booking not found");
    const next = { ...current, ...patch };
    const timesChanged = next.starts_at !== current.starts_at || next.ends_at !== current.ends_at;
    if (next.status === "booked" && (timesChanged || current.status !== "booked")) {
      await lockAndCheck(t, next.starts_at, next.ends_at, id);
    }
    if (!entries.length) return current;
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
    const [row] = await t<Booking>(`update bookings set ${sets} where id = $1 returning *`, [
      id,
      ...entries.map(([, v]) => v),
    ]);
    return row;
  });
}

export async function deleteBooking(id: string) {
  await q(`delete from bookings where id = $1`, [id]);
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function getBookingByToken(token: string): Promise<Booking | null> {
  if (!isUuid(token)) return null;
  const [row] = await q<Booking>(`select * from bookings where manage_token = $1`, [token]);
  return row ?? null;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (!isUuid(id)) return null;
  const [row] = await q<Booking>(`select * from bookings where id = $1`, [id]);
  return row ?? null;
}

export async function listBookings(fromISO: string, toISO: string): Promise<Booking[]> {
  return q<Booking>(`select * from bookings where starts_at >= $1 and starts_at < $2 order by starts_at`, [fromISO, toISO]);
}

/** Booked appointments starting in [from, to) whose reminder hasn't gone out yet. */
export async function claimReminder(kind: "day" | "soon", fromISO: string, toISO: string): Promise<Booking[]> {
  const col = kind === "day" ? "remind_day_at" : "remind_soon_at";
  // Setting the flag and reading the rows in one statement means a reminder
  // can never go out twice, even if two checks run at the same moment.
  return q<Booking>(
    `update bookings set ${col} = now()
      where status = 'booked' and ${col} is null and starts_at >= $1 and starts_at < $2
      returning *`,
    [fromISO, toISO]
  );
}

// ── Days off ───────────────────────────────────────────────────

export async function listTimeOff(): Promise<TimeOff[]> {
  return q<TimeOff>(`select id, starts_at, ends_at, reason from time_off where ends_at > now() order by starts_at`);
}

export async function addTimeOff(startsAt: string, endsAt: string, reason: string): Promise<TimeOff> {
  const [row] = await q<TimeOff>(
    `insert into time_off (starts_at, ends_at, reason) values ($1, $2, $3) returning id, starts_at, ends_at, reason`,
    [startsAt, endsAt, reason]
  );
  return row;
}

export async function deleteTimeOff(id: string) {
  await q(`delete from time_off where id = $1`, [id]);
}

// ── Phone alerts ───────────────────────────────────────────────

export async function getPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  return q<PushSubscriptionRow>(`select id, kind, token, p256dh, auth from push_subscriptions`);
}

export async function savePushSubscription(s: Omit<PushSubscriptionRow, "id">) {
  await q(
    `insert into push_subscriptions (kind, token, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (token) do update set kind = excluded.kind, p256dh = excluded.p256dh, auth = excluded.auth`,
    [s.kind, s.token, s.p256dh, s.auth]
  );
}

export async function deletePushSubscription(id: string) {
  await q(`delete from push_subscriptions where id = $1`, [id]);
}

// ── Spam limits ────────────────────────────────────────────────

/**
 * Records one request under `key` and says whether there have been more than
 * `max` in the last `minutes`. Keys never hold raw IPs or emails (see limitKey).
 */
export async function overLimit(key: string, max: number, minutes: number): Promise<boolean> {
  const [{ n }] = await q<{ n: number }>(
    `with added as (insert into hits (key) values ($1))
     select count(*)::int + 1 as n from hits where key = $1 and at > now() - make_interval(mins => $2)`,
    [key, minutes]
  );
  return n > max;
}

export async function clearOldHits() {
  await q(`delete from hits where at < now() - interval '1 day'`);
}

// ── Small key/value notes the app keeps for itself ────────────

export async function getMeta(key: string): Promise<string | null> {
  const [row] = await q<{ value: string }>(`select value from meta where key = $1`, [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await q(`insert into meta (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value`, [
    key,
    value,
  ]);
}
