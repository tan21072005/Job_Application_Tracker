# PRODUCT BRIEF — JobTrack

> Phiên bản: 1.0 · Ngày: 22/11/2026
> Trạng thái: **GO có điều kiện** — chỉ đi tiếp nếu qua 3 cổng kiểm chứng ở mục 15.
> Đối tượng đọc: chính bạn (người làm sản phẩm), không phải nhà đầu tư.

---

## 1. Tóm tắt một trang

**Sản phẩm là gì (một câu):**
JobTrack giúp người đang tìm việc biết **mình đã nộp ở đâu, chỗ nào còn hy vọng, và CV của mình đang thiếu gì so với mô tả công việc** — tất cả trong một màn hình, kể cả khi họ nộp qua TopCV, LinkedIn, Facebook, Zalo hay website công ty.

**Bán cho ai:**
Người đi làm 24–35 tuổi, 2–8 năm kinh nghiệm, **đang tìm việc tích cực trong 1–3 tháng**, nộp 10–30 vị trí qua nhiều kênh khác nhau.

**Bán cái gì (lát cắt duy nhất):**
`Dán JD + CV → thấy từ khóa còn thiếu → sửa 3 bullet → lưu bản CV riêng cho vị trí đó → theo dõi tới khi có kết quả.`

**Vì sao trả tiền:**
Không phải vì "quản lý cho gọn". Mà vì họ **đang mất cơ hội mà không biết vì sao**. Trả 149.000đ một lần cho 90 ngày để tăng xác suất được gọi phỏng vấn là rẻ so với một tháng lương đang chờ.

**Giá:**
- Miễn phí: 20 hồ sơ, 3 lần phân tích JD/CV mỗi tháng
- **Job Search Pass: 149.000đ / 90 ngày, trả một lần, không tự động trừ tiền**
- Pro năm: 499.000đ/năm (cho người theo dõi dài hạn)
- B2B: 2–5 triệu/tháng (trung tâm nghề nghiệp, bootcamp, agency tuyển dụng) — giai đoạn sau

**Điều kiện để đi tiếp:**
5 phỏng vấn người dùng thật → 3 người xác nhận nỗi đau nằm trong top 3 → 2 người nói sẽ trả 149k → 3 người đặt trước. Không đạt thì dừng hoặc đổi sang B2B.

**Điều phải sửa trước khi thu tiền:**
Chat AI đang gọi n8n qua ngrok và cấp quyền `full_control`; email đang in ra console; thanh toán đang giả lập; app chỉ chạy localhost; landing page tiếng Anh. Xem mục 16.

---

## 2. Chúng ta thực sự đang có gì

Nhìn thẳng, không tự khen:

| Thứ | Trạng thái thật |
|---|---|
| Đăng nhập, hồ sơ, pipeline 7 trạng thái | **Thật**, có phân quyền theo người dùng |
| CSV / ICS, nhắc việc, thùng rác, chống trùng | **Thật** |
| 40 bảng DB, 150 route API, 76 file test | **Thật**, có CI |
| "AI" ATS, lộ trình, radar văn hóa, ma trận quyết định | **Quy tắc if/else**, không phải LLM |
| Chat AI | Gọi n8n qua ngrok, có fallback hardcode, cấp `full_control` 10 phút |
| Email nhắc việc | `MAIL_TRANSPORT=console` — không gửi thật |
| Thanh toán | `PAYMENT_MODE=test` — không có cổng thật |
| Triển khai | Localhost, `COOKIE_SECURE=false` |
| Landing page | Tiếng Anh, CTA về GitHub, không có giá |

**Kết luận:** phần "quản lý hồ sơ" đã đủ tốt để bán. Phần "AI" và "thu tiền" thì chưa. Đừng kể với khách là có AI cho tới khi mục 16 xong.

---

## 3. Chân dung khách hàng (beachhead)

### 3.1 Người ta hay nói "người tìm việc phổ thông". Đó không phải một nhóm.

"Người tìm việc" gồm ít nhất 4 nhóm có nhu cầu và túi tiền rất khác nhau:

| Nhóm | Nộp bao nhiêu | Có trả tiền không | Vì sao |
|---|---|---|---|
| Sinh viên mới ra trường | 30–80 | Rất khó | Không có thu nhập, dùng free là đủ |
| **Người đi làm đang tìm việc tích cực** | **10–30** | **Có** | Đang có lương, mất cơ hội là mất tiền thật |
| Người tìm việc thụ động (có việc, xem cho biết) | 1–3 | Không | Không đau, không cần |
| Người mất việc / bị sa thải | 20–50 | Có, nhưng nhạy giá | Đau nhất, nhưng đang siết chi tiêu |

### 3.2 Nhóm chọn làm đầu tiên

**Chân dung hẹp:**

> Nam/nữ, 24–35 tuổi, 2–8 năm kinh nghiệm, làm văn phòng (marketing, hành chính, kế toán, nhân sự, IT, sales, vận hành).
> Đang **chủ động** tìm việc, đã nộp ít nhất 5 chỗ trong 2 tuần qua.
> Nộp qua **nhiều kênh**: TopCV, LinkedIn, Facebook group, Zalo, email, website công ty.
> Có laptop, dùng điện thoại để tra cứu.
> Đã từng bị "im lặng" sau khi nộp và không hiểu vì sao.

**Vì sao chọn nhóm này:**
1. **Đang có thu nhập** → 149k không phải quyết định lớn.
2. **Đang trong giai đoạn gấp** → cần giải pháp ngay, không mua để "sau này dùng".
3. **Nộp nhiều kênh** → đây chính là chỗ TopCV và JobOKO không giúp được, vì họ chỉ thấy phần nộp trên nền tảng của họ.
4. **Đủ hiểu biết** để dùng web app, không cần hướng dẫn nhiều.

### 3.3 Anti-persona — không phục vụ

- Sinh viên năm 1–2 đi tìm việc làm thêm.
- Nhà tuyển dụng, HR, headhunter (trừ khi làm gói B2B riêng).
- Người tìm việc ở nước ngoài, cần xử lý visa/sponsorship.
- Người chỉ muốn "xem tin tuyển dụng" — họ dùng TopCV, không cần JobTrack.
- Freelancer tìm dự án — nhu cầu khác hẳn.

Ghi rõ ra để sau này không tự mở rộng phạm vi rồi loãng sản phẩm.

---

## 4. Nỗi đau, định lượng

### 4.1 Nỗi đau thật không phải "quản lý cho gọn"

Người dùng không thức dậy và nghĩ "tôi cần một công cụ quản lý". Họ nghĩ:

1. *"Tôi nộp 30 chỗ rồi, giờ không nhớ chỗ nào tới đâu."*
2. *"Có chỗ im lặng 3 tuần, không biết nên nhắn lại hay bỏ."*
3. *"Tôi rớt 5 chỗ rồi mà không biết mình sai ở đâu."*
4. *"Mỗi chỗ lại phải sửa CV một kiểu, tôi toàn dùng một bản cho tất cả."*

Câu 3 là câu đau nhất và cũng là câu **chưa có công cụ nào ở Việt Nam trả lời tử tế**. TopCV cho bạn lịch sử ứng tuyển, nhưng không nói "CV của bạn thiếu 6 từ khóa so với JD này". Đó là khoảng trống.

### 4.2 Ước tính chi phí (giả định — phải kiểm chứng)

Một người nộp 20 vị trí trong 8 tuần:

| Việc | Thời gian mỗi lần | Tổng |
|---|---|---|
| Đọc lại JD | 10 phút | 200 phút |
| Chỉnh CV cho khớp | 20 phút | 400 phút |
| Điền form / thư giới thiệu | 10 phút | 200 phút |
| Ghi chép, theo dõi | 10 phút | 200 phút |
| **Tổng** | | **~17 giờ** |

17 giờ là **hơn 2 ngày làm việc**. Nhưng thời gian không phải chi phí lớn nhất.

Chi phí lớn nhất là **cơ hội bị bỏ lỡ**:
- Một lần quên follow-up đúng lúc HR đang cân nhắc → mất một tháng lương.
- Một CV không khớp JD bị lọc tự động → mất luôn cơ hội, và không bao giờ biết.
- Nộp tràn lan 30 chỗ bằng một CV → tỉ lệ gọi phỏng vấn thấp, nhưng không biết vì sao.

**Cách định giá trị:** nếu JobTrack giúp tăng xác suất có ít nhất 1 lời mời phỏng vấn thêm 10%, với người đang chờ 1 tháng lương 15 triệu, giá trị kỳ vọng là 1,5 triệu. Bán 149k là 10% giá trị đó. Con số này là **giả định**, không phải bằng chứng — nó chỉ dùng để giải thích logic định giá, không dùng để quảng cáo.

### 4.3 Điều phải kiểm chứng

Không được mặc định những điều trên là đúng. Cụ thể:

- [ ] Người dùng có thật sự nộp qua ≥3 kênh không, hay thực tế chỉ 1–2?
- [ ] Họ có nhớ sai trạng thái hồ sơ không, hay họ dùng Excel/ghi chú điện thoại và thấy đủ?
- [ ] "Không biết vì sao bị từ chối" có phải nỗi đau họ chủ động nhắc tới không?
- [ ] Họ có sẵn sàng dán JD + CV vào một web app lạ không? (Lo ngại riêng tư.)

Nếu câu 2 trả lời là "Excel đủ rồi", sản phẩm này không có lý do tồn tại với nhóm đó. Phải biết trước khi build thêm.

---

## 5. Vì sao bây giờ

Ba lý do, không hơn:

1. **Thị trường lao động văn phòng ở Việt Nam đã khó hơn 2022.** Sa thải ở tech/tài chính, tuyển dụng chậm lại, nhiều người 2–8 năm kinh nghiệm phải tìm lại việc. Nhóm này đông hơn và đang chịu áp lực thời gian.

2. **Chi phí phân tích JD/CV bằng LLM đã đủ rẻ.** Một lần so khớp JD với CV tốn vài trăm đồng tới vài nghìn đồng. Năm 2023 không làm được ở mức giá này; giờ làm được. Đây là điều kiện kỹ thuật khiến "chỉ ra thiếu gì" trở thành khả thi.

3. **TopCV và JobOKO mạnh về tin tuyển dụng, không mạnh về theo dõi xuyên kênh.** Họ có động lực giữ người dùng ở lại nền tảng của họ. Một công cụ trung lập, theo dõi mọi kênh, là góc họ khó đánh.

**Cảnh báo:** cả 3 lý do đều có thể sai. Nếu TopCV ra tính năng tương tự, lợi thế biến mất. Đừng xây hào kinh tế dựa trên "họ không làm" — hãy dựa trên "dữ liệu người dùng đã nhập vào JobTrack thì không chuyển đi dễ".

---

## 6. Bức tranh 10 sao

Nếu mọi thứ hoàn hảo, người dùng nói gì sau 3 tháng?

> "Tôi không cần nhớ mình đã nộp ở đâu. Mỗi sáng mở điện thoại, có đúng 2 việc: nộp bản CV đã tối ưu cho vị trí A (deadline hôm nay), và nhắn lại cho chị HR bên B vì đã 6 ngày chưa phản hồi. Khi tôi rớt, nó chỉ ra tôi thiếu 'quản lý ngân sách' và 'SQL' so với JD — tôi biết phải học gì. Tôi đậu sau 7 tuần, và không mất chỗ nào vì quên."

Bốn thành phần của bức tranh đó:
1. **Không phải nhớ** — mọi thứ ở một chỗ, kể cả nộp ngoài hệ thống.
2. **Biết việc tiếp theo** — không phải danh sách 40 việc, mà 1–3 việc đúng lúc.
3. **Hiểu vì sao** — có phản hồi về khoảng cách CV ↔ JD, không chỉ "đã nộp".
4. **Kết quả** — được gọi phỏng vấn, đậu. Đây mới là thứ họ trả tiền.

Điều này quan trọng: **JobTrack không bán "quản lý hồ sơ". Nó bán "tăng cơ hội có việc".** Quản lý chỉ là phương tiện.

---

## 7. Lát cắt bán được (MVP wedge)

### 7.1 Một luồng, không phải 14

```
1. Người dùng dán JD (hoặc dán link) + chọn CV
2. Hệ thống trả về:
   - Điểm khớp tổng (0–100) — chỉ để định hướng, không phải điểm số tuyệt đối
   - 5–8 từ khóa/kỹ năng JD yêu cầu mà CV KHÔNG có
   - 3 từ khóa CV có nhưng JD không cần (nên bỏ bớt)
   - 3 bullet gợi ý viết lại, dựa trên kinh nghiệm THẬT trong CV
3. Người dùng sửa, lưu thành "CV cho vị trí này"
4. Hồ sơ ứng tuyển được tạo, gắn với bản CV đó
5. Nhắc follow-up sau 5–7 ngày nếu chưa có phản hồi
6. Khi có kết quả (phỏng vấn / rớt), ghi lại lý do nếu biết
```

### 7.2 Vì sao đúng lát cắt này

- **Có đầu ra rõ ràng:** không phải "công cụ", mà là "một bản CV tốt hơn cho một vị trí cụ thể".
- **Có lý do quay lại:** mỗi lần nộp việc mới là một lần dùng lại.
- **Có lý do trả tiền:** giới hạn 3 lần/tháng ở bản free là điểm chặn tự nhiên, không cần làm khó chịu.
- **Tận dụng được phần đã có:** hồ sơ, pipeline, nhắc việc, CV library, ATS đều đã tồn tại — chỉ cần thay lõi if/else bằng LLM thật và nối đúng luồng.

### 7.3 Điều KHÔNG làm trong v1

- Không làm chatbot tuyển dụng.
- Không làm "radar việc làm" (cạnh tranh trực tiếp TopCV, thua chắc).
- Không làm outreach tự động tới HR.
- Không làm dự báo lương/ESOP.
- Không làm dossier chia sẻ công khai.
- Không làm mobile app native.

Những thứ này vẫn còn trong code. Chỉ cần **ẩn khỏi menu chính** và khỏi landing page. Đừng xoá — sau này có thể bán thành gói riêng.

---

## 8. Thứ phải giấu đi (v1)

Menu hiện tại có 14 công cụ. Người mới vào sẽ không biết bấm gì. Đề xuất:

**Hiện trên menu chính (5 mục):**
1. Tổng quan (hôm nay làm gì)
2. Hồ sơ ứng tuyển (pipeline)
3. Phân tích JD ↔ CV ← **mục bán hàng**
4. Thư viện CV
5. Cài đặt

**Ẩn vào "Nâng cao":**
- Mạng lưới kết nối, Hộp thư thông minh, Chiến dịch Outreach
- So sánh cơ hội, Hồ sơ công ty, Radar văn hóa
- Giả lập phỏng vấn, Tốc độ pipeline, Dự báo thu nhập
- Hồ sơ bảo chứng, Rada việc làm, PageWeave

Lý do: mỗi mục thêm vào menu làm giảm khả năng người dùng hiểu sản phẩm bán gì. 14 mục đọc như "đồ nghề của một người rảnh", không đọc như "công cụ giúp tôi có việc".

---

## 9. Đối thủ

| Đối thủ | Họ mạnh gì | Họ yếu gì | Mình đánh ở đâu |
|---|---|---|---|
| **TopCV** | 9,5 triệu+ người tìm việc, 60k tin/ngày, CV builder free, lịch sử ứng tuyển | Chỉ thấy việc nộp trên TopCV; không phân tích CV ↔ JD sâu; không nhắc follow-up ngoài hệ thống | Theo dõi **xuyên kênh** + chỉ ra thiếu gì |
| **JobOKO** | 85k+ tin, công cụ CV free | Cùng giới hạn nền tảng | Như trên |
| **LinkedIn** | Chuẩn quốc tế, nhiều việc tech | Không phổ biến với văn phòng Việt; không theo dõi nộp ngoài LinkedIn | Thị trường Việt, đa kênh |
| **Excel / Google Sheets / Notion** | Miễn phí, quen thuộc, linh hoạt | Không nhắc việc, không phân tích CV, không có "việc tiếp theo" | Tự động hoá phần nhắc + phân tích |
| **Ghi chú điện thoại / trí nhớ** | Không cần học | Mất, không chia sẻ, không tổng hợp | Đây là đối thủ thật của 60% người dùng |
| **Huntr / Teal (toàn cầu)** | Tính năng mạnh, có AI | Tiếng Anh, giá USD, không có JD tiếng Việt | Ngôn ngữ + giá + JD Việt |

**Kết luận cạnh tranh:**
Không thắng TopCV ở kho tin. Không thắng Excel ở giá. Chỉ thắng ở chỗ: **một người nộp việc qua 4 kênh, và không ai trong 4 kênh đó nói cho họ biết toàn cảnh + thiếu gì.**

Nếu phỏng vấn cho thấy người dùng thật ra chỉ nộp 1 kênh, luận điểm này sụp. Đó là lý do câu hỏi số 1 trong mục 4.3 quan trọng nhất.

---

## 10. Định giá & đóng gói

### 10.1 Nguyên tắc

Tìm việc là **chặng đua 1–3 tháng**, không phải lối sống. Vì vậy:

- **Không bán subscription tháng** làm gói chính. Người dùng sẽ cảm thấy bị trừ tiền sau khi đã có việc.
- **Bán "Job Search Pass" 90 ngày, trả một lần.** Đúng độ dài một cuộc tìm việc. Không tự động gia hạn.
- Đây là điểm khác biệt về *cách bán*, không chỉ về tính năng. Nó giảm rào cản tâm lý "sợ bị trừ tiền" — vốn rất thật ở Việt Nam.

### 10.2 Bảng giá

| Gói | Giá | Gồm gì | Dành cho |
|---|---|---|---|
| **Free** | 0đ | 20 hồ sơ, 3 lần phân tích JD/CV mỗi tháng, nhắc việc cơ bản, xuất CSV | Người mới thử, người tìm việc nhẹ |
| **Job Search Pass** | **149.000đ / 90 ngày** | Không giới hạn hồ sơ, 50 lần phân tích, CV không giới hạn, nhắc follow-up qua email, xuất báo cáo | **Gói chính** — người đang tìm tích cực |
| **Pro năm** | 499.000đ / năm | Như Pass + theo dõi dài hạn, lịch sử nhiều chu kỳ tìm việc | Người muốn giữ dữ liệu nghề nghiệp lâu dài |
| **B2B** | 2–5 triệu/tháng | 20–100 tài khoản, bảng điều khiển cho coach/trung tâm, xuất dữ liệu | Trung tâm nghề nghiệp, bootcamp, agency |

**Giá giới thiệu 50 người đầu:** 99.000đ cho Pass, đổi lại 1 buổi phỏng vấn 15 phút và quyền dùng phản hồi của họ (ẩn danh). Đây vừa là giảm giá, vừa là kênh nghiên cứu.

### 10.3 Vì sao không bán rẻ hơn

- 49k/tháng nghe rẻ nhưng tổng 3 tháng = 147k, gần bằng Pass, mà lại gây cảm giác bị trừ tiền.
- Dưới 99k, người dùng không coi trọng, và bạn không đủ tiền trả chi phí LLM + hạ tầng.
- Bán 149k cho 50 người = 7,45 triệu. Không giàu, nhưng đủ chứng minh có người trả tiền. Đó là mục tiêu của giai đoạn này, không phải doanh thu.

### 10.4 Điều chưa biết

Chưa có dữ liệu willingness-to-pay của người Việt cho công cụ tìm việc. **149k là giả thuyết, không phải sự thật.** Cách kiểm chứng rẻ nhất: landing page có nút "Đặt trước 99k" và đo số người bấm, trước khi build thanh toán thật.

---

## 11. Chỉ số

### 11.1 Chỉ số chính (North Star)

> **Số người dùng có ≥5 hồ sơ VÀ quay lại trong 7 ngày.**

Vì sao không phải "số đăng ký": đăng ký là miễn phí và vô nghĩa. Vì sao không phải "số hồ sơ": một người nhập 50 hồ sơ trong 1 buổi rồi bỏ đi cũng đếm được, nhưng không phải khách hàng.

### 11.2 Chỉ số theo tầng

| Tầng | Chỉ số | Mục tiêu 8 tuần |
|---|---|---|
| Acquisition | Người vào landing → đăng ký | ≥15% |
| Activation | Đăng ký → 3 hồ sơ + 1 lần phân tích trong 24h | ≥40% |
| Retention | Quay lại trong 7 ngày | ≥30% |
| Revenue | Free → trả tiền trong 14 ngày | ≥8% |
| Outcome (tự báo cáo) | Có ≥1 lời mời phỏng vấn trong 30 ngày | ≥25% |
| Guardrail | Hoàn tiền / khiếu nại | <5% |

### 11.3 Chỉ số không theo đuổi

- Số lượt xem trang (không nói lên gì).
- Số tính năng đã build (càng nhiều càng loãng).
- Số người theo dõi mạng xã hội (không trả tiền).

---

## 12. Giả định & cách kiểm chứng

Mọi thứ trong tài liệu này đều là giả định cho tới khi có bằng chứng. Liệt kê rõ để không tự lừa mình:

| # | Giả định | Cách kiểm chứng | Nếu sai thì sao |
|---|---|---|---|
| A1 | Người dùng nộp qua ≥3 kênh | Hỏi 5 người, xem lịch sử email/trình duyệt của họ | Nếu chỉ 1 kênh → mất lợi thế xuyên kênh, phải đổi hướng sang "chất lượng CV" thuần |
| A2 | "Không biết vì sao rớt" là nỗi đau top 3 | Hỏi mở, không gợi ý; xem họ có tự nhắc không | Nếu không → bán "tiết kiệm thời gian", định giá thấp hơn |
| A3 | Sẵn sàng trả 149k cho 90 ngày | Landing page + nút đặt trước; 3 người trả thật | Nếu không → hạ xuống 99k, hoặc chuyển B2B |
| A4 | Sẵn sàng dán JD + CV vào web lạ | Hỏi trực tiếp về lo ngại dữ liệu; thử nghiệm với 3 người | Nếu không → phải có cam kết xoá dữ liệu, hoặc xử lý offline |
| A5 | LLM đủ tốt để phân tích JD tiếng Việt | Chạy thử 20 cặp JD/CV thật, đọc kết quả | Nếu kém → dùng mô hình tốt hơn, chi phí tăng, giá phải tăng |
| A6 | Có thể giữ chân 30% sau 7 ngày | Đo trên 20 người dùng đầu | Nếu thấp → sản phẩm chưa đủ giá trị, đừng scale |

**Quy tắc:** không build thêm tính năng nào cho tới khi A1 và A3 có câu trả lời. Đây là quy tắc khó nhất và quan trọng nhất.

---

## 13. Kế hoạch 2 tuần (kiểm chứng, không build)

### Tuần 1 — Nói chuyện với người thật

**Mục tiêu:** 5 cuộc phỏng vấn 20–25 phút với người đang tìm việc tích cực.

**Cách tìm:**
- 3 người từ Facebook group tìm việc (đăng bài "mình đang làm công cụ nhỏ, xin 20 phút hỏi chuyện, không bán gì").
- 2 người từ mạng cá nhân (bạn bè, đồng nghiệp cũ đang tìm việc).

**Bộ câu hỏi (hỏi mở, không gợi ý):**
1. Lần tìm việc gần nhất của bạn kéo dài bao lâu? Bạn nộp khoảng bao nhiêu chỗ?
2. Bạn nộp ở đâu? Kể tên các kênh.
3. Làm sao bạn biết chỗ nào đang tới đâu? (Đừng gợi ý "bạn có dùng Excel không".)
4. Có lần nào bạn quên follow-up và mất cơ hội không? Kể cụ thể.
5. Khi bị từ chối, bạn có biết vì sao không? Bạn có muốn biết không?
6. Bạn có bao giờ chỉnh CV cho từng vị trí không? Vì sao có/không?
7. Nếu có công cụ chỉ ra CV thiếu từ khóa gì so với JD, bạn có dùng không? Vì sao?
8. Bạn đã từng trả tiền cho công cụ tìm việc chưa? Bao nhiêu? Cảm giác thế nào?

**Không được làm:** không pitch sản phẩm trong 15 phút đầu. Không hỏi "bạn có thích ý tưởng này không" (ai cũng nói thích). Chỉ hỏi về hành vi đã xảy ra.

**Đầu ra:** bảng 5 dòng, mỗi người 1 dòng: số kênh, có nhớ trạng thái không, nỗi đau lớn nhất, có sẵn sàng trả không.

### Tuần 2 — Dựng landing page bán trước

**Mục tiêu:** 10 người để lại email, 3 người bấm "Đặt trước 99k".

**Nội dung landing (tiếng Việt, 1 trang):**
- Tiêu đề: *"Nộp 20 chỗ, nhớ 0 chỗ? JobTrack giữ hộ bạn — và chỉ ra CV còn thiếu gì."*
- 3 khối: (1) theo dõi mọi kênh, (2) phân tích JD ↔ CV, (3) nhắc follow-up đúng lúc.
- Ảnh chụp màn hình thật (đã có 17 ảnh trong `docs/screenshots`).
- Bảng giá 3 gói.
- Nút: "Dùng thử miễn phí" và "Đặt trước 99k (50 suất đầu)".
- Dòng cam kết: "Không tự động trừ tiền. Xoá dữ liệu bất cứ lúc nào."

**Đo:** dùng Plausible hoặc Umami (nhẹ, không cookie), không cần Google Analytics.

**Quyết định sau 2 tuần:**
- ≥3 đặt trước → build tiếp.
- 1–2 đặt trước → phỏng vấn thêm 5 người, tìm hiểu vì sao chưa tin.
- 0 đặt trước nhưng ≥10 email → giữ free, tìm mô hình B2B.
- 0 email, 0 đặt trước → dừng. Đây là kết quả tốt: tiết kiệm 3 tháng.

---

## 14. ICE — chọn việc làm trước

Thang 1–10. Điểm = trung bình cộng. Impact = tác động tới North Star; Confidence = độ tin vào tác động; Ease = dễ làm với code hiện có.

| # | Việc | I | C | E | Điểm | Kết luận |
|---|---|---|---|---|---|---|
| 1 | **Phân tích JD ↔ CV bằng LLM thật** | 9 | 7 | 6 | **7,3** | Làm ngay — là lõi bán hàng |
| 2 | **Nhắc follow-up qua email thật** | 7 | 8 | 7 | **7,3** | Làm ngay — đã có sẵn logic, chỉ thiếu transport |
| 3 | **CV riêng cho từng vị trí** | 7 | 7 | 7 | **7,0** | Làm ngay — đã có CV library |
| 4 | Ngân hàng câu hỏi phỏng vấn | 6 | 6 | 8 | 6,7 | Làm sau, rẻ |
| 5 | Thêm nhanh từ mọi kênh (bookmarklet/dán link) | 8 | 6 | 5 | 6,3 | Làm sau — quan trọng nhưng khó |
| 6 | Bảng phân tích pipeline | 4 | 7 | 8 | 6,3 | Đã có, chỉ cần sửa |
| 7 | Điểm ATS | 6 | 5 | 7 | 6,0 | Gộp vào #1, đừng làm riêng |
| 8 | Ma trận so sánh cơ hội | 4 | 5 | 7 | 5,3 | Ẩn đi |
| 9 | Dossier chia sẻ | 4 | 5 | 6 | 5,0 | Ẩn đi |
| 10 | Chiến dịch outreach | 5 | 4 | 4 | 4,3 | Ẩn đi |
| 11 | Rada việc làm | 5 | 4 | 3 | 4,0 | Ẩn đi — cạnh tranh TopCV |
| 12 | Dự báo lương/ESOP | 3 | 4 | 3 | 3,3 | Ẩn đi |

**Ba việc đầu tạo thành một gói hoàn chỉnh:** phân tích → lưu bản CV → nhắc theo dõi. Đúng luồng ở mục 7.1. Làm 3 việc này, ẩn phần còn lại, là đủ một sản phẩm bán được.

---

## 15. Go / No-go

### Quyết định: **GO có điều kiện**

Không phải vì ý tưởng hay. Vì:
- Có code thật, chạy thật, không phải slide.
- Có một góc cạnh tranh rõ: xuyên kênh + chỉ ra khoảng cách CV.
- Chi phí thử nghiệm thấp: 2 tuần, gần như không code.

Nhưng **không được build thêm** cho tới khi qua cổng 1.

### Ba cổng

| Cổng | Thời điểm | Điều kiện qua | Nếu không qua |
|---|---|---|---|
| **1. Nỗi đau** | Hết tuần 1 | ≥3/5 người nói "không biết vì sao rớt" hoặc "quên follow-up" là nỗi đau top 3; ≥3/5 nộp qua ≥3 kênh | Đổi định vị sang "CV optimizer" thuần, hoặc dừng |
| **2. Sẵn sàng trả** | Hết tuần 2 | ≥3 người bấm đặt trước 99k (có thể thu tiền thật qua chuyển khoản) | Hạ giá, hoặc chuyển B2B |
| **3. Giữ chân** | Hết tuần 8 | ≥20 người dùng thật, ≥30% quay lại sau 7 ngày, ≥5 người trả tiền | Dừng scale, quay lại phỏng vấn |

### Điều kiện dừng hẳn

- Cổng 1 thất bại và phỏng vấn thêm 5 người vẫn thất bại.
- Không ai sẵn sàng trả bất kỳ mức giá nào sau 20 người dùng.
- Chi phí LLM + hạ tầng vượt 30% doanh thu ở mức giá 149k.

Dừng không phải thất bại. Đốt 6 tháng vào sản phẩm không ai trả tiền mới là thất bại.

---

## 16. Phải sửa trước khi thu tiền

Đây là danh sách chặn. Không sửa thì không được nhận tiền của ai.

| # | Vấn đề | Rủi ro | Việc cần làm |
|---|---|---|---|
| 1 | `/api/ai/chat` gọi n8n qua ngrok hardcode, cấp `full_control` 10 phút | Lộ dữ liệu người dùng, phụ thuộc dịch vụ ngoài, có thể bị lợi dụng | Bỏ n8n; gọi thẳng API LLM từ server; bỏ grant `full_control`; giới hạn quyền theo từng hành động |
| 2 | `MAIL_TRANSPORT=console` | Nhắc việc không bao giờ tới người dùng → mất lý do trả tiền | Cấu hình Brevo/Resend, xác thực domain (SPF/DKIM), test gửi thật |
| 3 | `PAYMENT_MODE=test` | Không thu được tiền | Tích hợp cổng Việt Nam (PayOS/Casso/SePay) hoặc Stripe; webhook + đối soát |
| 4 | Chỉ chạy localhost, `COOKIE_SECURE=false` | Không ai truy cập được; cookie không an toàn | VPS + domain + HTTPS (Caddy/Nginx), đặt `COOKIE_SECURE=true`, backup DB |
| 5 | Landing tiếng Anh, CTA về GitHub | Người Việt không hiểu, không có đường mua | Viết lại tiếng Việt, có giá, CTA đăng ký |
| 6 | Repo public, không có LICENSE | Người khác dùng lại code thương mại | Thêm LICENSE độc quyền, hoặc chuyển repo private trước khi bán |
| 7 | "AI" hiện tại là if/else | Nói dối khách, mất uy tín | Hoặc thay bằng LLM thật, hoặc đổi nhãn thành "gợi ý" |

**Thứ tự làm:** 1 → 4 → 2 → 3 → 5 → 6 → 7.
Lý do: (1) là rủi ro bảo mật, (4) là điều kiện để có người dùng, (2) là giá trị cốt lõi, (3) là tiền, (5)(6)(7) là hình thức.

---

## 17. Những điều không làm

Ghi ra để tự nhắc:

- Không thêm tính năng thứ 15.
- Không mua quảng cáo trước khi có 5 người trả tiền.
- Không gọi là "AI" khi chat còn kịch bản cứng.
- Không mở rộng sang nhà tuyển dụng khi chưa có 50 người dùng trả tiền.
- Không làm app mobile trước khi web có 100 người dùng hoạt động.
- Không đổi giá trước khi có 20 người dùng thật.
- Không viết lại kiến trúc vì "thấy chưa đẹp". Code hiện tại đủ dùng.

---

## 18. Việc tiếp theo, cụ thể

1. **Hôm nay:** đọc lại mục 13, chọn 5 người để nhắn. Không code.
2. **Tuần này:** phỏng vấn 5 người, ghi vào bảng 5 dòng.
3. **Tuần sau:** dựng landing tiếng Việt (có thể dùng chính `apps/landing`), gắn form đặt trước.
4. **Sau cổng 2:** mới bắt đầu sửa mục 16 theo thứ tự, rồi làm 3 việc ICE đầu.

Nếu chỉ nhớ một câu từ tài liệu này:

> **Bán "được gọi phỏng vấn", không bán "quản lý hồ sơ".**
