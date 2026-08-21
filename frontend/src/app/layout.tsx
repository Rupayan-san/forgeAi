import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Forge — AI Project Memory",
  description:
    "AI project memory for engineering teams that ingests GitHub commits, PRs, and Discord threads, building a living vector knowledge graph with verified source citations.",
  keywords: ["AI", "project memory", "GitHub", "Discord", "RAG", "Vector Search", "Qdrant", "Knowledge Graph"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-[#050505]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
