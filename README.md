# JobTrack

Ứng dụng theo dõi ứng tuyển cho **người tìm việc cá nhân**: quản lý hồ sơ, lịch phỏng vấn, deadline và biết bước tiếp theo cần làm.

Chạy local: **http://127.0.0.1:64364/** — xem [RUN-LOCAL.md](RUN-LOCAL.md) để biết cách khởi động, cấu hình Google OAuth và nhắc việc qua email.

## Tính năng

**Bảy trang chính:** Tổng quan, Hồ sơ ứng tuyển, Lịch phỏng vấn, Phân tích, Lộ trình AI, Dữ liệu Web, Cài đặt.

**Mười bốn công cụ hỗ trợ**, chia ba nhóm:

| Nhóm | Công cụ |
| --- | --- |
| Làm việc | Mạng lưới kết nối, Hộp thư thông minh, Chiến dịch Outreach, So sánh cơ hội, Hồ sơ công ty |
| Chuẩn bị | Thư viện CV, Tối ưu hóa ATS, Giả lập phỏng vấn, Luyện trả lời phỏng vấn, Lộ trình thăng tiến, Tốc độ & Điểm nghẽn, Radar Văn hóa, Dự báo thu nhập & ESOP, Hồ sơ bảo chứng |
| Khám phá | Rada việc làm |

## Kiến trúc

| Thư mục | Nội dung |
| --- | --- |
| `apps/web` | React 19 + Vite 8 + TypeScript, Tailwind 4, 280 design token |
| `apps/api` | Express 5 + PostgreSQL 18, 11 migration, Argon2id, JWT session |
| `packages/jobtrack-contract` | Schema, validator, hàm thuần dùng chung |
| `packages/jobtrack-mcp` | MCP server cho trợ lý AI thao tác hồ sơ |

Stack chạy bằng Docker Compose: web (nginx) ở cổng 64364, api và postgres trong mạng nội bộ.

## Đăng nhập

Email + mật khẩu (15–64 ký tự), hoặc **Tiếp tục với Google** qua OAuth 2.0 authorization code + PKCE. Google client cần redirect URI `http://127.0.0.1:64364/api/auth/google/callback`; hướng dẫn đầy đủ ở [RUN-LOCAL.md](RUN-LOCAL.md).

## Phát triển

```bash
npm --prefix apps/web run dev     # web ở 64364
npm --prefix apps/api run dev     # api ở 64366
npm --prefix apps/web run test    # 187 test
npm --prefix apps/api run test    # 291 test
npm run check:all                 # toàn bộ: contract, api, mcp, extension, web, build, kiến trúc
```

Quy trình điều phối agent/worktree nằm ở [docs/agents](docs/agents/README.md); đọc `AGENTS.md` trước khi giao việc.

## Phạm vi

Sản phẩm **không** dành cho nhà tuyển dụng — không có tin tuyển dụng, ATS phía công ty, pipeline ứng viên hay quản lý offer. 28 module doanh nghiệp từng có trong repo đã bị xoá ở commit `469afed` vì mô phỏng công việc của CFO/CISO thay vì giúp người tìm việc; migration `011_drop_enterprise_tables.sql` xoá 175 bảng tương ứng và đưa database từ 215 xuống 40 bảng. Chi tiết phạm vi ở [PRODUCT.md](PRODUCT.md).

Ảnh giao diện: [docs/screenshots](docs/screenshots/README.md).
