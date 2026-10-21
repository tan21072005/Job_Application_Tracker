# AG01 — quyền đích và tình trạng thực tế

Ngày:2026-10-21. Thiết kế đã chọn ở CONTROL-PLANE-ADR; chưa phải ACL/config đã triển khai.

| Chủ thể | Được đọc | Được ghi | Credential/network | Enforcement bắt buộc |
| --- | --- | --- | --- | --- |
| Planner/coder/reflector | Projection theo manifest và evidence đã redact | Chỉ structured stdout; scratch tối thiểu | Không host stores; model transport được cấp, deny direct egress | Identity/container + mounts/read policy + broker capabilities |
| Reviewer | Candidate digest/diff/acceptance và context tối thiểu | Verdict structured | Không production credentials | Cùng read isolation, run độc lập |
| Check runner | Candidate snapshot, trusted check/dependency cache, fixture data | Candidate/scratch đã cấp | Fixture credentials ngắn hạn, allowlisted targets, không DB vận hành | Profile riêng; không dùng :workspace hiện tại như chứng nhận confinement |
| Controller/broker | Task manifests, worktrees thật, policy/journal | Worktree task và state/Git ops có kiểm soát | Quyền operator cấp; không forward home/env cho worker | Protected control plane ngoài worker identity |
| Maintainer | Code/config/evidence cần thiết | Integration/config/ops theo task được giao | Quản trị môi trường riêng | Explicit scope, review, không auto escalation |

## Hiện tại

- Worker read-only write denial đã có recorded canary; read isolation FAIL.
- Git broker path rules không chặn read từ shell khác; command catalog không có nghĩa mọi tool đi qua guard.
- `:workspace` write confinement chưa đạt, egress inconclusive, live provider worker chưa nghiệm thu.
- File comment policy có khoảng trống và không enforce cấm xóa comment hàng loạt; reviewer chịu trách nhiệm cho tới khi AG06 bổ sung.
- Projection chưa triển khai; không mount repo/control/Git vào worker mới trước canary.

## Quy trình chốt quyền cho task

Planner đề xuất task nhưng controller/operator quyết định files/operations/check IDs/targets/budget. Manifest và capability được pin base/digest/expiry, không mutable bởi worker. Thay scope cần task mới hoặc maintainer reconciliation, không để model tự thêm đường dẫn. Người dùng giữ quyền quyết định side effects ngoài release scope.
