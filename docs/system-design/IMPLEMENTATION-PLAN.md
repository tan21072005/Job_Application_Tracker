# Áp dụng thiết kế vào mã nguồn hiện tại

Cập nhật 19/10/2026: `apps/api` và adapter `apps/web` đã triển khai phần chính của SD-02–07 trên PostgreSQL thật, có kiểm thử tích hợp. Các bước SD-01/08–10, kiểm thử trình duyệt live API và cổng production vẫn cần nghiệm thu. Bảng dưới giữ tiêu chí đích để theo dõi phần còn lại; chưa tạo ticket hay deploy bên ngoài.

| Thứ tự | Thay đổi cụ thể | Nghiệm thu trước bước kế |
|---|---|---|
| SD-01 | Tách DTO/runtime schema + normalizer + time helpers thuần khỏi hook React; pin normalization policy | Core cũ không hồi quy; test source/code/URL và Unicode/byte limits; backend không import browser code |
| SD-02 | Tạo apps/api, config validation, pg pool, withTransaction; chuyển schema ứng viên thành migration được đánh số | Migration clean DB + upgrade path; FK/CHECK/index hoạt động; không reset DB có dữ liệu |
| SD-03 | Auth register/login/me/logout; Argon2id, cookie, JWT allowlist, sessions revoke, Origin và limiter | Register tự tạo phiên theo FR-01; logout expired/no-cookie an toàn; wrong Origin; password không log; hai API replica không chấp nhận revoked session |
| SD-04 | Applications CRUD, owner-scoped repository, normalization, active unique, reapply và per-owner lock | Hai user, OR identity, active precedence, create/update/reactivate race và rollback với PostgreSQL thật |
| SD-05 | Parent version/ETag và POST idempotency | 428 missing; 412 stale; key replay sau commit/mất response; khác body cùng key 422; key không vượt owner/scope |
| SD-06 | Nâng shared adapter frontend: auth/me, auto session register, empty↔null/date/instant mapping, version/headers | Cả năm đăng ký/login/logout thật; lỗi giữ draft; retry giữ key; sửa body/reapply tạo key mới; 401 xóa dữ liệu cũ |
| SD-07 | Interview API + ownership + parent version + atomic status sync; timezone validation | UC-11 cả lần tạo thứ hai; Offer/Rejected/Withdrawn giữ nguyên; rollback/cascade; DST gap/fold UI và server không đoán giờ |
| SD-08 | Dashboard một snapshot và list query; N+1/index; page endpoint tương lai | Fixture/clock xác định; total không nhân theo rounds; filtered UI không đổi global metrics; EXPLAIN trên dữ liệu lớn |
| SD-09 | Nâng năm next-action form cho deadline UTC adapter, conflict recovery; regression browser | Date-only không đổi ngày; local deadline gap/fold có lựa chọn; 412 giữ dữ liệu và cho so sánh/tải mới |
| SD-10 | Health/readiness, metrics/redaction, backup/restore, container/edge config, staging | Load test theo giả định; restore RPO/RTO; cookie/Origin qua proxy; smoke 5 app → API → PostgreSQL; release/rollback diễn tập |

SD-06 và SD-07 có thể được triển khai thành nhiều commit, nhưng endpoint mới chỉ bật khi adapter/frontend phù hợp. Schema/contract/checker thiết kế không thay backend. Thứ tự SD-09 phải hoàn tất trước khi lưu deadline thật ở SD-10; không cho frontend gửi local string vào timestamp server.

## Những điểm cần sửa chính xác trong nguồn hiện tại

- `packages/jobtrack-core/src/index.ts`: hiện list suy authenticated từ request thành công, register không reload phiên, DTO deadline giữ local, chưa có If-Match/Idempotency-Key/version. Tách API transport từ demo repository và nâng hợp đồng; không sửa demo thành đăng nhập giả.
- `packages/jobtrack-core/src/domain.ts`: giữ bảy status và formula; pin normalizer và shared runtime validation thay vì chỉ TypeScript type. Domain thuần có thể dùng lại; hook không dùng lại ở server.
- `apps/experiences/{dossier,rhythm,atlas,workbench,indexer}/src/App.tsx`: các nhánh register hiện thông báo đăng nhập lần nữa; sau register 201 phải nhận session và vào workspace. Các form deadline cần giải quyết giờ mơ hồ. Mỗi app có UX riêng cho lỗi 412 nhưng không thay topology.
- Khi mở editor phải giữ baseline version và draft riêng. Reload/cache update từ tab hoặc giao diện khác không được tự reset form đang dirty; hiển thị thay đổi từ xa và để người dùng quyết định trước khi lấy version mới. Chỉ reset khi đổi hồ sơ, lưu thành công hoặc xác nhận bỏ sửa. Nếu cập nhật baseline tự động rồi gửi If-Match mới, cơ chế chống ghi đè sẽ mất tác dụng.
- `apps/experiences/API.md`: bản tương thích cũ được giữ làm lịch sử biên frontend; contract đích trong docs/system-design/openapi.json ưu tiên khi bắt đầu backend. Khi SD-06 hoàn tất, cập nhật lại tài liệu cũ thay vì để hai nguồn chuẩn cạnh tranh.
- `PLAN.md`: kế hoạch gốc có đoạn hiện trạng trước khi viết frontend; xem SYSTEM-DESIGN phần 1 cho hiện trạng mới. Không dùng lịch tám tuần cũ để suy luận backend đã hoàn thành.

## Kiểm chứng theo yêu cầu gốc

| Yêu cầu | Thiết kế đáp ứng | Bằng chứng runtime cần tạo |
|---|---|---|
| FR-01–04, NFR-01–03 | Auth module, cookie/JWT/sessions, Origin, auth/me | API integration + UI auto-register, logout revoke, expiry |
| FR-05–09, BR-02/03/09 | Owned CRUD, two unique indexes, service transaction, cascade | AC-03–07/12, concurrent requests, user B IDs |
| FR-10–13, BR-04/05 | Enums, query allowlist, next action constraint, UTC deadline | Filter/search/sort và deadline trên cả năm bản |
| FR-14–18, BR-06/07 | Interview service cùng transaction/context, at+IANA | AC-08–10, rollback, second round, gap/fold |
| FR-19, BR-08 | Một statement snapshot, application/interview aggregates riêng | AC-11 fixed clock, empty denominator, nhiều round |
| FR-20, NFR-07/08 | Giữ loading/empty/error/focus/confirms từng UI | Keyboard/mobile/API error tests, không chỉ screenshot |
| NFR-09–12 | Index/query plan, module seams, integration CI, health/backup/release | DB thật, measured p95, restore drill, HTTPS staging smoke |

## Cổng production

Không đổi nhãn preview cho đến khi: PostgreSQL integration tests đạt; ownership không leak; concurrent duplicate/idempotency/version đúng; register/session/logout đúng nguồn gốc; timezone roundtrip; browser desktop/mobile qua API cho cả năm; không log secret; migration/backup/restore và rollback có bằng chứng; SLO được đo thay vì suy từ 19 unit test frontend hiện hữu. Các test đã có vẫn hữu ích nhưng không chứng minh các cổng mới.
