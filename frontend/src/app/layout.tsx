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
    "Voice-native AI collaboration tool that ingests your GitHub and Discord, builds a knowledge graph, and lets you query your project through conversation.",
  keywords: ["AI", "project memory", "hackathon", "GitHub", "Discord", "RAG", "voice AI"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-[#050505]" suppressHydrationWarning>{children}</body>
    </html>
  );
}
