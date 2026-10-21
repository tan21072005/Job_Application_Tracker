# Next increment: real isolation and evidence-bound readiness

Status: planned; not implemented. This supersedes any assumption that T1–T6 or a successful sandbox startup establishes G-A. Read HARDENING-REVIEW.md first.

## Objective and fixed boundaries

Complete the autonomous agent execution path without exposing the original checkout, Git common directory, controller state, account files or credentials to workers. Preserve the existing planner → coder proposal → broker validation → fixed checks → independent reviewer → feature commit flow. Maximum three coding attempts; stop and investigate the same failure twice. No comments added to new/changed code.

Software work uses small dependency-ordered increments and a visible backlog. Security experiments record a hypothesis, fixture provenance, source/image/profile versions and frozen evaluation fixtures. These canary experiments do not justify model training, paid provider changes or production promotion.

## Ordered tasks

| ID | Deliverable | Depends on | Required acceptance |
| --- | --- | --- | --- |
| H1 | Receipt/evidence schema 2 and pure evaluator | Review this contract | Reject schema 1, unbound/stale/invalid reports and self-asserted verdicts |
| H2 | Production Docker adapter with a fixed operation/probe catalog | H1 contract | Exact inspected mounts, UID/caps/rootfs/resource restrictions, no host secrets or Docker socket |
| H3 | Actual model transport/broker with a narrow allowlist | H2 | Real transport positive control plus host-positive/isolated-negative general-egress pair |
| H4 | Separate isolated fixed-check execution profile | H2 | Changed code cannot write/read outside declared scratch/projection; no production DB/provider access |
| H5 | Trusted maintainer issuer and audit path | H1–H4 | Executes probes itself, derives verdicts, signs only passing evidence, no manual passed flag/report import |
| H6 | Projection/adapter/receipt wiring at each execution boundary | H5 | Every planner/coder/reflector/reviewer/check uses exact staged projection and purpose-bound receipt |
| H7 | Independent end-to-end acceptance and one scoped live canary task | H6 | Same source digest for checks/review, real worker audit, no fixture counted as live, gate remains blocked on any missing proof |
| H8 | C03 residual API/MCP auth feature task | Separate approved lane after the execution path is safe | Fresh auth/Origin/MCP regression coverage and independent review |

Each implementation task gets its own feature lane, branch/worktree and explicit file list. Shared control-plane contracts are maintainer bootstrap work; integrate the reviewed contract before starting consumers. Do not dispatch product workers through the current unproven :workspace runner.

## H1: schema 2 contract

Evidence must contain:

- `schemaVersion`, unique `runId`, `startedAt`, `completedAt`.
- Binding: task/feature/base/source digest, projection manifest hash, policy/environment hashes, purpose (`worker-read` or `check-runner`), execution profile hash, adapter ID, immutable image digest, CLI and Node binary hashes.
- Execution envelopes: fixed probe catalog hash, command ID, exit code, timeout flag, stdout/stderr hashes.
- Actual observations: host positive target witnesses, independently inspected mounts/namespace, fixed read/write targets, child and grandchild before/after liveness, actual model transport positive control and matching general-egress endpoints.

Receipt must contain schema 2, run ID, exact binding, issuance/expiry timestamps, evidence path/raw SHA256/completion timestamp, verifier ID/implementation hash and signature. Retained isolation booleans are derived outputs, never authority.

The verifier must obtain bounded actual evidence bytes through a trusted physical-path resolver, hash them, parse and evaluate the observations. Require `startedAt ≤ completedAt ≤ issuedAt ≤ now < expiresAt`, a bounded issuance delay such as five minutes, maximum TTL and exact report/receipt binding. Resolve the actual report; a matching caller-supplied hash alone is insufficient.

Required negative fixtures: unrelated/altered report; missing resolver; malformed/oversized JSON; stale report in fresh envelope; future capture/capture after issuance; wrong task/source/projection/environment/profile/purpose/implementation; stored gateA=true with failed observations; missing/duplicate probe; timeout; EINVAL; spawn failure; namespace absence without host/mount proof; mismatched egress endpoints; blocked general egress with unusable model transport; worker receipt reused for checks.

## H2–H4: adapter and transport

Use the successful D: pilot as evidence that the installed Docker runtime can support the chosen direction. It does not replace production code or independent adapter review.

Provision only per-task projection and scratch under `D:\Long-term`; validate physical paths and source hashes, use exclusive per-run directories, immutable image references, unprivileged identity, read-only source, bounded resources and a fixed entrypoint. The trusted controller owns lifecycle and cleanup. Inspect actual sources and flags before launch; record and verify owned-resource cleanup.

General networking must remain blocked. Define and review the model transport/broker before enabling it; never mount host auth storage or copy provider keys into a worker. Do not infer transport usability from the host's ability to reach an unrelated IP. Freeze the allowed endpoint/profile and prove it with an actual positive control. Existing model/provider selection is not permission to switch providers or incur new paid services.

Worker and check profiles are different contracts. A check runner needs isolated write/build scratch and approved dependencies, without an original repo mount, production database connectivity or inherited credentials. Missing dependencies are a blocker, not a reason to mount node_modules/secrets broadly.

## H5–H7: issuer and controller wiring

The maintainer issuer runs the fixed trusted probe catalog itself. There is no arbitrary command, --passed flag or free-form report import path. It verifies projection/container configuration, derives results, atomically writes evidence, signs only a passing bound result and appends audit. Failure produces diagnostics and no receipt. Keep the signing key out of child/container environments.

At each execution boundary: stage projection → verify exact bytes → construct trusted binding → find or issue matching fresh evidence → verify again immediately before isolated launch. Source changes require new projection/evidence; worker-read cannot authorize check-runner. Never fall back to the real checkout when an adapter fails.

Doctor's isolation/live fields must refer to the relevant task/profile/projection. Fixture adapters cannot produce live-run evidence. Retain the source digest link between fixed checks, reviewer approval and commit. Independent review must explicitly distinguish accepted increments from remaining G-A blockers.

## Prompt for the next implementation session

> Read AGENTS.md, docs/agents/README.md, HARDENING-REVIEW.md, NEXT-SESSION.md and this plan. Verify current Git/runtime state freshly. Do not treat passing fixture tests or the Docker pilot as G-A. Begin H1 as a separate reviewed maintainer control-plane contract increment; keep schema 1 production receipts rejected once v2 is introduced. Prepare test-first changes with exact prior hashes, no new comments, fixed checks and an independent reviewer. Do not start consumers until the contract is reviewed/integrated. Do not read/copy real secrets, change production data, switch paid providers, broaden permissions or bypass readiness. Report exact source/check/review bindings and the next unmet acceptance criterion.
