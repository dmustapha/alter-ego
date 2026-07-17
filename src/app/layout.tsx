import type { Metadata } from "next";
import { Press_Start_2P, Space_Mono } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  subsets: ["latin"], weight: "400", variable: "--font-pixel",
});
const spaceMono = Space_Mono({
  subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Alter Ego — Every wallet has a story",
  description: "Multi-chain behavioral fingerprinting agent. TEE-ready architecture. ERC-8004 registered. Built for OKX.AI Genesis.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Alter Ego",
    description: "Meet your trading personas. Multi-chain behavioral fingerprinting for the OKX Agentic Wallet.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alter Ego",
    description: "Meet your trading personas. Multi-chain behavioral fingerprinting.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${pressStart.variable} ${spaceMono.variable}`}>
      <body className="min-h-full font-mono">{children}</body>
    </html>
  );
}
