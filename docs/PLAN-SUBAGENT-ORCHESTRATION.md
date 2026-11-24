# PLAN — Phân công subagent cho 3 tính năng cốt lõi

> Trạng thái repo: `f6a7aa4` — local/remote SYNC OK, 14 hồ sơ thật
> **CHƯA CODE.** Plan này chờ bạn duyệt phân công model/thinking.

---

## PHẦN 0 — CAPABILITIES ĐÃ VERIFY (không suy đoán)

Gọi `orchestrator_capabilities` ngày 24/11, kết quả thật:

```
runtimeMode: full-access

antigravity  canRunChildTask: true   canRunCrossProviderChildTask: true   constraints: []
  gemini-3.8-flash          thought_level: low | medium | high  (default: high)
  claude-sonnet-4-6         thought_level: low | medium | high
  claude-opus-4-6-thinking  thought_level: low | medium | high
  gpt-oss-120b-medium       thought_level: low | medium | high
  runtimeModes: approval-required | auto-accept-edits | full-access

opencode     canRunChildTask: true   canRunCrossProviderChildTask: true   constraints: []
  deploy/deepseek-ai/deepseek-v4.1-flash-1017   variant: fast | balanced | deep
  opencode/claude-sonnet-5-5                    variant: low..max (default medium)
  opencode/claude-opus-5-5                      variant: low..max (default medium)
  opencode/claude-haiku-5-5                     variant: none..max
  + 78 model khác (omittedModels: 73)
  runtimeModes: approval-required | auto-accept-edits | auto | full-access
```

**Kết luận:** cả hai provider đều nhận child task, không bị disable. Tôi điều phối được cả hai.

**Khác biệt quan trọng:**

| | Antigravity | OpenCode |
|---|---|---|
| Tên option | `thought_level` | `variant` |
| Giá trị | low / medium / high | fast / balanced / deep |
| Model rẻ nhất | `gemini-3.8-flash` | `deepseek-v4.1-flash` |
| Có tốn quota Claude? | **Không** (Gemini free) | Không (DeepSeek) |

**Lưu ý từ ảnh bạn gửi:** Antigravity UI ghi `Gemini 3.8 Flash High — Leaving Soon`, và Sonnet/Opus đều có badge `Notice`. Nghĩa là Gemini sẽ bị thay thế sớm. Nhưng **hiện tại vẫn dùng được**, và theo yêu cầu của bạn thì đây là lựa chọn đúng.

---

## PHẦN 1 — TRẢ LỜI: CHIA MODEL & THINKING NHƯ THẾ NÀO

### Nguyên tắc phân bổ

| Loại việc | Provider | Model | Thinking | Lý do |
|---|---|---|---|---|
| **Đọc code, trace, tìm bug** | Antigravity | `gemini-3.8-flash` | **High** | Đọc nhiều file, cần suy luận sâu. Free, không tốn quota Claude |
| **Review code, tìm lỗi tiềm ẩn** | Antigravity | `gemini-3.8-flash` | **High** | Cần phán đoán, không cần viết code |
| **Viết code phức tạp** | OpenCode | `deepseek-v4.1-flash` | **deep** | Code chính xác, context dài |
| **Viết test** | OpenCode | `deepseek-v4.1-flash` | **balanced** | Việc cơ học, không cần suy luận sâu |
| **Việc đơn giản** (grep, liệt kê, format) | Antigravity | `gemini-3.8-flash` | **Low** | Nhanh, tiết kiệm |
| **Quyết định kiến trúc** | OpenCode (chính tôi) | `deepseek-v4.1-flash` | **deep** | Không delegate việc quan trọng nhất |

### Quy tắc ưu tiên (theo yêu cầu của bạn)

> **Kết quả giữa OpenCode và Antigravity giống nhau → ưu tiên Antigravity.**

Nghĩa là:
- Việc **cả hai làm được** → giao Antigravity (tiết kiệm quota OpenCode)
- Việc **chỉ OpenCode làm đúng** (cần write access phức tạp, cần tool OpenCode) → OpenCode
- Antigravity **chỉ dùng `gemini-3.8-flash`** — không đụng Sonnet/Opus

### Tại sao KHÔNG dùng Sonnet/Opus

| Lý do | Chi tiết |
|---|---|
| Quota | Mỗi subagent Opus tốn ~50k token. 5 subagent = 250k = hết quota ngày |
| Không cần thiết | Gemini 3.8 Flash High **đọc code tốt tương đương** Opus cho việc trace/review |
| Bạn đã dặn | "nếu dùng sonet và opus sẽ hết limit rất nhanh" |

**Sonnet/Opus chỉ dùng khi:** Gemini trả kết quả sai rõ ràng, hoặc việc cần suy luận kiến trúc cực khó mà tôi không tự làm được.

---

## PHẦN 2 — 5 SUBAGENT, PHÂN CÔNG CỤ THỂ

### Subagent 1: `ui-audit` — Antigravity / gemini-3.8-flash / **High**

**Việc:** Sửa nút bị bóp chữ trong card Kanban.

**Vấn đề cụ thể** (từ ảnh bạn gửi):
```
Tối ưu CV | Offer > | Chi tiết
            ^^^^^^ đáng lẽ "Chuyển sang Offer"
```

**File:** [Applications.tsx:715-757](F:\Project\Job_Application_Tracker\apps\web\src\views\Applications.tsx:715) — `.card-footer-actions` chứa 3 nút trong flexbox hẹp.

**Nhiệm vụ:**
1. Đọc `.card-footer-actions` CSS và 3 nút bên trong
2. Tìm nguyên nhân bóp: `flex-shrink`, `white-space`, `overflow`, hay width cố định?
3. Đề xuất fix **không làm card cao thêm** — ví dụ:
   - `text-overflow: ellipsis` + `title` tooltip (giữ 1 dòng)
   - Hoặc đổi nhãn thành icon + số (← →)
   - Hoặc 2 dòng: dòng 1 "Tối ưu CV", dòng 2 "→ Offer"
4. Trả về **diff cụ thể** (file:dòng + code cũ/mới)

**Output:** patch đề xuất, KHÔNG tự apply (tôi apply sau khi review).

---

### Subagent 2: `card-info` — OpenCode / deepseek-v4.1-flash / **balanced**

**Việc:** Thêm ngày nộp + nguồn lên card.

**Hiện tại card có:** monogram, position, company, SLA pill, tags, nextAction, deadline, 3 nút.

**Thiếu (theo phân tích đối thủ):**
- **Ngày nộp** — `app.appliedAt` đã có trong data, chưa hiển thị
- **Nguồn** — `app.source` đã có (TopCV/ITviec/LinkedIn), chỉ có icon mờ

**Nhiệm vụ:**
1. Đọc `ApplicationCard` component (trong `Applications.tsx`)
2. Thêm dòng meta: `📅 12/11 · TopCV` (ngày nộp + nguồn)
3. Xử lý trường hợp `appliedAt` null → hiện `Chưa nộp` hoặc ẩn
4. CSS: font 11px, màu muted, không làm card cao quá 8px
5. Trả về diff

**Tại sao OpenCode:** việc này cần sửa cả TSX + CSS, không cần suy luận sâu. DeepSeek balanced đủ.

---

### Subagent 3: `ats-factcheck` — Antigravity / gemini-3.8-flash / **High**

**Việc:** Thiết kế `fact_violations` cho ATS — phát hiện số liệu bịa.

**Bối cảnh:** JobTrack đã xóa số bịa (`38%`, `120ms`). Nhưng nếu bật LLM rewrite, LLM có thể **tự sinh số mới**. Cần chặn.

**Tham khảo từ Resume-Matcher** (`F:\repo\Resume-Matcher`):
- `apps/backend/app/services/writing_quality.py:231-278` — `fact_violations()`
- `apps/backend/app/services/resume_preservation.py:173-216` — `_novel_numbers()`

**Nhiệm vụ:**
1. Đọc 2 hàm trên trong repo clone
2. Thiết kế phiên bản TypeScript cho JobTrack, đặt trong `packages/jobtrack-contract/src/resume-optimizer.ts`
3. Yêu cầu:
   - Phát hiện số **mới xuất hiện** trong bullet rewrite mà không có trong bullet gốc
   - Phát hiện số bị **mất** (dropped)
   - Phát hiện tên riêng/tool bị thêm (`dropped_term`, `added_term`)
   - Normalize: `5k` → `5000`, `2M` → `2000000`
   - Bỏ qua số giống năm trong ngữ cảnh ngày (`2024`)
4. Viết **5 test case** cho hàm này
5. Trả về code + test

**Output:** TypeScript function + tests, không apply.

---

### Subagent 4: `a11y-kanban` — Antigravity / gemini-3.8-flash / **High**

**Việc:** Thêm keyboard accessibility cho Kanban.

**Vấn đề:** Card có `role="button" tabIndex={0}` nhưng **không có `onKeyDown`**. Người dùng bàn phím không kéo được thẻ.

**Tham khảo từ repo đối thủ:**
- `F:\repo\job-application-tracker\src\composables\useBoardShortcuts.ts:73-87` — `Shift+←/→` để move card
- `F:\repo\job-application-tracker\src\components\board\ApplicationCard.vue` — card pattern

**Nhiệm vụ:**
1. Đọc `useBoardShortcuts.ts` trong repo clone
2. Thiết kế cho JobTrack (React, không Vue):
   - `Enter`/`Space` trên card → mở detail
   - `Ctrl+←/→` → chuyển lane trước/sau
   - Announce qua `aria-live` khi chuyển thành công
   - Focus ring rõ ràng
3. **Quan trọng:** không phá drag-drop chuột hiện có
4. Trả về diff + ghi chú WCAG 2.2 AA compliance

**Output:** diff đề xuất, không apply.

---

### Subagent 5: `followup-design` — OpenCode / deepseek-v4.1-flash / **deep**

**Việc:** Thiết kế nhắc follow-up 7 ngày.

**Đây là tính năng phức tạp nhất** — cần đọc nhiều tầng:
- `packages/jobtrack-contract/src/follow-up.ts` (đã có `calculateStageSla`)
- `apps/api/src/services/follow-up-service.ts`
- `apps/api/src/services/deadline-reminder-service.ts`

**Bối cảnh:** hiện có SLA pill nhưng **không có notification**. Plan cũ ghi "sau 7-10 ngày không phản hồi → nhắc".

**Nhiệm vụ:**
1. Đọc 3 file trên
2. Xác định: cơ chế hiện có đã đủ chưa? Thiếu gì?
3. So sánh với:
   - `F:\repo\job-application-tracker\src\services\followUp.ts:28-41` (nhắc thủ công)
   - Repo B dùng `application_stale_at` + notification row
4. Thiết kế:
   - Ngưỡng: 7 ngày (Saved/Applied), 3 ngày (Interview), 2 ngày (Offer)
   - Hiển thị: badge trên card + filter "Cần chú ý (N)"
   - Hành động: "Đã follow-up" (reset clock), "Bỏ qua", "Đánh dấu ghosted"
   - Không gửi email tự động — chỉ hiển thị trong app
5. Trả về **plan kỹ thuật**, KHÔNG code

**Tại sao OpenCode deep:** cần đọc nhiều file + hiểu kiến trúc hiện có. Gemini High cũng được nhưng DeepSeek deep giỏi hệ thống hơn.

---

## PHẦN 3 — BẢNG PHÂN CÔNG TỔNG

| # | Subagent | Provider | Model | Option | Việc | Output |
|---|---|---|---|---|---|---|
| 1 | `ui-audit` | **Antigravity** | gemini-3.8-flash | `thought_level: high` | Fix nút bóp chữ | diff |
| 2 | `card-info` | **OpenCode** | deepseek-v4.1-flash-1017 | `variant: balanced` | Ngày nộp + nguồn | diff |
| 3 | `ats-factcheck` | **Antigravity** | gemini-3.8-flash | `thought_level: high` | `fact_violations` | code+test |
| 4 | `a11y-kanban` | **Antigravity** | gemini-3.8-flash | `thought_level: high` | Keyboard a11y | diff |
| 5 | `followup-design` | **OpenCode** | deepseek-v4.1-flash-1017 | `variant: deep` | Plan follow-up | plan |

**Tổng: 3 Antigravity + 2 OpenCode.**

Lý do nghiêng Antigravity: theo quy tắc của bạn — việc nào cả hai làm được thì chọn Antigravity.

### Cú pháp dispatch chính xác

```js
// Antigravity
await delegate_task({
  task: "<brief đầy đủ>",
  title: "ui-audit",
  role: "review",
  isolation: "shared",
  target: {
    providerInstanceId: "antigravity",
    model: "gemini-3.8-flash",
    options: { thought_level: "high" },   // object hoặc [{id,value}]
  },
});

// OpenCode
await delegate_task({
  task: "<brief đầy đủ>",
  title: "card-info",
  role: "implementation",
  isolation: "shared",
  target: {
    providerInstanceId: "opencode",
    model: "deploy/deepseek-ai/deepseek-v4.1-flash-1017",
    options: { variant: "balanced" },
  },
});
```

**Ghi chú:** `isolation: 'shared'` = dùng checkout hiện tại (đọc được file, không tách worktree).
Vì brief ghi "chỉ trả diff, không apply", dùng shared là an toàn và nhanh hơn worktree.

---

## PHẦN 4 — THỨ TỰ THỰC THI

### Wave 1 (song song, 3 subagent)

```
ui-audit        (Anti, High)  ─┐
ats-factcheck   (Anti, High)  ─┼─→ chạy cùng lúc
a11y-kanban     (Anti, High)  ─┘
```

Tất cả Antigravity → không tốn quota OpenCode. Đều là việc đọc + đề xuất.

### Wave 2 (song song, 2 subagent)

```
card-info        (OC, balanced) ─┐
followup-design  (OC, deep)     ─┴─→ chạy cùng lúc
```

### Wave 3 (tôi làm)

1. Review 5 kết quả
2. Apply diff nào đúng
3. `npm run check:all`
4. Commit theo nhóm
5. Deploy

---

## PHẦN 5 — CÁCH TÔI ĐIỀU PHỐI

### Trước khi dispatch

Mỗi subagent nhận **brief đầy đủ**, gồm:
- Đường dẫn file cụ thể (không bắt nó tự tìm)
- Vấn đề cần giải (kèm ảnh chụp nếu có)
- **Ràng buộc:** không tự apply code, chỉ trả diff
- **Định dạng output:** bảng + file:dòng + code cũ/mới
- Yêu cầu: "nếu không chắc, ghi CHƯA XÁC MINH, không suy đoán"

### Trong khi chạy

- Không poll — chờ notification
- Tôi làm việc khác không trùng: kiểm tra trạng thái production, chuẩn bị verification

### Sau khi nhận

| Bước | Việc |
|---|---|
| 1 | Đọc kết quả, đối chiếu file thật |
| 2 | Nếu subagent nói sai → bỏ qua, không apply |
| 3 | Nếu đúng → apply diff |
| 4 | Chạy `tsc --noEmit` từng app |
| 5 | Chạy `check:all` |
| 6 | Commit nhỏ, message rõ |
| 7 | Push → Render/Vercel deploy |
| 8 | Test trên production bằng browser |

### Khi nào escalate lên Sonnet/Opus

Chỉ 3 trường hợp:
1. Gemini High trả kết quả **sai rõ ràng 2 lần liên tiếp** cho cùng việc
2. Việc cần suy luận kiến trúc mà DeepSeek deep không đủ
3. Bạn yêu cầu trực tiếp

**Không tự ý dùng.**

---

## PHẦN 6 — RỦI RO & CÁCH XỬ LÝ

| Rủi ro | Xác suất | Cách xử lý |
|---|---|---|
| Gemini trả diff sai file | Trung bình | Tôi luôn đối chiếu file thật trước khi apply |
| Subagent tự sửa code | Thấp | Brief ghi rõ "KHÔNG apply" |
| OpenCode hết quota | Thấp | Chỉ 2 subagent OC, 1 balanced 1 deep |
| Kết quả mâu thuẫn giữa subagent | Trung bình | Tôi quyết định, ưu tiên cái có bằng chứng file:dòng |
| Apply diff làm vỡ test | Trung bình | `check:all` trước commit, không commit nếu đỏ |

---

## PHẦN 7 — CẦN BẠN DUYỆT

1. **Đồng ý bảng phân công** (3 Anti + 2 OC)?
2. **Đồng ý thứ tự Wave 1 → Wave 2 → Wave 3?**
3. **Có muốn bỏ subagent nào không?** (ví dụ chỉ làm 3 việc đầu)
4. **Antigravity runtime mode:** `full-access` hay `auto-accept-edits`?
   - `full-access` = subagent tự chạy lệnh
   - `auto-accept-edits` = tự sửa file
   - **Tôi đề xuất:** không cần cả hai, vì brief ghi "chỉ trả diff"

Duyệt xong tôi dispatch ngay Wave 1.
