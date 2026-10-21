# RUN-STATUS — trạng thái chạy thật của JobTrack (lượt 2026-10-21)

Tài liệu này ghi trạng thái runtime đã **đo trong phiên này**, kèm cách khởi động và cách dừng. Không chứa credential, không chứa nội dung DB.

## 1. Thành phần đang chạy

| Thành phần | URL | Cổng | PID node | Trạng thái |
| --- | --- | --- | --- | --- |
| Backend API | http://127.0.0.1:64366 | 64366 | 52948 | **LISTENING**, `/api/health` = 200 `{"status":"ok"}` |
| Frontend Web (Vite) | http://127.0.0.1:64364 | 64364 | 42104 | **LISTENING**, `/` = 200, title `JobTrack — Hành trình ứng tuyển` |
| PostgreSQL | 127.0.0.1:5432 | 5432 | 8776 | **LISTENING** (service có sẵn, không do lượt này khởi động) |

Bằng chứng đo được:

```text
GET http://127.0.0.1:64366/api/health -> 200 {"status":"ok"}
GET http://127.0.0.1:64366/api/ready  -> 200 {"status":"ready","version":6}
GET http://127.0.0.1:64364/           -> 200 (trang đăng nhập render trong browser)
GET http://127.0.0.1:64364/api/health -> 200   (đường đi qua proxy Vite → API)
```

`/api/ready` trả `version: 6` ⇒ API kết nối được Postgres và schema hiện tại ở phiên bản 6. **Không cần chạy migration** để dựng app.

## 2. Cách khởi động lại (một lệnh)

```powershell
cd D:\Project\Job_Application_Tracker
.\START-ALL.cmd
```

`START-ALL.cmd` mở 2 cửa sổ cmd (API 64366, Web 64364) rồi mở trình duyệt. Cách chạy tách rời (không dùng `&` trong cùng một cửa sổ, tránh tranh cổng):

```powershell
npm run dev:api    # cổng 64366
npm run dev:web    # cổng 64364
```

Nếu chạy nhiều lần, dùng `npm run dev:web` (có `--strictPort`) để báo lỗi rõ ràng thay vì đổi cổng ngầm.

## 3. Cấu hình đang được dùng

| Mục | Nguồn | Ghi chú |
| --- | --- | --- |
| `DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN` | `apps/api/.env` (đọc bởi `node --env-file-if-exists=.env`) | **không được đọc/ghi ra log hoặc prompt** |
| Cổng API | `PORT` mặc định 64366 (`server.ts:1280`) | |
| Cổng Web | Vite `--port 64364 --strictPort` | |
| Proxy `/api` | `apps/web/vite.config.ts:10` → `http://127.0.0.1:64366` | web không cần cấu hình URL API riêng |

## 4. Thành phần khác của repo (chưa chạy, không bắt buộc cho app chính)

| Thành phần | Lệnh | Cổng | Trạng thái |
| --- | --- | --- | --- |
| 5 experiences | `npm run dev:experiences` | 64363 | chưa chạy — `START-JOBTRACK.cmd` mở riêng; theo D04 chưa nhân đủ tính năng sang 5 bản trong đợt phát hành chính |
| MCP server | `npm run build:mcp` / `npm --prefix packages/jobtrack-mcp run start` | stdio | chưa chạy; C14 còn thiếu bằng chứng tương thích client |
| Extension | load unpacked `packages/jobtrack-extension` | — | chưa nạp trình duyệt; C19 cần test browser thật |

## 5. Dừng an toàn

Chỉ dừng tiến trình **do lượt này tạo**, không kill tiến trình khác:

```powershell
Get-NetTCPConnection -LocalPort 64364,64366 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

Lưu ý: `npm run dev:api` dùng `node --watch`; dừng bằng Ctrl+C trong cửa sổ tương ứng sẽ dừng cả watcher. Không dùng `taskkill` theo hàng loạt và không đụng PID 8776 (Postgres).

## 6. Log phiên này

| Log | Đường dẫn |
| --- | --- |
| API stdout / stderr | `%TEMP%\jt_api_out.log`, `%TEMP%\jt_api_err.log` |
| Web stdout / stderr | `%TEMP%\jt_web_out.log`, `%TEMP%\jt_web_err.log` |

Log được đọc bằng lệnh `Get-Content`, không commit vào repo.

## 7. Xử lý sự cố

| Triệu chứng | Nguyên nhân | Xử lý |
| --- | --- | --- |
| `Port 64364 is already in use` | Vite cũ còn chạy | kiểm tra `netstat -ano -p TCP \| findstr 64364`, dừng đúng PID cũ rồi chạy lại |
| Web báo "Chưa kết nối được máy chủ" | API chưa lên | `npm run dev:api`, kiểm tra `http://127.0.0.1:64366/api/health` |
| API báo `Set DATABASE_URL and a JWT_SECRET of at least 32 characters` | thiếu `apps/api/.env` | khôi phục file env từ nguồn của bạn; **không** tạo mới bằng giá trị yếu và không commit |
| `/api/ready` trả `not_ready` | DB chưa sẵn sàng | kiểm tra service Postgres 5432; không chạy migration từ lane ứng dụng |
| `helper_unknown_error: setup refresh had errors` khi chạy `npm run agents -- doctor` | sandbox Windows của Codex lỗi ở bước setup refresh | xem `BASELINE-GAPS.md` §2.1; cần phiên elevated, **không** nới sandbox |

## 8. Trạng thái nền tảng agents (không liên quan runtime app)

| Hạng mục | Kết quả fresh |
| --- | --- |
| `npm run agents:test` | 21 pass / 0 fail |
| `npm run agents -- status` | `[]` (không task đang chạy) |
| `npm run agents -- doctor` | sandbox FAIL, `liveWorkersVerified: false` |

Chi tiết tại `BASELINE-GAPS.md` và `CAPABILITY-INVENTORY.md`.
