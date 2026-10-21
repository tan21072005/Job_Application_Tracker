# Control-plane hardening: independent review and fresh evidence

Date: 2026-10-21. Baseline: `256e6f1edffc7a09f1ba88be6e6f90273ad55abf`.
Author/patch writer: trusted maintainer. Reviewers operated read-only. No application feature source, database, migration, account, payment, n8n workflow or provider configuration was changed.

## Reviewed increments

| Commit | Scope | Independent reviewer | Verdict |
| --- | --- | --- | --- |
| `47d2bb2` | Strip READINESS_KEY from child environment; revalidate before every role and fixed check | `review_gate_receipts_t126` | PASS_WITH_LIMITS |
| `b105133` | Projection schema/hash/descriptor validation; physical containment; reject junctions/hardlinks/control-state dependencies and wrong casing | `review_gate_receipts_t126`, independent of projection proposal author | PASS_WITH_LIMITS |
| `d9b4d3a` | Reject operational errors as denial evidence; timed-out probes; incomplete child/grandchild evidence; include home credential visibility | `review_projection_canary_t345` | PASS for the narrow increment |
| `2a3883f` | Hash executable contents; reject unresolved PATH runtime; contain evidence paths; preserve reconcile evidence on Git errors | `review_gate_receipts_t126` | PASS_WITH_LIMITS |

Final source hashes are recorded in [hardening-evidence/CHECK-RESULTS.json](hardening-evidence/CHECK-RESULTS.json). Reviewers explicitly confirmed the final hashes, including the final fixed-mtime fixture adjustment. These are actual review summaries, not runtime readiness receipts.

## Fresh validation

- `rtk npm run agents:test`: **95 passed, 0 failed, 0 skipped**.
- `rtk proxy node --test tools/sandbox/verdict.test.mjs`: **17 passed, 0 failed, 0 skipped**.
- Source hashes were identical before and after the final aggregate check run.
- Complete stdout/stderr logs and their hashes are retained beside CHECK-RESULTS.json. Archived text uses LF; hashes cover the actual archived bytes. Integrate with a command-scoped `core.autocrlf=false` so checkout does not change the reviewed byte representation.
- Regression-first runs demonstrated the key/gate, projection, verdict and reconcile/evidence defects before fixes. The executable-content regression uses a synthetic executable with a fixed timestamp.

During development, a fingerprint fixture initially inherited CODEX_CLI_PATH and attempted to open the real running CLI for writing. Windows rejected the operation with EBUSY. The test was corrected to substitute a temporary synthetic executable; the real CLI was subsequently checked and returned `codex-cli 0.163.0-alpha.10.2`. The failed run is not treated as a passing regression result.

## Independent baseline findings still open

The broader T1–T6 review is **CHANGES REQUIRED**, despite the four accepted narrow fixes:

1. Schema 1 does not semantically bind canary contents to the signed receipt. An unrelated or stale report can still be wrapped in a fresh signed envelope by a trusted-but-incorrect issuer. No production receipt was issued.
2. `role()` still uses the original worktree; it is not yet wired into a production container adapter.
3. The check runner still uses `:workspace`; its actual host write confinement is unproven. Do not run untrusted changes through it.
4. Environment binding still needs adapter identity, image/profile, network configuration, purpose and source/projection binding.
5. `isolationReady()` and live-run audit need task/profile/projection binding; injected fixtures must never count as real worker evidence. Schema 2 conformance is **not** isolation evidence: the H1 contract in `tools/agent-control/readiness-v2.mjs` closes none of findings 1, 4 or 5, and it has no production consumer yet.
6. The legacy canary producer lacks the newly required grandchild and liveness fields. It must fail closed until upgraded. Do not weaken the verifier to accept old output.

Protected controller-owned directories remain necessary: filesystem check/open races cannot be solved by path validation alone. A self-computed projection hash is integrity evidence, not authorization. Dependency roots must come from a maintainer catalog.

## Storage migration and container pilot

Both `C:\Users\Admin\.codex\.sandbox` and `.sandbox-bin` now point through junctions to `D:\Long-term\Codex-storage-20261021-active`. Original C: backups are retained. ACLs were preserved; auth, sandbox secret storage and CODEX_HOME were not moved. The project remains `D:\Project\Job_Application_Tracker`.

Fresh sandbox read-only node probe and doctor both returned exit 0. At that check C: had 18,626,314,240 free bytes; this free space must not be attributed to deletion by this task. Storage migration alone does not establish G-A.

The human explicitly approved using the existing Docker/WSL installation. A synthetic pilot used a pinned official Node image, UID 65534, read-only root/projection, private D: scratch, no capabilities, no-new-privileges, bounded resources and `network=none`. Inspected mounts matched their expected fixture sources. No real repo, credential store, host root or Docker socket was mounted.

Observed results in [hardening-evidence/CONTAINER-PILOT.json](hardening-evidence/CONTAINER-PILOT.json): projection read succeeded; projection/root writes returned EROFS; scratch write succeeded; host namespace paths returned ENOENT; child/grandchild were live before group kill and absent afterwards; host TCP to `1.1.1.1:443` connected while the isolated run returned ENETUNREACH. The owned pilot container was removed and absence verified before final evidence publication.

This is a **pilot**, not a production adapter or receipt. ENOENT is preserved as namespace absence, not relabeled as access denial. There is no model transport positive control, complete host target witness set or isolated check runner. The reproduction script aborts on failures and may require manual inspection of its uniquely named owned container if Docker itself becomes unavailable; it is not a fault-tolerant provisioner.

The first two pilot runs exposed a newline escaping bug in the test harness. The harness was fixed from stderr evidence without changing container privileges or limits. Only the final corrected run is archived as current evidence.

## Integration authority

The human approved fast-forward integration into main after saving the documentation/evidence. Only reviewed explicit feature paths and this handoff/evidence set may be committed. No push, branch/worktree deletion, reset, rebase, sandbox uninstall, broad ACL changes or live dispatch is authorized by a passing fixture suite.
