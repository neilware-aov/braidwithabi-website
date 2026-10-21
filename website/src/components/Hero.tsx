"use client";

import { useEffect, useState } from "react";
import { business, heroImages } from "@/lib/content";

export default function Hero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % heroImages.length), 5500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative h-[92svh] min-h-[560px] overflow-hidden bg-ink">
      {heroImages.map((src, n) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
          style={{ opacity: n === i ? 1 : 0 }}
          aria-hidden={n !== i}
        >
          {/* key change restarts the slow zoom each time a photo comes back */}
          <img
            key={n === i ? `on-${i}` : "off"}
            src={src}
            alt=""
            className={`h-full w-full object-cover object-[50%_25%] ${n === i ? "kenburns" : ""}`}
            fetchPriority={n === 0 ? "high" : "low"}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/40" />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-16 md:pb-24">
        <p className="eyebrow rise !text-blush" style={{ animationDelay: "0.1s" }}>
          {business.area} · {business.studio}
        </p>
        <h1
          className="rise mt-3 font-display text-6xl leading-[0.95] font-normal text-white italic md:text-8xl"
          style={{ animationDelay: "0.2s" }}
        >
          {business.name}
        </h1>
        <p className="rise mt-5 max-w-md text-lg text-white/85" style={{ animationDelay: "0.35s" }}>
          {business.tagline}
        </p>
        <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.5s" }}>
          <a href="#book" className="rounded-full bg-white px-7 py-3.5 text-ink transition hover:bg-blush">
            Book an appointment
          </a>
          <a
            href="#policies"
            className="rounded-full border border-white/50 px-7 py-3.5 text-white transition hover:bg-white/10"
          >
            Read policies
          </a>
        </div>

        <div className="mt-10 flex gap-2" role="tablist" aria-label="Photos">
          {heroImages.map((src, n) => (
            <button
              key={src}
              onClick={() => setI(n)}
              aria-label={`Photo ${n + 1}`}
              className={`h-1 rounded-full transition-all duration-500 ${n === i ? "w-10 bg-white" : "w-4 bg-white/40"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
