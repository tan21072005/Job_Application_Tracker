# Các quyết định phải mang sang chat mới

| ID | Quyết định | Cách áp dụng |
| --- | --- | --- |
| D01 | Sản phẩm chính là JobTrack hiện tại | Hoàn thiện incrementally; không dựng app thay thế hoặc tự đổi stack |
| D02 | Thiết kế chủ đạo nâng cấp 33 trang Draw.io | Tiếng Việt, sáng/xanh, Noto Sans; ưu tiên việc cần làm/deadline/phỏng vấn |
| D03 | Mobile chủ yếu lịch/deadline/cập nhật nhanh; thường dưới 20 hồ sơ | Luồng thao tác ngắn; vẫn có form tạo/sửa đủ, accessibility và states |
| D04 | 5 concept đều là các phiên bản JobTrack với bố cục/chủ đề khác nhau | Giữ tài sản thiết kế; đợt phát hành chính chưa nhân toàn bộ tính năng sang cả 5 |
| D05 | AI được thao tác mọi thứ trên web như người dùng thật | Full control trong quyền của chủ tài khoản, không biến mặc định thành read-only; vẫn owner isolation, revoke, quota và auth cho hành động nhạy cảm như chính người dùng |
| D06 | Ưu tiên n8n hiện có và API key người dùng đã có | Không yêu cầu dán key vào chat; credential ở n8n/backend; native chat được ưu tiên nếu đáp ứng protocol/auth |
| D07 | Math RAG workflow chỉ là ví dụ | Không tái dùng Pinecone/Sheet môn toán hay sửa workflow đang chạy cho JobTrack |
| D08 | MCP dùng được từ Claude, ChatGPT, Codex, Antigravity theo khả năng client | Kiểm thử từng client/version/transport; không suy ra tương thích từ JSON-RPC unit test |
| D09 | Mỗi agent/feature có worktree và commit riêng | Workers không viết chéo; hợp đồng chung tích hợp trước consumers; maintainer merge theo dependency |
| D10 | Khi code không thêm comments | Giải thích thiết kế ở Markdown; không xóa hàng loạt comment cũ |
| D11 | Chặn lệnh nguy hiểm bằng policy code và hướng dẫn | Guardrails bổ trợ OS isolation; không coi README là ACL; không nới sandbox để chạy cho được |
| D12 | Planner → Coder → Checks → Reflector → Reviewer | Tối đa 3 coder attempts/task; cùng lỗi 2 lần thì dừng với bằng chứng; commit sau checks + review cùng digest |
| D13 | Kanban/Agile cho delivery; gates tuần tự cho schema/release | Không chồng Waterfall/Scrum cho mọi task; Scrum chỉ nếu có nhịp sprint cần thiết |
| D14 | AI quản lý Code + Data + Model + Prompt | CRISP-DM cho giả thuyết/eval; MLOps/LLMOps phù hợp mức dùng API; không tự huấn luyện/retrain |
| D15 | Giữ dữ liệu gốc DB jobtrack | Test dùng DB riêng; không migrate/restore/load/account-create trong intake mặc định |
| D16 | AutoProfile Vault độc lập | Intake/review riêng trước tích hợp; không đọc/sửa project đó theo suy đoán |
| D17 | Lượt hiện tại chỉ plan + context | Không tiếp tục code orchestration hay feature mới khi người dùng đang yêu cầu bàn giao |
| D18 | Ưu tiên tiếp theo là agents tự động có kiểm soát | Làm AG00–AG13 trong plan agent-autonomy, bắt đầu quyền/sandbox; không tự gọi live workers từ tài liệu |

Nếu source chứng minh một lựa chọn cũ không khả thi, lập ADR ngắn gồm bằng chứng, phương án và ảnh hưởng. Không âm thầm đổi quyết định đã chốt. Xin làm rõ chỉ khi thật sự thiếu quyết định sản phẩm; tiếp tục công việc không phụ thuộc trong lúc chờ.
