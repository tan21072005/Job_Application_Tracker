# JobTrack AI Operations & Integration Runbook

Tài liệu hướng dẫn vận hành, cấu hình kết nối AI/MCP và xử lý sự cố cho hệ thống **JobTrack AI**.

---

## 1. Tổng quan Kiến trúc

JobTrack AI mở rộng nền tảng JobTrack (T01–T10) với các tính năng:
1. **Model Context Protocol (MCP) Server**: Cho phép các trợ lý AI hàng đầu (Claude Desktop, Google Antigravity, ChatGPT, Codex/Cursor) điều khiển trực tiếp hệ thống với quyền **Full Control**.
2. **AI Chatbot Widget (Web SPA)**: Tích hợp trực tiếp trên giao diện web, kết nối qua BFF proxy cùng origin (`/api/ai/chat`) đến workflow n8n hoặc grounded local intelligence.
3. **Safe-Fetch URL Importer**: Tự động bóc tách tin tuyển dụng từ liên kết với bảo mật chống tấn công SSRF đa lớp.
4. **Real-time Live Sync (SSE)**: Đồng bộ tức thì giao diện Web khi AI/MCP thực hiện các thay đổi dữ liệu (`GET /api/events`).
5. **30-day Trash & Undo**: Thùng rác lưu trữ 30 ngày cho các thao tác xóa với khả năng khôi phục tức thì.

```text
[ AI Assistants ]                  [ Web SPA (React 19) ]
Claude / Antigravity / ChatGPT               │
        │ (MCP Streamable HTTP / Stdio)      │ (SSE + REST + Chat)
        ▼                                    ▼
┌────────────────────────────────────────────────────────┐
│                   JobTrack API (BFF)                   │
│   /api/mcp   /api/ai/chat   /api/ai/import-url         │
│   /api/events (SSE)         /api/ai/grants             │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [ PostgreSQL DB ]         [ n8n Instance ]
       jobtrack / 003_ai          Workflow Agent
```

---

## 2. Hướng dẫn Cấu hình MCP Client

### 2.1. Lấy Token Quyền Truy cập (AI Grant Token)
1. Đăng nhập vào JobTrack Web (`http://127.0.0.1:64364`).
2. Nhấp vào tài khoản cá nhân ở góc dưới sidebar hoặc topbar.
3. Chọn **"Kết nối AI & MCP"**.
4. Chọn loại trợ lý AI (VD: Claude Desktop, Antigravity) và bấm **"Tạo Token"**.
5. Sao chép chuỗi token có định dạng `jt_sec_...` (Token chỉ hiển thị 1 lần).

---

### 2.2. Cấu hình Claude Desktop

Chỉnh sửa tệp cấu hình Claude Desktop:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Cách 1: Kết nối qua HTTP Streamable (Khuyến nghị)
```json
{
  "mcpServers": {
    "jobtrack": {
      "url": "http://127.0.0.1:64366/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_AI_GRANT_TOKEN>"
      }
    }
  }
}
```

#### Cách 2: Kết nối qua Stdio Adapter
```json
{
  "mcpServers": {
    "jobtrack": {
      "command": "node",
      "args": ["D:\\Project\\Job_Application_Tracker\\packages\\jobtrack-mcp\\bin\\jobtrack-mcp.mjs"],
      "env": {
        "JOBTRACK_API_URL": "http://127.0.0.1:64366",
        "JOBTRACK_TOKEN": "<YOUR_AI_GRANT_TOKEN>"
      }
    }
  }
}
```

---

### 2.3. Cấu hình Google Antigravity

Trong Antigravity MCP Settings hoặc cấu hình `mcp_servers`:
```json
{
  "mcpServers": {
    "jobtrack": {
      "url": "http://127.0.0.1:64366/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_AI_GRANT_TOKEN>"
      }
    }
  }
}
```

---

### 2.4. Cấu hình Cursor / Codex IDE

Vào **Settings -> Features -> MCP -> Add new MCP server**:
- **Name**: `jobtrack`
- **Type**: `command` (hoặc `http`)
- **Command**: `node D:/Project/Job_Application_Tracker/packages/jobtrack-mcp/bin/jobtrack-mcp.mjs`
- **Env**:
  - `JOBTRACK_API_URL`: `http://127.0.0.1:64366`
  - `JOBTRACK_TOKEN`: `<YOUR_AI_GRANT_TOKEN>`

---

## 3. Danh mục Công cụ MCP (Tool Catalog)

Tất cả công cụ đều hỗ trợ Full Control và trả về định dạng chuẩn:

| Tên Công Cụ | Chức Năng | Tham Số Chính |
|---|---|---|
| `list_applications` | Liệt kê danh sách hồ sơ với bộ lọc, sắp xếp, tìm kiếm và thùng rác | `q`, `status`, `sort`, `includeDeleted` |
| `get_application` | Lấy chi tiết một hồ sơ kèm các vòng phỏng vấn | `id` |
| `create_application` | Tạo hồ sơ mới, chống trùng lặp chủ động | `company`, `position`, `status`, `url`, `salary`, `deadline` |
| `update_application` | Cập nhật hồ sơ với kiểm soát phiên bản (ETag/version) | `id`, `company`, `position`, `status`, `notes`, `expectedVersion` |
| `delete_application` | Xóa hồ sơ (mặc định chuyển vào Thùng rác 30 ngày) | `id`, `purge` (vĩnh viễn nếu `true`) |
| `restore_application`| Khôi phục hồ sơ từ thùng rác | `id` |
| `schedule_interview` | Xếp lịch phỏng vấn mới cho hồ sơ | `applicationId`, `title`, `scheduledAt`, `format`, `location` |
| `update_interview`   | Cập nhật vòng phỏng vấn (dời lịch, trạng thái) | `interviewId`, `title`, `scheduledAt`, `status`, `notes` |
| `delete_interview`   | Xóa vòng phỏng vấn | `interviewId` |
| `get_dashboard_summary` | Tóm tắt các chỉ số (tổng số, phỏng vấn sắp tới, offer) | Không có |
| `get_candidate_profile` | Lấy hồ sơ ứng viên (Họ tên, email, sđt, link CV, portfolio, bio, kỹ năng) phục vụ hỗ trợ điền đơn | Không có |
| `list_job_subscriptions`| Liệt kê các bộ lọc tìm kiếm việc làm định kỳ của người dùng | Không có |

---

## 4. Hệ thống Thu thập Dữ liệu Đa nguồn & Điền Đơn Tự Động (5 Giai đoạn)

### 4.1. Giai đoạn 1 & 2: Headless Browser & Hybrid AI Extractor
- Tích hợp `playwright-core` tự động nhận diện Chrome/Edge có sẵn trên máy người dùng (`C:\Program Files\Google\Chrome\Application\chrome.exe`, `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- Cơ chế 2 tầng:
  - **Tầng 1 (Fast)**: HTTP fetch tĩnh nhẹ với stream parser.
  - **Tầng 2 (Deep)**: Playwright headless chờ DOM tải xong (`networkidle`) khi trang render bằng React, Angular, hoặc Vue.
- Bộ lọc Readability bóc tách nội dung thuần, lọc sạch thanh menu, banner quảng cáo.
- Cơ chế bảo vệ chống Prompt Injection: vô hiệu hóa các chỉ thị ẩn nguy hiểm trong nội dung JD.

### 4.2. Giai đoạn 3: Chrome / Edge Extension (JobTrack Web Clipper)
- Mã nguồn tại: `packages/jobtrack-extension` (Manifest V3).
- Cài đặt vào trình duyệt:
  1. Mở `chrome://extensions/` hoặc `edge://extensions/`.
  2. Bật **Developer mode**.
  3. Chọn **Load unpacked** -> dẫn đến thư mục `packages/jobtrack-extension`.
  4. Mở Options nhập Server `http://127.0.0.1:64366` và Token AI Grant (`jt_sec_...`).
- Tính năng 1-click cào tin từ bất kỳ website nào (kể cả LinkedIn sau đăng nhập, TopCV, ITviec, Facebook) và đồng bộ tức thời qua MCP `create_application`.

### 4.3. Giai đoạn 4: Bộ Cào Tin Định Kỳ (Batch Job Alert Crawler)
- Bảng cơ sở dữ liệu: `job_subscriptions` (Migration 004).
- Dịch vụ: `apps/api/src/services/subscription-crawler.ts`.
- Thuật toán khử trùng lặp (Deduplication): chuẩn hóa URL loại bỏ các tham số tracking (`utm_*`, `fbclid`, `ref`), kiểm tra chéo theo URL hoặc bộ đôi `(công ty + vị trí)`.
- Tự động lưu các tin phù hợp vào trạng thái `Saved` và phát tín hiệu đồng bộ SSE thời gian thực.
- API endpoints: `GET/POST /api/subscriptions`, `DELETE /api/subscriptions/:id`, `POST /api/subscriptions/:id/run`.

### 4.4. Giai đoạn 5: Trợ Lý Tự Động Điền CV (Assisted Auto-Apply)
- Bảng cơ sở dữ liệu: `candidate_profiles` (Migration 004).
- Dịch vụ: `apps/api/src/services/candidate-profile.ts`.
- Quản lý thông tin ứng viên qua `GET /api/profile` và `PUT /api/profile`.
- Tiện ích mở rộng tự động nhận diện các trường input trên form (họ tên, email, điện thoại, link CV, portfolio, giới thiệu) và kích hoạt nút `⚡ Điền form với JobTrack`.
- **Nguyên tắc An toàn & Minh bạch (Human-In-The-Loop)**: Hệ thống chỉ tự động điền sẵn các trường và hiển thị thông báo yêu cầu người dùng tự tay kiểm tra lại rồi bấm Submit, tuyệt đối không tự ý nộp hồ sơ mà không có sự kiểm tra của con người.

---

## 5. Vận hành & Bảo mật

### 5.1. Kill Switch & Thu hồi Quyền (Revocation)
- Khi phát hiện nghi vấn rò rỉ token hoặc muốn ngắt kết nối trợ lý AI ngay lập tức:
  1. Mở modal **"Kết nối AI & MCP"** trên giao diện web.
  2. Bấm **"Thu hồi"** tại client tương ứng.
  3. Mọi request tiếp theo mang token đó sẽ bị từ chối với mã lỗi `401 Unauthorized` ngay lập tức tại database layer.

### 5.2. Bảo vệ Anti-SSRF khi Nhập Tin Tuyển Dụng
- Safe Fetch Worker chặn toàn bộ dải IP nội bộ, loopback (`127.0.0.1`, `localhost`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
- Chỉ chấp nhận giao thức `http:` và `https:`.
- Giới hạn payload 5MB và timeout tối đa 15 giây.

### 5.3. Sao lưu và Phục hồi Dữ liệu
```powershell
# Tạo bản sao lưu toàn diện database (bao gồm migration 003_ai và 004_subscriptions)
rtk npm run db:backup

# Kiểm tra trạng thái và lịch sao lưu
rtk npm run db:backup:status

# Chạy diễn tập khôi phục (Rollback Drill)
rtk npm run db:rollback-drill
```

---

## 6. Quy trình Kiểm định Toàn diện (Health Check)

Chạy bộ kiểm tra chuẩn:
```powershell
# Chạy toàn bộ kiểm thử hợp đồng, stack, mcp, web, agent-loop và architecture
rtk npm run check:all
```
Kết quả kỳ vọng: **100% Pass** trên tất cả các module.
