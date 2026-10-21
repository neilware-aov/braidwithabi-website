"use client";

import { useEffect, useState } from "react";
import { business } from "@/lib/content";

const links = [
  { href: "#about", label: "About" },
  { href: "#prep", label: "Hair prep" },
  { href: "#policies", label: "Policies" },
  { href: "#contact", label: "Contact" },
];

export default function Nav({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-cream/90 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur" : "text-white"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="/" className="font-display text-2xl italic tracking-wide">
          {business.name}
        </a>
        <div className="flex items-center gap-7">
          <ul className="hidden items-center gap-7 text-sm md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={`/${l.href}`} className="opacity-80 transition hover:opacity-100">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="/#book"
            className={`rounded-full px-5 py-2 text-sm font-normal transition ${
              scrolled ? "bg-ink text-cream hover:bg-rose-dark" : "bg-white/95 text-ink hover:bg-white"
            }`}
          >
            Book now
          </a>
        </div>
      </nav>
    </header>
  );
}
