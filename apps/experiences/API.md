# API boundary for the five JobTrack interfaces

Design update (15 October 2026): the proposed backend contract is [docs/system-design/openapi.json](../../docs/system-design/openapi.json). It restores source-required automatic session creation after registration and adds explicit session reads, aggregate versions and retry keys. The adapter below is the earlier frontend boundary and does not yet implement those changes. Follow [the migration plan](../../docs/system-design/IMPLEMENTATION-PLAN.md) before enabling API mode.

Status: frontend contract only. This workspace does not yet supply or certify the production backend, PostgreSQL persistence, cookie session security, ownership isolation, rate limits or deployment. Default `VITE_DATA_MODE=demo` uses synthetic local data and never authenticates a real account.

Set `VITE_DATA_MODE=api` at build time only after implementing and testing the same-origin `/api` routes below. All requests include credentials. No token or password is written to localStorage by these interfaces.

| Method | Route | Expected response |
|---|---|---|
| GET | `/api/applications` | `Application[]` owned by the current session |
| POST | `/api/applications` | created `Application` |
| PATCH | `/api/applications/:id` | updated `Application` |
| DELETE | `/api/applications/:id` | 204, including interview cascade |
| POST | `/api/applications/:id/interviews` | created `Interview` |
| PATCH | `/api/interviews/:id` | updated `Interview` |
| DELETE | `/api/interviews/:id` | 204 |
| POST | `/api/auth/register` | 204; body `{email,password}`; registration does not imply login |
| POST | `/api/auth/login` | 204 plus server-managed session cookie |
| POST | `/api/auth/logout` | 204, revoke server session |

Canonical frontend types are in `packages/jobtrack-core/src/domain.ts`. Application writes contain Draft fields plus `confirmReapply:boolean`; server must ignore unknown properties and generate IDs/createdAt. Interview writes include the current Interview shape; ignore client `new-*` IDs on create and generate a durable ID.

`appliedAt` is `YYYY-MM-DD` or empty. Interview `at` is an unambiguous ISO UTC instant, with original IANA `timezone` retained. The current UI Draft `deadline` is a device-local `datetime-local` string, or empty. **Before production, implement and test the deadline adapter that converts it to an instant on write and back to device time on read.** Do not silently treat a local string as UTC or change the date-only field.

Errors use `{code,message,fields?}` with 400 validation, 401 no session, 404 missing/not owned, 409 duplicate and 429 rate limit. For a duplicate return `existing: Application` from the current owner only. The UI distinguishes active/terminal from its status, preserves form data and requires explicit reapply. The server must repeat the check transactionally, prioritise an active duplicate and enforce ownership on every mutation; browser demo checks cannot enforce these server rules.

Production acceptance remains open: real login/logout/register; 401 and expired session; two-user isolation; concurrent duplicate requests; deadline timezone roundtrip; interview DST gap/fold choice; network failures and retry; PostgreSQL migrations/backup; email/password policy and abuse controls. Run those against the real backend before changing the release label from preview.
