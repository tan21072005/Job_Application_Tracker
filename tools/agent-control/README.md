# JobTrack feature controller

Entry point: `npm run agents -- doctor`. User guide: [docs/agents](../../docs/agents/README.md). New source contains no code comments.

`prepare` validates a task, reserves its lane, creates an isolated branch/worktree and pins the control-plane fingerprint. `run` invokes read-only Planner/Coder/Reflector/Reviewer roles through the installed Codex CLI. Coder returns structured full-file changes; the parent broker checks ownership, traversal/link escapes, prior byte hashes, size, secrets and added comments before writing.

Checks are a fixed catalog. Worker package scripts and locks are protected and compared with the trusted checkout. Credentials are removed from check/worker environments, and dotenv/accounts are not copied into worktrees. A check can execute edited test code; this is operational isolation for trusted development agents, not a hostile-code execution sandbox. Use separate OS accounts/containers for that threat model.

The independent review and checks are tied to the same source digest. Commits contain only the changed, reviewed feature paths. No push or automatic integration is provided. Dependent tasks wait until the maintainer integrates dependency commits into the controller base. Runtime state and append-only audit records are under ignored `.agent-state/`; a directory lease prevents concurrent owners. A crash leaves its lock for diagnosis; it is never silently stolen or deleted recursively.

Direct manual edits in a managed task checkout are rejected as unbrokered changes. Submit changes through `apply` or the managed coder proposal so that secret/comment checks cover every accepted byte. Abandoned tasks are terminal and cannot be checked, applied or committed. On timeout, the controller verifies its owned tree termination and waits for closure; if termination cannot be confirmed, the controller exits without releasing its lease and requires maintainer diagnosis.

Commands:

```powershell
rtk npm run agents -- doctor
rtk npm run agents -- status
rtk npm run agents -- prepare --task docs/agents/tasks/web-example.json
rtk npm run agents:run -- --task docs/agents/tasks/web-example.json
rtk npm run agents -- dispatch --tasks path/to/web-task.json,path/to/api-task.json --concurrency 2
rtk npm run agents:test
```

Examples are templates, not assigned features. Replace objective/acceptance before starting a live run. No live model invocation is necessary for the fixture integration tests. A blocked task keeps its worktree and evidence; a maintainer reconciles it instead of force-resetting history. Ordinary CLI commands fail closed outside the allowlist.

The project Claude Bash hook blocks commands outside the read-only catalog. It does not intercept other applications, direct terminal use or every editing tool. Use managed workers through the controller for file write enforcement. It can be bypassed by an unrestricted host user; hooks are an additional signal, not a security boundary.

Automatic checks run inside the installed Codex `:workspace` sandbox; workers use read-only mode and ignore inherited user configuration so unrelated MCP servers are not attached. A sandbox version probe must pass before any model is invoked. The probe passes with the Codex CLI shipped with the desktop app (`CODEX_CLI_PATH`, `codex-cli 0.163.0-alpha.10.2`); the older npm build of `codex` on PATH (`0.162.0`) fails its Windows sandbox setup with `helper_unknown_error: setup refresh had errors`, so the controller must be given `CODEX_CLI_PATH` instead of resolving `codex` from PATH. The sandbox enforces write denial only: measured canaries show a read-only worker can still open the Git common directory, workspace `.env`, `accounts.txt`, sibling worktrees and control state, and the `:workspace` profile can write outside the checkout. Live automation therefore stays blocked until read isolation is enforced by an OS identity or container, not by the Codex sandbox. There is no unsandboxed fallback. Fixture tests use injected workers/checks and do not certify live model or sandbox availability. `doctor` reports the actual probe result. A maintainer can `abandon --id <id>` for an inactive failed task to free its lane while retaining its branch/worktree and audit history.

Bootstrap source preserves existing local-development example/default connection values in legacy tools. Actual dotenv, account exports, backups and the private master context are excluded. Review legacy defaults and use proper secret provisioning before publishing the repository; no remote or push is configured here.

Codex flags were checked against the installed CLI help and [official CLI reference](https://learn.chatgpt.com/docs/cli/reference). Live CLI/model availability is reported separately from fixture test success. Per-repository `safe.directory` is supplied for registered paths to handle Windows sandbox/user ownership; no global trust wildcard or ACL relaxation is installed.
