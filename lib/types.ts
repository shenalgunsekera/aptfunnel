export type MeetingType = "call" | "text";
export type Platform = "discord" | "telegram";
export type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled";

/** "HH:mm" in the admin's timezone */
export type TimeRange = { start: string; end: string };

export type Settings = {
  timezone: string;
  /** Length of one meeting in minutes */
  slotMinutes: number;
  /** Gap kept free after each slot */
  bufferMinutes: number;
  /** Earliest a slot can be booked, in hours from now */
  minNoticeHours: number;
  /** How far ahead people can book, in days */
  maxDaysAhead: number;
  /** Weekly hours, keyed 0 = Sunday ... 6 = Saturday */
  weekly: Record<string, TimeRange[]>;
  /** Per-date overrides, keyed "YYYY-MM-DD". Empty array = closed all day. */
  overrides: Record<string, TimeRange[]>;
  /** Individually blocked slot starts (UTC ISO) */
  blocked: string[];
  types: Record<MeetingType, { enabled: boolean }>;
};

export type Booking = {
  id: string;
  type: MeetingType;
  name: string;
  clubgg: string;
  email: string;
  platform: Platform;
  handle: string;
  note: string | null;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  createdAt: string;
};

export type SlotStatus = "open" | "booked" | "blocked" | "past";

export type Slot = {
  start: string;
  end: string;
  status: SlotStatus;
  bookingId?: string;
};
