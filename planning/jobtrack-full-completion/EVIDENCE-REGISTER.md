# Sổ bằng chứng ban đầu

Phân loại: `observed-source` = đã đọc code; `reported-history` = báo cáo cũ; `executed-fixture` = đã chạy fixture ở lượt trước; `blocked-live` = probe thực bị chặn; `pending` = chưa kiểm chứng. Không có fresh full-suite pass trong lượt plan này.

| ID | Nội dung | Loại | Hành động cần làm |
| --- | --- | --- | --- |
| E01 | T01–T10 và báo cáo9/30/30 tests | reported-history | Giữ tài liệu, đối chiếu task C00/C20/C21/C22 |
| E02 | Master báo API44/Web34/extension pass,6 migrations applied | reported-history | Chạy lại trên DB fixture riêng, ghi commit/env; không truy DB chính để đếm cho đủ |
| E03 | Controller21 tests pass,2legacy decision pass; timeout fixture chưa pass | executed-fixture | Giữ giới hạn, bổ sung live canary C01 và sửa runner C20 |
| E04 | Windows sandbox Node probe lỗi setup refresh | blocked-live | Không live dispatch/bypass; C01 gỡ môi trường |
| E05 | Auth bearer/cookie fallback và Origin exception | observed-source | C03 regression xác nhận threat và sửa |
| E06 | MCP custom transport, scope/receipt semantics | observed-source | C04/C14; không ghi SDK/SSE/OAuth/client pass từ tài liệu cũ |
| E07 | Chat customReact + JSON BFF + fallback | observed-source | C16/C17 xác minh n8n protocol và triển khai |
| E08 | ATS heuristic, cover-letter template, checkout examplebank | observed-source | C12/C13 đúng năng lực/nguồn dữ liệu |
| E09 | Headless subrequests chưa egress enforcement/body cap sau read | observed-source | C09 network negative tests trước sử dụng crawler động |
| E10 | Client matrix/n8n inventory/runbook có tuyên bố quá source | observed-doc-conflict | C00 đánh dấu; C15/C16/C25 cập nhật theo chạy thật |
| E11 | CI/test isolation/browser/restore/load cần xác minh từ audit cũ | reported-gap | C20–C23; không mặc nhiên coi vẫn lỗi hay đã sửa |
| E12 | Git main30db3fd, tracked sạch lúc bắt đầu plan | observed-git | Snapshot Git và source manifest trong gói; recheck trước code |

## Mẫu evidence mới

```text
Task / acceptance IDs:
Commit / tree digest:
Date and environment (OS/runtime/DB/client versions):
Fixture data / target DB / no-production-data confirmation:
Command or reproducible user steps:
Expected:
Actual / exit code:
Redacted evidence path and SHA-256:
Result: PASS / FAIL / BLOCKED / NOT-RUN
Limitations:
Reviewer:
```

Lưu evidence mới theo `evidence/completion/<task-id>/` với dữ liệu mẫu; không token, cookies, fullCV hoặc API credentials. Nếu folder evidence bị ignore, vẫn trích hash/path trong báo cáo và đưa bản đã làm sạch vào gói release. Dùng trạng thái NOT-RUN nếu thiếu môi trường; không dùng skipped làm PASS.
