# AG00 — brief review độc lập hiện hành

Mốc2026-10-21. Base candidate:e60185a; xem diff tài liệu reconciliation trong worktree maintainer.9dc80e0/7284202/30db3fd là các mốc lịch sử, không yêu cầu HEAD hiện tại bằng mốc cũ. Review phải ghi SHA256 của bytes thực sự đọc; không tự review nội dung do mình viết.

## Scope

BASELINE-GAPS, CAPABILITY-INVENTORY, RUN-STATUS, SANDBOX-READINESS, AG02-RUNBOOK, CANARY-EVIDENCE, TASKS và plan/architecture/acceptance. Review hậu kiểm auth có báo cáo riêng; AG00 chỉ chấp nhận audit đầy đủ/trung thực, không chứng nhận G-A hoặc toàn bộ sản phẩm đã đạt.

Mỗi claim dùng agree/disagree/unverifiable, phân biệt historical/observed-source/executed-current. Không mở dotenv/accounts/key hoặc chạy probe mở file credential thật. Không account-create, DB writes/testsuite DB, provider/n8n/payment/migrate/restore/load/push.

## Checklist C1–C18

| ID | Kiểm chứng |
| --- | --- |
| C1 | Historical baseline và current HEAD/worktrees/tracked/untracked/remote/stash phân biệt rõ; không reset |
| C2 | Chạy agents:test nếu được phép, ghi count/exit/time hiện tại, không ép21 |
| C3 | Registry current; phân biệt prepared/running/abandoned, cleanup qua controller không sửa state tay |
| C4 | Doctor chỉ là sandbox launch probe; ghi execution token/context và code, không nhầm nested87 với host failure |
| C5 | RTK comparison chỉ nhận historical nếu không tái lập host-direct; không giả fresh |
| C6 | Identity/elevation theo token đo được; tài khoản tồn tại không chứng minh ACL isolation |
| C7 | Canonical invalidBearer401/noBearer403 không cookie chỉ chứng minh routing; patch source/tests và old DB evidence có provenance |
| C8 | MCP dependencies không SDK; không suy giao thức chắc chắn không tương thích |
| C9 | ATS scoring/template heuristic theo source, không gọi là model output |
| C10 | check:all thiếu agents:test theo root scripts |
| C11 | Broker rules không tự chặn mọi read/shell; run chưa enforce G-A phải nêu |
| C12 | Comment extension coverage thiếu; prose Markdown khác code comments, JSON chuẩn không comment; xóa comment cũ chưa enforce |
| C13 | Không claims fixture→live; có planner role nhưng chưa module DAG đầy đủ |
| C14 | HTTP ready/web/proxy khác browser-render/PID snapshot; không restart/kill app |
| C15 | CLI PATH/app có versions/context; host probe khác nested-token |
| C16 | Không có evidence cần uninstall; không uninstall/elevated để review. ACL repair quản trị trước đó là sự kiện riêng, không nói chưa từng elevated |
| C17 | Recorded read isolation FAIL; chặn live theo quy trình, code gate chưa có; không mở secrets |
| C18 | Egress inconclusive; probe predicates thiếu, cần missing-fields fail-closed/positive control |

## Output

Reviewer trả Markdown để maintainer lưu AG00-REVIEW.md: reviewer/run, base/current hashes, commands+exit/results, verdict, allC1–C18, findings severity/location/trigger/impact, limitations. Không sửa source/docs/registry hoặc commit.

Còn P1 làm audit sai/thiếu thì FAIL và delta review sau sửa. Audit trung thực có thể PASS_WITH_LIMITS trong khi G-A vẫn blocked và code findings là task mở. Chỉ sau verdict mới maintainer chuyển AG00.status accepted như cập nhật hành chính, ghi reviewed status hash/provenance; không giả hash registry còn giống sau sửa status.

Không tạo machine receipt từ Markdown hoặc rewrite lịch sử thành review đã xảy ra trước integration. Sửa source phải check/review lại đúng digest.
