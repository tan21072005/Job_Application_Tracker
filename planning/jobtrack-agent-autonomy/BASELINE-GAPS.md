# AG00 — Baseline và gap matrix (kiểm kê tại source)

Ngày kiểm kê: 2026-10-21. Lượt này là **audit read-only** của controller/policy/source hiện tại, không sửa code sản phẩm, không dispatch worker, không đọc secret, không gọi provider hay DB ghi.

Mọi mục dưới đây là kết quả đo **fresh trong phiên này**, không phải báo cáo lịch sử được trích lại.

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

### 2.1 Cô lập nguyên nhân sandbox (bằng chứng mới, loại bỏ nghi vấn cũ)

Lỗi trước đây được ghi nhận ở mọi lần probe; nghi vấn là chính `rtk` làm nhiễu stderr. Đã chạy hai lệnh giống hệt nhau, chỉ khác tiền tố:

```text
codex sandbox --permission-profile :read-only -C <repo> -- node --version
  -> exit 1, windows sandbox failed: helper_unknown_error: setup refresh had errors

codex sandbox --permission-profile :read-only -C <repo> -- rtk proxy node --version
  -> exit 1, windows sandbox failed: helper_unknown_error: setup refresh had errors
```

Kết luận: **RTK không phải nguyên nhân.** Lỗi nằm ở helper sandbox Windows của Codex CLI, bước "setup refresh" (thiết lập/refresh tài khoản và quy tắc mạng machine-wide).

Trạng thái tài khoản sandbox trên host:

```text
CodexSandboxOffline  Enabled=True  LastLogon=10/21/2026 11:32
CodexSandboxOnline   Enabled=True  LastLogon=<never>
Group: CodexSandboxUsers ("Codex sandbox internal group (managed)")
Phiên hiện tại: pc\admin — isAdmin: False (không elevated)
```

Giả thuyết nguyên nhân đã đủ bằng chứng để kiểm chứng ở AG02: bước setup refresh cần **phiên elevated** để quản lý tài khoản machine-wide; phiên hiện tại không elevated nên helper báo `helper_unknown_error`. Hệ quả: cần chạy lại probe trong một phiên Administrator (hoặc dùng `codex sandbox uninstall` để dọn trạng thái cũ rồi setup lại) — **đây là thao tác host-level ngoài workspace, phải do người duy trì thực hiện và review**, không tự động nới sandbox.

## 3. Gap matrix nền tảng agents

| Nhóm | Implemented | Fixture-tested | Live-tested | Blocked |
| --- | --- | --- | --- | --- |
| Worktree/branch riêng theo task | có | có (21/21) | không | — |
| Lane lease + chặn overlap | có | có | không | — |
| Proposal broker (path/hash/secret/comment/size) | có | có | không | — |
| Check executor gắn digest | có | có (injected check) | không | cần sandbox |
| Reviewer độc lập + digest binding | có | có | không | cần sandbox |
| Attempt limit / same-failure stop | có | có | không | — |
| Feature commit explicit paths | có | có | không | — |
| Crash recovery / atomic journal | một phần | một phần | không | chưa có evidence |
| Scheduler DAG / nextReady / budget | chưa có | — | — | AG05 |
| Planner tạo DAG + prompt schema | chưa có | — | — | AG04 |
| Canary read/write/egress/timeout | chưa có | — | **không** | **AG02 / BLOCKED** |
| Batch tự chạy + stop | chưa có | — | — | AG12 |
| Mức hiện tại | **L0 (plan/fixture)** | — | — | chưa đạt L1 |

Kết luận mức: hệ thống **chưa được chứng nhận live**. 21/21 fixture pass chỉ chứng minh policy logic đúng với worker/check giả lập; không suy ra provider hay sandbox chạy được (V24).

## 4. Gap sản phẩm C00–C27 có bằng chứng fresh

Lần audit này chỉ xác minh các mục có thể kiểm chứng không phá hủy. Không sửa, không chạy migration/restore/load/payment.

### 4.1 P0 — Origin/CSRF bypass kèm fallback Bearer → cookie (XÁC NHẬN LIVE)

Hai điểm nguồn trong `apps/api/src/server.ts`:

- `server.ts:229` — middleware `/api` bỏ qua kiểm tra `Origin` cho method ghi nếu header `Authorization` bắt đầu bằng `Bearer ` và path thuộc danh sách cho phép (`/applications`, `/ai`, `/pro`, `/datasets`, `/profile`, `/subscriptions`, `/mcp`, `/auth/extension`).
- `server.ts:177-196` — `auth()` xử lý Bearer **chỉ khi grant hợp lệ**; nếu Bearer sai/hết hạn/đã thu hồi thì `grantRes.rowCount === 0` và hàm **rơi tiếp xuống cookie session** ở `server.ts:198` thay vì trả 401.

Chuỗi khai thác suy ra: trình duyệt nạn nhân giữ cookie `jobtrack_session` → trang độc hại gửi POST cross-origin kèm `Authorization: Bearer <bất kỳ>` → kiểm tra Origin bị bỏ qua → Bearer được fallback sang cookie → thao tác ghi chạy bằng session của nạn nhân.

Probe không phá hủy (không dùng credential, không ghi dữ liệu) đã xác nhận nhánh bypass:

| Probe | Kết quả | Kết luận |
| --- | --- | --- |
| A: Origin nước ngoài + **Bearer sai** | `401` | Origin **không** bị chặn (đáng lẽ `403 invalid_origin`) → đã bypass |
| B: Origin nước ngoài + không Bearer | `403` | Origin có hiệu lực khi không có Bearer |
| C: không Origin + không Bearer | `403` | Origin có hiệu lực |

Phạm vi: chưa khai thác với session thật (phiên này không có và không được tạo tài khoản). Đã chứng minh **cơ chế bypass**, chưa chứng minh **tác động thực tế** trên browser thật. Task C03 cần regression khóa cả hai điểm: (1) Origin check không được bỏ qua chỉ vì có header Bearer; (2) Bearer không hợp lệ phải trả 401 chứ không fallback sang cookie. Không dùng fallback im lặng.

### 4.2 Các mục còn lại — xác nhận source, chưa sửa

| ID | Phát hiện | Bằng chứng | Mức |
| --- | --- | --- | --- |
| G-02 | MCP package không có SDK MCP chính thức, chỉ phụ thuộc `pg` | `packages/jobtrack-mcp/package.json` | C14 — cần transport/client matrix |
| G-03 | ATS/cover-letter dùng heuristic chấm điểm từ điểm, không gọi model | `apps/api/src/services/ai-pro-service.ts:122-129` (`score = matchRatio*55 + 25`) | C12 — UI phải phân biệt heuristic vs AI |
| G-04 | Origin bypass ảnh hưởng nhóm route AI/MCP/datasets/subscriptions | `server.ts:235-244` | P0, nằm trong 4.1 |
| G-05 | `check:all` không gọi `agents:test` | `package.json:40` | C20 — controller chưa nằm trong gate chính |
| G-06 | Sandbox live chưa dùng được | `doctor` probe | **AG02 BLOCKED** |

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

1. **AG02 (maintainer, host-level)** — probe lại `codex sandbox` trong phiên **elevated**; nếu vẫn lỗi thì `codex sandbox uninstall` rồi setup lại; ghi `CANARY-EVIDENCE.json` với read/write/egress/timeout bằng dữ liệu giả. Đây là mốc chặn duy nhất cho live dispatch.
2. **AG01 (maintainer)** — `PERMISSION-MATRIX.md` + `CONTROL-PLANE-ADR.md`, khớp với bằng chứng sandbox thực tế ở mục 2.1.
3. **AG00 đóng** — cập nhật `TASKS.json` (AG00 → `accepted`) khi có review độc lập cho gap matrix này.
4. AG03–AG09 — chỉ mở sau khi G-A/G-B/G-C đạt.

Không mở live worker, không tự sửa `tools/agent-control/policy.mjs`, không nới sandbox trong lúc chờ AG02.
