# Vòng điều phối agent cho JobTrack

Quy trình này áp dụng mẫu Planner → Coding agent → test/build → Reflector → Reviewer cho từng việc trong [PROJECT-PLAN.md](../../PROJECT-PLAN.md). Mỗi role chạy bằng Codex CLI trong cùng workspace. Runner ghi prompt, phản hồi, log kiểm tra và file nguồn đã thay đổi vào `output/agent-runs/<task-id>-<thời gian>/run.json`. Nó không chạy nền; một lần gọi xử lý đúng một task.

## Số vòng

Tối đa **3 lượt Coding agent cho một task**: lượt đầu và tối đa hai lượt sửa. Khi test/build lỗi, Reflector đọc lỗi và viết prompt sửa; nếu hai lượt liên tiếp có cùng dấu hiệu lỗi, dừng sớm. Khi test/build đạt, Reviewer đối chiếu lại yêu cầu gốc. Nếu Reviewer chỉ ra phần thiếu, Planner viết prompt kế tiếp trong ngân sách lượt còn lại. Hết lượt, lỗi công cụ hoặc review không hợp lệ đều dừng và báo trạng thái `blocked-*`; không tự chuyển sang task khác hay ghi thành công giả.

`3` là giới hạn lượt **sửa code**, không phải ba lần chạy toàn bộ pipeline; một lượt đạt có thể kết thúc ngay sau Review. Tăng số lượt chỉ bằng một quyết định rõ ràng cho task mới, không tự nới giới hạn vì test khó.

## Chuẩn bị task

Sao chép [task.example.json](task.example.json) thành một file JSON trong workspace rồi sửa `id`, `objective`, `acceptance`, `references` và `checks`. Runner chỉ chạy các check đã định sẵn: `test:web`, `build:web`, `test:experiences`, `build:experiences`, `check:architecture`. Prompt do agent viết không được thêm hoặc bỏ check. Chọn bộ check đủ bao phủ các file mà task có thể đổi.

```powershell
rtk proxy npm run test:agent-loop
rtk proxy npm run agent:loop -- --validate --task tools/agent-loop/task.example.json
rtk proxy npm run agent:loop -- --task tools/agent-loop/task.example.json
```

Lệnh cuối **thật sự gọi Codex CLI và có thể sửa code**, nên chạy sau khi mục tiêu/acceptance của task đã chốt. Runner kiểm tra trạng thái đăng nhập trước khi tạo run; khi CLI chưa đăng nhập, chạy `rtk proxy codex login` trong terminal rồi chạy lại. Việc Codex Desktop đang hoạt động không tự chứng minh Codex CLI có phiên đăng nhập. Planner, Reflector và Reviewer dùng sandbox chỉ đọc; Coding agent dùng `workspace-write`, không có lệnh vượt sandbox. Toàn bộ lệnh shell bên trong runner đi qua `rtk proxy`. Mỗi agent có timeout 10 phút, mỗi check có timeout 3 phút. Runner không nhận lệnh shell từ phản hồi AI. Trong chat hiện tại cũng có thể điều phối cùng bốn vai trò bằng subagents mà không cần CLI runner.

## Bằng chứng và điều kiện hoàn thành

Mỗi lượt lưu `*.prompt.md`, `*.response.json`, `*.log`, tên check, exit code, lỗi trích ngắn, dấu lỗi và danh sách file nguồn thay đổi. Trạng thái cuối trong `run.json` chỉ là `complete` khi **mọi check đạt và Reviewer trả `pass`**. `blocked-stalled` nghĩa là hai lượt liên tiếp cho cùng dấu hiệu lỗi; `blocked-limit` là hết ba lượt; `blocked-tool` là role hoặc công cụ không chạy được. Người phụ trách đọc log trước khi quyết định task kế tiếp.

Danh sách file thay đổi tính bằng hash trước/sau với mã nguồn và tài liệu dưới workspace, bỏ qua dependency, ảnh, output và repo tham khảo. Đây là bằng chứng thay đổi trong một lần chạy, không thay thế Git diff khi dự án chưa có `.git`. Kết quả kiểm tra mô phỏng API/UI vẫn phải được mô tả đúng là mô phỏng; không đủ chứng nhận PostgreSQL hay auth production.

Với việc liên quan UI, bổ sung screenshot/kiểm tra bàn phím/mobile vào acceptance và gói review; check CLI mặc định chỉ chạy các lệnh trong `checks`. Với backend, dùng PostgreSQL thật theo cổng nghiệm thu của [IMPLEMENTATION-PLAN.md](../../docs/system-design/IMPLEMENTATION-PLAN.md) trước khi gọi hoàn tất.
