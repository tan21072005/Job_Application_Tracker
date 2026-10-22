# H6 review record — staged check scope and approved dependency roots

This record summarises the independent reviews of the H6 work on `codex/h6-check-scope`. It is a
documentation record, not evidence of isolation. Read `READINESS-V2-PLAN.md` for the contract and
`hardening-evidence/` for the measured artifacts.

## Increments

| Increment | Commits | Review verdict |
| --- | --- | --- |
| Staged check scope for a fixed check | `4ce5435`, `6a9b404` (integrated into `main`) | PASS_WITH_LIMITS (`H6-1` to `H6-5`, all P2; closed except one accepted decision) |
| Approved dependency roots | `7a775eb` | CHANGES REQUIRED (one P1, five P2) |
| Approved dependency roots, fixed | `2cb957d` | PASS_WITH_LIMITS |

Both verdicts are bound to the source digest of the revision that was reviewed. A verdict does not
carry over to a later revision: any change to the measured path invalidates the readiness artifacts
by design and needs a fresh issuance and a fresh review at the same digest.

## Findings of the review of `7a775eb` and their state at `2cb957d`

| ID | Severity | Finding | State |
| --- | --- | --- | --- |
| F1 | P1 | The container observation did not recognise a mounted dependency root, so every launch that declared one was aborted with "The container did not carry the declared dependency mount." The declared mounts were also matched by kind, which cannot distinguish several mounts of one kind. | Closed: the observation maps the container dependency path to the dependency kind, the declared mounts are matched by container target, and a container gated test drives a check that resolves an installed package from an approved root and reports the value it resolved. |
| F2 | P2 | A dependency root name was not validated and names were not required to be unique. | Closed: a name must be one safe path segment and the names must be unique. |
| F3 | P2 | The module path value was not constrained. | Closed: every entry must name the container dependency path and must not contain a traversal segment. |
| F4 | P2 | A caller of the boundary could inject its own dependency roots. | Closed: only the operator projection is authoritative; the worker profile receives no dependency root. |
| F5 | P2 | The plan and the continuation note stated more than the code measured. | Closed by the review-fix commit and the documentation follow-up recorded below. |
| F6 | P2 | The plan rows did not record the environment contract change and the new repository check test. | Closed by the documentation follow-up recorded below. |

## Documentation follow-up (this revision)

The review of `2cb957d` returned PASS_WITH_LIMITS and asked for two cheap honesty fixes before
integration. Both are documentation only and do not change the control plane fingerprint, so the
existing artifacts stay valid:

1. The H4 row now names the container module path as part of the fixed environment allow list and
   states the rule the adapter applies to its value. The H6 row records that the approved dependency
   roots are mounted read only under the container dependency path, that a launch is matched against
   the inspected mounts by container target, and that a container gated test resolves an installed
   package from an approved root.
2. The limitations section and `tools/agent-control/README.md` now state that the module path is
   honoured by CommonJS `require` only, so an ESM check cannot resolve a dependency this way and
   fails closed. The earlier wording read as general module resolution.

## Open follow-ups from the same review

These are recorded so a later session does not read the PASS as more than it is. None of them reopens
a bypass and none of them blocks integration.

| ID | Severity | Follow-up |
| --- | --- | --- |
| N1 | P2 | Add non gated unit tests for the root name rule, the uniqueness rule, the module path rule and the target based mount matching. Today only one gated end to end test and one refusal test cover them, so a regression is caught only when the container runtime is reachable. |
| N2 | P2 | Closed by the documentation follow-up above. |
| N3 | P2 | Stated honestly in the plan and the README. An ESM resolution mechanism, if wanted, is a separate increment with its own tests. |
| N4 | P2 | The schema 2 verifier attests the projection and the scratch mounts only. The check container's candidate, fixtures and dependency mounts are verified by the issuer from the maintainer catalog but are outside the verifier's fixed catalog, so the signed receipt does not independently attest them. Extending the verifier contract is a maintainer integration item. |
| N5 | P2 | The adapter confines an approved root itself but does not inspect its contents, so a link inside an approved root is not refused by the adapter. The review measured that such a link was not followed on the current Docker Desktop and WSL backend, which is backend behaviour and not a control. |
| N6 | P3 | The name rule accepts a name that the module path rule then rejects, so the diagnostic points at the wrong rule. The launch fails closed either way. |

## What the reviewed increment does not prove

- No live worker canary has run: the pinned image carries Node only, not the Codex CLI, so no model
  ever ran inside a container.
- The model transport responder is a host side stub; a container side worker has not used the
  transport and no provider was contacted.
- Dependency resolution is proven with a synthetic CommonJS package in an operator run root. A real
  repository check that installs its own dependency tree is unproven, and an ESM check cannot resolve
  a dependency through the module path at all.
- The general egress control is a host reachable local network address, not the public internet.
- A schema 2 receipt is not isolation proof, and it does not attest the dependency mounts.
