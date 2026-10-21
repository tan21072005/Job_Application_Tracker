# Điều phối phát triển JobTrack bằng agents

Đây là bộ quy tắc vận hành dành cho orchestrator và các agents con của dự án. Mỗi task có một feature branch, một Git worktree, phạm vi file riêng và commit cục bộ riêng. Không tự chạy các task mẫu hoặc tự tích hợp nhánh vào nhánh chính.

## Đọc theo thứ tự

1. Đọc `AGENTS.md` tại gốc checkout và các hướng dẫn mà file đó dẫn tới.
2. Đọc [`PROJECT_CONTEXT_MASTER.md`](../../PROJECT_CONTEXT_MASTER.md) để hiểu sản phẩm hiện tại. File bối cảnh có thể chứa thông tin vận hành nhạy cảm: không sao chép nguyên văn vào prompt, log hoặc commit.
3. Đọc [quy tắc vận hành](OPERATING-RULES.md) và [mô hình phát triển](DEVELOPMENT-MODEL.md).
4. Kiểm tra policy và trợ giúp CLI hiện hành trong [`tools/agent-control`](../../tools/agent-control), sau đó chọn một task đã được người dùng yêu cầu.

## Các vai trò

| Vai trò | Trách nhiệm | Quyền ghi |
| --- | --- | --- |
| Orchestrator | Chia yêu cầu thành task có nghiệm thu, xếp dependency, dành lane và worktree, chọn bước tiếp theo | Không tự sửa feature của agent khác |
| Planner | Viết kế hoạch và đề xuất thay đổi theo task | Chỉ trả kết quả có cấu trúc |
| Coder | Đọc checkout, đề xuất nội dung file và hash nguồn | Chỉ trả change JSON qua stdout |
| Reflector | Đọc lỗi kiểm tra, viết hướng sửa có bằng chứng | Chỉ trả kết quả có cấu trúc |
| Reviewer độc lập | Đối chiếu diff, phạm vi, yêu cầu và kết quả kiểm tra | Chỉ trả kết luận có cấu trúc |
| Controller | Kiểm tra proposal, áp dụng patch, chạy check cho phép, tạo commit | Thành phần duy nhất ghi patch trong vòng tự động |
| Người duy trì | Xem commit, quyết định tích hợp, giải quyết hợp đồng chung và phát hành | Nhánh tích hợp và control plane |

## Vòng chạy

`Yêu cầu → Task → Prepare → Planner/Coder → Apply → Check → Reflector nếu lỗi → Reviewer → Commit cục bộ → Người duy trì tích hợp`

CLI controller cung cấp các thao tác `prepare`, `status`, `apply`, `check`, `commit`, `run`. Dùng trợ giúp của phiên bản đang checkout để lấy cú pháp và các điều kiện đầu vào; không tự suy diễn flag. `run` điều phối các subprocess Codex ở chế độ chỉ đọc. Những subprocess này trả đề xuất có cấu trúc, không ghi trực tiếp source, không tự chạy shell tùy ý. Controller mới là nơi kiểm tra lane, hash nền, loại file, secret, comment và bằng chứng check/review trước khi ghi hoặc commit.

Controller ghi trạng thái vòng đời task và audit các thao tác. Lệnh `agent:loop` cũ chuyển sang controller mới; raw runner cũ từ chối chạy trực tiếp, chỉ giữ các export phục vụ kiểm thử. Không dùng raw runner để tránh policy hoặc gate.

Các lệnh ở checkout gốc, đều đi qua RTK:

```powershell
rtk npm run agents -- doctor
rtk npm run agents -- status
rtk npm run agents:test
```

Sau khi có task thật đã được giao:

```powershell
rtk npm run agents -- prepare --task docs/agents/tasks/my-task.json
rtk npm run agents:run -- --task docs/agents/tasks/my-task.json
```

`my-task.json` là file người duy trì tạo cho yêu cầu thật, không phải một task mặc định có sẵn. Muốn chạy nhiều task, dùng `rtk npm run agents -- dispatch --tasks <file-a,file-b> --concurrency 2` sau khi xác nhận lane tách biệt và dependency đã sẵn sàng. Các thao tác thủ công là `apply --id <id> --changes <json>`, `check --id <id>` và `commit --id <id>`. Không tạo tay review receipt: luồng `run` mới tạo review gắn với nội dung đã kiểm tra; `apply/check` riêng lẻ không đủ điều kiện commit.

Tối đa ba lần thử sửa cho một task. Cùng một lỗi lặp lại hai lần thì dừng để điều tra nguyên nhân hoặc trả việc cho orchestrator. Không có push, merge, rebase, triển khai hoặc sửa DB tự động trong vòng này.

## Bắt đầu một task

1. Chọn yêu cầu sản phẩm thật và viết tiêu chí nghiệm thu quan sát được.
2. Sao chép một [task mẫu](tasks/) thành task mới với ID riêng. Các file mẫu không phải backlog đã được duyệt.
3. Chọn lane trong root policy. Kiểm tra không có task đang chạy sở hữu cùng phạm vi.
4. Chuẩn bị worktree và branch riêng; xác nhận trạng thái sạch và baseline commit.
5. Chạy controller, xem kết quả check và reviewer, tạo commit cục bộ cho task đạt tiêu chí.
6. Trả lại SHA, file đổi, kết quả kiểm tra, giới hạn còn lại. Người duy trì mới quyết định tích hợp.

## Giới hạn bảo vệ

README và Git hooks giúp ghi nhớ hoặc chặn nhầm thao tác; chúng không phải ranh giới bảo mật của hệ điều hành và có thể bị bỏ qua. Cơ chế bảo vệ vận hành ở đây dựa vào subprocess chỉ đọc cùng patch broker kiểm soát đường ghi. Agent có shell không giới hạn dưới cùng tài khoản vẫn có thể vượt các quy ước đó. Nếu cần đối phó agent không tin cậy, dùng tài khoản OS hoặc container riêng, giới hạn mạng và bảo vệ Git common directory từ bên ngoài agent.

Các check chạy trong worktree với biến môi trường credential đã loại bỏ, không sao chép dotenv; controller bảo vệ fingerprint lệnh và package manifest. Tuy vậy test có thể thực thi code vừa sửa. Những gate này không phải sandbox dành cho tiến trình thù địch; không đưa secret, dữ liệu hoặc quyền hệ thống vào môi trường kiểm tra.

Không coi test pass cũ là kết quả mới. Không đọc `.env`, file tài khoản, credential store hoặc nội dung DB thật để làm context. Không đưa dự án vệ tinh AutoProfile Vault vào task JobTrack nếu chưa có yêu cầu và quyền truy cập riêng.

Baseline cũ còn có giá trị kết nối PostgreSQL local mặc định trong một số đoạn code. Việc thêm control plane không đồng nghĩa đã loại bỏ mọi cấu hình nhạy cảm hoặc đã đủ điều kiện publish repository. Cần kiểm tra secret và cấu hình riêng trước bất kỳ lần công khai source nào.
