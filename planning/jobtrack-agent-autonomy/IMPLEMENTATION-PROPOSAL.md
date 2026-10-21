# Đề xuất task implementation — readiness gate + projection adapter

Ngày: 2026-10-21. Base source: `e56a2c2` (main, chưa push). Trạng thái: **đề xuất, chưa triển khai**. Lượt này chỉ đọc source + tài liệu, chạy fixture test, không sửa code sản phẩm/controller, không gọi provider, không chạy migration/DB test/account/restore/load, không cài container, không mở `.env`/`accounts.txt`/key store.

## 1. Hiện trạng đối chiếu (đo fresh trong phiên này)

| Hạng mục | Kết quả | Nguồn |
| --- | --- | --- |
| Git | `main` @ `e56a2c2`, tracked tree sạch, không remote, 6 worktree | `git log/status/worktree list` |
| Fixture controller | **23 pass / 0 fail / 0 skipped**, 25.8s | `node --test tools/agent-control/*.test.mjs` |
| Registry | 2 task `abandoned` (`auth-header-origin-fix`, `auth-origin-repair`) | `cli.mjs status` |
| Backlog | AG00 `accepted`; AG01–AG13 `planned` | `TASKS.json` |
| Runtime | API `64366` `/api/ready` 200 `version:6`; web `64364` 200; Postgres 5432 | HTTP probe |
| Review | AG00 `PASS_WITH_LIMITS` (chỉ phạm vi audit, **không** nghiệm thu G-A); auth `443b8ac` `PASS` (phạm vi hẹp, C03 partial) | `AG00-REVIEW.md`, `AUTH-INDEPENDENT-REVIEW.md` |
| ADR | Đã chốt **snapshot projection trong execution identity bị giới hạn đọc**; chưa có code | `CONTROL-PLANE-ADR.md` |

## 2. Gap thực tế (xác minh trong source, không lặp lại từ tài liệu)

### G1 — Không có readiness gate trước model call (P1, mở)

`tools/agent-control/controller.mjs:290-294`:

```js
if (!this.adapters.worker) {
  const probe = await this.sandboxProbe(state.worktree);
  if (probe.code !== 0 || probe.timedOut) throw Error(`Sandbox preflight failed; no model was invoked: ...`);
}
const plan = await this.role('planner', state, 'Inspect source and propose a small implementation plan.');
```

- `sandboxProbe` (`:334-336`) chỉ chạy `codex sandbox --permission-profile :read-only -- node --version`. **Exit 0 chỉ chứng minh helper khởi động được**, không chứng minh cách ly đọc, không chứng minh projection, không chứng minh model worker từng chạy.
- Sau đó `role('planner')` → `execute(codex exec ...)` → **gọi model**. Giữa hai bước không có kiểm G-A, không có receipt, không có kiểm hạn dùng/độ mới/môi trường.
- `cli.mjs:17` gán cứng `liveWorkersVerified: false` — trường này không suy ra được từ bằng chứng nào.
- Đúng như ADR đã ghi: "Không thay hardcode false bằng probe code 0".

### G2 — Canary aggregate fail-open (P1, mở)

`tools/sandbox/probe.ps1`:

| Dòng | Lỗi | Hệ quả |
| --- | --- | --- |
| 115 | `egressDistinguishable` = "khác baseline host" | sandbox **ALLOWED** + host blocked cũng được tính là `V08_egressDenied = true` ⇒ có thể báo PASS khi egress vẫn mở. Thiếu positive control (host phải CONNECTED) |
| 123 | `V01_readIsolation` chỉ gồm 4 check | thiếu `gitCommonDirConfig`, `controlStateList`, `readOutsideWorkspace` ⇒ worker đọc được `.git/config` hay control state vẫn PASS |
| 108-115 | `Get-Check` trả `$null` khi field thiếu | `.opened -eq $true` → false ⇒ **thiếu bằng chứng bị coi là "đã chặn"** ⇒ fail-open |
| 129 | `gateA` không dùng `V08_egressDenied` | egress rỗng không chặn gate |
| 156-159 | `blockedBy` chỉ liệt kê V01/V08 | probe/write/child fail mà `passed=false` thì `blockedBy` **rỗng** ⇒ báo cáo không fail-closed |
| 161 | `liveWorkersVerified` hardcode `false` | không phản ánh bằng chứng thật |

### G3 — Chưa có projection/isolation; worker đọc được toàn bộ host (P1, mở)

- `controller.mjs:240-262` (`role`): manifest được dựng bằng `git ls-files` **trong worktree thật**, rồi gửi `baselineManifest` cho worker.
- `controller.mjs:252`: worker chạy `codex exec --sandbox read-only -C <worktree>` ⇒ truy cập trực tiếp hệ thống file của host.
- Bằng chứng đo (giữ nguyên trong `CANARY-EVIDENCE.json`, profile `:read-only`): worker **mở được** `.git/HEAD`, `.git/config`, `.env`, `accounts.txt`; **liệt kê được** sibling worktree và `.agent-state`; chỉ `~/.ssh` bị chặn.
- ADR đã chốt hướng `createProjection` + `launchIsolated`; **chưa có module nào** implement.

### G4 — Registry không truy được về commit đã tích hợp (P2)

`cli.mjs status` cho `auth-origin-repair`: `status: "abandoned"`, `commit: null`, trong khi branch `feature/api/auth-origin-repair` có commit `443b8ac` **đã vào main**. Audit trail không phản ánh đúng việc gì đã được tích hợp.

### G5 — Auth còn lại (P2, đã biết, **không** làm lại)

Theo `AUTH-INDEPENDENT-REVIEW.md`: parser chỉ nhận exact `Bearer `; Origin exception theo **hình thức header** chứ không theo grant đã xác thực; MCP có resolver riêng, ngoài phạm vi commit `443b8ac`. C03 partial — task riêng, không gộp vào gate/projection.

## 3. Task implementation nhỏ đề xuất

Quy tắc áp dụng cho mọi task dưới đây: một task = một lane + một branch/worktree/commit riêng; `tools/agent-control` là **control plane** nên task của nó là maintainer bootstrap với explicit paths + review độc lập; không thêm comment code; không push/reset/force/delete; fail-closed trước model call; **không** dùng probe exit 0 hay boolean JSON tự ghi làm PASS.

### T1 — Readiness receipt: schema + verifier thuần (chưa nối vào runtime)

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/agent-control/readiness.mjs`, `tools/agent-control/readiness.test.mjs` |
| Scope | Định nghĩa receipt: `schemaVersion`, `issuedAt`, `expiresAt`, `environmentFingerprint`, `cli{path,version,binaryHash}`, `policyHash`, `projectionManifestHash`, `targets[]`, `isolation{readIsolation,egressPositiveControl,childCleanup}`; verifier kiểm chữ ký HMAC (khoá nằm ở controller, **không** nằm trong worktree), hạn dùng, binding với `this.fingerprint()` + fingerprint môi trường + digest từng target |
| Acceptance | Mọi trường thiếu / hết hạn / sai chữ ký / sai fingerprint / sai digest target / sai schemaVersion → **reject**; receipt cho task khác → reject; receipt chỉ có `sandboxProbePass: true` mà thiếu evidence isolation → **reject** |
| Kiểm thử cụ thể | `node --test tools/agent-control/readiness.test.mjs`: (1) receipt hợp lệ → accepted; (2) thiếu `expiresAt` → reject; (3) `expiresAt` quá khứ → reject; (4) payload bị sửa 1 byte → reject (chữ ký); (5) `policyHash` ≠ `fingerprint()` hiện tại → reject; (6) `environmentFingerprint` lệch → reject; (7) `targets` chứa digest không khớp → reject; (8) `schemaVersion` lạ → reject; (9) receipt chỉ có probe flag → reject; (10) khoá HMAC sai → reject. Không DB, không provider |
| Rủi ro | Chọn cơ chế khoá phải không lộ khoá vào worktree; cân nhắc khoá sinh từ fingerprint + secret do operator cấp qua env (không ghi ra log) |

### T2 — Enforce gate trong `run`/`dispatch` trước bất kỳ model call

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/agent-control/controller.mjs`, `tools/agent-control/controller.test.mjs`, `tools/agent-control/cli.mjs` |
| Scope | `run()` gọi `assertReadiness(state)` **trước** `this.role('planner', ...)`; `dispatch()` kiểm trước cả batch. Fail → `state.status = 'blocked-readiness'`, không gọi worker, không ghi worktree, không tự retry. `cli.mjs doctor` tách 3 trường: `sandboxProbePass`, `isolationReady`, `liveWorkerRunVerified` (suy từ receipt thật, bỏ hardcode) |
| Acceptance | Không có receipt hợp lệ ⇒ **0 lần gọi worker adapter**; probe exit 0 không mở gate; gate fail ⇒ status `blocked-readiness` + lý do đã redact; mọi bước sau gate (coder/checks/reviewer) vẫn nguyên hành vi cũ |
| Kiểm thử cụ thể | Fixture controller: (1) `run` không receipt → adapter call count = 0, worktree không đổi, status `blocked-readiness`; (2) receipt hết hạn → tương tự; (3) receipt sai fingerprint → tương tự; (4) receipt hợp lệ → vòng lặp chạy như trước; (5) **regression**: receipt có `sandboxProbePass: true` nhưng thiếu isolation → reject; (6) `dispatch` với 1 task thiếu receipt → không task nào gọi worker |
| Rủi ro | Không được làm hỏng đường fixture hiện có (23/23) — adapter giả phải tự sinh receipt hợp lệ để test đường "có gate" |

### T3 — Projection manifest: builder + materializer (thuần, chưa có container)

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/agent-control/projection.mjs`, `tools/agent-control/projection.test.mjs` |
| Scope | `buildProjectionManifest({task, base, files, dependencies})` → `{entries:[{path,sha256}], manifestHash, projectionRoot}`; chỉ nhận file thuộc lane (dùng lại `assertOwnedPath` của `policy.mjs`) + dependency được khai báo tường minh; cấm `.git`, `.agent-state`, `.env*`, `accounts*.txt`, `*.pem/key/p12`, `node_modules`, `migrations`; cấm symlink/junction/hardlink, traversal, lệch case; không glob do worker chọn. `materializeProjection(manifest, targetRoot)` chép **đúng** các entry, đặt read-only, ghi `projection.json`, **không** link sang `node_modules` host |
| Acceptance | Cây materialization **bằng đúng** tập manifest (test so sánh tập file); không có `.git`; file sai byte ⇒ digest lệch |
| Kiểm thử cụ thể | (1) chấp nhận file lane hợp lệ; (2) từ chối `.env`; (3) từ chối `accounts.txt`; (4) từ chối `.git/config`; (5) từ chối `.agent-state/x`; (6) từ chối `node_modules/x`; (7) từ chối `migrations/001.sql`; (8) từ chối symlink/junction/hardlink; (9) từ chối `../` và dấu `/` tuyệt đối; (10) từ chối lệch case; (11) chấp nhận dependency khai báo tường minh; (12) `manifestHash` đổi khi byte đổi; (13) materialize ra đúng tập file, read-only, không chứa `.git`; (14) materialize không ghi ra ngoài `targetRoot` |

### T4 — Adapter interface + capability spec (không provisioning)

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/agent-control/isolation.mjs`, `tools/agent-control/isolation.test.mjs` |
| Scope | Interface `IsolationAdapter`: `probe()` trả `{readDenied[], writeDenied[], egress{hostPositiveControl, sandbox}, childCleanup, environmentFingerprint}`; `launch(role, projectionRoot, capability)` trả executor có cấu trúc. Kèm **capability spec** dạng máy đọc được liệt kê fake target bắt buộc (host repo, commonGit, sibling worktree, control state, home credential store, path traversal, link) + kỳ vọng DENIED. Chỉ có `FakeAdapter` cho test. **Không** tạo identity, **không** cài container, **không** provisioning gì |
| Acceptance | Adapter thật chỉ được chọn khi probe trả **đủ** mọi mục spec, mọi mục đều DENIED, và có positive control egress host CONNECTED; thiếu mục ⇒ không đạt |
| Kiểm thử cụ thể | (1) spec parse được và có đủ nhóm target; (2) adapter trả thiếu 1 mục ⇒ fail; (3) adapter trả mục `ALLOWED` ⇒ fail; (4) adapter trả egress chưa có positive control ⇒ fail; (5) `FakeAdapter` đạt spec; (6) `launch` trả executor không nhận path tự do (argv allowlist) |

### T5 — Sửa canary aggregate fail-closed + egress positive control (độc lập T1–T4)

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/sandbox/probe.ps1`, `tools/sandbox/canary.mjs`, `tools/sandbox/probe.test.mjs` (mới) |
| Scope | (a) field thiếu/parse lỗi ⇒ verdict FALSE **và** `blockedBy` ghi rõ; (b) `V01_readIsolation` đủ 6 check; (c) egress: cần host **CONNECTED** (positive control) + sandbox **DENIED**, thiếu positive control ⇒ FALSE; (d) `gateA` gồm cả `V08_egressDenied` + `V15`; (e) `blockedBy` liệt kê **mọi** verdict false; (f) `liveWorkersVerified` lấy từ receipt thật; (g) canary dùng **fixture path** thay vì file thật trong repo (`.env`/`accounts.txt`) — theo yêu cầu lượt này |
| Acceptance | Bộ canary report giả (allowed/denied/missing field/parse error) cho kết quả đúng; exit code phản ánh đúng `gateA` |
| Kiểm thử cụ thể | Node test cho phần logic verdict (tách ra `.mjs` để test được): field thiếu ⇒ FALSE + `blockedBy` không rỗng; egress sandbox ALLOWED ⇒ FALSE; egress host không CONNECTED ⇒ FALSE; cả 6 check read ⇒ FALSE; tất cả TRUE ⇒ `gateA` TRUE. Không chạy canary thật trong task này |

### T6 — Registry reconcile cho task đã tích hợp

| Mục | Nội dung |
| --- | --- |
| Lane | control-plane (maintainer) |
| Files | `tools/agent-control/cli.mjs` hoặc module registry nhỏ + test |
| Scope | Ghi nhận commit đã integrate cho task đã `abandoned` (`auth-origin-repair` → `443b8ac`) bằng **audit record mới**, không sửa lịch sử, không xóa trạng thái; `status` phải hiện `integratedCommit` hoặc tương đương |
| Acceptance | Registry truy được từ task → commit → main; không đụng worktree/branch đã có |
| Kiểm thử cụ thể | Fixture: task abandoned + commit có trong registry ⇒ `status` hiện commit; commit không có trong main ⇒ không hiện; không sửa file audit cũ |

### T7 — Real isolation adapter + fake canaries (CẦN PHÊ DUYỆT PROVISIONING)

Không giao trong lượt này. Theo ADR: ưu tiên Windows readable/denied roots với identity riêng; nếu runtime không enforce được thì chuyển container/VM với mounts allowlist. Cần người dùng duyệt trước khi tạo identity, cài runtime hoặc cấp quyền.

## 4. Thứ tự đề xuất

```text
T5 (canary fail-closed) ─┐
T1 (receipt schema) ─────┼─> T2 (gate trước model call) ──> AG11 canary/pilot
T3 (projection) ─────────┘
T4 (adapter interface + spec) ──> T7 (adapter thật, cần phê duyệt)
T6 (registry reconcile) — độc lập, làm sớm được
```

Ràng buộc: **T2 chỉ được coi là đóng khi T1 có receipt thật** — nếu không, gate sẽ chặn mọi thứ (fail-closed đúng nghĩa) và cần một đường cấp receipt dành cho maintainer, có audit, không phải cờ bật tay.

## 5. Việc chưa làm trong lượt intake

| Mục | Lý do |
| --- | --- |
| Sửa code controller/policy/canary | Lượt này là intake + đề xuất; code chỉ sửa trong task riêng có review |
| Chạy canary thật | Yêu cầu không mở file secret thật; canary hiện dùng `.env`/`accounts.txt` thật ⇒ phải sửa sang fixture trước (T5) |
| Cài container / tạo OS identity / đổi ACL rộng | Cần phê duyệt provisioning (T7) |
| Gọi provider / model worker | G-A chưa đạt; chưa có gate |
| DB test / migration / account:create / restore / load | Maintainer-only, ngoài phạm vi intake |
| Sửa phần auth còn lại | Task riêng theo `AUTH-INDEPENDENT-REVIEW.md`; không gộp |
| Đóng C03 / G-A | Chưa đủ bằng chứng |

## 6. Bằng chứng của lượt intake

```text
git log --oneline -1            -> e56a2c2 docs(agents): close independent reviews and select isolated projections
git status (tracked)            -> sạch
node --test tools/agent-control/*.test.mjs -> 23 pass / 0 fail / 0 skipped (25.8s)
node tools/agent-control/cli.mjs status   -> 2 task abandoned, commit null
node tools/agent-control/cli.mjs doctor   -> sandbox probe theo CODEX_CLI_PATH; isolationReady/liveWorkerRunVerified chưa tồn tại
HTTP GET 127.0.0.1:64366/api/ready -> 200 {"status":"ready","version":6}
HTTP GET 127.0.0.1:64364/           -> 200
```

Không đọc `.env`, `accounts.txt`, key store; không chạy canary thật; không gọi provider; không sửa DB.
