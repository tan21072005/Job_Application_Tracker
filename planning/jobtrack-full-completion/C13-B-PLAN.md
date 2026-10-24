# C13-B — Plan thực thi: vòng đời đơn hàng thanh toán

Ngày: 2026-10-22 · Baseline `main` @ `306be23` · Nguồn: `C13-B-RESEARCH.md` (internet) + 3 subagent research (repo)

Mục tiêu: đóng phần còn thiếu của **A14** — *"Gói/giá/quota từ server; checkout test, **pending/paid/failed/expired**; webhook có xác thực + replay protection + atomic dedup; user thường không tự activate; không dùng tài khoản ngân hàng ví dụ"*.
Đã đạt (C13-A, đã merge): webhook xác thực + replay protection + atomic dedup + không tự activate + không có tài khoản ngân hàng ví dụ.
Còn thiếu: **vòng đời đơn hàng nhìn thấy được** + **giá lấy từ server** + deliverable vận hành.

---

## 1. Quyết định thiết kế (chốt trước khi code)

| # | Quyết định | Lý do (bằng chứng) |
| --- | --- | --- |
| D1 | **Từ vựng người dùng:** `pending \| paid \| failed \| expired \| cancelled` | A14 yêu cầu đúng 4 trạng thái + `cancelled` đã có trong DB |
| D2 | **Cột DB giữ nguyên `completed`**, mapping `completed → paid` tầng API | Đổi tên `completed`→`paid` sẽ phá 9 assertion trong `pro-billing.test.ts` và cần viết lại dữ liệu cũ. Rủi ro migration cao hơn giá trị |
| D3 | **`expired` là trạng thái SUY RA**, không lưu: `status='pending' AND created_at < now() - TTL` → `expired` (TTL hằng số trong code, không cần cột `expires_at`) | Không có scheduler trong `apps/api/src` (R1/M2); cột `expires_at` chỉ làm tăng migration. `created_at` đã có sẵn (`005_pro_subscriptions.sql:21`) |
| D4 | **`failed` là trạng thái LƯU**, ghi khi một webhook **chữ ký hợp lệ** bị từ chối vì **thiếu tiền** (`amount_mismatch`) | Đây là thất bại thanh toán thật mà người dùng cần thấy. Ghi `failure_reason` để không mất nguyên nhân. Các lỗi khác (mã đơn lạ, đơn đã hủy) **không** ghi |
| D5 | **`failed` vẫn có thể thanh toán lại**: webhook coi là hoàn tất được khi `status IN ('pending','failed')` | Người dùng nạp thiếu rồi nạp đúng phải được nhận Pro. Hiện code coi **mọi** status khác `pending` là replay (`ai-pro-service.ts:427-434`) → phải đổi, và hành vi này **chưa có test nào ghim** (R1 risk 19) |
| D6 | **Endpoint duy nhất:** `GET /api/pro/orders/:orderId` (owner-scoped) | R1/M5: hiện **không** endpoint nào đọc trạng thái đơn; `orderId` được sinh ra nhưng **không consumer nào dùng** |
| D7 | **Khóa đọc = `orderId` (uuid)**; extension lưu `orderId` trong `chrome.storage.local` | Extension chỉ hiện mã đơn; `transferCode` là token người đọc được, yếu hơn uuid |
| D8 | **Mã lỗi:** `order_not_found` (404) — dùng đúng từ vựng domain thanh toán đã có (`ai-pro-service.ts:396`) | Repo có 2 từ vựng (`not_found` chung vs `order_not_found` domain); domain này đã dùng `order_not_found` |
| D9 | **Giá lấy từ server:** thêm `GET /api/pro/plans` (auth) trả danh sách gói `{plan, amount, durationDays}`; extension bỏ giá hard-code | R1/M4.4 + `popup.html:322-324` đang hard-code `99.000đ/249.000đ/799.000đ` → vi phạm A14 "giá từ server" |
| D10 | **Idempotency-Key cho checkout: NGOÀI phạm vi** increment này | Đổi hợp đồng route đang chạy; đã ghi backlog |
| D11 | **UI web: NGOÀI phạm vi** — extension là bề mặt Pro duy nhất tồn tại hôm nay | R1/M4.2: `apps/web/src` không có bất kỳ màn Pro/checkout nào; tạo mới là bề mặt sản phẩm lớn hơn |
| D12 | **Extension không tạo đơn mới khi bấm "Kiểm tra thanh toán"** | R1/M4.1 finding 6: nút này hiện gọi lại `POST /api/pro/checkout` → **tạo đơn rác mỗi lần bấm** |
| D13 | **Thứ tự suy ra trạng thái:** `cancelled` → `paid` → `failed` → `expired` → `pending` | Trạng thái đã ghi (huỷ/đã trả) luôn thắng trạng thái suy ra; `failed` thắng `expired` vì đó là sự kiện đã xảy ra; `expired` chỉ còn đúng khi chưa có gì khác |
| D14 | **TTL đơn = 30 phút**, ghi vào `expires_at` lúc tạo đơn | Cột đã có trong migration 007; TTL là dữ liệu nên đổi được mà không phải viết lại lịch sử |
| D15 | **Webhook vẫn nhận thanh toán cho đơn đã `expired`** (không có mã lỗi `order_expired`) | Từ chối tiền đã đến là hành vi xấu hơn: người dùng mất tiền mà không có Pro. `expired` chỉ là gợi ý cho UI; đơn vẫn hoàn tất được nếu tiền đúng |
| D16 | **Ghi `failed_reason` trong cùng transaction** khi webhook báo thiếu tiền, rồi mới trả 400 | Nếu ném lỗi trong transaction thì `ROLLBACK` xoá mất dấu vết thất bại. Transaction commit bản ghi thất bại, sau đó route trả 400 |

---

## 2. Ràng buộc bắt buộc (làm sai sẽ vi phạm policy, không phải chỉ sai kỹ thuật)

| Ràng buộc | Nguồn | Hệ quả cho plan |
| --- | --- | --- |
| `apps/api/migrations/**` là **protected path**, không lane feature nào ghi được | `policy.mjs:16`, `AGENTS.md:9`, `PLAN.md:93` | Migration 007 phải là **task maintainer** |
| Contract dùng chung phải có **task riêng + maintainer tích hợp trước** khi consumer bắt đầu | `AGENTS.md:9`, `OPERATING-RULES.md:7,9` | Lane contracts chạy **trước** lane api/extension |
| Lane `api` tranh chấp `server.ts` — chỉ 1 task/lần | `PLAN.md:89` | Toàn bộ thay đổi API gộp **một** lane |
| Controller **không có check `test:api`**; lane `api` chỉ có `build:api` | `controller.mjs:13-20,252` | Bằng chứng endpoint phải chạy **ngoài controller** và báo cáo trung thực (NOT-RUN trong controller, đã chạy ngoài) |
| **Không thêm comment** vào code mới/đổi | `policy.mjs:130-146`, `AGENTS.md:13` | Thiết kế giải thích ở Markdown này, không trong code |
| Change set **1–20 file**, ≤256 KB/file | `policy.mjs:149,167-168` | Chia lane đúng kích thước |
| Không stage tất cả; chỉ path đã review | `AGENTS.md:17`, `controller.mjs:498-512` | Commit từng lane, path tường minh |
| Tối đa **3 lần thử sửa** / task; cùng lỗi 2 lần thì dừng | `AGENTS.md:15`, `controller.mjs:531-543` | Mỗi lane có 3 attempt |
| Secret-scan quét nội dung file | `policy.mjs:17` | Fixture test phải tránh mẫu secret |
| Không chạy migration/account:create/payment action | `AGENTS.md:21` | Chỉ test DB riêng (`TEST_DATABASE_URL`) |

---

## 3. Chia lane (5 lane, 3 nhóm theo dependency)

### Nhóm 1 — chạy SONG SONG (3 subagent)

**L1 · lane `contracts`** — `packages/jobtrack-contract/src/**`
- Thêm: `ProOrderStatus` union (`pending|paid|failed|expired|cancelled`), `ProOrderDTO` (`orderId, plan, amount, currency, transferCode, status, createdAt, completedAt?, failureReason?`), `ProPlanDTO` (`plan, amount, durationDays`).
- Không đụng API/extension. Không comment mới.
- Check: `npm run check:contract`.

**L2 · lane maintainer (migration)** — `apps/api/migrations/007_pro_order_lifecycle.sql`
- `ALTER TABLE payment_orders` → thêm `failed_reason text` (CHECK thưa, chỉ nhận mã lỗi đã biết).
- `CREATE TABLE payment_events (id, order_id, external_id UNIQUE, event_type, received_at)` → **khoá idempotency theo id sự kiện**, đúng khuyến nghị Stripe/SePay (R1 G1).
- **KHÔNG** đụng `CHECK status` (giữ `pending|completed|cancelled`; `failed`/`expired` không lưu trong cột status → D2/D3/D4 xử lý ở tầng API). ⇒ **không cần viết lại dữ liệu cũ, không phá assertion nào**.
- Không chạy migration. Chỉ viết file.

**L3 · lane maintainer (ops)** — `tools/payments/simulate-webhook.mjs` + `docs/runbook/PAYMENT-TEST-AND-OPS.md`
- Tool: ký webhook bằng secret test rồi POST vào API local; **bắt buộc** `PAYMENT_MODE=test` + secret ≥16 ký tự từ env; không in secret; exit code rõ ràng; `--dry-run` in ra payload đã ký (không gọi mạng).
- Doc: cách chạy luồng test end-to-end không chuyển tiền, bảng mã lỗi, giới hạn (không có cổng thật, không có IP allowlist).
- Đóng deliverable `PAYMENT-TEST-AND-OPS.md` của C13 (`TASKS.json:623`).

### Nhóm 2 — sau khi L1 + L2 được maintainer tích hợp (1 subagent)

**L4 · lane `api`** — `apps/api/src/**`
- `AiProService.getOrder(userId, orderId)` → `SELECT … WHERE id=$1 AND user_id=$2` (owner-scoped, đúng pattern `jobtrack-service.ts:171`).
- Ánh xạ trạng thái (D1–D5): `pending`+quá TTL → `expired`; `completed` → `paid`; `cancelled` → `cancelled`; `failed` → `failed` (+`failed_reason`).
- `GET /api/pro/orders/:orderId` (auth) → 200 DTO | 404 `order_not_found` | 401 `unauthorized`.
- `GET /api/pro/plans` (auth) → danh sách gói từ `PLAN_PRICES`/`PLAN_DURATION_DAYS`.
- Webhook: coi `status IN ('pending','failed')` là hoàn tất được (D5); ghi `failed_reason='amount_mismatch'` khi thiếu tiền; webhook cho đơn `expired` → 409 `order_expired`; ghi `payment_events` theo `external_id` UNIQUE (idempotency, D-r1).
- **File mới** `apps/api/src/pro-order-status.test.ts` (không nhồi vào file 589 dòng) + sửa `pro-billing.test.ts` **chỉ khi hành vi đổi thật** (D5) và **không xoá assertion nào**.
- Check: `tsc --noEmit` + `npm run test:api` (ngoài controller — báo cáo trung thực).

### Nhóm 3 — sau khi L4 (1 subagent)

**L5 · lane `extension`** — `packages/jobtrack-extension/**`
- Lưu `orderId` vào `chrome.storage.local` khi checkout thành công.
- Nút "Kiểm tra thanh toán" → gọi `GET /api/pro/orders/:orderId`, **không** tạo đơn mới (D12).
- Hiện trạng thái `pending/paid/failed/expired/cancelled` bằng nhãn do **server** gửi (không suy đoán client).
- Giá trong `<select>` lấy từ `GET /api/pro/plans` (D9), bỏ giá hard-code `popup.html:322-324`.
- Test extension: khóa hợp đồng mới + **mutation check** (như đã làm cho lane trước).

---

## 4. Tiêu chí nghiệm thu (quan sát được)

| Lane | Tiêu chí |
| --- | --- |
| L1 | `npm run check:contract` pass; union + 2 DTO có trong `packages/jobtrack-contract/src`; API/extension **chưa** dùng DTO (đúng thứ tự contract trước) |
| L2 | File `007_*.sql` tồn tại; **không** sửa `005`; không chạy migration; `git diff` chỉ 1 file migration |
| L3 | Tool chạy `--dry-run` in payload đã ký, **không** in secret; từ chối chạy khi `PAYMENT_MODE≠test` hoặc secret <16; doc có bảng mã lỗi + mục "giới hạn" |
| L4 | `tsc` exit 0; `npm run test:api` **≥ 85 pass, 0 fail**; có test chứng minh: đơn của người khác → 404 `order_not_found`; đơn pending quá TTL → `expired`; webhook cho đơn `failed` → vẫn kích hoạt được; webhook thiếu tiền → đơn thành `failed` + `failed_reason`; giao dịch lặp cùng `external_id` → không tạo `payment_events` thứ hai và không cộng Pro hai lần |
| L5 | `npm run test:extension` pass; extension **không** còn đường dẫn tạo đơn khi bấm "kiểm tra thanh toán"; nhãn trạng thái lấy từ response server; `popup.html` không còn giá hard-code |

---

## 5. Rủi ro đã biết (ghi rõ, không giấu)

| Rủi ro | Mức | Xử lý |
| --- | --- | --- |
| Controller không có `test:api` ⇒ lane api không có bằng chứng endpoint qua controller | P1 | Chạy `npm run test:api` ngoài controller, **báo cáo NOT-RUN trong controller + số đo thật ngoài**; đề xuất increment control-plane thêm `test:api` (file protected → maintainer) |
| `apps/api/migrations/**` protected ⇒ không tự integrate được migration | P1 | L2 là task maintainer; nếu maintainer không duyệt thì L4 chỉ làm được phần **không** phụ thuộc schema (`plans`, `expired` suy ra, `failed` tạm chưa ghi) và phần `failed`/`payment_events` bị **blocked** — phải báo, không giả |
| Đổi hành vi webhook (D5) là thay đổi hợp đồng đang chạy | P1 | Có test ghim trước & sau; nếu D5 gây rủi ro thì tách thành increment riêng và báo maintainer |
| `payment_orders` không có index `(user_id, created_at)` ⇒ list theo thời gian không tối ưu | P2 | Endpoint chỉ đọc **một** đơn theo uuid (PK) → không cần index mới |
| `getProStatus` và `getUsageSummary` lệch nhau về `expiresAt = NULL` | P2 | Ghi backlog; **không** sửa trong increment này (ngoài phạm vi, tránh đổi hành vi quota) |
| Webhook chưa rate-limit, chưa IP allowlist | P2 | Ghi backlog; Stripe/SePay đều khuyến nghị IP allowlist |
| `tools/create-account.mjs` vẫn cấp `tier='pro'` cho account | P2 | Maintainer-only, ngoài lane; đã ghi nhận trong report |

---

## 6. Câu hỏi cần maintainer quyết (kèm mặc định đề xuất)

1. Có duyệt **L2 (migration 007)** không? Không duyệt ⇒ phần `failed` + `payment_events` của L4 bị blocked. *Mặc định đề xuất: duyệt.*
2. Có duyệt thêm `test:api` vào catalog controller không? *Mặc định: không trong increment này; bằng chứng chạy ngoài và báo rõ.*
3. Có mở lane `web` (màn Pro trong `apps/web`) trong phiên này không? *Mặc định: không (D11).*
4. Có duyệt sửa ACL 2 file sandbox-owned để `git merge` chạy bình thường? *Mặc định: có, đúng 2 file, pattern đã được duyệt cho `.git/HEAD`.*
5. `CURRENT-STATE.md` + `TASKS.json` (registry, maintainer-lane) — có cập nhật trong phiên này không? *Mặc định: có, vì đã stale và gây hiểu nhầm.*

---

*(Phần chi tiết bằng chứng của R2 — convention repo — và R3 — ACL — sẽ bổ sung sau khi 2 subagent còn lại trả kết quả.)*
