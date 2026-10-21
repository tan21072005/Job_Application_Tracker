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

`npm run test:api` chạy kiểm thử tích hợp trên PostgreSQL thật và chỉ dọn các tài khoản test do chính lượt kiểm thử tạo. `npm run build:api` kiểm tra kiểu TypeScript. Migration 1 áp dụng schema trong `docs/system-design/schema.sql`, ghi phiên bản vào `schema_migrations`, chạy lại không reset dữ liệu.

API hiện phục vụ auth, CRUD hồ sơ, CRUD lịch phỏng vấn, dashboard, ownership, phát hiện trùng, xác nhận ứng tuyển lại, strong ETag/If-Match và Idempotency-Key cho POST. Các request thay đổi dữ liệu phải có `Origin` đúng; ứng dụng web tự gửi header đó. Trước khi triển khai production cần thêm staging, backup/restore, giám sát và đo tải như `docs/system-design/IMPLEMENTATION-PLAN.md`.
