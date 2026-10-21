---
name: "JobTrack / Workbench"
description: "A petrol command bar, application table and editor dock below it."
colors:
  ink: "#163a49"
  text: "#243943"
  muted: "#566d76"
  line: "#c7d4d8"
  paper: "#f7fafb"
  accent: "#17616b"
  white: "#ffffff"
typography:
  display:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "28px"
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  control: "3px"
spacing:
  gap: "22px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  editor-dock:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    padding: "26px 28px"
---

# Design System: JobTrack / Workbench

## Overview

**Creative North Star: "The Precision Tabletop"**

A petrol command bar and precise blue-white surfaces create a practical tabletop for inspecting and editing applications. The table stays above the editor dock so selection and editing share one context; condensed headings mark objects while Noto Sans keeps fields and prose readable.

This captures the implemented local visual world in `src/styles.css` and `src/App.tsx`, under the approved five-world plan. The application is a labeled demo by default; API account, ownership and persistence verification depend on the backend and remain pending.

**Key Characteristics:**

- Table above a bottom editor dock
- Petrol command surface
- Precise rules and compact data

## Colors

### Primary

- **Accent ink**: The accent marks primary actions and selected context.

### Neutral

- **Paper and ink**: The background and reading colors define the world; muted text supports metadata and fine rules divide content.

**The Named State Rule.** Color supports an explicit label, count, selection state or action; it never replaces the status text.

## Typography

**Display Font:** IBM Plex Sans Condensed, sans-serif.

**Body Font:** Noto Sans, sans-serif.

The frontmatter records the actual main heading and base body styles. Secondary headings, labels and tabular date/count figures retain the role-specific sizes in the source stylesheet. Fonts are bundled through Fontsource with Vietnamese support; no remote font service is required. The condensed family is for headings and object identity, not paragraphs.

## Layout

The main container is capped at 1680px. The application table has a minimum desktop width of 830px inside a scroll surface. A keyboard-operable range control changes its height and offers a reset; the editor dock sits immediately below. Four-column forms become two columns at 1100px. At 700px master and detail become separate visible screens, forms become one column and the save bar is sticky.

## Elevation & Depth

Fine rules and restrained blue-white tones organize the table and dock. Confirmation dialogs use `0 18px 70px #14384530`; the fixed notice uses `0 12px 30px #14384520`. The master and editor surfaces remain flat.

## Shapes

The table and editor are square framed surfaces. Buttons use 3px corners, fields 2px and dialogs 6px. Status dots are small circles beside explicit text labels.

## Components

### Buttons

Primary actions use teal fill with white text, 44px minimum height and compact 12px semibold labels. The command-bar primary uses a pale teal fill. Hover applies brightness(.95). Focus uses a 3px ochre outline offset by 3px.

### Inputs / Fields

Fields use the blue-white paper, a fine blue-gray border, 2px corners and 11px 12px padding. Desktop field text is 13px; mobile uses 16px text and 48px minimum height. Validation pairs a red stroke with an inline message.

### Navigation

The command bar combines search, overview, account and add actions. Dock tabs use a teal underline and aria-pressed. Mobile provides an explicit back action; account includes a return to work and sign-out when authenticated.

### Bottom editor dock

The selected application opens below the table with content tabs, plain labeled fields, notes, one next action and explicit save/cancel actions. Switching a dirty record requests a discard decision. Mobile opens the editor with heading focus and returns to preserved list position and row focus. Reduced-motion preferences disable decorative animation.

## Do's and Don'ts

### Do:

- **Do** keep the table above the editor dock on desktop.
- **Do** use the 14px Noto Sans base and condensed object headings.

### Don't:

- **Don't** move the editor into a permanent right sidebar.
- **Don't** introduce a welcome hero or metric-card strip into the work surface.

