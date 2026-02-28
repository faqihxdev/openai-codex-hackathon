import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Syne } from "next/font/google";

import "@/styles/globals.css";

const displayFont = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display"
});

const bodyFont = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Codex Hackathon Workspace",
  description: "Workspace shell and tokenized UI system for PRD-01"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body className="bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
