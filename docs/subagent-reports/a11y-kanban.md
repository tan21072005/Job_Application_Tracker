# SUBAGENT REPORT — a11y-kanban

> Provider: antigravity · model: gemini-3.8-flash · thought_level: high
> Status: completed · Verified bởi tôi: ✅ đúng

## Xác minh claim

| Claim | Cách verify | Kết quả |
|---|---|---|
| Card không có `onKeyDown` | `grep onKeyDown Applications.tsx` | ✅ 0 hit — ĐÚNG |
| Không có `aria-live` trong Applications | `grep aria-live` | ✅ chỉ 1 hit ở JobTrack.tsx, không phải card |
| Không có CSS focus cho `.pipeline-card` | `grep pipeline-card:focus` | ✅ 0 hit — ĐÚNG |
| Card có `role="button" tabIndex={0}` | đọc code | ✅ ĐÚNG |

---

## 5 vi phạm WCAG

| Yêu cầu | Hiện trạng | Cần thêm |
|---|---|---|
| **2.1.1 Keyboard (A)** | `tabIndex={0}` nhưng không `onKeyDown` → Enter/Space không mở được | `onKeyDown` cho Enter/Space |
| **2.5.7 Dragging (AA)** | Chỉ kéo chuột. `quick-advance-btn` chỉ tiến 1 chiều, không lùi được | `Ctrl+←/→` |
| **4.1.3 Status Messages (AA)** | Chỉ toast, screen reader có thể bỏ lỡ | Vùng `aria-live="polite"` |
| **2.4.7 Focus Visible (AA)** | Chỉ có rule chung `[tabindex="0"]:focus-visible` | Rule riêng cho `.pipeline-card` |
| **1.3.1 + 4.1.2 Name/Role (A)** | `role="button"` nhưng không `aria-label` tóm tắt | `aria-label` có hướng dẫn phím |

## Code đề xuất

**1. Handler + state (thêm vào component):**
```tsx
const [liveAnnouncement, setLiveAnnouncement] = useState('');

const handleCardKeyDown = (e: React.KeyboardEvent, app: Application) => {
  if (e.target !== e.currentTarget) return;   // chặn bubble từ control con

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onOpen(app);
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    if (busy) return;
    const idx = KANBAN_LANES.findIndex(l => l.key === currentLaneKey(app));
    const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
    if (next < 0 || next >= KANBAN_LANES.length) return;
    const lane = KANBAN_LANES[next];
    void handleDropOnLane(app.id, lane);
    setLiveAnnouncement(`Đã chuyển ${app.position} tại ${app.company} sang cột ${lane.title}`);
  }
};
```

**2. Card (thay dòng 631):**
```tsx
<div
  className="pipeline-card"
  data-card-id={app.id}
  onClick={() => onOpen(app)}
  onKeyDown={e => handleCardKeyDown(e, app)}
  role="button"
  tabIndex={0}
  aria-label={`${app.position} tại ${app.company}. Enter để mở, Ctrl+Mũi tên để chuyển cột.`}
>
```

**3. Live region (trước đóng component, ~dòng 784):**
```tsx
<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
  {liveAnnouncement}
</div>
```

**4. CSS (thêm sau `.pipeline-card:hover` ở jobtrack.css:279):**
```css
.pipeline-card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--soft), 0 4px 14px rgba(0, 0, 0, 0.08);
}

.pipeline-card:focus-within:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
```

**Drag-drop chuột giữ nguyên 100%** — `draggable`, `onDragStart`, `onDragEnd`, `onDrop` không đổi.

---

## 3 rủi ro

1. **Focus loss sau re-render** — `handleDropOnLane` gọi `onRefresh()` → card unmount/mount lại cột mới → focus về `document.body`. Cần `setTimeout(() => document.querySelector('[data-card-id="..."]')?.focus(), 80)`.
2. **Xung đột phím với control con** — checkbox, select, tag button bên trong card. Phải có `if (e.target !== e.currentTarget) return;` nếu không Space/Arrow sẽ bubble lên card.
3. **Race condition khi nhấn nhanh** — `Ctrl+→` liên tục gửi nhiều request. Cần `if (busy) return;`.

## Cách test không cần chuột

1. Tab vào card → thấy focus ring 2px
2. Enter → mở detail
3. Escape → đóng, focus về card
4. `Ctrl+→` → card sang cột kế, screen reader đọc thông báo
5. `Ctrl+←` → lùi lại
6. Tab vào checkbox bên trong card → Space tick, KHÔNG mở detail

---

## Áp dụng

- [ ] `handleCardKeyDown` + `liveAnnouncement` state
- [ ] `onKeyDown` + `aria-label` trên card
- [ ] Live region `aria-live="polite"`
- [ ] CSS `:focus-visible` + `:focus-within`
- [ ] Focus restore sau move
