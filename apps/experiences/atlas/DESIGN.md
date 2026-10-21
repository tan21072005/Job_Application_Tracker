---
name: "JobTrack / Atlas"
description: "A bounded, non-geographic workspace of seven current statuses."
colors:
  paper: "#f1f0e9"
  panel: "#fafaf6"
  ink: "#262333"
  muted: "#595461"
  line: "#bdbab9"
  accent: "#214eca"
  accent-soft: "#e7edf9"
  copper: "#965027"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(38px, 4vw, 54px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.02em"
  body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
rounded:
  control: "4px"
spacing:
  gap: "14px"
  section: "26px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  region-selected:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.accent}"
    padding: "18px 20px"
    rounded: "3px"
---

# Design System: JobTrack / Atlas

## Overview

**Creative North Star: "The Status Landscape"**

Mineral surfaces and violet-black ink organize seven named status regions across a finite work surface. Cobalt identifies the selected context, copper marks deadlines, and condensed headings make the regions legible without implying geography or historical progression.

This captures the implemented local visual world in `src/styles.css` and `src/App.tsx`, under the approved five-world plan. The application is a labeled demo by default; API account, ownership and persistence verification depend on the backend and remain pending.

**Key Characteristics:**

- Unequal status regions
- Cobalt selection with named controls
- Equivalent linear access

## Colors

### Primary

- **Accent ink**: The accent marks primary actions and selected context.

### Secondary

- **Warm action ink**: Identifies deadline copy and action timing.

### Neutral

- **Paper and ink**: The background and reading colors define the world; muted text supports metadata and fine rules divide content.
- **Panel**: Lifts selected regions and inspector content through tone.

**The Named State Rule.** Color supports an explicit label, count, selection state or action; it never replaces the status text.

## Typography

**Display Font:** Barlow Condensed, sans-serif.

**Body Font:** Public Sans, sans-serif.

The frontmatter records the actual main heading and base body styles. Secondary headings, labels and tabular date/count figures retain the role-specific sizes in the source stylesheet. Fonts are bundled through Fontsource with Vietnamese support; no remote font service is required. 

## Layout

The main container is capped at 1720px. A four-column canvas uses unequal grid regions beside a 326px inspector. At 1120px the inspector narrows; at 900px it moves below the canvas. At 700px the canvas becomes a status index and list, with full-width detail. A desktop list mode provides the same linear structure.

## Elevation & Depth

Tonal surfaces, borders and a thicker cobalt selection stroke create depth. Workspace regions and inspectors do not use drop shadows.

## Shapes

Region and inspector corners are 3px; controls use the control radius token. Bounded rectangles vary in area, while selected rows use a soft cobalt tint.

## Components

### Buttons

Primary controls use cobalt fill and white text; hover deepens to #163ba0. Secondary controls use the light panel with a fine border. Focus uses a 3px cobalt outline offset by 3px.

### Inputs / Fields

Panel-colored fields have 4px corners, a 1px muted stroke, 11px 12px padding and 44px minimum height. Search includes an inset icon. Status changes use a labeled select and explicit action.

### Navigation

Top navigation uses cobalt text and an underline for the current view. A global query and filters sit above the workspace; the view switch offers spatial and list modes. The mobile status index uses named pressed buttons.

### Selected status region

The selected region spans three grid columns and two rows and contains a scrollable application list. Other regions retain their labels and counts. The inspector stays tied to the selected application. Region areas are compositional, not quantitative. Reduced-motion preferences disable decorative animation.

## Do's and Don'ts

### Do:

- **Do** keep all seven status names accessible.
- **Do** provide the equivalent list view and explicit status control.

### Don't:

- **Don't** add geography, paths or arrows implying status history.
- **Don't** turn the canvas into seven equal Kanban columns.

