type P = { size?: number; className?: string };

export function DiscordIcon({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

export function TelegramIcon({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 1 0 12 24a12 12 0 0 0-.056-24Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
    </svg>
  );
}

export function MeetIcon({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5h9A2.5 2.5 0 0 1 16 7.5v2.1l4.4-3.3A1 1 0 0 1 22 7.1v9.8a1 1 0 0 1-1.6.8L16 14.4v2.1a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 16.5v-9Z" />
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

export function ClockIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PhoneIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function ChatIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

export function GlobeIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

export function ChevronLeft({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ChevronRight({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={3} aria-hidden>
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function CopyIcon({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M8 8h12v12H8z" />
      <path d="M16 4H4v12" />
    </svg>
  );
}

export function PlatformIcon({ platform, size }: { platform: "discord" | "telegram" | "meet"; size?: number }) {
  if (platform === "meet") return <MeetIcon size={size} />;
  return platform === "discord" ? <DiscordIcon size={size} /> : <TelegramIcon size={size} />;
}
