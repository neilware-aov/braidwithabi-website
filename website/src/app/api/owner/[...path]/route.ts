// Everything the owner app does goes through here. There is no login: the
// app sends a private key (OWNER_KEY) that only Abi's app knows.
import { timingSafeEqual } from "node:crypto";
import { DateTime } from "luxon";
import { NextResponse, type NextRequest } from "next/server";
import { quote } from "@/lib/availability";
import {
  addTimeOff,
  deleteBooking,
  deleteStyle,
  deleteTimeOff,
  getBookingById,
  getMeta,
  getPushSubscriptions,
  getSettings,
  getStyle,
  getStyles,
  insertBooking,
  listBookings,
  listTimeOff,
  savePushSubscription,
  saveSettings,
  saveStyle,
  setStylePhoto,
  SlotTakenError,
  updateBooking,
} from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { clientBookingReceived, clientCancelled, clientDepositReceived } from "@/lib/emailTemplates";
import { badKeySpam } from "@/lib/limits";
import { notifyOwner } from "@/lib/push";
import type { Booking, Style } from "@/lib/types";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: CORS });
const fail = (error: string, status = 400) => json({ error }, status);

function authorised(req: NextRequest) {
  // Ignores spaces or quotes pasted around the value in Vercel.
  const key = (process.env.OWNER_KEY ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (key.length < 16 || given.length !== key.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(key));
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  if (!process.env.OWNER_KEY) return fail("OWNER_KEY is not set on the website.", 500);
  if (!authorised(req)) {
    // Slow down anyone guessing keys.
    if (await badKeySpam(req)) return fail("Too many attempts. Try again later.", 429);
    return fail("This app isn't connected to your website (wrong key).", 401);
  }

  const { path } = await ctx.params;
  const [resource, id, sub] = path;
  const method = req.method;
  const body = method === "GET" || method === "DELETE" ? {} : await req.json().catch(() => ({}));

  try {
    // ── Bookings ────────────────────────────────────────────
    if (resource === "bookings") {
      if (!id && method === "GET") {
        const sp = req.nextUrl.searchParams;
        return json(await listBookings(sp.get("from") ?? "", sp.get("to") ?? ""));
      }
      if (!id && method === "POST") return json(await createBooking(body), 201);

      const booking = await getBookingById(id);
      if (!booking) return fail("This appointment no longer exists.", 404);
      if (method === "GET") return json(booking);
      if (method === "DELETE") {
        await deleteBooking(id);
        return json({ ok: true });
      }
      if (method === "POST") return json(await bookingAction(booking, body));
    }

    // ── Styles & prices ─────────────────────────────────────
    if (resource === "styles") {
      if (!id && method === "GET") return json(await getStyles(true));
      if (!id && method === "POST") return json(await saveStyle(null, cleanStyle(body)), 201);
      if (id && sub === "photo" && method === "POST") {
        const { mime, data } = body as { mime?: string; data?: string };
        if (!data || !/^image\/(jpeg|png|webp)$/.test(mime ?? "")) return fail("Please choose a photo.");
        if (data.length > 3_000_000) return fail("That photo is too large.");
        return json(await setStylePhoto(id, mime!, data.replace(/^data:[^,]+,/, "")));
      }
      if (id && method === "PUT") return json(await saveStyle(id, cleanStyle(body)));
      if (id && method === "DELETE") {
        await deleteStyle(id);
        return json({ ok: true });
      }
    }

    // ── Settings ────────────────────────────────────────────
    if (resource === "settings") {
      if (method === "GET") return json(await getSettings());
      if (method === "PUT") return json(await saveSettings(body));
    }

    // ── Days off ────────────────────────────────────────────
    if (resource === "time-off") {
      if (!id && method === "GET") return json(await listTimeOff());
      if (!id && method === "POST") {
        const { starts_at, ends_at, reason } = body as Record<string, string>;
        if (!starts_at || !ends_at || Date.parse(ends_at) <= Date.parse(starts_at)) return fail("Pick the days first.");
        return json(await addTimeOff(starts_at, ends_at, String(reason ?? "").slice(0, 120)), 201);
      }
      if (id && method === "DELETE") {
        await deleteTimeOff(id);
        return json({ ok: true });
      }
    }

    // ── Phone alerts ────────────────────────────────────────
    if (resource === "push") {
      if (id === "test" && method === "POST") {
        await notifyOwner("Alerts are working ✓", "You'll get a message like this for every new booking and before each appointment.");
        return json({ ok: true });
      }
      if (!id && method === "POST") {
        const { kind, token, p256dh, auth } = body as Record<string, string>;
        if ((kind !== "expo" && kind !== "web") || !token) return fail("Invalid subscription");
        await savePushSubscription({ kind, token, p256dh: p256dh ?? null, auth: auth ?? null });
        return json({ ok: true });
      }
    }

    // ── Health check for the Settings screen ────────────────
    if (resource === "status" && method === "GET") {
      return json({
        remindersLastRun: await getMeta("reminders_last_run"),
        emailReady: !!process.env.RESEND_API_KEY,
        alertDevices: (await getPushSubscriptions()).length,
      });
    }

    return fail("Not found", 404);
  } catch (e) {
    if (e instanceof SlotTakenError) return fail("That time overlaps another appointment.", 409);
    console.error("[owner api]", method, path.join("/"), e);
    return fail(e instanceof Error ? e.message : "Something went wrong", 500);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };

// ── Helpers ──────────────────────────────────────────────────

async function emailClient(b: Booking, make: (b: Booking, s: Awaited<ReturnType<typeof getSettings>>) => { subject: string; html: string }) {
  if (!b.client_email) return;
  await sendEmail({ to: b.client_email, ...make(b, await getSettings()) });
}

async function bookingAction(b: Booking, body: Record<string, unknown>) {
  switch (body.action) {
    case "deposit": {
      const paid = body.paid !== false;
      const updated = await updateBooking(b.id, { deposit_paid: paid });
      if (paid && !b.deposit_paid && updated.status === "booked" && Date.parse(updated.starts_at) > Date.now()) {
        await emailClient(updated, clientDepositReceived);
      }
      return updated;
    }
    case "done":
      return updateBooking(b.id, { status: "done" });
    case "undo": // back to a normal booked appointment
      return updateBooking(b.id, { status: "booked", cancelled_by: null });
    case "cancel": {
      const updated = await updateBooking(b.id, { status: "cancelled", cancelled_by: "owner" });
      if (body.tellClient === true) await emailClient(updated, (x, s) => clientCancelled(x, s, false));
      return updated;
    }
    case "notes":
      return updateBooking(b.id, { owner_notes: String(body.notes ?? "").slice(0, 2000) });
    default:
      throw new Error("Unknown action");
  }
}

async function createBooking(body: Record<string, any>) {
  const settings = await getSettings();
  const style = await getStyle(String(body.style_id ?? ""));
  if (!style) throw new Error("Choose a style.");
  const qt = quote(style, body.variant_label || null, body.blow_dry === true, settings);
  if (!qt) throw new Error("Choose a size / length.");
  const start = DateTime.fromISO(String(body.starts_at ?? ""));
  if (!start.isValid) throw new Error("Pick a day and time.");
  const name = String(body.client_name ?? "").trim().slice(0, 80);
  const phone = String(body.client_phone ?? "").trim().slice(0, 30);
  const email = String(body.client_email ?? "").trim().toLowerCase().slice(0, 120) || null;
  if (name.length < 2) throw new Error("Add the client's name.");

  const booking = await insertBooking({
    style_id: style.id,
    style_name: style.name,
    variant_label: qt.variant?.label ?? null,
    blow_dry: body.blow_dry === true,
    starts_at: start.toUTC().toISO()!,
    ends_at: start.plus({ minutes: qt.minutes }).toUTC().toISO()!,
    price_total: Number.isFinite(Number(body.price_total)) && Number(body.price_total) > 0 ? Number(body.price_total) : qt.price,
    deposit_amount: qt.deposit,
    deposit_paid: body.deposit_paid === true,
    client_name: name,
    client_email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    client_phone: phone,
    client_notes: String(body.client_notes ?? "").trim().slice(0, 600),
    source: "owner",
  });
  await emailClient(booking, clientBookingReceived);
  return booking;
}

function cleanStyle(body: Record<string, any>): Partial<Style> {
  const out: Partial<Style> = {};
  const int = (v: unknown, min = 0) => Math.max(min, Math.round(Number(v) || 0));
  if ("name" in body) out.name = String(body.name).trim().slice(0, 80);
  if ("description" in body) out.description = String(body.description).trim().slice(0, 600);
  if ("duration_minutes" in body) out.duration_minutes = int(body.duration_minutes, 15);
  if ("price" in body) out.price = int(body.price);
  if ("deposit" in body) out.deposit = body.deposit === null || body.deposit === "" ? null : int(body.deposit);
  if ("hair_included" in body) out.hair_included = body.hair_included === true;
  if ("is_active" in body) out.is_active = body.is_active === true;
  if ("sort_order" in body) out.sort_order = int(body.sort_order);
  if (Array.isArray(body.variants)) {
    out.variants = body.variants
      .filter((v: any) => String(v?.label ?? "").trim())
      .map((v: any) => ({
        label: String(v.label).trim().slice(0, 80),
        price: int(v.price),
        duration_minutes: int(v.duration_minutes, 15),
      }));
  }
  if (out.name === "") throw new Error("Give the style a name.");
  return out;
}
