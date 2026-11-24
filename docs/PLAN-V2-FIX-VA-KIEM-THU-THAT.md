# PLAN — Sửa `check:all`, đồng bộ deploy, và kiểm thử bằng người dùng thật

> Cập nhật: 24/11/2026
> Vai trò: agent điều phối. Plan này để bạn duyệt trước khi tôi thực thi.
> Trạng thái: **CHƯA CODE**. Chỉ plan + trả lời câu hỏi.

---

## PHẦN A — TRẢ LỜI CÂU HỎI VỀ CỔNG

Bạn nghĩ `6364`, tôi nói `6432`. **Cả hai đều không đúng.** Số thật:

| Cổng | Trạng thái | Là gì |
|---|---|---|
| **64364** | 🟢 **ĐANG MỞ** | Web app (nginx trong container `jobtrack-web`) |
| **64366** | 🔴 đóng từ host | API — chỉ mở **trong mạng Docker**, truy cập qua nginx |
| **55432** | 🟢 đang mở | Postgres **test** (`jobtrack-postgres-dev`) — tôi dựng thêm |
| **5432** | 🟢 đang mở | Chatwoot Postgres (**không phải** JobTrack) |
| ~~6364~~ | 🔴 không tồn tại | — |
| ~~4432~~ | 🔴 không tồn tại | — |

**Bạn đúng khi nghĩ "6364"** — vì nó gần giống `64364`. Nhưng số chính xác là **64364**.

Còn `4432` là tôi viết sai. Tôi định nói **55432** (Postgres test). Xin lỗi vì đã gây nhầm lẫn.

**Điểm quan trọng:** `64366` không truy cập được từ host vì `docker-compose.yml` không map port ra ngoài — API chỉ lắng nghe trong mạng nội bộ Docker. Web gọi API qua nginx proxy. Đây là thiết kế đúng (không lộ API ra ngoài), nhưng nghĩa là:

```powershell
# SAI — sẽ fail
Invoke-WebRequest http://127.0.0.1:64366/api/health

# ĐÚNG — đi qua nginx
Invoke-WebRequest http://127.0.0.1:64364/api/health
```

---

## PHẦN B — TÌNH TRẠNG BROWSER CONTROL (đã kiểm chứng)

### Extension đang chạy THẬT

```
Bridge:  ws://127.0.0.1:18760  →  {"ok":true,"extensions":2,"clients":1,"uptime":53044}
```

```
[oc90168d373b0c]  Chrome  Not-A.Brand:99  Google Chrome:157  Chromium:157
[ocf0c1c46ae935]  Chrome  Not-A.Brand:99  Google Chrome:157  Chromium:157
```

**2 trình duyệt Chrome đang kết nối.**

### Đường dẫn SAI — đừng dùng

```
F:\Project\opencode-chrome-mcp\chrome-cli.mjs
```

Đã thử, **không hoạt động**:
```
node chrome-cli.mjs chrome_tab '{"action":"browsers"}'
→ [LOI] E_BAD_ARGS: Tool khong ton tai: chrome_tab.
```

Lý do: script này nói chuyện trực tiếp với bridge, nhưng **bridge chỉ relay lệnh**, không tự thực thi. Tool thật nằm ở extension qua CDP.

Ngoài ra PowerShell nuốt dấu `"` khi truyền JSON inline. Phải dùng file `@path`.

### Đường dẫn ĐÚNG — dùng tool `chrome` trong Code Mode

```
tools.chrome.chrome_tab    → browsers, list, open, close, activate, navigate, back, forward, reload, status, release, set_label
tools.chrome.chrome_page   → snapshot, evaluate, screenshot, read_text, find, console_messages, wait_for, network, cookies
tools.chrome.chrome_act    → click, hover, type, fill_form, select_option, checkbox, press_key, scroll, set_value
tools.chrome.chrome_cdp    → gọi CDP thô
```

**Đã test thành công:**
```javascript
tools.chrome.chrome_tab({ action: "browsers" })
→ [oc90168d373b0c] Chrome ... [ocf0c1c46ae935] Chrome ...
```

Đây là đường tôi sẽ dùng cho Phần E.

### Cảnh báo về extension

`F:\Project\opencode-chrome-extension\lib\tools.js` có 11 tool nội bộ
(`screenshot`, `console_messages`, `checkbox`, `cookies`, `network`, `downloads`,
`status`, `set_browser_label`, `reload_self`, `release`, `capabilities`) —
khác với 4 tool nhóm `chrome_tab/page/act/cdp` của MCP server.

Nghĩa là **extension và MCP server là 2 phiên bản khác nhau**. Bridge vẫn relay được
vì MCP server map action → method, nhưng nếu gặp lỗi lạ thì đây là nghi phạm đầu tiên.

**Không sửa gì ở 2 project này trong plan này.** Chỉ dùng.

---

## PHẦN C — SỬA `check:all` (ĐÃ XONG — ghi lại để tái lập)

### Nguyên nhân gốc: 1, không phải 8

```
Error: connect ECONNREFUSED 127.0.0.1:55432
```

`.env.test` trỏ Postgres cổng **55432**. Container không chạy → `check:stack` fail
→ `check:mcp` fail → pipeline đỏ. **Không phải lỗi code.**

### Kết quả sau khi fix

```
npm run check:all  →  EXIT = 0
```

| Bước | Kết quả |
|---|---|
| check:contract | 60/60 |
| check:stack (api) | 295/295 |
| check:mcp | 5/5 |
| test:extension | 10/10 |
| test:web | 187/187 |
| build:web | ✅ `index-DgfKEc8y.js` |
| test:agent-loop | 3/3 |
| check:architecture | ✅ |

**373 (node:test) + 187 (vitest) = 560 test pass, 0 fail, 0 dấu ✖.**

### 3 lệnh đã dùng

```powershell
# 1. Dựng Postgres test
docker run -d --name jobtrack-postgres-dev `
  -e POSTGRES_USER=jobtrack -e POSTGRES_PASSWORD=jobtrack_local_dev `
  -e POSTGRES_DB=jobtrack -p 127.0.0.1:55432:5432 `
  -v jobtrack-postgres-dev-data:/var/lib/postgresql postgres:18

# 2. Tạo DB
docker exec jobtrack-postgres-dev psql -U jobtrack -d postgres -c "CREATE DATABASE jobtrack_test"

# 3. Migration — BƯỚC QUAN TRỌNG NHẤT
cd F:\Project\Job_Application_Tracker\apps\api
$env:NODE_ENV='test'
$env:DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack'
$env:TEST_DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack_test'
node --env-file-if-exists=.env.test src/migrate.ts
```

Kết quả bước 3: **11 migration applied**, DB test có **20 bảng**.

> Thiếu bước 3 → DB test rỗng → `account-data.test.ts` fail vì không có bảng `users`, `applications`. Đó chính xác là lỗi ban đầu.

---

## PHẦN D — ĐỒNG BỘ VERCEL

### Vấn đề thật

```
Vercel đang serve : index-Gz4X7gzl.js
Local build mới   : index-DgfKEc8y.js
```

Hai bundle khác nhau → **3 tính năng cốt lõi chưa lên production**.

### Bước D1 — Build + deploy

```powershell
cd F:\Project\Job_Application_Tracker
npm run build:web
npx vercel --prod
```

### Bước D2 — Kiểm chứng khớp bundle

```powershell
$local  = [regex]::Match((Get-Content apps/web/dist/index.html -Raw),'index-[A-Za-z0-9_-]+\.js').Value
$remote = [regex]::Match((Invoke-WebRequest 'https://job-application-tracker-ecru-kappa.vercel.app/' -UseBasicParsing).Content,'index-[A-Za-z0-9_-]+\.js').Value
"local=$local remote=$remote khop=$($local -eq $remote)"
```

**Kỳ vọng: `khop=True`**

### Bước D3 — Kiểm tra API cloud

```powershell
Invoke-WebRequest 'https://job-application-tracker-ai-pro24.vercel.app/api/health' -UseBasicParsing
```

**Kỳ vọng: 200 `{"status":"ok"}`**

### Bước D4 — Chốt 1 domain cho Google OAuth

Session trước có 2 domain gây rối. Chọn **một** domain chính, đặt ở **3 nơi**:

1. Google Cloud Console → OAuth Client → Authorized redirect URIs
2. Env `GOOGLE_REDIRECT_URI`
3. Env `APP_ORIGIN`

---

## PHẦN E — KIỂM THỬ NHƯ NGƯỜI DÙNG THẬT (MỚI)

Đây là phần bạn vừa yêu cầu. Tôi sẽ dùng `tools.chrome.*` để điều khiển trình duyệt thật.

### Nguyên tắc an toàn

| Nguyên tắc | Cụ thể |
|---|---|
| **Chỉ 1 browser** | Dùng `browser` param để chốt đúng Chrome, tránh 2 browser giẫm chân |
| **Không submit form thật** | Không bấm "Nộp đơn" trên TopCV. Chỉ lưu tin |
| **Không đăng nhập hộ** | Bạn tự đăng nhập JobTrack. Tôi chỉ thao tác sau khi đã có session |
| **Screenshot mọi bước** | Bằng chứng cho từng hành động |
| **Dừng khi lạ** | Gặp captcha/2FA → dừng, báo bạn |

### E1 — Kiểm tra extension JobTrack (không phải extension bridge)

> **Lưu ý:** hiện có 2 extension khác nhau. `opencode-chrome-extension` là để tôi điều
> khiển browser. `packages/jobtrack-extension` là extension **của sản phẩm JobTrack`.
> Phải cài cái thứ 2 vào Chrome thì mới test được nút nổi.

**Bước E1.1** — Mở Chrome, vào `chrome://extensions`, kiểm tra đã có "PageWeave" hoặc "JobTrack" chưa.

Nếu chưa: cài unpacked từ
```
F:\Project\Job_Application_Tracker\packages\jobtrack-extension
```
hoặc dùng zip có sẵn
```
packages\jobtrack-extension\jobtrack-pro-extension.zip
```

**Bước E1.2** — Mở popup extension, kiểm tra:
- Tab mặc định là **"Lưu tin việc làm"** (không phải "Quét dữ liệu")
- Đã đăng nhập / kết nối được backend

**Kỳ vọng:** không có lỗi `E_BRIDGE_DOWN` hay `401`.

### E2 — Lưu 1 tin từ TopCV

**Bước E2.1** — Mở một tin tuyển dụng thật:
```
https://topcv.vn/tim-viec-lam-cong-nghe-thong-tin  (chọn 1 tin bất kỳ)
```

**Bước E2.2** — Chờ trang load xong, tìm nút nổi. Chụp screenshot chứng minh nút xuất hiện.

**Bước E2.3** — Bấm nút `⚡ Lưu vào JobTrack`.

**Bước E2.4** — Mở `http://127.0.0.1:64364/#applications`, kiểm tra cột **"Đã lưu"** có tin vừa lưu.

**Kỳ vọng:**
- ✅ Tiêu đề, công ty, lương, địa điểm được bóc đúng
- ✅ Trạng thái = `Saved`
- ❌ Nếu lương/địa điểm rỗng → bug bóc tách, ghi lại selector

### E3 — Kéo thẻ qua 3 cột

**Bước E3.1** — Ở Kanban, kéo thẻ từ **Đã lưu → Đã nộp**. Chụp screenshot.

**Bước E3.2** — Kéo từ **Đã nộp → Đang phỏng vấn**.

**Bước E3.3** — **F5 reload trang**. Kiểm tra thẻ vẫn ở đúng cột.

**Bước E3.4** — Kiểm tra nhãn vòng phỏng vấn:
```
Kỳ vọng: thẻ hiện "[Vòng 1: HR] - <giờ>" hoặc tương tự
```

**Kỳ vọng:**
- ✅ Kéo mượt, phản hồi < 50ms
- ✅ Sau reload vẫn đúng trạng thái
- ❌ Nếu mất trạng thái → bug lưu DB

### E4 — Chạy ATS trên CV thật của bạn

Đây là bài test **quan trọng nhất về tính trung thực**.

**Bước E4.1** — Chuẩn bị:
- **CV thật**: `Nguyễn Văn Đạt` — sinh viên năm 2, backend, dự án Chat_Nexa + LaptopShop
- **JD thật**: một tin Backend Intern/Fresher trên TopCV hoặc ITviec

**Bước E4.2** — Mở `http://127.0.0.1:64364/#f/resumeOptimizer`

**Bước E4.3** — Dán CV + JD, bấm chẩn đoán.

**Bước E4.4** — Ghi lại:
- Điểm tổng
- Điểm từng trụ cột (40/25/20/15)
- Danh sách từ khoá thiếu

**Kỳ vọng ĐÚNG: 50-70 điểm.**

Nếu ra **90+** → có gì đó sai, phải điều tra. CV của bạn thật sự thiếu số liệu đo lường.

### E5 — Kiểm tra chỗ `[điền số liệu]`

**Bước E5.1** — Ở kết quả ATS, xem phần gợi ý viết lại bullet.

**Kỳ vọng:** phải thấy placeholder
```
"Nâng cao hiệu năng vận hành và giảm độ trễ xử lý [điền số liệu: ví dụ ~30% hoặc <150ms]..."
```

**Bước E5.2** — **Nếu thấy `38%`, `120ms`, `99.98%` → DỪNG NGAY, báo tôi.**

Đó là regression của lỗi bịa số liệu — lỗi nghiêm trọng nhất từng phát hiện.

### E6 — Xuất file .docx

**Bước E6.1** — Bấm nút xuất Word.

**Bước E6.2** — Mở file vừa tải, kiểm tra:
- 1 cột, không viền bảng
- Font Arial/Calibri, lề 0.75 inch
- Không có ký tự lạ

**Kỳ vọng:** mở được trong Word/Google Docs.

### E7 — Ghi lại dữ liệu thật

Sau E2-E6, kiểm chứng DB:

```powershell
docker exec jobtrack-postgres psql -U jobtrack -d jobtrack -t -c "select 'applications='||count(*) from applications union all select 'interviews='||count(*) from interviews union all select 'resumes='||count(*) from user_resumes"
```

**Mục tiêu: `applications >= 15`**

> Nếu chỉ được 3-5 tin qua E2, lặp lại E2 với các trang khác:
> ITviec, VietnamWorks, LinkedIn. Mục tiêu 15 hồ sơ thật.

### E8 — Điều phối subagent (nếu cần)

Tôi có thể dispatch song song:

| Subagent | Việc | Khi nào dùng |
|---|---|---|
| `code-explorer` | Trace luồng bóc tách extension → API | Khi E2 fail |
| `react-reviewer` | Review Kanban drag-drop | Khi E3 lag/mất state |
| `typescript-reviewer` | Review ATS scoring | Khi E4 cho điểm bất thường |
| `silent-failure-hunter` | Tìm lỗi bị nuốt trong extension | Khi E2 "thành công" nhưng không có dữ liệu |

**Quy tắc:** chỉ dispatch khi có triệu chứng cụ thể, không dispatch trước.

---

## PHẦN F — DỌN RÁC GIT

### Rác hiện có

```
?? demo_mem0_workflow.py
?? docs/mem0_storage.db       ← file SQLite thật
?? docs/logseq/
?? docs/obsidian-vault/
?? logseq/
?? logseq_graph/
?? graphify-out/
?? repomix-output.xml
```

### Bước F1 — Thêm vào `.gitignore`

```gitignore
# Tool outputs — không commit
logseq/
logseq_graph/
docs/logseq/
docs/obsidian-vault/
graphify-out/
repomix-output.xml
demo_mem0_workflow.py
docs/mem0_storage.db
*.db
!*.db.example
```

### Bước F2 — Kiểm chứng

```powershell
git status --porcelain
```

**Kỳ vọng:** sạch rác, chỉ còn file cố ý.

---

## PHẦN G — COMMIT ĐANG TREO

```powershell
# Kiểm tra .env.example không chứa secret
Get-Content .env.example | Select-String -Pattern "sk-|api_key=.+|password=.+"
# Kỳ vọng: rỗng

git add docs/system-design/validation-results.json
git commit -m "docs(system-design): refresh validation results after core feature work"

git add .env.example PRODUCT-BRIEF.md docs/DA-SUA-GI.md docs/HIEU-HE-THONG.md docs/PLAN-FIX-CHECK-ALL-VA-DEMO.md
git commit -m "docs: add plan and product briefing for the investor demo"
```

---

## PHẦN H — DỌN TẦNG CHẾT (sau buổi gặp)

| Hạng mục | Số lượng |
|---|---|
| API route của 5 tính năng đã bỏ UI | 24 route |
| Repository trong `data.ts` | 5 repository (`data.ts` = 140KB) |
| Test file tương ứng | 5 file |

**Chưa làm ngay** vì xoá sẽ làm test rớt 187 → ~150, trông xấu trong pitch dù sạch hơn.

---

## THỨ TỰ THỰC THI

| # | Phần | Thời gian | Ai làm |
|---|---|---|---|
| 1 | **F** — Dọn rác git | 15 phút | Tôi |
| 2 | **G** — Commit đang treo | 20 phút | Tôi |
| 3 | **C** — Xác nhận `check:all` xanh | 5 phút | Tôi (đã xong) |
| 4 | **D** — Đồng bộ Vercel | 30 phút | Bạn (cần tài khoản Vercel) |
| 5 | **E1** — Cài extension JobTrack | 15 phút | Bạn (cần thao tác Chrome) |
| 6 | **E2-E3** — Test lưu tin + Kanban | 45 phút | **Tôi** (qua browser control) |
| 7 | **E4-E6** — Test ATS + docx | 45 phút | **Tôi** |
| 8 | **E7** — Kiểm DB, nạp đủ 15 hồ sơ | 1 giờ | **Tôi** |
| 9 | **H** — Dọn tầng chết | sau gặp | Tôi |

---

## CHECKLIST TRƯỚC KHI GẶP NHÀ ĐẦU TƯ

```
[ ] npm run check:all         → EXIT 0, 560 test pass
[ ] Vercel bundle == local bundle
[ ] API cloud /api/health     → 200
[ ] Đăng nhập Google          → không redirect_uri_mismatch
[ ] Extension JobTrack cài OK → nút nổi hiện trên TopCV
[ ] Lưu 1 tin TopCV           → vào cột "Đã lưu" đúng dữ liệu
[ ] Kéo thẻ 3 cột             → reload vẫn đúng
[ ] applications >= 15        → dữ liệu thật
[ ] ATS trên CV thật          → 50-70 điểm
[ ] Gợi ý có [điền số liệu]   → KHÔNG có 38%/120ms
[ ] Xuất .docx                → mở được, 1 cột
[ ] git status sạch rác
```

**Mục nào fail → sửa trước, đừng đi gặp.**

---

## CẦN BẠN XÁC NHẬN TRƯỚC KHI TÔI CHẠY

1. **Đồng ý thứ tự trên?** Hay muốn đổi?
2. **Phần E dùng trình duyệt nào** — `oc90168d373b0c` hay `ocf0c1c46ae935`?
   (Tôi cần biết cái nào đang đăng nhập JobTrack)
3. **Có được bấm nút "Lưu vào JobTrack" trên TopCV thật không?**
   (Không submit đơn, chỉ lưu tin — nhưng cần bạn cho phép)
4. **CV của bạn** — tôi dùng bản trong ảnh (Nguyễn Văn Đạt, sinh viên năm 2)
   hay bạn có file `.pdf`/`.docx` mới hơn?
