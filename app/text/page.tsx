import type { Metadata } from "next";
import BookingFlow from "@/components/BookingFlow";

export const metadata: Metadata = { title: "Book a text chat" };

export default function TextPage() {
  return (
    <main className="page">
      <BookingFlow type="text" />
    </main>
  );
}
