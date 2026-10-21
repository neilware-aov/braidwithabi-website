"use client";

import { useState } from "react";
import { duration, hhmmTo12, money } from "@/lib/format";
import type { PublicBooking } from "@/lib/publicConfig";
import type { PublicConfig } from "@/lib/types";
import SlotPicker, { prettyDate } from "./SlotPicker";

function statusOf(b: PublicBooking) {
  if (b.status === "cancelled") return { label: "Cancelled", tone: "bg-rose/10 text-rose-dark" };
  if (b.status === "done") return { label: "Completed", tone: "bg-line text-muted" };
  if (!b.deposit_paid) return { label: "Booked · deposit due", tone: "bg-gold/15 text-[#8a6a35]" };
  return { label: "Booked ✓", tone: "bg-emerald-50 text-emerald-800" };
}

export default function ManageBooking({
  token,
  initial,
  config,
}: {
  token: string;
  initial: PublicBooking;
  config: PublicConfig;
}) {
  const [b, setB] = useState(initial);
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleString("en-CA", { timeZone: config.timezone, ...opts });
  const when = `${fmt(b.starts_at, { weekday: "long", month: "long", day: "numeric" })} at ${fmt(b.starts_at, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  const minutes = Math.round((Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000);
  const hoursUntil = (Date.parse(b.starts_at) - Date.now()) / 3_600_000;
  const live = b.status === "booked" && hoursUntil > 0;
  const canReschedule = live && hoursUntil >= config.rescheduleCutoffHours && b.reschedule_count < 1;
  const late = live && hoursUntil < config.rescheduleCutoffHours;
  const status = statusOf(b);

  async function act(body: object, success: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setB(j.booking);
      setMode("view");
      setFlash(success);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise">
      <p className="eyebrow">Booking {b.code}</p>
      <h1 className="mt-3 font-display text-5xl italic">Hi {b.client_name.split(" ")[0]}</h1>

      {flash && <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800">{flash}</p>}

      <div className="mt-8 rounded-[2rem] border border-line bg-ivory p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl">{b.style_name}</p>
            <p className="text-muted">
              {b.variant_label}
              {b.variant_label && b.blow_dry ? " · " : ""}
              {b.blow_dry ? "with blow-dry" : ""}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm ${status.tone}`}>{status.label}</span>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
          <Item label="When" value={when} />
          <Item label="Length" value={`about ${duration(minutes)}`} />
          <Item label="Total" value={`${money(b.price_total)} (${money(b.deposit_amount)} deposit)`} />
        </dl>

        {!b.deposit_paid && live && (
          <div className="mt-6 rounded-2xl bg-blush px-5 py-4 text-ink/85">
            <p className="font-normal">Your deposit hasn&apos;t been marked as received yet.</p>
            <p className="mt-1 text-sm">
              Send {money(b.deposit_amount)} by Interac e-Transfer to <strong className="font-normal">{config.etransferEmail}</strong>{" "}
              with the message <strong className="font-normal">{b.code}</strong>.
            </p>
          </div>
        )}
      </div>

      {live && mode === "view" && (
        <div className="mt-6 flex flex-wrap gap-3">
          {canReschedule && (
            <button onClick={() => setMode("reschedule")} className="rounded-full bg-ink px-6 py-3 text-cream hover:bg-rose-dark">
              Reschedule
            </button>
          )}
          <button onClick={() => setMode("cancel")} className="rounded-full border border-line px-6 py-3 hover:border-rose">
            Cancel appointment
          </button>
        </div>
      )}
      {live && mode === "view" && !canReschedule && (
        <p className="mt-4 text-sm text-muted">
          {late
            ? `It's less than ${config.rescheduleCutoffHours} hours until your appointment, so changes need to go through Abi directly.`
            : "This booking has already been rescheduled once — please message Abi for another change."}
        </p>
      )}

      {mode === "reschedule" && (
        <div className="mt-10">
          <h2 className="mb-5 font-display text-3xl">Pick a new time</h2>
          <SlotPicker
            query={`token=${token}`}
            timezone={config.timezone}
            date={date}
            time={time}
            onChange={(d, t) => {
              setDate(d);
              setTime(t);
            }}
          />
          <p className="mt-5 text-sm text-muted">You can reschedule once for free. Your deposit carries over.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={!time || busy}
              onClick={() => act({ action: "reschedule", date, time }, "Done! Your appointment has been moved — check your email.")}
              className="rounded-full bg-ink px-6 py-3 text-cream disabled:opacity-40"
            >
              {busy ? "Saving…" : time ? `Move to ${prettyDate(date!)}, ${hhmmTo12(time)}` : "Choose a time"}
            </button>
            <button onClick={() => setMode("view")} className="rounded-full px-6 py-3 text-muted">
              Never mind
            </button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="mt-8 rounded-[2rem] border border-rose/30 bg-rose/5 p-6">
          <p className="font-display text-2xl">Cancel this appointment?</p>
          <p className="mt-2 text-ink/80">
            {late || b.deposit_paid
              ? `Deposits are non-refundable${late ? `, and it's within ${config.rescheduleCutoffHours} hours of your appointment` : ""}.`
              : "Your time will be released for other clients."}{" "}
            {canReschedule && "Would rescheduling work instead?"}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() => act({ action: "cancel" }, "Your appointment has been cancelled.")}
              className="rounded-full bg-rose-dark px-6 py-3 text-cream disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button onClick={() => setMode("view")} className="rounded-full px-6 py-3 text-muted">
              Keep my appointment
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-5 rounded-2xl bg-rose/10 px-5 py-4 text-rose-dark">{error}</p>}

      <a href="/" className="mt-12 inline-block text-sm text-rose underline underline-offset-4">
        ← Back to Braid with Abi
      </a>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
