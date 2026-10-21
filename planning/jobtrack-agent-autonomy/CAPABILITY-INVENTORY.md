# AG00 — Capability inventory (quyền thực tế của từng vai trò)

Ngày: 2026-10-21. Mô tả **quyền đã được enforce bằng code** trong `tools/agent-control`, kèm trạng thái enforce của OS. Không suy ra quyền từ README.

Nguồn: `tools/agent-control/policy.mjs`, `tools/agent-control/controller.mjs`, `tools/agent-control/cli.mjs`.

## 1. Bảng vai trò → quyền → nơi enforce

| Vai trò | Được làm | Không được làm | Enforce tại | Loại kiểm chứng |
| --- | --- | --- | --- | --- |
| Orchestrator | Chọn task ready, giao lane, ghép DAG | Tự mở rộng quyền, tự đổi policy | `cli.mjs` validateTask + `dispatch` (unique id/feature, concurrency 1–3, ≤20 task, dependency phải integrated) | fixture |
| Planner | Trả plan/prompt có cấu trúc | Sinh shell tùy ý, chọn quyền rộng hơn | Chưa có module planner (AG04) | chưa có |
| Coding worker | Đọc snapshot, trả change JSON | Ghi file, commit, chạy shell ngoài allowlist | `codex exec --sandbox read-only` + `worker.schema.json` + `assertChangeSet` | fixture; **live blocked** |
| Reflector | Đọc log/diff, viết prompt sửa | Sửa test/policy để xanh | Giới hạn attempt + fingerprint trong controller | fixture |
| Reviewer độc lập | Đọc diff cùng digest, trả verdict | Sửa source, tự duyệt | Verdict gắn digest; đổi byte → mất hiệu lực | fixture |
| Controller/broker | Ghi patch, chạy check, commit feature | Push/merge/reset/clean/rebase | `policy.mjs` + `controller.mjs`; allowlist lệnh | fixture; **live blocked** |
| Maintainer | Tích hợp, migration, CI, policy, phát hành | — | Ngoài phạm vi agent; phải là work item riêng, explicit paths | thủ công |

## 2. Lane ownership (enforce bằng prefix, `policy.mjs:5-11`)

| Lane | Đường dẫn ghi duy nhất |
| --- | --- |
| `web` | `apps/web/src/` |
| `api` | `apps/api/src/` |
| `extension` | `packages/jobtrack-extension/` |
| `mcp` | `packages/jobtrack-mcp/src/` |
| `contracts` | `packages/jobtrack-contract/src/` |

Path nằm ngoài prefix của lane → `fail('Path is outside feature ownership')`.

## 3. Path và identity protection (`policy.mjs:15-56`)

| Loại | Quy tắc | Ví dụ bị chặn |
| --- | --- | --- |
| Tên file bảo vệ | `agents.md`, `readme*`, `package.json`, mọi lockfile, `.env*`, `*.pem/key/p12/pfx`, `credentials*`, `secrets*`, `accounts*.txt`, `id_rsa`, `id_ed25519` | `apps/api/src/.env`, `accounts.txt` |
| Thư mục bảo vệ (bất kỳ segment nào) | `.git`, `.agents`, `.codex`, `.claude`, `.aws`, `node_modules`, `agent-control`, `migrations` | `.git/config`, `agent-control/policy.mjs` |
| Dạng đường dẫn | NFC, relative, ≤240 ký tự, không `..`, không ký tự Windows cấm, không tên reserved (`con`, `prn`, `aux`, `com1`…), không kết thúc `.`/` ` | `apps\..\..\.git\config` |
| Case | So khớp tên thực tế trên đĩa, phân biệt hoa thường | `Apps/API/src/x.ts` khi thực tế là `apps/api/src/x.ts` |
| Symlink / junction | Chặn ở mọi ancestor lẫn target | junction trỏ ra ngoài worktree |
| Hardlink | Chặn file có `nlink > 1` | alias sang file ngoài lane |
| Escape worktree | So `realpath` với root worktree | link ra `C:\` |

Điểm yếu còn lại: đây là **kiểm tra ở tầng code của broker**, không phải ACL của OS. Worker chạy dưới cùng tài khoản host nên nếu có shell tự do vẫn đọc được `.git` và file ngoài lane.

## 4. Nội dung proposal (`policy.mjs:133-159`)

| Kiểm tra | Giá trị | Ghi chú |
| --- | --- | --- |
| Số file trong batch | 1–20 | batch > 20 bị từ chối |
| Shape mỗi change | đúng 3 key `beforeSha256`, `content`, `path` | key lạ → từ chối |
| `beforeSha256` | `null` hoặc sha256 hex 64 ký tự | phải khớp hash byte thực tế, lệch → `Stale or incorrect before hash` |
| Kích thước | ≤256 KiB/ngày, ≤2 MiB/tổng batch | chống patch quá lớn |
| Path trùng | so sánh không phân biệt hoa thường | chặn ghi 2 lần cùng file |
| Secret trong nội dung | `-----BEGIN ... PRIVATE KEY-----`, `jt_sec_*`, `sk-*`, `gh*_token`, `github_pat_*`, `AKIA*`, và cặp `api_key|access_token|client_secret|password` + giá trị ≥12 ký tự trong quotes | heuristic, không phải DLP hoàn chỉnh |
| Comment mới | lexer tự viết cho `js/ts/jsx/tsx/mjs/cjs/mts/cts/css/html`; comment cũ phải còn trong file cũ | **Khoảng trống đã biết (AG06):** `.sql`, `.py`, `.md`, `.json`, `.yml` không được quét → comment mới trong ngôn ngữ chưa hỗ trợ bị bỏ qua âm thầm |
| Comment cũ | không bị xóa hàng loạt (chỉ yêu cầu comment mới không xuất hiện) | đúng D10 |

## 5. Lệnh được phép (`policy.mjs:161-170`)

Allowlist là **argv chính xác**, không phải pattern:

```text
node --version
git status | git status --short | git status --porcelain=v1
git diff | git diff --stat | git diff --check | git diff --name-only
git log -5 --oneline | git show --stat HEAD
git rev-parse HEAD | git rev-parse --show-toplevel
```

Mọi argv khác bị từ chối, kể cả khi khác 1 ký tự. Arg chứa `\x00-\x1f`, `;`, `|`, `&`, backtick, `$`, `<`, `>` bị từ chối trước khi so khớp — chặn shell wrapper, pipe, redirection, command substitution.

Không có `git add`, `git commit`, `git push`, `git merge`, `git reset`, `git clean`, `git rebase` trong allowlist → worker không có đường thực thi các thao tác này (V18 đạt ở tầng catalog).

## 6. Kiểm tra commit và evidence (`controller.mjs`)

| Cơ chế | Hành vi | Fixture |
| --- | --- | --- |
| Digest binding | check và review phải cùng digest với source được commit | có |
| Manual apply+check không đủ commit | thiếu review receipt độc lập → không commit được | có |
| Attempt limit | tối đa 3 lần sửa/task | có |
| Same-failure stop | cùng fingerprint lỗi 2 lần → dừng | có |
| Source change giữa review | verdict cũ mất hiệu lực | có |
| Protected check script đổi | chặn check và commit | có |
| Dependency chưa integrated | chặn consumer | có |
| Abandoned task | không apply/check được sau khi lane chuyển owner | có |
| Manual edit ngoài broker | bị chặn | có |

## 7. CLI surface (`cli.mjs:15-40`)

```text
doctor | prepare | status | apply | check | commit | run | dispatch | guard | abandon
```

`dispatch` chặn: concurrency không phải 1–3, >20 task, trùng `id`, trùng `feature`, và task có dependency nằm trong cùng batch (phải integrate trước).

## 8. Enforce của OS — trạng thái thật

| Lớp | Kỳ vọng | Trạng thái |
| --- | --- | --- |
| OS/sandbox chặn đọc sibling/control/Git/home secret | bắt buộc cho worker | **CHƯA ĐẠT** — `codex sandbox` lỗi `helper_unknown_error: setup refresh had errors` (xem `BASELINE-GAPS.md` §2.1) |
| OS chặn ghi ngoài checkout | bắt buộc | **CHƯA ĐẠT** — cùng lý do |
| OS chặn egress | bắt buộc | **CHƯA ĐẠT** — cùng lý do |
| Check runner không có host secret / production DB | bắt buộc | code có env tối thiểu; **chưa chứng minh bằng canary** |
| Timeout + dọn process con | bắt buộc | controller có timeout; **chưa có evidence live** |
| Bảo vệ Git common-dir ngoài tầm worker | bắt buộc | `.git` bị chặn ở tầng path; **chưa có ACL OS** |

Kết luận: lớp 2 (policy code) đã có regression thật; **lớp 3 (OS/sandbox) đang BLOCKED**, nên mọi claim "worker không đọc/ghi được ngoài quyền" hiện chỉ là quy ước, không phải denial test. Đây là lý do AG02 là cổng chặn duy nhất trước live dispatch.

## 9. Khoảng trống đã ghi nhận (đưa vào AG03–AG09)

| ID | Khoảng trống | Task |
| --- | --- | --- |
| C-1 | Chưa có OS denial thật cho đọc/ghi/egress; sandbox lỗi | AG02 |
| C-2 | Comment policy bỏ sót ngôn ngữ chưa hỗ trợ (`.sql`, `.py`, `.md`, `.yml`, `.json`) | AG06 |
| C-3 | Chưa có planner module, DAG validator, scheduler/journal, budget cap | AG04, AG05 |
| C-4 | Chưa có crash recovery journal atomic cho apply dở dang | AG06 |
| C-5 | Chưa có canary read/write/egress/timeout độc lập | AG02, AG11 |
| C-6 | `check:all` không gọi `agents:test` | C20 |
| C-7 | Secret detection là heuristic, chưa có scan Git history | C25 |
