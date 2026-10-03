"use client";

import { useCallback, useEffect, useState } from "react";
import Availability from "./Availability";
import Bookings from "./Bookings";
import Schedule from "./Schedule";
import { api, useToast } from "./shared";
import type { Booking, Settings } from "@/lib/types";

type Tab = "bookings" | "schedule" | "availability";

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("bookings");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { toast, show } = useToast();

  const loadBookings = useCallback(async () => {
    try {
      const d = await api<{ bookings: Booking[] }>("/api/admin/bookings");
      setBookings(d.bookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    }
  }, []);

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings")
      .then((d) => setSettings(d.settings))
      .catch((e) => setError(e.message));
    loadBookings();
    // New bookings show up without a manual refresh
    const t = setInterval(loadBookings, 60_000);
    return () => clearInterval(t);
  }, [loadBookings]);

  useEffect(() => {
    const h = location.hash.slice(1);
    if (h === "schedule" || h === "availability" || h === "bookings") setTab(h);
  }, []);

  function switchTab(t: Tab) {
    if (dirty && !window.confirm("You have unsaved availability changes. Leave without saving?")) return;
    setDirty(false);
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  }

  const saveSettings = useCallback(
    async (next: Settings, message = "Saved") => {
      const prev = settings;
      setSettings(next); // optimistic
      try {
        const d = await api<{ settings: Settings }>("/api/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ settings: next }),
        });
        setSettings(d.settings);
        show(message);
        return true;
      } catch (e) {
        setSettings(prev);
        show(e instanceof Error ? e.message : "Save failed", true);
        return false;
      }
    },
    [settings, show],
  );

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const upcoming = bookings?.filter((b) => b.status === "confirmed" && Date.parse(b.endsAt) > Date.now()).length ?? 0;

  return (
    <div className={dirty ? "has-savebar" : undefined}>
      <div className="admin-top">
        <div>
          <div className="eyebrow">Admin panel</div>
          <h1>Meetings</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-sm" href="/" target="_blank" rel="noreferrer">
            View booking page ↗
          </a>
          <button className="btn btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ["bookings", "Bookings"],
            ["schedule", "Schedule"],
            ["availability", "Availability"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}>
            {label}
            {id === "bookings" && upcoming > 0 && <span className="count">{upcoming}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {!settings || !bookings ? (
        !error && (
          <div style={{ display: "grid", gap: 8 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
          </div>
        )
      ) : tab === "bookings" ? (
        <Bookings bookings={bookings} setBookings={setBookings} settings={settings} reload={loadBookings} toast={show} />
      ) : tab === "schedule" ? (
        <Schedule settings={settings} bookings={bookings} save={saveSettings} />
      ) : (
        <Availability settings={settings} save={saveSettings} onDirty={setDirty} />
      )}

      {toast && (
        <div key={toast.id} className={`toast${toast.error ? " error" : ""}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
