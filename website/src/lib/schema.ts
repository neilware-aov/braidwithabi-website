// Database tables. Created automatically (safe to run again and again).
import type { Query } from "./sql";

export const SCHEMA_SQL = `
create table if not exists settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists styles (
  id               uuid primary key default gen_random_uuid(),
  name             text    not null,
  description      text    not null default '',
  image_url        text    not null default '',
  duration_minutes int     not null default 240,
  price            int     not null default 150,
  deposit          int,
  variants         jsonb   not null default '[]'::jsonb,
  hair_included    boolean not null default false,
  is_active        boolean not null default true,
  sort_order       int     not null default 100,
  created_at       timestamptz not null default now()
);

create table if not exists style_photos (
  style_id   uuid primary key references styles(id) on delete cascade,
  mime       text not null,
  data       text not null,
  updated_at timestamptz not null default now()
);

create table if not exists time_off (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  manage_token     uuid not null unique default gen_random_uuid(),
  style_id         uuid,
  style_name       text not null,
  variant_label    text,
  blow_dry         boolean not null default false,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  price_total      int  not null,
  deposit_amount   int  not null,
  deposit_paid     boolean not null default false,
  client_name      text not null,
  client_email     text,
  client_phone     text not null,
  client_notes     text not null default '',
  owner_notes      text not null default '',
  status           text not null default 'booked' check (status in ('booked', 'done', 'cancelled')),
  source           text not null default 'website',
  reschedule_count int  not null default 0,
  remind_day_at    timestamptz,
  remind_soon_at   timestamptz,
  cancelled_by     text,
  created_at       timestamptz not null default now()
);
create index if not exists bookings_starts_at_idx on bookings (starts_at);

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  token      text not null unique,
  p256dh     text,
  auth       text,
  created_at timestamptz not null default now()
);

create table if not exists meta (
  key   text primary key,
  value text not null
);

-- Recent requests, for simple limits against spam (kept for a day).
create table if not exists hits (
  key text not null,
  at  timestamptz not null default now()
);
create index if not exists hits_key_at_idx on hits (key, at);

-- Repairs JSON saved as text by an early version (it was encoded twice).
update styles set variants = (variants #>> '{}')::jsonb where jsonb_typeof(variants) = 'string';
update settings set data = (data #>> '{}')::jsonb where jsonb_typeof(data) = 'string';
update settings set data = '{}'::jsonb where jsonb_typeof(data) <> 'object';

-- Supabase publishes every table in "public" through its Data API. Row-level
-- security with no policies shuts that door completely; the website itself
-- connects as the tables' owner, which RLS doesn't apply to.
alter table settings           enable row level security;
alter table styles             enable row level security;
alter table style_photos       enable row level security;
alter table time_off           enable row level security;
alter table bookings           enable row level security;
alter table push_subscriptions enable row level security;
alter table meta               enable row level security;
alter table hits               enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on settings, styles, style_photos, time_off, bookings, push_subscriptions, meta, hits
      from anon, authenticated;
  end if;
end $$;
`;

/** A starting menu so the site isn't empty on day one — Abi edits it in the app. */
const STARTER_MENU = [
  {
    name: "Knotless Braids",
    description: "Lightweight, natural-looking braids that start with your own hair — no tension knot at the root.",
    image: "/images/styles/knotless.jpg",
    minutes: 360,
    price: 220,
    variants: [
      { label: "Medium · Shoulder", price: 200, duration_minutes: 300 },
      { label: "Medium · Mid-back", price: 230, duration_minutes: 360 },
      { label: "Small · Mid-back", price: 280, duration_minutes: 480 },
    ],
  },
  {
    name: "Box Braids",
    description: "Classic, defined square parts. Long-lasting and versatile — wear them up, down or in a bun.",
    image: "/images/styles/box-braids.jpg",
    minutes: 300,
    price: 180,
    variants: [
      { label: "Large · Mid-back", price: 160, duration_minutes: 240 },
      { label: "Medium · Mid-back", price: 190, duration_minutes: 300 },
      { label: "Small · Waist", price: 260, duration_minutes: 450 },
    ],
  },
  {
    name: "Fulani Braids",
    description: "Cornrows at the front with braids that fall loose, finished with beads or cuffs if you like.",
    image: "/images/styles/fulani.jpg",
    minutes: 300,
    price: 190,
    variants: [],
  },
  {
    name: "Twists",
    description: "Senegalese or passion twists — soft, full and protective.",
    image: "/images/styles/twists.jpg",
    minutes: 300,
    price: 180,
    variants: [
      { label: "Senegalese twists", price: 190, duration_minutes: 300 },
      { label: "Passion twists", price: 180, duration_minutes: 270 },
    ],
  },
  {
    name: "Feed-in Ponytail",
    description: "Sleek feed-in braids swept back into a long braided ponytail.",
    image: "/images/styles/ponytail.jpg",
    minutes: 180,
    price: 120,
    variants: [],
  },
  {
    name: "Cornrows",
    description: "Straight-backs or simple designs, with or without extensions.",
    image: "/images/styles/cornrows.jpg",
    minutes: 120,
    price: 80,
    variants: [],
  },
  {
    name: "Boho Braids",
    description: "Knotless braids with soft curly pieces left loose for a romantic, boho finish.",
    image: "/images/styles/boho.jpg",
    minutes: 420,
    price: 260,
    variants: [],
  },
  {
    name: "Kids Braids",
    description: "Gentle braids with beads for little ones (12 and under).",
    image: "/images/styles/kids.jpg",
    minutes: 180,
    price: 100,
    variants: [],
  },
];

export async function seedStarterMenu(q: Query) {
  const done = await q(`select 1 from meta where key = 'menu_seeded'`);
  if (done.length) return;
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from styles`);
  if (n === 0) {
    let order = 1;
    for (const s of STARTER_MENU) {
      await q(
        `insert into styles (name, description, image_url, duration_minutes, price, variants, sort_order)
         values ($1, $2, $3, $4, $5, $6::text::jsonb, $7)`,
        [s.name, s.description, s.image, s.minutes, s.price, JSON.stringify(s.variants), order++]
      );
    }
  }
  await q(`insert into meta (key, value) values ('menu_seeded', 'yes') on conflict (key) do nothing`);
}

/**
 * Live only: ask Supabase to call /api/reminders every 15 minutes (pg_cron +
 * pg_net, both free). That sends the "tomorrow" and "in 2 hours" reminders.
 */
export async function scheduleReminders(q: Query) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!site.startsWith("https://")) return;
  const url = `${site.replace(/\/$/, "")}/api/reminders`;
  try {
    const [saved] = await q<{ value: string }>(`select value from meta where key = 'reminders_url'`);
    if (saved?.value === url) return;
    await q(`create extension if not exists pg_cron with schema pg_catalog`);
    await q(`create extension if not exists pg_net with schema extensions`);
    await q(`select cron.schedule('braidwithabi-reminders', '*/15 * * * *', $1)`, [
      `select net.http_get(url := '${url.replace(/'/g, "''")}')`,
    ]);
    await q(
      `insert into meta (key, value) values ('reminders_url', $1) on conflict (key) do update set value = excluded.value`,
      [url]
    );
    console.log("[reminders] scheduled every 15 minutes →", url);
  } catch (e) {
    console.warn("[reminders] could not schedule automatically (see README → Reminders):", e);
  }
}
