"use client";

import { useEffect, useMemo, useState } from "react";
import { hhmmTo12 } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_AHEAD_LIMIT = 3;

function monthKeyInTz(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(
    new Date()
  );
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
function todayInTz(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date()); // yyyy-mm-dd
}
function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
}
export function prettyDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Month calendar + time chips. `query` is the availability query string
 * without the month (e.g. "style=abc&blowDry=1" or "token=..."); changing it
 * reloads availability.
 */
export default function SlotPicker({
  query,
  timezone,
  date,
  time,
  onChange,
}: {
  query: string;
  timezone: string;
  date: string | null;
  time: string | null;
  onChange: (date: string | null, time: string | null) => void;
}) {
  const firstMonth = useMemo(() => monthKeyInTz(timezone), [timezone]);
  const today = useMemo(() => todayInTz(timezone), [timezone]);
  const [month, setMonth] = useState(firstMonth);
  const [days, setDays] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/availability?month=${month}&${query}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not load availability");
        return j;
      })
      .then((j) => !cancelled && setDays(j.days ?? {}))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, query]);

  const [y, m] = month.split("-").map(Number);
  const startWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const times = date ? days[date] ?? [] : [];
  const groups = [
    { label: "Morning", list: times.filter((t) => t < "12:00") },
    { label: "Afternoon", list: times.filter((t) => t >= "12:00" && t < "17:00") },
    { label: "Evening", list: times.filter((t) => t >= "17:00") },
  ].filter((g) => g.list.length);

  const canPrev = month > firstMonth;
  const canNext = month < addMonths(firstMonth, MONTH_AHEAD_LIMIT);
  const hasAny = Object.keys(days).length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="rounded-3xl border border-line bg-ivory p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, -1))}
            disabled={!canPrev}
            className="grid h-9 w-9 place-items-center rounded-full text-lg transition hover:bg-blush disabled:opacity-25"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="font-display text-xl">{monthLabel(month)}</p>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            disabled={!canNext}
            className="grid h-9 w-9 place-items-center rounded-full text-lg transition hover:bg-blush disabled:opacity-25"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[0.7rem] tracking-wider text-muted uppercase">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 gap-1 transition-opacity ${loading ? "opacity-40" : ""}`}>
          {cells.map((c, n) => {
            if (!c) return <div key={`e${n}`} />;
            const open = !!days[c]?.length;
            const selected = c === date;
            return (
              <button
                key={c}
                type="button"
                disabled={!open}
                onClick={() => onChange(c, null)}
                className={`relative aspect-square rounded-full text-sm transition ${
                  selected
                    ? "bg-ink text-cream"
                    : open
                      ? "text-ink hover:bg-blush"
                      : "cursor-default text-ink/25"
                } ${c === today && !selected ? "ring-1 ring-line" : ""}`}
              >
                {Number(c.slice(8))}
                {open && !selected && (
                  <span className="absolute bottom-[18%] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose" />
                )}
              </button>
            );
          })}
        </div>
        {!loading && !error && !hasAny && (
          <p className="mt-3 text-center text-sm text-muted">
            No openings this month{canNext ? " — try the next one" : ""}.
          </p>
        )}
        {error && <p className="mt-3 text-center text-sm text-rose">{error}</p>}
      </div>

      <div>
        {!date ? (
          <div className="grid h-full min-h-40 place-items-center rounded-3xl border border-dashed border-line p-6 text-center text-muted">
            <p>
              Pick a day with a <span className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-rose align-middle" /> to
              see open times.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-display text-2xl">{prettyDate(date)}</p>
            {groups.map((g) => (
              <div key={g.label} className="mt-4">
                <p className="mb-2 text-xs tracking-wider text-muted uppercase">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.list.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onChange(date, t)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        t === time ? "border-ink bg-ink text-cream" : "border-line bg-ivory hover:border-rose"
                      }`}
                    >
                      {hhmmTo12(t)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
