import type { Metadata } from "next";
import { ThemeProvider } from '@/components/ThemeProvider';
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DropATrack — Collaborative Music Rooms",
  description:
    "Share music across devices in real-time. Create a room, drop tracks, and listen together with friends.",
  keywords: ["music", "collaborative", "jukebox", "youtube", "rooms", "sync"],
  openGraph: {
    title: "DropATrack — Collaborative Music Rooms",
    description:
      "Share music across devices in real-time. Create a room, drop tracks, and listen together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <div className="bg-pattern" />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
