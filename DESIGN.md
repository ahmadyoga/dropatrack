---
name: DropATrack
description: Cartoon-cosmic collaborative music rooms. Drop a track. Share the vibe.
colors:
  nebula-cyan: "#46e0d4"
  booster-lime: "#b6f24d"
  comet-violet: "#9d7bff"
  flare-magenta: "#ff5da2"
  sun-yellow: "#ffd23f"
  ember-coral: "#ff7a4d"
  void: "#14101f"
  void-deep: "#1b1430"
  void-glow: "#241640"
  hull: "#241c3a"
  hull-raised: "#2d2348"
  hull-high: "#352a55"
  field-night: "#1a1430"
  moon-cream: "#f7eeda"
  lavender-haze: "#b9acd6"
  dusk-lilac: "#a397c9"
  ink-outline: "#0b0814"
  shadow-night: "#070510"
  on-pop: "#140f1f"
  paper: "#f7ead0"
  paper-deep: "#f1e0bf"
  paper-glow: "#ffe9b8"
  card-paper: "#fffdf6"
  card-paper-raised: "#fdf3dc"
  card-paper-high: "#f8ead0"
  ink: "#1c1326"
  ink-soft: "#5a4a6e"
  ink-dim: "#66587a"
  accent-ink-paper: "#0a6a63"
typography:
  display:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "clamp(38px, 6vw, 76px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "clamp(20px, 2.4vw, 28px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.005em"
  title:
    fontFamily: "Bungee, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.005em"
  track-title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body-sm:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Space Mono, monospace"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
  wobble: "18px 22px 20px 24px / 24px 18px 22px 20px"
  wobble-2: "22px 16px 24px 18px / 16px 24px 18px 22px"
  pill: "40px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  2xl: "24px"
components:
  button:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.moon-cream}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  button-accent:
    backgroundColor: "{colors.nebula-cyan}"
    textColor: "{colors.on-pop}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.moon-cream}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
  button-ghost-hover:
    backgroundColor: "{colors.hull-raised}"
  button-icon:
    backgroundColor: "{colors.hull}"
    rounded: "{rounded.md}"
    padding: "10px"
  chip:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.moon-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  field:
    backgroundColor: "{colors.field-night}"
    textColor: "{colors.moon-cream}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "13px 16px"
  card-pop:
    backgroundColor: "{colors.hull}"
    rounded: "{rounded.wobble}"
  role-admin:
    backgroundColor: "{colors.flare-magenta}"
    textColor: "{colors.on-pop}"
  role-moderator:
    backgroundColor: "{colors.comet-violet}"
    textColor: "{colors.on-pop}"
  role-dj:
    backgroundColor: "{colors.sun-yellow}"
    textColor: "{colors.on-pop}"
  role-listener:
    backgroundColor: "{colors.hull-high}"
    textColor: "{colors.moon-cream}"
---

# Design System: DropATrack

## Overview

**Creative North Star: "The Cartoon Cosmos"**

DropATrack looks like a sticker-book universe. Every surface is drawn in heavy ink: a thick dark outline, a hard offset shadow with no blur, and corners that are slightly crooked, as if cut out by hand. Those cut-outs float on a deep purple night sky that fades into soft nebula glows (in light mode, warm cream paper). Candy pop colours label the things that matter: who's an admin, what's live, what you can press.

The world is tactile, but kept calm. Buttons behave like physical keys: they lift a pixel on hover and press down into their own shadow on click. Because the app often runs all day on a shared office screen, the bouncier gestures (crooked corners, pop-in springs, floating emoji, twinkling stars) are saved for moments that deserve them. The working view stays steady and easy to glance at. The display face is loud on purpose (Bungee, always uppercase-shaped). The body face is a friendly, slightly technical grotesk. Small metadata is set in mono, like a ship's instrument labels.

Dark mode is the default and the main expression. Light mode is a full, first-class alternate (the "paper" world), not an afterthought.

**Key Characteristics:**
- Heavy ink outlines (2.5–3px) on every interactive surface and card
- Hard, unblurred offset shadows as the only depth device
- Hand-cut "wobble" corners on hero cards; regular radii on controls
- Bungee display + Space Grotesk body + Space Mono labels
- One working accent (Nebula Cyan) plus a candy palette used as labels
- Deep purple night by default; cream paper in light mode

## Colors

A deep, saturated night palette with a family of candy pop colours that act as labels and signals, never as background washes.

### Primary
- **Nebula Cyan** (`nebula-cyan`): the one working accent (`--accent`). Primary buttons (`.btn-accent`), focus rings on fields, scrollbar thumbs, drag-over outlines and text selection. If it's cyan, it's interactive or in focus.

### Secondary
- **Booster Lime** (`booster-lime`): `--accent-2`. The on/selected colour everywhere, plus the jump-to-message flash in chat.
- **Comet Violet** (`comet-violet`): `--accent-3`. Tertiary highlights and the moderator role badge.

### Tertiary (pop labels)
- **Flare Magenta** (`flare-magenta`): the "live" signal (pulsing live dot) and the admin badge.
- **Sun Yellow** (`sun-yellow`): the DJ role badge.
- **Ember Coral** (`ember-coral`): warm emphasis, the most-used pop colour in components, also used in OG image accents.

Text on any pop colour is always `on-pop` (near-black purple), never white.

### Neutral
- **Void** (`void`), **Void Deep** (`void-deep`), **Void Glow** (`void-glow`): dark-mode page background and the radial nebula gradients behind it (`.cosmos-bg`).
- **Hull** (`hull`), **Hull Raised** (`hull-raised`), **Hull High** (`hull-high`): the three panel tiers. Default card, hovered or nested surface, and deepest nesting or listener badge.
- **Field Night** (`field-night`): input backgrounds in dark mode.
- **Moon Cream** (`moon-cream`): primary text in dark mode. A warm cream, not white.
- **Lavender Haze** (`lavender-haze`) and **Dusk Lilac** (`dusk-lilac`): secondary and tertiary text, placeholders. Dusk Lilac clears 4.8:1 on every dark panel tier.
- **Ink Outline** (`ink-outline`) and **Shadow Night** (`shadow-night`): the outline stroke and hard shadow colour in dark mode.
- Hairline dividers use `--line`: rgba(247,238,218,.14) in dark mode, rgba(28,19,38,.16) in light mode.
- **Light mode ("paper")**: `paper` / `paper-deep` / `paper-glow` for the background, `card-paper` / `card-paper-raised` / `card-paper-high` for panels, `ink` / `ink-soft` / `ink-dim` for text. In light mode the outline and the shadow are both `ink`. Cyan is unreadable as text on paper (1.6:1), so cyan *text* uses `--accent-ink` (`accent-ink-paper` in light mode, Nebula Cyan in dark).

### Named Rules
**The On-Pop Rule.** Text on any pop or accent fill uses `--on-pop` (#140f1f), never a hard-coded value.

**The Lime Means On Rule.** Every on/selected state (toggles, switches, the device-mode segment, the selected role, the current phone tab, repeat and auto-suggest) uses Booster Lime with `--on-pop` text. Violet and cyan never signal "on".

**The Speaker Truth Rule.** The player's status chip always says where sound is coming from: "🔊 Playing on {device}" or, in Ember Coral, "🔇 No speaker on". Never show a reassuring sync state when no device is playing.

**The One Working Accent Rule.** Nebula Cyan is the only colour that means "press this" or "this has focus". Pop colours label things (roles, live status, emphasis). They are not alternate button colours.

**The Never-White Rule.** Text is Moon Cream on dark and Ink on light. Text on any pop or accent fill is `on-pop`. Pure #fff and #000 don't appear in the UI.

## Typography

**Display Font:** Bungee (fallback system-ui, sans-serif)
**Body Font:** Space Grotesk (fallback system-ui, sans-serif), weights 400–700
**Label/Mono Font:** Space Mono, weights 400 and 700

All three load from Google Fonts in `app/globals.css`.

**Character:** Bungee is a chunky, signage-style display face that comes in one weight, so hierarchy comes from size alone. Space Grotesk keeps body text friendly but slightly engineered. Space Mono in small uppercase works like instrument labels on the cosmic dashboard.

### Hierarchy
- **Display** (Bungee 400, clamp(38px, 6vw, 76px), line-height 1.05, balanced wrap): the home page hero only. Capped so the create-room form stays above the fold.
- **Headline** (Bungee 400, 20–28px; the room name uses clamp(20px, 2.4vw, 28px)): room name, modal titles, panel headers.
- **Title** (Bungee 400, 14–18px): buttons and card titles.
- **Track title** (Space Grotesk 700, 17px): the now-playing track and any YouTube title. Raw video titles are long and mixed-case; they never go in Bungee.
- **Body** (Space Grotesk 600, 15px): inputs and primary reading text. 13–14px at weight 500 for chat and queue rows; 18px for the home page subtitle.
- **Label** (Space Mono 700, 11px, letter-spacing 0.08em, uppercase): chips, badges, timestamps, metadata. 11px is the floor; nothing renders smaller.

### Named Rules
**The Bungee Is a Shout Rule.** Bungee is for names, titles and buttons, never for running text or track titles. Anything longer than a short line is set in Space Grotesk.

**The Size-Only Hierarchy Rule.** Bungee has one weight (400). Never fake bold on it. Step the size up instead.

## Layout

The room is a desktop-first, three-column workspace: `minmax(320px, 1.1fr) minmax(300px, 1fr) minmax(330px, 1.12fr)` for player, queue and chat/crew, with 20–22px of outer padding. Each column scrolls on its own and the page itself doesn't scroll.

At 1024px and below (detected with `matchMedia('(max-width: 1024px)')`), the room collapses into a single tabbed column (player / queue / chat) with a fixed bottom navigation bar (`MobileNav`) and a mini-player. Content padding grows at the bottom (92–146px) to clear the fixed bars. The room shell uses `100dvh` so the mobile browser's URL bar can't hide the bottom bars.

The home page is a single centred column led by the Display hero.

Spacing is set per component in inline styles rather than from a token scale. In practice it clusters around 4, 8, 10, 14, 18 and 22px. Control padding is usually 8–14px vertical and 10–18px horizontal.

## Elevation & Depth

Depth comes only from **hard, unblurred offset shadows** plus thick outlines. There are no soft drop shadows, glassmorphism or blur on surfaces. The one exception is the modal scrim: a 3px backdrop blur over rgba(8,5,16,.62).

### Shadow Vocabulary
- **Pop** (`box-shadow: 6px 6px 0 var(--shadow)` with a 3px outline): standard cards and panels (`.pop`).
- **Pop Small** (`box-shadow: 4px 4px 0 var(--shadow)` with a 2.5px outline): the most-used tier. Rows, small cards, buttons at rest (`.pop-sm`, `.btn`).
- **Pop Large** (`box-shadow: 9px 9px 0 var(--shadow)`): hero cards and modals (`.pop-lg`).
- **Hover lift** (`6px 6px 0`, translate −1px −1px) and **press** (`1px 1px 0`, translate 3px 3px): the button state pair.
- **Field inset** (`inset 2px 2px 0 rgba(0,0,0,.06)`): the subtle sunken look of inputs.

### Named Rules
**The Hard Shadow Rule.** Shadows always have 0 blur and point down-right. A blurred shadow, or one cast in another direction, breaks the sticker illusion.

**The Outline Earns the Shadow Rule.** Only outlined surfaces cast a shadow. Ghost elements (hairline `--line` border) are flat.

## Shapes

There are two corner languages:

- **Hand-cut wobble** (`rounded.wobble`, `rounded.wobble-2`): asymmetric elliptical radii that make cards look like they were cut out with scissors. Used on hero and feature cards (about 26 places). Alternate the two variants on neighbouring cards so they don't look stamped out.
- **Regular controls**: 14px buttons and fields, 12px icon buttons, 8–9px small tiles, a 40px pill for chips, and 50% circles for avatars, the live dot and round buttons.

Strokes are part of the form: 3px on cards, buttons and fields; 2.5px on small cards and chips; 2px on the live dot and scrollbar thumb.

### Named Rules
**The Wobble Is Seasoning Rule.** Wobble corners belong to hero and celebration moments only. The working room panels (player, queue, chat), controls, inputs and dense list rows use regular radii (14–18px), so the all-day working view stays calm.

**The Same Panel Rule.** Every room panel (player, queue, crew, chat) is the same ink-and-shadow sticker: 3px outline, the Pop shadow, 16px corners, a 3px outlined header bar. Hierarchy comes from size, position and content, never from mixing panel styles. Only the reaction bar, which is a row of keys rather than a panel, is flat.

## Components

Tactile but calm: everything feels like a physical sticker or key, and the bounce is saved for moments that matter.

### Buttons
- **Shape:** gently rounded (14px); icon buttons 12px with 10px padding.
- **Default:** Hull fill, Moon Cream Bungee label at 14px, 3px ink outline, 4px hard shadow, padding 12px 18px, 8px icon gap.
- **Hover / Active:** lifts 1px up-left as the shadow grows to 6px; presses 3px into a 1px shadow. Transform and shadow transitions run 80ms; background 150ms.
- **Accent:** Nebula Cyan fill with `on-pop` text. One per view, for the main action.
- **Ghost:** transparent, hairline `--line` border, no shadow; Hull Raised fill on hover.

### Chips
- **Style:** Space Mono 11px, bold, uppercase, 0.08em tracking. Pill radius, 2.5px ink outline, Hull fill, padding 4px 11px.
- **Role badges:** admin = Flare Magenta, moderator = Comet Violet, DJ = Sun Yellow, listener = Hull High. Pop fills always use `on-pop` text.

### Cards / Containers
- **Corner Style:** wobble for hero and feature cards; regular radii for list rows.
- **Background:** Hull, with Hull Raised and Hull High for nested tiers.
- **Shadow Strategy:** Pop / Pop Small / Pop Large tiers (see Elevation & Depth).
- **Border:** 3px (or 2.5px) ink outline.
- **Placeholder art:** 45° stripes of Hull Raised and Hull High (`.ph`) where an image is missing.

### Inputs / Fields
- **Style:** Field Night fill, Moon Cream Space Grotesk at 15px weight 600, 3px ink outline, 14px radius, padding 13px 16px, faint inset shadow.
- **Focus:** a solid 3px Nebula Cyan ring (`box-shadow: 0 0 0 3px var(--accent)`), no native outline.
- **Placeholder:** Dusk Lilac, weight 600.

### Navigation
- **Desktop:** the room header holds the Bungee room name, live dot, share and settings controls.
- **Mobile (≤1024px):** fixed bottom tab bar for player / queue / chat, plus a floating mini-player.

### Live Dot (signature)
A 9px Flare Magenta circle with a 2px ink outline and a 1.6s pulsing ring. It's the universal "this is happening right now" marker.

### Floating Reactions (signature)
Emoji rise from the bottom of the room over about 4s, scaling and rotating with a random drift. This is a delight moment; it never covers controls permanently.

### Modals
A blurred dark scrim, then a Pop Large card that springs in (`popin`: 220ms, cubic-bezier(.2,1.2,.4,1)).

## Do's and Don'ts

### Do:
- **Do** give every card, button and field a 2.5–3px ink outline and a hard 0-blur offset shadow pointing down-right.
- **Do** use Nebula Cyan for the single main action and for focus. Use pop colours only as labels.
- **Do** put `on-pop` (#140f1f) text on every pop or accent fill.
- **Do** set titles and buttons in Bungee and everything you read for more than a line in Space Grotesk.
- **Do** design both the dark "void" world and the light "paper" world. Every new colour needs a value in both.
- **Do** keep bouncy motion (popin, floating emoji, twinkle, spin) for arrivals, reactions and celebrations. Keep the steady working view still.

### Don't:
- **Don't** use blurred drop shadows, glassmorphism or frosted panels. The only blur is the modal scrim.
- **Don't** use pure white or pure black for text or surfaces.
- **Don't** make a second primary button colour out of magenta, yellow or lime.
- **Don't** apply wobble corners to inputs, icon buttons or dense list rows.
- **Don't** fake-bold Bungee or set paragraphs in it.
- **Don't** rely on the `data-type="scifi"` and `data-accent="solar"` attributes on `<html>`. No CSS reads them today, and the accent is always Nebula Cyan.
