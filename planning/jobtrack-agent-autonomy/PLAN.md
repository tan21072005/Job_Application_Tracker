# Kế hoạch phát triển tiếp theo: agents tự động cho JobTrack

Ngày: 2026-10-21. Mục tiêu là tự động hóa **công việc đã được người dùng giao**, từ chia task đến commit feature đã kiểm chứng. Không tự tạo scope sản phẩm mới hoặc để agent tùy ý sửa mọi thứ.

## Mốc bắt đầu và khoảng trống

Đã có controller CLI, roles read-only, worktree/lane lease, proposal validation, fixed checks, digest-bound review, feature commits và guard hook. Tài liệu `docs/agents/IMPLEMENTATION-STATUS.md` ghi live sandbox đang lỗi;21 fixture tests trước đây không chứng nhận chạy end-to-end với model thật.

Phần tiếp theo cần làm: cách ly đọc/ghi mạnh hơn; planner tạo task/prompt có cấu trúc; scheduler bền vững biết DAG và budget; recover crash đúng; kiểm comment/commands đủ chắc; tích hợp có kiểm soát; live canary/pilot; quy trình chất lượng dữ liệu/model/prompt. Không bắt đầu bằng cài thêm nhiều agent frameworks.

## Giai đoạn 1 — làm rõ quyền và sửa môi trường (AG00–AG02)

**AG00:** chụp baseline/diff, audit khả năng controller hiện có theo source và tests. Lập gap matrix: implemented, fixture-tested, live-tested, blocked. Pin version CLI và trusted checks; không mở dotenv/accounts hay gọi provider. Kết quả: backlog và threat assumptions rõ, không viết lại phần đã đạt.

**AG01:** thiết kế capability/ownership và control plane. Tách quyền đọc source, đề xuất patch, chạy checks, ghi Git và vận hành. README/AGENTS phải khớp policy code; registry/Git common directory không nằm trong tầm worker. Xác định lớp OS/sandbox/container thực thi từng giới hạn; câu cấm bằng văn bản không được tính là test denial.

**AG02:** gỡ lỗi Windows sandbox trong task môi trường riêng. Kiểm write/read/network canary bằng dữ liệu giả, child process và timeout. Nếu sandbox hiện tại không đáp ứng một hạn chế, ghi FAIL/BLOCKED và chọn cách ly khác được review; không bật unrestricted fallback. Chưa đạt gate này thì không dispatch live coder.

Gate **G-A:** worker không đọc secrets/control/sibling ngoài brief; không ghi source/Git; check runner không thoát vùng scratch/fixture; egress đúng policy. Có bằng chứng từng denial và khả năng chạy Node/check cần thiết.

## Giai đoạn 2 — feature ownership và giao việc có cấu trúc (AG03–AG05)

**AG03:** hoàn thiện Workspace manager. Một task/feature → một branch/worktree/base/lease. Chặn overlap theo canonical paths; case/rename/links không được lách lane. Shared contracts/config/migrations là task maintainer riêng, tích hợp trước consumers. Worker chỉ thấy snapshot cần thiết; mọi patch qua broker.

**AG04:** Planner nhận mục tiêu user + product acceptance + source evidence; trả DAG gồm các task nhỏ và prompt có objective, allowed paths, checks, dependencies, deliverables và stop conditions. Controller validate schema/DAG/scope trước nhận. Planner không được chọn quyền rộng hơn task gốc, sinh shell tùy ý hoặc giao thêm feature ngoài scope.

**AG05:** thêm scheduler/journal bền vững, tái dùng lease/state hiện tại khi phù hợp. Chỉ chọn task ready có dependency integrated và lane trống; tối đa3 workers,1 task/lane. Tính idempotency cho submit/dispatch/commit để retry không tạo task/worktree/commit trùng. Sau restart đối chiếu PID/run/lease/digest, không tự cướp lease hoặc restart task còn process sống.

State tối thiểu:

```text
backlog → planned → ready → reserved → coding → checking → reviewing
→ feature_committed → awaiting_integration → integrated → accepted

checking/reviewing → reflecting → coding   (trong giới hạn attempts)
mọi trạng thái đang chạy → stopping → stopped hoặc needs_recovery
blocked/needs_recovery không tự retry; abandoned là terminal
```

Journal ghi transition, task/run/base/digest/check/review/commit IDs và lý do; log đã redact. Cần atomic transition và reconciliation, không dựa vào một file status mà agent có thể sửa.

Gate **G-B:** DAG invalid/cyclic/overlapping bị từ chối; dependencies chưa tích hợp không chạy; restart không nhân tác vụ; stale/abandoned task không mutate.

## Giai đoạn 3 — vòng code, kiểm tra, sửa và commit (AG06–AG09)

**AG06:** củng cố Proposal broker. Validate cả batch trước ghi: prior hash, size/paths/link escapes/protected files/secret và comment policy. “Không comment” nghĩa không thêm comment code mới; không xóa hàng loạt comment cũ, không nhầm URL hoặc string chứa `//` với comment. Dùng lexer/parser phù hợp ngôn ngữ thực sự hỗ trợ; ngôn ngữ chưa hỗ trợ không được âm thầm bỏ qua. Thêm crash recovery cho apply dở dang và reject direct edits ngoài broker.

**AG07:** Check executor chạy check IDs từ catalog trusted, không nhận shell từ model. Hash package scripts/locks/catalog trước chạy; sửa dependency/config là maintainer task. Test code có thể thực thi lệnh nên cũng phải sandbox, timeout/process cleanup, env tối thiểu và network/DB target allowlist. Capture exit code/log hash đúng; không coi skipped/timeout là pass.

**AG08:** Reflector dùng acceptance + patch + lỗi thật để tạo prompt sửa cụ thể. Tối đa3 coder attempts/task; cùng fingerprint lỗi2 lần thì dừng. Reviewer run độc lập, đọc đúng digest đã check và kiểm yêu cầu gốc. Thay một byte sau verdict phải invalidate checks/review. Không có đường tự duyệt hoặc sửa test để che lỗi.

**AG09:** Controller tạo commit feature bằng explicit paths sau gate; maintainer tích hợp theo DAG. Không `git add .`, auto push/force push/reset/clean, tự xóa branch/worktree hoặc overwrite conflict. Cần stale-base detection, integration report và regression checks cho base sau merge. Conflict tạo reconciliation task rõ scope, giữ nguyên bằng chứng feature trước đó.

Gate **G-C:** từ proposal đến feature commit tái lập được; malicious paths/commands/comments/secrets/stale hashes bị chặn; commit/check/review cùng digest; thất bại không làm hỏng branch/lane khác hoặc DB gốc.

## Giai đoạn 4 — quy trình phần mềm và AI (AG10)

Phần mềm dùng Kanban/Agile theo backlog; Scrum là cách tổ chức sprint nếu cần, không phải một lớp code phải cài thêm. Dùng gate tuần tự cho migration/release có rủi ro. Definition of Ready/Done và mẫu brief nằm ở DEVELOPMENT-PROCESS.

AI dùng CRISP-DM để giao giả thuyết và đánh giá. Mỗi run ghi **Code SHA + Data/labels hash + Model/provider revision + Prompt/tool schema version**, cost/latency và chất lượng. Ưu tiên cải thiện dữ liệu, extraction và rubric từ lỗi thực; holdout không được dùng để tối ưu.

JobTrack hiện chủ yếu gọi model API. Pipeline đầu tiên là eval → so sánh → review → rollout cấu hình → theo dõi → rollback/experiment. Không tự thêm auto-train/retrain. Chỉ lập phần huấn luyện khi có mô hình thuộc quyền quản lý, dữ liệu được phép, compute budget và acceptance riêng.

Gate **G-D:** một software task và một AI experiment có brief, acceptance, provenance và evidence đầy đủ; không nhầm LLM-as-judge với test quyền/bất biến nghiệp vụ.

## Giai đoạn 5 — pilot, automation có giới hạn và bàn giao (AG11–AG13)

**AG11:** canary trên repo fixture:2 feature không giao nhau chạy song song;1 task shared contract phải tích hợp trước consumer;1 lỗi cố ý đi qua Reflector;1 task bị chặn;1 crash/timeout phải recovery đúng. Sau đó chọn1 task sản phẩm ready từ C00–C27, không tự giao feature mới. Live model chỉ gọi khi runtime và budget đã được giao; thiếu điều kiện thì ghi BLOCKED.

**AG12:** nghiệm thu chế độ tự chạy theo batch. Người dùng giao backlog và giới hạn trước; orchestrator tự chọn task ready, giao worker, kiểm tra, phản hồi và commit trong giới hạn. Mặc định đề xuất: tối đa3 task/batch,3 workers,20 phút/task,60 phút/batch,3 coder attempts/task và dừng cùng lỗi2 lần. Các con số là cấu hình cần validate và chốt trước khi chạy; không thay enforcement bằng prompt. Ngân sách provider phải có giá trị hữu hạn do chủ vận hành cấp; thiếu budget thì chỉ chạy fixture, không gọi trả phí.

Batch kết thúc khi hết task ready, gặp blocker, hết budget/thời gian hoặc có stop request. Không polling/chạy vô hạn, không tự giải phóng needs_recovery. Chưa auto integrate/push/deploy. Muốn chạy nền định kỳ là bước vận hành riêng, opt-in sau pilot; lượt lập plan này không tạo scheduler/automation trong ứng dụng.

**AG13:** status/report/stop và package context. Có CLI quan sát tasks/leases/checks/cost/blockers và đường dẫn evidence; giao diện dashboard chỉ làm nếu có task riêng. Stop nhận ngay, dừng dispatch mới, đóng worker con an toàn, giữ journal. Handoff có trạng thái từng task, commits/worktrees, limits, next ready tasks và manifest; không chứa credential/raw CV/DB dump.

Gate **G-E:** một batch live có evidence end-to-end, audit chỉ ra ai giao/đề xuất/check/review/commit từng thay đổi; operator dừng/khôi phục được. Không còn denial test bắt buộc thất bại. Chưa qua gate thì chỉ gọi là prototype/fixture-tested, không “autonomous production”.

## Mức tự động hóa và quyền

| Mức | Cho phép | Điều kiện |
| --- | --- | --- |
| L0 — Plan/fixture | Read-only audit, schema và fixture tests | Mặc định hiện tại, không provider/DB gốc |
| L1 — Feature có giám sát | Một task đã giao, worktree riêng, tự sửa trong loop và commit local | G-A/G-B/G-C đạt, runtime/budget/checks được cấp |
| L2 — Batch tự điều phối | Chọn task ready trong backlog đã duyệt, tối đa giới hạn; feature commits riêng | G-D/G-E đạt, operator có stop/recovery |
| L3 — Tích hợp/phát hành | Promotion/merge/deploy hoặc thao tác vận hành | Chưa nằm trong mặc định; cần policy và gate riêng do người dùng giao |

AI full control trên website không đồng nghĩa coding agent full control OS. Các quyền được xét theo từng hệ thống và từng task.

## Bước đầu tiên cho chat mới

Đọc context → AG00 audit → AG01 thiết kế quyền → AG02 sandbox canary. Sau đó mới mở dispatch live và AG03–AG09. Dùng PROMPTS để giao việc; chưa cần cài thêm repo/modeltraining framework hoặc viết lại controller. Không khẳng định tình trạng live đã thay đổi nếu chưa có probe mới.
