# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: coworkers in an office or other shared space who play music out loud through one shared speaker. One device in the room is the speaker (Speaker Mode on). Everyone else joins the same room from their own laptop or phone, adds tracks and controls playback without playing audio on their own device.

Secondary (they use the product today but weren't named as the focus): friends listening together remotely, and people who drop into public rooms.

The job: everyone in the space gets a say in what plays next, with no account, no install and no single person running the playlist.

## Product Purpose

DropATrack is a free, collaborative, real-time music room. Name a room, share the link, and everyone in it adds to one shared queue and hears the same moment of the same track. It succeeds when a shared space can run its music all day through one link, with nobody stuck as DJ and nobody blocked by a paywall or login.

## Positioning

**It's free.** No premium tier, no subscription, no account. Competitors either cost money or lock key features (Spotify Jam needs Premium). The closest free alternative, jukebox.today, works but has a very dated UI. DropATrack's claim is that it's free *and* looks and feels better than the free options.

## Operating Context

- Usually running all day in the background of a workspace. People check in to add a song, skip one or react, then go back to work.
- Speaker Mode: each client chooses whether it plays audio and video (saved in `localStorage`). Speaker OFF means remote control only.
- Tracks come from YouTube search, pasted links, and a Chrome extension (`extension/`, v1.4.0) that sends YouTube, YouTube Music and Spotify tracks into a room.
- Rooms can be public (listed) or shared by link. Room URL: `/{slug}`.

## Capabilities and Constraints

- Shared queue with time-level, server-authoritative sync: drift beyond 1.5s is corrected (`lib/playbackSync.ts`).
- Roles (intentional, three only): **admin** (room creator, full control), **moderator** (steers playback: play/pause/skip/seek/volume/reorder/auto-suggest), **dj** (the default for joiners: can only add songs, no playback control).
- Anonymous identity: random Indonesian animal names (e.g. "Kijang Ceria", "Kerbau Malu") with generated avatar colours. No auth.
- Room social layer: chat (including image upload), live reactions, a crew/presence strip, Discover/suggestions, and in-room mini-games (Minesweeper, Sudoku) launched from the chat (see `prd_game.md`).
- Installable PWA, plus generated OG images.
- Stack: Next.js 16 App Router, Supabase (Postgres + Realtime), Tailwind v4, YouTube IFrame and Data APIs, deployed on Vercel.
- `YOUTUBE_API_KEY` must stay server-side. All searches go through `/api/youtube/*`.
- Playback depends on YouTube embeds, so tracks that can't be embedded or are region-blocked are a real limit.

## Brand Commitments

- Name: **DropATrack**. Tagline: "Drop a track. Share the vibe."
- Voice: playful, casual, a little cosmic. Friendly slang, cute anonymous names, a space/sci-fi flavour, and emoji are fine (e.g. "everyone floating in it hears the exact same beat ⚡🛸").
- Existing assets: `app/icon.svg`, `app/icon.png`, `app/opengraph-image.png`, `app/twitter-image.png`, `design/DropATrack-og-image*.png`, extension icons in `extension/icons/`.
- Live URL: https://dropatrack.vercel.app/

## Evidence on Hand

- Live product, and a launch video plus share copy in `brag-output/` (`brag.mp4`, `brag.jpg`, `share-copy.txt`).
- Earlier design explorations in `design/` (`DropATrack.html`, `home.jsx`, `room-chat.jsx`).
- No testimonials, user counts, usage stats, press or customer logos exist. Future work must not invent them.

## Product Principles

1. **Free, with no catch.** Never add a paywall, signup wall or nag between someone and the room.
2. **One link is the whole onboarding.** Joining takes zero steps beyond opening the URL.
3. **Background-friendly.** It runs all day in a shared space: glanceable, low effort, and it never demands attention to keep playing.
4. **The queue belongs to the room.** Anyone can add songs; steering playback is delegated by the admin through roles.
5. **Free shouldn't look cheap.** Beating the dated free options on feel is part of the pitch.
