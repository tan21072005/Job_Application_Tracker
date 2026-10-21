# Verification scope — 21/10/2026

The controller is a project-local automation layer, not a machine-wide permission manager. Each worker checkout is isolated by Git; the controller validates every proposed path before applying source. All agents have separate branches and local commits. The control plane and shared contract are separate ownership domains.

Verified in disposable Git repositories: feature leasing, stale hashes, batch validation, scoped writes, fixed-check fingerprints, independent review binding, feature-only commits, repeated-error stop, and dependency integration gates. Policy tests cover traversal, Windows aliases, symlinks/junctions/hardlinks, secrets and added comments; hook tests pass dangerous strings as data and never execute them.

No database, browser session, payment, model training, provider credential, global Git trust wildcard, sandbox uninstall or ACL relaxation is part of this change. No remote or push has been configured. Existing app source and operational data are preserved.

The installed Windows sandbox failed its read-only Node-version probe. Live agent dispatch stops before model invocation. Check execution also requires the sandbox. Fix and re-verify the local sandbox in a separate environment task before using live dispatch; do not replace it with danger-full-access. The approved permission profile should be verified with a canary denying writes outside the checkout and network access before production development use.

Read-only sandbox limits file writes; it does not by itself prove that all private files are unreadable. Workers receive no dotenv/account exports or inherited application credentials; hostile code still requires separate OS identity/container and explicit read-deny/network policy. Heuristic source secret/comment checks and Claude hooks are supplementary, not a guarantee against every bypass.
