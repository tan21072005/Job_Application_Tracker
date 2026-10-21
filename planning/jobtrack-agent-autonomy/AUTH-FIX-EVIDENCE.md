# AUTH-FIX-EVIDENCE — P0 Origin/Bearer credential downgrade (C03)

Ngày: 2026-10-21. Task: `feature/api/auth-origin-repair` (lane `api`).

## 1. Lỗ hổng

Hai điểm trong `apps/api/src/server.ts` tạo thành một chuỗi:

| Điểm | Hành vi cũ |
| --- | --- |
| Middleware Origin (dòng ~229) | Bỏ qua kiểm tra `Origin` cho request ghi nếu header `Authorization` bắt đầu bằng `Bearer ` và path thuộc danh sách (`/applications`, `/ai`, `/pro`, `/datasets`, `/profile`, `/subscriptions`, `/mcp`, `/auth/extension`) |
| Middleware `auth` (dòng ~180) | Nếu có header Bearer nhưng grant **không hợp lệ** thì rơi tiếp xuống nhánh **cookie session** thay vì trả 401 |

Chuỗi khai thác: trình duyệt nạn nhân giữ cookie `jobtrack_session` → trang độc hại gửi POST cross-origin kèm `Authorization: Bearer <bất kỳ>` → kiểm tra Origin bị bỏ qua → Bearer không hợp lệ rơi xuống cookie → request được xác thực bằng session của nạn nhân và đi tới handler ghi dữ liệu.

## 2. Cách sửa

| Thay đổi | Vị trí |
| --- | --- |
| Bearer không hợp lệ ⇒ **401**, không bao giờ fallback sang cookie | `apps/api/src/server.ts` (`auth`) |
| Quyết định credential tách thành module thuần để test được không cần DB | `apps/api/src/security/credential-policy.ts` |
| Regression test cho chính sách này | `apps/api/src/credential-policy.test.ts` |

Không thay đổi: middleware Origin, mã lỗi/thông điệp công khai, đường xác thực bằng grant hợp lệ, đường xác thực bằng session cookie, phạm vi route, migration, schema.

## 3. Bằng chứng end-to-end

Hai instance chạy song song trên **cùng DB test `jobtrack_test`** (DB vận hành `jobtrack` **không** bị chạm):

- baseline = source hiện tại (main, chưa sửa), cổng 64377
- patched = worktree `feature/api/auth-origin-repair`, cổng 64376

Mỗi instance dùng một tài khoản test riêng (`jt.regression.*@jobtrack.test`) đăng ký qua `/api/auth/register`, cookie phiên lấy bằng cookie jar của curl. Request thay đổi dữ liệu dùng body `{}` nên **dừng ở bước validate, không ghi dòng nào**.

| # | Probe | Baseline | Patched | Kết luận |
| --- | --- | --- | --- | --- |
| P1 | POST cross-origin + Bearer sai + cookie phiên nạn nhân | **422** (đã xác thực, tới validate) | **401** | khai thác bị chặn ✓ |
| P2 | POST cross-origin + không Bearer + cookie phiên | 403 `invalid_origin` | 403 `invalid_origin` | không đổi ✓ |
| P3 | POST cross-origin + Bearer sai + không cookie | 401 | 401 | không đổi ✓ |
| P4 | GET `/api/auth/me` + Bearer sai + cookie phiên hợp lệ | **200** (rơi xuống cookie) | **401** | credential downgrade bị chặn ✓ |
| P5 | GET `/api/auth/me` + chỉ cookie phiên | 200 | 200 | không hồi quy ✓ |
| P6 | GET `/api/auth/me` + không credential | 401 | 401 | không đổi ✓ |
| P7 | POST same-origin + Bearer sai + cookie phiên | **422** (rơi xuống cookie) | **401** | Bearer sai không bao giờ dùng cookie ✓ |
| P8 | POST chỉ cookie + Origin hợp lệ | 422 | 422 | đường ghi bằng session còn nguyên ✓ |

Đọc kết quả: `422 invalid_request` = request **đã vượt qua xác thực** và dừng ở validate input; `401 unauthorized` = bị chặn ở tầng credential; `403 invalid_origin` = bị chặn ở tầng Origin.

## 4. Checks đã chạy

| Check | Lệnh | Kết quả |
| --- | --- | --- |
| Type check lane api (worktree, có bản sửa) | `npm --prefix .worktrees/auth-origin-repair/apps/api run build` | **exit 0** |
| Type check baseline (main, chưa sửa) | `npm --prefix apps/api run build` | **exit 0** |
| Regression test | `node --test apps/api/src/credential-policy.test.ts` | **6 pass / 0 fail** |
| End-to-end probe (bảng mục 3) | curl + cookie jar trên `jobtrack_test` | **8/8 probe đúng kỳ vọng** |

Ghi chú môi trường: worktree không có `node_modules` (đây là khoảng trống tooling đã biết). Để chạy `tsc` trong worktree, tôi tạo **junction tạm** `apps/api/node_modules` → `apps/api/node_modules` của checkout chính (cùng package, cùng phiên bản), chạy xong đã xóa. Không copy secret, không tắt sandbox, không sửa lockfile. Cùng kiểm tra đó chạy trên baseline cho kết quả tương đương.

## 5. Chưa chạy (NOT-RUN)

| Mục | Lý do |
| --- | --- |
| `npm run test:api` (toàn bộ suite API) | cần `TEST_DATABASE_URL` và chạy test DB — là thao tác maintainer; chỉ chạy regression độc lập không cần DB |
| Browser E2E (C21) | chưa giao |
| Review độc lập của chính thay đổi này | theo `AGENTS.md`, feature commit cần reviewer độc lập trước khi tích hợp |

## 6. Phạm vi còn lại

Chain CSRF đã đóng. Nhưng còn hai điểm cần task riêng, không nên gộp vào bản sửa này:

1. **Origin bypass dựa trên *header*, không phải credential đã xác thực.** Sau bản sửa, request có Bearer sai vẫn bỏ qua kiểm tra Origin (rồi bị 401). Nên chuyển sang bỏ qua Origin **chỉ khi request thực sự được xác thực bằng grant** — cần sắp xếp lại thứ tự middleware.
2. **Bản vá dựa trên header, không phải giá trị grant.** `req.get('authorization').startsWith('Bearer ')` vẫn là điều kiện theo *hình thức*; nếu muốn chặt chẽ hơn thì Origin bypass nên dựa trên grant đã xác thực (mục 1).

Không tự ý mở rộng phạm vi trong bản sửa này: lane `api`, 3 file, không đụng contract/migration/CI.
