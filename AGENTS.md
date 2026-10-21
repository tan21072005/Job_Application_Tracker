# JobTrack agent operating rules

Read `C:\Users\Admin\.codex\RTK.md`, `C:\Projects\Tools\AGENTS.md` and `docs/agents/README.md` before work. Shell commands start with `rtk`.

## Authority

The user assigns objectives. The orchestrator creates scoped tasks; workers do not invent product features. Planner, coder, reflector and reviewer run read-only. The controller is the only patch writer and commit operator. Use `npm run agents`; the old same-checkout autonomous runner is disabled.

One task owns one feature lane and one worktree/branch. Never edit a sibling worktree, shared Git directory, control policy, registry, README/AGENTS, package scripts, lockfiles, migrations or another lane. Shared contract changes need a separate contracts task and maintainer integration before consumers start. Parallel workers do not share a checkout.

## Coding and delivery

Do not add comments to new or changed code. Use clear names and small functions; explain design in Markdown. Do not bulk-remove existing comments. Validate the complete change set and exact prior file hashes before applying it.

Normal sequence: planner → coder proposal → ownership/secret/comment validation → fixed checks → independent review → feature commit. Maximum three coder attempts; stop after the same failure twice. Never weaken tests or claims to pass a gate. A reviewer pass and check result are bound to the same source digest. Do not manually fabricate them.

Each feature commit stays on its own branch until the maintainer integrates it. No automatic push, force push, reset, clean, destructive checkout/restore, rebase, hook bypass or deletion of branches/worktrees. Do not stage all files. Only explicit reviewed feature paths can be committed.

## Data and runtime

Do not read or copy `.env`, `accounts*.txt`, private keys, backups, browser cookies or credential stores into workers, prompts, logs or commits. Do not run migrations, account creation, restore, load tests, payment actions, cloud deployment or production-data writes as default checks. Existing operational tools remain maintainer-only. Do not kill processes or steal application ports.

Worktrees use source only. Missing dependencies or tools must be reported, never worked around by copying secrets or disabling sandbox protections. The separate AutoProfile Vault project is outside this workspace and is not part of these feature lanes.

## AI lifecycle

Use `docs/agents/DEVELOPMENT-MODEL.md`: software work follows a visible backlog and small reviewable increments; AI experiments record business hypothesis, dataset provenance, model/prompt/code versions and evaluation against a frozen holdout. No automatic training, paid provider switching or production promotion without an explicit task and release gate.

README instructions and Git hooks are not OS access controls. Managed read-only workers plus the patch broker prevent ordinary cross-feature writes; hostile actors with unrestricted local credentials need separately administered OS/container permissions and a protected Git/control plane.
