import "server-only";
import type { Booking } from "./types";

/** Posts new bookings to a Discord channel when DISCORD_WEBHOOK_URL is set. Never throws. */
export async function notifyNewBooking(b: Booking, timezone: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(b.startsAt));
  const handle = b.platform === "telegram" ? `[@${b.handle}](https://t.me/${b.handle})` : `@${b.handle}`;
  const lines = [
    `**New ${b.type} meeting** · ${when} (${timezone})`,
    `**${b.name}** · ClubGG: \`${b.clubgg}\``,
    `${b.platform === "discord" ? "Discord" : "Telegram"}: ${handle} · ${b.email}`,
    b.note ? `> ${b.note.replace(/\n/g, " ")}` : "",
  ].filter(Boolean);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: lines.join("\n"), allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // A failed notification must never fail the booking
  }
}
