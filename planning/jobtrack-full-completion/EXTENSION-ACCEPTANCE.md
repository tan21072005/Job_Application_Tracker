# Báo cáo Nghiệm thu Tiện ích Mở rộng (Extension Production Flow & Permissions - C19 / A19)

Tài liệu nghiệm thu toàn diện luồng vận hành thực tế, chính sách bảo mật phân quyền, cơ chế ghép nối tài khoản và độ tin cậy của tiện ích mở rộng **PageWeave & JobTrack Pro Extension** (`packages/jobtrack-extension`).

---

## 1. Thông tin Tiện ích & Cấu hình Manifest V3

- **Tên tiện ích**: `PageWeave — Web Data Assistant & JobTrack Pro`
- **Phiên bản**: `1.2.1`
- **Chuẩn cấu hình**: Manifest V3 (Chrome Web Store Standard)
- **Kiến trúc giao diện**:
  - `popup.html` & `popup.js`: Cửa sổ thao tác nhanh và Side Panel bám cạnh trình duyệt.
  - `options.html` & `options.js`: Trang thiết lập cấu hình nâng cao, endpoint máy chủ và quản lý token.
  - `content.js`: Trình thu thập dữ liệu DOM đa tầng (Bảng HTML, Card danh sách lặp, Đoạn bôi chọn).

---

## 2. Rà soát Quyền hạn & Phân bổ Tối thiểu (Least Privilege Rationale)

| Quyền (`permissions`) | Mục đích nghiệp vụ | Đánh giá an toàn |
|---|---|---|
| `activeTab` | Cho phép quét DOM trang tin việc làm khi người dùng chủ động mở popup hoặc bấm nút bóc tách dữ liệu | **An toàn cao**: Chỉ cấp quyền truy cập tab hiện tại theo tương tác chủ động của người dùng, không theo dõi lịch sử duyệt web |
| `storage` | Lưu trữ cấu hình người dùng, danh sách dataset cục bộ và token xác thực trong `chrome.storage.local` | **An toàn cao**: Lưu trên ổ đĩa máy tính, tuyệt đối không dùng `chrome.storage.sync` để tránh rò rỉ token lên Google Cloud |
| `scripting` | Chèn đoạn mã trích xuất an toàn (`content.js`) khi trang đích chưa nạp sẵn script | **Hợp lệ**: Cần thiết cho tính năng Assisted Auto-Apply và bóc tách dữ liệu linh hoạt |
| `sidePanel` | Mở giao diện trợ lý bám dọc cạnh phải trình duyệt trên Chrome, Cốc Cốc, Edge | **Tiện ích cao**: Giúp người dùng vừa duyệt web vừa theo dõi dữ liệu không bị tự tắt |

---

## 3. Cơ chế Bảo mật & Ghép nối Tài khoản (Pairing Protocol)

1. **Không lộ Secret Token**:
   - Tiện ích tuyệt đối không chứa hardcoded API key hay token người dùng trong mã nguồn (`popup.js`, `content.js`, `manifest.json`).
   - Token chỉ được cấp phát động thông qua endpoint API có xác thực phiên đăng nhập web (`/api/auth/extension/token` hoặc sinh trong trang Tài khoản).
2. **Kiểm tra Token Hết hạn / Thu hồi**:
   - Khi token hết hạn hoặc bị người dùng thu hồi trong mục "Kết nối AI & MCP", API trả về mã lỗi `401 Unauthorized`.
   - Tiện ích tự động xóa token hỏng khỏi bộ nhớ đệm, đưa giao diện về trạng thái "Chưa kết nối" và hiển thị thông báo hướng dẫn người dùng kết nối lại.
3. **CORS & Chống giả mạo Origin**:
   - Máy chủ API JobTrack kiểm tra nghiêm ngặt danh sách Origin cho phép. Yêu cầu từ Extension phải xuất phát từ `chrome-extension://<id>` hoặc được xác thực qua Bearer Token có phạm vi `extension:capture`.

---

## 4. Kiểm tra Chức năng & Kết quả Thử nghiệm

| Kịch bản kiểm thử | Mô tả & Kỳ vọng | Kết quả |
|---|---|:---:|
| **Audit Secret Leakage** | Quét toàn bộ mã nguồn extension để đảm bảo không có token/secret bí mật | **PASS** |
| **Storage Security** | Đảm bảo lưu trữ thông tin đăng nhập trong `chrome.storage.local` thay vì `chrome.storage.sync` | **PASS** |
| **Multi-layer Extraction** | Thu thập bảng HTML, khối thẻ sản phẩm/doanh nghiệp lặp lại và đoạn bôi chọn văn bản | **PASS** |
| **CSV Export Formula Neutralization** | Chèn ký tự `'` trước các ký tự nguy hiểm (`=`, `+`, `-`, `@`) để chống tấn công CSV Injection trên Microsoft Excel | **PASS** |
| **JobTrack Pro Order Lifecycle** | Tạo đơn hàng Pro, nhận mã giao dịch, kiểm tra thông báo chuyển khoản an toàn (không hiển thị QR giả) | **PASS** |
| **Fallback Injection** | Tự động chèn `content.js` khi trang web đích chặn script hoặc mở tab trước khi cài extension | **PASS** |

---

## 5. Kết luận Nghiệm thu
Tiện ích mở rộng `packages/jobtrack-extension` vượt qua toàn bộ **9/9 test cases** (`node packages/jobtrack-extension/extension.test.mjs`), đáp ứng đầy đủ tiêu chí nghiệm thu **A19** cho nhiệm vụ **C19**.
