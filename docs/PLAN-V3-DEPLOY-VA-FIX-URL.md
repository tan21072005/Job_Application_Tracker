# PLAN V3 — Deploy Vercel, sửa URL hardcode, kiểm thử bằng browser thật

> Cập nhật: 24/11/2026
> Trạng thái: **CHƯA CODE**. Chờ bạn duyệt.
> Thay thế: `PLAN-V2-FIX-VA-KIEM-THU-THAT.md`

---

## PHẦN A — BẠN ĐÚNG: ảnh chụp là bug thật

Trong ảnh, JobTrack hiển thị:

```json
"url": "http://127.0.0.1:64366/api/mcp"
```

**Đây là hardcode.** Bằng chứng:

`apps/web/src/components/AiGrantsModal.tsx:84`
```ts
const sampleConfig = createdToken
  ? JSON.stringify({
      mcpServers: {
        jobtrack: {
          url: 'http://127.0.0.1:64366/api/mcp',   // ← HARDCODE
          headers: { Authorization: `Bearer ${createdToken.token}` }
        }
      }
    }, null, 2)
  : '';
```

### Tại sao sai

| Vấn đề | Chi tiết |
|---|---|
| **Sai môi trường** | `127.0.0.1` = máy của người xem. Ai copy config này trên máy khác sẽ trỏ về chính máy họ |
| **Sai cổng** | `64366` không mở từ host — API chỉ trong mạng Docker, truy cập qua nginx `64364` |
| **Chết trên production** | Trên Vercel, API nằm ở `/api/mcp` cùng domain, hoặc proxy sang Render |
| **Không nhất quán** | Bạn vừa chụp ảnh từ **Vercel** — nơi URL đúng phải là `https://job-application-tracker-ai-pro24.vercel.app/api/mcp` |

**Hệ quả thực tế:** Nếu nhà đầu tư là dân kỹ thuật, họ copy config này dán vào Claude Desktop → **kết nối thất bại ngay**. Đó là ấn tượng đầu tiên và không thể cứu.

---

## PHẦN B — QUAN TRỌNG: token bạn gửi KHÔNG dùng cho extension

Bạn đưa: `jt_sec_cd3d49465a92482bb3d69139af7a8a96`

Token này được tạo từ **"Quản lý kết nối AI & MCP"** — dùng cho **MCP server** (Claude Desktop, Antigravity, ChatGPT, Codex).

**Không dùng được cho extension.** Bằng chứng từ `packages/jobtrack-extension/popup.js:949`:

```js
const res = await fetch(`${serverConfig.serverUrl}/api/auth/extension/pair`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',          // ← dùng COOKIE, không dùng token
  body: JSON.stringify({ client: 'JobTrack Side Panel' })
});
```

Extension **tự xin token riêng** qua endpoint `/api/auth/extension/pair`, dùng **cookie phiên đăng nhập**. Bạn không cần copy token thủ công.

### Bảng phân biệt

| Token | Sinh từ | Dùng cho | Cách nạp |
|---|---|---|---|
| `jt_sec_...` (MCP) | Cài đặt → Quản lý kết nối AI & MCP | Claude Desktop, Antigravity, ChatGPT | Copy vào config JSON |
| `jt_sec_...` (Extension) | Extension → nút "Kết nối với Web App" | Extension tự dùng | **Tự động**, qua cookie |
| `vcp_...` (Vercel) | vercel.com/account/tokens | Vercel CLI deploy | Biến env `VERCEL_TOKEN` |

Nghĩa là: **bước "sửa serverUrl rồi bấm Ghép nối" sẽ tự sinh token đúng.** Không cần token bạn vừa đưa.

---

## PHẦN C — TÌNH TRẠNG ĐÃ KIỂM CHỨNG

### Extension JobTrack

```
✅ Đã cài        — nút #jobtrack-fab tồn tại trên TopCV
✅ Đã cấu hình  — nhưng serverUrl đang là http://127.0.0.1:64366 (SAI)
❌ Chưa ghép nối — apiToken rỗng
❌ Lỗi khi bấm   — "Failed to fetch" do ERR_CONNECTION_REFUSED
```

**Log thật từ console:**
```
Failed to load resource: net::ERR_CONNECTION_REFUSED (http://127.0.0.1:64366/api/profile)
```

### Deploy

| Nơi | Bundle | Kanban |
|---|---|---|
| Vercel `ai-pro24` | `index-Gz4X7gzl.js` | **7 trạng thái cũ** (có "Sàng lọc") |
| Local `64364` | `index-DgfKEc8y.js` | 5 cột mới |

**Ba tính năng cốt lõi chưa lên production.**

### API cloud

```
GET https://job-application-tracker-ai-pro24.vercel.app/api/health   → 200 {"status":"ok"}
GET .../api/profile                                                  → 401 (đúng, thiếu token)
```

`vercel.json` proxy `/api/*` sang **Render**: `https://jobtrack-api-oodi.onrender.com/api/$1`

### Database

| DB | Dùng bởi | users | applications |
|---|---|---|---|
| Local `jobtrack-postgres` | Docker local | 44 | 0 |
| Cloud (Render/Supabase) | Production | chưa rõ | chưa rõ |

**Cần xác định trước khi nạp dữ liệu thật.**

### Tài khoản

`aiforwork160` đăng nhập trên `ai-pro24.vercel.app`, tab `1298718941`.
Query tham số LSC `doc_id`, `tpl`, `srcId`, `ctypes` khá dày và chồng chéo.
`.env` và `.env.test` có `JWT_SECRET` khác nhau → token không dùng chéo.

---

## PHẦN D — SỬA CÁC LỖI (chỉ sau khi bạn duyệt)

### D1. Fix hardcode URL trong `AiGrantsModal.tsx`

**Hiện tại (dòng 84):**
```ts
url: 'http://127.0.0.1:64366/api/mcp',
```

**Sửa thành:**
```ts
url: `${window.location.origin}/api/mcp`,
```

**Lợi ích:**
- Trên Vercel → `https://ai-pro24.vercel.app/api/mcp` ✅
- Trên localhost → `http://127.0.0.1:64364/api/mcp` ✅ (qua nginx, không phải 64366)
- Không cần cấu hình môi trường

**Rủi ro:** nếu app chạy sau CDN khác domain, `origin` có thể không khớp backend.
→ Kiểm tra: trên Vercel, `/api/mcp` được `vercel.json` proxy sang Render. Như vậy `origin` là **đúng**.

### D2. Sửa `serverUrl` của extension

Hai cách:

**Cách 1 — Qua UI (an toàn, bạn tự làm hoặc tôi làm)**
1. Chuột phải icon PageWeave → **Options**
2. Đổi Server URL thành `https://job-application-tracker-ai-pro24.vercel.app`
3. Lưu → bấm **Kiểm tra kết nối**

**Cách 2 — Tôi làm qua browser** (nếu bạn cho phép)
Mở `chrome-extension://pkodhdgbbdiiakoedediedkfhffailpf/options.html`, sửa, lưu.
> Extension ID bạn vừa cung cấp: `pkodhdgbbdiiakoedediedkfhffailpf`

### D3. Ghép nối extension

Sau D2:
1. Mở popup extension
2. Bấm **"Kết nối với Web App"**
3. Extension sẽ gọi `/api/auth/extension/pair` với cookie → tự lưu `apiToken`

**Điều kiện:** bạn phải đang đăng nhập JobTrack trên cùng trình duyệt (đã có ✅).

**Kỳ vọng:** alert "Ghép nối tài khoản thành công!"

---

## PHẦN E — DEPLOY VERCEL

Bạn đã gửi token `vcp_***REDACTED***`.

### E1. Đặt biến env

```powershell
[Environment]::SetEnvironmentVariable('VERCEL_TOKEN', 'vcp_4s2Z...', 'User')
```

Nếu chạy ngay trong phiên hiện tại:
```powershell
$env:VERCEL_TOKEN = 'vcp_4s2Z...'
```

### E2. Kiểm tra `.env` không lọt git

```powershell
cd F:\Project\Job_Application_Tracker
git check-ignore -v .env
git ls-files .env
```

**Kỳ vọng:** dòng đầu in `.gitignore:N:.env`, dòng thứ hai rỗng.

### E3. Build + deploy

```powershell
npm run build:web
npx vercel --prod
```

**Kỳ vọng:** in ra `Production: https://job-application-tracker-ai-pro24.vercel.app`

### E4. Kiểm chứng bundle

```powershell
[regex]::Match((Invoke-WebRequest 'https://job-application-tracker-ai-pro24.vercel.app/' -UseBasicParsing).Content,'index-[A-Za-z0-9_-]+\.js').Value
```

**Kỳ vọng:** khác `index-Gz4X7gzl.js`.

### ⚠️ Cảnh báo bảo mật

Token `vcp_...` bạn vừa gửi đã **xuất hiện trong hội thoại**. Khuyến nghị:
1. Deploy xong → **revoke token** tại https://vercel.com/account/tokens
2. Tạo token mới nếu cần sau này

Tương tự với `jt_sec_cd3d...` — token đó cũng đã lộ. Revoke ở JobTrack → Cài đặt → Quản lý kết nối AI & MCP.

---

## PHẦN F — KIỂM THỬ BẰNG BROWSER THẬT

Sau khi D + E xong, tôi sẽ dùng `tools.chrome.*` chạy như người dùng thật.

### Browser đã chốt

```
browser: oc90168d373b0c
tab JobTrack: 1298718941   (ai-pro24.vercel.app, user aiforwork160)
```

### F1. Lưu 1 tin TopCV

- Mở tin: `https://www.topcv.vn/viec-lam/ky-su-phan-mem-software-engineer/2362436.html`
- Bấm `#jobtrack-fab`
- Kiểm tra cột **"Đã lưu"** trên Kanban

**Kỳ vọng:** tiêu đề, công ty, lương, địa điểm đúng.

### F2. Kéo thẻ qua các cột

`Đã lưu → Đã nộp → Đang phỏng vấn` → F5 reload → vẫn đúng cột.

### F3. ATS trên CV thật

- CV: `Nguyễn Văn Đạt`, sinh viên năm 2, backend
- JD: tin Backend Intern/Fresher thật
- **Kỳ vọng: 50-70 điểm**, KHÔNG phải 90+

### F4. Kiểm tra placeholder

Phải thấy `[điền số liệu: ví dụ ~30% hoặc <150ms]`
**Nếu thấy `38%` / `120ms` → DỪNG, báo tôi.**

### F5. Xuất .docx

Kiểm tra mở được, 1 cột, lề 0.75 inch.

### F6. Kiểm dữ liệu

Tùy DB nào production dùng, kiểm `applications` tăng.

---

## PHẦN G — DỌN RÁC (song song, không chặn)

### G1. Rác git hiện có

```
?? demo_mem0_workflow.py
?? docs/mem0_storage.db       ← SQLite thật, không nên commit
?? docs/logseq/  logseq/  logseq_graph/
?? docs/obsidian-vault/
?? graphify-out/
?? repomix-output.xml
```

Thêm vào `.gitignore`, commit riêng.

### G2. Commit đang treo

```
M docs/system-design/validation-results.json
?? .env.example
?? PRODUCT-BRIEF.md
?? docs/DA-SUA-GI.md
?? docs/HIEU-HE-THONG.md
```

---

## THỨ TỰ THỰC THI

| # | Việc | Ai | Chặn gì |
|---|---|---|---|
| 1 | **E1-E3** Deploy Vercel | **Tôi** (có token) | Phải xong trước F |
| 2 | **E4** Kiểm bundle | Tôi | — |
| 3 | **D1** Fix hardcode `AiGrantsModal.tsx` | Tôi (code) | Cần commit + deploy lại |
| 4 | **D2** Sửa `serverUrl` extension | Tôi (browser) | Chặn D3 |
| 5 | **D3** Ghép nối | Tôi | Chặn F1 |
| 6 | **F1-F2** Lưu tin + Kanban | Tôi | — |
| 7 | **F3-F5** ATS + docx | Tôi | — |
| 8 | **G1-G2** Dọn rác + commit | Tôi | song song |

**Lưu ý thứ tự:** D1 sửa code → phải deploy lại lần 2. Nên gộp: sửa D1 **trước** rồi deploy 1 lần.

**Thứ tự tối ưu:**

```
1. Fix D1 (code)           ← tôi sửa, chưa commit
2. npm run check:all       ← đảm bảo không vỡ
3. npm run build:web
4. npx vercel --prod       ← deploy 1 lần duy nhất
5. Kiểm bundle E4
6. Commit D1 + G1 + G2
7. D2 + D3 (extension)     ← trên bản cloud mới
8. F1-F5 (kiểm thử thật)
```

---

## CHECKLIST TRƯỚC KHI GẶP NHÀ ĐẦU TƯ

```
[ ] Vercel bundle = local bundle (5 cột, không "Sàng lọc")
[ ] Config MCP hiển thị URL https, không 127.0.0.1:64366
[ ] Extension serverUrl = https://.../ai-pro24.vercel.app
[ ] Extension ghép nối OK
[ ] Lưu 1 tin TopCV → vào cột "Đã lưu"
[ ] Kéo thẻ 3 cột → F5 vẫn đúng
[ ] ATS trên CV thật → 50-70 điểm
[ ] Gợi ý có [điền số liệu], KHÔNG có 38%/120ms
[ ] Xuất .docx mở được
[ ] applications >= 1 (lý tưởng 15)
[ ] Render warm (không ngủ)
[ ] git status sạch rác
[ ] Token đã revoke sau khi deploy
```

---

## CẦN BẠN XÁC NHẬN

1. **Cho tôi sửa `AiGrantsModal.tsx` dòng 84** thành `${window.location.origin}/api/mcp`?
2. **Cho tôi dùng token `vcp_...` để deploy?** (và bạn sẽ revoke sau)
3. **Cho tôi mở `chrome-extension://pkodhdgbbdiiakoedediedkfhffailpf/options.html`** để sửa serverUrl?
4. **Đồng ý thứ tự tối ưu trên** (sửa code → deploy 1 lần → test)?

Sau khi bạn xác nhận, tôi thực thi từ bước 1.
