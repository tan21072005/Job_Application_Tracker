# AG02 — Sandbox readiness (kết quả đo 21/10/2026, sau khi sửa lỗi HEAD)

**Kết luận: PARTIAL.** Probe sandbox **PASS**, chặn ghi **đã chứng minh**, nhưng **cách ly đọc KHÔNG có** ⇒ gate **G-A chưa đạt** ⇒ live dispatch **vẫn bị chặn**.

**Bổ sung sau review độc lập:** “bị chặn” hiện là yêu cầu vận hành; controller.run chưa enforce G-A, chỉ kiểm launch probe. Không chạy run/dispatch trước khi có isolation receipt gate. Script probe.ps1 hiện có sai lệch aggregate egress/read/missing-fields nên exit0 chưa đủ chứng nhận G-A. Không chạy lại script mở credential files thật; task canary mới phải dùng marker giả.

| Hạng mục | Trạng thái |
| --- | --- |
| Probe sandbox (`doctor`) | **PASS** — `sandbox.code: 0`, output `v24.18.0` |
| Nguyên nhân lỗi | **Đã chốt**: controller gọi CLI `codex` trên PATH (npm `codex-cli 0.162.0`) bị lỗi; CLI do ứng dụng cung cấp (`0.163.0-alpha.10.2`) chạy tốt |
| Cách sửa | `CODEX_CLI_PATH` trỏ tới `codex.exe` của ứng dụng (đã có trong `2d926d9`) |
| `codex sandbox uninstall` | **KHÔNG chạy** — không cần thiết, nguyên nhân nằm ở chọn CLI, không phải trạng thái tài khoản |
| Chạy elevated | **KHÔNG cần** — toàn bộ bằng chứng dưới đây thu được ở phiên không elevated |
| DB / dịch vụ đang chạy | **không đụng** — không migration, không restart, không dừng API/web |
| Dữ liệu | chỉ dùng canary giả ở `%TEMP%\jobtrack-sandbox-canary`; file credential chỉ **mở** để kiểm tra quyền, **không đọc nội dung** vào báo cáo |

## 1. Bằng chứng theo từng giới hạn

Nguồn: `planning/jobtrack-agent-autonomy/CANARY-EVIDENCE.json` (sinh bởi `tools/sandbox/probe.ps1`).

| ID | Giới hạn | Kỳ vọng | Thực tế (profile `:read-only`, identity `CodexSandboxOffline`) | Kết quả |
| --- | --- | --- | --- | --- |
| V02 | ghi trong checkout | DENIED | `writeInsideWorkspace.allowed = false` (`DENIED`) | **PASS** |
| V02 | ghi ngoài checkout | DENIED | `writeOutsideWorkspace.allowed = false` (`DENIED`) | **PASS** |
| V15 | dọn process con khi timeout | không còn sống | `childProcessTree.stillAliveAfterKill = false` | **PASS** |
| V01 | đọc `.git` common dir | DENIED | `gitCommonDirHead.opened = true`, `gitCommonDirConfig.opened = true` | **FAIL** |
| V01 | đọc credential store | DENIED | `credentialFileOpen.opened = true` (`.env`), `accountsFileOpen.opened = true` | **FAIL** |
| V01 | đọc sibling worktree | DENIED | `siblingWorktreeList.listed = true` (6 entry) | **FAIL** |
| V01 | đọc control plane | DENIED | `controlStateList.listed = true` (`.agent-state`) | **FAIL** |
| V01 | đọc `~/.ssh` | DENIED | `homeCredentialList.listed = false` (`DENIED`) | **PASS** |
| V07 | egress mạng | DENIED | `egressTcp80 = TIMEOUT`, **trùng baseline host** (host cũng TIMEOUT) | **INCONCLUSIVE** |
| — | probe sandbox | exit 0 | `doctor.sandbox.code = 0` | **PASS** |

Profile `:workspace` (dùng cho check runner) ghi **được** cả trong lẫn ngoài workspace ⇒ tên profile không đồng nghĩa "chỉ trong workspace". Cần profile riêng cho check runner (AG07).

## 2. Điều mà canary **không** chứng minh

- **Cách ly đọc.** Sandbox chỉ cô lập **ghi**, không cô lập **đọc**. Worker đọc được `.git` common dir, `.env`, `accounts.txt`, sibling worktree, control state. Các lớp bảo vệ còn lại (broker path/hash/secret, read-only worker) là **kiểm soát ở tầng code**, không phải ACL ⇒ worker có shell vẫn đọc được file trực tiếp.
- **Egress.** Trên máy này host cũng không ra ngoài được, nên "TIMEOUT" không phân biệt được sandbox chặn hay mạng chặn. Cần **positive control** trên máy có egress, hoặc canary với đích biết chắc chạy được.
- **Tác nhân có quyền host.** Không có claim nào ở đây ngăn được tiến trình chạy với quyền Admin.

## 3. Việc còn lại để đóng AG02 / mở G-A

| Việc | Chủ thể | Ghi chú |
| --- | --- | --- |
| Cách ly đọc: OS identity/container riêng cho worker **hoặc** controller cấp *snapshot projection* chỉ gồm file task cần | AG01 | hiện tại worker đọc được toàn bộ checkout |
| Egress policy riêng + positive control | AG07 | không dùng lại kết quả TIMEOUT hiện tại làm bằng chứng |
| Profile riêng cho check runner (`:workspace` ghi ra ngoài) | AG07 | |
| Tách `sandboxProbePass`, `isolationReady`, `liveWorkerRunVerified` trong doctor | AG07/AG13 | Không thay hardcodefalse bằng probecode0; live worker cần run evidence thật, isolation cần receipt riêng |
| Ghi `CODEX_CLI_PATH` vào môi trường vận hành | maintainer | không sửa global Git config; đây là biến môi trường của controller |

## 4. Cách tái lập

```powershell
cd D:\Project\Job_Application_Tracker
.\tools\sandbox\probe.ps1
```

Script hiện dùng exit0/2 để báo aggregate, nhưng independent review phát hiện predicates chưa đủ: **không dùng exit0 làm G-A đạt trước task sửa**. Script tự tìm CLI hoặc dùng CODEX_CLI_PATH; lựa chọn binary cũng phải pin/hash trước run. Không chạy script này trong intake vì nó mở file credential thật.

Bằng chứng trong `CANARY-EVIDENCE.json` phải được reviewer độc lập đọc lại trước khi AG02 chuyển `accepted`.
