# PLAN — Dữ liệu công ty: waterfall nhiều nguồn có kiểm chứng

> Trạng thái: **CHỜ DUYỆT**. Chưa sửa code.
> Ngày: 25/11/2026

---

## 0. Vấn đề

`company-service.ts:158` gọi `synthesizeCompanyIntelligence(cleanName)` khi không tìm thấy
profile, rồi INSERT kết quả vào `company_profiles`. Hàm đó sinh số cứng:

```ts
overall: 4.2, workLife: 3.9, compensation: 4.1, careerGrowth: 4.3,
management: 4.0, recommendRate: 85, totalReviews: 24
```

Chỉ 3 công ty có preset riêng (FPT Software, VNG, Shopee). Mọi công ty khác nhận cùng
bộ số và cùng "24 đánh giá". UI còn ghi "Dữ liệu tổng hợp từ cộng đồng & khảo sát thị trường".

Kết quả đo trên production:

| Công ty | industry bị gán | Thật ra |
|---|---|---|
| SNB | Information Technology & Software | Phân phối thực phẩm dinh dưỡng thể thao |
| Sun Life Việt Nam | Information Technology & Software | Bảo hiểm nhân thọ |

Website `cngtycphnphnphisnb.com` do code tự sinh, không tồn tại.

---

## 1. Đã nghiên cứu gì

| Repo | Học được |
|---|---|
| `areebahmeddd/jobdex` | Waterfall Wikidata → Wikipedia → Clearbit. `enriched_at` + refresh 90 ngày. "Existing field values are not overwritten". Scheduler chạy nền, advisory lock chống chạy trùng. |
| `56Percentt/cie-tool` | Chấm điểm khớp: `name_fuzzy 0.45 + name_tfidf 0.35 + domain_match 0.20`. Ngưỡng HIGH 0.80 / MEDIUM 0.60 / LOW 0.45. **Length penalty** `sqrt(len(a)/len(b))` để "intel" không khớp "intel c++ compiler". Chuẩn hoá URL khi hoà điểm. Cache + throttle 0.2s. |
| `google/langextract` | **Mỗi trường trích ra phải ánh xạ được về đúng khoảng ký tự trong nguồn.** Trích xuất không tìm thấy trong nguồn có `char_interval = None` → lọc bỏ. Đây là kỹ thuật chống bịa chính thức của Google. Model khuyến nghị `gemini-3.5-flash` — trùng model đang dùng. |
| `LanGuo/veritract` | "Every field earns its place: fuzzy-matched to source, LLM re-verified if fuzzy fails, **quarantined if neither passes**". Provenance có kiểu trên từng trường. |
| `chatwoot/chatwoot` | `fillIfEmpty` — enrichment không bao giờ ghi đè giá trị người dùng đã nhập. Timeout 30s có fallback. Snapshot giá trị ban đầu để phát hiện người dùng có sửa không. |
| `Nuclear-Marmalade/dataforge` | **COALESCE writes** — chỉ ghi vào cột NULL. Đếm `enrichment_attempts`. Graceful degradation khi một tầng lỗi. Hai đường chạy độc lập: scrape (không LLM) và AI (LLM). |
| `567-labs/instructor` | `assert quote in context` — kiểm chứng đơn giản nhưng hiệu quả. |

Kết luận chung của cả 6 repo: **không nguồn nào đủ tin một mình**. Tất cả đều dùng
waterfall + ghi nguồn + không ghi đè. Đó là lý do D1/D2/D3 nên là **tầng**, không phải
lựa chọn loại trừ nhau.

---

## 2. Kiến trúc: 5 tầng, mỗi trường mang nguồn

Mỗi trường (`industry`, `size`, `website`, `rating`...) lưu kèm:

```ts
type FieldProvenance = {
  value: string | number | null;
  source: 'user' | 'jsonld' | 'llm_grounded' | 'wikidata' | 'places' | 'manual';
  confidence: number;      // 0..1, xem mục 4
  evidence: string | null; // đoạn nguyên văn đã kiểm chứng
  verifiedAt: string;      // ISO
};
```

Thứ tự ưu tiên khi ghi: **cao hơn thì thắng, ngang thì giữ cái cũ** (COALESCE).

| Tầng | Nguồn | Độ tin | Dùng cho | Chi phí |
|---|---|---|---|---|
| 0 | `user` — người dùng tự nhập | 1.00 | mọi trường | 0 |
| 1 | `jsonld` — JSON-LD `JobPosting.hiringOrganization` trong trang tuyển dụng | 0.95 | tên, website, logo, địa chỉ | 0 |
| 2 | `llm_grounded` — Gemini đọc website, **bắt buộc trích nguyên văn** | 0.70 | industry, size, description, techStack | ~2000 token/lần |
| 3 | `wikidata` — Wikidata + Wikipedia | 0.60 × điểm khớp | industry, founded, HQ, logo | 0 |
| 4 | `places` — Google Places API | 0.90 (của Google) | rating, userRatingCount, địa chỉ | $5/1000 req |

Tầng 4 là dữ liệu **của Google**, không được trộn với điểm JobTrack. Hiển thị riêng,
có logo Google + tên tác giả, không cache quá 30 ngày (điều khoản Google).

---

## 3. Luồng chạy

```
GET /api/companies/:name
  ├─ Tầng 0: đọc company_profiles (user đã nhập) → nếu đủ, trả luôn
  ├─ Tầng 2 trong DB cache (llm_grounded, verifiedAt < 90 ngày) → trả
  └─ Không có → trả EMPTY + cờ canEnrich: true
       UI hiện nút [🔍 Tìm thông tin công ty]

POST /api/companies/:name/enrich   (người dùng bấm nút)
  ├─ Bước 1  JSON-LD:    lấy từ hồ sơ ứng tuyển đã lưu (url job) → 0.95
  ├─ Bước 2  Website:    fetch /, /about, /gioi-thieu (tối đa 3 trang, 5s/trang)
  ├─ Bước 3  LLM:        Gemini trích xuất + trả kèm `quote` cho từng trường
  ├─ Bước 4  Verify:     grep quote trong HTML gốc. Không khớp → loại, ghi log
  ├─ Bước 5  Wikidata:   nếu bước 1-4 thiếu industry/founded
  ├─ Bước 6  Places:     nếu người dùng bật, lấy rating + userRatingCount
  └─ COALESCE ghi:       chỉ ghi vào cột NULL hoặc cột có confidence thấp hơn
```

Chạy nền, không chặn request. Trả `202` + `enrichmentId`. UI poll mỗi 2s,
timeout 30s thì hiện "Đang tìm, sẽ báo khi xong" (theo Chatwoot).

---

## 4. Chấm điểm tin cậy

Theo `cie-tool`, có điều chỉnh cho tiếng Việt:

```
name_fuzzy   0.40  RapidFuzz token_set_ratio + length penalty
name_tfidf   0.30  TF-IDF cosine
domain_match 0.30  domain đầu vào nằm trong website ứng viên

Ngưỡng:  ≥0.80 HIGH   ≥0.60 MEDIUM   ≥0.45 LOW   <0.45 WEAK (vẫn ghi, có cảnh báo)
```

**Length penalty** giải quyết lỗi thật: tên ngắn "SNB" sẽ khớp nhầm công ty khác
có "SNB" trong tên dài.

**Chuẩn hoá tiếng Việt trước khi so:** bỏ dấu, lowercase, gộp khoảng trắng,
bỏ hậu tố pháp lý (`CÔNG TY TNHH`, `CỔ PHẦN`, `CP`, `TNHH`). "CÔNG TY CỔ PHẦN PHÂN PHỐI SNB"
→ "phan phoi snb". Không có bước này, fuzzy score của tên tiếng Việt luôn thấp.

---

## 5. Chống LLM bịa

Đây là điểm quan trọng nhất. Prompt + verify:

```
Prompt gửi Gemini:
  Trích xuất các trường sau từ văn bản. QUY TẮC BẮT BUỘC:
  1. Mỗi trường phải kèm "quote" là đoạn NGUYÊN VĂN trong văn bản.
  2. quote phải xuất hiện y hệt, không sửa, không viết lại.
  3. Không tìm thấy → giá trị null, quote null.
  4. KHÔNG suy luận. KHÔNG dùng kiến thức bên ngoài văn bản.

  Trả JSON:
  {"industry":{"value":"...","quote":"..."},
   "size":{"value":"...","quote":"..."},
   "description":{"value":"...","quote":"..."}}

Verify phía server:
  for each field with a value:
    if (!htmlLower.includes(quote.toLowerCase())) {
      drop field, log { field, quote, reason: 'quote_not_found' }
    }
```

Đây đúng là kỹ thuật của `langextract` (`char_interval = None`) và `instructor`
(`assert quote in context`), viết bằng TypeScript.

**Test bắt buộc:** cho Gemini đọc trang của một công ty có ngành rõ ràng,
ép nó trích "Information Technology" khi trang ghi "thực phẩm". Verify phải loại bỏ.
Nếu test này fail, cả tầng 2 vô dụng.

---

## 6. UI

```
┌──────────────────────────────────────────────────┐
│ CÔNG TY CỔ PHẦN PHÂN PHỐI SNB                    │
│                                                   │
│ Ngành:      chưa có dữ liệu                       │
│ Quy mô:     chưa có dữ liệu                       │
│ Website:    chưa có dữ liệu                       │
│                                                   │
│ [🔍 Tìm thông tin công ty]                        │
│                                                   │
│ ─── Đánh giá & Lương ───                          │
│ Chưa có đánh giá nào từ người dùng JobTrack.      │
│ Bạn là người đầu tiên?  [✍️ Viết đánh giá]        │
└──────────────────────────────────────────────────┘
```

Sau khi enrich xong:

```
│ Ngành:   Phân phối thực phẩm dinh dưỡng           │
│          ⓘ trích từ snb.vn — "chuyên phân phối..." │
│ Quy mô:  50–200 nhân viên                          │
│          ⓘ trích từ snb.vn — "với hơn 150..."      │
│ Google:  ⭐ 4.3 (128) — ảnh hưởng bởi Google Maps  │
```

Bỏ nhãn "Dữ liệu tổng hợp từ cộng đồng & khảo sát thị trường".
Thay bằng nguồn thật của từng trường.

---

## 7. Việc cần làm

| # | Việc | Tầng | Thời gian |
|---|---|---|---|
| 1 | Migration 016: xoá 3 profile bịa, thêm cột `provenance jsonb`, `enriched_at`, `enrichment_attempts` | — | 15 phút |
| 2 | `company-name.ts`: chuẩn hoá tên VN (bỏ dấu, bỏ hậu tố pháp lý) + `scoreMatch()` với length penalty | — | 30 phút |
| 3 | `company-enrichment-service.ts`: waterfall 5 tầng + COALESCE ghi | 0–3 | 90 phút |
| 4 | `POST /companies/:name/enrich` + job nền + poll | — | 45 phút |
| 5 | `google-places.ts`: rating + userRatingCount, có attribution, không cache | 4 | 30 phút |
| 6 | `CompanyIntelligenceModal.tsx`: empty state, nút enrich, hiện nguồn từng trường, tách khối Google | — | 60 phút |
| 7 | Bảng `company_salary_submissions` + form đóng góp lương | 0 | 40 phút |
| 8 | Test: verify quote loại bỏ đúng; scoreMatch không khớp nhầm; COALESCE không ghi đè | — | 45 phút |
| **Tổng** | | | **~6 giờ** |

---

## 8. Điều KHÔNG làm

- **Không scrape TopCV / VietnamWorks / LinkedIn.** Không có API công khai, scrape vi phạm ToS.
  `jobdex` đã thử 40+ nền tảng và ghi rõ lý do từng cái fail — trong đó có JobStreet 403,
  VietnamWorks không có JSON.
- **Không cache dữ liệu Google Places vào DB** quá 30 ngày (điều khoản Google).
- **Không trộn điểm Google với điểm người dùng JobTrack.**
- **Không tự động chạy enrich** khi mở trang — tốn tiền, chậm. Chỉ khi người dùng bấm.
- **Không ghi đè** dữ liệu người dùng đã nhập (COALESCE, theo Chatwoot và FORGE).

---

## 9. Cần bạn quyết

| # | Câu hỏi | Đề nghị |
|---|---|---|
| 1 | Làm cả 5 tầng hay bắt đầu tầng 0+1+2? | Bắt đầu 0+1+2 (miễn phí, không cần key). Tầng 3 thêm sau. Tầng 4 khi có key. |
| 2 | Google Places API key | Cần bật billing. Nếu chưa muốn, bỏ tầng 4, UI ẩn khối Google. |
| 3 | Có làm bảng đóng góp lương (việc 7) ngay không? | Nên có — nó là nguồn thật duy nhất cho dữ liệu lương. |
| 4 | Xoá 3 profile bịa hiện có? | Có. Chúng là dữ liệu sai đang hiện cho người dùng. |
