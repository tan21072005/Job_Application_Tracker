# JobTrack continuation context — 2026-10-21

## User intent and authority

Complete JobTrack and its autonomous development control plane: orchestrator plus scoped read-only planner/coder/reflector/reviewer, one feature/worktree/branch per task, controller-only patch/commit operations and independent acceptance. Do not add code comments. Preserve user data and the existing product scope; no invented features or claims of 100% completion.

The user explicitly approved moving sandbox storage to `D:\Long-term`, using the installed Docker/WSL runtime for isolated containers, and fast-forward integration of the reviewed hardening work after documentation/evidence is saved. No push, sandbox uninstall, broad ACL changes, destructive Git cleanup, credential copying or production-data writes were approved.

## Repository and runtime

- Project: `D:\Project\Job_Application_Tracker` (already on D:, not relocated).
- Starting main: `256e6f1edffc7a09f1ba88be6e6f90273ad55abf`.
- Hardening branch/worktree: `codex/control-plane-review-hardening`, `.worktrees/control-plane-review-hardening`.
- Reviewed commits: `47d2bb2`, `b105133`, `d9b4d3a`, `2a3883f`; documentation/evidence follows separately. Verify current main HEAD and integration rather than assuming these are still pending.
- Fresh HTTP probes during this work: web64364 →200; API64366 /api/ready →200, version6. No app process or Postgres service was stopped, no migrations/accounts were run.
- Trusted CLI: `C:\Users\Admin\AppData\Local\OpenAI\Codex\bin\896a0166b774037a\codex.exe`, version0.163.0-alpha.10.2. Set CODEX_CLI_PATH for the trusted controller; do not rely on the old PATH CLI.

## Completed this increment

1. Both `.sandbox` and `.sandbox-bin` in the existing Codex home are junctions to `D:\Long-term\Codex-storage-20261021-active`. Original C: backups are retained; auth, CODEX_HOME and sandbox secret storage were not moved. Fresh sandbox startup succeeded.
2. Signing key removed from child environment; readiness rechecked before each role and fixed check.
3. Projection integrity/physical containment hardened, including ancestor junctions, source casing, protected dependencies, manifest/descriptor tampering and hardlinks.
4. Canary verdict refuses operational errors, timed-out probes, incomplete child/grandchild proof and missing home-credential visibility.
5. Runtime fingerprint hashes actual executable bytes; evidence paths are constrained; reconcile preserves evidence on operational Git errors.
6. Final aggregate fixtures: **95/95 agents +17/17 verdict**, no skips. Exact source hashes and logs are in hardening-evidence/CHECK-RESULTS.json.
7. Real Docker synthetic pilot demonstrated read-only projection/root, private scratch, child/grandchild cleanup and host-connected/isolated-blocked TCP. Its own container was removed and absence verified. It is not a live worker or readiness receipt.
8. **H1 schema 2 readiness contract** implemented in `tools/agent-control/readiness-v2.mjs` and independently reviewed three times (rounds: CHANGES REQUIRED, PASS_WITH_LIMITS, PASS_WITH_LIMITS). The contract is a total function of (report, trusted context, resolver) and gives the report no authority, but it is **not** isolation evidence and it has **no production consumer**. Record: `H1-REVIEW.md`. The trusted-context ownership sentence is now written into `READINESS-V2-PLAN.md`, `HARDENING-REVIEW.md`, `tools/agent-control/SAFETY-VERIFICATION.md` and `tools/agent-control/README.md` so no consumer can mistake conformance for proof.

## What is still incomplete

**G-A remains not accepted.** The schema 2 contract exists and is reviewed, but the real adapter wiring, model transport allowlist, isolated check execution, trusted issuer and actual live-run binding remain unfinished. The legacy canary cannot satisfy the strengthened verifier. Never relabel ENOENT as DENIED or weaken fields to make it pass. The controller still verifies schema 1 receipts; switching it to schema 2 is the H6 wiring increment, and the trusted expected context must then be built by the issuer and the controller from maintainer-owned catalogs, never from a report, an evidence file, a receipt or a task field.

The broader T1–T6 independent review requested changes. Four narrow security increments have passed independent review; that is not acceptance of the whole control plane. Read HARDENING-REVIEW.md for exact scope and READINESS-V2-PLAN.md for the dependency-ordered continuation.

C03 residual remains a separate task: auth scheme parsing, Origin decisions based on actual authenticated grants and MCP resolver alignment. It was not changed here. Product completion backlog is in planning/jobtrack-full-completion; do not infer completion of those tasks from agent fixture results. AutoProfile Vault is outside this workspace.

## Reproducible evidence and checks

Use `rtk` for shell commands. Read repository instructions before execution. Appropriate fixture checks are `rtk npm run agents:test` and `rtk proxy node --test tools/sandbox/verdict.test.mjs`. No database or provider tests are required for this hardening increment.

Read the saved JSON/log evidence first, then verify current state freshly. The container reproduction script is a diagnostic only: it creates unique D: fixture directories, uses the pinned pre-pulled image, makes a host TCP positive-control connection and cleans only its own container. Its runtime/provisioning authority came from the human; do not expand it to other projects or unrelated Docker resources.

Maintainer diagnostic JSON was moved into `.agent-state/maintenance` so it does not masquerade as task registry records. Existing real task records were left intact. Existing auth worktrees/branches were not deleted.

## Paste into another chat

> Continue JobTrack at D:\Project\Job_Application_Tracker. First read AGENTS.md and planning/jobtrack-agent-autonomy/NEXT-SESSION.md, HARDENING-REVIEW.md and READINESS-V2-PLAN.md. Verify Git HEAD, worktrees and runtime freshly. Four hardening commits have independent narrow review and 112 passing fixture tests; sandbox storage moved to D:\Long-term, and a real synthetic Docker pilot succeeded. G-A is still blocked: do not dispatch live workers or trust schema1 receipt booleans. Start with H1 receipt/evidence schema2 as a separate reviewed control-plane contract increment, then production adapter/model transport/check-profile/issuer/controller wiring. Keep exact source/check/review bindings, one lane/worktree per task, no new code comments, no secrets or production-data operations. User has approved Docker/WSL provisioning and fast-forward of the reviewed hardening work, not push or broad ACL changes. Report what is actually verified and the next missing gate.
