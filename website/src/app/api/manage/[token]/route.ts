import { DateTime } from "luxon";
import { NextResponse, type NextRequest } from "next/server";
import { isSlotOpen } from "@/lib/availability";
import { getBookingByToken, getBusy, getSettings, SlotTakenError, updateBooking } from "@/lib/db";
import { OWNER_EMAIL, sendEmail } from "@/lib/email";
import { clientCancelled, clientRescheduled, ownerClientChange } from "@/lib/emailTemplates";
import { firstName } from "@/lib/format";
import { toPublicBooking } from "@/lib/publicConfig";
import { notifyOwner } from "@/lib/push";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** POST { action: "cancel" } | { action: "reschedule", date, time } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const booking = await getBookingByToken(token);
  if (!booking) return bad("Booking not found", 404);
  const settings = await getSettings();
  const body = await req.json().catch(() => ({}));

  const live = booking.status === "booked";
  const hoursUntil = (Date.parse(booking.starts_at) - Date.now()) / 3_600_000;
  if (!live || hoursUntil <= 0) return bad("This appointment can no longer be changed online.");

  if (body.action === "cancel") {
    const updated = await updateBooking(booking.id, { status: "cancelled", cancelled_by: "client" });
    await Promise.all([
      updated.client_email && sendEmail({ to: updated.client_email, ...clientCancelled(updated, settings, true) }),
      sendEmail({ to: settings.owner_email || OWNER_EMAIL, ...ownerClientChange(updated, settings, "cancelled") }),
      notifyOwner("Booking cancelled", `${firstName(updated.client_name)} cancelled ${updated.style_name}`, {
        bookingId: updated.id,
      }),
    ]);
    return NextResponse.json({ booking: toPublicBooking(updated) });
  }

  if (body.action === "reschedule") {
    if (hoursUntil < settings.reschedule_cutoff_hours) {
      return bad(`Changes within ${settings.reschedule_cutoff_hours} hours need to go through Abi directly.`);
    }
    if (booking.reschedule_count >= 1) {
      return bad("This booking has already been rescheduled once. Please message Abi for another change.");
    }
    const date = String(body.date ?? "");
    const time = String(body.time ?? "");
    const minutes = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000);
    const start = DateTime.fromISO(`${date}T${time}`, { zone: settings.timezone });
    if (!start.isValid) return bad("Please pick a new date and time.");
    const end = start.plus({ minutes });
    const busy = await getBusy(
      start.minus({ days: 1 }).toUTC().toISO()!,
      end.plus({ days: 1 }).toUTC().toISO()!,
      booking.id
    );
    if (!isSlotOpen(settings, minutes, busy, date, time)) return bad("That time is no longer available.", 409);
    try {
      const updated = await updateBooking(booking.id, {
        starts_at: start.toUTC().toISO()!,
        ends_at: end.toUTC().toISO()!,
        reschedule_count: booking.reschedule_count + 1,
        remind_day_at: null,
        remind_soon_at: null,
      });
      await Promise.all([
        updated.client_email && sendEmail({ to: updated.client_email, ...clientRescheduled(updated, settings) }),
        sendEmail({ to: settings.owner_email || OWNER_EMAIL, ...ownerClientChange(updated, settings, "rescheduled") }),
        notifyOwner(
          "Booking rescheduled",
          `${firstName(updated.client_name)} moved to ${start.toFormat("ccc LLL d, h:mm a")}`,
          { bookingId: updated.id }
        ),
      ]);
      return NextResponse.json({ booking: toPublicBooking(updated) });
    } catch (e) {
      if (e instanceof SlotTakenError) return bad(e.message, 409);
      throw e;
    }
  }

  return bad("Unknown action");
}
