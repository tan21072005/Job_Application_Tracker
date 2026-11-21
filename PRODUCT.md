# JobTrack

## Purpose and audience
Người tìm việc cá nhân quản lý cơ hội ứng tuyển và biết bước cần làm tiếp theo. Dùng web trên máy tính khi xem/tổ chức hồ sơ, mobile khi tra cứu hoặc nhập nhanh cơ hội và lịch phỏng vấn.

Sản phẩm **không** dành cho nhà tuyển dụng. Không có tin tuyển dụng, ATS phía công ty, pipeline ứng viên hay quản lý offer. Bề mặt công khai duy nhất là `/api/public/dossier/:token`, cho phép ứng viên chia sẻ hồ sơ năng lực của chính mình.

## Product truth
Ứng dụng chạy thật với Express 5 + PostgreSQL 18, đăng nhập bằng mật khẩu hoặc Google OAuth 2.0, session cookie HttpOnly.

**Trang chính:** Tổng quan, Hồ sơ ứng tuyển (danh sách + pipeline), Lịch phỏng vấn, Phân tích, Lộ trình AI, Cài đặt. Mỗi công cụ bên dưới cũng là một trang thật trong vùng nội dung (`#f/<key>`), không mở popup.

**Nhóm Làm việc:** Mạng lưới kết nối (CRM liên hệ HR/headhunter), Hộp thư thông minh (bóc tách email mời phỏng vấn), Chiến dịch Outreach, So sánh cơ hội (ma trận quyết định có trọng số), Hồ sơ công ty (kèm tab Radar Văn hóa và bộ câu hỏi phỏng vấn ngược).

**Nhóm Chuẩn bị:** Thư viện CV (bản gốc + bản theo vị trí), Tối ưu hóa ATS (chẩn đoán từ khóa, viết lại bullet theo Google X-Y-Z), Giả lập phỏng vấn (phiên nhiều lượt), Tốc độ & Điểm nghẽn pipeline, Dự báo thu nhập & ESOP, Hồ sơ bảo chứng (dossier chia sẻ được). Lộ trình AI có hai tab: kỹ năng cần bổ sung và năng lực & thăng tiến.

**Nhóm Khám phá:** Rada việc làm (theo dõi tin tuyển dụng theo tiêu chí).

**Cài đặt → Nâng cao:** Dữ liệu Web (PageWeave) nằm ở đây thay vì menu chính, vì đa số người tìm việc không dùng tới.

Bảy trạng thái hồ sơ: Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn. Mỗi hồ sơ có ghi chú, một hành động tiếp theo, deadline và nhiều vòng phỏng vấn lưu UTC + múi giờ IANA gốc. Có chống trùng theo URL hoặc cặp source + job code, optimistic concurrency qua `version`, thùng rác có khôi phục, và dashboard bốn chỉ số. Mỗi người dùng chỉ thấy dữ liệu của mình.

**Phạm vi đã thu hẹp:** 28 module doanh nghiệp (FinOps, ESG, Cyber Risk, Antitrust, Treasury, SOX, IR, M&A, Supply Chain, Total Rewards, Succession, AI Governance, Privacy…) đã bị xoá ở commit `469afed`. Chúng mô phỏng công việc nội bộ của CFO/CISO/General Counsel — không phục vụ người tìm việc, và chiếm 72,8% service code. Migration `011_drop_enterprise_tables.sql` xoá 175 bảng tương ứng, đưa DB từ 215 xuống 40 bảng.

## Delivery and stack
`apps/web` — React 19 + Vite 8 + TypeScript, Tailwind 4 cho utility, `jobtrack.css` cho component với 280 design token.

`apps/api` — Express 5, PostgreSQL 18, 10 migration (011 là migration xoá bảng enterprise). Argon2id cho mật khẩu, JWT cho session, rate limit 60/15 phút theo IP và 7/15 phút theo cặp IP + email.

`packages/jobtrack-contract` — schema, validator và hàm thuần dùng chung giữa web và API.

`packages/jobtrack-mcp` — MCP server stdio cho phép trợ lý AI thao tác hồ sơ qua grant token.

`apps/web/src/components/enterprise.ts` đã bị xoá cùng 28 module. Không còn cờ `VITE_ENTERPRISE_MODULES`.

Mặc định chạy bằng `docker compose up -d`, web ở `http://127.0.0.1:64364`.

## Voice and success
Nhãn tiếng Việt rõ nghĩa. Ưu tiên lịch sắp tới, việc cần làm và trạng thái hồ sơ; thao tác xoá có xác nhận và đi qua thùng rác.

Thành công: người dùng biết ngay hôm nay cần làm gì cho cơ hội nào, không phải mở nhiều màn hình.

## Evidence
`RUN-LOCAL.md` mô tả cách chạy, cấu hình Google OAuth, nhắc việc qua email và phạm vi tính năng hiện tại. `docs/screenshots/README.md` chụp 17 màn hình ở 1440×900 và 390×844. `planning/` giữ tài liệu lịch sử và không phản ánh phạm vi hiện tại.
