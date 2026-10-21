# Thiết kế hệ thống JobTrack

Ngày 15/10/2026. Thiết kế áp dụng vào workspace hiện tại, dựa trên ba tài liệu gốc, mã nguồn năm giao diện và các nguyên lý được chọn từ [ByteByteGo System Design 101](https://github.com/ByteByteGoHq/system-design-101).

**Quyết định chính:** một backend Express/TypeScript chia module, một PostgreSQL, cùng origin `/api`, phục vụ cả năm giao diện. Năm giao diện là năm cách làm việc với cùng dữ liệu, không phải năm hệ thống backend riêng.

| Tài liệu | Nội dung |
|---|---|
| [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md) | Hiện trạng, kiến trúc đích, ranh giới module, tải dự kiến, bảo mật, vận hành và mở rộng |
| [REFERENCE-MAP.md](REFERENCE-MAP.md) | Mục nào trong repo đã đọc, cách áp dụng và phần chủ động hoãn |
| [DATA-MODEL.md](DATA-MODEL.md) | Dữ liệu, ownership, transaction, duplicate, phiên bản và múi giờ |
| [schema.sql](schema.sql) | DDL PostgreSQL đề xuất; chưa phải migration đã chạy |
| [openapi.json](openapi.json) | Contract API đích, 14 operations, schemas và lỗi |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | Thứ tự triển khai vào dự án và điều kiện kiểm chứng |
| [diagrams/JobTrack-System-Design.drawio](diagrams/JobTrack-System-Design.drawio) | Sơ đồ editable: hiện tại, container, module, ERD, deployment và sequence |
| [VALIDATION.md](VALIDATION.md) | Kiểm tra thực hiện được và giới hạn chưa nghiệm thu |

Repo đã tải nguyên bản ở `references/system-design-101`, shallow clone tại commit `b28380a4710c5ec9638ec037d4168e288f334cba`; xem [provenance](reference-provenance.json). Không chạy script hoặc cài dependency của repo tham khảo. Giấy phép upstream là CC BY-NC-ND 4.0; các sơ đồ JobTrack được viết mới, không sửa/copy hình upstream và không đưa repo upstream vào gói bàn giao thiết kế.

Snapshot có 400 guide Markdown; nhiều hình của bài gốc được tham chiếu bằng URL bên ngoài. Clone không có nghĩa là đã tải mọi ảnh từ các URL đó để đọc offline.

**Trạng thái:** tài liệu, contract và schema thiết kế đã được thêm vào dự án. Năm frontend và demo hiện tại vẫn hoạt động như trước. Backend, database thật, auth/session và triển khai production chưa được hiện thực hoặc chứng nhận bởi bộ thiết kế này. Các chỗ chưa khớp adapter được ghi thành việc cụ thể, không gọi cấu hình thiết kế là hệ thống đã chạy.

Mở `.drawio` bằng draw.io Desktop/diagrams.net và chọn tab trang để chỉnh sửa. Các PNG là preview, không thay file nguồn. `build_contract.py` và `validate_design.py` dùng Python standard library; tái sinh sơ đồ bằng `build_diagrams.py` cần Draw.io skill ở đường dẫn đã ghi trong script (máy hiện tại đã có). Chỉ chỉnh sửa file `.drawio` thì không cần skill hoặc Python. Workflow CI không tái sinh ảnh và không yêu cầu draw.io Desktop.
