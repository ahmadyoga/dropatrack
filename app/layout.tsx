import type { Metadata, Viewport } from "next";
import { ThemeProvider } from '@/components/ThemeProvider';
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://dropatrack.vercel.app'
  ),
  title: {
    default: "DropATrack — Drop a track. Share the vibe.",
    template: "%s · DropATrack",
  },
  description:
    "Collaborative music rooms. Same queue, same beat — drop tracks and listen together in real time.",
  keywords: ["music", "collaborative", "jukebox", "youtube", "rooms", "sync", "listen together", "playlist"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "DropATrack — Drop a track. Share the vibe.",
    description:
      "Collaborative music rooms. Same queue, same beat — drop tracks and listen together in real time.",
    type: "website",
    siteName: "DropATrack",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "DropATrack — Collaborative Music Rooms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DropATrack — Drop a track. Share the vibe.",
    description:
      "Collaborative music rooms. Same queue, same beat — drop tracks and listen together in real time.",
    images: ["/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffd23f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" data-type="scifi" data-accent="solar">
      <body className="antialiased">
        <ThemeProvider>
          <div
            id="react-layer"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
