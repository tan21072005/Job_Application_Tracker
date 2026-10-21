# JobTrack — plan điều phối agents tự động

Ngày: 2026-10-21. Mục tiêu: người dùng giao mục tiêu; orchestrator chia feature, giao agents con, kiểm tra kết quả, tạo prompt sửa có bằng chứng và bàn giao các commit riêng để tích hợp. **Lượt hiện tại chỉ lập plan và context, chưa chạy hệ thống tự động.**

Đây là kế hoạch phát triển tiếp theo cho nền tảng agents đang có, không phải yêu cầu viết lại JobTrack hoặc cài thêm một framework orchestration từ đầu.

Đọc:

1. [PLAN.md](PLAN.md): lộ trình triển khai và thứ tự ưu tiên.
2. [ARCHITECTURE.md](ARCHITECTURE.md): vai trò, module, interface và cách ly.
3. [TASKS.json](TASKS.json): 14 task AG00–AG13 có phụ thuộc và tiêu chí hoàn thành.
4. [ACCEPTANCE.md](ACCEPTANCE.md): kiểm chứng quyền, Git, crash, prompt và automation.
5. [DEVELOPMENT-PROCESS.md](DEVELOPMENT-PROCESS.md): Agile/Kanban, Scrum, gate tuần tự, CRISP-DM và MLOps phù hợp.
6. [PROMPTS.md](PROMPTS.md): prompt mang sang chat mới và mẫu giao việc.

## Quan hệ với plan toàn dự án

[Plan toàn dự án](../jobtrack-full-completion/README.md) vẫn quản lý C00–C27 và 22 nhóm nghiệm thu sản phẩm. AG00–AG13 là lộ trình chi tiết để nền tảng điều phối có thể thực hiện backlog đó an toàn; không thay thế hoặc tự đóng các task sản phẩm.

- C00 ↔ AG00: kiểm kê và baseline.
- C01 ↔ AG01–AG03, AG11: cách ly, sandbox và canary live.
- C20 ↔ AG06–AG09: checks, review và quy trình Git.
- C24 ↔ AG10: quy trình dữ liệu/model/prompt; đánh giá chất lượng AI sản phẩm vẫn là task C24 riêng.
- C27 ↔ AG13: bàn giao có manifest và bằng chứng.

## Hiện trạng đã biết

Source controller/policy/CLI ở `tools/agent-control`; hướng dẫn ở `docs/agents`. Đã có worktree/branch riêng, lane lease, patch broker, kiểm hash/path/secret/comment, checks và reviewer gắn cùng digest, commit feature riêng. Mốc trước có21 fixture tests pass; chưa phải chứng nhận live workers.

Live Windows sandbox từng lỗi `helper_unknown_error: setup refresh had errors` ngay Node-version probe. Phải kiểm tra lại và gỡ lỗi này trước dispatch. Không fallback sang quyền không hạn chế. Lượt plan hiện tại không chạy lại probe/model/DB.

README/AGENTS hướng dẫn hành vi; policy code và môi trường thực thi quyết định quyền. Muốn agent không truy cập feature khác hoặc credential store phải có cách ly đọc/ghi thật, không chỉ viết một câu cấm trong README.

Trạng thái Git/source và lịch sử người dùng ở `../jobtrack-full-completion/CURRENT-STATE.md`, `HISTORY.md`, `DECISIONS.md`. Gói context cập nhật giữ cả hai plan. Lịch sử là bản tổng hợp, không phải export nguyên văn mọi tool output.
