# Phạm vi phát hành và định nghĩa hoàn thiện

“100%” nghĩa là tất cả tiêu chí bắt buộc của release scope dưới đây được kiểm chứng trên cùng release candidate, không còn lỗi P0/P1 và mọi giới hạn được công bố. Không có nghĩa hết mọi ý tưởng tương lai hoặc bảo đảm phần mềm không bao giờ có lỗi.

## Phạm vi bắt buộc

Web chính responsive + API + DB + contract; candidate profile; datasets đã có; extension PageWeave/JobTrack; ATS và thư xin việc đúng năng lực thực; Pro/checkout ở môi trường kiểm thử có thể sử dụng; URL import và subscriptions; MCP và chatbot n8n có thể thao tác dữ liệu theo quyền user; development controller; CI, backup/restore, observability và tài liệu bàn giao.

5 concept trong `apps/experiences` giữ không hỏng và không bị sửa ngoài scope. Việc nhân toàn bộ backend/AI/billing vào cả 5 là một release riêng. AutoProfile Vault có context liên quan nhưng cần intake riêng trước tích hợp. Không đưa cloud deployment, thanh toán thật, gửi thư/ứng tuyển tự động, crawl đại trà hoặc huấn luyện model vào mặc định của release local này.

## Ma trận nghiệm thu chức năng

Mỗi dòng phải có evidence gồm commit, môi trường, thời gian, lệnh/kịch bản, expected/actual và kết quả. Test tự động có assert hoặc kịch bản người dùng có ảnh/log được làm sạch; ảnh trang login không chứng minh các luồng nghiệp vụ khác.

| Mã | Nhóm | Tiêu chí bắt buộc |
| --- | --- | --- |
| A01 | Cài đặt và schema | Cài từ checkout sạch theo lockfile; build được; DB test riêng; fresh schema và upgrade từ baseline qua migrations hiện có giữ dữ liệu; checksum/advisory lock/idempotent đúng |
| A02 | Tài khoản và session | Register/login/logout/me, validation mật khẩu theo source đã thống nhất, limiter, expiry/revoke và logout mọi nơi nếu UI có; không lộ user khác; invalid Bearer không downgrade sang cookie |
| A03 | Hồ sơ ứng tuyển | Tạo/xem/sửa, search/filter/sort/pagination, URL/source-code duplicate, confirm reapply, status/history, draft recovery theo user, ETag/If-Match/409/412/422; thay đổi đồng thời không mất dữ liệu |
| A04 | Xóa và phục hồi | Trash/restore, duplicate sau restore, purge theo chính sách tài khoản và điều kiện nhạy cảm tương đương UI; bulk partial failure rõ; retry không xóa/tạo hai lần |
| A05 | Lịch/phỏng vấn | Tạo/sửa/status-only/reschedule-only, timezone/DST, cancelled/completed/overdue, không giữ lịch mồ côi khi application thay đổi; calendar và list nhất quán |
| A06 | Tổng quan và nhắc việc | Chỉ hiển thị việc/deadline/phỏng vấn đúng thời điểm và trạng thái; liên kết tới hành động thật; empty state, clock tick, dữ liệu dưới20 và nhiều trang; không có số liệu mock trong chế độ tài khoản thật |
| A07 | Import/export | CSV round-trip đúng Unicode/ngày/status, preview lỗi từng hàng, duplicate, dung lượng giới hạn; CSV formula injection được xử lý; xuất chỉ dữ liệu thuộc user |
| A08 | Profile | Form web/extension/API thống nhất; validation kiểu/độ dài/skills/contact, version/concurrency, preview; phân biệt trường thiếu và chủ động xóa; không invent CV/kinh nghiệm |
| A09 | Datasets | Tạo/list/detail/record CRUD/schema/export, ownership và pagination, limits và quota atomic; untrusted cell/text không chạy script/formula; extension tạo dữ liệu rồi web đọc đúng |
| A10 | URL import | HTTP public/JSON-LD/HTML/SPA được trích có nguồn/confidence; người dùng sửa preview trước lưu hoặc AI lưu theo yêu cầu rõ; malformed/blocked/429/timeout/oversize/duplicate có kết quả đúng; không truy cập mạng nội bộ |
| A11 | Subscriptions | Tạo/pause/resume/delete, schedule/timezone, bounded worker/lease/retry/backoff, dedup tin cũ, quyền owner; không tạo traffic khi paused hoặc không được user yêu cầu |
| A12 | ATS | Hiển thị rõ heuristic hoặc model + version, lý do/skill gaps có nguồn trong JD/profile; thiếu profile không tạo điểm gây hiểu nhầm; không cam kết điểm tương đương hệ thống tuyển dụng thực |
| A13 | Thư xin việc | vi/en và tone có tác dụng; chỉ dùng sự thật profile/JD, thiếu dữ liệu thì hỏi/để trống; edit/copy/export/clear state; lỗi/quota không mất draft; không tự gửi ra ngoài |
| A14 | Pro và thanh toán | Gói/giá/quota từ server; checkout test, pending/paid/failed/expired; webhook có xác thực + replay protection + atomic dedup, không kích hoạt hai lần; user thường không tự activate; không dùng tài khoản ngân hàng ví dụ cho chuyển tiền thật |
| A15 | MCP | Initialize/negotiation/list/call/error chuẩn theo transport đã chọn, auth và scopes/revoke; tools đủ feature inventory hoặc exception rõ; mọi mutation dùng cùng domain service, expectedVersion, idempotency và receipt; purge không vượt quyền UI |
| A16 | Client matrix | Claude, ChatGPT, Codex, Antigravity có version/account/transport cấu hình đã thực nghiệm; list/read/create/update/conflict/retry/revoke/cross-user. Nếu client không hỗ trợ, ghi blocker và phương án; không ghi PASS giả |
| A17 | n8n | Workflow JobTrack riêng, credential runtime riêng, context owner được server xác thực; tool gateway/runs có limit/timeout/cancel/dedup; không cho model tự chọn userId; n8n gián đoạn không giả vờ đã thao tác |
| A18 | Chat trên web/mobile | Ưu tiên native n8n chat khi tương thích auth; hội thoại theo owner, login/logout/user switch không rò; loading/stream hoặc chế độ response công bố rõ, cancel/error/retry/history, kết quả tool cập nhật UI; không render HTML nguy hiểm |
| A19 | Extension | Install/unpacked, permissions theo tính năng, save/import/profile/ATS/letter/Pro/datasets theo inventory thực; token pair/expire/revoke, offline/retry và untrustedpage; kiểm trên Chrome thật, refresh không mất dữ liệu đã lưu |
| A20 | UI33 và accessibility | 33 trang được mapping implemented/merged/not-applicable có lý do; desktop1440/tablet768/mobile390 và320 không tràn ngang; keyboard/focus/dialog/form/contrast, loading/empty/error/success/conflict, text Việt và Noto Sans; không có nút placeholder |
| A21 | Agents | Live sandbox canary, worktree/branch riêng, path/secret/comment/digest gates, max3 và sameerror2, timeout kill verified giữ lease khi bất định; reviewer độc lập + commit đúng feature; không auto push/merge hay sửa sibling |
| A22 | Ops và release | CI clean runner pass; browser E2E; restore vào DB riêng kiểm counts/FK/criticalflows; HTTP load có owner isolation; health/log redaction/metrics; rollback rehearsal và UAT có sign-off |

## Các cổng chất lượng

1. **G0 — baseline đáng tin:** inventory route/screen/tools/test, kết quả hiện hành và test DB isolation đã xác minh; tài liệu mâu thuẫn được đánh dấu.
2. **G1 — nền tảng an toàn:** auth/ownership/CSRF, mutation transaction/idempotency, fetcher, billing access checks có regression; không còn P0.
3. **G2 — tính năng khép kín:** từng vertical slice API → UI/extension/AI có success/error/ownership/concurrency và trạng thái thật.
4. **G3 — tích hợp thực:** n8n, từng MCP client và browser thật có evidence; giới hạn transport/provider ghi rõ. Blocker client bắt buộc chưa giải quyết thì chưa đạt toàn release.
5. **G4 — vận hành:** CI, migration, restore, HTTP load, secrets review, accessibility và AI eval qua ngưỡng đã đóng băng trước khi chạy.
6. **G5 — nghiệm thu:** người dùng thử dữ liệu mẫu riêng; không P0/P1, P2 còn lại phải được chấp nhận rõ; checklist/release notes/version/rollback hoàn chỉnh.

## Ngưỡng và mức lỗi

P0: lộ/ghi chéo dữ liệu, auth bypass, SSRF nội bộ, payment giả, mất dữ liệu. P1: luồng chính không hoạt động, mutation lặp, quota sai, restore không dùng được, UI/mobile chặn tác vụ. Không phát hành khi còn P0/P1.

Ngưỡng khởi tạo để chốt ở C00/C24: toàn bộ negative ownership/auth/replay cases đạt; 0 hành vi vượt quyền trên tập eval; 0 chi tiết kinh nghiệm bịa trong thư; trích company/position đúng ít nhất90% bộ JD có ground truth; latency/cost báo p50/p95 theo provider. HTTP app-only đề xuất p95≤500ms tại20 virtual users/5phút, error<1%, không tính provider latency; phải ghi cấu hình máy và phê chuẩn ngưỡng trước chạy. Không sửa benchmark sau chạy để tạo PASS.
