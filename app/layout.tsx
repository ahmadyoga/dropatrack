import type { Metadata, Viewport } from "next";
import { ThemeProvider } from '@/components/ThemeProvider';
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://dropatrack.vercel.app'
  ),
  title: "DropATrack — Collaborative Music Rooms",
  description:
    "Share music across devices in real-time. Create a room, drop tracks, and listen together with friends.",
  keywords: ["music", "collaborative", "jukebox", "youtube", "rooms", "sync"],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "DropATrack — Collaborative Music Rooms",
    description:
      "Share music across devices in real-time. Create a room, drop tracks, and listen together.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
