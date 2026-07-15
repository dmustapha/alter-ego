import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alter Ego — Every wallet has a story",
  description:
    "Multi-chain behavioral fingerprinting agent. See your trading personas across Ethereum and Solana. Built for OKX.AI Genesis Hackathon.",
  openGraph: {
    title: "Alter Ego",
    description: "Meet your trading personas. Multi-chain behavioral fingerprinting for the OKX Agentic Wallet.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-emerald-400 font-mono">
        {children}
      </body>
    </html>
  );
}
