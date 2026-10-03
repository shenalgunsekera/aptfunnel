import type { MeetingType, Platform } from "./types";

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Discord: 2-32 chars, lowercase letters, digits, _ and . (no "..")
export const DISCORD = /^(?!.*\.\.)[a-z0-9_.]{2,32}$/;
// Telegram: 5-32 chars, letters, digits, _ ; must start with a letter
export const TELEGRAM = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function cleanHandle(raw: string, platform: Platform) {
  const h = raw.trim().replace(/^@+/, "");
  return platform === "discord" ? h.toLowerCase() : h;
}

export function handleError(handle: string, platform: Platform): string | null {
  if (!handle) return platform === "discord" ? "Enter your Discord username" : "Enter your Telegram username";
  if (platform === "discord" && !DISCORD.test(handle))
    return "2–32 characters: lowercase letters, numbers, _ and .";
  if (platform === "telegram" && !TELEGRAM.test(handle))
    return "5–32 characters: letters, numbers and _, starting with a letter";
  return null;
}

export type BookingInput = {
  type: MeetingType;
  name: string;
  clubgg: string;
  email: string;
  platform: Platform;
  handle: string;
  note: string;
  start: string;
};

export function validateBooking(body: any): { data?: BookingInput; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const type = body?.type === "text" ? "text" : body?.type === "call" ? "call" : null;
  const platform = body?.platform === "telegram" ? "telegram" : body?.platform === "discord" ? "discord" : null;
  const name = str(body?.name, 80);
  const clubgg = str(body?.clubgg, 40);
  const email = str(body?.email, 120).toLowerCase();
  const note = str(body?.note, 500);
  const start = str(body?.start, 40);

  if (!type) errors.type = "Invalid meeting type";
  if (name.length < 2) errors.name = "Enter your name";
  if (!clubgg) errors.clubgg = "Enter your ClubGG account name";
  if (!EMAIL.test(email)) errors.email = "Enter a valid email";
  if (!platform) errors.platform = "Choose Discord or Telegram";
  const handle = platform ? cleanHandle(str(body?.handle, 40), platform) : "";
  if (platform) {
    const e = handleError(handle, platform);
    if (e) errors.handle = e;
  }
  if (!start || isNaN(Date.parse(start))) errors.start = "Pick a time";

  if (Object.keys(errors).length) return { errors };
  return {
    data: { type: type!, name, clubgg, email, platform: platform!, handle, note, start: new Date(start).toISOString() },
  };
}
