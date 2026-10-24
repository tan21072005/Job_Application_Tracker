# Báo cáo Phủ 33 Màn hình Draw.io (Screen Coverage 33) & Nghiệm thu A20

Tài liệu đối chiếu và chứng minh độ phủ toàn diện 33 màn hình (`00` đến `32`) từ bộ thiết kế gốc `design/JobTrack-UI.drawio` và `design/screen-index.json` vào ứng dụng web/mobile JobTrack (`apps/web`).

---

## 1. Bảng đối chiếu 33 Màn hình (Master Inventory Mapping)

| STT | Mã màn hình Draw.io | Tên màn hình gốc | Thành phần mã nguồn thực tế (`apps/web`) | Trạng thái | Ghi chú & Quyết định thiết kế |
|:---:|:---|:---|:---|:---:|:---|
| 00 | `00 Tổng quan giao diện` | Application Shell & Layout | `apps/web/src/JobTrack.tsx` (`.app-shell`, `.sidebar`, `.workspace`, `.topbar`, `.bottom-nav`) | **Implemented** | Layout đa tầng thích ứng, sidebar cố định desktop, topbar gọn và bottom-nav trên mobile. |
| 01 | `01 Hệ thiết kế` | Design System, Typography & Tokens | `apps/web/src/jobtrack.css` (`:root` tokens, font Noto Sans, color variables) | **Implemented** | Chuẩn hóa bảng màu, tương phản WCAG AA, khoảng cách, bo góc 8px/12px/16px, hiệu ứng chuyển cảnh. |
| 02 | `02 Đăng nhập` | Auth - Login View | `apps/web/src/views/Auth.tsx` (chế độ đăng nhập) | **Implemented** | Hỗ trợ đăng nhập email/mật khẩu, ghi nhớ phiên, xử lý lỗi xác thực, phím tắt Enter. |
| 03 | `03 Đăng ký` | Auth - Register View | `apps/web/src/views/Auth.tsx` (chế độ đăng ký) | **Implemented** | Đăng ký tài khoản mới, kiểm tra độ dài mật khẩu, tự động khởi tạo dữ liệu khởi đầu. |
| 04 | `04 Dashboard` | Candidate Dashboard | `apps/web/src/views/Dashboard.tsx` | **Implemented** | Thẻ việc cần làm gấp (Focus Panel), lịch phỏng vấn sắp tới (Schedule Panel), tóm tắt số liệu 4 chỉ số chính. |
| 05 | `05 Danh sách hồ sơ` | Applications Table & Grid | `apps/web/src/views/Applications.tsx` | **Implemented** | Bảng danh sách với phân trang/scroll, bộ lọc trạng thái, tìm kiếm tức thì, sắp xếp theo deadline/ngày nộp. |
| 06 | `06 Pipeline` | Kanban Board by Status | `apps/web/src/views/Applications.tsx` (chế độ xem Kanban Pipeline) | **Implemented** | Bảng trực quan hóa 7 cột giai đoạn tuyển dụng, kéo thả/chuyển trạng thái, hiển thị SLA cảnh báo trễ hạn. |
| 07 | `07 Tạo hồ sơ` | Create Application Modal | `apps/web/src/components/forms.tsx` (`<ApplicationForm app={undefined}>`) | **Implemented** | Hộp thoại nhập thông tin công ty, vị trí, mức lương, hạn chót, chế độ làm việc (Remote/Hybrid/Onsite). |
| 08 | `08 Sửa hồ sơ` | Edit Application Modal | `apps/web/src/components/forms.tsx` (`<ApplicationForm app={selected}>`) | **Implemented** | Sửa đổi thông tin chi tiết của hồ sơ hiện có với cơ chế kiểm soát optimistic locking (ETag/version). |
| 09 | `09 Chi tiết hồ sơ` | Application Detail View | `apps/web/src/views/Detail.tsx` (tab Thông tin chung) | **Implemented** | Hiển thị toàn bộ trường dữ liệu, lịch sử cập nhật, liên kết JD, bước hành động tiếp theo. |
| 10 | `10 Các vòng phỏng vấn` | Detail View - Interviews Tab | `apps/web/src/views/Detail.tsx` (tab Vòng phỏng vấn) | **Implemented** | Danh sách các vòng phỏng vấn theo trình tự thời gian, trạng thái đã lên lịch/hoàn thành/hủy. |
| 11 | `11 Thêm phỏng vấn` | Schedule Interview Modal | `apps/web/src/components/forms.tsx` (`<InterviewForm>`) | **Implemented** | Đặt lịch vòng mới: tiêu đề, thời gian, hình thức (Online/Trực tiếp), địa điểm/link họp, nội dung chuẩn bị. |
| 12 | `12 Sửa và dời lịch` | Edit/Reschedule Interview Modal | `apps/web/src/components/forms.tsx` (`<InterviewForm interview={round}>`) | **Implemented** | Cập nhật thời gian hoặc dời lịch phỏng vấn, ghi chú sau buổi trao đổi. |
| 13 | `13 Trùng hồ sơ đang hoạt động` | Duplicate Active Job Conflict | `apps/web/src/JobTrack.tsx` (hàm `changeStatus` & kiểm tra `duplicate`) | **Implemented** | Ngăn chặn việc nộp trùng vào cùng một vị trí/công ty khi hồ sơ trước đó vẫn đang active. |
| 14 | `14 Xác nhận ứng tuyển lại` | Reapply Confirmation Dialog | `apps/web/src/components/forms.tsx` (`confirm-reapply`) | **Implemented** | Hộp thoại cảnh báo và xác nhận khi ứng viên nộp lại vào công ty đã từng bị Từ chối hoặc Đã rút trước đó. |
| 15 | `15 Xóa hồ sơ` | Move to Trash / Delete Dialog | `apps/web/src/JobTrack.tsx` (`setDeletion({ app })`) | **Implemented** | Hộp thoại xác nhận chuyển hồ sơ vào Thùng rác (soft-delete 30 ngày) kèm thông tin số vòng phỏng vấn bị ảnh hưởng. |
| 16 | `16 Xóa phỏng vấn` | Delete Interview Round Dialog | `apps/web/src/JobTrack.tsx` (`setDeletion({ app, round })`) | **Implemented** | Hộp thoại xác nhận xóa riêng lẻ một vòng phỏng vấn mà vẫn bảo toàn hồ sơ ứng tuyển chính. |
| 17 | `17 Trạng thái rỗng` | Empty States | `apps/web/src/components/ui.tsx` (`<Empty>`) | **Implemented** | Hiển thị thông điệp hướng dẫn khi danh sách trống: chưa có hồ sơ, chưa có lịch phỏng vấn, thùng rác sạch. |
| 18 | `18 Loading và lỗi` | Loading & Error Boundaries | `apps/web/src/components/ErrorBoundary.tsx` & `JobTrack.tsx` (`.loading-state`) | **Implemented** | Khung hiển thị Skeleton loading, spinner, thông báo ngắt kết nối máy chủ kèm nút "Thử lại". |
| 19 | `19 Lỗi nhập liệu và múi giờ` | Form Errors & Timezone Notices | `apps/web/src/components/forms.tsx` (`.field-error`, `.field-help`) | **Implemented** | Báo lỗi trực quan từng ô nhập liệu, chuẩn hóa định dạng ngày giờ theo múi giờ địa phương (`resolveLocalTime`). |
| 20 | `20 Mobile đăng nhập` | Mobile Auth Login | `apps/web/src/views/Auth.tsx` (`@media(max-width:700px)`) | **Implemented** | Giao diện đăng nhập tối ưu cho màn hình cảm ứng, ẩn bớt hình minh họa cồng kềnh, bàn phím số/email chuẩn. |
| 21 | `21 Mobile dashboard` | Mobile Dashboard Layout | `apps/web/src/views/Dashboard.tsx` (`@media(max-width:700px)`) | **Implemented** | Các khối thẻ co giãn 1 cột dọc, nút bấm to đạt kích thước tối thiểu 44px chống bấm nhầm. |
| 22 | `22 Mobile hồ sơ` | Mobile Applications List | `apps/web/src/views/Applications.tsx` (`@media(max-width:700px)`) | **Implemented** | Danh sách dạng danh thiếp cô đọng (card list), cuộn mượt, nút mở nhanh chi tiết. |
| 23 | `23 Mobile chi tiết` | Mobile Detail View | `apps/web/src/views/Detail.tsx` (`@media(max-width:700px)`) | **Implemented** | Chi tiết hồ sơ cuộn dọc liền mạch, thanh chuyển tab to dễ chạm, nút quay lại cố định. |
| 24 | `24 Mobile tạo hồ sơ` | Mobile Create App Form | `apps/web/src/components/forms.tsx` (`@media(max-width:700px)`) | **Implemented** | Hộp thoại toàn màn hình (full-screen modal), hỗ trợ kéo xuống đóng, input cỡ chữ 16px chống iOS tự phóng to. |
| 25 | `25 Mobile phỏng vấn` | Mobile Interviews Agenda | `apps/web/src/views/InterviewsView.tsx` (`@media(max-width:700px)`) | **Implemented** | Lịch phỏng vấn sắp xếp theo ngày, hiển thị thẻ giờ rõ ràng, nút gọi điện thoại/mở link họp nhanh. |
| 26 | `26 Mobile đăng ký` | Mobile Auth Register | `apps/web/src/views/Auth.tsx` (`@media(max-width:700px)`) | **Implemented** | Màn hình đăng ký thu gọn, tập trung vào form điền thông tin và cam kết bảo mật. |
| 27 | `27 Mobile pipeline` | Mobile Kanban Pipeline | `apps/web/src/views/Applications.tsx` (`.pipeline-scroll`) | **Implemented** | Thanh trượt ngang cảm ứng mượt mà qua 7 cột trạng thái, thẻ gọn hiển thị tên công ty và vị trí. |
| 28 | `28 Mobile thông tin bổ sung` | Mobile Additional Details | `apps/web/src/components/forms.tsx` (`<details className="additional-fields">`) | **Implemented** | Khối accordion mở rộng thông tin phụ (mức lương, URL, mã tin, nguồn tin) khi người dùng cần điền sâu. |
| 29 | `29 Mobile ghi chú hồ sơ` | Mobile Application Notes | `apps/web/src/views/Detail.tsx` (khối Ghi chú ứng tuyển) | **Implemented** | Vùng soạn thảo ghi chú tự co giãn chiều cao theo nội dung, lưu tự động khi rời ô. |
| 30 | `30 Mobile các vòng phỏng vấn` | Mobile Interview Timeline | `apps/web/src/views/Detail.tsx` (tab Vòng phỏng vấn) | **Implemented** | Dòng thời gian các vòng xếp dọc với icon phân loại hình thức (Online/Trực tiếp). |
| 31 | `31 Mobile chi tiết phỏng vấn` | Mobile Interview Detail Modal | `apps/web/src/components/forms.tsx` (`<InterviewForm>`) | **Implemented** | Chi tiết vòng phỏng vấn với các mục ghi chú chuẩn bị, thông tin người phỏng vấn. |
| 32 | `32 Mobile cảnh báo và xác nhận` | Mobile Dialogs, Alerts & Toasts | `apps/web/src/JobTrack.tsx` (`.toast`, `.dialog`) | **Implemented** | Toasts thông báo nổi ở đáy màn hình (trên bottom-nav), hộp thoại xác nhận hủy/xóa full-width. |

---

## 2. Tiêu chí Nghiệm thu A20 (Accessibility & Responsive Matrix)

### 2.1 Ma trận Responsive 4 Điểm dừng (Breakpoints)
- **320px (Mobile siêu nhỏ / iPhone SE gen 1)**:
  - Thử nghiệm: Toàn bộ bảng, form, thẻ và modal co về 1 cột, không có thanh cuộn ngang ngoài ý muốn (`scrollWidth === innerWidth`).
  - Font size tối thiểu 11px cho chú thích, 13px cho nội dung, 16px cho ô nhập liệu để tránh trình duyệt tự động zoom.
- **390px (Mobile hiện đại / iPhone 12, 13, 14, 15, Android phổ biến)**:
  - Thử nghiệm: Header và bottom navigation căn chuẩn safe-area-inset-bottom, thẻ việc làm hiển thị tối ưu 2 dòng, các nút bấm đạt kích thước chuẩn tap target ≥ 44px.
- **768px (Tablet / iPad Portrait)**:
  - Thử nghiệm: Bố cục 2 cột cho Dashboard (Focus Panel + Schedule Panel), bảng danh sách hiển thị thêm cột công ty và ngày nộp.
- **1440px (Desktop / MacBook & Màn hình lớn)**:
  - Thử nghiệm: Sidebar cố định 240px, Workspace co giãn linh hoạt với max-width hợp lý, bảng Kanban hiển thị đồng thời cả 7 cột không cần cuộn.

### 2.2 Khả năng tiếp cận & Trải nghiệm người dùng (a11y)
1. **Typography**:
   - Sử dụng font chữ tiêu chuẩn Google `Noto Sans` hỗ trợ trọn vẹn Unicode tiếng Việt với đầy đủ các dấu thanh sắc điệu, không bị vỡ hoặc lỗi font fallback.
2. **Keyboard Navigation & Focus Management**:
   - Có liên kết bỏ qua đầu trang (`<a className="skip-link" href="#main-content">Đến nội dung chính</a>`).
   - Tiêu đề chính nhận focus khi đổi trang (`headingRef.current?.focus()`).
   - Các hộp thoại (Dialog) có focus trap và đóng bằng phím `Escape`.
   - Form hỗ trợ phím `Enter` để lưu và `Shift + Enter` cho vùng văn bản nhiều dòng.
3. **Contrast & Trạng thái**:
   - Độ tương phản chữ đạt tiêu chuẩn WCAG 2.1 AA (tỷ lệ tối thiểu 4.5:1 cho văn bản thông thường và 3:1 cho văn bản lớn).
   - Đầy đủ các trạng thái giao diện: Default, Hover, Focus-Visible, Active, Disabled, Loading, Empty, Conflict, và Error.
4. **Không có Button Placeholder**:
   - 100% các nút bấm trên giao diện đều được gắn handler thực thi tính năng thực tế hoặc mở modal tương ứng.

---

## 3. Kết luận
Độ phủ giao diện đạt **33/33 màn hình (100%)**, đáp ứng toàn diện tiêu chí nghiệm thu **A20** của nhiệm vụ **C18**.
