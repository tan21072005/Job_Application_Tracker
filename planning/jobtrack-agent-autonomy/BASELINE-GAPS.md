# AG00 — Baseline và gap matrix (kiểm kê tại source)

Ngày kiểm kê: 2026-10-21. Lượt này là **audit read-only** của controller/policy/source hiện tại, không sửa code sản phẩm, không dispatch worker, không đọc secret, không gọi provider hay DB ghi.

Tài liệu giữ snapshot audit đầu tại30db3fd và các cập nhật có commit riêng. Bảng §1–§2 là lịch sử tại thời điểm audit, không phải hiện trạng HEAD/testcounts/task registry sau e60185a. Review hiện hành phải ghi evidence mới riêng trong AG00-REVIEW.md.

## 1. Mốc môi trường

| Hạng mục | Giá trị quan sát được | Nguồn |
| --- | --- | --- |
| Repo | `D:/Project/Job_Application_Tracker` | `git rev-parse --show-toplevel` |
| HEAD | `30db3fd6c00673e639ed46739cff00604f7fe1ac` (`integrate-reviewed-agent-development-control`) | `git log --oneline` |
| Branch hiện tại | `main` | `git status --branch` |
| Trạng thái tracked | sạch (`git diff --stat HEAD` rỗng) | `git diff --stat HEAD` |
| Untracked | `planning/`, `design/`, `tooling/`, `docs` gốc, `HANDOFF.md`, `PLAN.md`, `PROJECT_COMPLETION_PLAN.md`, `HUONG_DAN_CHAY.md`, `START-*.cmd`, `.env.example` các app | `git status --short` |
| Worktree | `main` + 3 worktree automation (`automation-control`, `automation-docs`, `automation-policy`) | `git worktree list` |
| Remote / stash | không có remote, không có stash | `git branch -a`, `git stash list` |
| Runtime | Node `v24.18.0`, npm `11.18.0`, git `2.54.0.windows.1` | `node --version` |
| CLI hỗ trợ | `codex-cli 0.162.0`, `rtk 0.44.0` | `codex --version`, `rtk --version` |
| Postgres | LISTEN `0.0.0.0:5432` (PID 8776) | `netstat -ano -p TCP` |

Lưu ý quyền: thư mục `.git` do tài khoản sandbox cũ (`PC\CodexSandboxOffline`) sở hữu, phiên hiện tại chạy `PC\Admin`. Vì vậy mọi lệnh git trong phiên này dùng `GIT_CONFIG_COUNT/KEY_0/VALUE_0` để khai báo `safe.directory` **cho đúng repository trong phạm vi process**, không sửa global config và không nới ACL. Đây là tuân thủ `docs/agents/OPERATING-RULES.md` (không dùng global Git config để né lỗi quyền).

## 2. Bằng chứng controller hiện có

| Kiểm tra | Lệnh | Kết quả fresh | Ý nghĩa |
| --- | --- | --- | --- |
| Fixture test suite | `npm run agents:test` | **21 pass / 0 fail / 0 skipped**, 39.3s | Broker, lane, path/hash/secret/comment, digest-bound review, attempt limit đều có regression |
| Trạng thái task | `npm run agents -- status` | `[]` | Không task/lease nào đang chạy |
| Sandbox probe | `npm run agents -- doctor` | `sandbox.code = 1`, `helper_unknown_error: setup refresh had errors`, `liveWorkersVerified: false` | **Live dispatch vẫn BLOCKED** |

### 2.1 Nguyên nhân sandbox — ĐÃ CHỐT (cập nhật sau AG02)

Bản ghi đầu tiên của mục này giả định lỗi nằm ở "cần phiên Administrator" và "cần `codex sandbox uninstall`". **Cả hai giả định đã bị bác bỏ bằng đo thật** vào 21/10/2026 (sau commit `2d926d9`):

| CLI | Phiên bản | Probe `:read-only` |
| --- | --- | --- |
| `codex` trên PATH (`%APPDATA%\npm\codex.ps1`) | `codex-cli 0.162.0` | **FAIL** — `helper_unknown_error: setup refresh had errors` |
| CLI của ứng dụng (`%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe`) | `codex-cli 0.163.0-alpha.10.2` | **PASS** — `v24.18.0`, exit 0 |

Nguyên nhân thật: **controller gọi nhầm CLI**. `tools/agent-control/controller.mjs` dùng `this.codexCommand`, lấy từ `CODEX_CLI_PATH` nếu có, nếu không thì rơi về `codex` trên PATH — tức bản npm 0.162.0 bị lỗi. Khi `CODEX_CLI_PATH` trỏ đúng CLI của ứng dụng, `npm run agents -- doctor` trả `sandbox.code = 0`, `sandbox.output = "v24.18.0"`.

Hệ quả cho kế hoạch:
- `codex sandbox uninstall` **không cần thiết** và **chưa được chạy** — không có bằng chứng cho nó.
- Chạy elevated **không cần thiết** — toàn bộ bằng chứng thu được ở phiên không elevated.
- Sandbox **đã dùng được**, nhưng **cách ly đọc chưa có** ⇒ gate G-A **chưa đạt** ⇒ live dispatch vẫn bị chặn. Chi tiết: `SANDBOX-READINESS.md` + `CANARY-EVIDENCE.json`.

Các kiểm tra trước đó vẫn đúng và giữ nguyên giá trị: RTK không phải nguyên nhân (lỗi giống hệt khi có và không có `rtk proxy`); tài khoản `CodexSandboxOffline`/`CodexSandboxOnline` và group `CodexSandboxUsers` tồn tại trên host; session đo chạy `PC\Admin` không elevated.

## 3. Gap matrix nền tảng agents

| Nhóm | Implemented | Fixture-tested | Live-tested | Blocked |
| --- | --- | --- | --- | --- |
| Worktree/branch riêng theo task | có | có (21/21) | không | — |
| Lane lease + chặn overlap | có | có | không | — |
| Proposal broker (path/hash/secret/comment/size) | có | có | không | — |
| Check executor gắn digest | có | có (injected check) | không | cần cách ly/check profile đạt gate |
| Reviewer độc lập + digest binding | có | có | không | cần cách ly/check profile đạt gate |
| Attempt limit / same-failure stop | có | có | không | — |
| Feature commit explicit paths | có | có | không | — |
| Crash recovery / atomic journal | một phần | một phần | không | chưa có evidence |
| Scheduler DAG / nextReady / budget | chưa có | — | — | AG05 |
| Planner tạo DAG + prompt schema | chưa có | — | — | AG04 |
| Canary read/write/egress/timeout | **đã có** (`:read-only` chặn ghi, child cleanup sạch) | **live-tested** | **read isolation FAIL** (V01) | AG02 PARTIAL → G-A chưa đạt |
| Batch tự chạy + stop | chưa có | — | — | AG12 |
| Mức hiện tại | **L0 (plan/fixture)** — probe sandbox đã pass, nhưng G-A chưa đạt | — | — | chưa đạt L1 |

Kết luận mức: hệ thống **chưa được chứng nhận live**. 21/21 fixture pass chỉ chứng minh policy logic đúng với worker/check giả lập; probe sandbox pass chỉ chứng minh helper chạy được, **không** suy ra cách ly đọc (V01 đang fail) — xem `CANARY-EVIDENCE.json` (V24).

## 4. Gap sản phẩm C00–C27 có bằng chứng fresh

Lần audit này chỉ xác minh các mục có thể kiểm chứng không phá hủy. Không sửa, không chạy migration/restore/load/payment.

### 4.1 P0 — Origin/CSRF bypass kèm fallback Bearer → cookie (ĐÃ SỬA, commit `443b8ac`)

Phát hiện ban đầu (giữ nguyên để đối chiếu) — hai điểm nguồn trong `apps/api/src/server.ts`:

- `server.ts:229` — middleware `/api` bỏ qua kiểm tra `Origin` cho method ghi nếu header `Authorization` bắt đầu bằng `Bearer ` và path thuộc danh sách cho phép (`/applications`, `/ai`, `/pro`, `/datasets`, `/profile`, `/subscriptions`, `/mcp`, `/auth/extension`).
- `server.ts:177-196` — `auth()` xử lý Bearer **chỉ khi grant hợp lệ**; nếu Bearer sai/hết hạn/đã thu hồi thì `grantRes.rowCount === 0` và hàm **rơi tiếp xuống cookie session** ở `server.ts:198` thay vì trả 401.

Chuỗi khai thác suy ra: trình duyệt nạn nhân giữ cookie `jobtrack_session` → trang độc hại gửi POST cross-origin kèm `Authorization: Bearer <bất kỳ>` → kiểm tra Origin bị bỏ qua → Bearer được fallback sang cookie → thao tác ghi chạy bằng session của nạn nhân.

Probe không phá hủy (không dùng credential, không ghi dữ liệu) đã xác nhận nhánh bypass:

| Probe | Kết quả | Kết luận |
| --- | --- | --- |
| A: Origin nước ngoài + **Bearer sai** | `401` | Origin **không** bị chặn (đáng lẽ `403 invalid_origin`) → đã bypass |
| B: Origin nước ngoài + không Bearer | `403` | Origin có hiệu lực khi không có Bearer |
| C: không Origin + không Bearer | `403` | Origin có hiệu lực |

Phạm vi tại thời điểm phát hiện: chưa khai thác với session thật. Đã chứng minh **cơ chế bypass**, chưa chứng minh **tác động thực tế** trên browser thật.

**Trạng thái sau khi sửa (commit `443b8ac`, lane `api`):** Bearer có mặt nhưng không dùng được ⇒ **401**, không bao giờ rơi xuống cookie session. Chọn credential được tách thành policy thuần ở `apps/api/src/security/credential-policy.ts` và có regression test `apps/api/src/credential-policy.test.ts` (6 pass / 0 fail). Kiểm chứng end-to-end trên **DB test `jobtrack_test`** (DB vận hành `jobtrack` không bị chạm), đối chiếu bản chưa sửa với bản đã sửa chạy song song:

| Probe | Bản chưa sửa | Bản đã sửa |
| --- | --- | --- |
| POST cross-origin + Bearer sai + cookie phiên nạn nhân | `422` (đã xác thực!) | **`401`** |
| GET `/api/auth/me` + Bearer sai + cookie phiên hợp lệ | `200` (rơi xuống cookie) | **`401`** |
| POST same-origin + Bearer sai + cookie phiên | `422` (rơi xuống cookie) | **`401`** |
| POST chỉ cookie + Origin hợp lệ | `422` | `422` (không hồi quy) |
| POST cross-origin + không Bearer | `403 invalid_origin` | `403 invalid_origin` (không đổi) |

Bằng chứng đầy đủ: `AUTH-FIX-EVIDENCE.md`. Còn tồn đọng: Origin bypass vẫn dựa trên **hình thức header** chứ không phải grant đã xác thực — cần task riêng, không gộp vào bản sửa này. Bản sửa đã được tích hợp trước review; đây là sai lệch thứ tự quy trình. Review hậu kiểm riêng được yêu cầu trong lượt tiếp theo, xem AUTH-INDEPENDENT-REVIEW.md khi có; không tạo receipt hoặc giả vờ review đã xảy ra trước commit.

### 4.2 Các mục còn lại — xác nhận source, chưa sửa

| ID | Phát hiện | Bằng chứng | Mức |
| --- | --- | --- | --- |
| G-02 | MCP package không có SDK MCP chính thức, chỉ phụ thuộc `pg` | `packages/jobtrack-mcp/package.json` | C14 — cần transport/client matrix |
| G-03 | ATS/cover-letter dùng heuristic chấm điểm từ điểm, không gọi model | `apps/api/src/services/ai-pro-service.ts:122-129` (`score = matchRatio*55 + 25`) | C12 — UI phải phân biệt heuristic vs AI |
| G-04 | Origin bypass ảnh hưởng nhóm route AI/MCP/datasets/subscriptions | `server.ts:235-244` | P0 — đã đóng chain CSRF ở `443b8ac`; còn tồn đọng bypass theo hình thức header |
| G-05 | `check:all` không gọi `agents:test` | `package.json:40` | C20 — controller chưa nằm trong gate chính |
| G-06 | Sandbox probe đã pass nhưng **cách ly đọc chưa có** | `CANARY-EVIDENCE.json` → `V01_readIsolation: false` | **AG02 PARTIAL** — G-A chưa đạt |

Các gap còn lại trong `planning/jobtrack-full-completion/CURRENT-STATE.md` (crawler egress, billing, extension least-privilege, n8n streaming, mutation idempotency) **chưa được kiểm chứng lại** trong lượt này; giữ trạng thái "chưa xác minh", không coi là đã xác nhận lại.

## 5. Trạng thái runtime sản phẩm (đã chạy thật, xem `RUN-STATUS.md`)

| Thành phần | Kết quả |
| --- | --- |
| API | `http://127.0.0.1:64366` → `/api/health` = 200 `{"status":"ok"}` |
| DB readiness | `/api/ready` = 200 `{"status":"ready","version":6}` → Postgres truy cập được, schema v6, **không cần migration** |
| Web | `http://127.0.0.1:64364` → 200, title `JobTrack — Hành trình ứng tuyển`, trang đăng nhập render qua browser |
| Proxy | `apps/web/vite.config.ts:10` proxy `/api` → `127.0.0.1:64366` |

## 6. NOT-RUN trong lượt này

Không chạy và không được coi là đã kiểm chứng: `db:migrate`, `db:restore`, `db:load-test`, `db:backup`, `account:create`, `npm install`, `check:all` đầy đủ, browser E2E, nạp extension lên Chrome, gọi model/n8n, webhook thanh toán, deploy/push.

## 7. Task ready kế tiếp theo thứ tự gate

**Independent review phát hiện thêm:** G-A đang là quy trình, không phải code gate trong controller.run; run chỉ kiểm sandbox launch rồi có thể gọi model. Probe aggregate cũng chưa fail-closed đúng read/network predicates. Do đó operator phải giữ lệnh cấm live dispatch; ưu tiên implementation gate trước mọi pilot. Chi tiết AG00-REVIEW và NEXT-SESSION-RESULTS.

1. **AG01 (maintainer)** — `PERMISSION-MATRIX.md` + `CONTROL-PLANE-ADR.md`, phải khớp với bằng chứng thật: sandbox chặn **ghi** nhưng **không chặn đọc** (worker mở được `.git` common dir, `.env`, `accounts.txt`, sibling worktree, control state). Không được mô tả worker là "không đọc được ngoài quyền" khi điều đó chưa được enforce ở tầng OS.
2. **AG00 đóng** — reviewer độc lập duyệt gap matrix này (brief: `AG00-REVIEW-BRIEF.md`), rồi mới chuyển `TASKS.json` AG00 → `accepted`.
3. **AG02 đóng (PARTIAL)** — probe đã pass nhờ `CODEX_CLI_PATH`; còn lại: cách ly đọc (AG01), egress có positive control (AG07), profile riêng cho check runner, bỏ `liveWorkersVerified: false` hardcode. Ghi rõ phần nào của G-A chưa đạt, không tính là đạt.
4. **Hậu kiểm auth (C03)** — fix443b8ac đã tích hợp; cần review độc lập có phạm vi và giữ residual Origin task riêng, không gọi toàn C03 accepted.
5. AG03–AG09 — chỉ mở sau khi G-A/G-B/G-C đạt.

Không mở live worker, không tự sửa `tools/agent-control/policy.mjs`, không nới sandbox trong lúc chờ G-A đạt.
