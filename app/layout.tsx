import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Book a meeting · ThatPokerAgent", template: "%s · ThatPokerAgent" },
  description: "Book a 1-on-1 voice call or text chat with ThatPokerAgent on Discord or Telegram.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Header />
        {children}
        <footer className="site-footer">© {new Date().getFullYear()} THATPOKERAGENT</footer>
      </body>
    </html>
  );
}
