# Hiểu hệ thống JobTrack trong 15 phút

Tài liệu này viết cho người **không có nền tảng kỹ thuật**. Không cần biết code.
Mục tiêu: bạn biết cái gì đang chạy, dữ liệu đi đâu, phần nào thật, phần nào chỉ là diễn, và sửa gì trước khi bán.

---

## 1. Một câu duy nhất

JobTrack gồm **3 cỗ máy** chạy trong Docker trên máy bạn:

| Cỗ máy | Tên | Nhiệm vụ | Cổng |
| --- | --- | --- | --- |
| Phòng khách | `jobtrack-web` | Hiển thị giao diện, nhận thao tác của bạn | `127.0.0.1:64364` |
| Nhà bếp | `jobtrack-api` | Xử lý logic, kiểm tra quyền, ghi dữ liệu | `64366` (nội bộ) |
| Kho | `jobtrack-postgres` | Lưu toàn bộ dữ liệu | `5432` (nội bộ) |

Ngoài ra có `jobtrack-migration`: một "công nhân" chạy một lần lúc khởi động để tạo/cập nhật cấu trúc kho dữ liệu.

**Ẩn dụ nhà hàng:**
- Web = phòng khách + menu.
- API = bếp + người phục vụ. Bạn không bao giờ vào bếp.
- PostgreSQL = kho nguyên liệu.
- Docker = toà nhà đóng gói từng phòng, mỗi phòng cách ly.
- n8n = đầu bếp thuê ngoài cho món "AI", đi qua một đường hầm riêng.

---

## 2. Khi bạn bấm "Thêm hồ sơ", chuyện gì xảy ra?

1. **React** (trong trình duyệt) bắt sự kiện click.
2. Nó gọi `POST /api/applications` — một "phiếu yêu cầu" gửi tới API.
3. **nginx** trong container web nhận phiếu và chuyển tiếp sang container API.
4. API đọc **cookie phiên** (`jobtrack_session`) để biết bạn là ai.
5. API kiểm tra dữ liệu đầu vào bằng bộ schema dùng chung (`packages/jobtrack-contract`).
6. **Service** (`jobtrack-service.ts`) mở transaction và ghi vào PostgreSQL.
7. PostgreSQL trả về bản ghi vừa tạo.
8. API trả JSON; React cập nhật giao diện.

Toàn bộ app có **150 route API** và **40 bảng**. Nghe nhiều, nhưng chỉ có một luồng chính như trên; các tính năng khác lặp lại đúng khuôn đó.

---

## 3. Bản đồ thư mục

| Thư mục | Nó là gì | Khi nào cần vào |
| --- | --- | --- |
| `apps/web` | Giao diện React 19 + Vite | Sửa màn hình, chữ, màu, nút |
| `apps/api` | Máy chủ Express 5 + PostgreSQL | Sửa logic, thêm API, sửa quyền |
| `packages/jobtrack-contract` | "Từ điển" dùng chung: kiểu dữ liệu + validator | Khi thêm trường mới cho hồ sơ |
| `packages/jobtrack-core` | Hàm lõi dùng chung | Hiếm khi cần |
| `packages/jobtrack-mcp` | Cầu nối cho trợ lý AI thao tác dữ liệu | Khi làm AI thật |
| `packages/jobtrack-extension` | Tiện ích trình duyệt | Khi làm "lưu tin tuyển dụng 1 click" |
| `apps/experiences` | 5 phương án giao diện thử nghiệm | Kho ý tưởng, **không** phải sản phẩm chính |
| `apps/landing` | Landing page tĩnh | Khi làm trang bán hàng |
| `deploy/docker` | Dockerfile + cấu hình nginx | Khi deploy |
| `tools` | Script vận hành: backup, payment giả, agent | Khi vận hành |
| `docs` | Tài liệu thiết kế, runbook, ảnh | Khi cần tra cứu |
| `planning` | Kế hoạch cũ | **Không** phản ánh hiện trạng |

**Quy tắc vàng:** giao diện sửa ở `apps/web`; logic sửa ở `apps/api`; đừng sửa cả hai cùng lúc cho một việc.

---

## 4. Dữ liệu nằm ở đâu? (40 bảng, 5 nhóm)

| Nhóm | Bảng tiêu biểu | Ý nghĩa |
| --- | --- | --- |
| Danh tính | `users`, `sessions`, `oauth_identities`, `password_reset_tokens`, `rate_limits` | Ai đăng nhập, phiên nào còn sống |
| Hồ sơ ứng tuyển | `applications`, `interviews`, `deadline_reminders`, `user_resumes` | Trái tim của sản phẩm |
| Công cụ | `contacts`, `outreach_*`, `company_*`, `career_*`, `chat_messages`, `dataset_records` | 14 công cụ phụ |
| Thương mại | `payment_orders`, `user_memberships`, `usage_ledgers`, `ai_grants` | Gói Pro, thanh toán, quyền AI |
| Hạ tầng | `schema_migrations`, `idempotency_requests`, `system_design_sessions` | Chống trùng, nâng cấp DB |

Mỗi người dùng **chỉ thấy dữ liệu của mình** — API luôn lọc theo `user_id` lấy từ phiên, không lấy từ tham số người dùng gửi lên.

---

## 5. Cái gì THẬT, cái gì chỉ là DIỄN

Đây là phần quan trọng nhất trước khi bán.

| Thành phần | Trạng thái | Bằng chứng / ghi chú |
| --- | --- | --- |
| Đăng ký / đăng nhập email | **Thật** | Argon2id, session JWT HttpOnly, rate limit |
| Đăng nhập Google | **Thật** | OAuth 2.0 + PKCE, cần client Google |
| CRUD hồ sơ, phỏng vấn, ghi chú | **Thật** | Có transaction, version, chống trùng, thùng rác |
| Import/Export CSV, ICS | **Thật** | Endpoint riêng |
| Nhắc deadline qua email | **Thật nếu cấu hình** | Mặc định `MAIL_TRANSPORT=console` → chỉ in ra log, **không gửi thật** |
| ATS optimizer, lộ trình AI, culture radar, ma trận quyết định, dự báo lương | **Thuật toán rule-based** | Không gọi LLM. Chạy ổn định nhưng không "thông minh" như tên gọi |
| Chat AI | **Phụ thuộc n8n** | Gọi webhook n8n; có URL ngrok hardcode; lỗi thì trả câu soạn sẵn |
| Gói Pro / thanh toán | **Mô phỏng** | `PAYMENT_MODE=test`, không có cổng thật, không có tiền thật |
| Landing page | **Có nhưng tách rời** | `apps/landing` không nằm trong `docker-compose.yml` |
| Deploy production | **Chưa có** | Chỉ chạy localhost, `COOKIE_SECURE=false` |

**Kết luận thẳng:** bạn đang có một **ứng dụng thật, chạy được**, nhưng phần "AI" và "thanh toán" trên nhãn chưa tương ứng với thực tế. Đừng bán bằng hai chữ đó cho tới khi làm thật.

---

## 6. Năm rủi ro phải xử lý trước khi mở cho người lạ

1. **URL n8n hardcode trong code**: `https://maximum-eastcoast-obstruct.ngrok-free.dev/...`.
   Nếu bạn tắt máy, chat AI chết. Tệ hơn: mỗi lần chat, API cấp một `grantToken` quyền `full_control` 10 phút và gửi sang đó. Khi deploy thật, phải bỏ URL này và không gửi token ra ngoài.
2. **Thanh toán chưa thật**: chưa nối PayOS/SePay/Stripe. Chưa có máy trạng thái đơn hàng đầy đủ.
3. **Chưa có môi trường production**: `APP_ORIGIN` và cookie đang cấu hình cho localhost. Deploy lên domain phải đổi `COOKIE_SECURE=true`, cấu hình HTTPS, email, backup.
4. **Marketing nói quá**: nếu landing ghi "AI" trong khi chat chỉ là câu soạn sẵn, bạn sẽ bị đòi hoàn tiền và mất uy tín.
5. **14 công cụ dàn trải**: không có công cụ nào đủ sâu để trở thành "must-have". Người dùng không mua "14 tính năng"; họ mua **một việc được giải quyết**.

---

## 7. Tự kiểm tra hệ thống trong 5 phút

```powershell
cd F:\Project\Job_Application_Tracker

# 1. Ba cỗ máy có sống không?
docker compose ps

# 2. API có khoẻ không?
docker exec jobtrack-api node -e "fetch('http://127.0.0.1:64366/api/health').then(r=>r.text()).then(console.log)"

# 3. Database có bao nhiêu bảng?
docker exec jobtrack-postgres psql -U jobtrack -d jobtrack -t -c "select count(*) from information_schema.tables where table_schema='public';"

# 4. Xem log khi bấm thử một nút
docker compose logs -f api
```

Mở `http://127.0.0.1:64364/`. Nếu 3 dòng đầu đều OK, hệ thống đang chạy đúng.

---

## 8. Muốn học code: đọc theo đúng thứ tự này

1. `apps/web/src/JobTrack.tsx` — điều hướng, trang nào hiện khi hash đổi.
2. `apps/web/src/views/Applications.tsx` — một màn hình hoàn chỉnh.
3. `apps/api/src/server.ts` — tìm dòng `app.post('/api/applications'`.
4. `apps/api/src/services/jobtrack-service.ts` — logic thật sự nằm ở đây.
5. `apps/api/migrations/001_initial_schema.sql` — cấu trúc dữ liệu gốc.
6. `packages/jobtrack-contract` — vì sao web và API hiểu nhau.

Chỉ cần hiểu **một luồng** là hiểu 80% phần còn lại.

---

## 9. Từ điển 12 từ

| Từ | Nghĩa đời thường |
| --- | --- |
| API | Người phục vụ: nhận yêu cầu, trả kết quả |
| Endpoint | Một "quầy" cụ thể của người phục vụ, ví dụ `/api/applications` |
| Request / Response | Phiếu yêu cầu / phiếu trả lời |
| JSON | Định dạng phiếu: `{ "company": "FPT" }` |
| Cookie / Session | Thẻ ra vào của bạn sau khi đăng nhập |
| JWT | Con dấu chống giả trên thẻ ra vào |
| Migration | Bản thiết kế sửa kho dữ liệu, chạy một lần |
| Transaction | Ghi nhiều thứ hoặc không ghi gì cả |
| Container | Một phòng đóng gói, có đồ đạc riêng |
| Reverse proxy | Lễ tân: nhận khách rồi chỉ đúng phòng |
| Env | Biến cấu hình bí mật, không nằm trong code |
| CI | Máy tự kiểm tra code mỗi lần bạn đẩy lên GitHub |

---

## 10. Ba câu để tự nhắc

1. **Sản phẩm này giải quyết nỗi đau nào, cho ai, rõ trong một câu chưa?** Nếu chưa, đừng thêm tính năng.
2. **Phần nào là thật, phần nào là diễn?** Đừng bán phần diễn.
3. **Người dùng trả tiền lần đầu vì điều gì?** Làm thật tốt đúng điều đó, cắt phần còn lại.
