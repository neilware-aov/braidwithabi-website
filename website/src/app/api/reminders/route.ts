// Sends due appointment reminders. Called every 15 minutes by Supabase
// (pg_cron, set up automatically) and once a day by Vercel as a backup.
// Safe to call any time: each reminder only ever goes out once.
import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET() {
  const sent = await runReminders();
  return NextResponse.json({ ok: true, sent });
}

export const POST = GET;
