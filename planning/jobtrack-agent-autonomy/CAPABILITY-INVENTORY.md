# AG00 — Capability inventory (quyền thực tế của từng vai trò)

Ngày: 2026-10-21. Mô tả **quyền đã được enforce bằng code** trong `tools/agent-control`, kèm trạng thái enforce của OS. Không suy ra quyền từ README.

Nguồn: `tools/agent-control/policy.mjs`, `tools/agent-control/controller.mjs`, `tools/agent-control/cli.mjs`.

## 1. Bảng vai trò → quyền → nơi enforce

| Vai trò | Được làm | Không được làm | Enforce tại | Loại kiểm chứng |
| --- | --- | --- | --- | --- |
| Orchestrator | Chọn task ready, giao lane, ghép DAG | Tự mở rộng quyền, tự đổi policy | `cli.mjs` validateTask + `dispatch` (unique id/feature, concurrency 1–3, ≤20 task, dependency phải integrated) | fixture |
| Planner | Trả plan/prompt có cấu trúc | Sinh shell tùy ý, chọn quyền rộng hơn | Có role planner trong loop; chưa có module tạo/validate task DAG đầy đủ (AG04) | chưa có |
| Coding worker | Hiện đọc worktree, trả change JSON; projection là thiết kế tương lai | Không ghi/commit; shell ngoài catalog là quy tắc chưa intercept mọi tool | read-only profile + schema + broker; read isolation chưa đạt | fixture; **cấm live theo quy trình, chưa có G-A code gate** |
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

Điểm yếu còn lại: đây là **kiểm tra ở tầng code của broker**, không phải ACL của OS. Canary worker dùng identity CodexSandboxOffline nhưng vẫn mở được một số file repo ngoài lane. Identity khác tên không tự chứng minh cách ly đọc; phải đo permission thực tế.

## 4. Nội dung proposal (`policy.mjs:133-159`)

| Kiểm tra | Giá trị | Ghi chú |
| --- | --- | --- |
| Số file trong batch | 1–20 | batch > 20 bị từ chối |
| Shape mỗi change | đúng 3 key `beforeSha256`, `content`, `path` | key lạ → từ chối |
| `beforeSha256` | `null` hoặc sha256 hex 64 ký tự | phải khớp hash byte thực tế, lệch → `Stale or incorrect before hash` |
| Kích thước | ≤256 KiB/file, ≤2 MiB/tổng batch | chống patch quá lớn |
| Path trùng | so sánh không phân biệt hoa thường | chặn ghi 2 lần cùng file |
| Secret trong nội dung | `-----BEGIN ... PRIVATE KEY-----`, `jt_sec_*`, `sk-*`, `gh*_token`, `github_pat_*`, `AKIA*`, và cặp `api_key|access_token|client_secret|password` + giá trị ≥12 ký tự trong quotes | heuristic, không phải DLP hoàn chỉnh |
| Comment mới | lexer tự viết cho `js/ts/jsx/tsx/mjs/cjs/mts/cts/css/html`; comment xuất hiện trong bản mới phải đã có trong bản cũ | **Khoảng trống đã biết (AG06):** `.sql`, `.py`, `.md`, `.json`, `.yml` không được quét → comment mới trong ngôn ngữ chưa hỗ trợ bị bỏ qua âm thầm |
| Comment cũ | policy hiện không chặn xóa comment cũ; việc cấm xóa hàng loạt cần reviewer kiểm tra | không được coi là enforcement đầy đủ của D10 |

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

Không có các Git mutation trong allowlist của broker. Đây chỉ là gate cho nơi gọi assertSafeCommand; không chứng minh mọi tool/shell của worker bị intercept. V18 ở tầng OS vẫn cần canary; không ghi PASS toàn cục từ catalog.

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

## 8. Enforce của OS — evidence hiện hành

Nguồn canary: CANARY-EVIDENCE.json; không chạy lại script mở file credential thật trong lượt review. Doctor bằng CLI app được xác minh riêng với canary đọc/ghi.

| Lớp | Trạng thái đo được | Giới hạn |
| --- | --- | --- |
| Sandbox helper | PASS qua CLI ứng dụng do CODEX_CLI_PATH chọn | Không chứng nhận worker/model hoặc toàn bộ G-A |
| Worker read-only chặn ghi trong/ngoài checkout | PASS theo canary đã ghi | Cần revalidate sau đổi profile/version |
| Worker chặn đọc Git/credential/sibling/control | FAIL theo canary đã ghi | Có identity riêng nhưng vẫn có quyền mở; không đọc giá trị secrets để review |
| Home SSH | DENIED theo canary | Không suy ra mọi credential store đều bị chặn |
| Egress | INCONCLUSIVE: host và sandbox cùng TIMEOUT | Cần host positive control tới đích do test kiểm soát |
| Check runner :workspace | FAIL confinement theo canary: ghi được ngoài checkout | Cần execution profile riêng, không tái dùng profile rộng |
| Child cleanup | Canary tiến trình con đơn lẻ được dọn | Chưa chứng minh toàn cây nhiều tầng hay mọi nhánh controller timeout |
| Git common-dir | FAIL read isolation | Broker path policy không phải OS read ACL |

Kết luận: G-A chưa đạt vì read isolation/check-runner confinement/egress còn thiếu. Lý do chặn live hiện tại không còn là cần elevated hay cần uninstall. Xem CONTROL-PLANE-ADR.md và PERMISSION-MATRIX.md cho quyết định thiết kế; chưa coi thiết kế là implementation.

**Blocker mới do independent review:** controller.run hiện chỉ kiểm Node-version sandbox probe rồi có thể gọi planner; không validate isolation receipt/G-A. Vì vậy “không live dispatch” là cấm theo quy trình, **chưa enforce bằng code**. Doctor hardcode liveWorkersVerified:false không ngăn run. Trước live cần gate fail-closed bound executable/policy/profile/projection/expiry và evidence độc lập.

**Probe chưa đủ làm acceptance gate:** probe.ps1 aggregate hiện bỏ egress khỏi gateA, coi kết quả host/sandbox khác nhau là denial, thiếu controlState/Git-config trong aggregate và chưa validate đầy đủ missing fields. Cần task sửa schema/predicates/positive control, dùng fake-only targets; không coi exit0 của script hiện tại là chứng nhận G-A.

## 9. Khoảng trống đã ghi nhận (đưa vào AG03–AG09)

| ID | Khoảng trống | Task |
| --- | --- | --- |
| C-1 | Worker write denial đã đo; read isolation fail, egress inconclusive và check runner quá rộng | AG02 |
| C-2 | Comment policy bỏ sót ngôn ngữ chưa hỗ trợ (`.sql`, `.py`, `.md`, `.yml`, `.json`) | AG06 |
| C-3 | Có planner role; chưa có task-DAG planner/validator, scheduler/journal bền vững và budget cap đầy đủ | AG04, AG05 |
| C-4 | Chưa có crash recovery journal atomic cho apply dở dang | AG06 |
| C-5 | Đã có canary giới hạn; cần fake-only targets, positive control, fail-closed missing fields và process-tree đầy đủ | AG02, AG11 |
| C-6 | `check:all` không gọi `agents:test` | C20 |
| C-7 | Secret detection là heuristic, chưa có scan Git history | C25 |
