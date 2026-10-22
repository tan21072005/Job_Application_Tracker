# JobTrack API

API Express/TypeScript và PostgreSQL 18 cho giao diện chính `apps/web`. Dữ liệu được phân tách theo tài khoản; mật khẩu dùng Argon2id; cookie phiên HttpOnly gắn với session có thể thu hồi.

## Cấu hình

Sao chép các tên biến từ `.env.example` vào môi trường của terminal. `DATABASE_URL` trỏ đến database riêng; `JWT_SECRET` cần ít nhất 32 ký tự ngẫu nhiên; `APP_ORIGIN` phải khớp chính xác origin của web. Không lưu mật khẩu hoặc secret thật trong repo.

Ví dụ PostgreSQL local dành riêng cho phát triển:

```sh
docker run -d --name jobtrack-postgres-dev -e POSTGRES_USER=jobtrack -e POSTGRES_PASSWORD=jobtrack_local_dev -e POSTGRES_DB=jobtrack -p 127.0.0.1:55432:5432 -v jobtrack-postgres-data:/var/lib/postgresql postgres:18
```

Container đã có thì dùng `docker start jobtrack-postgres-dev`. Với PowerShell:

```powershell
$env:DATABASE_URL = 'postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack'
$env:JWT_SECRET = '<ít nhất 32 ký tự ngẫu nhiên của riêng bạn>'
$env:APP_ORIGIN = 'http://127.0.0.1:64364'
npm ci --prefix apps/api
npm run db:migrate
npm run dev:api
```

Terminal khác chạy `npm run dev:web`. Web dùng proxy `/api` đến `127.0.0.1:64366`. `GET /api/health` kiểm tra tiến trình; `GET /api/ready` kiểm tra kết nối database.

## Gói Pro và webhook thanh toán

Gói Pro chỉ được kích hoạt bởi webhook thanh toán đã ký. `POST /api/pro/activate` luôn trả `403 activation_requires_payment`.

| Biến môi trường | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `PAYMENT_MODE` | `test` | Bật checkout ở chế độ thử nghiệm: đơn hàng được giá ở máy chủ và không có thông tin tài khoản ngân hàng. Giá trị khác, kể cả không đặt, tắt checkout với `503 live_payments_unavailable` và không tạo đơn hàng nào. |
| `PAYMENT_WEBHOOK_SECRET` | chuỗi bí mật tối thiểu 16 ký tự | Khoá HMAC-SHA256 dùng ký webhook. Webhook không có khoá này trả `503 payment_webhook_not_configured`. |

Webhook nhận hai header: `X-JobTrack-Timestamp` (mili giây kể từ epoch) và `X-JobTrack-Signature` gồm `v1=` theo sau là HMAC-SHA256 hex của chuỗi `<timestamp>.<raw body>`. Cửa sổ chấp nhận là 5 phút; chữ ký sai hoặc cũ trả `401 invalid_webhook_signature` hoặc `400 stale_webhook` và không đổi dữ liệu nào.

Giá và thời hạn gói Pro lấy từ dòng đơn hàng, không lấy từ nội dung webhook; người được kích hoạt là chủ đơn hàng. Giao dịch hoàn tất trong một transaction có `SELECT ... FOR UPDATE`, nên giao dịch lặp hoặc giao dịch chạy song song chỉ cộng Pro đúng một lần.

`npm run test:api` chạy kiểm thử tích hợp trên PostgreSQL thật và chỉ dọn các tài khoản test do chính lượt kiểm thử tạo. `npm run build:api` kiểm tra kiểu TypeScript. Migration 1 áp dụng schema trong `docs/system-design/schema.sql`, ghi phiên bản vào `schema_migrations`, chạy lại không reset dữ liệu.

API hiện phục vụ auth, CRUD hồ sơ, CRUD lịch phỏng vấn, dashboard, ownership, phát hiện trùng, xác nhận ứng tuyển lại, strong ETag/If-Match và Idempotency-Key cho POST. Các request thay đổi dữ liệu phải có `Origin` đúng; ứng dụng web tự gửi header đó. Trước khi triển khai production cần thêm staging, backup/restore, giám sát và đo tải như `docs/system-design/IMPLEMENTATION-PLAN.md`.
