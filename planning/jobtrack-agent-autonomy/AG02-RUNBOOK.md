# AG02 — Runbook gỡ lỗi sandbox Windows (chạy trong terminal Administrator)

Mục tiêu: biến `helper_unknown_error: setup refresh had errors` thành **bằng chứng có/không có**, rồi chỉ mở live dispatch khi từng giới hạn đọc/ghi/network có denial thật.

Trạng thái hiện tại (đo 21/10/2026, không elevated): `codex sandbox` lỗi **giống hệt** với `-- node --version` và `-- rtk proxy node --version` ⇒ RTK không phải nguyên nhân. Host có `CodexSandboxOffline`, `CodexSandboxOnline`, group `CodexSandboxUsers`; session đo chạy `PC\Admin` **không elevated** ⇒ giả thuyết: bước `setup refresh` cần phiên Administrator.

## Bước 0 — mở terminal Administrator

Cách 1 (Explorer): Start → gõ `powershell` → **Run as administrator** → Yes (UAC).
Cách 2 (từ terminal hiện tại, sẽ bật UAC):

```powershell
Start-Process powershell -Verb RunAs -ArgumentList '-NoExit','-Command','Set-Location ''D:\Project\Job_Application_Tracker'''
```

Trong cửa sổ mới, xác nhận đã elevated (không được nói "deny only"):

```powershell
whoami /groups | Select-String 'S-1-5-32-544'
```

Kỳ vọng: dòng `BUILTIN\Administrators` hiện là **Mandatory group, Enabled by default** (không phải "Group used for deny only"). Nếu vẫn "deny only" ⇒ cửa sổ chưa elevated, đóng và mở lại.

## Bước 1 — probe sandbox (không sửa gì)

```powershell
cd D:\Project\Job_Application_Tracker
node tools/agent-control/cli.mjs doctor
```

Đọc `sandbox.code` và `sandbox.error`:

| `sandbox.code` | `sandbox.error` | Kết luận | Hành động |
|---|---|---|---|
| `0` | rỗng | Sandbox khỏe | sang **Bước 3** (canary) |
| khác `0` | `helper_unknown_error: setup refresh had errors` | Đúng lỗi cũ | sang **Bước 2** |
| khác `0` | lỗi khác (ghi nguyên văn) | Lỗi mới, chưa hiểu | sang **Bước 4** |

## Bước 2 — dọn trạng thái sandbox cũ rồi probe lại

`codex sandbox uninstall` xóa tài khoản sandbox machine-wide và quy tắc mạng do Codex tạo (lệnh này nằm ngoài workspace ⇒ cần Administrator; đây là thao tác host-level, **không** phải nới sandbox).

```powershell
codex sandbox uninstall
Start-Sleep -Seconds 3
node tools/agent-control/cli.mjs doctor
```

Lệnh `sandbox` sẽ tự thiết lập lại tài khoản ở lần chạy kế tiếp — nếu vẫn lỗi, nguyên nhân không nằm ở trạng thái tài khoản mà ở môi trường (xem Bước 4).

**Không dùng** `--danger-full-access`, không tắt sandbox, không sửa ACL rộng để "cho chạy được". Lỗi phải được ghi BLOCKED kèm bằng chứng, không được vòng qua.

## Bước 3 — chạy canary và tạo bằng chứng

Một lệnh, chạy trong terminal Administrator đang mở:

```powershell
cd D:\Project\Job_Application_Tracker
.\tools\sandbox\probe-elevated.ps1 -Uninstall
```

Script sẽ: kiểm tra elevation → tạo **dữ liệu giả** ở `%TEMP%\jobtrack-sandbox-canary` (không đụng secret/DB thật) → chạy `doctor` trước → nếu `-Uninstall` được phép thì uninstall + probe lại → chạy canary dưới 2 profile (`:read-only` và `:workspace`) → ghi `planning/jobtrack-agent-autonomy/CANARY-EVIDENCE.json`.

Exit code: `0` = sandbox probe pass, `2` = vẫn lỗi (giữ fail-closed), `1` = chưa elevated.

### Đọc kết quả canary như thế nào

| Check | Kỳ vọng khi sandbox hoạt động | Nếu khác |
|---|---|---|
| `writeOutsideWorkspace` | `DENIED` | sandbox không chặn ghi ngoài checkout ⇒ **fail** |
| `writeInsideWorkspace` (profile `:read-only`) | `DENIED` | profile không read-only ⇒ **fail** |
| `readOutsideWorkspace` | `DENIED` hoặc `ALLOWED` | `ALLOWED` **không phải fail**, nhưng là giới hạn đã biết: read-only không bảo đảm chặn đọc file riêng. Muốn chặn thật cần OS identity/container riêng (AG01) |
| `egressTcp80` | `DENIED`/`TIMEOUT` | `ALLOWED` ⇒ cần network policy riêng cho worker (AG07) |
| `childProcessTree.stillAliveAfterKill` | `false` | `true` ⇒ timeout không dọn được process con ⇒ **fail V15** |

Baseline đối chiếu (đo trên host, **không** sandbox): write trong/ngoài workspace = `ALLOWED`, read ngoài = `ALLOWED`, egress = `TIMEOUT` (mạng chặn sẵn), child kill = sạch. Canary phải cho ra kết quả **khác** baseline ở các mục ghi, nếu không thì sandbox chưa thật sự cô lập.

## Bước 4 — nếu vẫn lỗi sau uninstall

Ghi lại bằng chứng, đừng đoán:

```powershell
codex --version
codex sandbox --permission-profile :read-only -C D:\Project\Job_Application_Tracker -- cmd /c echo ok
Get-ChildItem C:\Users\Admin\.codex -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 20 FullName, LastWriteTime
```

Các nguyên nhân thường gặp: helper sandbox bị AppLocker/EDR chặn; Windows build không tương thích với cơ chế restricted token của Codex CLI 0.162.0; profile Group Policy chặn tạo local user. Ghi kết quả vào `SANDBOX-READINESS.md` với trạng thái **BLOCKED**, kèm lệnh đã chạy và output thật. Khi đó live dispatch **vẫn bị chặn** và AG01/AG03+ chỉ tiếp tục phần tài liệu/fixture.

## Bước 5 — sau khi canary đạt

1. `CANARY-EVIDENCE.json` + `SANDBOX-READINESS.md` là bằng chứng AG02; commit explicit paths.
2. Đánh dấu AG02 trong `TASKS.json` là `accepted` **chỉ khi** reviewer độc lập đọc `CANARY-EVIDENCE.json` và xác nhận từng denial khớp kỳ vọng.
3. Gate **G-A** mở khi: worker không đọc được sibling/control/common-Git/credential canary; không ghi được source/Git; check runner không thoát vùng scratch/fixture; egress đúng policy; có bằng chứng **denial** cho từng giới hạn (không phải "prompt yêu cầu").
4. Sau đó mới mở AG01 (permission matrix) rồi AG03–AG09. **Chưa dispatch live worker** khi G-A chưa đạt.

## Lệnh tương đương nếu không dùng script

```powershell
# canary read-only
codex sandbox --permission-profile :read-only -C D:\Project\Job_Application_Tracker -- node tools\sandbox\canary.mjs D:\Project\Job_Application_Tracker

# canary workspace (profile dùng cho check runner)
codex sandbox --permission-profile :workspace -C D:\Project\Job_Application_Tracker -- node tools\sandbox\canary.mjs D:\Project\Job_Application_Tracker
```

Copy JSON trả về vào `planning/jobtrack-agent-autonomy/CANARY-EVIDENCE.json` cùng trường `host` và `verdict`.
