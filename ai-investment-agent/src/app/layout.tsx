import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestorAI — Investment Research Terminal",
  description:
    "An enterprise AI investment research terminal: real-time market data, financial statements, ownership, and an AI INVEST / WATCH / PASS verdict — in a fully customizable widget dashboard.",
  keywords: [
    "AI",
    "investment",
    "research",
    "terminal",
    "stock analysis",
    "financial analysis",
    "dashboard",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default to dark (true-black) theme; the theme switch toggles the `dark` class.
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
