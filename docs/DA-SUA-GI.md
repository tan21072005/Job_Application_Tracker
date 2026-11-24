# Đã sửa gì — 22/11/2026

Tài liệu này ghi lại chính xác những gì đã thay đổi trong lần sửa này, để bạn (hoặc người sau) không phải đoán.

---

## 1. Bỏ hẳn n8n và ngrok

### Trước

Khi người dùng bấm chat, server:

1. Tạo một "giấy phép" (`grant`) có quyền **`full_control`** — nghĩa là toàn quyền đọc/ghi dữ liệu người dùng.
2. Gửi giấy phép đó sang một địa chỉ **ngrok hardcode**:
   `https://maximum-eastcoast-obstruct.ngrok-free.dev/webhook/jobtrack-agent`
3. Chờ 15 giây. Nếu bên kia trả lời thì dùng, không thì rơi về câu trả lời if/else.

### Vấn đề

- Bất kỳ ai biết địa chỉ ngrok đó đều có thể nhận được token `full_control` của người dùng thật.
- Token sống 10 phút, đủ để đọc/xoá dữ liệu.
- Máy chủ nghiệp dư (ngrok free) có thể đổi địa chỉ bất cứ lúc nào → chat chết im lặng.
- Không kiểm soát được dữ liệu người dùng bị gửi đi đâu.

### Sau

`apps/api/src/services/chat-responder.ts` — file mới, thay thế toàn bộ khối if/else trong `server.ts`:

- **Không còn `fetch` tới ngrok.**
- **Không còn tạo grant token** trong luồng chat.
- Nếu có `LLM_PROVIDER` → gọi thẳng API nhà cung cấp từ server.
- Nếu không có → trả lời bằng quy tắc, dựa trên dữ liệu thật của chính người dùng.
- Câu trả lời luôn kèm `provenance`: `llm` (AI thật) hoặc `local_fallback` (quy tắc).

**Bằng chứng:** test `chat: POST /api/ai/chat responds with grounded reply and never issues a grant token` kiểm tra bảng `ai_grants` phải rỗng sau khi chat.

---

## 2. Lõi phân tích JD ↔ CV

### File mới

| File | Việc |
| --- | --- |
| `apps/api/src/services/llm-client.ts` | Gọi 4 nhà cung cấp: OpenAI, DeepSeek, Gemini, OpenRouter. Tự chọn đúng định dạng request. |
| `apps/api/src/services/resume-analysis-service.ts` | Phân tích JD ↔ CV, kiểm tra chống bịa, tự quay về quy tắc khi LLM lỗi. |

### Luồng mới của `POST /api/resume/diagnose`

```
Người dùng dán JD + CV
        ↓
Có LLM chưa?
   ├── Chưa → chạy bộ quy tắc (provenance: rules)
   └── Có   → gọi LLM, nhận JSON
                ↓
        Kiểm tra 3 lớp (bên dưới)
                ↓
        Lưu vào DB, trả về UI
```

### Ba lớp chống bịa

Đây là phần quan trọng nhất. LLM rất hay bịa. Ba bộ lọc này chặn điều đó:

**Lớp 1 — Từ khóa phải có thật trong JD**

```ts
if (!containsTerm(jobDescription, keyword)) continue;
```

Nếu LLM nói "CV thiếu Kubernetes" nhưng JD không hề nhắc Kubernetes, từ khóa đó bị xoá. Không có ngoại lệ.

**Lớp 2 — Không báo thiếu thứ đã có**

```ts
if (containsTerm(resumeText, keyword)) continue;
```

Nếu CV đã có "SEO" thì không thể báo thiếu "SEO".

**Lớp 3 — Bullet gốc phải khớp nguyên văn**

```ts
if (!resumeNormalized.includes(originalBullet)) continue;
```

Nếu LLM tự nghĩ ra một bullet không có trong CV, phần viết lại bị bỏ. Điều này ngăn trường hợp LLM "sáng tác" kinh nghiệm cho người dùng.

### Lỗi thứ tư tìm thấy khi chạy thật

Bộ quy tắc cũ còn một lỗi tinh vi: nó coi **mọi chữ viết hoa** là từ khóa. Với câu "Yeu cau: Biet SEO...", nó lấy chữ "Biet" (đầu câu) làm từ khóa và báo CV thiếu "Biet".

Đã sửa: chỉ tính chữ viết hoa xuất hiện **giữa câu** ít nhất 2 lần. Chữ đứng đầu câu bị loại.

Trước khi sửa, kết quả trả về có `Biet` trong danh sách thiếu. Sau khi sửa, danh sách chỉ còn từ khóa thật.

### Từ điển nghề nghiệp mở rộng

Bộ quy tắc cũ chỉ có từ khóa IT (React, Docker, Kubernetes...). Với người làm marketing, kế toán, nhân sự, nó trả về rác — ví dụ lấy chữ "biết" làm "từ khóa".

Đã bổ sung khoảng 60 từ khóa cho các ngành văn phòng phổ biến:

- **Marketing:** Facebook Ads, Google Ads, SEO, Google Analytics, Content Marketing, Email Marketing, Branding, Market Research
- **Sales:** Sales, Business Development, Negotiation, KPI, Revenue Target, CRM
- **Kế toán:** Accounting, Excel, MISA, Financial Reporting, Tax Declaration, Payroll, Audit, VAS, IFRS
- **Nhân sự:** Recruitment, Human Resources, Labor Law, Compensation and Benefits, Onboarding
- **Vận hành:** Project Management, Budget Management, Logistics, Supply Chain, Inventory Management
- **Kỹ năng mềm:** Communication, Teamwork, Presentation, Problem Solving, Time Management

**Bằng chứng:** test `resume-analysis: rule fallback flags keywords absent from the CV` dùng JD marketing và kiểm tra tìm ra "Email Marketing" là thiếu.

---

## 3. Gói giá khớp với chiến lược

Đã đổi trong `apps/api/src/services/ai-pro-service.ts`:

| Gói | Cũ | Mới | Lý do |
| --- | --- | --- | --- |
| Tháng | 99.000đ | 99.000đ | Giữ nguyên |
| **Quý** | 249.000đ | **149.000đ** | Đây là gói chính: "Job Search Pass 90 ngày". Đúng độ dài một chu kỳ tìm việc, trả một lần, không tự trừ tiền |
| Năm | 799.000đ | 499.000đ | Giảm để hợp lý so với gói quý |

Tên gói quý đổi thành **"Job Search Pass (90 ngày)"**, mô tả ghi rõ "Không tự động gia hạn, không tự trừ tiền".

---

## 4. Endpoint chẩn đoán cấu hình

`GET /api/config/status` (cần đăng nhập) trả về:

```json
{
  "llm": { "configured": true, "provider": "deepseek" },
  "mail": { "transport": "brevo-api", "deliversToUsers": true },
  "payments": { "mode": "test", "chargesRealMoney": false },
  "deployment": { "origin": "https://jobtrack.vn", "cookieSecure": true }
}
```

Dùng để trả lời câu hỏi "hệ thống đang thật hay đang giả lập?" mà không phải đọc log.

---

## 5. Những file đã sửa

| File | Thay đổi |
| --- | --- |
| `apps/api/src/services/llm-client.ts` | **Mới** — gọi LLM đa nhà cung cấp |
| `apps/api/src/services/resume-analysis-service.ts` | **Mới** — phân tích JD ↔ CV + 3 lớp chống bịa |
| `apps/api/src/services/chat-responder.ts` | **Mới** — thay n8n, trả lời dựa trên dữ liệu thật |
| `apps/api/src/services/resume-optimizer-service.ts` | Thêm `saveAnalysis()`, không xoá `diagnoseAndOptimize()` cũ |
| `apps/api/src/services/ai-pro-service.ts` | Giá và tên gói |
| `apps/api/src/server.ts` | Thay route chat; route diagnose gọi LLM; thêm `/api/config/status` |
| `packages/jobtrack-contract/src/resume-optimizer.ts` | Thêm `verdict`, `provenance`, `model` (tuỳ chọn); mở rộng từ điển |
| `packages/jobtrack-contract/src/chat.ts` | Thêm `'llm'` vào `ChatProvenance` |
| `apps/web/src/components/ChatWidget.tsx` | Nhãn "Trợ lý AI" thay vì "JobTrack Core" khi có LLM |
| `apps/web/src/jobtrack.css` | Màu cho nhãn `llm` và `local_fallback` |
| `apps/api/src/chat.test.ts` | Test mới: không được tạo grant token |
| `apps/api/src/resume-analysis.test.ts` | **Mới** — 3 test cho bộ phân tích |
| `apps/api/src/pro-billing.test.ts`, `pro-order-status.test.ts` | Cập nhật giá mới |
| `docker-compose.yml` | Truyền biến LLM vào container |
| `.env.example` | **Mới** — mẫu cấu hình có ghi chú tiếng Việt |
| `RUN-LOCAL.md` | Thêm mục cấu hình LLM |

---

## 6. Kết quả kiểm tra

| Bộ test | Kết quả |
| --- | --- |
| `npm run build:api` | Pass, không lỗi kiểu |
| `npm run check:contract` | 58/58 pass |
| Test chat + resume + billing | 45/45 pass |
| `npm run build:web` | Pass |
| Smoke test end-to-end | Đăng ký → diagnose → chat → config. Thiếu đúng 4 từ khóa thật, 0 grant token được tạo |

---

## 7. Điều vẫn còn phải làm

Danh sách này **chưa xong**, đừng tưởng đã sẵn sàng thu tiền:

1. **Chưa có API key LLM** → hiện chạy bằng quy tắc. Cần đăng ký DeepSeek hoặc OpenAI rồi điền `.env`.
2. **Email vẫn là `console`** → nhắc việc không tới người dùng. Cần Brevo + xác thực domain.
3. **Thanh toán vẫn là `test`** → không thu được tiền thật. Cần PayOS/Casso/SePay.
4. **Chưa có domain + HTTPS** → vẫn localhost.
5. **Landing page vẫn tiếng Anh** → chưa sửa.
6. **Chưa có LICENSE** → repo public, người khác dùng được code thương mại.

Thứ tự làm tiếp: (1) → (4) → (2) → (3) → (5) → (6).

---

## 8. Cách tự kiểm tra

```powershell
# 1. Kiểm tra code chạy đúng
cd F:\Project\Job_Application_Tracker
npm run build:api
npm run check:contract

# 2. Chạy test phần vừa sửa
cd apps\api
node --test --env-file-if-exists=.env.test src/chat.test.ts src/resume-analysis.test.ts src/resume-optimizer.test.ts

# 3. Xem hệ thống đang thật hay giả lập (sau khi đăng nhập)
curl -H "Cookie: jobtrack_session=..." http://127.0.0.1:64364/api/config/status
```

Nếu muốn thử LLM thật:

```powershell
# Thêm vào .env ở thư mục gốc
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=<key của bạn>

# Rồi khởi động lại
docker compose up -d api
```

Sau đó gọi `/api/resume/diagnose`, kết quả sẽ có `provenance: "llm"` thay vì `"rules"`.
