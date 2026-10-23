# Runbook kiểm thử và vận hành thanh toán gói Pro

> **Kết luận một dòng:** công cụ `tools/payments/simulate-webhook.mjs` tạo ra đúng chữ ký HMAC-SHA256 mà API kỳ vọng và gửi webhook tới API local **không chuyển tiền**; tài liệu này **KHÔNG** chứng minh rằng đã nối cổng thanh toán thật, đã chuyển tiền thật, đã có IP allowlist, đã có rate limit, đã dùng database vận hành hay đã có máy trạng thái đơn hàng.

Ngày: 2026-10-22 · Baseline `main` @ `306be23` · Deliverable C13 (`planning/jobtrack-full-completion/TASKS.json:623`) · Công cụ: `tools/payments/simulate-webhook.mjs` · Nguồn hợp đồng: `apps/api/src/security/payment-signature.ts`, `apps/api/src/services/ai-pro-service.ts`, `apps/api/src/server.ts`, `apps/api/README.md`

---

## 1. Phạm vi và nguyên tắc

1. Runbook này mô tả cách chạy trọn luồng "tạo đơn → webhook đã ký → đọc trạng thái gói Pro" trên máy phát triển, **không có tiền thật và không có cổng thanh toán thật**.
2. Công cụ mô phỏng chỉ gửi tới host loopback (`127.0.0.1`, `localhost`, `::1`) và chỉ chạy khi `PAYMENT_MODE` ở chế độ thử nghiệm. Mọi đường gửi khác bị từ chối trước khi có byte nào rời khỏi tiến trình.
3. Công cụ **không bao giờ** in giá trị secret ra stdout, ra thông báo lỗi hay ra file. Giá trị chữ ký hiển thị trong chế độ `--dry-run` là HMAC sinh từ secret thử nghiệm của chính người gọi, không phải secret do máy chủ nắm giữ.
4. Giá trị của mọi biến môi trường nêu ở mục 2 **không được** ghi vào log, prompt, ticket hay commit. Chỉ ghi **tên** biến.
5. Mọi lệnh trong tài liệu này là lệnh của người vận hành, chạy trong terminal đã sẵn sàng. Tài liệu không tự khởi động server, không chạy migration, không tạo tài khoản.

---

## 2. Biến môi trường

### 2.1. Danh mục

| Tên biến | Nguồn | Vai trò |
| --- | --- | --- |
| `PAYMENT_MODE` | Terminal chạy API và terminal chạy công cụ | Bật checkout ở chế độ thử nghiệm. Máy chủ so sánh tuyệt đối: giá trị khác, kể cả không đặt, đều tắt checkout. |
| `PAYMENT_WEBHOOK_SECRET` | Terminal chạy API và terminal chạy công cụ — hai vế phải giống nhau | Khoá HMAC-SHA256 dùng để ký và xác thực webhook. Máy chủ yêu cầu tối thiểu 16 ký tự. |
| `TEST_DATABASE_URL` | Terminal chạy bộ kiểm thử tích hợp | Database riêng cho kiểm thử, không được trùng database vận hành. |
| `JOBTRACK_API_BASE_URL` | Terminal chạy công cụ | Địa chỉ API mục tiêu. Công cụ chỉ nhận host loopback. |
| `JOBTRACK_TEST_TRANSFER_CODE` | Terminal chạy công cụ, chép từ phản hồi của checkout | Mã đơn hàng dùng cho lượt mô phỏng. Có thể thay bằng cờ `--transfer-code`. |

### 2.2. Quy tắc dùng giá trị

- Chỉ ghi **tên** biến vào log, prompt, ticket hoặc commit. Không ghi giá trị.
- `PAYMENT_MODE` phải khớp tuyệt đối với chế độ thử nghiệm mà API dùng; một khoảng trắng thừa cũng làm tắt checkout.
- `PAYMENT_WEBHOOK_SECRET` là bí mật dùng chung giữa hai tiến trình. Khi cần giá trị dùng cho lượt thử, sinh một giá trị thử nghiệm tạm thời; không dùng lại giá trị của bất kỳ môi trường thật nào.
- `TEST_DATABASE_URL` phải trỏ tới database riêng. "local" không phải bằng chứng rằng dữ liệu được phép xoá.

---

## 3. Công cụ mô phỏng webhook

### 3.1. Bề mặt lệnh

```text
node tools/payments/simulate-webhook.mjs [options]

  --base-url <url>       Địa chỉ API mục tiêu. Mặc định: JOBTRACK_API_BASE_URL, nếu không có thì http://127.0.0.1:64366.
  --transfer-code <code> Mã đơn hàng cần thanh toán. Mặc định: JOBTRACK_TEST_TRANSFER_CODE. Dạng: JTPRO + 6 chữ hoặc số.
  --amount <vnd>         Số tiền của đơn, là số nguyên VND. Ví dụ 99000 hoặc 249.000.
  --dry-run              In ra đúng request đã ký và không gửi gì.
  --help                 In ra trợ giúp.
```

Công cụ chỉ dùng module tích hợp sẵn của Node (`node:crypto`, `node:http`, `node:https`), không thêm dependency và không thêm npm script. Chạy bằng đường dẫn:

```powershell
rtk node tools/payments/simulate-webhook.mjs --help
```

Kết quả mong đợi: in ra danh sách cờ, các biến môi trường bắt buộc và ý nghĩa mã thoát; exit code `0`.

### 3.2. Quy tắc từ chối chạy

| Điều kiện vi phạm | Hành vi | Mã thoát |
| --- | --- | --- |
| Đích gửi không phải host loopback (`127.0.0.1`, `localhost`, `::1`) | Từ chối, không mở socket. | `2` |
| Giao thức khác `http`/`https` | Từ chối. | `2` |
| `PAYMENT_MODE` không ở đúng chế độ thử nghiệm | Từ chối, nêu rõ tên biến. | `2` |
| `PAYMENT_WEBHOOK_SECRET` thiếu hoặc ngắn hơn 16 ký tự | Từ chối, nêu rõ tên biến. | `1` |
| Thiếu mã đơn hàng (cờ và biến môi trường đều không có) | Từ chối, nêu cả cờ lẫn tên biến. | `1` |
| `--amount` không phải số nguyên VND | Từ chối, nêu rõ cờ. | `1` |
| Cờ lạ | Từ chối, liệt kê các cờ hợp lệ. | `1` |

Ghi chú về số tiền: máy chủ chấp nhận ba dạng số — số nguyên không dấu phân cách, số nguyên có đúng một dấu phân cách nghìn (`249.000` hoặc `249,000`), hoặc số có tối đa hai chữ số thập phân. Công cụ chỉ nhận hai dạng đầu và chuẩn hoá về số nguyên trước khi ký, vì số tiền VND là số nguyên và dạng thập phân sẽ bị máy chủ cắt bỏ phần thập phân.

### 3.3. Mã thoát của công cụ

| Mã thoát | Ý nghĩa |
| --- | --- |
| `0` | API trả `2xx` kèm `success: true`, hoặc chế độ `--dry-run` đã in xong request. |
| `1` | Lỗi cấu hình (thiếu biến, sai cờ, sai số tiền), lỗi mạng, hoặc phản hồi `2xx` không đúng hợp đồng `{ "success": true }`. |
| `2` | Bị chặn trước khi gửi, hoặc API đã trả lỗi (webhook bị từ chối). Một webhook bị từ chối là kết cục bị chặn, không phải sự cố của công cụ. |

---

## 4. Quy trình kiểm thử end-to-end

Các lệnh dưới đây chạy trong PowerShell. Những dòng gán biến là câu lệnh PowerShell; mọi lệnh thực thi đều được gọi qua `rtk`.

### 4.1. Chuẩn bị môi trường

Cần hai terminal: một cho API, một cho công cụ. Cả hai phải dùng cùng chế độ thử nghiệm và cùng một giá trị `PAYMENT_WEBHOOK_SECRET` (sinh tạm cho lượt thử, không dùng giá trị thật).

```powershell
$env:PAYMENT_MODE = 'test'
$env:JOBTRACK_API_BASE_URL = 'http://127.0.0.1:64366'
```

Kết quả mong đợi: hai biến được đặt trong terminal hiện tại, không có output. API đang chạy phải được khởi động với cùng chế độ và cùng secret; nếu không, webhook trả `503 payment_webhook_not_configured`.

### 4.2. Đăng nhập để lấy phiên

Các route `/api/pro/checkout` và `/api/pro/status` yêu cầu phiên đăng nhập. Dùng một tài khoản thử nghiệm đã có; runbook này không tạo tài khoản.

```powershell
$login = @{ email = '<EMAIL>'; password = '<PASS>' } | ConvertTo-Json -Compress
rtk curl -sS -X POST "$env:JOBTRACK_API_BASE_URL/api/auth/login" -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:64364" -c "$env:TEMP\jobtrack-session.txt" -d $login
```

Kết quả mong đợi: phản hồi `200` có trường `id` và `email`; file cookie `$env:TEMP\jobtrack-session.txt` được tạo và chứa cookie `jobtrack_session`. File cookie này là phiên đăng nhập, phải xoá sau khi kết thúc lượt thử.

### 4.3. Tạo đơn hàng

```powershell
rtk curl -sS -X POST "$env:JOBTRACK_API_BASE_URL/api/pro/checkout" -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:64364" -b "$env:TEMP\jobtrack-session.txt" -d '{"plan":"monthly"}'
```

Kết quả mong đợi: phản hồi `200` gồm `orderId`, `plan`, `amount`, `currency`, `transferCode`, `mode` là `test`, `testNotice`, và các trường `bankName`, `accountNo`, `accountName`, `vietQrUrl` đều là `null`. Chép giá trị `transferCode` và `amount` ra để dùng ở bước sau.

```powershell
$env:JOBTRACK_TEST_TRANSFER_CODE = 'JTPROABC123'
```

Kết quả mong đợi: biến chứa đúng mã đơn vừa tạo. Mã đơn không phải bí mật nhưng vẫn là dữ liệu vận hành, không ghi vào log chia sẻ.

### 4.4. Chạy thử không gửi (`--dry-run`)

```powershell
$env:PAYMENT_MODE = 'test'; rtk node tools/payments/simulate-webhook.mjs --dry-run --transfer-code JTPROABC123 --amount 99000
```

Kết quả mong đợi: in ra method `POST`, đường dẫn `/api/pro/webhook`, các header gồm `X-JobTrack-Timestamp` và `X-JobTrack-Signature` có dạng `v1=` theo sau là hex, và raw body đúng bằng chuỗi được ký. Dòng cuối nói rõ không có gì được gửi. Exit code `0`. **Không** có mã lỗi nào của API trong output vì không có request nào được gửi.

### 4.5. Gửi webhook thật vào API local

```powershell
$env:PAYMENT_MODE = 'test'; rtk node tools/payments/simulate-webhook.mjs --transfer-code JTPROABC123 --amount 99000
```

Kết quả mong đợi: dòng `HTTP 200` kèm body `{"success":true,"replayed":false,"orderId":"...","plan":"monthly"}`. Exit code `0`. Nếu API trả lỗi, công cụ in ra mã lỗi của API và thoát với mã `2`.

### 4.6. Đọc trạng thái gói Pro

```powershell
rtk curl -sS "$env:JOBTRACK_API_BASE_URL/api/pro/status" -b "$env:TEMP\jobtrack-session.txt"
```

Kết quả mong đợi: phản hồi `200` gồm `tier` là `pro`, `isPro` là `true` và `expiresAt` là thời điểm hết hạn sau 30 ngày.

### 4.7. Phép thử bổ sung

Gửi lại đúng webhook đã dùng ở bước 4.5:

```powershell
$env:PAYMENT_MODE = 'test'; rtk node tools/payments/simulate-webhook.mjs --transfer-code JTPROABC123 --amount 99000
```

Kết quả mong đợi: `HTTP 200` với `success` là `true` và `replayed` là `true`. Gói Pro **không** được cộng thêm lần nữa. Exit code `0`.

Gửi cùng đơn với số tiền thiếu:

```powershell
$env:PAYMENT_MODE = 'test'; rtk node tools/payments/simulate-webhook.mjs --transfer-code JTPROABC123 --amount 1
```

Kết quả mong đợi: `HTTP 400` kèm mã `amount_mismatch`; exit code `2`; trạng thái đơn không đổi. Máy chủ kiểm tra số tiền trước khi kiểm tra trạng thái lặp, nên một đơn đã hoàn tất vẫn trả `amount_mismatch` khi số tiền gửi lên thiếu.

Gửi mã đơn không tồn tại:

```powershell
$env:PAYMENT_MODE = 'test'; rtk node tools/payments/simulate-webhook.mjs --transfer-code JTPROZZZZZZ --amount 99000
```

Kết quả mong đợi: `HTTP 404` kèm mã `order_not_found`; exit code `2`; không có dữ liệu nào bị ghi.

### 4.8. Dọn dẹp

```powershell
Remove-Item "$env:TEMP\jobtrack-session.txt" -ErrorAction SilentlyContinue
Remove-Item Env:JOBTRACK_TEST_TRANSFER_CODE -ErrorAction SilentlyContinue
```

Kết quả mong đợi: file cookie phiên và biến mã đơn bị xoá khỏi terminal.

---

## 5. Mã lỗi của webhook

Nguồn: `apps/api/src/services/ai-pro-service.ts` và `apps/api/README.md`. Mã lỗi không được tự suy diễn.

| HTTP | Mã lỗi | Ý nghĩa | Gửi lại có thể thành công? |
| --- | --- | --- | --- |
| 400 | `stale_webhook` | Timestamp của webhook nằm ngoài cửa sổ 5 phút mà máy chủ chấp nhận. | Có — ký lại với timestamp hiện tại. |
| 400 | `amount_mismatch` | Số tiền trong giao dịch nhỏ hơn số tiền của đơn, hoặc không ở định dạng số được chấp nhận. | Có — gửi lại với đúng số tiền và đúng định dạng. |
| 401 | `invalid_webhook_signature` | Chữ ký không khớp raw body và timestamp, hoặc thiếu header bắt buộc. | Có khi nguyên nhân là lệch timestamp hoặc sai thứ tự ký; nếu secret hai vế lệch nhau thì gửi lại vô hạn cũng thất bại. |
| 404 | `order_not_found` | Không có đơn hàng nào khớp mã đơn trong giao dịch. | Không — trừ khi đơn hàng được tạo sau đó. |
| 409 | `order_cancelled` | Đơn hàng đã bị hủy nên không thể kích hoạt gói Pro. | Không. |
| 503 | `payment_webhook_not_configured` | Máy chủ chưa có `PAYMENT_WEBHOOK_SECRET` hợp lệ. | Không — cho tới khi máy chủ được cấu hình. |

Phản hồi thành công là `200` với `{"success":true,"replayed":<bool>,"orderId":"...","plan":"..."}`. `replayed` là `true` khi đơn hàng đã ở trạng thái hoàn tất từ trước, nghĩa là giao dịch lặp không cộng Pro thêm lần nữa.

---

## 6. Mã lỗi của luồng checkout và trạng thái Pro

| HTTP | Mã lỗi | Ý nghĩa | Gửi lại có thể thành công? |
| --- | --- | --- | --- |
| 401 | `unauthorized` | Thiếu phiên đăng nhập hoặc phiên đã hết hạn. | Có — đăng nhập lại rồi gửi lại. |
| 403 | `invalid_origin` | Request thay đổi dữ liệu có header `Origin` không khớp `APP_ORIGIN`. | Có — sửa header `Origin` rồi gửi lại. |
| 403 | `activation_requires_payment` | Route kích hoạt gói Pro trực tiếp luôn bị từ chối. | Không — chỉ webhook đã ký mới kích hoạt được. |
| 503 | `live_payments_unavailable` | `PAYMENT_MODE` không ở chế độ thử nghiệm nên checkout bị từ chối và không tạo đơn hàng nào. | Có — đặt `PAYMENT_MODE` đúng rồi gửi lại. |

---

## 7. Điều mà tài liệu này KHÔNG chứng minh

- **Không có cổng thanh toán thật nào được kết nối.** `POST /api/pro/checkout` chỉ trả `mode: "test"` và các trường `bankName`, `accountNo`, `accountName`, `vietQrUrl` đều là `null`. Không có VietQR, SePay, PayOS hay Stripe trong luồng này.
- **Không có tiền thật nào được chuyển.** Mọi giao dịch trong tài liệu là giao dịch giả do công cụ tự ký trên localhost.
- **Webhook không có IP allowlist và không có rate limit.** `POST /api/pro/webhook` không kiểm tra nguồn IP và không giới hạn tần suất. Chữ ký là lớp phòng thủ duy nhất. Đây là điểm yếu đã biết và đã ghi backlog, chưa được xử lý.
- **Database vận hành không được dùng.** Mọi bằng chứng chạy trên database riêng của môi trường thử nghiệm (`TEST_DATABASE_URL`); không có lệnh nào chạm vào database vận hành.
- **Máy trạng thái đơn hàng chưa được triển khai.** Cột `payment_orders.status` hiện chỉ có `pending`, `completed`, `cancelled`. Chưa có trạng thái `paid`, `failed`, `expired`, chưa có hạn hẹn ngầm theo thời gian, và chưa có endpoint đọc trạng thái của một đơn cụ thể (`GET /api/pro/orders/:orderId`).
- **Chống trùng webhook mới chỉ dựa trên trạng thái dòng đơn hàng.** Chưa có khoá idempotency theo id sự kiện như Stripe hay SePay khuyến nghị.
- **Tương thích với cổng thanh toán thật chưa được chứng minh.** Công thức chữ ký đúng chuẩn thực tế, nhưng header và tên trường của JobTrack khác SePay và Stripe, nên khi nối cổng thật cần một lớp adapter.
- **Hành vi khi nhiều webhook chạy song song không được chứng minh ở đây.** Runbook này chạy tuần tự, không chạy tải đồng thời.
- **Không có bằng chứng chạy trong CI.** Công cụ nằm ngoài mọi hook kiểm thử của repository, nên không có kiểm thử tự động nào bảo vệ hành vi của nó.
- **Không có số đo vận hành.** Runbook không đo độ trễ, độ ổn định, hạn mức hay chi phí.

---

## 8. Trạng thái bằng chứng

| Hạng mục | Lệnh | Kết quả |
| --- | --- | --- |
| Cú pháp công cụ | `rtk node --check tools/payments/simulate-webhook.mjs` | PASS, exit code `0` |
| Từ chối khi thiếu chế độ thử nghiệm | `rtk node tools/payments/simulate-webhook.mjs --dry-run --transfer-code JTPROABC123 --amount 99000` khi `PAYMENT_MODE` không được đặt | PASS, exit code `2`, thông báo nêu tên biến `PAYMENT_MODE` |
| Dry-run có chữ ký hợp lệ | cùng lệnh trên khi `PAYMENT_MODE` ở chế độ thử nghiệm và có secret thử | PASS, exit code `0`, in request đã ký, không gửi gì |
| Gửi thật khi API không chạy | cùng lệnh trên bỏ cờ `--dry-run` | PASS, exit code `1`, thông báo lỗi mạng, không có thay đổi dữ liệu |
| Chữ ký trùng hợp đồng | so sánh byte-for-byte với `signPaymentPayload` trong `apps/api/src/security/payment-signature.ts` | PASS, hai chữ ký giống nhau và `verifyPaymentSignature` chấp nhận |

**NOT-RUN:** migration (`npm run db:migrate`), `npm run account:create`, `npm run db:restore`, `npm run db:load-test`, deploy, push, và webhook từ ngân hàng thật — tất cả đều **không** được chạy trong lượt lập tài liệu này. Các mục này là trạng thái chưa xác minh, không phải kết quả đạt.

---

## 9. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
| --- | --- | --- |
| Công cụ thoát với mã `2` và nói `PAYMENT_MODE` | Chế độ thử nghiệm chưa được bật ở terminal của công cụ. | Đặt lại `PAYMENT_MODE` ở cả hai terminal. |
| Công cụ thoát với mã `2` và nói về loopback | `JOBTRACK_API_BASE_URL` trỏ tới host không phải loopback. | Chỉ dùng địa chỉ API local. |
| API trả `503 payment_webhook_not_configured` | Secret ở terminal API thiếu hoặc ngắn hơn 16 ký tự. | Kiểm tra tên biến ở terminal API, không in giá trị ra log. |
| API trả `401 invalid_webhook_signature` | Secret ở hai vế lệch nhau, hoặc raw body bị thay đổi sau khi ký. | Đặt lại cùng một secret ở cả hai vế; không sửa body sau khi ký. |
| API trả `400 stale_webhook` | Timestamp nằm ngoài cửa sổ 5 phút. | Chạy lại lệnh, công cụ tự sinh timestamp hiện tại. |
| API trả `404 order_not_found` | Mã đơn không tồn tại hoặc sai chữ in hoa. | Chép lại `transferCode` từ phản hồi checkout. |
| API trả `400 amount_mismatch` | Số tiền nhỏ hơn số tiền của đơn. | Dùng đúng `amount` từ phản hồi checkout. |
| Lỗi mạng `ECONNREFUSED` | API chưa chạy hoặc cổng khác mặc định. | Kiểm tra tiến trình API và `JOBTRACK_API_BASE_URL`. |
