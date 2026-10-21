# Bằng chứng và giới hạn kiểm tra

Ngày 15/10/2026. Phân biệt kiểm tra artifact thiết kế và kiểm chứng hệ thống đang chạy.

## Đã thực hiện

- Clone repo công khai vào `references/system-design-101`, ghi commit, số guide và LICENSE trong `reference-provenance.json`; giữ upstream nguyên bản, không chạy scripts/npm install của repo.
- Đọc lại văn bản ba DOCX và nguồn domain/repository/API adapter. Phát hiện, ghi rõ khác biệt register auto-session, thiếu auth/me, deadline local/UTC, concurrency headers và normalization policy.
- Tạo schema ứng viên năm bảng, hai partial unique active identity, FK cascade, version, sessions và idempotency; query mẫu không nhân số hồ sơ theo số interview.
- Tạo OpenAPI 3.1.1 đích với 14 operations. `validate_design.py` kiểm tra refs nội bộ, operation IDs, path params, enum khớp core, ETag/idempotency requirements và schema required keys. **Đây là structural checker, chưa phải full OpenAPI meta-schema validator.**
- Draw.io có bảy trang native editable. Checker kiểm tra IDs/parents/edges/geometry; Draw.io skill validator chạy riêng cho overlap/dangling references. Ảnh xem trước được xuất bằng native Desktop CLI và kiểm tra trực quan theo trạng thái ghi ở `diagrams/export-all-status.json`.
- Thêm script `npm run check:architecture` và workflow local `.github/workflows/frontend-quality.yml`: structural checks + frontend test/build, không deploy. Workflow chưa được chạy trên GitHub vì chưa push/kích hoạt repository từ lượt này.
- Workflow YAML đã parse và kiểm tra read-only permissions, triggers và sáu bước bằng PyYAML có sẵn; không cài thêm package để thực hiện bước này.
- Chạy lại frontend: 19 test đạt, TypeScript/Vite production build đạt; có cảnh báo `use client` từ Lucide trong bundle client như vòng trước, không làm build thất bại. Đã mở xem ảnh cả bảy trang sơ đồ; skill linter báo 0 errors, 0 warnings.
- Native export cả bảy trang thành công (exit code của từng draw.io process bằng 0). Script điều phối gặp lỗi in nhãn Unicode sau khi đã ghi đủ ảnh/status; đã sửa phần console encoding, không nhận nhầm lỗi đó là lỗi render hoặc dựng lại ảnh giả.

## Chưa chứng minh

- Tại thời điểm xác nhận tài liệu thiết kế, chưa có backend. Cập nhật 19/10/2026: `apps/api` đã có auth, ownership, session revoke, idempotency/race/version và kiểm thử PostgreSQL. Performance/SLO và backup/restore chưa được nghiệm thu; xem `apps/api/README.md`.
- PostgreSQL DDL/query chưa thực thi trên engine. Máy không có psql trên PATH; Docker client có nhưng truy cập daemon bị từ chối. Không khởi động/chỉnh quyền Docker, không tạo/xóa database để thay thế bằng chứng. Schema cần migration/integration test trong SD-02 trở đi.
- Không đo traffic, RAM/CPU, disk hay tiền hạ tầng. Capacity/SLO/RPO/RTO là giả định và mục tiêu có thể đo.
- Browser UI không thay đổi ở lượt thiết kế; không tuyên bố các header/DTO mới đã được năm giao diện gửi hoặc deadline đã sửa runtime.
- CI YAML chỉ được thêm local và kiểm tra cấu trúc khi công cụ parser có sẵn; không tuyên bố một workflow chưa chạy là đã xanh trên GitHub.

Kết quả chạy cụ thể của checker ở `validation-results.json`. Các kiểm tra frontend hiện hữu là hồi quy để giữ bộ demo, không thay acceptance backend trong IMPLEMENTATION-PLAN.
