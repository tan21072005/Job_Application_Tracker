---
name: JobTrack Web
description: Light, blue personal application workspace, documented from the implemented frontend.
colors:
  canvas: "#f7f9fc"
  surface: "#fff"
  ink: "#17243b"
  muted: "#52637a"
  line: "#e0e6ef"
  primary: "#315bef"
  primary-hover: "#2447c9"
  soft: "#edf2ff"
  danger: "#a92843"
  success: "#087354"
  screening-ink: "#8a5300"
  screening-surface: "#fff4df"
  interview-ink: "#6536b8"
  interview-surface: "#f2ecff"
  offer-surface: "#e6f5ee"
  rejected-surface: "#fff0f3"
  neutral-status-surface: "#edf0f5"
typography:
  headline:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  button:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "20px"
rounded:
  badge: "5px"
  field: "7px"
  control: "8px"
  panel: "12px"
  dialog: "16px"
spacing:
  compact: "8px"
  control-gap: "12px"
  mobile-panel-gap: "16px"
  panel-gap: "24px"
  desktop-gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  navigation-active:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "13px 14px"
  status-applied:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  information-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "25px"
---

# Design System: JobTrack Web

## Overview

This document describes only `apps/web`, the implemented refinement of the existing light and blue JobTrack identity. It records code rather than establishing a new visual world. The source of truth is `src/jobtrack.css`, with `src/JobTrack.tsx`, `src/components/ui.tsx`, `src/components/forms.tsx`, and `src/views/` supplying component behavior. The confirmed identity and surface priorities are in `../../planning/jobtrack-ui-redesign/BRIEF.md`.

The workspace uses a pale canvas, white panels, restrained borders, and clear blue actions. Compact supporting information leaves stronger type and color for the current task and upcoming interview. Vietnamese labels use one self-hosted type family throughout.

**Key Characteristics:**

- Light surfaces with blue selection and action states.
- Bordered panels with limited elevation.
- Responsive lists and full forms with visible validation.
- Lucide SVG icons and company monograms.

Scope note: root `PRODUCT.md` still describes the separate five-experience delivery and treats `apps/web` as an anti-reference. `../../design/DESIGN.md` describes an older Draw.io deliverable and older type/color values. Those documents were preserved; their delivery context does not describe this frontend refinement. This document makes no Figma parity claim. The default browser-persisted demo is not evidence of a production backend.

## Colors

### Primary

The primary blue marks actions, active navigation, links, focus, and the dashboard's priority panel. Its hover shade darkens interactive controls; its soft tint supports date tiles, monograms, and next-action panels.

### Secondary

Semantic colors distinguish screening, interview, offer/completion, and rejection/destructive actions. These colors accompany visible text labels. Application status and interview status remain separate component vocabularies.

### Neutral

Canvas separates the workspace from white surfaces. Ink carries main content; muted ink carries supporting information. The line color divides panels, rows, and navigation boundaries. Neutral status badges use the muted ink with their own gray surface.

**The Labeled Status Rule.** Preserve text labels with status colors; a colored dot alone does not communicate the state.

## Typography

Noto Sans is self-hosted in `src/assets/fonts/fonts.css`, with Vietnamese, Latin, and Latin Extended subsets and normal weights (400, 600, 700). The asset directory includes the font's OFL license. The fallback is sans-serif; `font-display: swap` is implemented.

The frontmatter records the base heading, section-title, body, and button roles. Page headings reduce to (27px) below the desktop layout. Detail headings use (28px) at base, while the dashboard focus heading uses (27px). Supporting row text commonly uses (11–13px); small metadata is more compact and should not be promoted into the body role. Dates, times, and metrics use tabular numerals. The auth story alone uses a large responsive heading (`clamp(38px, 4.4vw, 64px)`), reduced to (33px) on mobile.

## Layout

The desktop shell pairs a sticky sidebar (232px) with a flexible workspace. Its topbar is (76px) high; main content has side gutters (40px) and a maximum width (1536px). Main panel gaps are (24px). The dashboard puts its task and schedule panels above the four-metric strip; secondary content follows. This ordering is specific to the dashboard, rather than a mandatory template for every screen.

Breakpoints come directly from `src/jobtrack.css`:

- At minimum (1650px), increase top padding and the priority panel's width/size.
- At maximum (1240px), reduce the sidebar to (210px), gutters to (28px), and panel gaps to (18px); simplify list columns.
- At maximum (1000px), reduce the sidebar to (185px), use (24px) gutters, stack secondary dashboard and detail regions, and remove the table heading.
- At maximum (700px), remove the sidebar and show the fixed three-position bottom navigation. Main gutters become (20px), with bottom clearance (100px). Stack priority panels; make metrics a two-column grid, application rows individual cards, pipeline lanes vertical, detail regions single-column, and form fields single-column. Inputs use (16px) text and a minimum height (48px).

Desktop pipeline lanes scroll horizontally with a minimum width (225px) per lane. Mobile navigation includes safe-area bottom padding. Dialogs remain viewport-bounded and scroll internally; their action and heading regions are sticky.

## Elevation & Depth

Most surfaces separate through borders and background tones. Shadows are reserved for the selected view-switch item, dialog, and toast; exact values are retained in the sidecar. The dialog backdrop dims and blurs the underlying workspace. Buttons transition background and text color over (0.16s ease-out). Loading uses a rotating Lucide icon; reduced-motion preference shortens animation and transitions to (0.01ms).

## Shapes

Panel, control, field, badge, and dialog corner values are recorded above. Monograms are rounded squares, while account avatars and indicator dots are circles. White panels use fine (1px) borders. A dialog's radius reduces to the panel radius on mobile. Icons come from `lucide-react`; preserve SVG strokes and existing accessible labels rather than substituting text symbols.

## Components

- **Buttons:** `Button` exposes primary, secondary, ghost, and danger variants. Standard buttons have a minimum height (44px), a (9px) icon gap, and disabled opacity (0.55). Some compact auxiliary controls are smaller; their sizes are contextual exceptions, not a new target-size rule.
- **Fields:** `Field` links labels, help, and errors with generated IDs and `aria-describedby`; errors set `aria-invalid`. Controls have a visible border, primary focus treatment, and danger border/tinted surface on error. Forms preserve inline validation and can expose additional fields through a disclosure.
- **Navigation:** desktop links use a tinted active surface; mobile bottom navigation retains overview, applications, and add. Detail tabs use a primary underline with `aria-selected`.
- **Status badges:** compact text plus a dot for application states; interview rounds have their own labels and tint rules. Do not conflate the two.
- **Panels and rows:** recurring information panels use white surfaces, line borders, and panel corners. Application identity groups company monogram, role, and company; next action stays close to that identity as rows wrap on smaller widths.
- **Dialogs:** native modal dialogs restore focus on close; close/cancel behavior respects busy state. Their headers and action bars remain visible while the body scrolls.
- **Feedback:** empty states pair an icon, explanation, and contextual action. Loading uses skeleton panels. Toasts are dark, dismissible, and move above the bottom navigation on mobile.

**The Visible Focus Rule.** Preserve the primary outline (3px, offset 4px) for keyboard controls. Search uses a wrapper focus ring instead of a second input outline.

## Do's and Don'ts

- Do preserve the light canvas, blue action hierarchy, and Vietnamese labels.
- Do keep status text, field labels, and contextual next actions visible as layouts wrap.
- Do use the supplied Noto Sans assets and Lucide SVG icons.
- Do retain focus, error, loading, empty, disabled, and reduced-motion behavior.
- Don't apply the five independent experiences' visual systems to this app.
- Don't replace state labels with color alone.
- Don't treat browser demo fixtures as production data or backend completion.
