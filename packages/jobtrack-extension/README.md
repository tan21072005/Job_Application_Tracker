# PageWeave — Web Data Assistant & JobTrack Pro (Chrome / Cốc Cốc / Edge Extension)

Tiện ích mở rộng Manifest V3 biến đổi dữ liệu trên web thành bảng tính có cấu trúc, tài liệu nghiên cứu và tự động hóa quy trình công việc đa ngành (So sánh giá sản phẩm, Lập danh sách doanh nghiệp, Ghi chú nghiên cứu) đồng thời tích hợp toàn diện hệ sinh thái **JobTrack Pro**.

---

## 🚀 Tính năng nổi bật

### 1. Trợ lý dữ liệu web đa ngành (Universal Web Data Extraction)
- **Bóc tách bảng HTML tự động**: Tự động nhận diện cấu trúc `<table>`, `<th>`, `<td>` trên mọi trang web thành bảng dữ liệu hoàn chỉnh.
- **Bóc tách danh sách lặp (Repeating Items / Cards)**: Quét các khối danh mục sản phẩm thương mại điện tử, danh bạ doanh nghiệp, danh sách bài viết.
- **Bóc tách đoạn bôi chọn (Selection)**: Thu thập tức thì các trích dẫn, đoạn văn bản quan trọng kèm đường dẫn nguồn gốc (provenance).
- **Bộ mẫu nghiệp vụ có sẵn**:
  - 🛒 *So sánh sản phẩm & Nhà cung cấp* (Tên, Giá, Đơn vị, Nhà bán, Đánh giá, Link).
  - 📝 *Ghi chú & Tổng hợp nghiên cứu* (Tiêu đề, Tác giả, Ngày, Tóm tắt, Trích dẫn gốc).
  - 🏢 *Danh sách doanh nghiệp & Đối tác* (Tên công ty, Ngành nghề, Website, Email, SĐT).

### 2. Quản lý bộ dữ liệu & Xuất file an toàn
- **Lưu trữ Dataset**: Lưu trữ nhiều bảng dữ liệu riêng biệt trên máy và đồng bộ lên server.
- **Chống trùng lặp (Deduplication)**: Tự động phát hiện và bỏ qua các liên kết đã thu thập trước đó.
- **Xuất CSV chống Formula Injection**: Tự động mã hóa an toàn các ký tự nguy hiểm (`=`, `+`, `-`, `@`), chèn mã UTF-8 BOM (`\uFEFF`) để mở tiếng Việt không bị lỗi font trên Microsoft Excel.

### 3. Kế thừa trọn vẹn sức mạnh JobTrack Pro
- **Lưu tin 1-click**: Tự động cào tin tuyển dụng từ LinkedIn, TopCV, ITviec, VietnamWorks và đồng bộ vào bảng Kanban.
- **🎯 Chấm điểm ATS Match Score**: Đánh giá độ phù hợp của hồ sơ (0–100%), đối soát từ khóa đã khớp và từ khóa thiếu.
- **✍️ AI Thư xin việc & InMail**: Tạo Cover Letter chuyên nghiệp và tin nhắn HR bằng tiếng Việt hoặc tiếng Anh chuẩn quốc tế.
- **⚡ Assisted Auto-Apply**: Tự động điền thông tin từ hồ sơ ứng viên vào các biểu mẫu ứng tuyển trên web.

### 4. Giao diện Side Panel & Ghép nối an toàn
- **Hỗ trợ Side Panel (Chrome & Cốc Cốc)**: Tiện ích bám cạnh trình duyệt, không bị tự đóng khi chuyển tab hoặc bôi đen văn bản.
- **Ghép nối 1-click (Extension Pairing)**: Đăng nhập Web App và bấm kết nối tự động, token được lưu an toàn trong `chrome.storage.local` với phạm vi quyền (scopes) tối thiểu, không rò rỉ qua cloud sync.
- **Thanh toán Pro ở chế độ thử nghiệm**: Tiện ích hiển thị mã đơn và thông báo thanh toán do máy chủ trả về. Gói Pro chỉ được kích hoạt khi máy chủ nhận webhook thanh toán có chữ ký hợp lệ, nên bản cài này không hiển thị mã QR ngân hàng và không tự kích hoạt Pro.

---

## 📦 Hướng dẫn cài đặt vào trình duyệt (Developer Mode)

### Bước 1: Mở trang Quản lý tiện ích mở rộng
- Trên **Google Chrome**: Truy cập `chrome://extensions/`
- Trên **Cốc Cốc**: Truy cập `coccoc://extensions/`
- Trên **Microsoft Edge**: Truy cập `edge://extensions/`

### Bước 2: Bật chế độ Nhà phát triển (Developer mode)
- Gạt công tắc **"Developer mode"** ở góc trên bên phải màn hình sang trạng thái **BẬT (ON)**.

### Bước 3: Nạp tiện ích mở rộng đã giải nén
- Bấm nút **"Load unpacked"** (Tải tiện ích đã giải nén).
- Chọn thư mục:
  ```text
  D:\Project\Job_Application_Tracker\packages\jobtrack-extension
  ```
- Tiện ích **"PageWeave — Web Data Assistant & JobTrack Pro"** sẽ xuất hiện trên thanh công cụ.

---

## ⚙️ Hướng dẫn ghép nối tài khoản

1. Mở ứng dụng JobTrack Web tại `http://127.0.0.1:64364` và đăng nhập tài khoản của bạn.
2. Bấm vào icon **PageWeave** trên thanh công cụ trình duyệt để mở Side Panel / Popup.
3. Chuyển sang tab **⭐ Gói Pro** -> bấm nút **"🔗 Kết nối với Web App"**.
4. Tiện ích sẽ tự động nhận diện và hoàn tất ghép nối mà không cần nhập token thủ công!
