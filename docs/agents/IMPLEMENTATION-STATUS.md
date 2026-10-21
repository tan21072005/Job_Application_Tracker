# Trạng thái triển khai điều phối — 21/10/2026

Đã tạo Git repository cục bộ, baseline source và ba worktree/branch độc lập cho controller, policy và tài liệu. Các agent policy/docs có commit riêng; controller tích hợp qua merge giữ lịch sử. Không có remote hoặc push. Các file dotenv/accounts/backups/context riêng không được đưa vào baseline; legacy source vẫn có connection defaults/ví dụ cần rà trước công bố.

Đã có CLI, task schema, feature ownership, directory lease, hash/precondition validation, patch broker, fixed checks, independent review/source-digest binding và feature-only commit. Planner/Coder/Reflector/Reviewer dùng chế độ read-only; controller ghi bản sửa. Thay đổi ngoài feature, secret, comment mới, stale hash và thiếu review bị chặn. Bộ check mới mặc định không có migrate/account/restore/load/DB tests.

19 tests ban đầu của controller/policy/Claude hook đạt trên fixture repository tạm; sau review bổ sung2regressions terminal/unbrokered. Luồng fixture tạo commit thật ở branch riêng và giữ checkout chính không đổi. Tests dùng injected workers/checks, không chứng nhận live LLM/provider. Runner regression cũ:2decision tests đạt, execution timeout fixture chưa đạt trên máy đang thiếu tài nguyên; chưa có full-suite product pass trong lượt này.

**Live automation vẫn bị chặn, nhưng nguyên nhân đã đổi:** probe sandbox **đã pass** khi controller dùng CLI Codex của ứng dụng (`CODEX_CLI_PATH` → `codex-cli 0.163.0-alpha.10.2`); bản npm `codex` trên PATH (`0.162.0`) mới là bản lỗi `helper_unknown_error: setup refresh had errors`. Không cần elevated, **không** cần `codex sandbox uninstall` (chưa chạy, không có bằng chứng cho nó), không chuyển sang danger-full-access.

**Cách ly đọc vẫn chưa có.** Canary đo thật (profile `:read-only`, identity `CodexSandboxOffline`): ghi trong và ngoài checkout đều `DENIED`, child process được dọn sạch, `~/.ssh` bị chặn — nhưng worker **vẫn mở được** `.git` common dir, `.env`, `accounts.txt`, sibling worktree và control state; profile `:workspace` còn ghi được ra ngoài checkout. Egress chưa chứng minh (kết quả trùng baseline host). Vì vậy **gate G-A chưa đạt** và live dispatch vẫn phải dừng. Bằng chứng: `planning/jobtrack-agent-autonomy/CANARY-EVIDENCE.json` + `SANDBOX-READINESS.md`. Quyết định đích: snapshot projection tối thiểu chạy trong identity/container có quyền đọc bị giới hạn. Projection đơn lẻ dưới identity đọc rộng không đủ. Xem CONTROL-PLANE-ADR; chưa triển khai.

Đây là công cụ phối hợp cho development agents tin cậy. README/AGENTS/hook không phải phân quyền OS; read-only không tự chặn mọi quyền đọc file. Muốn chống agent thù địch hoàn toàn cần OS identity/container riêng và kiểm soát Git common-dir/control plane. Không có cam kết cách ly tuyệt đối cho mọi terminal/công cụ ngoài controller.

Quy trình phần mềm và AI nằm trong DEVELOPMENT-MODEL.md: Kanban mặc định, Scrum nếu cần sprint, gate tuần tự cho migration/release, CRISP-DM và eval Code+Data+Model+Prompt. Chưa cài pipeline huấn luyện/retrain hoặc scheduler chạy mãi, chưa tự thực thi task mẫu hay sửa sản phẩm ngoài yêu cầu.

## Mốc audit và independent review

Audit đầu ở30db3fd báo21fixtures/status[]/sandboxFAIL; đó là historical snapshot, không phải hiện trạng sau2d926d9/443b8ac/e60185a. Giả thuyết elevated/uninstall đã được thay bằng differentialCLI và canary; ACL repair quản trị trước đó là sự kiện riêng, không nói mọi thao tác máy chưa từng elevated.

Independent reviewer lượt hiện tại chạy agents:test23/23PASS, auth regression6/6PASS và build:apiPASS. HTTP readyversion6/web/proxy200; không browser UI hoặc DB E2E mới. Reports trong planning/jobtrack-agent-autonomy/AG00-REVIEW.md và AUTH-INDEPENDENT-REVIEW.md có digests/giới hạn.

G-A **chưa enforce bằng code**: run chỉ kiểm launch rồi có thể gọi planner; operator vẫn phải cấm live. Probe aggregate còn sai lệch egress/read predicates; cần receiptgate và fake-only canaries trước bất kỳ pilot.

Worktree auth-header-origin-fix trùng đã được user yêu cầu dọn: controllerabandon rồi gitworktreeremove khôngforce sau0changes/0ignoredextras/0uniquecommits; giữ branch và audit. Không tác động worktree auth-origin-repair có commit443b8ac.

Auth443b8ac được review hậu kiểm PASS phạm vi canonicalBearer; không fullC03accepted. Residual malformed/case credential fallback, verified-grant Origin và MCP auth/scopes là task tiếp theo.

Lượt closure chỉ sửa tài liệu/registry status hành chính sau review, không code sản phẩm/controller, không mở liveworker/provider/n8n/DB writes, không gỡ sandbox/đổi ACL/push.
