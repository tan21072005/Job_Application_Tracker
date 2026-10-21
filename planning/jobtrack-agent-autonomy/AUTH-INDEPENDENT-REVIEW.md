# Bản sửa auth443b8ac — review độc lập

Ngày:2026-10-21. Reviewer: `/root/auth_independent_review_443`, khác tác giả bản sửa. Base khi review: `e60185a286d4f6ac7fbc8e01b30723a3c31b1009`. Chỉ đọc source, targeted test/build và probe HTTP không cookie; không đọc dotenv/accounts, tạo tài khoản hoặc ghi DB.

## Verdict

**PASS cho phạm vi hẹp canonical `Bearer <token>` không hợp lệ không fallback cookie. C03 toàn bộ: PARTIAL, chưa accepted.** Không phát hiện regression mới chắc chắn trong ba file sửa. Đây là hậu kiểm sau integration, không phải review đã xảy ra trước commit; không tạo machine receipt để sửa lịch sử quy trình.

Khi parser nhận diện Bearer mà grant invalid, auth trả401 trước nhánh cookies. Grant hợp lệ vẫn ưu tiên grant theo source; session-only vẫn xác minh JWT/session. Lượt review không tạo session/grant hợp lệ thật nên không tự xác nhận lại8DB probes cũ.

## Findings và giới hạn

1. **P2, pre-existing: parsing chỉ exact `Bearer `.** `security/credential-policy.ts:17–23`, consumer `server.ts:202–217`, test `credential-policy.test.ts:63`: lowercase/bare/tab/Basic được coi không có Bearer, có thể chọn cookie trên GET/same-origin. Module probe với session giả lập: `Bearer bad` và`Bearer `→rejected; `Bearer`, `bearer bad`, `BEARER bad`, `Bearer\tbad`, `Basic bad`→session. Không gọi fix này là “mọi Authorization invalid đều reject”. Origin cũng exact-match nên không tự tái mở chain cross-origin canonical đã sửa.
2. **P2, pre-existing: Origin exception theo hình thức header**, `server.ts:254–270`. Invalid canonical Bearer vẫn qua Origin rồi auth trả401; noBearer foreignOrigin trả403. Task tiếp theo phải dùng credential đã xác thực cho exception và một định nghĩa credential chung.
3. **MCP ngoài scope commit:** mount `server.ts:277`; `routes/mcp.ts:9–29` resolver riêng không đọc scopes, cookie-only chưa được common auth gán identity ở điểm mount. Review fix443b8ac không chứng nhận MCP auth/scopes.

## Independent commands/results

- `rtk git -c safe.directory=D:/Project/Job_Application_Tracker show 443b8ac -- apps/api/src/server.ts apps/api/src/security/credential-policy.ts apps/api/src/credential-policy.test.ts`: đúng3file API, không comment mới.
- `rtk proxy node --test apps/api/src/credential-policy.test.ts`:6/6PASS, exit0.
- `rtk npm run build:api`:tsc --noEmit PASS, exit0.
- Module probe Node gọi trực tiếp parseBearerToken/decideCredential với synthetic identities: kết quả findings1.
- Live HTTP Node fetch timeout5giây, không cookies/credential thật: GET `/api/auth/me` với invalid/empty/lowercase/Basic/noheader đều401; POST `/api/applications` foreignOrigin invalidBearer401, noBearer403; POST `/api/mcp` invalidBearer401 JSON-RPC unauthorized.8/8expected.
- `git diff 443b8ac e60185a -- <3files>`: không khác; tracked tree sạch tại lúc review.

Không cookie negative probe không chứng minh valid-cookie hoặc valid-grant success trên HTTP. Không chạy fullAPI suite, DB E2E hoặc browser CORS; code path chứng minh server-side flaw, không tự gọi đó là browser exploit thực nghiệm.

## Reviewed raw SHA-256

| File | SHA-256 |
| --- | --- |
| apps/api/src/server.ts | c283c0f460733d08b5b7d3598acf5e976d124dab5697efe50d31c4b689b998e5 |
| apps/api/src/security/credential-policy.ts | 62985024362feb22085fef032546a36e72bfd36d236296e95e682d95fd3839ea |
| apps/api/src/credential-policy.test.ts | 6051a50b58d70301b71f1c12a137f3cc1970db6cc9e185996aed3f1c3124102f |

Nếu source bytes thay đổi, review này chỉ còn giá trị lịch sử. Việc tiếp theo: reject explicit malformed/unsupported credential theo semantics đã chốt; grant-verified Origin; tests cookie/grant valid/expired/revoked/case/empty/duplicate; MCP task riêng. Không đóng toàn C03 từ verdict hẹp.
