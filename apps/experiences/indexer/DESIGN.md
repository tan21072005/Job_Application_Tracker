---
name: "JobTrack / Index"
description: "Seven typographic status bands with a mustard expanded surface."
colors:
  ink: "#292923"
  paper: "#f4f2eb"
  muted: "#62635a"
  accent: "#d9bc49"
  line: "#c8c7bd"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Noto Sans, sans-serif"
    fontSize: "clamp(38px, 5vw, 72px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-.03em"
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
rounded:
  control: "0"
spacing:
  gap: "24px"
  section: "55px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "44px"
  status-band-open:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    padding: "0 25px"
    rounded: "{rounded.control}"
---

# Design System: JobTrack / Index

## Overview

**Creative North Star: "The Living Index"**

Graphite text and warm off-white paper form a large typographic index. Seven full-width status bands are the navigation; an expanded mustard band exposes application rows in the same vertical rhythm. Bricolage Grotesque gives titles character while Noto Sans carries compact operational text.

This captures the implemented local visual world in `src/styles.css` and `src/App.tsx`, under the approved five-world plan. The application is a labeled demo by default; API account, ownership and persistence verification depend on the backend and remain pending.

**Key Characteristics:**

- Seven full-width status bands
- Mustard expansion surface
- Separate full-page detail

## Colors

### Primary

- **Mustard**: The expanded status band and selection use the accent; graphite primary buttons retain legibility.

### Neutral

- **Paper and ink**: The background and reading colors define the world; muted text supports metadata and fine rules divide content.

**The Named State Rule.** Color supports an explicit label, count, selection state or action; it never replaces the status text.

## Typography

**Display Font:** Bricolage Grotesque, Noto Sans, sans-serif.

**Body Font:** Noto Sans, sans-serif.

The frontmatter records the actual main heading and base body styles. Secondary headings, labels and tabular date/count figures retain the role-specific sizes in the source stylesheet. Fonts are bundled through Fontsource with Vietnamese support; no remote font service is required. 

## Layout

The index container is capped at 1800px with percentage gutters. Band titles scale from 42px to 64px, beside current counts and expand controls. Expanded rows use three desktop columns. At 1150px row metadata rearranges; at 760px rows become stacked content with a trailing open icon and forms use one column.

## Elevation & Depth

The index stays flat. Rules, reversed primary controls and the mustard expanded band convey structure. Only dialogs cast `0 20px 80px #1d1d2340`, against a dark blurred backdrop.

## Shapes

Buttons, fields, bands and dialogs use square corners. Long horizontal rules and full-width colored bands form the recurring silhouette.

## Components

### Buttons

Primary actions invert graphite and paper; hover softens to #48493e. Secondary actions have a fine graphite outline. Focus uses a 3px ochre outline offset by 4px. The primary action minimum height is 44px.

### Inputs / Fields

Square pale fields use 13px 14px padding and 47px minimum height. Invalid fields pair a red stroke with text. Search in the header remains an open text line; mobile editing fields use 16px text.

### Navigation

Oversized status titles and counts form the main index. Header routes expose calendar, overview and account. Active header navigation uses an inset underline. Detail uses a clear back action to the band.

### Expanded status band

Each named status uses a real accordion button with aria-expanded and a controlled panel. The expanded band contains position/company/next-action rows. Returning from a full detail page restores the index context. The opening panel uses a 300ms clipped unfold animation. Reduced-motion preferences disable decorative animation.

## Do's and Don'ts

### Do:

- **Do** keep counts, expansion controls and data readable beside large type.
- **Do** keep real accordion semantics and visible keyboard focus.

### Don't:

- **Don't** convert expanded rows into a card grid.
- **Don't** let display typography obscure application actions.

