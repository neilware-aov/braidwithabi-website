"use client";

import { useEffect, useRef, useState } from "react";
import { siInstagram, siMessenger, siSnapchat, siTiktok, siWhatsapp } from "simple-icons";
import { chatLinks, type ChatLink } from "@/lib/content";

const BRAND: Record<string, { path: string; color: string }> = {
  whatsapp: { path: siWhatsapp.path, color: "#25D366" },
  instagram: { path: siInstagram.path, color: "#E1306C" },
  tiktok: { path: siTiktok.path, color: "#111111" },
  messenger: { path: siMessenger.path, color: "#0866FF" },
  snapchat: { path: siSnapchat.path, color: "#E6C200" },
};

export function ChatIcon({ id, className = "h-5 w-5" }: { id: string; className?: string }) {
  const brand = BRAND[id];
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill={brand.color} aria-hidden>
        <path d={brand.path} />
      </svg>
    );
  }
  // Text / email
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      {id === "email" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : (
        <path d="M4 5h16v11H8l-4 4V5z" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** Row of chat buttons, shown after booking. */
export function ChatButtons({ dark = false, links = chatLinks() }: { dark?: boolean; links?: ChatLink[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {links.map((l) => (
        <a
          key={l.id}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
            dark ? "bg-cream/10 text-cream hover:bg-cream/20" : "border border-line bg-cream text-ink hover:border-rose"
          }`}
        >
          <ChatIcon id={l.id} className="h-[18px] w-[18px]" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

/** Floating "Chat with me" button, bottom-right on every page. */
export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const links = chatLinks();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!links.length) return null;

  return (
    <div ref={ref} className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div className="rise w-64 overflow-hidden rounded-3xl border border-line bg-ivory shadow-[0_20px_50px_-20px_rgba(46,33,29,0.45)]">
          <p className="px-5 pt-4 pb-2 font-display text-2xl italic">Chat with Abi</p>
          <ul className="pb-2">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-blush/60"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-cream">
                    <ChatIcon id={l.id} />
                  </span>
                  <span className="min-w-0">
                    <span className="block leading-tight">{l.label}</span>
                    <span className="block truncate text-xs text-muted">{l.handle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-ink py-3 pr-5 pl-4 text-cream shadow-[0_12px_30px_-10px_rgba(46,33,29,0.6)] transition hover:bg-rose-dark"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <ChatIcon id="sms" />
        )}
        <span className="text-sm">{open ? "Close" : "Chat with me"}</span>
      </button>
    </div>
  );
}
