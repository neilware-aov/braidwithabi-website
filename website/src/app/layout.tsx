import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { business } from "@/lib/content";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-jost" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://braidwithabi.ca"),
  title: `${business.name} — Braids in ${business.area}`,
  description: `Knotless braids, box braids, twists and more by Abi in ${business.area}. See prices and book your appointment online.`,
  openGraph: {
    title: business.name,
    description: business.tagline,
    images: ["/images/hero/hero-2.jpg"],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#faf5ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="font-sans font-light">{children}</body>
    </html>
  );
}
