# Lịch sử yêu cầu và bối cảnh được tái dựng

Mốc tổng hợp: 2026-10-21. Nguồn: tin nhắn người dùng và tài liệu/source có trong phiên. Đây không phải export nguyên văn mọi assistant reply hoặc tool output; phần không còn truy cập đầy đủ không được tự sáng tác. Các mốc không có ngày rõ được xếp theo thứ tự hội thoại, không gán ngày giả.

## 1. Tài liệu, UI và thư viện tham khảo

Người dùng yêu cầu đọc thư mục `Tài liệu`, lập plan và thiết kế giao diện đầy đủ bằng Draw.io, hỏi nơi lưu file chỉnh sửa được. Sau đó yêu cầu tải các repository công khai và danh mục website tham khảo: 21st.dev, Mobbin, Refero, ShadcnBlocks, Godly, Minimal Gallery; các thư viện shadcn/ui, Fragments, Magic UI, Aceternity, Vercel AI SDK và Structured Prompts UI.

Người dùng muốn cài MCP liên quan nếu có, tham khảo UI/UX thật rồi thiết kế lại cả web/mobile. Những yêu cầu cài đặt là lịch sử intent, không phải bằng chứng tất cả connector đã cài/chạy. Một số website cần tài khoản hoặc không có MCP chính thức; chat mới phải kiểm kê thay vì tự tuyên bố đã kết nối.

Tiếp theo yêu cầu tải `https://github.com/pbakaus/impeccable`, thêm skill và tạo 5 phương án chuyên nghiệp, mỗi phương án một chủ đề/phong cách/bố cục riêng, tránh Default Layout Bias. Repository đề xuất gồm square-ui, shadcn-examples, shadcnspace, ui-prompt-library, shadcn-ui/lint. Link square-ui ban đầu trỏ GitHub topic nên cần xác minh đúng repo nếu cài lại. Khi được hỏi phạm vi, người dùng chốt: **“5 phiên bản sáng tạo của JobTrack”**, không phải 5 sản phẩm khác nhau.

Đã có các concept/tài sản Atlas, Dossier, Indexer, Rhythm, Workbench và planning/design tương ứng. Không lấy việc có preview làm bằng chứng đủ 5 bản production.

## 2. Kiến trúc và bản thiết kế chủ đạo

Người dùng yêu cầu tải `ByteByteGoHq/system-design-101`, áp dụng tư duy thiết kế hệ thống, đóng ZIP, liệt kê giao diện và chạy localhost. Các cổng preview đã xuất hiện: 64363, 52190 và sau đó app chính 64364. Chat mới không tự kill process để lấy cổng.

Với `design/JobTrack-UI.drawio` 33 trang, người dùng chọn **nâng cấp bố cục/thẩm mỹ bản hiện tại**. Các câu trả lời UX đã chốt:

- Mỗi ngày ưu tiên xem việc cần làm, deadline và phỏng vấn sắp tới.
- Điện thoại chủ yếu xem lịch/deadline/cập nhật nhanh.
- Quy mô thường dưới 20 hồ sơ ứng tuyển.

Người dùng yêu cầu thử kết nối Figma nhiều lần, sau đó xây giao diện. Có URL file Figma key `mf9Nq2o6prn7zRFupyf3Fo` trong ambient browser; không coi ambient URL là chứng nhận quyền ghi hoặc tất cả 33 trang đã đồng bộ. Source Draw.io và app hiện tại là tài sản cần kiểm kê trước.

## 3. Hoàn thiện chức năng và phương pháp làm việc

Người dùng nhiều lần yêu cầu “tiếp tục”, hoàn thiện full chức năng và plan chi tiết. Đề xuất orchestration Magentic-One + Reflexion được đưa vào trao đổi: planner viết prompt giao việc, coder sửa code, test/build cung cấp phản hồi, reflector viết prompt sửa, reviewer đối chiếu yêu cầu. Mốc hiện hành đặt tối đa 3 attempts/task và dừng lặp cùng lỗi hai lần.

Người dùng yêu cầu cài CLI-Anything và Agent-Reach, dùng khi phù hợp để kiểm tra localhost hoặc nghiên cứu. Đây là công cụ hỗ trợ, không phải yêu cầu cài thêm vô hạn repo. Khi người dùng nói “chưa/chưa cần”, intent là chưa triển khai phần đề xuất, cần plan/prompt đủ context chuyển chat.

## 4. AI, MCP, n8n và crawl

Yêu cầu mở rộng: website có MCP để Claude/ChatGPT/Codex/Antigravity thao tác trực tiếp, chatbot AI ngay trong web qua n8n, thêm URL crawl/import và tính năng hữu ích. Quyền AI được người dùng chốt nguyên ý: **“ai được thao tác mọi thứ trên web, y như người dùng thật”**. Đây là full control theo tài khoản và quyền người dùng, không phải truy cập dữ liệu mọi user hoặc bỏ auth.

Người dùng đã có API key và n8n tại `https://maximum-eastcoast-obstruct.ngrok-free.dev/`, muốn dùng giao diện chat n8n sẵn có. Đã gửi JSON workflow ví dụ “Rag Q &A Toán học tính toán”, có Chat Trigger public, AI Agent, Simple Memory 10, vector-store toán, calculator và Google Sheets tool. Connection thực tế trong JSON dùng OpenAI-compatible model aliases `test`/`test1`; OpenRouter/Ollama có node nhưng không nối vào agent đang dùng. Không mang credential IDs, Sheet ID, dữ liệu toán hoặc prompt giảng viên sang JobTrack.

Link chat mẫu là webhook có sẵn. Việc xem trang chat/login không chứng minh gọi model hay CRUD được. Chưa có lời nhắn user cho phép gửi thử vào workflow môn toán hoặc sửa workflow đó; cần workflow JobTrack riêng và runtime credential tách khỏi admin key.

Plan AI cũ AI00–AI14, architecture, acceptance, workflows và nguồn tham khảo nằm trong `planning/jobtrack-ai`. Những tài liệu 19/10 có trạng thái và tuyên bố tương thích đã cũ so với source 21/10; plan mới phải reconcile.

## 5. Các mốc bàn giao và kiểm thử cũ

ZIP `JobTrack-session-context-20261019.zip` được tạo trước triển khai T01–T10. Người dùng gửi báo cáo session khác nói cả 10 task đã hoàn tất: test isolation, migrations/advisory lock/checksum, pure contract, session/auth, duplicate/reapply, interview PATCH, web conflicts/draft, UX polish, fullstack tests/CI, ops backup/restore/load/rollback. Báo cáo nói contract 9, API 30, web 30, agent loop 3 pass và source manifest 221 files.

Đó là báo cáo theo thời điểm. Audit sau chỉ ra cần xác minh CI DB isolation/rtk, browser E2E thay vì chỉ API integration, restore integrity và tải qua HTTP thay vì chỉ SQL. Những mục này không bị xóa chỉ vì báo cáo ghi “100%”.

Người dùng hỏi cần gửi gì sang chat mới và sau đó cung cấp master context mới ở `PROJECT_CONTEXT_MASTER.md` với API64366, web64364, PostgreSQL18:5432/migrations001–006, extension, MCP và AutoProfile Vault độc lập. Báo cáo mới nói API44/web34/extension pass, mật khẩu Argon2id tối thiểu15 ký tự và tiện ích account:create. Không tự chạy tiện ích này hoặc đóng gói tài khoản. Master có dữ liệu vận hành nhạy cảm; ZIP mới chỉ mang bản context an toàn được viết lại.

## 6. Yêu cầu điều phối development và phần đã làm

Người dùng muốn agents điều phối/agents con, worktree và commit riêng, mỗi agent một feature tránh đụng code nhau; code không thêm comment; README và codeguard chặn lệnh nguy hiểm; áp dụng mô hình phần mềm cùng CRISP-DM/MLOps/Data-Centric AI.

Workspace lúc bắt đầu phần này chưa có Git repo. Đã tạo baseline local, ba worktree control/docs/policy, commit riêng và merge vào `main` ở `30db3fd`; không push. Đã có controller, lanes, lease, proposal validation, hash/secret/comment guards, fixed checks, source-digest review binding và terminal states. Chi tiết ở `docs/agents` và `tools/agent-control`.

21 fixture tests mới pass. Hai legacy decision tests pass; legacy timeout fixture chưa pass trong điều kiện thiếu tài nguyên. Live worker bị chặn bởi sandbox Windows setup refresh ngay ở Node-version probe. Chưa chạy model worker thật, không bypass sandbox, không tuyên bố hệ thống tự động hoàn chỉnh. README/hook không phải ACL của OS.

## 7. Điều chỉnh hướng hiện tại

Người dùng làm rõ: **cần plan để hoàn thiện 100% dự án hiện tại và đưa toàn bộ lịch sử/context sang chat khác**, không phải chỉ tiếp tục xây công cụ agents. Vì vậy lượt này dừng code sản phẩm, đọc source và lập bộ tài liệu mới, backlog có dependencies/prompts/acceptance cùng ZIP handoff.

Ưu tiên chat tiếp theo: tiếp nhận đúng source, xác minh baseline, sửa khoảng trống theo task và bằng chứng. Không viết lại những phần đã đạt, không nhầm historical claims thành fresh PASS, không bắt đầu tác vụ rủi ro chỉ vì có trong backlog.

## 8. Ưu tiên mới: kế hoạch vận hành agents tự động

Sau khi nhận plan tổng thể và ZIP context, người dùng nhắc lại yêu cầu tự động hóa: orchestrator và agents con, feature/worktree/commit riêng, không đụng code nhau, không thêm comment, README và policy code chặn thao tác nguy hiểm, kết hợp mô hình phần mềm với CRISP-DM/MLOps/Data-Centric AI. Người dùng yêu cầu **lập plan để chuyển sang chat session khác**, chưa giao thực thi live trong lượt này.

Đã bổ sung `planning/jobtrack-agent-autonomy` với kiến trúc,14task AG00–AG13, canary/acceptance, quy trình và prompts. Ưu tiên: audit hiện trạng → thiết kế enforcement → sửa sandbox/canary → scheduler/prompt loop/Git gates → pilot và batch hữu hạn. Đây là roadmap cần triển khai; không biến các khả năng đã lên kế hoạch thành claim đã có code hoặc đã pass.
