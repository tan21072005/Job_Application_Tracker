# JobTrack — kế hoạch hoàn thiện toàn bộ dự án

Phiên bản: 2026-10-21. Workspace gốc: `D:\Project\Job_Application_Tracker`. Baseline Git: `30db3fd` trên `main`.

Yêu cầu hiện hành: **lập plan chi tiết để hoàn thiện dự án hiện tại và bàn giao bối cảnh sang chat mới**. Lượt lập tài liệu này không triển khai tính năng, không chạy migration/test ghi DB, không sửa workflow n8n và không gọi mô hình trả phí.

Ưu tiên phát triển tiếp theo được người dùng chốt: [nền tảng agents tự động](../jobtrack-agent-autonomy/README.md), với14task AG00–AG13 chi tiết hóa điều phối/cách ly/quy trình. Plan sản phẩm C00–C27 bên dưới vẫn giữ nguyên phạm vi nghiệm thu.

Đọc theo thứ tự:

1. [CURRENT-STATE.md](CURRENT-STATE.md): source thực tế, bằng chứng và những điều chưa xác minh.
2. [SCOPE-ACCEPTANCE.md](SCOPE-ACCEPTANCE.md): phạm vi của “100%” và tiêu chí nghiệm thu từng chức năng.
3. [PLAN.md](PLAN.md): thứ tự thực hiện, phụ thuộc, quyền sở hữu và các cổng phát hành.
4. [TASKS.json](TASKS.json): backlog có cấu trúc cho người điều phối; trạng thái khởi tạo là planned, không phải kết luận mọi chức năng chưa có code.
5. [PROMPTS.md](PROMPTS.md): prompt tiếp nhận, triển khai, giao agent, sửa lỗi và review.
6. [HISTORY.md](HISTORY.md), [DECISIONS.md](DECISIONS.md): lịch sử yêu cầu và các quyết định phải giữ.
7. [EVIDENCE-REGISTER.md](EVIDENCE-REGISTER.md): phân biệt báo cáo cũ, kiểm tra source và bằng chứng chạy thực tế.

Các kế hoạch T01–T10 và AI00–AI14 trước đây được giữ để truy vết. Kế hoạch này thay thế cách diễn giải trạng thái của chúng khi có mâu thuẫn; không yêu cầu viết lại phần source đã đáp ứng tiêu chí. Source và bằng chứng mới có ngày/commit cụ thể được ưu tiên hơn lời khẳng định trong tài liệu cũ.

## Bàn giao

Gói ZIP đi kèm chứa bản sao tài liệu này, lịch sử được tổng hợp, context kỹ thuật an toàn, tài liệu tham chiếu chọn lọc và manifest hash source. ZIP **không chứa database, mật khẩu, dotenv, accounts, API key hoặc toàn bộ mã nguồn**. Chat mới trên cùng máy dùng workspace gốc; trên máy khác cần chuyển repository bằng một quy trình riêng có rà soát bí mật.

Lịch sử trong HISTORY là bản tổng hợp từ hội thoại và tài liệu truy cập được, không phải bản export nguyên văn đầy đủ mọi tin nhắn/tool output. Muốn giữ nguyên văn, người dùng có thể xuất/chia sẻ cuộc chat bằng chức năng ứng dụng rồi đính kèm riêng sau khi kiểm tra dữ liệu nhạy cảm. Không cần chép thông tin đăng nhập vào prompt.

## Quy tắc bắt đầu

Mặc định chat mới chỉ tiếp nhận và xác minh; dùng prompt triển khai riêng trong PROMPTS khi muốn bắt đầu code. Không tự khởi chạy tất cả agents, tests DB hoặc tác vụ trả phí chỉ vì đã nhận ZIP. Không xem các task mẫu của controller là lệnh người dùng đã giao.
