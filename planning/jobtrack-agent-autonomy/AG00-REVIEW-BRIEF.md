# AG00 — Brief cho reviewer độc lập duyệt gap matrix

Mục tiêu: AG00 được viết bởi một phiên khác (tác giả: orchestrator của lượt 2026-10-21). **Không tự duyệt.** Reviewer phải là một phiên/agent khác, chỉ đọc, và phải trả lời "pass hay không" cho từng claim có bằng chứng.

## 1. Đối tượng review

| Mục | Đường dẫn |
| --- | --- |
| Gap matrix (đối tượng chính) | `planning/jobtrack-agent-autonomy/BASELINE-GAPS.md` |
| Inventory quyền | `planning/jobtrack-agent-autonomy/CAPABILITY-INVENTORY.md` |
| Trạng thái runtime | `planning/jobtrack-agent-autonomy/RUN-STATUS.md` |
| Registry task | `planning/jobtrack-agent-autonomy/TASKS.json` (entry `AG00`, status hiện tại `review`) |
| Kế hoạch đối chiếu | `planning/jobtrack-agent-autonomy/PLAN.md`, `ACCEPTANCE.md`, `ARCHITECTURE.md` |

**Digest cần review:** commit `9dc80e0` trên `main` (các file audit ở commit `7284202`). Nếu bất kỳ file nào ở trên thay đổi sau khi reviewer đọc, verdict mất hiệu lực → phải review lại.

Xác nhận đúng digest trước khi kết luận:

```powershell
cd D:\Project\Job_Application_Tracker
git log --oneline -3
git status --porcelain --untracked-files=no
```

Kỳ vọng: `9dc80e0` ở đầu, `git status` không có dòng nào cho các file audit.

## 2. Checklist kiểm chứng (mỗi claim phải có trả lời)

| # | Claim trong tài liệu | Cách kiểm | Đạt khi |
| --- | --- | --- | --- |
| C1 | HEAD = `30db3fd` ở thời điểm audit, main sạch, 3 worktree, không remote | `git log --oneline -3`, `git worktree list`, `git branch -a`, `git status` | khớp `BASELINE-GAPS.md` §1 |
| C2 | Fixture test 21/21 pass | `npm run agents:test` | đúng 21 pass, 0 fail; nếu chạy lại được thì ghi lại thời điểm |
| C3 | `agents status` = `[]` | `npm run agents -- status` | mảng rỗng |
| C4 | Sandbox fail, `liveWorkersVerified: false` | `npm run agents -- doctor` | `sandbox.code != 0` |
| C5 | RTK không phải nguyên nhân sandbox | chạy 2 lệnh `codex sandbox ... -- node --version` và `-- rtk proxy node --version` | **cả hai lỗi giống hệt** |
| C6 | Sandbox accounts tồn tại, session không elevated | `Get-LocalUser`, `whoami /groups` | `CodexSandboxOffline/Online` có; `S-1-5-32-544` là deny-only |
| C7 | P0 Origin bypass + Bearer→cookie fallback | đọc `apps/api/src/server.ts` dòng 177-214 và 226-250; **tự chạy probe** (không dùng credential) | probe A trả 401, probe B trả 403 ⇒ cơ chế bypass đúng như tài liệu mô tả |
| C8 | MCP không có SDK chính thức | đọc `packages/jobtrack-mcp/package.json` | dependencies chỉ có `pg` |
| C9 | ATS dùng heuristic, không gọi model | đọc `apps/api/src/services/ai-pro-service.ts` khoảng 118-135 | có `matchRatio*55+25` |
| C10 | `check:all` không gọi `agents:test` | đọc `package.json` dòng 40 | đúng |
| C11 | Lane prefixes và protected paths trong `policy.mjs` | đọc `tools/agent-control/policy.mjs` | 5 lane, protectedNames/protectedParts khớp `CAPABILITY-INVENTORY.md` §2-§3 |
| C12 | Comment policy bỏ sót `.sql/.py/.md/.yml` | đọc `policy.mjs` dòng 115-131 | regex `/\.(?:[cm]?[jt]sx?|css|html)$/` không phủ các ngôn ngữ đó |
| C13 | Không claim sai về live/AGENTS | đọc lại toàn bộ 3 file audit | không có câu nào biến fixture thành live |
| C14 | Runtime claim: API 64366 `/api/ready` = version 6, web 64364 render | `Invoke-WebRequest http://127.0.0.1:64366/api/ready`; mở `http://127.0.0.1:64364/` | đúng; nếu server đã dừng thì đánh dấu "cần khởi động lại", không coi là sai |

**C7 là mục quan trọng nhất.** Reviewer phải tự chạy lại probe, không tin lời tác giả. Probe an toàn, không cần credential:

```powershell
$r = Invoke-WebRequest -Uri "http://127.0.0.1:64366/api/applications" -Method POST `
  -Headers @{ Origin = "http://evil.example"; Authorization = "Bearer invalid_token_zzz" } `
  -Body "{}" -ContentType "application/json" -UseBasicParsing
```

Kỳ vọng A → `401` (Origin đã bị bypass vì có header Bearer). Bỏ header `Authorization` → kỳ vọng B → `403` (Origin có hiệu lực). Nếu A/B cho kết quả khác ⇒ claim sai, phải ghi finding.

**Không được** tạo account, đọc `accounts.txt`, đọc `.env`, hay tạo dữ liệu trong DB để review.

## 3. Hợp đồng đầu ra

Ghi kết quả vào `planning/jobtrack-agent-autonomy/AG00-REVIEW.md` theo mẫu:

```markdown
# AG00 — Independent review

- Reviewer: <tên phiên/agent, khác tác giả>
- Reviewed digest: 9dc80e0
- Reviewed at: <ISO timestamp>
- Method: read-only + các lệnh đã chạy (ghi lệnh và exit code)

## Verdict
PASS_WITH_LIMITS | FAIL

## Checklist
| # | Claim | Kết quả | Bằng chứng (lệnh + output) |
|---|---|---|---|
| C1 | ... | agree / disagree / unverifiable | ... |

## Findings
| ID | Severity | Location | Trigger | Impact | Khuyến nghị |
|---|---|---|---|---|---|
| F1 | P0/P1/P2 | file:line | điều kiện kích hoạt | hậu quả | hành động |

## Giới hạn của review
- không kiểm chứng được: ...
```

Severity: `P0` lộ dữ liệu/vi phạm quyền/điểm chặn live · `P1` sai lệch quan trọng trong tài liệu hoặc bỏ sót rủi ro lớn · `P2` imprecision, thiếu chi tiết, wording.

## 4. Prompt dán cho reviewer

```text
Review read-only AG00 của JobTrack tại D:\Project\Job_Application_Tracker trên digest 9dc80e0.

Đọc AGENTS.md và docs/agents/OPERATING-RULES.md trước, mọi shell command bắt đầu bằng rtk.
Đối chiếu planning/jobtrack-agent-autonomy/BASELINE-GAPS.md, CAPABILITY-INVENTORY.md,
RUN-STATUS.md với source thật và tự chạy lại các lệnh trong checklist C1-C14.

Không dựa vào lời tác giả rằng đã kiểm chứng. Mọi claim phải có lệnh đã chạy + output.
Không sửa source, không sửa chính 3 file audit, không tạo account, không đọc .env/accounts.txt,
không ghi DB, không commit, không chạy migrate/restore/load/payment/provider.

Trả findings có vị trí/trigger/impact/severity, hoặc PASS có giới hạn.
Ghi kết quả vào planning/jobtrack-agent-autonomy/AG00-REVIEW.md.
Bất kỳ thay đổi nào sau khi review làm mất hiệu lực verdict này.
```

## 5. Sau khi review

| Kết quả | Hành động |
| --- | --- |
| `PASS` hoặc `PASS_WITH_LIMITS` | Đổi `AG00.status` trong `TASKS.json` → `accepted`, ghi `AG00-REVIEW.md` vào commit riêng, cập nhật `docs/agents/IMPLEMENTATION-STATUS.md` |
| `FAIL` với finding P0/P1 | Sửa tài liệu audit, **commit mới**, review lại trên digest mới (verdict cũ không tái dùng) |
| `unverifiable` ở claim quan trọng | Đánh dấu claim đó NOT-RUN/BLOCKED trong tài liệu thay vì giữ như đã xác nhận |

Mọi thay đổi phải là commit riêng với explicit paths. Không sửa `TASKS.json` status thành `accepted` khi chưa có `AG00-REVIEW.md` tương ứng — đó là tự duyệt.
