import { about, aboutImage, hairPrep, policies } from "@/lib/content";
import { duration, money } from "@/lib/format";
import type { PublicConfig } from "@/lib/types";

export function About() {
  return (
    <section id="about" className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
      <div className="mx-auto w-full max-w-sm">
        <div className="overflow-hidden rounded-t-full rounded-b-3xl border-[6px] border-ivory shadow-[0_20px_60px_-20px_rgba(46,33,29,0.35)]">
          <img src={aboutImage} alt="Abi's braiding work" className="aspect-[4/5] w-full object-cover" loading="lazy" />
        </div>
      </div>
      <div>
        <p className="eyebrow">About</p>
        <h2 className="mt-3 font-display text-5xl italic">{about.title}</h2>
        {about.paragraphs.map((t) => (
          <p key={t} className="mt-5 text-[1.05rem] leading-relaxed text-muted">
            {t}
          </p>
        ))}
        <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-line pt-7">
          {about.highlights.map((h) => (
            <div key={h.label}>
              <dt className="font-display text-4xl text-rose">{h.value}</dt>
              <dd className="mt-1 text-sm text-muted">{h.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Prep({ config }: { config: PublicConfig }) {
  return (
    <section id="prep" className="bg-ivory">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Hair preparation</p>
          <h2 className="mt-3 font-display text-5xl italic">{hairPrep.title}</h2>
          <p className="mt-4 text-[1.05rem] text-muted">{hairPrep.intro}</p>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {hairPrep.steps.map((s, n) => (
            <li key={s.title} className="border-t border-line pt-5">
              <span className="font-display text-3xl text-gold">0{n + 1}</span>
              <h3 className="mt-2 text-lg font-normal">{s.title}</h3>
              <p className="mt-1.5 leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-blush p-7">
            <h3 className="font-display text-2xl italic">{hairPrep.blowDry.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/80">{hairPrep.blowDry.text}</p>
            <p className="mt-3 text-sm font-normal text-rose-dark">
              Blow-dry add-on: +{money(config.blowDryPrice)} · about {duration(config.blowDryMinutes)}
            </p>
          </div>
          <div className="rounded-3xl border border-line p-7">
            <h3 className="font-display text-2xl italic">Braiding hair</h3>
            <p className="mt-2 leading-relaxed text-muted">{hairPrep.hairNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Policies() {
  return (
    <section id="policies" className="mx-auto max-w-6xl px-5 py-20 md:py-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Good to know</p>
        <h2 className="mt-3 font-display text-5xl italic">Policies</h2>
        <p className="mt-4 text-[1.05rem] text-muted">
          A few simple rules so you get the time and care you deserve.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {policies.map((p) => (
          <article key={p.id} id={`policy-${p.id}`} className="rounded-3xl border border-line bg-ivory p-7">
            <h3 className="font-display text-2xl italic">{p.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3 leading-relaxed text-ink/80">
                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
