---
name: "JobTrack / Dossier"
description: "An editorial application dossier in cool paper and deep red ink."
colors:
  paper: "#fafbf7"
  ground: "#eeefeb"
  ink: "#263b3d"
  muted: "#596c6d"
  line: "#c5ceca"
  accent: "#963e37"
  accent-soft: "#f5e9e3"
typography:
  display:
    fontFamily: "Source Serif 4, serif"
    fontSize: "clamp(38px, 4.25vw, 60px)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-.025em"
  body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "17px"
    lineHeight: 1.5
rounded:
  control: "3px"
spacing:
  gap: "24px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "9px 16px"
    height: "44px"
  book-spread:
    backgroundColor: "{colors.paper}"
    padding: "46px 48px 22px"
---

# Design System: JobTrack / Dossier

## Overview

**Creative North Star: "The Open Dossier"**

Cool paper, serif titles and deep red ink turn one application into a continuous working document. Opportunity facts and the next action share a spread with interviews and notes; the document stays readable while fields are edited with an explicit save action.

This captures the implemented local visual world in `src/styles.css` and `src/App.tsx`, under the approved five-world plan. The application is a labeled demo by default; API account, ownership and persistence verification depend on the backend and remain pending.

**Key Characteristics:**

- Continuous document chapters
- Serif reading hierarchy with sans forms
- Quiet paper depth and deep red actions

## Colors

### Primary

- **Accent ink**: The accent marks primary actions and selected context.

### Neutral

- **Paper and ink**: The background and reading colors define the world; muted text supports metadata and fine rules divide content.
- **Ground**: Separates the surrounding workspace from the dossier paper.

**The Named State Rule.** Color supports an explicit label, count, selection state or action; it never replaces the status text.

## Typography

**Display Font:** Source Serif 4, serif.

**Body Font:** Source Sans 3, sans-serif.

The frontmatter records the actual main heading and base body styles. Secondary headings, labels and tabular date/count figures retain the role-specific sizes in the source stylesheet. Fonts are bundled through Fontsource with Vietnamese support; no remote font service is required. 

## Layout

The document uses two equal columns inside a main container capped at 1440px. Pages have generous internal margins and a central dividing rule. At 1100px margins tighten; at 700px the spread becomes a single continuous column and chapter links wrap. The table of contents and report remain independent views.

## Elevation & Depth

The book surface lifts from the ground with `0 12px 36px #263b3d12`; confirmation dialogs use `0 20px 80px #263b3d40`. Mobile reduces the book shadow to `0 8px 24px #263b3d0a`.

## Shapes

Paper surfaces stay rectangular. Small control corners use the control radius token; confirmation dialogs use 8px corners. Fine rules divide chapters and rows.

## Components

### Buttons

Deep red fill and white text identify primary actions. Hover deepens the red to #7f312c. Secondary buttons are transparent with fine borders; text actions remove the border. Visible focus uses a red 2px outline with a 4px offset.

### Inputs / Fields

White fields have a fine muted stroke, the small control radius, 44px minimum height, and 10px 12px padding. Labels, inline field errors and explicit save/cancel controls accompany editing.

### Navigation

Publication header navigation uses a red underline for the active destination. Chapter anchors, previous/next dossier actions and an independent searchable contents page replace a permanent navigation sidebar.

### Book spread

Two pages hold opportunity/action and interviews/notes. A thin center rule separates them; mobile stacks them. Chapter links move within the document. A 350ms clipped opening animation is disabled with reduced motion. Reduced-motion preferences disable decorative animation.

## Do's and Don'ts

### Do:

- **Do** preserve the continuous document and explicit save bar.
- **Do** retain readable interview dates, original timezone and device timezone.

### Don't:

- **Don't** turn chapters into a dashboard card grid.
- **Don't** use a permanent navigation sidebar for this world.

