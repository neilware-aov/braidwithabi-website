import { business, chatLinks } from "@/lib/content";
import { ChatIcon } from "./ChatLinks";
import type { WorkingHours } from "@/lib/types";

const DAYS: Array<[keyof WorkingHours, string]> = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
];

const to12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
};

export default function Footer({ hours }: { hours: WorkingHours }) {
  return (
    <footer id="contact" className="bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-3">
        <div>
          <p className="font-display text-4xl italic">{business.name}</p>
          <p className="mt-3 text-cream/70">{business.tagline}</p>
          <p className="mt-6 text-cream/70">
            {business.studio}
            <br />
            {business.area}
          </p>
          <p className="mt-1 text-sm text-cream/50">The exact address is emailed to you before your appointment.</p>
        </div>
        <div>
          <p className="eyebrow !text-blush">Chat with me</p>
          <ul className="mt-5 space-y-2.5">
            {chatLinks().map((l) => (
              <li key={l.id}>
                <a href={l.href} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream">
                    <ChatIcon id={l.id} className="h-[18px] w-[18px] text-ink" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-cream/50">{l.label}</span>
                    <span className="block truncate border-b border-transparent transition group-hover:border-cream/60">
                      {l.handle}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-blush">Hours</p>
          <ul className="mt-5 space-y-1.5">
            {DAYS.map(([k, label]) => {
              const h = hours[k];
              return (
                <li key={k} className="flex justify-between gap-6 border-b border-cream/10 pb-1.5 text-cream/80">
                  <span>{label}</span>
                  <span className={h ? "" : "text-cream/40"}>{h ? `${to12(h.open)} – ${to12(h.close)}` : "Closed"}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-cream/50">By appointment only.</p>
        </div>
      </div>
      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} {business.name}
      </div>
    </footer>
  );
}
