# Hiện trạng tại mốc lập plan

Ngày: 2026-10-21. Đây là kiểm kê source đọc trực tiếp; không phải chứng nhận phát hành. Không đọc dotenv/accounts hoặc kết nối DB trong đợt lập plan.

## Cấu trúc và runtime

| Thành phần | Vị trí | Trạng thái được biết |
| --- | --- | --- |
| Web chính | `apps/web` | React 19/Vite; cấu hình dev 64364; có repository/API và ChatWidget tùy biến |
| Backend | `apps/api` | Express/TypeScript, cấu hình 64366; server.ts chứa nhiều route chung |
| Contract | `packages/jobtrack-contract` | Schema/normalization dùng chung; enum source có Saved, Applied, Screening, Interview, Offer, Rejected, Withdrawn |
| PostgreSQL | Native local theo master context | Báo cáo PostgreSQL 18:5432, DB jobtrack; chưa xác minh runtime mới |
| Migrations | `apps/api` và migration files | Có 001–006 trong source; master báo đã áp dụng 6; chưa truy vấn ledger thực tế |
| Extension | `packages/jobtrack-extension` | Manifest V3, tên PageWeave v1.2.0; source đã có chức năng dữ liệu ngoài 4 tab JobTrack được mô tả cũ |
| MCP | `packages/jobtrack-mcp`, API `/api/mcp` | Có custom JSON-RPC stdio/HTTP và tools; chưa đủ bằng chứng tương thích mọi client |
| AI/n8n | `/api/ai/chat`, ChatWidget, workflow tham chiếu | BFF có forward JSON và fallback nội bộ; chưa chứng minh streaming/full-control end-to-end |
| 5 trải nghiệm | `apps/experiences`, `design` | Atlas/Dossier/Indexer/Rhythm/Workbench; giữ nguyên, chưa coi là 5 sản phẩm production đã nghiệm thu |
| Thiết kế chủ đạo | `design/JobTrack-UI.drawio` | 33 trang web/mobile, tiếng Việt, sáng/xanh; cần coverage từng màn hình |
| Điều phối development | `tools/agent-control`, `docs/agents` | Controller/policy/tests đã có; live sandbox lỗi, xem bên dưới |
| AutoProfile Vault | `D:\Project\AutoProfile_Vault` | Dự án độc lập ngoài workspace; thông tin do người dùng cung cấp, chưa audit trong plan này |

## Đã có nền tảng nghiệp vụ

Auth/session, applications/lifecycle/duplicate/reapply, interviews, dashboard, trash/restore, import/export, candidate profile, datasets, URL import, subscriptions, ATS/thư xin việc, membership/checkout/webhook đã có các phần code và tests. Không yêu cầu dựng lại toàn bộ. Mỗi phần cần audit acceptance hiện hành rồi chỉ sửa khoảng trống có bằng chứng.

T01–T10 của plan cũ được báo cáo hoàn tất trước đây. Master context sau đó báo API 44/44, web 34/34 và extension pass. Đây là **báo cáo lịch sử**, không phải kết quả mới của commit hiện tại.

## Khoảng trống cụ thể quan sát được

1. **Auth/CSRF:** đường Bearer không hợp lệ có thể rơi tiếp sang cookie; nhánh bỏ kiểm tra Origin dựa vào header bắt đầu bằng Bearer. Cần regression chứng minh và đóng nhánh credential downgrade, kiểm tra scopes trên từng route. Không khẳng định đã khai thác thực tế.
2. **MCP:** source package không có dependency SDK MCP chính thức; custom initialize dùng protocol cố định, HTTP router chủ yếu POST. Tài liệu cũ nói SDK/SSE/ChatGPT/OAuth/native chat nhưng thiếu bằng chứng tương ứng. Router Bearer không chuyển đầy đủ scopes; cookie ownership cần kiểm chứng trước khi công bố hỗ trợ.
3. **Mutations AI:** receipt/audit được insert riêng sau mutation và có nhánh nuốt lỗi; chưa có idempotency bền vững dùng cùng transaction. Update có đường tự lấy latestVersion; purge có thể gọi trực tiếp từ tool. Cần thống nhất semantics với thao tác web và quyền đã cấp.
4. **n8n:** BFF dùng JSON một lượt, timeout 15s, forward session/user và key cấu hình; chưa có hội thoại thuộc user bền vững, NDJSON/stream/cancel/resume hoặc run-scoped ticket được xác minh. Fallback nội bộ không chứng minh AI đã thao tác dữ liệu. Widget hiện tại là React tùy biến, không phải `@n8n/chat` như tài liệu cũ.
5. **ATS/thư xin việc:** `ai-pro-service.ts` dùng dictionary/substring scoring và template chuỗi. Chưa gọi model ở hai hàm này; tone không được áp dụng đầy đủ. Template còn có câu khẳng định kinh nghiệm/thành tích dù profile chưa chứng minh. UI phải phân biệt mẫu/heuristic và AI thực, không khuyến khích bịa kỹ năng.
6. **Pro:** checkout có thông tin ngân hàng ví dụ hardcode. Webhook đọc trạng thái rồi update/activate ở các query riêng; concurrent delivery cần transaction/dedup. Có route activate cần rà điều kiện quyền. Chưa có bằng chứng thanh toán thật; không chuyển tiền để test.
7. **Crawler:** có DNS/private-IP check và HTTP redirect checks; headless fallback chưa kiểm từng subrequest/redirect, dùng `--no-sandbox`; đọc toàn body trước khi cắt 2 MiB; queue headless chưa có giới hạn chờ rõ. Regex prompt filtering không tạo ranh giới tin cậy. Cần network enforcement và test SSRF/rebinding trước bật render động.
8. **Extension:** host permissions http/https rộng và content script all_urls; cần least privilege theo thao tác user, flow token/revoke, UX expired/offline và test trên browser thật. Có code cố đặt Origin, phải thay bằng auth/CORS đúng.
9. **Ops/CI:** `check:all` vẫn gọi legacy runner tests, chưa gọi `agents:test`. Những vấn đề CI DB isolation/rtk, browser E2E, restore integrity, HTTP load trong audit trước cần xác minh lại. API integration có tên fullstack không mặc nhiên là browser E2E.
10. **Tài liệu:** enum, transport, widget, client matrix và những câu “100% PASS/production” ở các mốc khác nhau chưa đồng nhất. Cần evidence register theo commit và môi trường.

Các mục này là đầu vào task xác minh/sửa; không lấy số lượng route/test làm phần trăm hoàn thiện.

## Git và agents đã triển khai

Git local được khởi tạo sau khi workspace trước đó không có repository. Baseline source `305f7cb`, bổ sung runtime `74f41f6`, merge điều phối cuối `30db3fd`. Chưa có remote/push. Có ba worktree automation-control/docs/policy và commit riêng. Danh sách chính xác nằm trong snapshot Git của gói bàn giao.

Workers đọc source và trả proposal; controller duy nhất áp dụng patch/commit. Có lane, lease, path/hash/secret/comment checks, checks/review gắn source digest, tối đa 3 lần coder và dừng cùng lỗi 2 lần. Không tự merge/push. Những file chung, migrations, package/CI/README do maintainer quản lý. Không thêm comment code mới; giữ comment cũ.

21/21 tests controller/policy/hooks đã pass bằng fixtures và injected workers/checks tại lượt triển khai trước. Hai decision tests legacy pass; legacy execution timeout fixture chưa pass trên máy thiếu tài nguyên. **Live Codex sandbox probe vẫn lỗi `helper_unknown_error: setup refresh had errors` ngay với Node version.** Chưa có live model worker run được nghiệm thu. Không bypass bằng unrestricted shell.

README/hook không phải phân quyền OS; controller hiện tại không bảo đảm chống tác nhân có quyền local không hạn chế. Muốn ranh giới mạnh cần identity/container riêng, Git common-dir và control plane được bảo vệ bên ngoài worker.

## Những gì chưa chạy trong lượt lập plan

Không chạy full test/build mới, migration, restore, account creation, load test, thanh toán, live n8n/model, thay đổi máy chủ hoặc sửa code ứng dụng. Git tracked sạch ở thời điểm bắt đầu; tài liệu mới là thay đổi riêng ngoài code sản phẩm.
