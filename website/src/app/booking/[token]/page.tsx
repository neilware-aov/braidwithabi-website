import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChatBubble from "@/components/ChatLinks";
import ManageBooking from "@/components/ManageBooking";
import Nav from "@/components/Nav";
import { getBookingByToken, getSettings } from "@/lib/db";
import { toPublicBooking, toPublicConfig } from "@/lib/publicConfig";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking — Braid with Abi", robots: { index: false } };

export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [booking, settings] = await Promise.all([getBookingByToken(token), getSettings()]);
  if (!booking) notFound();

  return (
    <>
      <Nav solid />
      <main className="mx-auto min-h-[80vh] max-w-3xl px-5 pt-28 pb-20">
        <ManageBooking token={token} initial={toPublicBooking(booking)} config={toPublicConfig(settings)} />
      </main>
      <ChatBubble />
    </>
  );
}
