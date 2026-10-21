# Kết quả triển khai — readiness gate + projection adapter (T1–T6)

Ngày: 2026-10-21. Base: `eafec1f` (đề xuất) → `8bd333c` (kết quả). Mỗi task là một branch/worktree/commit riêng, đã tích hợp vào `main` bằng fast-forward có guard. Không push, không reset/force/delete, không chạy provider/DB/migration, không cài container, không mở file credential thật.

| Task | Nội dung | Branch | Commit | Checks |
| --- | --- | --- | --- | --- |
| T1 | Receipt schema + verifier thuần, fail closed | `codex/T1-readiness-receipt` | `7b49207` | `readiness.test.mjs` 16/16 |
| T3 | Projection manifest + materializer | `codex/T3-projection` | `0779a8c` | `projection.test.mjs` 13/13, policy +1 |
| T4 | Interface isolation + capability spec | `codex/T4-isolation-interface` | `c987405` | `isolation.test.mjs` 14/14 |
| T5 | Canary verdict fail closed, không mở credential thật | `codex/T5-canary-fail-closed` | `be2f8f2` | `verdict.test.mjs` 13/13, probe chạy thật |
| T2 | Gate readiness trước mọi model call | `codex/T2-readiness-gate` | `4c0573c` | `controller.test.mjs` 19/19 |
| T6 | Reconcile registry với commit đã vào main | `codex/T6-registry-reconcile` | `c86de2b`, `8bd333c` | `controller.test.mjs` 22/22 |
| — | Bằng chứng canary fail closed (evidence) | trên `main` | `a4a7410` | probe chạy trên repo chính |

Bộ kiểm thử control plane trên `main`: **77 pass / 0 fail / 0 skipped** (từ 23 lúc bắt đầu).

## 1. T1 — Readiness receipt (`tools/agent-control/readiness.mjs`)

Receipt gắn: task, feature, `policyHash` (fingerprint control plane), `environmentFingerprint`, `projectionManifestHash`, evidence targets kèm digest, bốn verdict cách ly và kết quả probe. Payload ký HMAC bằng khoá operator **không bao giờ nằm trong worktree**.

Từ chối: thiếu trường, schema lạ, hết hạn, chưa tới hạn, vòng đời quá hạn mức, payload bị sửa, khoá sai, task khác, control plane khác, môi trường khác, projection manifest khác, evidence target thiếu hoặc đổi, và **receipt chỉ chứng minh probe** (thiếu cách ly đọc/ghi/egress/child cleanup).

## 2. T2 — Gate trước model call (`controller.mjs`, `cli.mjs`)

- `run()` gọi `assertReadiness(state)` **trước** `role('planner')`. Không receipt ⇒ **0 lần gọi worker**, status `blocked-readiness`, worktree không đổi.
- `dispatch` dùng chung `run` nên mọi task trong batch cũng qua gate.
- Receipt ràng buộc theo task, feature, fingerprint control plane, fingerprint môi trường, projection manifest; evidence target được băm lại lúc verify.
- **Probe exit 0 không mở gate** — có regression test riêng.
- `doctor` nay tách ba trường: `sandboxProbePass`, `isolationReady`, `liveWorkerRunVerified`; bỏ `liveWorkersVerified` hardcode `false`. `liveWorkerRunVerified` chỉ true khi audit journal có bản ghi `worker-run` gắn với một receipt xác thực được.
- Audit journal ghi thêm `readiness-verified` và `worker-run`.

## 3. T3 — Projection (`projection.mjs`, `policy.mjs`)

`buildProjectionManifest` chỉ nhận file thuộc lane (qua `assertOwnedPath`) và dependency được khai báo tường minh dưới root rõ ràng. Từ chối: dotenv, accounts, key, `.git`, `.agent-state`, `node_modules`, `migrations`, symlink/junction/hardlink, traversal, đường dẫn tuyệt đối, lệch case, file lặp.

`materializeProjection` ghi **đúng** các entry manifest vào target rỗng trong scratch root, đặt read-only, từ chối nguồn đã đổi sau khi dựng manifest. `verifyProjection` so cây với manifest. `policy.mjs` xuất thêm `assertReadableSourcePath` và `assertSafeRootPath` để projection và ownership dùng chung **một** danh sách protected.

## 4. T4 — Interface isolation (`isolation.mjs`)

Capability spec gồm 13 target bắt buộc: host repo, host credentials, common Git, sibling worktree, control state, home credential store, path traversal, projection read/write, scratch write, host write, egress có positive control. `evaluateIsolationProbe` fail closed khi thiếu bằng chứng, sai kết quả, thiếu fingerprint môi trường, thiếu positive control. Adapter giả chỉ nhận operation trong catalog.

**Chưa có adapter thật** — việc đó cần phê duyệt provisioning (xem mục 6).

## 5. T5 — Canary fail closed (`tools/sandbox/verdict.mjs`, `canary.mjs`, `probe.ps1`)

Logic verdict chuyển sang module có test. Thiếu check, thiếu field boolean, target không tồn tại, report không parse ⇒ **không có bằng chứng** ⇒ verdict FALSE. Egress cần host positive control đã CONNECTED. `blockedBy` liệt kê **mọi** verdict fail và gate gồm cả egress + profile check runner.

Canary **không còn mở** `.env`/`accounts.txt` thật của repo; dùng cây fixture giả trong `%TEMP%`.

Verdict đo trên repo chính (`CANARY-EVIDENCE.json`, commit `a4a7410`):

```text
sandboxProbePass            : true
V02_writeIsolation          : true
V15_childProcessTreeCleaned : true
V01_readIsolation           : false
V08_egressDenied            : false
V02_checkProfileConfined    : false
gateA                       : false
```

Nghĩa là: **ghi** đã bị chặn, **đọc** thì chưa — worker vẫn đọc được Git common dir, fixture credential, sibling worktree và control state. Egress chưa chứng minh vì máy này không có egress để làm positive control. Profile check runner vẫn ghi ra ngoài checkout.

## 6. T6 — Registry reconcile (`controller.mjs`, `cli.mjs`)

`reconcile` đọc lịch sử branch của task từ repo root, tách commit đã là ancestor của main khỏi commit chưa tích hợp, ghi vào state và audit. Không sửa lịch sử, branch hay worktree. Lệnh mới: `npm run agents -- reconcile --id <id>`.

Áp dụng cho task thật: `auth-origin-repair` nay hiện `commit: 443b8ac...` (commit P0 đã vào main) thay vì `null`. `auth-header-origin-fix` reconcile ra `branchCommits: []`, `integratedCommit: null` — đúng vì nhánh đó không có commit.

## 7. Trạng thái sau khi triển khai

| Hạng mục | Trước | Sau |
| --- | --- | --- |
| Gọi model khi chưa có bằng chứng cách ly | **có** (chỉ probe Node version) | **không** — gate fail closed |
| Canary exit 0 khi thiếu bằng chứng | **PASS** (fail open) | **FALSE** |
| Canary mở file credential thật | có | không (fixture giả) |
| Doctor báo cáo | `liveWorkersVerified: false` hardcode | 3 trường tách bạch, suy từ bằng chứng thật |
| Registry truy được commit đã tích hợp | không | có (`reconcile`) |
| Projection | chưa có | manifest + materializer + verify (chưa nối vào worker) |
| G-A | không đạt | **vẫn không đạt** — V01 read isolation FAIL |

## 8. Việc còn lại (không tự làm vì cần quyền hoặc review)

1. **Adapter isolation thật (T7)** — cần phê duyệt provisioning: identity riêng bị giới hạn đọc, hoặc container/VM với mounts allowlist. Không dùng `danger-full-access`, không uninstall sandbox, không đổi ACL rộng.
2. **Nối projection vào worker** — `role()` hiện vẫn dựng manifest từ worktree thật và chạy worker `-C <worktree>`; phải chuyển sang chạy trong projection + identity bị giới hạn đọc.
3. **Cấp receipt** — cần đường cấp receipt cho maintainer có audit (không phải cờ bật tay), và mỗi lần cấp phải sinh từ canary evidence thật.
4. **Review độc lập** cho T1–T6 — hiện chưa có reviewer độc lập cho các commit control-plane này.
5. **C03 residual** — exact `Bearer `, Origin exception theo hình thức header, MCP resolver riêng: task riêng, không gộp.
6. **Egress positive control** — cần máy có egress để chứng minh sandbox chặn thật.

## 9. Bằng chứng lượt này

```text
git log --oneline -7  -> 8bd333c, c86de2b, 4c0573c, a4a7410, be2f8f2, c987405, 0779a8c
node --test tools/agent-control/*.test.mjs -> 77 pass / 0 fail / 0 skipped
node tools/agent-control/cli.mjs doctor  -> sandboxProbePass true, isolationReady false, liveWorkerRunVerified false
node tools/agent-control/cli.mjs status  -> auth-origin-repair commit 443b8ac...
tools/sandbox/probe.ps1                  -> gateA false với 3 blockedBy rõ ràng
```

Không đọc `.env`, `accounts.txt` hay key store; không gọi provider; không ghi DB; không chạy migration/restore/load; không dừng hay khởi động lại dịch vụ.
