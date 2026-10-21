import { DateTime } from "luxon";
import type { Interval } from "./db";
import type { DayKey, Settings, Style } from "./types";

const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]; // luxon weekday 1..7

/** Price / duration / deposit for a style + options, computed on the server. */
export function quote(style: Style, variantLabel: string | null, blowDry: boolean, settings: Settings) {
  const variant = variantLabel ? style.variants.find((v) => v.label === variantLabel) ?? null : null;
  if (variantLabel && !variant) return null;
  if (!variantLabel && style.variants.length > 0) return null; // must choose an option
  const minutes = (variant?.duration_minutes ?? style.duration_minutes) + (blowDry ? settings.blow_dry_minutes : 0);
  const price = (variant?.price ?? style.price) + (blowDry ? settings.blow_dry_price : 0);
  const deposit = style.deposit ?? settings.default_deposit;
  return { variant, minutes, price, deposit };
}

/**
 * Open start times per day, in the business timezone.
 * Returns { "2026-11-03": ["09:00", "09:30", ...] } for days in [from, to].
 */
export function computeSlots(opts: {
  settings: Settings;
  durationMinutes: number;
  busy: Interval[];
  from: DateTime; // first day (any time of day)
  to: DateTime; // last day (inclusive)
  now?: DateTime;
}): Record<string, string[]> {
  const { settings, durationMinutes, busy } = opts;
  const tz = settings.timezone;
  const now = (opts.now ?? DateTime.now()).setZone(tz);
  const earliest = now.plus({ hours: settings.min_notice_hours });
  const latestDay = now.startOf("day").plus({ days: settings.max_days_ahead });
  const buffer = settings.buffer_minutes * 60_000;
  const step = Math.max(15, settings.slot_interval_minutes);

  const out: Record<string, string[]> = {};
  let day = opts.from.setZone(tz).startOf("day");
  const lastDay = DateTime.min(opts.to.setZone(tz).startOf("day"), latestDay);

  while (day <= lastDay) {
    const hours = settings.working_hours[DAY_KEYS[day.weekday - 1]];
    const key = day.toISODate()!;
    if (hours && day >= now.startOf("day")) {
      const open = DateTime.fromISO(`${key}T${hours.open}`, { zone: tz });
      const close = DateTime.fromISO(`${key}T${hours.close}`, { zone: tz });
      const times: string[] = [];
      for (let t = open; t.plus({ minutes: durationMinutes }) <= close; t = t.plus({ minutes: step })) {
        if (t < earliest) continue;
        const s = t.toMillis();
        const e = s + durationMinutes * 60_000;
        const clash = busy.some((b) => b.start - buffer < e && b.end + buffer > s);
        if (!clash) times.push(t.toFormat("HH:mm"));
      }
      if (times.length) out[key] = times;
    }
    day = day.plus({ days: 1 });
  }
  return out;
}

/** Is this exact start time bookable right now? */
export function isSlotOpen(
  settings: Settings,
  durationMinutes: number,
  busy: Interval[],
  date: string,
  time: string
): boolean {
  const d = DateTime.fromISO(date, { zone: settings.timezone });
  if (!d.isValid) return false;
  const slots = computeSlots({ settings, durationMinutes, busy, from: d, to: d });
  return (slots[date] ?? []).includes(time);
}
