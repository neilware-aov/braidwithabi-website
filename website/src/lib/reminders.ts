// Appointment reminders, run every 15 minutes:
//  • about 1 day before  → email to the client + alert on Abi's phone
//  • about 2 hours before → email to the client + alert on Abi's phone
// Each reminder is sent once (the booking is marked as it goes out).
import "server-only";
import { DateTime } from "luxon";
import { claimReminder, clearOldHits, getSettings, setMeta } from "./db";
import { sendEmail } from "./email";
import { clientReminder, clientSoon } from "./emailTemplates";
import { firstName, fmtTime } from "./format";
import { notifyOwner } from "./push";
import type { Booking } from "./types";

const HOUR = 3_600_000;
export const SOON_HOURS = 2;

export async function runReminders() {
  const settings = await getSettings();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const what = (b: Booking) =>
    `${firstName(b.client_name)} · ${b.style_name}${b.variant_label ? ` (${b.variant_label})` : ""}`;

  // "In 2 hours" first, so an appointment that is close never gets both at once.
  const soon = await claimReminder("soon", iso(now), iso(now + SOON_HOURS * HOUR));
  for (const b of soon) {
    await Promise.all([
      b.client_email && sendEmail({ to: b.client_email, ...clientSoon(b, settings) }),
      notifyOwner(`At ${fmtTime(b.starts_at, settings.timezone)} today`, what(b), { bookingId: b.id }),
    ]);
  }

  const day = await claimReminder("day", iso(now + SOON_HOURS * HOUR), iso(now + 24 * HOUR));
  for (const b of day) {
    // Booked in the last day? They just got their booking email — no need for another.
    const bookedLongAgo = Date.parse(b.starts_at) - Date.parse(b.created_at) > 24 * HOUR;
    const when = DateTime.fromISO(b.starts_at, { zone: settings.timezone });
    const today = DateTime.now().setZone(settings.timezone);
    const dayLabel = when.hasSame(today, "day") ? "Today" : when.hasSame(today.plus({ days: 1 }), "day") ? "Tomorrow" : when.toFormat("cccc");
    await Promise.all([
      bookedLongAgo && b.client_email && sendEmail({ to: b.client_email, ...clientReminder(b, settings) }),
      notifyOwner(`${dayLabel} at ${when.toFormat("h:mm a")}`, what(b), {
        bookingId: b.id,
      }),
    ]);
  }

  await clearOldHits();
  await setMeta("reminders_last_run", new Date().toISOString());
  return { soon: soon.length, day: day.length };
}
