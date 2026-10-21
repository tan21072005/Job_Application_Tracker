# Mô hình phát triển phần mềm và AI của JobTrack

Đây là lựa chọn quy trình cho dự án, không phải tuyên bố rằng đã triển khai hệ thống huấn luyện hay giám sát production. JobTrack hiện tích hợp mô hình qua API; việc dùng LLM không tạo ra nhu cầu huấn luyện mô hình từ đầu. Phần mềm và AI dùng chung task, worktree, test, review và commit; AI bổ sung bằng chứng về dữ liệu, prompt và mô hình.

## Luồng phần mềm

Dùng Kanban làm nhịp mặc định: `Backlog → Ready → In progress → Checks → Independent review → Ready to integrate → Done`. Giới hạn việc đang làm theo số lane và agent thực sự có sẵn. Không mở hai task ghi cùng lane đồng thời. “Done” nghĩa là đã đạt nghiệm thu và được người duy trì tích hợp; commit riêng chỉ là “Ready to integrate”.

Nếu cần Scrum, gom task đã sẵn sàng vào sprint ngắn, xác định sprint goal, demo và retrospective. Không dùng sprint để bỏ qua dependency hợp đồng hoặc chạy đồng thời các task xung đột. Orchestrator có thể gợi ý ưu tiên và chia việc; người dùng vẫn quyết định mục tiêu sản phẩm.

Với thay đổi khó đảo ngược như schema dữ liệu, migration hoặc phát hành, áp dụng các gate tuần tự có tài liệu: yêu cầu → thiết kế → triển khai → kiểm chứng → phê duyệt vận hành. Đây là mốc kiểm soát phù hợp kiểu Waterfall ở phạm vi hẹp, không buộc toàn bộ dự án chờ một kế hoạch dài mới được sửa lỗi.

## Vòng CRISP-DM cho một thử nghiệm AI

| Giai đoạn | Artifact tối thiểu | Điều kiện đi tiếp |
| --- | --- | --- |
| Hiểu bài toán | Người dùng mục tiêu, tác vụ, giả thuyết, baseline và chỉ số đạt | Có giá trị sản phẩm đo được |
| Hiểu dữ liệu | Nguồn, quyền sử dụng, mẫu dữ liệu đã khử định danh, thiếu sót và thiên lệch | Không dùng dữ liệu thật ngoài phạm vi được phép |
| Chuẩn bị dữ liệu | Dataset version, tập dev/eval tách biệt, quy tắc chuẩn hóa và nhãn | Tránh trùng mẫu/rò rỉ giữa tập tối ưu và tập đánh giá |
| Modeling | Model/provider revision, prompt version, tham số và phiên bản tool/schema | Thay đổi có thể truy vết và tái lập trong giới hạn API |
| Đánh giá | Kết quả baseline/candidate, lỗi quan trọng, chi phí và độ trễ | Đạt ngưỡng đã chốt trước khi chạy |
| Triển khai | Cấu hình rollout, quan sát, phương án rollback và chủ sở hữu | Người duy trì cho phép phát hành |

Một giả thuyết chỉ đổi một yếu tố chính khi có thể, ví dụ: “Prompt trích xuất JD mới giảm trường bịa thêm so với baseline trên cùng tập đánh giá, không vượt ngân sách và độ trễ đã chốt.” Chốt ngưỡng trước khi xem kết quả; không chọn ngưỡng sau để hợp thức hóa candidate.

## Ghi nhận Code + Data + Model + Prompt

Mỗi thử nghiệm ghi: task ID, Git SHA, dataset ID/hash và phiên bản nhãn, model ID/provider và revision nếu có, hash prompt, tham số suy luận, phiên bản schema/tool, thời điểm, latency, usage/cost, kết quả và hạn chế. Không ghi khóa API, CV nguyên bản hoặc thông tin tài khoản vào Git hay trace. Khi provider không cung cấp model revision cố định, ghi rõ khả năng tái lập bị giới hạn.

Tập eval nên có các ca đúng/sai rõ ràng, thiếu dữ liệu, tiếng Việt/Anh, URL lỗi, prompt injection, phản hồi không hợp lệ và tác vụ thiếu quyền. Dùng fixture tổng hợp hoặc dữ liệu có quyền sử dụng. Không coi điểm ATS là xác suất tuyển dụng hoặc bằng chứng năng lực ứng viên.

Đánh giá gồm tính đúng của schema và trường dữ liệu, tỷ lệ bịa thông tin, đúng quyền, hoàn thành thao tác, chất lượng nội dung theo rubric, p95 độ trễ và chi phí mỗi tác vụ. Điểm LLM-as-judge chỉ là một tín hiệu; mẫu quan trọng cần người đọc chấm và rubric được lưu. Test quyền và bất biến nghiệp vụ vẫn là kiểm tra xác định, không giao cho mô hình tự chấm.

## MLOps phù hợp với trạng thái hiện tại

Với mô hình API, pipeline đầu tiên là `Dữ liệu/fixture → Eval → So sánh → Review → Rollout cấu hình → Theo dõi → Rollback hoặc thử nghiệm mới`. Theo dõi chất lượng trích xuất, lỗi tool, yêu cầu bị từ chối, độ trễ, usage và lỗi provider. Đặt ngân sách theo task và run; dừng khi chạm giới hạn, không retry vô hạn.

Phân biệt data drift (đầu vào đổi), chất lượng đầu ra suy giảm, provider đổi hành vi và code regression. Cảnh báo là tín hiệu điều tra; không tự sửa prompt hoặc huấn luyện lại production. Ưu tiên kiểm tra dữ liệu, schema, hướng dẫn và model configuration trước. Chỉ lập pipeline auto-train/retrain khi có mô hình thuộc quyền quản lý, dữ liệu được phép huấn luyện, baseline, compute budget và cơ chế duyệt model mới.

Data-centric AI nghĩa là phân loại lỗi theo loại dữ liệu rồi cải thiện mẫu, nhãn và quy tắc chuẩn hóa có phiên bản. Không tái sử dụng tập eval bí mật làm dữ liệu tối ưu. Mỗi lần thay dữ liệu hoặc rubric cần báo riêng để tránh so sánh điểm giữa hai tập khác nhau.

## Mẫu brief cho task hoặc thử nghiệm

Ghi rõ: vấn đề; phạm vi/lane; mục tiêu hoặc giả thuyết; acceptance; baseline; dữ liệu và quyền sử dụng; checks; ngân sách/số lần thử; artifact bàn giao; điều kiện dừng; dependency; người review và người quyết định rollout. Task software không cần các trường mô hình không liên quan. Task AI không được bỏ acceptance hoặc contract test chỉ vì kết quả có tính xác suất.

Không tự triển khai orchestration cloud, huấn luyện model, nguồn crawl mới hoặc workflow n8n đang chạy từ tài liệu này. Các bước đó cần yêu cầu sản phẩm và task riêng.
