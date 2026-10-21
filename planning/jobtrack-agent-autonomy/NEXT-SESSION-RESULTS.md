# Kết quả4việc và prompt tiếp tục

Ngày:2026-10-21. Source base:e60185a. Lượt closure không thay code API/controller/policy, không chạy DB suite hoặc migration/account/provider/n8n, không restart/kill dịch vụ, không uninstall hoặc đổi ACL.

## Bốn việc đã xử lý

1. **AG00 independent review:** reviewer khác tác giả chạy23/23fixtures, kiểm source/docs/HTTP. Review đầu FAIL vì tài liệu stale và bỏ sót gate code/canary predicates. Maintainer sửa tài liệu trong worktree riêng, gửi delta review; verdict cuối và hashes ở AG00-REVIEW. Chỉ accepted cho audit khi reviewer thông qua, không cho G-A.
2. **Auth review độc lập:** AUTH-INDEPENDENT-REVIEW ghi PASS cho canonical invalidBearer downgrade của443b8ac,6/6regressions và buildAPI đạt; C03partial, không fullaccepted. Review hậu kiểm, không sửa lịch sử thành review trướcintegration.
3. **Quyết định read isolation:** CONTROL-PLANE-ADR chọn minimal snapshot projection **trong identity/container bị giới hạn đọc**. Không chọn projectionfolder đơn lẻ. Thiết kế đã chốt, implementation/canary chưa làm.
4. **Cleanup:** taskauth-header-origin-fix từprepared→abandoned qua controller; xác minh tuyệt đối target trong .worktrees,0changes/0ignoredextras/0uniquecommits, gitworktreeremove khôngforce. Giữ branch/audit; không đụng auth-origin-repair có commit443b8ac. Xem WORKTREE-CLEANUP-EVIDENCE.

## Việc cần làm tiếp theo, theo thứ tự

| Ưu tiên | Task | Điều kiện hoàn tất |
| --- | --- | --- |
| 1 | Code-enforced readiness gate trước planner/provider | run/dispatch reject missing/invalid/stale/tampered receipt và G-Afail trước bất kỳ modelcall; pin binary/policy/projection/targets/expiry; không worker tự viết receipt |
| 2 | AG01 projection + isolation adapter | Worker chỉ đọc manifest source/dependencies; không hostrepo/Git/control/credential/sibling. OSreadpolicy/container mounts phải chứng minh bằng fakecanaries |
| 3 | AG02/AG07 canary/check runner | Sửa aggregate thiếufields/controlState/Gitconfig/egress; hostpositivecontrol CONNECTED+sandboxDENIED; worker/checkprofile riêng; childgrandchildcleanup; fakefiles thay realm.env/accounts |
| 4 | Doctor evidence semantics | Tách launchprobe/isolationreadiness/liveworkerverified; falsekhônglàgate, probe0khônglàlivePASS; environment fingerprint và evidence expiry |
| 5 | C03 residual và MCP task riêng | Explicit malformed/unsupported/case/empty credential semantics; Origin dựa grantverified; fixtures validcookie/validgrant/expired/revoked/duplicates; MCP scopes/owner riêng |
| 6 | AG03–AG11 | Sau gate/canary/review mới pilot task được giao, budgets hữu hạn, featureworktree/commit riêng, no new codecomments |

Không giao tất cả thành một task rộng. Control-plane/config/CI là maintainer bootstrap riêng; API/MCP là lane tasks riêng từ base đãintegrated. Snapshot adapter cần design/interface/test trước; không mởpolicy cho worker tự sửa controller.

## Prompt dán chat mới

```text
Tiếp tục JobTrack tại D:\Project\Job_Application_Tracker.
Đọc AGENTS và RTK rules; đọc planning/jobtrack-agent-autonomy/NEXT-SESSION-RESULTS.md,
AG00-REVIEW.md, AUTH-INDEPENDENT-REVIEW.md, CONTROL-PLANE-ADR.md,
PERMISSION-MATRIX.md, SANDBOX-READINESS.md và TASKS.json.
Đối chiếu Git hiện tại, không reset baseline. ContextZIP là tài liệu, không fullsource.

Đã hoàn tất4việc: independentAG00review+reconcile, narrowauthreview443b8ac,
chọn projection trong isolatedidentity/container, dọn duplicateworktree sạch.
G-A vẫn chưa đạt. Controller.run chỉ kiểm launchprobe, chưa enforce G-A;
probe.ps1 có aggregate egress/read/missingfields sai. Không live dispatch.
AuthcanonicalBearerfix PASS, C03partial; không làm lại hoặc gọi cả auth xong100%.

Yêu cầu trước tiên tiếp nhận và đề xuất task implementation nhỏ cho readiness gate
và projectionadapter theo ADR. Chưa provider/DB/migrate/install/container provisioning
trong bước intake; không mở dotenv/accounts/keys hoặc chạy canary mở secrets thật.
Workers read-only, maintainer control-plane tasks riêng, no new codecomments,
feature/worktree/commit riêng; không push/reset/force/delete tùy ý.
Trả hiện trạng/gap/bằng chứng, taskready và kiểm thử cụ thể; khi được giao triển khai
thì failclosed trước modelcall, không dùng probe0 hay booleanJSON tự ghi làm PASS.
```

HISTORY trong gói là tổng hợp, không phải export nguyên văn toàn bộ chat. Review reports là Markdown có phạm vi và digests, không machine receipts được tự chế cho controller.
