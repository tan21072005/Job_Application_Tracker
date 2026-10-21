# Quy trình phát triển phần mềm và AI

Đây là quy trình áp dụng cho JobTrack, không phải yêu cầu cài tất cả framework Agile/MLOps. Agile và CRISP-DM có thể dùng cùng nhau: một bên tổ chức giao việc, một bên cấu trúc thử nghiệm dữ liệu/model.

## Software delivery

Kanban mặc định: backlog → ready → đang làm → checks → review → feature committed → integrated → accepted. WIP1 task/lane; số workers theo năng lực máy và concurrency cap, không theo số tên role. Orchestrator tự điều phối trong scope đã được giao; người dùng giữ quyền ưu tiên sản phẩm và quyết định release.

Scrum tùy chọn: sprint goal, backlog ready, demo và retrospective. Chỉ gom task có dependency sẵn sàng; không cam kết mỗi sprint phải có model tốt hơn nếu giả thuyết thất bại. Một experiment được bác bỏ bằng evidence vẫn là deliverable hợp lệ.

Gate tuần tự theo kiểu Waterfall áp dụng hẹp cho migration/release: requirements → design → rehearsal → verification → operational approval. Không buộc mọi UI bugfix đi qua một đợt thiết kế dài.

**Definition of Ready:** mục tiêu và acceptance đo được; source/gap có bằng chứng; dependency integrated; lane/paths/base rõ; check catalog và fixture đủ; budget/stop/recovery quy định; không yêu cầu quyền ngoài task. Task thiếu điều kiện được blocked/planning, không dispatch bằng prompt mơ hồ “hoàn thiện tất cả”.

**Definition of Done:** proposal được broker chấp nhận; checks và independent review trên cùng digest; feature commit chứa đúng paths; maintainer tích hợp và affected checks đạt; acceptance/product evidence và docs cập nhật. No new code comments, không thay policy/test để giả pass. Giữ comment cũ; giải thích thiết kế trong Markdown/ADR.

## CRISP-DM cho AI của JobTrack

| Giai đoạn | Áp dụng | Artifact/gate |
| --- | --- | --- |
| Business understanding | Ví dụ giảm trường JD bị bịa, giúp user cập nhật hồ sơ đúng qua chat | Hypothesis, baseline, success/error/cost limits |
| Data understanding | Nguồn JD/profile đã được phép; tiếng Việt/Anh, ngành, dữ liệu thiếu và dạng HTML | Data card, quality/error taxonomy, quyền sử dụng |
| Data preparation | Chuẩn hóa/khử định danh, labels và provenance, dedup | Dataset/label hashes, dev/holdout tách biệt |
| Modeling | Prompt/model configuration/tool schema; training chỉ khi có scope riêng | Code/model/prompt/tool versions, params, experiment ID |
| Evaluation | Extraction/grounding/tool correctness/ownership/cost/latency | Rubric đóng băng, deterministic tests, human review và report |
| Deployment | Cấu hình model/prompt đã review và có rollback | Release gate, monitoring và rollback target |

Ví dụ giả thuyết: “Prompt JD candidate giảm trường company/position sai trên holdout cố định so với baseline, không tăng thao tác vượt quyền, trong budget và p95 latency đã chốt”. Không đổi threshold sau khi xem candidate để tạo PASS. Không dùng dữ liệu đánh giá kín để sửa prompt rồi báo vẫn là holdout.

## Mẫu brief AI experiment

```yaml
id: EXP-<id>
productTask: C24
hypothesis: <một thay đổi có thể kiểm chứng>
baselineCodeSha: <sha>
baselineModel: <provider/model/revision nếu có>
candidateChange: <data hoặc prompt hoặc model hoặc tool schema>
data:
  sourceAndPermission: <provenance>
  datasetHash: <sha256>
  labelsVersion: <version>
  devSplit: <id/hash>
  holdoutSplit: <id/hash riêng>
evaluation:
  rubricVersion: <version>
  thresholds: <chốt trước chạy>
  deterministicInvariants: <owner/quota/idempotency/schema>
  humanReview: <mẫu quan trọng và người review>
limits:
  requests: <hữu hạn>
  cost: <ngân sách hữu hạn được giao>
  duration: <giới hạn>
promotion: maintainer-review
rollback: <model/prompt/config baseline>
```

Mẫu này là tài liệu thiết kế, không phải file config runnable hiện có. API key, CV nguyên bản và thông tin tài khoản không vào registry/trace/Git. Provider không có revision pin thì ghi giới hạn khả năng tái lập.

## MLOps/LLMOps phù hợp hiện tại

JobTrack dùng model API nên pipeline ban đầu:

```text
Dữ liệu có quyền → chuẩn hóa/version → eval baseline/candidate
→ review chất lượng/cost/latency → cấu hình rollout
→ theo dõi đầu vào/lỗi tool/grounding/provider → rollback hoặc experiment mới
```

Data drift là tín hiệu thay đổi phân bố đầu vào; giảm chất lượng có thể do dữ liệu, provider, prompt hoặc code. Monitor theo nhóm và điều tra trước khi thay model. Không tự huấn luyện lại chỉ vì có một alert. Retrain chỉ thêm khi thật sự có model trainable do mình quản lý, dữ liệu/labels được phép, baseline, compute budget, eval và gate promotion riêng.

Data-Centric AI: phân nhóm lỗi → cải thiện mẫu/nhãn/normalization → version → eval trên cùng holdout hợp lệ. Không chỉ liên tục thay model lớn hơn. AI coding quality và AI sản phẩm cần bộ eval riêng: coder đo acceptance/check/review và cross-feature violations; sản phẩm đo JD/ATS/chat/tool quality. Không trộn hai tỷ lệ thành một điểm “AI accuracy”.

## Theo dõi tối thiểu

Task/run/role, base/proposal/digest/check/review/commit IDs, queue time, duration, attempts, failure fingerprint, lease/recovery, token usage/cost nếu provider cung cấp, verdict và limit reasons. Log phải redact và có retention. Báo usage không có dữ liệu thì ghi unavailable, không ghi 0. Evidence quan trọng được hash và tham chiếu trong handoff.
