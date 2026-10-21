# Prompt chuyển chat và giao việc

## 1. Dán vào chat mới — chỉ tiếp nhận và lập bước tiếp theo

```text
Tôi tiếp tục JobTrack tại D:\Project\Job_Application_Tracker.
Yêu cầu hiện tại: tiếp nhận context và plan phát triển hệ thống agents tự động,
chưa triển khai code hoặc chạy provider/DB trong bước tiếp nhận.

Đọc AGENTS.md và các file tham chiếu, mọi shell command bắt đầu bằng rtk.
Đọc START-NEXT-SESSION.txt/HANDOFF.md trong ZIP rồi:
planning/jobtrack-agent-autonomy/README.md, PLAN.md, ARCHITECTURE.md,
TASKS.json, ACCEPTANCE.md, DEVELOPMENT-PROCESS.md, PROMPTS.md.
Đọc thêm planning/jobtrack-full-completion/CURRENT-STATE.md, DECISIONS.md,
HISTORY.md và PLAN.md để giữ toàn bộ bối cảnh sản phẩm C00–C27.

Tôi muốn orchestrator tự chia feature và viết prompt cho agents con; mỗi feature
một worktree/branch/commit, không ghi hoặc đọc ngoài quyền được giao.
Workers read-only trả proposal; controller là patch writer và commit operator.
Không thêm comment code; không xóa hàng loạt comment cũ. README/AGENTS là hướng
dẫn, quyền phải enforce bằng code cùng OS/sandbox, bảo vệ cả Git common-dir.
Planner→Coder→Checks→Reflector→Independent reviewer→Feature commit;
tối đa3 coder attempts, cùng lỗi2 lần thì dừng, không nới policy.
Tích hợp/push/deploy và DB/payment/ops không tự nằm trong quyền worker.

Đã có tools/agent-control và fixture tests; live Windows sandbox từng lỗi
setup refresh ngay Node probe, chưa có bằng chứng đã sửa. Đọc source mới nhất,
không reset baseline30db3fd hoặc tin mọi PASS cũ là fresh.
Quy trình: Kanban/Agile mặc định, Scrum nếu cần sprint, gate tuần tự cho release;
AI dùng CRISP-DM, Data-Centric và versions Code+Data+Model+Prompt. Dùng API model
không đồng nghĩa cần auto-train/retrain.

Trả lại hiện trạng/gap thực tế, task ready và thứ tự AG00→AG01→AG02 trước live
dispatch. Không đọc dotenv/accounts/keys, không sửa apps/experiences hoặc
AutoProfile Vault, không gọi model/n8n/migrations/restore/load/payment.
HISTORY trong ZIP là tổng hợp, không phải export nguyên văn mọi tin nhắn.
```

## 2. Dùng khi muốn bắt đầu triển khai nền tảng

```text
Triển khai plan planning/jobtrack-agent-autonomy theo từng task, bắt đầu AG00.
Tái sử dụng controller hiện có, chỉ sửa gap có bằng chứng. Giữ plan sản phẩm
C00–C27 và quyết định UI/AI hiện hành; không dựng lại app hoặc cài framework
orchestration/training mới khi chưa chứng minh cần thiết.

Chạy đúng quy tắc AGENTS: rtk, workers read-only, controller áp dụng proposal,
một lane/worktree/branch/task, feature commit riêng; không comment code mới.
AG00–AG02 là maintainer/bootstrap: chưa dispatch live worker khi sandbox chưa đạt
canary. Không tự mở quyền để controller sửa chính policy/control plane. Thay đổi
controller/CI/config/locks/README là maintainer work items riêng, explicit paths
và review; không sửa sibling hoặc secret files.

Sau gate mới dispatch các task ready qua catalog được pin. Max3workers,
WIP1/lane, max3attempts, same failure2stop. Checks/review/commit phải cùng digest.
Không auto integrate/push/deploy. DB/provider/network/ops chỉ dùng target fixture
và runtime/budget đã được giao, thiếu điều kiện ghi BLOCKED/NOT-RUN.
Làm xong mỗi task báo diff/commit/checks+exitcodes/evidence/limitations và cập nhật
registry. Tiếp tục task độc lập được phép; không bịa PASS hoặc chạy vô hạn.
```

Đây là prompt giao phát triển, không phải lệnh chạy nền định kỳ. Để bật L2 batch cần hoàn tất AG11, chốt scope/budget/config hữu hạn và người vận hành có stop/recovery. Không tự tạo automation ở ứng dụng từ tài liệu này.

## 3. Orchestrator tạo task và prompt

```text
Từ mục tiêu đã giao, source hiện tại và acceptance, chọn một gap ready.
Không giao feature ngoài scope. Tạo DAG; schema validate không cycle/overlap,
dependencies phải integrated. Chia maintainer/config/contracts trước consumers.
Ghi task ID, owner role, feature lane, branch/worktree/base, allowed paths,
acceptance, trusted check IDs, evidence, limits và stop/recovery conditions.
Đầu ra có cấu trúc phải tương thích schema controller thật; TASKS.json của plan
là backlog metadata, không truyền nguyên vào CLI như config runnable.
Không gửi secrets hoặc toàn bộ home/workspace cho worker.
```

## 4. Mẫu coding worker

```text
Task: <id / objective / acceptance>
Base/snapshot: <trusted base SHA và digest>
Lane/allowed paths: <explicit paths>
Dependencies đã integrated: <commits>
Checks: <trusted IDs>
Bạn read-only, chỉ trả proposal theo worker.schema.json với beforeSha256 đúng.
Không chạy shell ngoài catalog, không ghi/commit, không thêm comment code,
không đọc sibling/control/Git/secrets. Chỉ sửa nguyên nhân trong scope.
Trả summary và structured changes, nêu evidence/giới hạn. Không tự mở quyền.
```

## 5. Mẫu Reflector từ evidence

```text
Task<id>, attempt<n>, digest<hash>, failure fingerprint<id>.
Phân tích acceptance, diff và log/exitcode thực đính kèm.
Nêu nguyên nhân có bằng chứng, file/hàm cần sửa, thay đổi tối thiểu và check
cần chạy lại. Tách lỗi môi trường khỏi lỗi code; không đổi test/policy để xanh.
Viết prompt sửa chỉ trong lane hiện tại. Cùng fingerprint2lần hoặc đủ3attempts
thì trả STOP với blocker/recovery, không retry hoặc fallback unsandboxed.
```

## 6. Mẫu independent reviewer

```text
Review read-only task<id> trên digest<hash> đã được checks xác minh.
Đối chiếu objective/acceptance/paths, permissions/data/Git/timeout/limits và
bằng chứng. Không dựa vào coder tự nói đã test. Không sửa source trong review.
Trả findings có vị trí/trigger/impact/severity hoặc PASS có giới hạn.
Không cho pass nếu source đổi sau check, fixture bị gọi là live, hoặc policy
bypass. Bất kỳ patch mới nào cũng làm mất hiệu lực verdict này.
```
