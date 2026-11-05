# JobTrack — chạy web từ terminal

Repo: `F:\Project\Job_Application_Tracker`

Máy đã có sẵn trong PATH hệ thống: Node.js 24.20.0, npm 11.19, Git 2.5x, Docker CLI 29.9.2 (`F:\long-app\docker\bin`), Docker Compose v5.7.0. Chỉ shell đang mở trước khi cài mới cần nạp lại PATH.

---

## Cách 1 — Chạy bằng Docker Compose (khuyến nghị, một lệnh)

Mở PowerShell mới và chạy:

```powershell
cd F:\Project\Job_Application_Tracker
docker compose up -d
```

Đợi khoảng 40 giây cho PostgreSQL khởi tạo, migration chạy và API healthy. Kiểm tra:

```powershell
docker compose ps
```

Kết quả mong đợi: `jobtrack-postgres` healthy, `jobtrack-api` healthy, `jobtrack-web` Up.

Mở trình duyệt: **http://127.0.0.1:64364/**

Lệnh quản lý:

```powershell
docker compose logs -f api      # xem log API
docker compose logs -f web      # xem log nginx
docker compose down             # dừng, giữ dữ liệu
docker compose down -v          # dừng và xoá luôn database
docker compose build --no-cache # build lại sạch
```

Dữ liệu PostgreSQL nằm trong volume `jobtrack-postgres-data`, không mất khi `down`.

---

## Cách 2 — Chạy dev (sửa code có hot reload)

Cần 3 terminal. Mở PowerShell mới cho mỗi terminal.

**Nếu shell báo `docker`/`node`/`npm` không tìm thấy**, nạp lại PATH trước:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

### Terminal 1 — Database

```powershell
docker run -d --name jobtrack-postgres-dev --restart unless-stopped `
  -e POSTGRES_USER=jobtrack -e POSTGRES_PASSWORD=jobtrack_local_dev -e POSTGRES_DB=jobtrack `
  -p 127.0.0.1:55432:5432 -v jobtrack-postgres-dev-data:/var/lib/postgresql postgres:18
```

Lần đầu tạo thêm database test (cho bộ kiểm thử API):

```powershell
docker exec jobtrack-postgres-dev psql -U jobtrack -d postgres -c "CREATE DATABASE jobtrack_test;"
```

Lần sau chỉ cần `docker start jobtrack-postgres-dev`.

### Terminal 2 — API

```powershell
cd F:\Project\Job_Application_Tracker
npm run db:migrate
npm run dev:api
```

API ở `http://127.0.0.1:64366`. Kiểm tra: `curl http://127.0.0.1:64366/api/ready` phải trả `{"status":"ready","version":7}`.

### Terminal 3 — Web

```powershell
cd F:\Project\Job_Application_Tracker
npm run dev:web
```

Mở **http://127.0.0.1:64364/**. Vite proxy `/api` sang API cổng 64366.

---

## Đăng ký tài khoản để vào app

Lần đầu mở sẽ thấy màn đăng nhập. Bấm **"Chưa có tài khoản? Đăng ký"**, nhập:

- Email: bất kỳ, ví dụ `tan@jobtrack.local`
- Mật khẩu: **từ 15 đến 64 ký tự**, ví dụ `MatKhau123!@#JobTrack2026`

Mật khẩu ngắn hơn 15 ký tự sẽ bị từ chối với lỗi 422.

---

## Kiểm tra nhanh bằng terminal

```powershell
curl http://127.0.0.1:64364/                     # web
curl http://127.0.0.1:64366/api/health           # API (dev mode)
curl http://127.0.0.1:64364/api/ready            # API qua nginx (container mode)
```

Chạy smoke test toàn luồng (đăng ký → tạo hồ sơ → tạo phỏng vấn → đăng xuất):

```powershell
cd F:\Project\Job_Application_Tracker
node tools/verify/smoke-api.mjs
```

Script mặc định gọi qua nginx `http://127.0.0.1:64364`. Muốn gọi thẳng API dev:

```powershell
$env:SMOKE_BASE = 'http://127.0.0.1:64366'
node tools/verify/smoke-api.mjs
```

Kiểm tra layout 3 kích thước (390 / 768 / 1440) trên 6 trang:

```powershell
node tools/verify/audit-responsive.mjs
```

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách sửa |
| --- | --- |
| `docker: command not found` | Shell mở trước khi PATH có `F:\long-app\docker\bin`. Mở PowerShell mới, hoặc nạp PATH như mục Cách 2 |
| `Cannot connect to the Docker daemon` | Engine WSL chưa chạy. Chạy `docker-start.cmd` |
| `docker compose` báo không phải lệnh | `~\.docker\config.json` phải có `cliPluginsExtraDirs` trỏ `F:\\long-app\\docker\\cli-plugins` |
| `initdb: directory exists but is not empty` | Volume cũ tạo bởi container khác. Chạy `docker compose down -v` rồi `docker volume rm jobtrack-postgres-data` |
| API lỗi `Cannot find package '@jobtrack/contract'` | Đã sửa trong `deploy/docker/Dockerfile.api`. Nếu vẫn gặp, build lại `docker compose build --no-cache api` |
| Web trong container hiện dữ liệu mẫu 12 hồ sơ | `VITE_DATA_MODE=api` đã được set trong `Dockerfile.web`. Build lại `docker compose build web` |
| Cổng 64364 bị chiếm khi chạy dev | Đang có container web chạy. `docker compose stop web` trước |
| `vitest` fail hàng loạt | Không đặt `VITE_DATA_MODE` trong `.env.local`. Dùng `.env.development` |
| WSL tự tắt, API mất database | WSL2 tắt VM khi không có phiên. Chạy `docker-start.cmd` (đã có watcher tự giữ) |

---

## Hai chế độ dữ liệu

| | Dev (`npm run dev:web`) | Container (`docker compose up`) |
| --- | --- | --- |
| Cấu hình | `apps/web/.env.development` | `ENV VITE_DATA_MODE=api` trong Dockerfile |
| API | `127.0.0.1:64366` (Vite proxy) | `api:64366` (nginx proxy) |
| Database | container `jobtrack-postgres-dev` cổng 55432 | container `jobtrack-postgres` (nội bộ) |
| Dữ liệu | API thật | API thật |

Cả hai đều dùng API thật. Chỉ khác cổng và cách proxy.
