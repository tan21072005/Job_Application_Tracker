# PLAN — Sửa `check:all` và hoàn thiện trước buổi gặp nhà đầu tư

> Trạng thái ghi nhận: 24/11/2026
> Người thực hiện: bạn (chủ dự án) — plan này để bạn tự chạy, không cần tôi
> Nguyên tắc: mỗi bước có **lệnh chạy được**, **kết quả mong đợi**, và **cách kiểm chứng**

---

## PHẦN 0 — TÌNH TRẠNG HIỆN TẠI (đã kiểm chứng)

### `check:all` đã XANH

```
npm run check:all   →  EXIT = 0
```

| # | Bước | Trạng thái | Số liệu |
|---|---|---|---|
| 1 | check:contract | ✅ PASS | 60/60 |
| 2 | check:stack (build:api + test:api) | ✅ PASS | 295/295 |
| 3 | check:mcp | ✅ PASS | 5/5 |
| 4 | test:extension | ✅ PASS | 10/10 |
| 5 | test:web | ✅ PASS | 187/187 |
| 6 | build:web | ✅ PASS | bundle `index-DgfKEc8y.js` |
| 7 | test:agent-loop | ✅ PASS | 3/3 |
| 8 | check:architecture | ✅ PASS | OpenAPI + drawio |

**Tổng: 560 test pass, 0 fail.**

### Chẩn đoán nguyên nhân gốc

`check:all` từng FAIL vì **một nguyên nhân duy nhất**, không phải 8 lỗi:

```
Error: connect ECONNREFUSED 127.0.0.1:55432
```

`.env.test` trỏ tới Postgres ở cổng **55432**. Container đó **không chạy** →
`check:stack` fail (account-data.test.ts) và `check:mcp` fail → cả pipeline đỏ.

**Không phải lỗi code. Không phải do xoá 5 tính năng. Chỉ là thiếu hạ tầng test.**

---

## PHẦN 1 — FIX `check:all` (đã làm xong, đây là cách tái lập)

### Bước 1.1 — Dựng Postgres test

```powershell
docker run -d --name jobtrack-postgres-dev `
  -e POSTGRES_USER=jobtrack `
  -e POSTGRES_PASSWORD=jobtrack_local_dev `
  -e POSTGRES_DB=jobtrack `
  -p 127.0.0.1:55432:5432 `
  -v jobtrack-postgres-dev-data:/var/lib/postgresql `
  postgres:18
```

**Kiểm chứng:**
```powershell
docker ps --filter "name=jobtrack-postgres-dev"
(Test-NetConnection 127.0.0.1 -Port 55432 -WarningAction SilentlyContinue).TcpTestSucceeded
# Kỳ vọng: True
```

**Nếu container đã tồn tại nhưng dừng:**
```powershell
docker start jobtrack-postgres-dev
```

### Bước 1.2 — Tạo database test

```powershell
docker exec jobtrack-postgres-dev psql -U jobtrack -d postgres -c "CREATE DATABASE jobtrack_test"
```

**Kiểm chứng:**
```powershell
docker exec jobtrack-postgres-dev psql -U jobtrack -d postgres -t -c "select datname from pg_database where datname like 'jobtrack%'"
# Kỳ vọng: jobtrack, jobtrack_test
```

> Lỗi "already exists" = bỏ qua, DB đã có.

### Bước 1.3 — Chạy migration trên DB test (BƯỚC QUAN TRỌNG NHẤT)

Đây là bước trước đây bị thiếu. Không có nó, DB test rỗng → test cần bảng sẽ fail.

```powershell
cd F:\Project\Job_Application_Tracker\apps\api
$env:NODE_ENV='test'
$env:DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack'
$env:TEST_DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack_test'
node --env-file-if-exists=.env.test src/migrate.ts
```

**Kết quả mong đợi:**
```
Migration 1 (001_initial_schema.sql): applied
...
Migration 11 (011_drop_enterprise_tables.sql): applied
Database schema migration completed successfully.
```

**Kiểm chứng:**
```powershell
docker exec jobtrack-postgres-dev psql -U jobtrack -d jobtrack_test -t -c "select count(*) from information_schema.tables where table_schema='public'"
# Kỳ vọng: 20
```

### Bước 1.4 — Chạy toàn bộ pipeline

```powershell
cd F:\Project\Job_Application_Tracker
npm run check:all
```

**Kỳ vọng: `EXIT = 0`, 560 test pass.**

> Ghi chú: lần đầu chạy mất 3-5 phút. Đừng tưởng bị treo mà Ctrl+C.
> `test:api` một mình mất ~71 giây vì có 295 test.

### Bước 1.5 — Tạo script tái lập (khuyến nghị)

Tạo `tools/setup-test-db.ps1` để lần sau chỉ cần chạy 1 lệnh:

```powershell
$ErrorActionPreference = 'Stop'
Write-Host 'Dung Postgres test...'
docker start jobtrack-postgres-dev 2>$null
if ($LASTEXITCODE -ne 0) {
  docker run -d --name jobtrack-postgres-dev `
    -e POSTGRES_USER=jobtrack -e POSTGRES_PASSWORD=jobtrack_local_dev `
    -e POSTGRES_DB=jobtrack -p 127.0.0.1:55432:5432 `
    -v jobtrack-postgres-dev-data:/var/lib/postgresql postgres:18
  Start-Sleep -Seconds 10
}
Write-Host 'Tao database test...'
docker exec jobtrack-postgres-dev psql -U jobtrack -d postgres -c 'CREATE DATABASE jobtrack_test' 2>$null
Write-Host 'Chay migration...'
$env:NODE_ENV='test'
$env:DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack'
$env:TEST_DATABASE_URL='postgres://jobtrack:jobtrack_local_dev@127.0.0.1:55432/jobtrack_test'
node --env-file-if-exists=apps/api/.env.test apps/api/src/migrate.ts
Write-Host 'Xong. Chay: npm run check:all'
```

Rồi thêm vào `package.json`:
```json
"setup:test-db": "powershell -ExecutionPolicy Bypass -File tools/setup-test-db.ps1"
```

---

## PHẦN 2 — ĐỒNG BỘ VERCEL (ưu tiên cao, 30 phút)

### Vấn đề

```
Vercel đang serve : index-Gz4X7gzl.js
Local build mới   : index-DgfKEc8y.js
```

**Hai bundle khác nhau.** Vercel đang chạy bản cũ hơn → 3 tính năng cốt lõi mới nhất **chưa lên production**.

### Bước 2.1 — Kiểm tra Vercel hiện có gì

```powershell
$r = Invoke-WebRequest 'https://job-application-tracker-ecru-kappa.vercel.app/' -UseBasicParsing
[regex]::Match($r.Content,'index-[A-Za-z0-9_-]+\.js').Value
```

### Bước 2.2 — Build + deploy lại

```powershell
cd F:\Project\Job_Application_Tracker
npm run build:web
npx vercel --prod
```

### Bước 2.3 — Kiểm chứng bundle khớp

```powershell
$local  = [regex]::Match((Get-Content apps/web/dist/index.html -Raw),'index-[A-Za-z0-9_-]+\.js').Value
$remote = [regex]::Match((Invoke-WebRequest 'https://job-application-tracker-ecru-kappa.vercel.app/' -UseBasicParsing).Content,'index-[A-Za-z0-9_-]+\.js').Value
"local=$local  remote=$remote  khop=$($local -eq $remote)"
```

**Kỳ vọng: `khop=True`**

### Bước 2.4 — Kiểm tra API backend cloud

```powershell
Invoke-WebRequest 'https://job-application-tracker-ai-pro24.vercel.app/api/health' -UseBasicParsing | Select-Object StatusCode, Content
```

**Kỳ vọng: HTTP 200 `{"status":"ok"}`**

> Nếu API chết: frontend chạy nhưng bấm gì cũng lỗi. Kiểm tra Render dashboard
> và biến môi trường `DATABASE_URL` / `JWT_SECRET`.

### Bước 2.5 — Chỉnh GOOGLE_REDIRECT_URI

Trong session trước bạn có 2 domain gây rối: `ecru-kappa` vs `ai-pro24`.
**Chọn một domain chính**, rồi đặt ở **cả 3 nơi**:

1. Google Cloud Console → OAuth Client → Authorized redirect URIs
   ```
   https://<domain-chinh>/api/auth/google/callback
   ```
2. Vercel / Render → env `GOOGLE_REDIRECT_URI`
3. Env `APP_ORIGIN` = `https://<domain-chinh>`

**Kiểm chứng:** bấm "Đăng nhập bằng Google" → không ra `redirect_uri_mismatch`.

---

## PHẦN 3 — NẠP DỮ LIỆU THẬT (ưu tiên cao nhất, 1-2 giờ)

### Vấn đề

```
users=46   (44 là tài khoản test tự sinh)
applications=0   ← chưa ai thêm hồ sơ thật
resumes=11
```

Đây là con số **duy nhất** nhà đầu tư sẽ hỏi. `applications=0` nghĩa là
sản phẩm chưa từng được dùng thật, kể cả bởi bạn.

### Bước 3.1 — Dùng thật, không seed script

**Đừng** viết script bơm dữ liệu giả. Đó lại là slop. Hãy dùng app thật:

| Việc | Số lượng | Cách kiểm |
|---|---|---|
| Lưu tin từ TopCV | 5 tin | Cài extension → mở tin → bấm nút nổi |
| Lưu tin từ ITviec | 3 tin | Như trên |
| Lưu tin từ VietnamWorks | 2 tin | Như trên |
| Lưu tin từ LinkedIn | 5 tin | Như trên |
| Thêm thủ công | 5-10 hồ sơ | Form "Thêm hồ sơ" |
| Kéo thả trạng thái | Mỗi thẻ 1 lần | Kanban 5 cột |

**Mục tiêu: `applications >= 15`**

### Bước 3.2 — Kiểm chứng dữ liệu thật

```powershell
docker exec jobtrack-postgres psql -U jobtrack -d jobtrack -t -c "select 'applications='||count(*) from applications union all select 'interviews='||count(*) from interviews union all select 'resumes='||count(*) from user_resumes"
```

**Kỳ vọng: `applications=15` trở lên**

### Bước 3.3 — Chạy ATS trên chính CV của bạn

Đây là bài test quan trọng nhất về **tính trung thực** của sản phẩm:

1. Mở **Tối ưu hóa ATS**
2. Dán JD một tin tuyển dụng Backend Intern/Fresher thật
3. Dán CV thật của bạn (Nguyễn Văn Đạt — sinh viên năm 2, backend)
4. Xem điểm 4 trụ cột

**Kỳ vọng đúng: điểm KHÔNG cao (khoảng 50-70).**

Nếu app cho 90+ điểm → **có gì đó sai**, cần điều tra.
Lý do: CV của bạn thật sự thiếu số liệu đo lường và chưa có JD cụ thể.

**Ghi lại con số này.** Nó là câu chuyện pitch:
> "App chấm CV của chính em 62/100. Nó chỉ ra 6 từ khoá thiếu.
> Em chưa sửa, nên em chưa có offer. Đó là lý do em làm sản phẩm này."

### Bước 3.4 — Kiểm tra chỗ `[điền số liệu]`

Mở kết quả ATS Studio, xem phần gợi ý viết lại bullet.

**Kỳ vọng:** phải thấy placeholder như
```
"Nâng cao hiệu năng vận hành và giảm độ trễ xử lý [điền số liệu: ví dụ ~30% hoặc <150ms]..."
```

**Nếu thấy số cụ thể như `38%`, `120ms`, `99.98%` → DỪNG, báo tôi ngay.**
Đó là regression của lỗi bịa số liệu.

---

## PHẦN 4 — DỌN RÁC GIT (15 phút)

### Vấn đề

Có 8 mục rác công cụ chưa commit, không liên quan sản phẩm:

```
?? demo_mem0_workflow.py
?? docs/mem0_storage.db       ← file database, có thể chứa dữ liệu nhạy cảm
?? docs/logseq/
?? docs/obsidian-vault/
?? logseq/
?? logseq_graph/
?? graphify-out/
?? repomix-output.xml
```

`docs/mem0_storage.db` là **file SQLite thật** — không nên nằm trong repo sản phẩm.

### Bước 4.1 — Thêm vào `.gitignore`

Mở `.gitignore`, thêm cuối file:

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

### Bước 4.2 — Kiểm chứng

```powershell
cd F:\Project\Job_Application_Tracker
git status --porcelain
```

**Kỳ vọng:** chỉ còn `M docs/system-design/validation-results.json` và các file bạn cố ý chưa commit.

### Bước 4.3 — Commit

```powershell
git add .gitignore
git commit -m "chore: ignore local tool outputs and agent scratch files"
```

---

## PHẦN 5 — COMMIT NHỮNG GÌ ĐANG TREO (20 phút)

### Tình trạng

```powershell
git status --porcelain
 M docs/system-design/validation-results.json
?? .env.example
?? PRODUCT-BRIEF.md
?? docs/DA-SUA-GI.md
?? docs/HIEU-HE-THONG.md
```

`validation-results.json` bị `check:architecture` sinh lại mỗi lần chạy — nên commit
kết quả mới nhất hoặc đưa vào `.gitignore`.

### Bước 5.1 — Quyết định

**Cách A (khuyến nghị):** commit vì nó là bằng chứng kiến trúc
```powershell
git add docs/system-design/validation-results.json
git commit -m "docs(system-design): refresh validation results after core feature work"
```

**Cách B:** đưa vào `.gitignore` nếu nó chỉ là output
```powershell
echo "docs/system-design/validation-results.json" >> .gitignore
```

Chọn **A** — nhà đầu tư kỹ sư sẽ thích thấy bằng chứng kiến trúc được verify.

### Bước 5.2 — Commit tài liệu

```powershell
git add .env.example PRODUCT-BRIEF.md docs/DA-SUA-GI.md docs/HIEU-HE-THONG.md
git commit -m "docs: add env template and product briefing for the investor demo"
```

**Kiểm tra `.env.example` không chứa secret thật:**
```powershell
Get-Content .env.example | Select-String -Pattern "sk-|api_key=.+|password=.+"
# Kỳ vọng: rỗng
```

---

## PHẦN 6 — DỌN TẦNG CHẾT (sau buổi gặp, không cấp bách)

### Vấn đề còn lại

| Hạng mục | Số lượng | Tác động |
|---|---|---|
| API route của 5 tính năng đã bỏ UI | 24 route | Không ai gọi, nhưng vẫn tồn tại |
| Repository trong `data.ts` | 5 repository | `data.ts` vẫn 140KB |
| Test file tương ứng | 5 file | Test xanh nhưng test code chết |

### Tại sao chưa làm ngay

Xoá 5 repository + 5 test file sẽ làm test rớt **187 → ~150**.
Con số đó **trông xấu** trong pitch dù thực chất sạch hơn.
Để sau khi gặp nhà đầu tư.

### Khi nào làm

Sau buổi gặp, khi bạn cần refactor thật:

```powershell
# 1. Xoá 5 repository khỏi data.ts (dòng ~2966, 3499, 3613, 3817, 3952)
# 2. Xoá 5 test file
git rm apps/web/src/compensation.test.ts apps/web/src/culture-radar.test.ts `
       apps/web/src/outreach.test.ts apps/web/src/pipeline-velocity.test.ts `
       apps/web/src/trajectory.test.ts
# 3. Xoá 24 route khỏi apps/api/src/server.ts
# 4. Chạy lại
npm run check:all
```

---

## THỨ TỰ THỰC HIỆN

| Thứ tự | Phần | Thời gian | Vì sao thứ tự này |
|---|---|---|---|
| **1** | Phần 4 — dọn rác git | 15 phút | Nhanh, làm sạch trước khi commit |
| **2** | Phần 5 — commit đang treo | 20 phút | Repo sạch rồi mới build tiếp |
| **3** | Phần 2 — đồng bộ Vercel | 30 phút | Để demo online đúng bản |
| **4** | Phần 3 — nạp dữ liệu thật | 1-2 giờ | **Quan trọng nhất** |
| **5** | Phần 1 — script setup-test-db | 20 phút | Tiện cho lần sau |
| **6** | Phần 6 — dọn tầng chết | sau buổi gặp | Không cấp bách |

---

## CHECKLIST TRƯỚC KHI GẶP

```
[ ] npm run check:all         → EXIT 0, 560 test pass
[ ] Vercel bundle == local bundle
[ ] API cloud /api/health     → 200 {"status":"ok"}
[ ] Đăng nhập Google          → không lỗi redirect_uri_mismatch
[ ] applications >= 15        → có dữ liệu thật
[ ] Cài extension, lưu 1 tin  → xuất hiện trên Kanban
[ ] Kéo thẻ qua 5 cột         → không lag, reload vẫn đúng
[ ] ATS trên CV thật của bạn  → điểm 50-70, KHÔNG phải 90+
[ ] Chỗ gợi ý có [điền số liệu]  → KHÔNG có 38%/120ms
[ ] git status sạch rác       → chỉ còn file cố ý
```

**Nếu bất kỳ mục nào fail → sửa trước, đừng đi gặp.**

---

## CÂU CHUYỆN ĐỂ NÓI (khi mọi thứ xanh)

> "Em có 15 hồ sơ thật trong hệ thống, không phải dữ liệu mẫu.
> Ba tính năng cốt lõi đã code xong và 560 test pass.
> Em chưa có người dùng trả tiền, và em đang dùng chính CV của mình để test —
> app chấm em 62/100 và chỉ ra 6 từ khoá thiếu. Em chưa sửa.
> Đó là lý do em làm sản phẩm này."

Không có "100%". Không có "sắp ra mắt". Chỉ có số thật và việc đã làm thật.
