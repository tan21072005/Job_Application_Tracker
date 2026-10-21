# H1 — readiness schema 2 contract: review record

Task: H1 from `planning/jobtrack-agent-autonomy/READINESS-V2-PLAN.md`. Branch `codex/H1-readiness-schema2`. Base `3879e52`.
Files: `tools/agent-control/readiness-v2.mjs`, `tools/agent-control/readiness-v2.test.mjs`.

Author/patch writer: orchestrator. Reviewers: three independent read-only sessions, each with its own context, none of them the author. No product source, database, migration, account, payment, provider configuration or runtime service was changed. No comment was added to the new code.

## Verdicts by round

| Round | Head reviewed | Verdict | Outcome |
| --- | --- | --- | --- |
| 1 | `c195474` | **CHANGES REQUIRED** | 11 findings (R-01…R-11), 4 at P1: the expected context was optional, the target set was report-declared, the verifier trusted the resolver hash instead of hashing the bytes, and mount entries were never inspected |
| 2 | `3ff5817` | **PASS_WITH_LIMITS** | All eleven closed or substantively closed; one P1 remained: the mount exposure check compared the report with itself, so a writable mount of the original checkout still passed |
| 3 | `88c6338` | **PASS_WITH_LIMITS** | No P0, no report-side authority leak; the contract became a total function of (report, trusted context, resolver). Five small P2 items were named as "the right scope" for a further delta and are closed in `f4c1857` |

## Commits on the branch

| Commit | Scope |
| --- | --- |
| `c195474` | schema 2 evidence and receipt contract, pure evaluator |
| `3ff5817` | closed the findings of round 1 |
| `88c6338` | anchored the contract to a trusted context instead of the report |
| `f4c1857` | tightened the resolver path, the evidence path rules, the mount overlap symmetry and the positive control binding, and added the missing negative fixtures |

## What the contract does

Evidence carries schema version, run id, start and completion times, the exact binding (task, feature, base, source digest, projection manifest, policy, environment, purpose, profile, adapter, image, CLI and Node binary hashes), one execution envelope per fixed probe command and the actual observations. The receipt carries the same binding, issuance and expiry, the evidence path, its raw hash and size, the verifier id and implementation hash, and a signature. The verifier obtains the real evidence bytes through a trusted resolver, hashes them itself, parses them, re-evaluates the observations and never treats a stored gate flag as authority. The evaluator is pure: it imports only `node:crypto`, reads no file, no environment and no clock.

## What the contract does NOT do

It is a document shape and a consistency evaluator. It does not start a container, inspect a mount for real, prove that the model transport exists, confine a check runner, run the probe catalog itself, sign only passing evidence, or bind the controller to a receipt at each execution boundary. Those are H2 to H7. A schema 2 receipt is not isolation evidence; the sentence that must travel with every consumer is in `READINESS-V2-PLAN.md` under "H5–H7: issuer and controller wiring" and is repeated in `HARDENING-REVIEW.md`, `tools/agent-control/SAFETY-VERIFICATION.md` and `tools/agent-control/README.md`.

The trusted expected context is the only authority in the contract. Whoever supplies it holds the authority, so H5 must build it from a maintainer-owned catalog and the staged projection, and H6 must rebuild it at every execution boundary, never from the report, the evidence file, the receipt or any worker-writable source.

## Checks

| Check | Command | Result |
| --- | --- | --- |
| Contract suite | `node --test tools/agent-control/readiness-v2.test.mjs` | 45 pass / 0 fail / 0 skipped |
| Control plane suite | `node --test --test-concurrency=1 tools/agent-control/*.test.mjs` | 140 pass / 0 fail / 0 skipped |

Both were run in the worktree of the branch and re-run by the reviewers with the same counts.

## Source hashes of the reviewed head

```text
9890750ec796fe7f022b752e6877be7947e807b0356c18aa6e5cfddf144c5046  tools/agent-control/readiness-v2.mjs
363e8b27012db8516b625636826b332c3fb42d33e9072a29eb9fa655811e9f27  tools/agent-control/readiness-v2.test.mjs
```

## Open items that are not H1 code

| ID | Owner | Item |
| --- | --- | --- |
| D-09 | H5, H7 | run id uniqueness and receipt replay are issuer and audit properties, not contract properties |
| D-10 | H5 | the envelope stdout and stderr hashes are not yet bound to the observations derived from them |
| D-11 | H1 hygiene | extra liveness generations, unknown witness targets and extra derived keys are ignored rather than rejected |
| N-D5 | H5 | a witness binding is an unconstrained string, so the issuer must use a per-run secret the report producer cannot compute |
| N-D7 | H5 | the resolver return shape must be fixed before H5 implements it, including how the requested logical path and the resolved physical path are reported |
| N-D8 | H5, H6 | a caller can supply a trusted context that makes a false report pass; this is a trust boundary property and is owned by the issuer and the controller |

## Not run

No provider, database, migration, account, payment, n8n, container provisioning or live worker was run. No push, branch or worktree deletion, reset, rebase or sandbox uninstall was performed. The controller still verifies schema 1 receipts; switching it to schema 2 is the H6 wiring increment and is explicitly not part of this task.
