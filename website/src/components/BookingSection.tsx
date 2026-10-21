"use client";

import { useEffect, useRef, useState } from "react";
import { approxDuration, duration, hhmmTo12, money } from "@/lib/format";
import type { PublicConfig, PublicStyle } from "@/lib/types";
import { ChatButtons } from "./ChatLinks";
import SlotPicker, { prettyDate } from "./SlotPicker";

type Done = {
  code: string;
  deposit: number;
  total: number;
  etransferEmail: string;
  holdHours: number;
  manageUrl: string;
};

export default function BookingSection({ styles, config }: { styles: PublicStyle[]; config: PublicConfig }) {
  const [styleId, setStyleId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = styles.find((s) => s.id === styleId) ?? null;

  function choose(id: string) {
    setStyleId(id);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <section id="book" className="bg-ivory">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">Book</p>
            <h2 className="mt-3 font-display text-5xl italic">Choose your style</h2>
            <p className="mt-4 text-[1.05rem] text-muted">
              Tap a style to see the price, how long it takes and my open times.
            </p>
          </div>
        </div>

        {!config.acceptingBookings && (
          <p className="mt-8 rounded-2xl bg-blush px-5 py-4 text-ink/80">
            Online booking is paused for now — please send me a message to book.
          </p>
        )}

        <div className="no-scrollbar mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {styles.map((s) => {
            const fromPrice = Math.min(s.price, ...s.variants.map((v) => v.price));
            const selected = s.id === styleId;
            return (
              <button
                key={s.id}
                onClick={() => choose(s.id)}
                className={`group text-left transition ${selected ? "" : "hover:-translate-y-0.5"}`}
                aria-pressed={selected}
              >
                <div
                  className={`overflow-hidden rounded-2xl ring-offset-4 ring-offset-ivory transition ${
                    selected ? "ring-2 ring-rose" : ""
                  }`}
                >
                  <img
                    src={s.image_url}
                    alt={s.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <p className="mt-3 font-display text-xl leading-tight sm:text-2xl">{s.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {s.variants.length ? "from " : ""}
                  {money(fromPrice)} · {approxDuration(s.duration_minutes)}
                </p>
              </button>
            );
          })}
        </div>

        <div ref={panelRef} className="scroll-mt-20">
          {style && config.acceptingBookings && <BookingPanel key={style.id} style={style} config={config} />}
        </div>
      </div>
    </section>
  );
}

function BookingPanel({ style, config }: { style: PublicStyle; config: PublicConfig }) {
  const [variant, setVariant] = useState<string | null>(style.variants.length === 1 ? style.variants[0].label : null);
  const [blowDry, setBlowDry] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const v = style.variants.find((x) => x.label === variant) ?? null;
  const needsVariant = style.variants.length > 0 && !v;
  const minutes = (v?.duration_minutes ?? style.duration_minutes) + (blowDry ? config.blowDryMinutes : 0);
  const total = (v?.price ?? style.price) + (blowDry ? config.blowDryPrice : 0);
  const deposit = style.deposit ?? config.defaultDeposit;

  // Options change the length of the appointment → pick the time again.
  useEffect(() => {
    setDate(null);
    setTime(null);
  }, [variant, blowDry]);

  useEffect(() => {
    if (time) detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [time]);

  const query = new URLSearchParams({ style: style.id, ...(v ? { variant: v.label } : {}), blowDry: blowDry ? "1" : "0" }).toString();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId: style.id, variant: v?.label ?? null, blowDry, date, time, agree, ...form }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 409) setTime(null);
        throw new Error(j.error || "Something went wrong");
      }
      setDone(j);
      requestAnimationFrame(() => doneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div ref={doneRef} className="rise mt-14 scroll-mt-24">
        <Success done={done} name={form.name} styleName={style.name} date={date!} time={time!} />
      </div>
    );
  }

  return (
    <div className="rise mt-14 grid gap-10 border-t border-line pt-12 md:grid-cols-12">
      {/* Style details */}
      <div className="md:col-span-4">
        <div className="md:sticky md:top-24">
          <img
            src={style.image_url}
            alt={style.name}
            className="aspect-[4/5] w-full rounded-t-full rounded-b-3xl object-cover"
          />
          <h3 className="mt-5 font-display text-4xl italic">{style.name}</h3>
          <p className="mt-2 leading-relaxed text-muted">{style.description}</p>
          <p className="mt-3 text-sm text-muted">
            {style.hair_included ? "✓ Braiding hair included" : "Braiding hair not included — I'll tell you what to bring."}
          </p>
        </div>
      </div>

      <div className="space-y-10 md:col-span-8">
        {/* 1. Options */}
        <Step n={1} title="Your options">
          {style.variants.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {style.variants.map((x) => (
                <button
                  key={x.label}
                  type="button"
                  onClick={() => setVariant(x.label)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                    x.label === variant ? "border-ink bg-ink text-cream" : "border-line bg-cream hover:border-rose"
                  }`}
                >
                  <span>{x.label}</span>
                  <span className={`text-sm ${x.label === variant ? "text-cream/80" : "text-muted"}`}>
                    {money(x.price)} · {approxDuration(x.duration_minutes)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-cream px-4 py-3.5">
            <span>
              Add blow-dry
              <span className="block text-sm text-muted">
                +{money(config.blowDryPrice)} · adds about {duration(config.blowDryMinutes)}
              </span>
            </span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={blowDry}
                onChange={(e) => setBlowDry(e.target.checked)}
              />
              <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-rose" />
              <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-blush/70 px-5 py-4">
            <Fact label="Total" value={needsVariant ? "—" : money(total)} />
            <Fact label="Time" value={needsVariant ? "—" : `about ${duration(minutes)}`} />
            <Fact label="Deposit to book" value={money(deposit)} />
          </div>
        </Step>

        {/* 2. Date & time */}
        <Step n={2} title="Pick a date & time">
          {needsVariant ? (
            <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-muted">
              Choose a size / length above to see open times.
            </p>
          ) : (
            <SlotPicker
              query={query}
              timezone={config.timezone}
              date={date}
              time={time}
              onChange={(d, t) => {
                setDate(d);
                setTime(t);
              }}
            />
          )}
        </Step>

        {/* 3. Details */}
        <div ref={detailsRef} className="scroll-mt-24">
          <Step n={3} title="Your details" muted={!time}>
            {!time ? (
              <p className="text-muted">Pick a time first.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <p className="rounded-2xl bg-cream px-4 py-3 text-sm">
                  <strong className="font-normal">{style.name}</strong>
                  {v ? ` · ${v.label}` : ""}
                  {blowDry ? " · with blow-dry" : ""} — {prettyDate(date!)} at {hhmmTo12(time)}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} autoComplete="name" required />
                  <Field label="Phone" type="tel" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} autoComplete="tel" required />
                </div>
                <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} autoComplete="email" required hint="Your confirmation and reminders are sent here." />
                <label className="block">
                  <span className="text-sm text-muted">Anything I should know? (optional)</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    placeholder="Colour, length, inspiration, sensitive scalp…"
                    className="mt-1.5 w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
                  />
                </label>
                {/* honeypot */}
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  aria-hidden
                />
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--color-rose)]"
                    required
                  />
                  <span>
                    I&apos;ve read the{" "}
                    <a href="#policies" className="text-rose underline underline-offset-2">
                      deposit, late and cancellation policies
                    </a>{" "}
                    and understand my {money(deposit)} deposit is non-refundable.
                  </span>
                </label>
                {error && <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">{error}</p>}
                <button
                  disabled={submitting}
                  className="w-full rounded-full bg-ink px-8 py-4 text-cream transition hover:bg-rose-dark disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Booking…" : `Book my appointment`}
                </button>
                <p className="text-sm text-muted">
                  After booking, send your {money(deposit)} deposit by Interac e-Transfer to keep your spot.
                </p>
              </form>
            )}
          </Step>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children, muted }: { n: number; title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={muted ? "opacity-60" : ""}>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-2xl text-gold">0{n}</span>
        <h4 className="font-display text-3xl">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-xs tracking-wider text-muted uppercase">{label}</span>
      <span className="block font-display text-2xl">{value}</span>
    </p>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        className="mt-1.5 w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-rose"
      />
      {props.hint && <span className="mt-1 block text-xs text-muted">{props.hint}</span>}
    </label>
  );
}

function Success({ done, name, styleName, date, time }: { done: Done; name: string; styleName: string; date: string; time: string }) {
  const first = name.trim().split(/\s+/)[0];
  const message = `${done.code} – ${first}`;
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-cream p-7 text-center sm:p-12">
      <p className="eyebrow">You&apos;re booked</p>
      <h3 className="mt-3 font-display text-5xl italic">Thank you, {first}!</h3>
      <p className="mt-4 text-muted">
        See you for <strong className="font-normal text-ink">{styleName}</strong> on{" "}
        <strong className="font-normal text-ink">
          {prettyDate(date)} at {hhmmTo12(time)}
        </strong>
        .
      </p>

      <div className="mt-8 rounded-3xl bg-ivory p-6 text-left">
        <p className="font-display text-2xl">Now send your {money(done.deposit)} deposit</p>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <Num n={1} />
            <div className="min-w-0 flex-1">
              Interac e-Transfer to
              <CopyRow value={done.etransferEmail} />
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={2} />
            <div className="min-w-0 flex-1">
              In the message write
              <CopyRow value={message} />
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={3} />
            <div>
              Send it within <strong className="font-normal">{done.holdHours} hours</strong> to keep your spot.
            </div>
          </li>
        </ol>
      </div>
      <p className="mt-6 text-sm text-muted">
        We&apos;ve emailed you these details. You&apos;ll also get a reminder the day before and a couple of hours
        before. The deposit comes off your {money(done.total)} total.
      </p>
      <a href={done.manageUrl} className="mt-6 inline-block text-sm text-rose underline underline-offset-4">
        View or change my booking
      </a>
      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">Questions? Message me:</p>
        <ChatButtons />
      </div>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blush font-display text-lg text-rose-dark">
      {n}
    </span>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-cream py-1.5 pr-1.5 pl-3">
      <span className="min-w-0 flex-1 font-normal break-all">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded-lg bg-ink px-3 py-1.5 text-xs text-cream"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
