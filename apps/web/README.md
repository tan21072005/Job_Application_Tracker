# JobTrack — Web & mobile

Bản triển khai nâng cấp từ brief `planning/jobtrack-ui-redesign/BRIEF.md` và bộ màn hình `design/JobTrack-UI.drawio`. Nhận diện nền sáng/xanh, Noto Sans, dashboard ưu tiên việc cần làm và phỏng vấn; mobile có điều hướng dưới và form đầy đủ.

## Chạy với dữ liệu thật

Yêu cầu Node.js 24 và PostgreSQL 18. Đặt `DATABASE_URL`, `JWT_SECRET` (ít nhất 32 ký tự ngẫu nhiên) và `APP_ORIGIN=http://127.0.0.1:64364` theo mẫu `../api/.env.example`. Từ thư mục dự án, chạy lần lượt:

```sh
npm ci --prefix apps/api
npm ci --prefix apps/web
npm run db:migrate
npm run dev:api
# Terminal khác:
npm run dev:web
npm run test:api
npm run test:web
npm run build:web
```

Mở `http://127.0.0.1:64364/`. Vite chuyển `/api` đến `127.0.0.1:64366`; development và production đều dùng API thật. `START-JOBTRACK-WEB.cmd` chỉ mở Vite, nên database và API cần được chạy trước. Migration chạy lặp không xóa dữ liệu. Để mở bản demo localStorage riêng, chạy `npm --prefix apps/web run dev -- --mode demo --port 64364 --strictPort`.

## Mã nguồn chỉnh sửa

- `src/JobTrack.tsx`: app shell, điều hướng, trạng thái và nối thao tác dữ liệu.
- `src/views/`: dashboard, danh sách/pipeline, chi tiết/phỏng vấn và đăng nhập/đăng ký.
- `src/components/`: component UI, dialog và form.
- `src/jobtrack.css`: token thị giác, bố cục và responsive.
- `DESIGN.md` và `.impeccable/design.json`: hệ thiết kế được trích từ code hiện tại, gồm màu, typography, breakpoint và component.
- `src/domain.ts`: enum, validation, chống trùng, chỉ số, lọc và múi giờ/DST.
- `src/data.ts`: adapter localStorage/API; `src/demo.ts`: 12 hồ sơ minh họa, lịch tương đối theo ngày tạo mẫu.
- `src/assets/fonts/`: Noto Sans tự host, kèm giấy phép OFL. Nguồn font từ package đã cài trong dự án, chỉ lấy Latin, Latin Extended và Vietnamese ở các weight sử dụng.

## Phạm vi hoạt động

Mặc định là bản dữ liệu thật: đăng ký/đăng nhập/đăng xuất, tạo/sửa/xóa hồ sơ, ghi chú, next action/deadline, tìm/lọc/sắp xếp, bảy nhóm pipeline, nhiều vòng phỏng vấn, preview múi giờ, lựa chọn giờ DST lặp, chặn trùng/cho xác nhận ứng tuyển lại. Dữ liệu thuộc tài khoản đăng nhập và lưu trong PostgreSQL. Chế độ demo vẫn có thể bật rõ ràng như trên.

Dashboard có cập nhật nhanh hành động/deadline và mở toàn bộ việc còn lại. Form hồ sơ, phỏng vấn và hành động cảnh báo trước khi bỏ thay đổi; nội dung giữ nguyên khi lưu lỗi. Dữ liệu lưu hỏng được chặn trước khi render, có khôi phục mẫu sau xác nhận; lỗi runtime có trang phục hồi. Adapter API có timeout và thông báo riêng cho 401/403/404/409/429, offline và response sai định dạng.

Backend ở `../api` đã có auth, session thu hồi được, ownership, transaction, phiên bản hồ sơ và khóa chống gửi trùng. Kiểm thử tích hợp chạy với PostgreSQL thật. Việc kiểm thử giao diện bằng trình duyệt cho bản live API còn cần thực hiện khi công cụ truy cập localhost được cho phép; backup/restore, tải lớn và môi trường staging vẫn là việc trước khi triển khai production.

Figma MCP đã hết hạn mức, nên chưa đọc được context/screenshot cập nhật để chứng nhận khớp từng pixel. UI được thực hiện từ brief đã xác nhận và nguồn thiết kế cục bộ. Tình trạng file Figma riêng được ghi tại `planning/jobtrack-ui-redesign/figma/README.md`.

Nguồn app trước vòng triển khai này được lưu trong `design/archive/web-before-20261019.zip`.

## Plan và nghiệm thu

Kế hoạch tổng thể: `../../PROJECT-PLAN.md`. Độ phủ 33 trang: `../../planning/jobtrack-ui-redesign/SCREEN-COVERAGE.md`. Kết quả và giới hạn: `../../planning/jobtrack-ui-redesign/COMPLETION.md`.

22 unit tests nằm tại `src/domain.test.ts`, `src/hardening.test.ts` và `src/api-adapter.test.ts`. Các script Playwright CLI trước đây nằm tại `../../output/playwright/jobtrack-refined/`: `check-ui.js`, `check-completion.js`, `check-api-ui.js`. Hai script sau dùng browser context riêng để fault injection không thay dữ liệu demo của người dùng. Script core chỉ tạo/xóa hồ sơ QA do chính nó tạo. Script API mock cần thêm server:

```sh
npm --prefix apps/web run dev -- --port 64365 --strictPort --mode api-qa
```

`.env.api-qa` chỉ chọn chế độ API phục vụ kiểm thử, không chứa thông tin đăng nhập. Playwright mô phỏng HTTP, không chứng nhận backend thật. Không dùng chế độ này để xem demo bình thường.
