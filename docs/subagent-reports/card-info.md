# SUBAGENT REPORT — card-info

> Provider: opencode · model: deepseek-v4.1-flash-1017 · variant: balanced
> Status: completed · Verified: ✅ vị trí file đúng, `Intl` bug đúng

## Xác minh claim

| Claim | Verify | Kết quả |
|---|---|---|
| `card-company-row` ở dòng 681 | grep | ✅ ĐÚNG |
| `card-company-info` ở dòng 683 | grep | ✅ ĐÚNG |
| CSS `.card-company-info` ở 1293-1294 | grep | ✅ ĐÚNG |
| `formatDayMonth` chưa tồn tại | grep | ✅ 0 hit — ĐÚNG |
| `Intl` trả `"12-11"` không phải `12/11` | chạy node | ✅ ĐÚNG: `vi-VN 2digit: 12-11` |
| Không test nào assert markup card | grep | ✅ 0 match |

---

## Thiết kế

| Thông tin | Vị trí | Điều kiện | CSS |
|---|---|---|---|
| Ngày nộp | Dòng meta thứ 3 trong `.card-company-info` | có `appliedAt` → `📅 DD/MM`; null → `Chưa nộp` | `.card-meta-line` với ellipsis |
| Nguồn | Cùng dòng, sau `·` | `source` rỗng → chỉ ngày | dùng chung class |

**Lý do không thêm row ngoài:** `.pipeline-card{gap:6px}` → 1 row mới = 19px, vượt ngân sách 8px. Nest vào cột info tận dụng chiều cao monogram 40px đang dư.

## Chiều cao

| Trường hợp | Trước | Sau | Δ |
|---|---|---|---|
| Company 1 dòng | 40px | 46.5px | **+6.5px** ✅ |
| Company wrap 2 dòng | 52.1px | 66.3px | **+14.2px** ❌ |

## Code

**1. `domain.ts` — helper mới (sau `formatDate`)**
```ts
export function formatDayMonth(value:string){if(!value)return '';const date=new Date(value.length===10?`${value}T12:00:00`:value);if(!Number.isFinite(date.getTime()))return '';return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;}
```

**2. `Applications.tsx` — import thêm `formatDayMonth`**

**3. Trong `entries.map` (sau dòng 614)**
```tsx
const appliedDate = formatDayMonth(app.appliedAt);
const appliedLabel = appliedDate ? `📅 ${appliedDate}` : 'Chưa nộp';
const sourceLabel = (app.source || '').trim();
const metaTitle = sourceLabel ? `${appliedLabel} · ${sourceLabel}` : appliedLabel;
```

**4. Card body (dòng 681-687)**
```tsx
<div className="card-company-row">
  <Monogram company={app.company} />
  <div className="card-company-info">
    <strong>{app.position}</strong>
    <span>{app.company}</span>
    <span className="card-meta-line" title={metaTitle}>{metaTitle}</span>
  </div>
</div>
```

**5. `jobtrack.css:1293`**
```css
/* CŨ */
.card-company-info span{font-size:11px;color:var(--muted)}

/* MỚI */
.card-company-info span{font-size:11px;color:var(--muted);line-height:1.4}
.card-company-info .card-meta-line{display:block;max-width:100%;margin-top:1px;font-size:11px;line-height:1.2;color:var(--slate-500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
```

**Quan trọng:** phải dùng `.card-company-info .card-meta-line` (specificity 0,2,0) vì `.card-company-info span` (0,1,1) sẽ đè `.card-meta-line` (0,1,0).

## Rủi ro

1. **Δ +6.5px chỉ đúng khi company 1 dòng** — company wrap 2 dòng thì +14.2px, vượt ngân sách.
2. **Mobile ≤700px chưa xác minh** — `.pipeline-card` chuyển `grid` nhưng `.card-company-row` không có `grid-column` → meta có thể bị ép vào cột 38px, chỉ hiện `…`.
3. **Số đo suy ra từ CSS, chưa đo DevTools.** `app.source` là free-text 128 ký tự, không chuẩn hoá.

## Phương án B (nếu cần Δ=0)

Đưa meta cùng dòng company:
```css
.card-company-sub{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:11px;line-height:1.4}
```
Đánh đổi: company bị ellipsis.

**Khuyến nghị của subagent:** phương án chính (dòng mới), chấp nhận +6.5px.
