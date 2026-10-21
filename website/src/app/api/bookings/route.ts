import { DateTime } from "luxon";
import { NextResponse, type NextRequest } from "next/server";
import { isSlotOpen, quote } from "@/lib/availability";
import { getBusy, getSettings, getStyle, insertBooking, SlotTakenError } from "@/lib/db";
import { BUSINESS_EMAIL, sendEmail } from "@/lib/email";
import { clientBookingReceived, manageUrl, ownerNewBooking } from "@/lib/emailTemplates";
import { firstName } from "@/lib/format";
import { bookingSpam } from "@/lib/limits";
import { notifyOwner } from "@/lib/push";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request");
  }

  // Bots fill every field; people never see this one.
  if (clean(body.website, 100)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 120).toLowerCase();
  const notes = clean(body.notes, 600);
  const date = clean(body.date, 10);
  const time = clean(body.time, 5);
  const blowDry = body.blowDry === true;
  const variantLabel = clean(body.variant, 80) || null;

  if (name.length < 2) return bad("Please enter your name.");
  if (phone.replace(/\D/g, "").length < 10) return bad("Please enter a valid phone number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Please enter a valid email address.");
  if (body.agree !== true) return bad("Please confirm you've read the policies.");
  if (await bookingSpam(req, email)) {
    return bad("Too many booking attempts. Please try again later, or message Abi directly.", 429);
  }

  const settings = await getSettings();
  if (!settings.accepting_bookings) return bad("Online booking is paused right now. Please message Abi directly.");

  const style = await getStyle(clean(body.styleId, 64));
  if (!style || !style.is_active) return bad("That style is no longer available.");
  const qt = quote(style, variantLabel, blowDry, settings);
  if (!qt) return bad("Please choose a size / length.");

  const start = DateTime.fromISO(`${date}T${time}`, { zone: settings.timezone });
  if (!start.isValid) return bad("Please pick a date and time.");
  const end = start.plus({ minutes: qt.minutes });

  const busy = await getBusy(start.minus({ days: 1 }).toUTC().toISO()!, end.plus({ days: 1 }).toUTC().toISO()!);
  if (!isSlotOpen(settings, qt.minutes, busy, date, time)) {
    return bad("Sorry, that time is no longer available. Please pick another.", 409);
  }

  try {
    const booking = await insertBooking({
      style_id: style.id,
      style_name: style.name,
      variant_label: qt.variant?.label ?? null,
      blow_dry: blowDry,
      starts_at: start.toUTC().toISO()!,
      ends_at: end.toUTC().toISO()!,
      price_total: qt.price,
      deposit_amount: qt.deposit,
      client_name: name,
      client_email: email,
      client_phone: phone,
      client_notes: notes,
      deposit_paid: false,
      source: "website",
    });

    const toClient = clientBookingReceived(booking, settings);
    const toOwner = ownerNewBooking(booking, settings);
    await Promise.all([
      sendEmail({ to: email, ...toClient }),
      sendEmail({ to: BUSINESS_EMAIL, ...toOwner, replyTo: email }),
      notifyOwner(
        "New booking 🎉",
        `${firstName(name)} · ${style.name} · ${start.toFormat("ccc LLL d, h:mm a")}`,
        { bookingId: booking.id }
      ),
    ]);

    return NextResponse.json({
      code: booking.code,
      startsAt: booking.starts_at,
      deposit: booking.deposit_amount,
      total: booking.price_total,
      etransferEmail: settings.etransfer_email,
      holdHours: settings.deposit_hold_hours,
      manageUrl: manageUrl(booking),
    });
  } catch (e) {
    if (e instanceof SlotTakenError) return bad(e.message, 409);
    console.error("[bookings] create failed", e);
    return bad("Something went wrong. Please try again or message Abi.", 500);
  }
}
