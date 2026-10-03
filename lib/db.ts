import "server-only";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { Booking, BookingStatus, Settings } from "./types";

type Query = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

const SCHEMA = [
  `create table if not exists settings (
     id int primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   )`,
  `create table if not exists bookings (
     id uuid primary key default gen_random_uuid(),
     type text not null,
     name text not null,
     clubgg text not null,
     email text not null,
     platform text not null,
     handle text not null,
     note text,
     starts_at timestamptz not null,
     ends_at timestamptz not null,
     status text not null default 'confirmed',
     created_at timestamptz not null default now()
   )`,
  // The database itself refuses two active bookings on the same start time,
  // so two people racing for one slot can never both win.
  `create unique index if not exists bookings_active_start on bookings (starts_at) where status <> 'cancelled'`,
  `create index if not exists bookings_starts_at on bookings (starts_at)`,
];

const g = globalThis as unknown as { __db?: Promise<Query> };

async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let query: Query;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    query = (text, params = []) => sql.query(text, params) as Promise<Record<string, any>[]>;
  } else {
    if (process.env.VERCEL) {
      throw new Error("DATABASE_URL is not set. Add a Neon Postgres database in the Vercel Storage tab.");
    }
    // Local development: an embedded Postgres saved to ./.data
    const { mkdirSync } = await import("fs");
    mkdirSync("./.data", { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite("./.data/pglite");
    query = async (text, params = []) => (await db.query<Record<string, any>>(text, params)).rows;
  }

  for (const stmt of SCHEMA) await query(stmt);
  return query;
}

function db(): Promise<Query> {
  if (!g.__db) {
    g.__db = connect().catch((err) => {
      g.__db = undefined;
      throw err;
    });
  }
  return g.__db;
}

const iso = (v: unknown) => new Date(v as string).toISOString();

function toBooking(r: Record<string, any>): Booking {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    clubgg: r.clubgg,
    email: r.email,
    platform: r.platform,
    handle: r.handle,
    note: r.note ?? null,
    startsAt: iso(r.starts_at),
    endsAt: iso(r.ends_at),
    status: r.status,
    createdAt: iso(r.created_at),
  };
}

export async function getSettings(): Promise<Settings> {
  const q = await db();
  const rows = await q(`select data from settings where id = 1`);
  if (!rows.length) return DEFAULT_SETTINGS;
  const data = typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
  return normalizeSettings(data);
}

export async function saveSettings(s: Settings): Promise<Settings> {
  const q = await db();
  await q(
    `insert into settings (id, data, updated_at) values (1, $1::jsonb, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [JSON.stringify(s)],
  );
  return s;
}

/** Active (non-cancelled) bookings that overlap [from, to). */
export async function activeBookingsBetween(from: string, to: string): Promise<Booking[]> {
  const q = await db();
  const rows = await q(
    `select * from bookings where status <> 'cancelled' and starts_at < $2 and ends_at > $1 order by starts_at`,
    [from, to],
  );
  return rows.map(toBooking);
}

export async function listBookings(): Promise<Booking[]> {
  const q = await db();
  const rows = await q(`select * from bookings order by starts_at desc limit 2000`);
  return rows.map(toBooking);
}

export async function hasUpcomingBooking(email: string, type: string): Promise<boolean> {
  const q = await db();
  const rows = await q(
    `select 1 from bookings where lower(email) = lower($1) and type = $2 and status = 'confirmed' and starts_at > now() limit 1`,
    [email, type],
  );
  return rows.length > 0;
}

export type NewBooking = Omit<Booking, "id" | "status" | "createdAt">;

/**
 * Inserts the booking only if nothing active overlaps it.
 * Returns null when the slot was taken in the meantime.
 */
export async function createBooking(b: NewBooking): Promise<Booking | null> {
  const q = await db();
  try {
    const rows = await q(
      `insert into bookings (type, name, clubgg, email, platform, handle, note, starts_at, ends_at)
       select $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz
       where not exists (
         select 1 from bookings
         where status <> 'cancelled' and starts_at < $9::timestamptz and ends_at > $8::timestamptz
       )
       returning *`,
      [b.type, b.name, b.clubgg, b.email, b.platform, b.handle, b.note, b.startsAt, b.endsAt],
    );
    return rows.length ? toBooking(rows[0]) : null;
  } catch (err: any) {
    if (err?.code === "23505") return null; // unique violation: someone else got it first
    throw err;
  }
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<Booking | null> {
  const q = await db();
  try {
    const rows = await q(`update bookings set status = $2 where id = $1 returning *`, [id, status]);
    return rows.length ? toBooking(rows[0]) : null;
  } catch (err: any) {
    // Re-activating a cancelled booking whose slot has since been taken
    if (err?.code === "23505") throw new Error("SLOT_TAKEN");
    throw err;
  }
}

export async function deleteBooking(id: string): Promise<boolean> {
  const q = await db();
  const rows = await q(`delete from bookings where id = $1 returning id`, [id]);
  return rows.length > 0;
}
