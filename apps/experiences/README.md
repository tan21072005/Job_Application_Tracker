# JobTrack — five independent interfaces

Five responsive React interfaces share domain and data access, with independent markup, navigation and CSS:

| Version | URL path | Main composition | Editable source |
|---|---|---|---|
| Dossier | `/dossier/` | two-page dossier → one document on mobile | `dossier/src/App.tsx`, `styles.css` |
| Rhythm | `/rhythm/` | date axis and agenda | `rhythm/src/App.tsx`, `styles.css` |
| Atlas | `/atlas/` | seven unequal status regions and inspector | `atlas/src/App.tsx`, `styles.css` |
| Workbench | `/workbench/` | table above an editing dock | `workbench/src/App.tsx`, `styles.css` |
| Index | `/indexer/` | seven full-width accordion bands | `indexer/src/App.tsx`, `styles.css` |

Run from the repository root with Node 22.12+ or 24:

```sh
npm ci
npm run dev:experiences
npm run test:experiences
npm run build:experiences
```

Open the local URL printed by Vite. For the production build, serve `apps/experiences/dist` over HTTP (for example `npm run preview --workspace jobtrack-five-experiences`). Opening built HTML through `file://` is unsupported. Keep the `assets` folder beside all five entries.

Default mode is a **functional local preview**, with 12 synthetic applications and shared localStorage across all five versions on the same origin. Changes remain in that browser; demo reset restores sample data. Rhythm and Atlas provide a clearly labeled demo-entry button. Authentication forms do not pretend to create an account in demo mode. The real backend is not included: see [API.md](API.md) for integration and outstanding production gates.

Forms, notes, one next action, statuses, interviews, search/filter/sort, duplicate handling and overview metrics use `packages/jobtrack-core`. Do not share the five page shells or import the old `apps/web` layout. Each version has a local `DESIGN.md`; design decisions and evidence are in `planning/jobtrack-five-websites`.

Editable Draw.io files are in `design/experiences/{dossier,rhythm,atlas,workbench,indexer}/`. Open the `.drawio` file in draw.io Desktop or diagrams.net, then select a page using the bottom tabs. Text and shapes are native editable cells. The Draw.io file documents design and states; React source controls the working website.

The public repositories in `references/ui-sources/repos` are references, not required runtime dependencies. They are excluded from release archives. Their respective licenses still apply; the Square UI template collection must not be redistributed as a standalone kit.
