# Prompt sử dụng trong chat mới và khi triển khai

Các prompt không chứa secrets. Chọn đúng chế độ; việc nhận ZIP tự nó không cho phép chạy migration, thanh toán, deploy hoặc sửa workflow đang hoạt động.

## 1. Tiếp nhận context, chưa code

```text
Tôi tiếp tục dự án JobTrack tại D:\Project\Job_Application_Tracker.
Đây là yêu cầu tiếp nhận context, chưa triển khai tính năng.
Đọc AGENTS.md và các file mà nó tham chiếu; mọi shell command bắt đầu bằng rtk.
Đọc gói ZIP đính kèm: START-NEXT-SESSION.txt, HANDOFF.md rồi
planning/jobtrack-full-completion/README.md, CURRENT-STATE.md, DECISIONS.md,
PLAN.md, SCOPE-ACCEPTANCE.md, TASKS.json, EVIDENCE-REGISTER.md và HISTORY.md.
HISTORY là bản tổng hợp lịch sử, không phải export nguyên văn đầy đủ.
Đối chiếu source/Git hiện tại với manifest; baseline đã ghi là main tại 30db3fd,
không reset về đó và không ghi đè thay đổi mới. Không đọc dotenv/accounts/keys.
T01–T10, API44/Web34 PASS là báo cáo lịch sử, không phải fresh pass.
Agents fixture21tests pass, live sandbox setup refresh đang bị chặn.
Trả lại phạm vi phát hành, khác biệt thực tế, blocker, và task ready tiếp theo.
Không chạy tests DB, migrations, account:create, restore/load, n8n/model,
thanh toán, install hoặc deploy chỉ để tiếp nhận.
```

## 2. Bắt đầu hoàn thiện dự án theo plan

```text
Hãy hoàn thiện JobTrack theo planning/jobtrack-full-completion/PLAN.md và
SCOPE-ACCEPTANCE.md, bắt đầu C00. Dùng source mới nhất thay vì tin mọi claim cũ.
Tận dụng phần code đã đúng, chỉ sửa các khoảng trống được kiểm chứng.
Đọc AGENTS.md; giữ tiếng Việt/sáng-xanh/Noto Sans, coverage 33 màn hình,
ưu tiên việc cần làm/deadline/phỏng vấn và cập nhật nhanh trên mobile dưới20hồ sơ.
AI full control theo quyền user; không giới hạn thành chỉ đọc nhưng phải owner
isolation/revoke/idempotency/auth tương đương UI. Native n8n chat được ưu tiên,
workflow JobTrack riêng, không sửa workflow Toán học. Secrets chỉ ở backend/n8n.
Điều phối Planner→Coder→Checks→Reflector→Reviewer; một feature/worktree/branch
và commit riêng, không ghi chéo. Không thêm comment code. Tối đa3attempts,
cùng lỗi2lần thì dừng với evidence. Không tự push/merge hoặc hạ sandbox/policy.
Controller hiện chưa chạy live; hoàn tất C01 trước dispatch workers thực.
Các phần maintainer-only và sharedcontract tách task, integrate trước consumer.
Giữ DB jobtrack gốc. Test ghi DB chỉ trên database fixture đã xác minh target;
migration/restore/load cần preflight riêng. Không killport hoặc gọi payment thật.
Không sửa apps/experiences hoặc AutoProfile Vault trong release này.
Tiếp tục công việc được phép cho đến khi tiêu chí đạt; nếu bị chặn, ghi NOT-RUN
và chuyển việc độc lập, không giả lập PASS. Báo file/commit/tests/evidence/giới hạn.
```

Prompt này giao việc phát triển theo release scope; không tự cho phép public deploy, gửi email/ứng tuyển bên ngoài, chuyển tiền, công bố repo có legacy secrets hoặc truy cập dự án độc lập.

## 3. Orchestrator / Planner

```text
Vai trò: điều phối, không viết code chung với các worker.
Đầu vào: mục tiêu user, DECISIONS, task registry, Gitdiff, source và evidence.
Chọn task có dependencies integrated, acceptance rõ và lane chưa có lease.
Đối chiếu TASKS.json; task đa lane phải tách. Cấu hình/migrations/CI/policy do
maintainer xử lý riêng, không mở rộng worker policy để chạy cho được.
Tạo task file đúng worker.schema/controller schema đang dùng với id, feature,
objective, acceptance, checks, dependencies. TASKS.json của plan có thêm metadata,
không truyền nguyên cả backlog vào controller.
Chỉ dùng logical check names đã có trong controller; không suy ra arbitraryshell.
Giao prompt cụ thể gồm basecommit/worktree/allowedpaths/expectedbehavior/
forbiddenpaths/testdata/checks/evidence. Kiểm canaryC01 trước live dispatch.
Worker read-only, trả proposal; controller là patchwriter/commit operator.
Không assign2workers cùng lane/server.ts. Mỗi integration phải refresh base.
Đầu ra: task đang chạy, lý do chọn, phụ thuộc, checkpoint và evidence cần nhận.
```

## 4. Coding worker

```text
Task: <id và title>
Base / worktree / feature lane: <orchestrator cung cấp>
Objective / acceptance / dependencies: <trích task>
Allowed source paths: <chỉ lane được cấp>
Forbidden: sibling worktrees, controlplane, shared Git, README/AGENTS,
dotenv/accounts/private keys, migrations, config/package/locks/CI ngoài task.
Bạn chạy read-only và chỉ đề xuất patch theo schema controller đang dùng.
Đọc code/test liên quan; nêu phần đã đúng, tái hiện khoảng trống bằng fixture.
Sửa nguyên nhân với thay đổi nhỏ; không thêm comment code, không làm yếu test,
không fake provider/success trong productionpath. Không ghi file/chạy lệnh tùy ý.
Trả proposal đầy đủ priorhash, content, rationale và kiểm tra được yêu cầu.
Không tự commit/push hoặc yêu cầu mở rộng quyền khi policy chặn.
```

## 5. Reflector — prompt sửa phải từ lỗi thật

```text
Phân tích <task>, acceptance, diff và check output/exitcode đính kèm.
Tách lỗi môi trường khỏi lỗi code. Không đoán testpass hoặc đổ lỗi provider.
Ghi fingerprint lỗi, vị trí nguồn, giả thuyết có bằng chứng, một thay đổi tối thiểu,
regression test liên quan và check cần chạy lại. Không sửa policy/testexpectation
để che lỗi. Nếu cùngfingerprint đã xuất hiện2lần hoặc đủ3coderattempts, trả STOP
với blocker và bước maintainer; không retry mãi hoặc chạy unsandboxed.
Đầu ra là prompt giao coder vòng kế tiếp chỉ trong lane hiện tại.
```

## 6. Independent reviewer

```text
Review read-only task<id> trên chính source digest đã được checks xác minh.
Đối chiếu yêu cầu, acceptance, changedpaths và evidence, không chỉ code style.
Kiểm owner/scopes/CSRF, mutationatomicity/retry/concurrency, data-loss,
untrustedURL/HTML, quota/billing, secret exposure và UI states liên quan task.
Không cho PASS khi evidence là từ commit khác, mock/provider fixture bị gọi là
live hoặc clientmatrix thiếu phiên bản/kịch bản. Không sửa code trong review.
Trả findings cụ thể path/line, severity, trigger/impact/fix; hoặc PASS có giới hạn.
Thay đổi sau review làm mất hiệu lực review/checks cũ.
```

## 7. Prompt từng task

Mỗi entry TASKS.json có `implementationPrompt`, `steps`, `acceptance`, `verification`, `dependencies`, `lanes`, `safety` và `deliverables`. Orchestrator phải kiểm lại source rồi bổ sung đường dẫn/base/evidence trước dispatch. Các lane/check hiện tại của controller không bao trùm mọi maintainer task; không tự đổi policy để nhét chúng vào worker.

## 8. Prompt gói context lần tiếp theo

```text
Chỉ tạo bàn giao, không triển khai thêm. Cập nhật CURRENT-STATE, TASKS status,
EVIDENCE-REGISTER, quyết định mới và HISTORY; giữ rõ reported-vs-executed.
Dùng skillhandoff lưu HANDOFF ở thư mụctemp, trỏ tới artifacts thay vì lặp lại.
Đóng ZIP gồm context/plan/prompts/tài liệu tham chiếu đã rà; tạo manifestSHA256,
Git history/worktrees và START prompt. Không dotenv/accounts/private keys/rawlogs
chứa token/DBdump hoặc mastercontext chưa redact. Kiểm contents/hash/links.
Ghi rõ ZIP là context hay sourcebackup, và phần lịch sử nào chỉ là tổng hợp.
```
