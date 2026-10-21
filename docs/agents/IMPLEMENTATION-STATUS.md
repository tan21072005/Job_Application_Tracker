# Trạng thái triển khai điều phối — 21/10/2026

Đã tạo Git repository cục bộ, baseline source và ba worktree/branch độc lập cho controller, policy và tài liệu. Các agent policy/docs có commit riêng; controller tích hợp qua merge giữ lịch sử. Không có remote hoặc push. Các file dotenv/accounts/backups/context riêng không được đưa vào baseline; legacy source vẫn có connection defaults/ví dụ cần rà trước công bố.

Đã có CLI, task schema, feature ownership, directory lease, hash/precondition validation, patch broker, fixed checks, independent review/source-digest binding và feature-only commit. Planner/Coder/Reflector/Reviewer dùng chế độ read-only; controller ghi bản sửa. Thay đổi ngoài feature, secret, comment mới, stale hash và thiếu review bị chặn. Bộ check mới mặc định không có migrate/account/restore/load/DB tests.

19 tests ban đầu của controller/policy/Claude hook đạt trên fixture repository tạm; sau review bổ sung2regressions terminal/unbrokered. Luồng fixture tạo commit thật ở branch riêng và giữ checkout chính không đổi. Tests dùng injected workers/checks, không chứng nhận live LLM/provider. Runner regression cũ:2decision tests đạt, execution timeout fixture chưa đạt trên máy đang thiếu tài nguyên; chưa có full-suite product pass trong lượt này.

**Live automation đang bị chặn:** Windows sandbox Codex báo `helper_unknown_error: setup refresh had errors` ngay với Node-version probe. Controller preflight dừng trước model call; checks cũng yêu cầu sandbox. Không chuyển sang danger-full-access, không sửa ACL/global Git trust hoặc uninstall sandbox. Cần một task sửa môi trường riêng và canary kiểm write/network denial trước live use.

Đây là công cụ phối hợp cho development agents tin cậy. README/AGENTS/hook không phải phân quyền OS; read-only không tự chặn mọi quyền đọc file. Muốn chống agent thù địch hoàn toàn cần OS identity/container riêng và kiểm soát Git common-dir/control plane. Không có cam kết cách ly tuyệt đối cho mọi terminal/công cụ ngoài controller.

Quy trình phần mềm và AI nằm trong DEVELOPMENT-MODEL.md: Kanban mặc định, Scrum nếu cần sprint, gate tuần tự cho migration/release, CRISP-DM và eval Code+Data+Model+Prompt. Chưa cài pipeline huấn luyện/retrain hoặc scheduler chạy mãi, chưa tự thực thi task mẫu hay sửa sản phẩm ngoài yêu cầu.

## Cập nhật kiểm kê fresh — 21/10/2026 (AG00)

Đo lại tại source hiện tại, không suy ra từ báo cáo cũ:

- `npm run agents:test` → **21 pass / 0 fail / 0 skipped** (39.3s). Fixture vẫn xanh; không chứng nhận live.
- `npm run agents -- status` → `[]`, không task/lease đang chạy.
- `npm run agents -- doctor` → `sandbox.code = 1`, `liveWorkersVerified: false`. **Live dispatch vẫn BLOCKED.**

Cô lập nguyên nhân sandbox (mới): chạy hai lệnh giống hệt, chỉ khác tiền tố — `codex sandbox --permission-profile :read-only -- node --version` và `-- rtk proxy node --version` — **đều lỗi y hệt** `helper_unknown_error: setup refresh had errors`. Kết luận: RTK không phải nguyên nhân; lỗi nằm ở helper sandbox Windows của Codex CLI, bước thiết lập/refresh tài khoản machine-wide. Host có `CodexSandboxOffline`, `CodexSandboxOnline` và group `CodexSandboxUsers`; phiên kiểm kê chạy `PC\Admin` **không elevated**. Giả thuyết cần kiểm chứng ở AG02: bước setup refresh yêu cầu phiên Administrator.

Không nới sandbox, không `danger-full-access`, không sửa ACL hoặc global Git trust. Mọi kết luận chi tiết, gap matrix và inventory quyền nằm ở `planning/jobtrack-agent-autonomy/BASELINE-GAPS.md`, `CAPABILITY-INVENTORY.md` và `RUN-STATUS.md`.

Sản phẩm JobTrack chạy được tại local: API `127.0.0.1:64366` (`/api/health` 200, `/api/ready` 200 `version:6`) và web `127.0.0.1:64364` (200, trang đăng nhập render).
