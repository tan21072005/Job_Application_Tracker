---
name: "JobTrack / Rhythm"
description: "A date-led agenda of interviews and current next actions."
colors:
  paper: "#f7f3e8"
  ink: "#203c50"
  muted: "#526571"
  accent: "#225c79"
  line: "#c5cec9"
  warm: "#8b5035"
  light: "#ede8dc"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(34px, 3.5vw, 53px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.03em"
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  control: "5px"
spacing:
  gap: "24px"
  section: "35px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 17px"
    height: "44px"
  date-selected:
    backgroundColor: "{colors.accent}"
    textColor: "#fff"
    rounded: "{rounded.control}"
    height: "79px"
---

# Design System: JobTrack / Rhythm

## Overview

**Creative North Star: "The Working Agenda"**

Warm paper and navy ink make time the primary reading order. Archivo dates and headings establish a clear rhythm beside open agenda rows, while restrained blue and warm action ink distinguish interviews from deadlines.

This captures the implemented local visual world in `src/styles.css` and `src/App.tsx`, under the approved five-world plan. The application is a labeled demo by default; API account, ownership and persistence verification depend on the backend and remain pending.

**Key Characteristics:**

- Oversized date axis
- Uninterrupted agenda rows
- Separate undated next actions

## Colors

### Primary

- **Accent ink**: The accent marks primary actions and selected context.

### Secondary

- **Warm action ink**: Identifies deadline copy and action timing.

### Neutral

- **Paper and ink**: The background and reading colors define the world; muted text supports metadata and fine rules divide content.

**The Named State Rule.** Color supports an explicit label, count, selection state or action; it never replaces the status text.

## Typography

**Display Font:** Archivo, sans-serif.

**Body Font:** Noto Sans, sans-serif.

The frontmatter records the actual main heading and base body styles. Secondary headings, labels and tabular date/count figures retain the role-specific sizes in the source stylesheet. Fonts are bundled through Fontsource with Vietnamese support; no remote font service is required. 

## Layout

The main container is capped at 1440px. A seven-part date strip precedes date groups with a 153px axis and flexible event surface. At 1100px and 800px columns contract; at 520px the date selector scrolls horizontally, dates move above their rows and forms become one column.

## Elevation & Depth

Agenda hierarchy comes from paper tones, rules and whitespace. Only the confirmation dialog casts `0 18px 60px #11273735`; event rows do not float.

## Shapes

Controls are gently curved; field corners are 4px, segments 6px and dialogs 12px. Agenda rows use horizontal rules and continuous edges.

## Components

### Buttons

Primary actions use blue fill, white text and 44px minimum height; hover darkens to #17475f. Secondary controls remain transparent with rules. The 3px warm focus outline sits 4px outside the control.

### Inputs / Fields

Pale fields use a 1px muted stroke, 4px corners and 11px 12px padding. Invalid fields change their border and show an adjacent message. Status chips pair readable labels with quiet categorical fills.

### Navigation

Top navigation uses a blue underline and stronger weight for the current page. Day/week segments and date movement stay beside the agenda. Detail views carry a contextual back action to the selected date.

### Date selector

Seven day buttons show tabular date numbers and event dots. Blue fill and white text mark the selected day with aria-pressed. The agenda groups scheduled interviews and current action deadlines; undated actions remain visible below. Reduced-motion preferences disable decorative animation.

## Do's and Don'ts

### Do:

- **Do** use dates and event labels to establish order.
- **Do** keep account-wide report metrics distinct from the selected week.

### Don't:

- **Don't** hide actions that lack a deadline.
- **Don't** replace the agenda with a dashboard card grid.

