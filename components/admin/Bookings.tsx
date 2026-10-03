"use client";

import { useMemo, useState } from "react";
import { CopyIcon, PlatformIcon } from "../icons";
import { api, fmtInZone, relative } from "./shared";
import type { Booking, BookingStatus, Settings } from "@/lib/types";

type Filter = "upcoming" | "past" | "cancelled" | "all";

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

type Props = {
  bookings: Booking[];
  setBookings: (b: Booking[]) => void;
  settings: Settings;
  reload: () => Promise<void>;
  toast: (msg: string, error?: boolean) => void;
};

export default function Bookings({ bookings, setBookings, settings, reload, toast }: Props) {
  const tz = settings.timezone;
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [type, setType] = useState<"all" | "call" | "text">("all");
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const now = Date.now();
  const dayKey = (iso: string) => fmtInZone(iso, tz, { year: "numeric", month: "2-digit", day: "2-digit" });
  const todayK = dayKey(new Date(now).toISOString());

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status === "confirmed" && Date.parse(b.endsAt) > now);
    return {
      today: active.filter((b) => dayKey(b.startsAt) === todayK).length,
      week: active.filter((b) => Date.parse(b.startsAt) < now + 7 * 86_400_000).length,
      upcoming: active.length,
      recent: bookings.filter((b) => Date.parse(b.createdAt) > now - 30 * 86_400_000).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, tz]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    let out = bookings.filter((b) => {
      const upcoming = Date.parse(b.endsAt) > now;
      if (filter === "upcoming" && !(upcoming && b.status !== "cancelled")) return false;
      if (filter === "past" && !(!upcoming && b.status !== "cancelled")) return false;
      if (filter === "cancelled" && b.status !== "cancelled") return false;
      if (type !== "all" && b.type !== type) return false;
      if (needle && ![b.name, b.clubgg, b.email, b.handle].some((v) => v.toLowerCase().includes(needle))) return false;
      return true;
    });
    // Upcoming reads soonest first; everything else newest first
    out = out.sort((a, b) =>
      filter === "upcoming" ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt),
    );
    const groups: { key: string; label: string; items: Booking[] }[] = [];
    for (const b of out) {
      const key = dayKey(b.startsAt);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        const label =
          key === todayK
            ? "Today"
            : fmtInZone(b.startsAt, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        g = { key, label, items: [] };
        groups.push(g);
      }
      g.items.push(b);
    }
    return { groups, count: out.length, flat: out };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, filter, type, q, tz]);

  async function setStatus(b: Booking, status: BookingStatus) {
    try {
      const d = await api<{ booking: Booking }>(`/api/admin/bookings/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings(bookings.map((x) => (x.id === b.id ? d.booking : x)));
      toast(status === "cancelled" ? "Cancelled. The slot is open again." : `Marked ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed", true);
    }
  }

  async function remove(b: Booking) {
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
      setBookings(bookings.filter((x) => x.id !== b.id));
      setConfirmDelete(null);
      toast("Booking deleted");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", true);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${text}`);
    } catch {
      toast("Could not copy", true);
    }
  }

  function exportCsv() {
    const cols = ["start", "end", "timezone", "type", "status", "name", "clubgg", "email", "platform", "handle", "note", "booked_at"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const fmt = (iso: string) => fmtInZone(iso, tz, { dateStyle: "short", timeStyle: "short" });
    const rows = list.flat.map((b) =>
      [fmt(b.startsAt), fmt(b.endsAt), tz, b.type, b.status, b.name, b.clubgg, b.email, b.platform, b.handle, b.note ?? "", b.createdAt]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bookings-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="step">
      <div className="stats">
        <Stat label="Today" value={stats.today} />
        <Stat label="Next 7 days" value={stats.week} />
        <Stat label="Upcoming" value={stats.upcoming} />
        <Stat label="Booked last 30d" value={stats.recent} />
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter">
          {(["upcoming", "past", "cancelled", "all"] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Meeting type">
          <option value="all">All types</option>
          <option value="call">Voice calls</option>
          <option value="text">Text chats</option>
        </select>
        <input
          className="input grow"
          type="search"
          placeholder="Search name, ClubGG, email, handle…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn btn-sm"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await reload();
            setRefreshing(false);
          }}
        >
          {refreshing ? <span className="spinner" /> : "Refresh"}
        </button>
        <button className="btn btn-sm" onClick={exportCsv} disabled={!list.count}>
          Export CSV
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
        {list.count} {list.count === 1 ? "booking" : "bookings"} · times in {tz.replace(/_/g, " ")}
      </p>

      {list.count === 0 ? (
        <div className="empty">
          {filter === "upcoming" ? "No upcoming meetings yet. Share your booking link to get started." : "Nothing here."}
        </div>
      ) : (
        list.groups.map((g) => (
          <div className="day-group" key={g.key}>
            <div className="day-label">{g.label}</div>
            {g.items.map((b) => {
              const upcoming = Date.parse(b.endsAt) > now;
              return (
                <div key={b.id} className={`bk${b.status === "cancelled" ? " cancelled" : ""}`}>
                  <div className="bk-time">
                    <b className="mono">{fmtInZone(b.startsAt, tz, { hour: "2-digit", minute: "2-digit" })}</b>
                    <span>{upcoming && b.status === "confirmed" ? relative(b.startsAt, now) : `→ ${fmtInZone(b.endsAt, tz, { hour: "2-digit", minute: "2-digit" })}`}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="bk-name" title={b.name}>
                      {b.name}
                    </div>
                    <div className="bk-sub">
                      ClubGG: <span className="mono" style={{ color: "var(--text)" }}>{b.clubgg}</span>
                    </div>
                  </div>
                  <div className="bk-contact-col" style={{ minWidth: 0, display: "grid", gap: 4 }}>
                    <div className="bk-contact" style={{ color: `var(--${b.platform})` }}>
                      <PlatformIcon platform={b.platform} size={16} />
                      {b.platform === "telegram" ? (
                        <a href={`https://t.me/${b.handle}`} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
                          @{b.handle}
                        </a>
                      ) : (
                        <span className="h" style={{ color: "var(--text)" }}>
                          @{b.handle}
                        </span>
                      )}
                      <button className="copy-btn" onClick={() => copy(b.handle)} aria-label={`Copy ${b.handle}`}>
                        <CopyIcon />
                      </button>
                    </div>
                    <div className="bk-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <a href={`mailto:${b.email}`} style={{ textDecoration: "none" }}>
                        {b.email}
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className={`tag ${b.type}`}>{b.type === "call" ? "Voice call" : "Text chat"}</span>
                  </div>
                  <div className="bk-actions">
                    <select
                      className="select"
                      value={b.status}
                      aria-label="Status"
                      onChange={(e) => setStatus(b, e.target.value as BookingStatus)}
                    >
                      {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    {confirmDelete === b.id ? (
                      <>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(b)}>
                          Delete
                        </button>
                        <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        className="icon-btn"
                        style={{ width: 34, height: 34 }}
                        aria-label="Delete booking"
                        title="Delete"
                        onClick={() => setConfirmDelete(b.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {b.note && <div className="bk-note">{b.note}</div>}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <b className="mono">{value}</b>
    </div>
  );
}
