import { DateTime } from "luxon";
import { NextResponse, type NextRequest } from "next/server";
import { computeSlots, quote } from "@/lib/availability";
import { getBookingByToken, getBusy, getSettings, getStyle } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?month=2026-11&style=<id>&variant=<label>&blowDry=1
 * GET /api/availability?month=2026-11&token=<manage token>   (rescheduling)
 * → { days: { "2026-11-03": ["09:00", ...] }, minutes }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const settings = await getSettings();
  if (!settings.accepting_bookings) return NextResponse.json({ days: {}, minutes: 0 });

  const month = DateTime.fromFormat(q.get("month") ?? "", "yyyy-LL", { zone: settings.timezone });
  if (!month.isValid) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  let minutes: number;
  let excludeId: string | undefined;
  const token = q.get("token");
  if (token) {
    const booking = await getBookingByToken(token);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    minutes = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000);
    excludeId = booking.id;
  } else {
    const style = await getStyle(q.get("style") ?? "");
    if (!style || !style.is_active) return NextResponse.json({ error: "Style not found" }, { status: 404 });
    const qt = quote(style, q.get("variant") || null, q.get("blowDry") === "1", settings);
    if (!qt) return NextResponse.json({ error: "Choose an option" }, { status: 400 });
    minutes = qt.minutes;
  }

  const from = month.startOf("month");
  const to = month.endOf("month");
  const busy = await getBusy(from.minus({ days: 1 }).toUTC().toISO()!, to.plus({ days: 1 }).toUTC().toISO()!, excludeId);
  const days = computeSlots({ settings, durationMinutes: minutes, busy, from, to });
  return NextResponse.json({ days, minutes }, { headers: { "Cache-Control": "no-store" } });
}
