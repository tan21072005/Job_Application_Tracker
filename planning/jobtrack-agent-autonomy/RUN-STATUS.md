# RUN-STATUS — trạng thái chạy thật của JobTrack (lượt 2026-10-21)

Các bảng runtime bên dưới là snapshot từ lượt ghi e60185a, không phải cam kết PID/trạng thái còn đúng ở mọi phiên. Tài liệu này ghi trạng thái runtime đã **đo tại mốc đó**, kèm cách khởi động và cách dừng. Không chứa credential, không chứa nội dung DB.

## 1. Thành phần đang chạy

| Thành phần | URL | Cổng | PID node | Trạng thái |
| --- | --- | --- | --- | --- |
| Backend API | http://127.0.0.1:64366 | 64366 | 45824 | **LISTENING**, `/api/health` = 200 `{"status":"ok"}` |
| Frontend Web (Vite) | http://127.0.0.1:64364 | 64364 | 42104 | **LISTENING**, `/` = 200, title `JobTrack — Hành trình ứng tuyển` |
| PostgreSQL | 127.0.0.1:5432 | 5432 | 8776 | **LISTENING** (service có sẵn, không do lượt này khởi động) |

> API chạy bằng `node --watch`, nên PID đổi mỗi khi source đổi. Sau khi tích hợp `443b8ac` (bản vá P0 auth), API đã tự restart và probe lại trên instance đang chạy: cross-origin + Bearer sai → **401**, cross-origin + không Bearer → **403**, `/api/ready` → **200 `version:6`**.

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

Không tự kill tiến trình chỉ vì nó đang giữ cổng ứng dụng. Chỉ operator dừng watcher do chính mình khởi chạy, ưu tiên Ctrl+C tại terminal sở hữu. Nếu phải dừng theo PID, xác minh executable/command line/start time/parent và quyền sở hữu run trước; không dùng PID lịch sử trong tài liệu. Không đụng Postgres hoặc tiến trình của phiên khác.

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
| `helper_unknown_error: setup refresh had errors` khi chạy `npm run agents -- doctor` | Có thể chọn CLI PATH cũ thay CLI ứng dụng; kiểm log/probe thực tế | dùng CODEX_CLI_PATH đã xác minh; không mặc định elevated/uninstall; xem SANDBOX-READINESS.md |

## 8. Trạng thái nền tảng agents

Fixture21tests/status[]/doctorFAIL trong audit đầu là lịch sử, không phải hiện trạng sau các commit tiếp theo. Reviewer mới ghi lệnh/kết quả trong AG00-REVIEW.md.

- Controller đã có regression lựa chọn CLI (mốc2d926d9 có23tests); không ép số đếm hiện tại bằng21.
- Doctor với CLI ứng dụng có sandbox.code0, liveWorkersVerified vẫn false. Probe không tương đương live worker acceptance.
- Registry hiện có task auth trùng và task abandoned; không giả định status[] trước cleanup. Sau cleanup task terminal vẫn được giữ trong audit.
- G-A chưa đạt: read isolation, check runner confinement và egress cần triển khai/kiểm chứng.
- Không tự dừng API/web/Postgres trong lượt review; PID cũ chỉ để đối chiếu, không dùng làm lệnh kill.

Xem BASELINE-GAPS, CAPABILITY-INVENTORY, SANDBOX-READINESS và AG00-REVIEW cho trạng thái có phạm vi thời gian rõ.
