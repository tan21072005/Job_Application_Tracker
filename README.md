# JobTrack

Bản giao diện nâng cấp hiện tại chạy tại **http://127.0.0.1:64364/**. Mở `START-JOBTRACK-WEB.cmd` hoặc chạy `npm run dev:web`. Nếu thiếu dependency của app, chạy `npm ci --prefix apps/web`.

Sửa giao diện tại `apps/web/src/JobTrack.tsx`, `views/`, `components/` và `jobtrack.css`. Xem [hướng dẫn bản web/mobile](apps/web/README.md) và [bàn giao triển khai](planning/jobtrack-ui-redesign/FRONTEND-IMPLEMENTATION.md). Bản mặc định có đầy đủ tương tác với dữ liệu mẫu lưu trong trình duyệt; backend thật chưa nằm trong vòng bàn giao này.

## 5 phiên bản sáng tạo trước đó

Mở `START-JOBTRACK.cmd`, rồi truy cập **http://127.0.0.1:64363/** để chọn Dossier, Rhythm, Atlas, Workbench hoặc Index. Nếu chưa cài dependency, chạy `npm ci` tại thư mục này trước.

Đây là năm frontend hoạt động với dữ liệu mẫu, mỗi bản có bố cục desktop/mobile riêng. Backend tài khoản và dữ liệu production chưa được nghiệm thu.

| Bạn muốn | Xem ở đâu |
|---|---|
| Sửa giao diện chạy thật | `apps/experiences/<tên bản>/src/App.tsx` và `styles.css` |
| Sửa thiết kế trong draw.io | `design/experiences/<tên bản>/<tên bản>.drawio` |
| Chạy/build/test | [Hướng dẫn frontend](apps/experiences/README.md) |
| Xem phạm vi đã kiểm tra và phần còn mở | [Bàn giao](planning/jobtrack-five-websites/HANDOFF.md) |
| Xem plan và khác biệt giữa các bản | [Plan](planning/jobtrack-five-websites/PLAN.md), [ma trận bố cục](planning/jobtrack-five-websites/novelty-matrix.md) |
| Kết nối backend thật | [API contract và điều kiện production](apps/experiences/API.md) |
| Thiết kế hệ thống áp dụng System Design 101 | [Kiến trúc, dữ liệu, API và lộ trình](docs/system-design/README.md) |
| Lấy gói source, Draw.io và build | `deliverables/jobtrack-five-experiences/` |

Tên thư mục là `dossier`, `rhythm`, `atlas`, `workbench`, **`indexer`** (tên hiển thị Index).

`design/JobTrack-UI.drawio` và `design/themes` lưu các thiết kế trước đó. Bộ trong `apps/experiences` và `design/experiences` có năm cây giao diện độc lập. Ngày 19/10/2026, `apps/web` được nâng cấp riêng theo brief hiện tại và chạy tại cổng 64364 như hướng dẫn đầu trang.
