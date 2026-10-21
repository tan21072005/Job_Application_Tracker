# Quy tắc vận hành agents

## Phạm vi và quyền sở hữu

Root policy trong `tools/agent-control` là nguồn máy đọc được về lane và lệnh cho phép. Tài liệu này mô tả ý định; khi có khác biệt, dừng task để người duy trì sửa policy hoặc tài liệu, không tự mở rộng quyền.

Mỗi task có ID chữ thường dạng kebab-case, một feature, branch và worktree riêng. Chỉ một task đang chạy được sở hữu một phạm vi ghi. Các lane web, API, extension, MCP phải có tập đường dẫn ghi tách biệt. Mã hợp đồng dùng chung thuộc lane contracts; tài liệu và control plane thuộc người duy trì. Không cho agent web sửa contract, API sửa MCP hoặc extension sửa cấu hình root chỉ để làm check pass.

Nếu feature đi qua nhiều lớp, orchestrator chia thành task có dependency: contract trước, API/MCP/extension/web sau theo hợp đồng đã chốt. Thay đổi ngoài lane được ghi thành yêu cầu bàn giao, không lén đưa vào patch. Các task phụ thuộc dùng baseline đã tích hợp hoặc ref được người duy trì xác nhận, không đọc nhánh khác rồi giả định file đó đã nằm trong checkout của mình.

## Proposal và patch broker

Planner/Coder/Reflector/Reviewer chạy chỉ đọc. Coder trả change JSON theo schema của controller qua stdout, gồm đường dẫn và nội dung đề xuất cùng hash nền khi schema yêu cầu. Không dùng stdout làm bản ghi hội thoại lẫn với JSON.

Controller xác minh đường dẫn nằm trong worktree và lane; từ chối đường dẫn thoát thư mục, secret, file bị bảo vệ, nội dung không hợp lệ và sửa trên hash đã cũ. Hash cũ yêu cầu đọc lại và lập proposal mới; không ghi đè thay đổi mới. Controller là thành phần duy nhất áp dụng patch của vòng tự động. Không sửa file policy để tự cấp quyền.

Code mới không thêm comment, kể cả comment giải thích inline, block, HTML hoặc SQL. Dùng tên rõ nghĩa và hàm nhỏ; giải thích quyết định trong tài liệu. Không xóa thông báo bản quyền hoặc header giấy phép có sẵn để vượt kiểm tra. Nếu thư viện hoặc định dạng bắt buộc có header, trả việc cho người duy trì xử lý ngoại lệ cụ thể; không tắt kiểm tra toàn cục.

## Kiểm tra, phản hồi và review

Task phải có acceptance và checks trước khi chạy. Chỉ chạy check có trong allowlist, trên checkout đúng baseline và với timeout. Không thực thi chuỗi shell do mô hình tự tạo. Không suy ra một task đã đạt chỉ vì build thành công.

Checks trong các file mẫu chỉ là ví dụ không ghi dữ liệu vận hành. Người duy trì phải chọn thêm kiểm thử hành vi phù hợp với task thật và môi trường test cách ly trước khi duyệt task. Không coi `check:contract` thay cho kiểm thử MCP, hoặc `build:api` thay cho kiểm thử endpoint; chỉ được chạy khi check tương ứng đã có trong policy và môi trường đủ điều kiện.

Một lần thử bao gồm proposal, áp dụng và kiểm tra. Giới hạn ba lần thử sửa cho mỗi task; cùng chữ ký lỗi xuất hiện hai lần thì dừng. Reflector phải dựa trên lỗi thật: tên check, lỗi đã rút gọn, diff liên quan và tiêu chí thất bại. Không tự tăng giới hạn hoặc đổi mục tiêu để che lỗi.

Reviewer phải độc lập với Coder và đọc diff cuối cùng. Kết quả review và check phải gắn với cùng nội dung được commit. Nếu patch đổi sau khi check hoặc review, bằng chứng cũ mất hiệu lực và phải chạy lại các gate liên quan. Check không chạy, timeout, thiếu dependency hoặc thiếu môi trường đều là trạng thái chưa xác minh, không phải pass.

## Git và tích hợp

Trước prepare: xác minh repository, branch, baseline commit, worktree và trạng thái sạch. Không dùng Git global configuration hoặc đổi quyền filesystem để né lỗi quyền truy cập. Mỗi task chỉ stage file thuộc task và tạo commit cục bộ sau khi gate đạt; không dùng `git add .` để gom file không liên quan.

Không tự push, merge, rebase, sửa lịch sử, force push, reset hard, clean hoặc xóa branch/worktree. Controller không cấp các thao tác đó cho Coder. Người duy trì kiểm tra từng commit và tích hợp theo dependency. Nếu xung đột, tạo task tích hợp được chỉ định thay vì cho hai agents cùng sửa một vùng code. Phát hành là quyết định riêng sau kiểm tra liên lane, nghiệm thu và kế hoạch phục hồi.

Không tự bật scheduler hay cho agents chạy vô hạn. Một yêu cầu chạy task không đồng nghĩa với cấp quyền triển khai, mua dịch vụ, sử dụng API trả phí không giới hạn hoặc thay đổi workflow đang hoạt động.

## Dữ liệu, secret và tiến trình

Không đọc hoặc ghi `.env`, file tài khoản, token, mật khẩu, khóa API, khóa mã hóa hoặc thư mục credential trong vòng agent. Không sao chép file bối cảnh có secret vào prompt đầy đủ. Log phải được rút gọn và che dữ liệu trước khi đưa cho Reflector/Reviewer.

Không chạy migration, account generator, restore, delete dữ liệu hoặc test dùng DB thật từ lane feature. Test DB phải được nhận diện riêng và không trùng DB vận hành; thiếu môi trường riêng thì báo blocked. Không dùng “local” làm bằng chứng rằng dữ liệu được phép xóa. Schema đã áp dụng không được sửa lại; đề xuất migration mới qua lane được người duy trì giao.

API và web đang dùng cổng 64366 và 64364. Không giết tiến trình chiếm cổng hoặc dùng lại cổng này để chạy server worktree. Ưu tiên check không mở server. Khi thật sự cần runtime riêng, cấp cổng, DB và thư mục output riêng cho từng task, rồi chỉ dọn tiến trình do task đó tạo và đã ghi nhận PID.

## Bàn giao và dừng

Kết quả task gồm ID, baseline, branch/worktree, SHA commit nếu có, file đổi, gate đã chạy, reviewer và các giới hạn. Dừng khi vượt lane, hash cũ không giải quyết được, cùng lỗi lặp, hết số lần thử, thiếu môi trường hoặc phát hiện secret. Giữ nguyên bằng chứng không nhạy cảm và trả quyết định cho orchestrator; không tự sửa quyền hoặc đổi policy.
