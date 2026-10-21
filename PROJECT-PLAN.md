# Kế hoạch hoàn thiện JobTrack

Cập nhật 19/10/2026. Phạm vi sản phẩm lấy từ ba tài liệu trong `Tài liệu/`, [brief đã chốt](planning/jobtrack-ui-redesign/BRIEF.md) và [thiết kế hệ thống](docs/system-design/README.md).

Phần mở rộng mới theo yêu cầu người dùng: [JobTrack AI — MCP, n8n và nhập link](planning/jobtrack-ai/README.md), [plan AI00–AI14](planning/jobtrack-ai/PLAN.md) và [prompt pack/session context](planning/jobtrack-ai/PROMPTS.md). AI có Full control trong tài khoản, dùng n8n hiện có và UI chat native. Phần AI mới ở trạng thái lập kế hoạch, chưa triển khai.

Kế hoạch nền: [PLAN T01–T10](planning/jobtrack-completion/PLAN.md), [PROMPTS](planning/jobtrack-completion/PROMPTS.md). [Baseline-r2](planning/jobtrack-ai/BASELINE.md) xác nhận T01–T10 có implementation/reported pass, không còn backlog xây từ đầu. AI00a đối chiếu source đã xong; AI00b inventory AI còn mở. R01–R04 là delta CI/browser/restore/đo tải, không yêu cầu làm lại MVP.

Trạng thái 19/10/2026: frontend/API/PostgreSQL, contract, session/CRUD/ETag/idempotency, UI recovery, Compose/CI và ops scripts đã có source. Báo cáo lần trước ghi9 contract/30 API/30 web/3 runner đạt; lượt sửa plan này chỉ đối chiếu source/artefact, không chạy lại tests. Browser/API thật và ops evidence cần delta có mục tiêu trong BASELINE; không gọi toàn bộ release đã tái xác minh100%.

Các task triển khai tiếp theo dùng [vòng điều phối agent](tools/agent-loop/README.md): Planner giao việc, Coding agent sửa code, runner chạy check cố định, Reflector viết prompt sửa từ lỗi, Reviewer đối chiếu yêu cầu. Giới hạn ba lượt coding cho mỗi task, dừng sớm nếu cùng lỗi lặp hai lượt; hoàn thành chỉ sau test/build đạt và review `pass`.

## Mục tiêu và ranh giới

Người tìm việc cá nhân quản lý dưới 20 hồ sơ, biết việc cần làm và lịch phỏng vấn sắp tới. Hoàn thiện một giao diện chính tại `apps/web`, responsive desktop/mobile, giữ nhận diện sáng/xanh. Năm bản trong `apps/experiences` vẫn là các phương án độc lập, không nhân rộng thay đổi này sang năm app.

“Đủ chức năng giao diện” nghĩa là các luồng MVP có điều khiển, validation, phản hồi, khả năng phục hồi và kiểm thử; không coi form đăng nhập hay adapter API là backend đã hoạt động. Yêu cầu mới đã bổ sung AI/MCP/n8n/import và audit/khôi phục liên quan trong plan AI. CV, Admin, email/calendar sync, reset mật khẩu hoặc nhiều task ngoài MVP vẫn là phạm vi riêng.

## Ma trận chức năng và điều kiện nghiệm thu

| ID | Chức năng | Điều kiện nghiệm thu |
|---|---|---|
| UI-01 | Đăng ký/đăng nhập/đăng xuất | Email và password hợp lệ, lỗi tại trường, loading/khóa submit, thông báo chung khi sai, có nhánh rate limit; demo được ghi rõ |
| UI-02 | Phiên hết hạn và lỗi truy cập | Có thông báo phiên hết hạn, lỗi quyền và đăng nhập lại. Tự động khóa dữ liệu cũ/khôi phục draft cùng danh tính cần auth-me của backend, nghiệm thu tại P5 |
| UI-03 | Dashboard | Hành động quá hạn/gần hạn trước, lịch Scheduled sắp tới theo thời gian; đủ công ty/vị trí, giờ gốc/thiết bị; bốn chỉ số đúng công thức |
| UI-04 | Danh sách/pipeline | 7 trạng thái có nhãn, tìm/lọc/sắp xếp kết hợp, giữ bộ lọc khi vào/ra chi tiết, mobile không tràn ngang |
| UI-05 | Tạo/sửa/chi tiết hồ sơ | Đủ trường theo tài liệu, 2 trường bắt buộc; giữ input khi lỗi; chống submit lặp; form bổ sung mở/đóng không mất dữ liệu |
| UI-06 | Chống trùng/ứng tuyển lại | Ưu tiên bản đang hoạt động theo URL hoặc source+code; có mở bản cũ, xác nhận reapply trước lưu |
| UI-07 | Ghi chú, next action, deadline | Một hành động hiện tại; sửa nhanh từ dashboard/chi tiết; xóa hành động xóa deadline; không tạo task list mới |
| UI-08 | Phỏng vấn | Nhiều vòng trong ngữ cảnh application, tạo/sửa/dời lịch/xóa, 3 status; UTC+IANA, DST gap/fold; đồng bộ parent status theo BR-06 |
| UI-09 | Xóa dữ liệu | Xác nhận nội dung và cascade, hủy an toàn, khóa nút khi xử lý; lỗi giữ dialog cho thử lại |
| UI-10 | Trạng thái hệ thống | Rỗng đầu tiên, không kết quả, chưa có interview/lịch, skeleton, lỗi tải/lưu, 404, thành công, lỗi storage, offline |
| UI-11 | Accessibility/responsive | 320/390/768/1440px, focus/keyboard tabs/dialog, vùng chạm mobile ≥44px, nhãn/status không chỉ dựa màu, text dài không phá layout |

Đối chiếu nguồn 33 trang nằm tại [SCREEN-COVERAGE.md](planning/jobtrack-ui-redesign/SCREEN-COVERAGE.md). Trang form mobile nối tiếp trong Draw.io là một form cuộn, không phải các submit tách biệt.

## Trình tự thực hiện

| Giai đoạn | Việc cụ thể | Điều kiện hoàn thành |
|---|---|---|
| P1 — Chốt phạm vi | Kiểm kê UI hiện tại và ma trận 33 trang | Mỗi chức năng có nguồn code và cách kiểm chứng; không hỏi lại brief đã chốt |
| P2 — Hoàn thiện frontend | UI-01–11; bổ sung cập nhật nhanh, dữ liệu biên, bảo vệ thay đổi, lỗi/session và phục hồi | Chạy demo đầy đủ; API UI kiểm tra bằng response mô phỏng có ghi rõ |
| P3 — Nghiệm thu frontend | Test domain, Playwright luồng/edge cases, ảnh desktop/mobile, review độc lập | Build/test qua; các sửa bắt buộc có bằng chứng; giới hạn được ghi rõ |
| P4 — Backend dữ liệu thật | apps/api Express/TypeScript + PostgreSQL theo SD-01–05/07/08 | Migration, auth/session, ownership, concurrent duplicate, transaction, version/idempotency kiểm tra trên PostgreSQL thật |
| P5 — Tích hợp | Nâng adapter DTO/auth-me/If-Match/Idempotency-Key, mapping ngày/UTC, xử lý conflict | CRUD và auth thật, 2 user không xem/sửa dữ liệu nhau; dirty draft không bị ghi đè |
| P6 — Vận hành | CI, staging, backup/restore, health/monitoring, load/rollback | Diễn tập phục hồi và checklist release có kết quả thực tế; deploy khi có môi trường được chọn |

P4–P5 và phần implementation P6 được kế thừa từ nền T01–T10; chỉ xử lý delta nghiệm thu R01–R04 và phần mở rộng AI00–AI14. Các gate production vẫn cần evidence đúng môi trường. Năm phương án `apps/experiences` chưa chuyển sang API thật.

## Quyết định thực thi

- Hành động có deadline xếp tăng theo thời gian: quá hạn trước, tiếp đến sắp đến hạn, sau cùng chưa có deadline; cùng deadline dùng ngày tạo rồi ID để ổn định. Không loại trạng thái kết thúc vì tài liệu không quy định tự xóa next action.
- Lịch phỏng vấn chỉ lấy Scheduled chưa qua giờ hiện tại, tăng theo instant UTC; cùng thời điểm giữ thứ tự ổn định theo hồ sơ/vòng.
- Form giữ nội dung trong bộ nhớ khi lưu lỗi, không ghi mật khẩu hay draft nhạy cảm vào URL/localStorage riêng. Source đã có phục hồi draft theo auth-me user ID; R02 kiểm flow thực cùng/khác owner trong browser/API thật.
- Giữ dữ liệu demo hiện có, không tự reset. Dữ liệu fixture mới dùng ngày tương đối để các ví dụ sắp tới còn xem được.
- Figma chưa nghiệm thu do hết quota; không dùng đó làm lý do dừng frontend, không hứa khớp pixel khi chưa lấy lại context.

## Bàn giao

Nguồn `apps/web`, hướng dẫn chạy `apps/web/README.md`, thiết kế `apps/web/DESIGN.md`, checklist/bằng chứng trong `planning/jobtrack-ui-redesign/`. URL local: `http://127.0.0.1:64364/`. Kết quả của lượt hoàn thiện sẽ được ghi tại `COMPLETION.md`; mỗi phần phải phân biệt đã kiểm tra runtime, mới có code hoặc đang chờ backend.
