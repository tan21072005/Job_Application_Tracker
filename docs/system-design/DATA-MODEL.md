# Mô hình dữ liệu và tính đúng đắn

## 1. Bảng và ranh giới sở hữu

`users 1 → n applications 1 → n interviews`. Thêm `sessions` và `idempotency_requests` thuộc user để revoke phiên và bảo vệ retry. Hai bảng này phục vụ kỹ thuật, không thêm màn hình quản lý phiên hoặc tính năng sản phẩm mới.

Application là aggregate: version bao gồm thông tin hồ sơ lẫn interview. Interview không lưu user_id lặp lại; query phải join ứng tuyển theo owner. Không dùng UUID khó đoán thay cho quyền truy cập. FK cascade xóa interview khi xóa application; xóa owner cascade dữ liệu là hành vi DB kỹ thuật, không phải endpoint xóa tài khoản trong MVP.

| UI / wire | DB | Quy tắc |
|---|---|---|
| company, position | varchar(250) NOT NULL | trim kiểm tra bắt buộc |
| url / source / jobCode | url / source / job_code | tùy chọn; server tạo khóa normalized |
| workMode | work_mode | On-site, Hybrid, Remote hoặc null |
| appliedAt | date | YYYY-MM-DD; không chuyển qua UTC |
| notes / preparation | text | tối đa 5.000 ký tự; không log |
| nextAction / deadline | next_action / deadline_at | một hành động; có deadline phải có nội dung |
| salary | varchar(250) | văn bản, không tính lương |
| at / timezone | timestamptz / varchar(100) | instant + IANA gốc được kiểm tra ở server |
| version | integer | tăng sau mọi mutation aggregate |
| id / createdAt / updatedAt | uuid / timestamptz | server quản lý; cấm mass assignment |

Text/date tùy chọn ở wire dùng `''` để giữ form hiện tại; repository map sang null ở SQL và ngược lại. Deadline wire dùng instant/null, khác Draft hiện tại là local string. Không dùng một serializer chung cho date-only và instant.

`schema.sql` là DDL ứng viên PostgreSQL 18, chưa chạy migration. Độ dài text là code point ở hợp đồng; quy tắc byte cho khóa URL/source/code là giới hạn kỹ thuật mới phải bổ sung lỗi form tương ứng trước khi bật API.

## 2. Khóa nhận diện tin tuyển dụng

Trong một owner, trùng nếu **source + jobCode** cùng tồn tại và cùng normalized, **hoặc URL normalized** bằng nhau. Company/position giống không tạo khóa. Hai unique index riêng phản ánh phép OR, không gộp cả ba thành một composite key.

Policy v1 đề xuất: source/code trim, NFC rồi lower-case không phụ thuộc locale; empty thành null. URL chỉ http/https, dùng URL serializer chuẩn để normalize host/default port/escaping, bỏ fragment, loại `utm_*`, `fbclid`, `gclid`, sort query; giữ các query còn lại, không bỏ job ID hoặc lower-case path. Không strip trailing slash vô điều kiện. Cần fixture URL lặp query, percent encoding, hostname Unicode, tracking và meaningful ID. Current domain `.toLocaleLowerCase()` chưa pin policy; tách thành hàm chung và migration dữ liệu normalized có version trước khi dùng server.

Giới hạn normalized URL 2048 byte để unique B-tree theo full value trên cấu hình PostgreSQL chuẩn 8 KiB, tránh hash collision. URL quá giới hạn trả 400 fields.url; không cắt ngầm. Source/code normalized mỗi giá trị <=256 byte. Đo lại khi đổi block size/collation; byte limits là lựa chọn thiết kế, không trích từ ByteByteGo.

Active = Saved, Applied, Screening, Interview, Offer. Partial unique index chỉ ràng buộc active; terminal có thể trùng. Service vẫn phải kiểm tra mọi bản trước create, ưu tiên active; nếu chỉ terminal thì yêu cầu `confirmReapply=true`. Kể cả người dùng tạo bản terminal, create vẫn chặn nếu active đã có theo quy tắc hiện tại. Update một bản terminal giữ terminal có thể giữ identity trùng; chuyển về active phải kiểm tra lại. Unique index không tự kiểm tra quyền hoặc yêu cầu xác nhận reapply.

## 3. Serialize theo owner, không chỉ check rồi insert

MVP ghi ít trên một tài khoản nên chọn `READ COMMITTED` + khóa hàng owner, dễ kiểm tra hơn distributed lock. Tất cả đường ghi application/interview phải tuân cùng thứ tự:

1. BEGIN trên một pg client. Auth đã xác minh session; trong transaction kiểm tra lại session chưa revoke/hết hạn bằng `FOR SHARE` trước owner lock nếu thao tác cần bảo đảm đến commit.
2. `SELECT id FROM users WHERE id=$userId FOR UPDATE`. Các tài khoản khác không chặn nhau. Bất kỳ tác vụ nền nào ghi dữ liệu ứng tuyển cũng phải theo quy tắc này.
3. Tìm bản ghi có `user_id=$userId`; kiểm tra parent If-Match, trừ create mới. Không tìm chỉ theo id rồi sửa không owner.
4. Với create có Idempotency-Key: sau owner lock, kiểm tra replay **trước If-Match** để retry của một interview đã commit vẫn trả đúng kết quả cũ.
5. Normalize/validate, kiểm tra duplicate OR và reapply lại trong transaction, thực hiện write, tăng parent version/updated_at.
6. Ghi idempotency response thành công trong cùng transaction; COMMIT; chỉ sau commit mới trả 2xx. Mọi lỗi ROLLBACK, luôn release client.

Session row lock phải luôn đi trước owner lock ở mọi request. Logout chỉ revoke session, không chờ owner sau khi giữ session lock. Điều này tránh vòng khóa ngược; long-running mutation có thể hoàn tất trước logout, sau logout commit request mới bị chặn. Không băm password hoặc gọi HTTP ngoài khi giữ owner lock.

Partial unique là lớp bảo vệ bổ sung. Hai concurrent create cùng identity: request sau đợi, thấy bản active vừa commit và trả 409. Hai create terminal cùng identity không-confirm: request sau thấy terminal và cũng yêu cầu xác nhận; hai request thực sự có xác nhận khác key có thể tạo hai bản mới theo ý người dùng. Cùng key luôn replay một kết quả. Update/reapply/delete cạnh tranh dùng cùng lock để không kiểm tra trên trạng thái lỗi thời.

Owner lock là trade-off: hai ghi khác hồ sơ của cùng user vẫn nối tiếp. Theo dõi lock wait, transaction duration; chỉ thay bằng khóa identity tinh hơn khi có số đo. Không dùng mutex JavaScript hoặc localStorage để đảm bảo tính đúng trên nhiều API replica.

## 4. Interview và xóa dữ liệu

POST interview: kiểm tra owner/version → insert round → nếu application không ở Offer/Rejected/Withdrawn thì status=Interview → tăng version → commit. Theo BR-06, mỗi lần tạo áp dụng sync, không chỉ vòng đầu. Giữ mặc định Scheduled; nếu API cho phép tạo trực tiếp Completed/Cancelled, quy tắc sync vẫn theo create như domain hiện tại, không tự suy đoán history. Sửa/dời/xóa round không tự đổi application status. Dời lịch giữ Scheduled khi người dùng dời một round đang Scheduled; Completed/Cancelled không bị đổi ngầm.

DELETE application: kiểm tra owner/version rồi DELETE; FK cascade và parent deletion cùng transaction. Error ở giữa phải rollback cả hai. Retry DELETE có thể trả 404 sau lần thành công nhưng trạng thái xóa vẫn idempotent. GET interview chưa có endpoint riêng trong contract; UI dùng rounds nhúng trong application.

## 5. Retry, version và idempotency

Application GET trả version và strong ETag `"app:<id>:v<n>"`. PATCH/DELETE application và mọi ghi interview nhận ETag của **parent application**, không trộn với version của round. Missing If-Match trả 428; mismatch trả 412. Kiểm tra id trong ETag đúng parent và version hiện tại dưới owner lock. SQL write tăng version đúng một lần và cập nhật updated_at; không dùng timestamp độ phân giải thấp làm lock version.

Idempotency-Key UUID bắt buộc cho POST application/interview. Scope gồm HTTP method + canonical path có resource id; khóa gắn user, không chỉ IP. Hash SHA-256 của body canonical đã validate + semantic preconditions; key không trùng route khác. Nếu key đã có và hash khác: 422 IDEMPOTENCY_KEY_REUSED. Replay thành công trả cùng status/body, thêm `Idempotency-Replayed: true`, không write lại. Error 4xx/5xx không lưu ở bảng success này. Retention 24 giờ; retry sau TTL không có bảo đảm replay, duplicate business vẫn được kiểm tra. Khi sửa body hoặc xác nhận reapply, adapter cấp key mới.

Cleanup định kỳ xóa key hết hạn và session quá retention; tác vụ bảo trì DB theo batch, không cần message queue. Không ghi response chứa password/JWT/cookie vào idempotency store; bảng chỉ phục vụ create application/interview. API đứt kết nối sau commit là tình huống cần test riêng.

## 6. Thời gian và DST

PostgreSQL `timestamptz` giữ instant, không giữ tên timezone gốc; vì vậy interview phải lưu thêm `timezone`. Session DB/server dùng UTC. Wire ISO có Z hoặc offset rõ; parse ngày không có offset bị từ chối ở API. Validate IANA bằng timezone database/server runtime; không chỉ regex tên có dấu `/`, vì UTC cũng hợp lệ.

Ví dụ `2026-10-14T09:00 America/New_York` tương ứng `2026-10-14T13:00:00Z`; thiết bị Bangkok hiển thị 20:00. `2026-03-08T02:30 America/New_York` không tồn tại; `2026-11-01T01:30` có hai instant (05:30Z/06:30Z). UI yêu cầu chọn occurrence trước gửi `at`; server không tự áp offset cố định. Deadline Draft phải resolve bằng device IANA, hiển thị lỗi gap/chọn fold rồi serialize instant, không dùng `Date.parse(local)` để âm thầm chọn.

API nhận at+timezone không phải localAt chưa resolve, nên không có bước server đoán giờ. Nếu sau này thêm localAt thì server phải xác nhận instant thuộc tập nghiệm localAt/IANA; không được lặng lẽ sửa thành giờ gần nhất. Các clock/unit test dùng thời điểm cố định; upcoming đếm Scheduled với at >= asOf.

## 7. Query và dashboard

Index owner trước; list default `(created_at DESC,id DESC)`, applied date dùng NULLS LAST và id tie-breaker. Sort field/direction là allowlist, không nối chuỗi input trực tiếp vào SQL. Search company/position dùng ILIKE tham số, escape `%`, `_`, `\` nếu nghĩa là literal substring. Index B-tree không giải quyết arbitrary substring; chỉ thêm pg_trgm sau EXPLAIN nếu cần.

List lấy applications và tất cả interviews của các application đó bằng hai query hoặc aggregate được kiểm tra; tránh N+1. GET `/applications/page` dùng created-desc keyset cố định, opaque base64url cursor chứa timestamp/id + version định dạng, validation chặt và luôn thêm owner predicate. Không dùng cursor để cấp quyền. Các sort applied/asc vẫn ở legacy list, không tuyên bố cursor của created-sort dùng được mọi thứ tự.

Dashboard tính trong một SQL statement với cùng `asOf`, hai aggregate riêng (applications và interviews join owner), tránh join làm nhân bản tổng hồ sơ. Formula: total mọi trạng thái; offer theo current status; upcoming Scheduled >= asOf kể cả application terminal; response = (Screening+Interview+Offer+Rejected)/(Applied+Screening+Interview+Offer+Rejected), zero=0. Không suy ra lịch sử, không lấy số liệu từ một trang hoặc một filter.

## 8. Bất biến phải kiểm thử với PostgreSQL thật

Hai user không đọc/sửa/xóa được dữ liệu nhau; active URL và source/code OR đều bảo vệ; terminal confirmation không bypass active; race create/reactivate; replay sau timeout; stale If-Match; cùng key khác body; rollback round+status; cascade; max normalized byte; date-only không lệch ngày; DST gap/fold; dashboard 0/multi-round/now boundary; logout revoke trong nhiều replica. Static checks của bộ thiết kế không thay các test này.
