# Giao diện JobTrack

Ảnh chụp tự động bằng Playwright ở 1440×900 (desktop) và 390×844 (mobile), chụp ngày 2026-11-08.

Chạy lại: `node tools/verify/capture-ui.mjs` khi stack Docker đang chạy ở `http://127.0.0.1:64364`.

## Đăng nhập

| Ảnh | Nội dung |
| --- | --- |
| `01-login.png` | Màn đăng nhập với nút **Tiếp tục với Google** và dải ngăn "hoặc tiếp tục bằng email" |
| `15-mobile-login.png` | Cùng màn hình ở 390px |

## Các trang chính

| Ảnh | Trang |
| --- | --- |
| `02-dashboard.png` | Tổng quan — panel việc cần xử lý, lịch phỏng vấn, chỉ số |
| `03-applications.png` | Hồ sơ ứng tuyển — tìm kiếm, lọc, chuyển Danh sách / Pipeline |
| `04-interviews.png` | Lịch phỏng vấn |
| `05-analytics.png` | Phân tích & hiệu suất |
| `06-roadmap.png` | Lộ trình kỹ năng & sự nghiệp |
| `07-datasets.png` | Dữ liệu Web (PageWeave) |

## Cài đặt

Trang `#settings` gom các mục từng nằm rải rác trong hộp thoại tài khoản vào 5 tab.

| Ảnh | Tab |
| --- | --- |
| `08-settings.png` | Hồ sơ — email, gói dịch vụ, số hồ sơ, lối vào hồ sơ ứng viên / kho CV / Pro / AI & MCP |
| `09-settings-security.png` | Bảo mật — đổi mật khẩu, phiên đăng nhập, xoá tài khoản |
| `10-settings-notifications.png` | Thông báo — nhắc hạn chót, nhắc phỏng vấn, tóm tắt tuần |
| `11-settings-appearance.png` | Giao diện — mật độ Thoáng/Gọn, tăng tương phản, giảm chuyển động |
| `12-settings-data.png` | Dữ liệu — xuất JSON/CSV, thùng rác, xoá tài khoản |
| `13-security-modal.png` | Hộp thoại Mật khẩu & phiên đăng nhập |

## Thanh điều hướng

| Ảnh | Nội dung |
| --- | --- |
| `14-sidebar-hover.png` | Sidebar mặc định là dải icon 64px, rê chuột bung rộng 232px đè lên nội dung |
| `16-mobile-dashboard.png` | Tổng quan ở 390px — sidebar ẩn, bottom-nav 5 mục |
| `17-mobile-drawer.png` | Drawer "Thêm" liệt kê 4 trang còn lại và 42 tính năng theo nhóm |
