# Từ System Design 101 đến quyết định của JobTrack

Repo local: `references/system-design-101`, commit `b28380a4710c5ec9638ec037d4168e288f334cba`, 400 guide Markdown ở snapshot đã tải. Đã đọc README, LICENSE và **10 guide dưới đây**, không tuyên bố đã nghiên cứu cả 400 bài. Link trỏ vào bản local để tra cứu đúng snapshot.

| Bài đã đọc | Áp dụng cụ thể | Giới hạn / trade-off |
|---|---|---|
| [Architectural patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/6-software-architectural-patterns-you-must-know.md) | Modular monolith, Controller → Service → Repository, domain/adapter tách React khỏi API | Cùng DB giúp transaction interview; chưa cần microservice |
| [API design](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-tips-for-efficient-api-design.md) | Resource paths, HTTP methods/errors, If-Match và Idempotency-Key | Không đổi response array sang envelope khiến năm UI hỏng |
| [Pagination](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-perform-pagination-in-api-design.md) | Keyset created_at/id cho endpoint page mới | Legacy list giữ đủ dữ liệu đến khi UI biết aggregate/lazy load |
| [Isolation levels](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-are-database-isolation-levels.md) | Transaction READ COMMITTED và explicit owner lock | Bài tổng quan không phải mô tả MVCC riêng của PostgreSQL; đối chiếu docs PostgreSQL |
| [Database locks](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-are-the-differences-among-database-locks.md) | Khóa hàng owner, thứ tự session → owner; partial unique indexes | Serialize ghi của cùng owner có chi phí, cần đo lock wait |
| [Idempotency](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-6-cases-to-apply-idempotency.md) | Retry POST application/interview trả một kết quả; key/hash/response cùng transaction | Không đồng nhất chống trùng tin tuyển dụng với chống gửi lại request |
| [Cookies / sessions / JWT](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cookies-vs-sessions-vs-jwt-vs-paseto.md) | JWT HttpOnly theo tài liệu gốc + sessions DB để revoke | JWT không chứa password/notes và không mặc định mã hóa; có DB check nên không stateless |
| [Production web components](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-essential-components-of-a-production-web-application.md) | HTTPS edge, static build, API, DB, backup, logs/metrics/health | Queue/full-text/CDN là lựa chọn theo workload, không phải checklist bắt buộc cài hết |
| [Cache considerations](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/things-to-consider-when-using-cache.md) | Cache static hash assets; API private no-store; giảm N+1 trước | Chưa thêm Redis; dashboard cache chỉ sau khi có số đo và invalidation đúng owner |
| [CI/CD pipeline](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cicd-pipeline-explained-in-simple-terms.md) | CI frontend + validation thiết kế; backend DB integration trước staging | Không auto deploy/khởi chạy cloud hoặc dùng credentials trong lượt thiết kế |

Các lựa chọn chi tiết như schema năm bảng, owner row lock, wire DTO, TTL, ETag aggregate, SLO và cách kết nối năm UI là **thiết kế mới của JobTrack**, không phải bản sao kiến trúc hoặc cam kết từ ByteByteGo.

## Không đưa vào MVP

Kafka/queue: hiện chưa có import/notification tác vụ dài. Kubernetes: một dịch vụ API chưa cần orchestration phức tạp. Sharding/multi-region: chưa có bằng chứng tải. Elasticsearch: tìm kiếm giới hạn theo owner, bắt đầu SQL; quan sát trước khi thêm. WebSocket: không có collaborative real-time requirement. Redis: chưa có read bottleneck hay nhiều instance cần quota chung. Không thêm hệ thống chỉ vì nó xuất hiện trong mục lục repo.

## Đối chiếu nguồn kỹ thuật gốc

- [PostgreSQL 18 partial unique indexes](https://www.postgresql.org/docs/18/indexes-partial.html): ràng buộc unique trên subset active.
- [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html): row lock và deadlock; không dựa mô tả khóa chung để đoán semantics của PostgreSQL.
- [PostgreSQL date/time](https://www.postgresql.org/docs/18/datatype-datetime.html): instant và timezone gốc phải được phân biệt.
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): cấu hình Argon2id tham chiếu, cần benchmark.
- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html): định dạng contract, không phải chứng minh backend đã tuân thủ.

## Nguồn và giấy phép

Giữ nguyên LICENSE.md upstream (CC BY-NC-ND 4.0) trong bản clone. Tài liệu JobTrack liên kết/diễn giải nguyên lý và tự thiết kế sơ đồ cho dữ liệu dự án; không sửa, trích hình hoặc đưa hình upstream vào bản thiết kế mang thương hiệu JobTrack. Gói bàn giao chỉ đóng các file JobTrack tự viết, không phân phối lại repo tham khảo. Đây là ghi nhận provenance, không phải cấp lại giấy phép của ByteByteGo.
