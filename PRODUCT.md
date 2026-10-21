# JobTrack

## Purpose and audience
Người tìm việc cá nhân quản lý cơ hội ứng tuyển và biết bước cần làm tiếp theo. Dùng web trên máy tính khi xem/tổ chức hồ sơ, mobile khi tra cứu hoặc nhập nhanh cơ hội và lịch phỏng vấn.

## Product truth
Phạm vi dựa trên ba tài liệu trong `Tài liệu/` và `PLAN.md`. Có đăng ký/đăng nhập, CRUD hồ sơ, bảy trạng thái hồ sơ, tìm/lọc/sắp xếp, ghi chú, một hành động tiếp theo và deadline, nhiều vòng phỏng vấn với UTC và múi giờ IANA gốc, chống trùng và dashboard bốn chỉ số. Interview có ba trạng thái riêng. Mỗi người dùng chỉ xem dữ liệu của mình.

Không thêm AI, CV, Admin, email/calendar sync, lịch sử trạng thái, nhiều task, reset mật khẩu hoặc tự động ứng tuyển. Dữ liệu trong bản thiết kế là fixture minh họa, không phải dữ liệu sản xuất.

## Delivery and stack
Vòng hiện tại gồm năm frontend React/Vite/TypeScript độc lập tại `apps/experiences`: Dossier, Rhythm, Atlas, Workbench và Index. Mỗi bản có web/mobile, các luồng MVP và Draw.io chỉnh sửa được 25 trang. Domain và adapter dữ liệu dùng chung ở `packages/jobtrack-core`, không dùng chung shell bố cục. Mặc định là bản preview dùng dữ liệu mẫu lưu ở trình duyệt. API contract đã ghi; backend Express/PostgreSQL, auth thật và ownership chưa được triển khai/nghiệm thu trong vòng giao diện này, nên chưa gọi toàn hệ thống là production.

## Voice and success
Nhãn tiếng Việt rõ nghĩa. Ưu tiên lịch sắp tới, việc cần làm và trạng thái hồ sơ; thao tác xóa có xác nhận. Không thay đổi quy tắc nghiệp vụ để tạo vẻ mới. Thành công của vòng thiết kế: người dùng so sánh được năm chủ đề khác bố cục, mở bản nguồn và sửa từng khối.

## Evidence
`PLAN.md`, `planning/jobtrack-five-websites/PLAN.md`, các brief và evidence; `apps/experiences`, `design/experiences`. Vòng trước `apps/web` và `design/themes` được giữ làm anti-reference. Chưa có kết quả nghiên cứu người dùng thực tế; không suy diễn từ fixture.
