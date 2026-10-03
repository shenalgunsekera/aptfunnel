"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "./Calendar";
import {
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  DiscordIcon,
  GlobeIcon,
  PhoneIcon,
  TelegramIcon,
} from "./icons";
import {
  allTimezones,
  dateKey,
  formatDay,
  formatTime,
  todayKey,
  tzLabel,
} from "@/lib/time";
import { EMAIL, cleanHandle, handleError } from "@/lib/validate";
import type { MeetingType, Platform } from "@/lib/types";

const COPY: Record<MeetingType, { title: string; lead: string; how: string; Icon: typeof PhoneIcon }> = {
  call: {
    title: "Book a voice call",
    lead: "A 1-on-1 voice call with an agent. We'll get you set up on ClubGG and answer anything you want to know.",
    how: "Voice call on Discord or Telegram",
    Icon: PhoneIcon,
  },
  text: {
    title: "Book a text chat",
    lead: "Prefer typing? Pick a time and an agent will message you directly for a live 1-on-1 chat.",
    how: "Live chat on Discord or Telegram",
    Icon: ChatIcon,
  },
};

type Step = "time" | "details" | "done";
type Avail = { enabled: boolean; slotMinutes: number; timezone: string; slots: string[] };
type Form = { name: string; clubgg: string; email: string; platform: Platform | null; handle: string; note: string };

const EMPTY_FORM: Form = { name: "", clubgg: "", email: "", platform: null, handle: "", note: "" };
const PREFS_KEY = "tpa:prefs:v2";

function readPrefs(): { hour12?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePrefs(p: { hour12: boolean }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
}

export default function BookingFlow({ type }: { type: MeetingType }) {
  const copy = COPY[type];

  // Empty until availability loads; then the business timezone unless the player picks another
  const [tz, setTz] = useState("");
  const ready = tz !== "";
  const [hour12, setHour12] = useState(true);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("time");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ startsAt: string; endsAt: string } | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const prefsLoaded = useRef(false);
  useEffect(() => {
    const p = readPrefs();
    if (typeof p.hour12 === "boolean") setHour12(p.hour12);
    prefsLoaded.current = true;
  }, []);

  useEffect(() => {
    if (prefsLoaded.current) writePrefs({ hour12 });
  }, [hour12]);

  const load = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch(`/api/availability?type=${type}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load times");
        setAvail(data);
        setTz((cur) => cur || data.timezone || "UTC");
        setLoadError(null);
      } catch (e) {
        if (!silent) setLoadError(e instanceof Error ? e.message : "Could not load times");
      }
    },
    [type],
  );

  // Initial load, then keep availability fresh so taken slots disappear on their own
  useEffect(() => {
    load();
    const t = setInterval(() => stepRef.current !== "done" && load(true), 30_000);
    const onFocus = () => document.visibilityState === "visible" && stepRef.current !== "done" && load(true);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of avail?.slots ?? []) {
      const k = dateKey(s, tz);
      const list = map.get(k);
      if (list) list.push(s);
      else map.set(k, [s]);
    }
    return map;
  }, [avail, tz]);

  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const today = ready ? todayKey(tz) : "";
  const minMonth = (today || days[0] || "").slice(0, 7);
  const maxMonth = (days[days.length - 1] || today).slice(0, 7);

  // Pick a sensible day whenever availability or timezone changes
  useEffect(() => {
    if (!ready || !avail) return;
    if (day && byDay.has(day)) return;
    const first = days[0] ?? null;
    setDay(first);
    setMonth((first ?? todayKey(tz)).slice(0, 7));
  }, [ready, avail, byDay, days, day, tz]);

  // If the chosen slot gets taken by someone else, tell the person right away
  useEffect(() => {
    if (!slot || !avail || step === "done") return;
    if (!avail.slots.includes(slot)) {
      setSlot(null);
      setStep("time");
      setNotice("Sorry, the time you picked was just booked by someone else. Please choose another.");
    }
  }, [avail, slot, step]);

  const daySlots = (day && byDay.get(day)) || [];
  const fmt = (iso: string) => formatTime(iso, tz, hour12);
  const slotEnd = (iso: string) => new Date(Date.parse(iso) + (avail?.slotMinutes ?? 30) * 60_000).toISOString();

  function go(next: Step) {
    setStep(next);
    requestAnimationFrame(() => {
      const top = mainRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0 || top > window.innerHeight * 0.6) {
        mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      mainRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    });
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your name";
    if (!form.clubgg.trim()) e.clubgg = "Enter your ClubGG account name";
    if (!EMAIL.test(form.email.trim())) e.email = "Enter a valid email";
    if (!form.platform) e.platform = "Choose Discord or Telegram";
    else {
      const he = handleError(cleanHandle(form.handle, form.platform), form.platform);
      if (he) e.handle = he;
    }
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      mainRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
    return !Object.keys(e).length;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !slot || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    const honeypot = (new FormData(e.currentTarget).get("website") as string) || "";
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, type, start: slot, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBooked(data.booking);
        go("done");
        return;
      }
      if (data.code === "SLOT_TAKEN") {
        setSlot(null);
        setNotice(data.error);
        await load(true);
        go("time");
        return;
      }
      if (data.fields) setErrors(data.fields);
      setSubmitError(data.error || "Something went wrong. Please try again.");
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setForm(EMPTY_FORM);
    setSlot(null);
    setBooked(null);
    setNotice(null);
    load();
    go("time");
  }

  const handleLabel = form.platform === "telegram" ? "Telegram username" : "Discord username";
  const handlePlaceholder = form.platform === "telegram" ? "yourname" : "yourname";
  const handleHint =
    form.platform === "telegram"
      ? "Find it in Telegram → Settings → Username"
      : form.platform === "discord"
        ? "Your unique username, not your display name"
        : "Pick a platform first";

  return (
    <div className="booking">
      <aside className="booking-aside">
        <div>
          <div className="eyebrow">ThatPokerAgent</div>
          <h1>{copy.title}</h1>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {copy.lead}
        </p>
        <div className="meta">
          <div className="meta-row">
            <ClockIcon />
            {avail ? `${avail.slotMinutes} minutes` : "—"}
          </div>
          <div className="meta-row">
            <copy.Icon />
            {copy.how}
          </div>
          {ready && (
            <div className="meta-row">
              <GlobeIcon />
              {tzLabel(tz)}
            </div>
          )}
        </div>
        {slot && step !== "done" && (
          <div className="picked" key={slot}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Selected
            </div>
            <strong>{formatDay(dateKey(slot, tz))}</strong>
            <span className="muted mono">
              {fmt(slot)} – {fmt(slotEnd(slot))}
            </span>
          </div>
        )}
      </aside>

      <div className="booking-main" ref={mainRef} style={{ scrollMarginTop: 80 }}>
        {step === "time" && (
          <section className="step" aria-labelledby="time-title">
            <div className="step-title">
              <h2 id="time-title">Pick a date & time</h2>
              <span className="eyebrow">Step 1 of 2</span>
            </div>

            {notice && (
              <div className="alert" role="alert">
                {notice}
              </div>
            )}

            {loadError ? (
              <div className="empty">
                {loadError}
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-sm" onClick={() => load()}>
                    Try again
                  </button>
                </div>
              </div>
            ) : !ready || !avail || !month ? (
              <PickerSkeleton />
            ) : !avail.enabled ? (
              <div className="empty">
                {type === "call" ? "Voice calls" : "Text chats"} are not open for booking right now. Please check back soon.
              </div>
            ) : (
              <div className="picker">
                <div>
                  <Calendar
                    month={month}
                    onMonthChange={setMonth}
                    minMonth={minMonth}
                    maxMonth={maxMonth < minMonth ? minMonth : maxMonth}
                    selected={day}
                    today={today}
                    onSelect={(k) => {
                      setDay(k);
                      setSlot(null);
                      setNotice(null);
                      // On phones the times sit below the calendar, so bring them into view
                      if (window.matchMedia("(max-width: 640px)").matches) {
                        requestAnimationFrame(() =>
                          mainRef.current
                            ?.querySelector(".times")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        );
                      }
                    }}
                    dayInfo={(k) => {
                      const n = byDay.get(k)?.length ?? 0;
                      return { enabled: n > 0, label: n ? `${n} times available` : "no times available" };
                    }}
                  />
                  <div className="tz">
                    <GlobeIcon size={14} />
                    <label className="sr-only" htmlFor="tz">
                      Your timezone
                    </label>
                    <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
                      {allTimezones(tz).map((z) => (
                        <option key={z} value={z}>
                          {z.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <div className="seg-mini" role="group" aria-label="Clock format">
                      <button type="button" aria-pressed={hour12} onClick={() => setHour12(true)}>
                        12h
                      </button>
                      <button type="button" aria-pressed={!hour12} onClick={() => setHour12(false)}>
                        24h
                      </button>
                    </div>
                  </div>
                </div>

                <div className="times">
                  <div className="times-head">{day ? formatDay(day, { weekday: "long", day: "numeric", month: "short" }) : ""}</div>
                  {days.length === 0 ? (
                    <div className="empty">No open times right now. New times are added regularly, check back soon.</div>
                  ) : daySlots.length === 0 ? (
                    <div className="empty">No times on this day. Pick a highlighted date.</div>
                  ) : (
                    <div className="times-list" key={`${day}-${tz}`} role="list">
                      {daySlots.map((s, i) => {
                        const active = s === slot;
                        return (
                          <div key={s} className={`slot-row${active ? " active" : ""}`} style={{ ["--i" as any]: i }} role="listitem">
                            <button
                              type="button"
                              className="slot mono"
                              aria-pressed={active}
                              onClick={() => {
                                setSlot(active ? null : s);
                                setNotice(null);
                              }}
                            >
                              {fmt(s)}
                            </button>
                            <button
                              type="button"
                              className="slot-next"
                              tabIndex={active ? 0 : -1}
                              aria-hidden={!active}
                              onClick={() => go("details")}
                            >
                              Next →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {step === "details" && slot && (
          <section className="step" aria-labelledby="details-title">
            <div className="step-title">
              <h2 id="details-title">Your details</h2>
              <span className="eyebrow">Step 2 of 2</span>
            </div>

            {submitError && (
              <div className="alert" role="alert">
                {submitError}
              </div>
            )}

            <form className="form" onSubmit={submit} noValidate>
              <div className="field-row">
                <Field label="Full name" error={errors.name}>
                  <input
                    data-autofocus
                    className="input"
                    name="name"
                    autoComplete="name"
                    placeholder="John Smith"
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
                <Field label="ClubGG account name" error={errors.clubgg}>
                  <input
                    className="input"
                    name="clubgg"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Your ClubGG nickname"
                    value={form.clubgg}
                    maxLength={40}
                    onChange={(e) => set("clubgg", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Email" error={errors.email}>
                <input
                  className="input"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={form.email}
                  maxLength={120}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>

              <div className={`field${errors.platform ? " invalid" : ""}`}>
                <span className="label" id="platform-label">
                  Where should we meet?
                </span>
                <div className="platforms" role="radiogroup" aria-labelledby="platform-label">
                  {(["discord", "telegram"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      name={p === "discord" ? "platform" : undefined}
                      aria-checked={form.platform === p}
                      className="platform"
                      style={{ ["--brand" as any]: `var(--${p})` }}
                      onClick={() => {
                        set("platform", p);
                        requestAnimationFrame(() =>
                          mainRef.current?.querySelector<HTMLInputElement>('[name="handle"]')?.focus(),
                        );
                      }}
                    >
                      {p === "discord" ? <DiscordIcon size={22} /> : <TelegramIcon size={22} />}
                      {p === "discord" ? "Discord" : "Telegram"}
                    </button>
                  ))}
                </div>
                {errors.platform && <span className="error-text">{errors.platform}</span>}
              </div>

              <Field label={handleLabel} error={errors.handle} hint={errors.handle ? undefined : handleHint}>
                <div className="handle">
                  <span className="handle-prefix" aria-hidden>
                    {form.platform === "telegram" ? (
                      <TelegramIcon size={16} />
                    ) : form.platform === "discord" ? (
                      <DiscordIcon size={16} />
                    ) : null}
                    @
                  </span>
                  <input
                    className="input"
                    name="handle"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={handlePlaceholder}
                    disabled={!form.platform}
                    value={form.handle}
                    maxLength={40}
                    onChange={(e) => set("handle", e.target.value.replace(/^@+/, ""))}
                  />
                </div>
              </Field>

              <Field label="Anything we should know?" optional>
                <textarea
                  className="textarea"
                  name="note"
                  placeholder="Questions, what you play, how you found us…"
                  value={form.note}
                  maxLength={500}
                  onChange={(e) => set("note", e.target.value)}
                />
              </Field>

              {/* Honeypot for bots. Hidden from people and screen readers. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
              />

              <div className="actions">
                <button type="button" className="btn" onClick={() => go("time")} disabled={submitting}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? (
                    <>
                      <span className="spinner" /> Booking…
                    </>
                  ) : (
                    `Confirm ${fmt(slot)} · ${formatDay(dateKey(slot, tz), { weekday: "short", day: "numeric", month: "short" })}`
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {step === "done" && booked && (
          <section className="step done" aria-live="polite">
            <div className="done-mark">
              <CheckIcon size={26} />
            </div>
            <h2>You&apos;re booked in.</h2>
            <p className="muted" style={{ margin: 0 }}>
              An agent will reach out to{" "}
              <strong style={{ color: "var(--text)" }}>@{cleanHandle(form.handle, form.platform!)}</strong> on{" "}
              {form.platform === "discord" ? "Discord" : "Telegram"} at the time below.
              {form.platform === "discord" && " Make sure your Discord accepts friend requests and DMs."}
            </p>
            <dl className="summary">
              <div className="summary-row">
                <dt>When</dt>
                <dd>
                  {formatDay(dateKey(booked.startsAt, tz))}
                  <br />
                  <span className="mono">
                    {fmt(booked.startsAt)} – {fmt(booked.endsAt)}
                  </span>{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    {tzLabel(tz)}
                  </span>
                </dd>
              </div>
              <div className="summary-row">
                <dt>Meeting</dt>
                <dd>{type === "call" ? "Voice call" : "Text chat"}</dd>
              </div>
              <div className="summary-row">
                <dt>{form.platform === "discord" ? "Discord" : "Telegram"}</dt>
                <dd>@{cleanHandle(form.handle, form.platform!)}</dd>
              </div>
              <div className="summary-row">
                <dt>ClubGG</dt>
                <dd>{form.clubgg}</dd>
              </div>
              <div className="summary-row">
                <dt>Email</dt>
                <dd>{form.email}</dd>
              </div>
            </dl>
            <div className="actions">
              <a className="btn btn-primary" href={googleCalUrl(type, booked)} target="_blank" rel="noopener noreferrer">
                <CalendarIcon size={16} /> Add to Google Calendar
              </a>
              <button className="btn" onClick={restart}>
                Book another
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`field${error ? " invalid" : ""}`}>
      <span className="label">
        {label} {optional && <span className="opt">(optional)</span>}
      </span>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

function PickerSkeleton() {
  return (
    <div className="picker" aria-busy="true" aria-label="Loading available times">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, alignContent: "start", paddingTop: 50 }}>
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: "auto", aspectRatio: "1" }} />
        ))}
      </div>
      <div style={{ display: "grid", gap: 8, alignContent: "start", paddingTop: 50 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    </div>
  );
}

function googleCalUrl(type: MeetingType, b: { startsAt: string; endsAt: string }) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `ThatPokerAgent ${type === "call" ? "voice call" : "text chat"}`,
    dates: `${f(b.startsAt)}/${f(b.endsAt)}`,
    details: "Your 1-on-1 meeting with ThatPokerAgent.",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
