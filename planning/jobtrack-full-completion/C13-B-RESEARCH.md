# C13-B — Nghiên cứu trước khi code

Ngày: 2026-10-22. Baseline: `main` @ `306be23`.
Mục tiêu tài liệu: chốt **contract** và **ranh giới lane** trước khi viết code, dựa trên (a) nguồn thật của hệ sinh thái thanh toán Việt và thế giới, (b) source hiện tại của repo.

---

## Phần 1 — Nghiên cứu bên ngoài (internet)

Nguồn:
- Stripe — https://docs.stripe.com/webhooks (đọc trực tiếp)
- SePay — https://docs.sepay.vn/tich-hop-webhooks.html và https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc (đọc trực tiếp)
- VietQR / Casso — https://vietqr.io/

### 1.1 Stripe: cách ký webhook chuẩn

| Điểm | Stripe | JobTrack hiện tại | Kết luận |
| --- | --- | --- | --- |
| Chuỗi được ký | `timestamp + "." + raw_body` | `timestamp + "." + rawBody` | **Trùng khớp tuyệt đối** |
| Thuật toán | HMAC-SHA256 | HMAC-SHA256 | Trùng |
| Cửa sổ thời gian | 300 giây (mặc định) | 300000 ms | Trùng |
| So sánh | constant-time | `timingSafeEqual` + kiểm tra độ dài | Trùng |
| Scheme | `v1=` (bỏ qua scheme khác) | `v1=` | Trùng |
| Raw body | bắt buộc, cấm re-serialize | `express.json` `verify` bắt raw buffer | Trùng |
| Chống replay | timestamp nằm trong chuỗi ký | tương tự | Trùng |
| Route webhook | phải miễn CSRF | `/api/pro/webhook` được miễn Origin | Trùng |
| Phản hồi | trả 2xx nhanh | trả sau transaction | Trùng |
| Dedup | theo **event id**, không theo thứ tự giao dịch | theo **trạng thái dòng đơn hàng** | **Khác** — xem 1.4 |
| IP allowlist | khuyến nghị | chưa có | Thiếu (giới hạn đã biết) |

Stripe cũng nói rõ: **retry tạo timestamp/chữ ký MỚI** cho cùng một event → chống trùng phải dựa trên id sự kiện, không dựa trên chữ ký. JobTrack hiện chống trùng theo **dòng đơn hàng**, nên vẫn đúng (không kích hoạt hai lần), nhưng chưa có khoá idempotency theo id sự kiện.

### 1.2 SePay: cổng thanh toán Việt thật (Napas/VietQR)

**Payload thật của SePay:**

```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-07-02 11:08:33",
  "accountNumber": "1017588888",
  "subAccount": "",
  "code": "SEVN63DC8E5C",
  "content": "SEVN63DC8E5C chuyen tien",
  "transferType": "in",
  "description": "NGUYEN VAN A chuyen tien",
  "transferAmount": 5000000,
  "accumulated": 105000000,
  "referenceCode": "FT24012345678"
}
```

**Cách SePay ký HMAC-SHA256 (chính thức):**

| Bước | SePay |
| --- | --- |
| 1 | Lấy timestamp **Unix giây** |
| 2 | Ghép `{timestamp}.{raw_body}` |
| 3 | HMAC-SHA256 với Secret Key |
| 4 | Header `X-SePay-Signature: sha256={hex}` |
| 5 | Header `X-SePay-Timestamp: {timestamp}` |

- Timestamp quá 300 giây → `401` (SePay dùng đúng ±5 phút như Stripe).
- Phải dùng **raw body**, không parse rồi serialize lại (SePay nêu rõ lỗi thường gặp).
- Endpoint trả `200`/`201` + body `{"success": true}` mới tính là thành công, timeout 30 giây.
- Retry: tối đa 7 lần, backoff Fibonacci, tối đa 5 giờ.
- Chống trùng: **theo trường `id`** — đặt cột `transaction_id` UNIQUE rồi `INSERT IGNORE`.
- Có danh sách IP gửi webhook (8 IPv4 + 2 IPv6) để whitelist.
- Có 4 cách xác thực: HMAC-SHA256 (**khuyến nghị**), API Key, OAuth 2.0, không xác thực.

### 1.3 Bảng tương thích: JobTrack ↔ SePay

| Khía cạnh | JobTrack hiện tại | SePay | Khoảng cách |
| --- | --- | --- | --- |
| Chuỗi ký | `{timestamp}.{rawBody}` | `{timestamp}.{raw_body}` | **0** — giống hệt |
| Thuật toán | HMAC-SHA256 | HMAC-SHA256 | 0 |
| Cửa sổ | ±300000 ms | ±300 s | 0 |
| Header chữ ký | `X-JobTrack-Signature: v1=<hex>` | `X-SePay-Signature: sha256=<hex>` | **đổi tên header + prefix** |
| Header timestamp | `X-JobTrack-Timestamp` (**mili** giây) | `X-SePay-Timestamp` (**giây**) | **đổi tên header + đổi đơn vị** |
| Phản hồi | `200 {success:true, replayed, orderId, plan}` | cần `200/201` + `{"success":true}` | 0 (đã đúng) |
| Trường mã đơn | `transferCode` | `code` (+ `content` chứa mã) | **tên field khác** → cần adapter map `code` → `transferCode` |
| Số tiền | `amount` (số hoặc chuỗi) | `transferAmount` (**số**) | **tên field khác** + parser của ta chấp nhận số nguyên ✓ |
| Hướng giao dịch | không kiểm tra | `transferType: "in" \| "out"` | **THIẾU**: giao dịch `out` (tiền ra) không được kích hoạt Pro |
| Khớp đơn hàng | mã trong nội dung CK | **VA theo đơn hàng** (số tài khoản ảo = đơn) | VA mạnh hơn nhiều → hướng tích hợp tương lai |

**Kết luận quan trọng:** vì cả hai hệ thống lớn (Stripe, SePay) đều ký theo đúng công thức `{timestamp}.{raw_body}` + HMAC-SHA256 + ±5 phút, **contract chữ ký hiện tại của JobTrack đã đúng chuẩn thực tế**. Kết nối SePay/Napas về sau chỉ là một adapter đổi tên header, đổi đơn vị timestamp, và map tên field — **không phải thiết kế lại**.

### 1.4 Khoảng trống phát hiện được từ nghiên cứu

G1. **Chưa có khoá idempotency theo id sự kiện.** Cả Stripe và SePay đều yêu cầu dedup theo event id (`transaction_id` UNIQUE + `INSERT IGNORE`). JobTrack chống trùng bằng trạng thái dòng đơn hàng → đủ để **không kích hoạt Pro hai lần**, nhưng chưa lưu "sự kiện này đã xử lý" và chưa trả `replayed` dựa trên event id. Nên cân nhắc cột `payment_events` (transaction_id UNIQUE) khi tích hợp cổng thật.

G2. **Chưa kiểm tra hướng giao dịch.** SePay gửi `transferType: "in"|"out"`. Một sự kiện `out` không được phép kích hoạt Pro. Hiện tại endpoint không đọc trường này → khi có adapter SePay phải chặn `out`.

G3. **Chưa whitelist IP.** Cả hai nhà cung cấp đều công bố danh sách IP. Đây là lớp phòng thủ bổ sung (chữ ký đã đủ mạnh).

G4. **Chưa có webhook simulator.** SePay có trang "Giả lập giao dịch" và nút "Gửi thử" — mô hình chuẩn của ngành. JobTrack nên có công cụ tương đương để người dùng/maintainer kiểm tra luồng mà **không chuyển tiền thật** (đúng yêu cầu "Testflow hoạt động không chuyển tiền" của A14).

G5. **Định dạng số tiền.** Số tiền VND là số nguyên; SePay gửi `transferAmount` dạng số. Parser hiện tại chấp nhận: số nguyên không dấu phân cách, số nguyên có **đúng một** dấu phân cách nghìn (`249.000` hoặc `249,000`), hoặc số có tối đa 2 chữ số thập phân. Định dạng Việt Nam dùng dấu `.` → `249.000` ✓ được chấp nhận.

---

*(Phần 2 — nghiên cứu source trong repo, Phần 3 — chia lane & tiêu chí nghiệm thu: bổ sung sau khi 3 subagent research trả kết quả.)*
