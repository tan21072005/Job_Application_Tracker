# JobTrack — chạy web từ terminal

Repo: `F:\Project\Job_Application_Tracker`

Máy đã có sẵn trong PATH hệ thống: Node.js 24.20.0, npm 11.19, Git 2.5x, Docker CLI 29.9.2 (`F:\long-app\docker\bin`), Docker Compose v5.7.0. Chỉ shell đang mở trước khi cài mới cần nạp lại PATH.

## Phạm vi tính năng

Sidebar có ba nhóm, tất cả đều phục vụ người tìm việc:

| Nhóm | Số mục | Nội dung |
| --- | --- | --- |
| Làm việc | 5 | Mạng lưới kết nối, Hộp thư thông minh, Chiến dịch Outreach, So sánh cơ hội, Hồ sơ công ty |
| Chuẩn bị | 8 | Thư viện CV, Tối ưu hóa ATS, Giả lập phỏng vấn, Lộ trình thăng tiến, Tốc độ & Điểm nghẽn, Radar Văn hóa, Dự báo thu nhập & ESOP, Hồ sơ bảo chứng |
| Khám phá | 1 | Rada việc làm |

28 module doanh nghiệp (FinOps, ESG, Cyber Risk, Antitrust, Treasury…) đã được xoá ở commit `469afed` cùng 175 bảng dữ liệu ở migration `011_drop_enterprise_tables.sql`, vì chúng mô phỏng công việc nội bộ của CFO/CISO/General Counsel chứ không giúp người tìm việc.

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

## Bảo mật tài khoản và nhắc việc

### Đăng nhập bằng Google

Nút **Tiếp tục với Google** ở màn đăng nhập dùng OAuth 2.0 authorization code + PKCE.

Cấu hình trong `.env` (đã gitignore, không commit):

```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:64364/api/auth/google/callback
```

Trong Google Cloud Console, client phải có:

| Mục | Giá trị |
| --- | --- |
| Authorized JavaScript origins | `http://127.0.0.1:64364` |
| Authorized redirect URIs | `http://127.0.0.1:64364/api/auth/google/callback` |
| Audience → Test users | email Google dùng để thử (app ở trạng thái Testing) |

Branding của app trỏ tới trang công khai https://tan21072005.github.io/jobtrack-legal/ (homepage, privacy, terms) vì Google không chấp nhận địa chỉ IP trong các link này.

Thiếu cấu hình thì API trả `{"google": false}` ở `GET /api/auth/providers` và màn đăng nhập ẩn nút Google.

Tài khoản tạo bằng Google không có mật khẩu. Vào **Cài đặt → Bảo mật → Mật khẩu & phiên đăng nhập** để đặt mật khẩu đầu tiên, sau đó có thể đăng nhập bằng email.

### Đổi mật khẩu, xuất dữ liệu, xoá tài khoản

Vào **Tài khoản → Đổi mật khẩu & phiên** trong ứng dụng:

| Chức năng | Cách dùng |
| --- | --- |
| Đổi mật khẩu | Nhập mật khẩu hiện tại + mật khẩu mới (15–64 ký tự). Các thiết bị khác tự đăng xuất |
| Đăng xuất thiết bị khác | Một nút, giữ phiên hiện tại |
| Xuất dữ liệu | Tải JSON chứa hồ sơ, phỏng vấn, ghi chú, CV, liên hệ (GDPR Article 20) |
| Xoá tài khoản | Nhập mật khẩu + gõ `XOA TAI KHOAN`. Xoá vĩnh viễn, cascade 206 bảng (GDPR Article 17) |

### Phân tích JD ↔ CV bằng LLM

Đây là lõi bán hàng. Hệ thống hoạt động theo hai chế độ:

| `LLM_PROVIDER` | Kết quả |
| --- | --- |
| Không đặt | Dùng bộ quy tắc có sẵn. Chạy được ngay, không cần tài khoản trả tiền, nhưng chỉ hiểu từ khóa trong từ điển |
| `openai` / `deepseek` / `gemini` / `openrouter` | Gọi LLM thật. Kết quả có `provenance: "llm"`, phần quy tắc vẫn là phương án dự phòng |

Cấu hình `.env` ở thư mục gốc:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
LLM_MODEL=deepseek-chat
```

Hoặc với OpenAI:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Với Gemini:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
LLM_MODEL=gemini-2.0-flash
```

`LLM_BASE_URL` chỉ cần đặt khi dùng proxy hoặc nhà cung cấp tương thích OpenAI khác.

Ba chốt an toàn đã cài trong code:

1. Từ khóa do LLM trả về phải xuất hiện nguyên văn trong JD, nếu không bị loại.
2. Từ khóa đã có trong CV không bị báo là thiếu.
3. Bullet gốc phải khớp nguyên văn với CV, nếu không phần viết lại bị bỏ.

Nếu LLM lỗi, hết hạn mức hoặc trả JSON hỏng, hệ thống tự quay về bộ quy tắc và vẫn trả kết quả. Người dùng không thấy màn hình lỗi.

Kiểm tra cấu hình đang chạy:

```powershell
curl -H "Cookie: jobtrack_session=..." http://127.0.0.1:64364/api/config/status
```

### Nhắc việc qua email

Cần biến `REMINDER_RUNNER_SECRET` trong `.env`. Chạy tay:

```powershell
docker compose exec api node src/reminders.ts --dry-run
docker compose exec api node src/reminders.ts
```

Log sẽ ghi `[mail:brevo-api]` khi gửi thật. Bốn mốc nhắc: T-7, T-3, T-1, và đúng ngày hạn. Mỗi mốc chỉ gửi một lần cho mỗi deadline (bảng `deadline_reminders` có UNIQUE). Đổi deadline thì được nhắc lại.

Tắt nhắc cho một hồ sơ: `UPDATE applications SET reminders_enabled = false WHERE id = '...'`.

Lịch cron mẫu (chạy 08:00 mỗi ngày, giờ Việt Nam):

```cron
0 8 * * * docker compose -f /path/docker-compose.yml exec -T api node src/reminders.ts
```

Múi giờ tính ngày mặc định `Asia/Ho_Chi_Minh`; đổi bằng `REMINDER_TIMEZONE`.

### Rate limiter

Đăng nhập giới hạn theo **cặp IP + email** (7 lần/15 phút) và theo **IP** (60 lần/15 phút):

- Người trong cùng văn phòng sau NAT không bị ảnh hưởng lẫn nhau.
- Kẻ tấn công từ IP khác không khoá được tài khoản nạn nhân.
- Đăng nhập thành công xoá bộ đếm của cặp đó.

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
