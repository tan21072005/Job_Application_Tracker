# ADR AG01 — snapshot projection trong execution identity cách ly

Ngày quyết định:2026-10-21. Trạng thái: **chọn thiết kế; chưa triển khai, chưa mở G-A**. Quyết định này đáp ứng yêu cầu người dùng chọn cách ly đọc cho workers.

## Bằng chứng

CANARY-EVIDENCE cho thấy read-only chặn ghi nhưng vẫn mở được Git common directory, file credential trong repo, sibling worktree và control state. Identity có tên riêng chưa đủ nếu ACL vẫn cho đọc. Egress TIMEOUT trùng baseline host; check profile :workspace ghi ra ngoài checkout. Không chạy lại canary trên file credential thật trong lượt quyết định.

## Lựa chọn

Chọn **controller cấp snapshot projection tối thiểu, chạy trong execution identity hoặc container không có quyền đọc host repo/home**. Projection là cách phân phối source; isolation là cách thực thi quyền. Không coi một folder projection dưới cùng identity rộng quyền là giải pháp bảo mật.

Controller giữ Git worktrees thật, registry, broker và credential của chính controller ở control plane ngoài vùng worker có thể truy cập. Coder nhận manifest allowlist gồm file lane và dependency đã tích hợp, read-only. Tool/shell của worker chỉ thấy projection, scratch riêng, runtime tối thiểu và model transport có giới hạn. Proposal quay về broker bằng structured channel, không nhận mount Git hoặc source sibling.

**Ưu tiên Windows hiện tại:** AG01 implementation trước tiên kiểm khả năng explicit readable roots/denied roots trên CLI app và một identity được quản trị riêng. Chỉ chọn adapter này khi canary chứng minh từ chối tuyệt đối các fake targets trong host repo/home/commonGit/control. Nếu runtime không enforce được, dùng container/VM với mounts allowlist; không cài Docker/WSL/tạo account/đổi ACL trong lượt quyết định này. Container chỉ mount projection read-only và scratch riêng, không host drive/Docker socket/SSH agent/credential stores; chặn đường host/mạng tương ứng. Container name không tự chứng minh isolation; canary vẫn bắt buộc.

## Phương án không chọn làm giải pháp độc lập

- Projection trong thư mục khác nhưng worker vẫn đọc host bằng đường dẫn tuyệt đối: không đạt.
- Chỉ tạo OS identity rồi để inherited Users read host repo: không đạt.
- Thêm deny ACL vào tài khoản người dùng thật hoặc đổi quyền đệ quy toàn home/repo: không chọn.
- Uninstall sandbox hoặc danger-full-access: không xử lý yêu cầu cách ly, không chọn.

## Interface và invariants

`createProjection(task, base, files) → projectionId + manifestHash`: controller validate canonical path/case/file identity, không follow links, không copy dotenv/accounts/Git/control/credentials, không worker-chosen file glob. Dependency source ngoài lane được cấp rõ bằng manifest. Runtime dependencies từ cache trusted riêng, không junction vào node_modules host hoặc copy user config.

`launchIsolated(role, projectionId, capability) → structuredProposal`: capability gắn task/role/lane/base/manifest/run/expiry, limits và broker-issued allowed operations; model không sửa quyền. Runtime credential nếu cần đi qua proxy hẹp hoặc cơ chế injection không expose host stores; phải đánh giá rõ model process có thể đọc gì. Egress mặc định deny, model endpoint qua transport được operator cấp. Check runner khác worker: snapshot candidate+scratch+fixture data, network/DB destination allowlist riêng, tuyệt đối không production DB.

`applyProposal(task, beforeHash, changes)`: code chỉ ghi trong worktree thật sau validation; projection không được tự mutate. Checks/reviewer đều gắn candidate digest; thay bytes mất hiệu lực evidence. Reviewer nhận đúng diff/acceptance/minimal context, không cần quyền repo gốc.

## Điều kiện chuyển từ thiết kế sang hoạt động

1. Fake canaries cho host repo, commonGit, sibling, control, home credential và path traversal/links: DENIED; không mở file secrets thật.
2. Host positive control tới đích test quản lý phải thành công; isolated process bị chặn trừ endpoint allowlist. TIMEOUT chung hai phía không phải PASS.
3. Check runner chỉ ghi scratch/candidate được cấp, không ghi ra host; test code cố đọc/egress/spawn ngoài scope bị chặn.
4. Child+grandchild cleanup, crash/timeout/lease recovery có evidence; canary missing/parse/error/expired fingerprint đều fail-closed.
5. Evidence pin CLI binary/version, policy/projection manifest, identity, target/base, timestamp và verifier; doctor phân biệt sandboxProbePass, isolationReady, liveWorkerRunVerified. Không thay hardcode false bằng probecode0; live model run là evidence riêng, chưa cần bật để kiểm canary.

## Việc tiếp theo

AG01: triển khai projection adapter + permission capabilities trên branch/worktree riêng; AG02/AG07: fake-only canaries, check profile và egress; AG11: independent gate review rồi pilot. Chưa tự dispatch coding worker hoặc sửa controller/policy theo ADR này trong lượt hiện tại.

Điều kiện bắt buộc bổ sung: controller.run/dispatch phải kiểm readiness receipt thực sự trước bất kỳ planner/provider call. Hiện source chưa có gate đó; quy trình cấm live không phải implementation. Receipt phải chống stale/tamper/missing fields và pin execution environment; không tự tạo PASS receipt hoặc chỉ đọc một boolean trong JSON do worker sửa được.
