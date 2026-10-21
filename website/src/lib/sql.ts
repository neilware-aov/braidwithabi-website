// The database connection.
//  • Live (Vercel): DATABASE_URL → Supabase Postgres (transaction pooler URL).
//  • On this computer: no DATABASE_URL → a real Postgres (PGlite) saved in
//    website/.data/, so everything works the same without any accounts.
// Tables are created automatically the first time the site runs.
import "server-only";
import { SCHEMA_SQL, seedStarterMenu, scheduleReminders } from "./schema";

type Row = Record<string, any>;
export type Query = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;

interface Driver {
  query: Query;
  exec(text: string): Promise<unknown>; // several statements, no parameters
  tx<T>(fn: (q: Query) => Promise<T>): Promise<T>;
  local: boolean;
}

/** Dates come back as ISO strings so both drivers behave the same. */
function clean<T>(rows: Row[]): T[] {
  for (const r of rows) for (const k in r) if (r[k] instanceof Date) r[k] = (r[k] as Date).toISOString();
  return rows as T[];
}

async function connect(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, {
      prepare: false, // required by Supabase's transaction pooler
      max: 3,
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
    const wrap =
      (s: typeof sql | any): Query =>
      async (text, params = []) =>
        clean(await s.unsafe(text, params as any[]));
    return {
      query: wrap(sql),
      exec: (text) => sql.unsafe(text),
      tx: (fn) => sql.begin((t) => fn(wrap(t))) as any,
      local: false,
    };
  }

  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set in Vercel → Settings → Environment Variables.");

  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  const dir = path.join(process.cwd(), ".data", "db");
  await fs.mkdir(dir, { recursive: true });
  const db = new PGlite(dir);
  const wrap =
    (d: { query: typeof db.query }): Query =>
    async (text, params = []) =>
      clean((await d.query<Row>(text, params as any[])).rows);
  return {
    query: wrap(db),
    exec: (text) => db.exec(text),
    tx: (fn) => db.transaction((t) => fn(wrap(t))),
    local: true,
  };
}

const g = globalThis as unknown as { __bwaDb?: Promise<Driver> };

function driver(): Promise<Driver> {
  g.__bwaDb ??= (async () => {
    const d = await connect();
    await d.exec(SCHEMA_SQL);
    await seedStarterMenu(d.query);
    if (!d.local) await scheduleReminders(d.query);
    return d;
  })().catch((e) => {
    g.__bwaDb = undefined; // try again on the next request
    throw e;
  });
  return g.__bwaDb;
}

export const q: Query = async (text, params) => (await driver()).query(text, params);
export const tx = async <T>(fn: (q: Query) => Promise<T>) => (await driver()).tx(fn);
