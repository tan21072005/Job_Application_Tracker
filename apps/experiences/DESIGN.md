---
name: "JobTrack / Five Experiences"
description: "Five independent visual worlds for the same application workflow."
colors:
  dossier-paper: "#fafbf7"
  dossier-ground: "#eeefeb"
  dossier-ink: "#263b3d"
  dossier-muted: "#596c6d"
  dossier-line: "#c5ceca"
  dossier-accent: "#963e37"
  dossier-accent-soft: "#f5e9e3"
  rhythm-paper: "#f7f3e8"
  rhythm-ink: "#203c50"
  rhythm-muted: "#526571"
  rhythm-accent: "#225c79"
  rhythm-line: "#c5cec9"
  rhythm-warm: "#8b5035"
  rhythm-light: "#ede8dc"
  atlas-paper: "#f1f0e9"
  atlas-panel: "#fafaf6"
  atlas-ink: "#262333"
  atlas-muted: "#595461"
  atlas-line: "#bdbab9"
  atlas-accent: "#214eca"
  atlas-accent-soft: "#e7edf9"
  atlas-copper: "#965027"
  workbench-ink: "#163a49"
  workbench-text: "#243943"
  workbench-muted: "#566d76"
  workbench-line: "#c7d4d8"
  workbench-paper: "#f7fafb"
  workbench-accent: "#17616b"
  workbench-white: "#ffffff"
  indexer-ink: "#292923"
  indexer-paper: "#f4f2eb"
  indexer-muted: "#62635a"
  indexer-accent: "#d9bc49"
  indexer-line: "#c8c7bd"
typography:
  dossier-display:
    fontFamily: "Source Serif 4, serif"
    fontSize: "clamp(38px, 4.25vw, 60px)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-.025em"
  dossier-body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "17px"
    lineHeight: 1.5
  rhythm-display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(34px, 3.5vw, 53px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.03em"
  rhythm-body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  atlas-display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(38px, 4vw, 54px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.02em"
  atlas-body:
    fontFamily: "Public Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  workbench-display:
    fontFamily: "IBM Plex Sans Condensed, sans-serif"
    fontSize: "28px"
    lineHeight: 1.3
  workbench-body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  indexer-display:
    fontFamily: "Bricolage Grotesque, Noto Sans, sans-serif"
    fontSize: "clamp(38px, 5vw, 72px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-.03em"
  indexer-body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
rounded:
  dossier-control: "3px"
  rhythm-control: "5px"
  atlas-control: "4px"
  workbench-control: "3px"
  indexer-control: "0"
spacing:
  dossier-gap: "24px"
  rhythm-gap: "24px"
  atlas-gap: "14px"
  workbench-gap: "22px"
  indexer-gap: "24px"
components:
  dossier-input:
    backgroundColor: "#ffffff"
    textColor: "{colors.dossier-ink}"
    rounded: "{rounded.dossier-control}"
    padding: "10px 12px"
    height: "44px"
  rhythm-header-nav:
    textColor: "{colors.rhythm-ink}"
    height: "49px"
  rhythm-status-chip:
    backgroundColor: "#e0eaf0"
    textColor: "#22516b"
    rounded: "4px"
    padding: "3px 9px"
  dossier-button-primary:
    backgroundColor: "{colors.dossier-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.dossier-control}"
    padding: "9px 16px"
    height: "44px"
  dossier-book-spread:
    backgroundColor: "{colors.dossier-paper}"
    padding: "46px 48px 22px"
  rhythm-button-primary:
    backgroundColor: "{colors.rhythm-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.rhythm-control}"
    padding: "10px 17px"
    height: "44px"
  rhythm-date-selected:
    backgroundColor: "{colors.rhythm-accent}"
    textColor: "#fff"
    rounded: "{rounded.rhythm-control}"
    height: "79px"
  atlas-button-primary:
    backgroundColor: "{colors.atlas-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.atlas-control}"
    padding: "10px 16px"
    height: "44px"
  atlas-region-selected:
    backgroundColor: "{colors.atlas-panel}"
    textColor: "{colors.atlas-accent}"
    padding: "18px 20px"
    rounded: "3px"
  workbench-button-primary:
    backgroundColor: "{colors.workbench-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.workbench-control}"
    padding: "10px 16px"
    height: "44px"
  workbench-editor-dock:
    backgroundColor: "{colors.workbench-white}"
    textColor: "{colors.workbench-text}"
    padding: "26px 28px"
  indexer-button-primary:
    backgroundColor: "{colors.indexer-ink}"
    textColor: "{colors.indexer-paper}"
    rounded: "{rounded.indexer-control}"
    padding: "12px 18px"
    height: "44px"
  indexer-status-band-open:
    backgroundColor: "{colors.indexer-accent}"
    textColor: "{colors.indexer-ink}"
    padding: "0 25px"
    rounded: "{rounded.indexer-control}"
---

# Design System: JobTrack / Five Experiences

## Overview

**Creative North Star: "Five Working Worlds"**

The five approved concepts share JobTrack's application domain while preserving independent composition, typography and navigation. Their names describe visual worlds: an open dossier, a working agenda, a status landscape, a precision tabletop and a living index. This document indexes actual source tokens; each world's DESIGN.md governs its local screens.

The default experience uses labeled, synthetic demo records. Live authentication, ownership and persistence require the documented API backend; backend acceptance remains pending. This visual inventory makes no production-readiness claim.

**Key Characteristics:**

- Independent React compositions and scoped world styling.
- Readable Vietnamese text, named states and explicit save actions.
- Responsive transformations preserve each world's organizing idea.

## Colors

### Primary

Deep red Dossier ink, Rhythm blue, Atlas cobalt, Workbench teal and Index mustard retain separate meanings inside their own world. The prefixed frontmatter keys preserve their exact source values.

### Secondary

Rhythm warm ink and Atlas copper mark time-sensitive action copy.

### Neutral

Each world owns its paper, reading ink, muted text and rules. The aggregate does not introduce a shared neutral theme.

**The World Boundary Rule.** Apply one world's tokens within its own experience; preserve its local composition when adding a screen.

## Typography

| World | Display | Body |
| --- | --- | --- |
| [Dossier](dossier/DESIGN.md) | Source Serif 4 | Source Sans 3 |
| [Rhythm](rhythm/DESIGN.md) | Archivo | Noto Sans |
| [Atlas](atlas/DESIGN.md) | Barlow Condensed | Public Sans |
| [Workbench](workbench/DESIGN.md) | IBM Plex Sans Condensed | Noto Sans |
| [Index](indexer/DESIGN.md) | Bricolage Grotesque | Noto Sans |

The prefixed roles record observed heading and body declarations. Fonts are self-hosted through Fontsource; local source entry points load their Latin and Vietnamese subsets. Condensed and expressive titles give each world identity while the body families serve forms and prose.

## Layout

| World | Desktop organizing structure | Mobile transformation |
| --- | --- | --- |
| Dossier | Two-page document, separate contents route | One continuous document |
| Rhythm | Date axis and uninterrupted event rows | Stacked date groups and scrolling date strip |
| Atlas | Unequal bounded status regions with inspector | Status index and equivalent list |
| Workbench | Application table above bottom editor dock | Master/detail screens with return context |
| Index | Full-width typographic accordion bands | Same bands with stacked rows |

Detailed container sizes, breakpoint behavior and spacing live in each linked DESIGN.md. The sidecar records actual breakpoint and motion extensions.

## Elevation & Depth

Dossier uses paper lift; Rhythm, Atlas, Workbench and Index primarily use tonal surfaces and rules. Native confirmations provide contextual elevation where implemented. Exact observed shadows live in the sidecar rather than an unsupported frontmatter token group.

## Shapes

Dossier, Atlas and Workbench favor crisp surfaces with small control corners. Rhythm uses gentle control curves. Index uses square geometry throughout. The prefixed control-radius primitives preserve these differences.

## Components

The frontmatter captures primary actions and one signature surface per world. The companion `.impeccable/design.json` contains ten framework-free previews drawn from actual controls and signature structures, including a field, navigation, chip and bounded container. Preview snippets are illustrative static states of implemented components; they do not perform repository mutations.

Native fields, visible focus, busy locks, inline validation, empty/error states and confirmation dialogs are implemented locally. Shared code supplies headless domain/data behavior. No common UI shell is imposed.

## Do's and Don'ts

### Do:

- **Do** preserve each world's approved navigation and mobile transformation.
- **Do** keep status labels and explicit save, error and confirmation feedback readable.
- **Do** identify demo data and verify real account behavior against the backend separately.

### Don't:

- **Don't** collapse the worlds into color variants of one dashboard shell.
- **Don't** add visual claims of status history, geography, calendar sync or AI features.
- **Don't** treat source inspection as backend acceptance.

