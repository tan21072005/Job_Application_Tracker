# FEATURE MAP — JobTrack vs 4 đối thủ

> Ngày: 24/11/2026. Nguồn: đọc source + chạy thật + chụp màn hình.
> Repo clone: `F:\repo\{Resume-Matcher, Reactive-Resume, job-application-tracker, Muatasim-job-tracker}`

---

## 0. TRẠNG THÁI CHẠY ĐƯỢC

| App | Chạy | URL | Ghi chú |
|---|---|---|---|
| **JobTrack** (của bạn) | ✅ | `job-application-tracker-ai-pro24.vercel.app` | 14 hồ sơ thật |
| **Reactive-Resume** | ✅ | `127.0.0.1:3000` | Docker image |
| **Resume-Matcher** | ✅ | `127.0.0.1:3001` | Docker image |
| **job-application-tracker** | ⚠️ build OK | `.output/chrome-mv3` | Extension MV3, chưa load vào Chrome |
| **Muatasim-job-tracker** | ⚠️ chưa build | — | — |

### Cách fix 2 repo lỗi Windows

**Resume-Matcher** — dùng image có sẵn, không build từ source:
```powershell
docker pull ghcr.io/srbhr/resume-matcher:latest
docker run -d --name resume-matcher -p 3001:3000 `
  -v resume-matcher-data:/app/backend/data ghcr.io/srbhr/resume-matcher:latest
```

**job-application-tracker** — postinstall gọi `.sh` bằng bash trên Windows:
```powershell
cd F:\repo\job-application-tracker
Remove-Item node_modules -Recurse -Force
npm install --ignore-scripts
npx wxt prepare
npx wxt build      # → .output/chrome-mv3
```

---

## 1. FEATURE MAP TỔNG

Ký hiệu: ✅ có đầy đủ · ⚠️ có một phần · ❌ không có

| Tính năng | JobTrack | Resume-Matcher | Reactive-Resume | job-app-tracker (Stanislas) | Muatasim |
|---|---|---|---|---|---|
| **—— THEO DÕI ỨNG TUYỂN ——** | | | | | |
| Kanban kéo thả | ✅ 5 cột | ❌ list phẳng | ❌ | ✅ status tuỳ biến | ✅ |
| Optimistic update + rollback | ❌ | ⚠️ | — | ⚠️ local-first | ⚠️ |
| Lịch sử trạng thái | ❌ sinh lại | — | — | ✅ `activities` | ✅ `events` |
| Keyboard a11y cho Kanban | ❌ | — | — | ✅ `Shift+←/→` | ⚠️ menu |
| Nhắc follow-up | ⚠️ pill SLA | ⚠️ thủ công | ❌ | ✅ 7 ngày | ✅ stale 21/14 |
| Filter + sort | ✅ 4 sort | ⚠️ | — | ✅ 7 sort | ✅ 6 sort |
| Bulk actions | ✅ | ❌ | — | ❌ | ❌ |
| Thùng rác + khôi phục | ✅ | — | — | — | — |
| **—— ATS / CV ——** | | | | | |
| Chấm điểm ATS | ✅ 4 trụ 40/25/20/15 | ✅ 5 sub-score | ✅ ATS checker | ❌ | ❌ |
| Taxonomy đồng nghĩa | ✅ NextJS=Next.js | ❌ **cố ý bỏ** | ❌ | — | — |
| Chống nhồi keyword (density) | ✅ | ⚠️ structural | ❌ | — | — |
| Chống bịa số liệu | ❌ **thiếu** | ✅ `fact_violations` | ❌ | — | — |
| Parse-check (máy đọc PDF) | ⚠️ 3 điều kiện | ✅ **12 điều kiện** | ✅ browser-side | — | — |
| Phát hiện multi-column | ⚠️ heuristic | ✅ bounding box | ✅ | — | — |
| Xuất `.docx` | ✅ | ✅ | ✅ **18 template** | — | — |
| Xuất PDF 1 cột | ✅ print CSS | ✅ Chromium | ✅ | — | — |
| Weight redistribution | ❌ | ✅ | — | — | — |
| Diff-based edit (4 gate) | ❌ | ✅ | — | — | — |
| **—— NẠP DỮ LIỆU ——** | | | | | |
| Extension 1-click | ✅ 4 site VN | ❌ | ❌ | ✅ | ✅ LinkedIn |
| JSON-LD JobPosting | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| Partial → detail capture | ❌ | ❌ | — | ✅ | ✅ |
| Auto-fill form ứng tuyển | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| **—— KHÁC ——** | | | | | |
| Tiếng Việt | ✅ | ❌ | ✅ 40+ lang | ❌ | ❌ |
| Google OAuth | ✅ | — | ✅ | — | — |
| Thanh toán thật | ✅ PayOS live | — | ✅ | — | — |
| MCP server | ✅ | ❌ | ❌ | — | — |
| Self-host | ✅ Docker | ✅ | ✅ | — | ✅ |
| Cover letter AI | ⚠️ template | ✅ | ⚠️ | ❌ | ⚠️ |
| Luyện phỏng vấn | ⚠️ 3 câu tĩnh | ✅ | ❌ | ❌ | ❌ |

---

## 2. ĐIỂM MẠNH RIÊNG CỦA TỪNG APP

### JobTrack (của bạn) — điểm độc nhất

| # | Điểm mạnh | Đối thủ gần nhất |
|---|---|---|
| 1 | **Kanban 5 cột + drag-drop**, không ai trong 4 repo có Kanban thật | Stanislas có status tuỳ biến nhưng là extension, không phải web |
| 2 | **Extension cho 4 site Việt** (TopCV, ITviec, VietnamWorks, LinkedIn) | Không ai làm thị trường VN |
| 3 | **Taxonomy đồng nghĩa** — Resume-Matcher **cố ý bỏ** vì "ATS filter literal" | Đây là lợi thế bạn phải giữ |
| 4 | **MCP server** — AI ngoài điều khiển được | Không ai có |
| 5 | **Tiếng Việt bản địa** | Không ai có |
| 6 | Thanh toán PayOS live (VND) | Reactive-Resume có nhưng USD |

### Resume-Matcher — mạnh nhất về ATS depth

**Điểm mạnh kỹ thuật đáng copy:**

1. **`fact_violations`** (`writing_quality.py:231-278`)
   Kiểm tra rewrite có bịa số/tên/tool không. 0 đồng LLM, deterministic.
   ```
   _novel_numbers(before, after) → "added_number"
   _fact_tokens: nhận C++/Node.js/CI-CD qua regex [\d+#]|\w[./]\w
   ```

2. **Weight redistribution** (`ats.py:379-385`)
   ```python
   scored = {k:v for k,v in sub_scores.items() if v is not None}
   overall = sum(v*W[k] for k,v in scored.items()) / sum(W[k] for k in scored)
   ```
   JD thiếu title → không trừ oan 15 điểm.

3. **Parse-check 12 điều kiện** (`ats_parse/checks.py`)
   `text_layer`, `garbled_glyphs`, `text_coverage`, `multi_column`, `tables`, `text_boxes`, `header_footer`, `images`, `page_count`, `contact_info`, `section_headings`, `dates`
   JobTrack chỉ có 3.

4. **`apply_diffs` 4 gate** (`improver.py:368-451`)
   Chặn LLM sửa `company`/`years`/`personalInfo` **về mặt kiến trúc**, không nhờ prompt.

5. **LLM provider linh hoạt** — 12 provider trong Settings:
   `OpenAI · OpenAI-compatible · Azure · Anthropic · OpenRouter · Google · DeepSeek · Groq · Ollama · Claude Plan · ChatGPT Plan · Coding Agent`

### Reactive-Resume — mạnh nhất về CV builder

| Điểm mạnh | Chi tiết |
|---|---|
| **18 template**, 10 "ATS-safe", filter được | JobTrack không có template |
| **ATS checker browser-side** — file không upload | Riêng tư hơn JobTrack (upload server) |
| **40+ ngôn ngữ** | |
| **Design system cực mạnh** — retro-brutalist: serif + viền đen cứng + nền kem | |
| Section: Viết / Thiết kế / Kiểm tra / Thích ứng JD / Chia sẻ / Chuẩn bị / Ghi nhớ | JobTrack không có "Chuẩn bị" và "Ghi nhớ" |

### job-application-tracker (Stanislas) — mạnh nhất về data model

| Điểm mạnh | Chi tiết | JobTrack nên học |
|---|---|---|
| **Tách `JobOffer` ↔ `Application`** | 1 tin tuyển dụng, nhiều lần apply | Có — giải quyết "1 job đăng LinkedIn + Indeed" |
| **`statuses` là bảng do user định nghĩa** | `key, label, order, color, symbol, isFinal` | Có — 7 status cố định của bạn cứng quá |
| **`activities` có `fromStatusId`/`toStatusId`** | Audit trail thật | **Rất nên** — bạn đang mất lịch sử |
| **Keyboard: `Shift+←/→` move card + announce** | `useBoardShortcuts.ts:73-87` | Có |
| **`isFinal` flag** trên status | Biết trạng thái kết thúc | Có |

---

## 3. KHOẢNG TRỐNG CỦA JOBTRACK (ưu tiên sửa)

| # | Thiếu | Mức độ | Đối thủ có | Fix |
|---|---|---|---|---|
| 1 | **Chống bịa số liệu** khi LLM rewrite | **Cao** | Resume-Matcher | `fact_violations` — subagent đang làm |
| 2 | **Lịch sử trạng thái thật** | **Cao** | Stanislas `activities` | Bảng `application_events` |
| 3 | **Keyboard a11y** | Cao (WCAG 2.2 AA) | Stanislas | `onKeyDown` + `Ctrl+←/→` — subagent đang làm |
| 4 | **Nút bị bóp chữ** trên card | Cao (thị giác) | — | subagent đang làm |
| 5 | Ngày nộp + nguồn trên card | Trung bình | Cả 3 | subagent Wave 2 |
| 6 | Nhắc follow-up thật | Trung bình | Stanislas, Muatasim | subagent Wave 2 |
| 7 | Parse-check 12 điều kiện | Trung bình | Resume-Matcher | Mở rộng trụ 2 |
| 8 | Weight redistribution | Thấp | Resume-Matcher | 5 dòng |
| 9 | Template CV | Thấp | Reactive-Resume 18 mẫu | Không cần — khác định vị |
| 10 | Optimistic update | Thấp | Muatasim | Card đứng yên ~200ms, chấp nhận được |

---

## 4. ĐỊNH VỊ — KHÔNG CẠNH TRANH TRỰC TIẾP

```
                    ATS sâu
                       ↑
        Resume-Matcher │
                       │
    ───────────────────┼───────────────────→ Pipeline sâu
                       │
     Reactive-Resume   │        ★ JobTrack
     (CV builder)      │        (Kanban + VN market)
                       │
                       │   Stanislas (extension only)
```

**JobTrack nằm ở góc phần tư không ai chiếm:** Kanban pipeline + thị trường Việt Nam + extension 4 site VN.

**Đừng cố thắng Resume-Matcher về ATS depth** — họ có 6.5k sao, 12 check. Thắng bằng **pipeline + localization**.

---

## 5. ẢNH ĐÃ CHỤP

| App | Màn hình | File |
|---|---|---|
| Resume-Matcher | Landing | `docs/screenshots/opponent-resume-matcher-landing.png` |
| Resume-Matcher | Dashboard | `docs/screenshots/opponent-resume-matcher-dashboard.png` |
| Resume-Matcher | Application Tracker | `docs/screenshots/opponent-resume-matcher-tracker.png` |
| Resume-Matcher | Settings + LLM config | `docs/screenshots/opponent-resume-matcher-settings.png` |
| Reactive-Resume | Landing | `docs/screenshots/opponent-reactive-resume-landing.png` |
| Reactive-Resume | ATS checker | `docs/screenshots/opponent-reactive-resume-ats.png` |
| Reactive-Resume | 18 templates | `docs/screenshots/opponent-reactive-resume-templates.png` |
| JobTrack | Kanban 16 hồ sơ | `docs/screenshots/jobtrack-kanban.png` |

---

## 6. KẾT LUẬN CHO BUỔI PITCH

**Nói với nhà đầu tư:**

> "Em không cạnh tranh với Resume-Matcher về ATS — họ có 6.5k sao và 12 điều kiện kiểm tra, em có 3.
> Em cạnh tranh về **pipeline**: Kanban 5 cột, extension 4 site Việt Nam, tiếng Việt bản địa.
> Ba thứ em đang học từ họ: chống bịa số liệu, kiểm tra máy đọc PDF, và lịch sử trạng thái."

**Không nói:** "app em có 20 tính năng" hoặc "hoàn thiện 100%".
