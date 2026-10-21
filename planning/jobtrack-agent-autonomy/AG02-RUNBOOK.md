# AG02 — Runbook probe sandbox Windows (đã cập nhật sau khi chốt nguyên nhân)

Mục tiêu: probe sandbox **không cần elevated**, **không cần uninstall**, sinh bằng chứng denial theo từng giới hạn.

> Lưu ý lịch sử: bản runbook đầu tiên giả định nguyên nhân là "cần Administrator" và "cần `codex sandbox uninstall`". **Hai giả định đó đã bị bác bỏ bằng đo thật** — xem mục 1. Không chạy `codex sandbox uninstall` nếu chưa có bằng chứng mới đòi.

## 1. Nguyên nhân đã chốt

| CLI | Phiên bản | Kết quả probe `:read-only` |
| --- | --- | --- |
| `%APPDATA%\npm\codex.ps1` (trên PATH) | `codex-cli 0.162.0` | **FAIL** — `helper_unknown_error: setup refresh had errors` |
| `%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe` (CLI của ứng dụng) | `codex-cli 0.163.0-alpha.10.2` | **PASS** — `v24.18.0`, exit 0 |

Controller (`tools/agent-control/controller.mjs`) gọi `this.codexCommand`; từ commit `2d926d9` biến này lấy từ `CODEX_CLI_PATH` nếu được đặt, nếu không thì rơi về `codex` trên PATH ⇒ **chính là CLI hỏng**. Đây là lý do `doctor` vẫn báo lỗi trong các phiên không có `CODEX_CLI_PATH`.

## 2. Chạy probe (một lệnh, không elevated)

```powershell
cd D:\Project\Job_Application_Tracker
.\tools\sandbox\probe.ps1
```

Script tự:

1. Tìm `codex.exe` của ứng dụng trong `%LOCALAPPDATA%\OpenAI\Codex\bin` (hoặc dùng `CODEX_CLI_PATH` nếu đã đặt) và in ra phiên bản.
2. So sánh với CLI trên PATH và in kết quả probe của CLI đó.
3. Tạo **canary giả** ở `%TEMP%\jobtrack-sandbox-canary` (marker giả, không secret).
4. Chạy `node tools/agent-control/cli.mjs doctor` với `CODEX_CLI_PATH` trỏ đúng CLI → in JSON.
5. Chạy canary dưới profile `:read-only` (worker), `:workspace` (check runner) và baseline host (không sandbox).
6. Tính verdict theo từng giới hạn và ghi `planning/jobtrack-agent-autonomy/CANARY-EVIDENCE.json`.

Exit code: `0` = G-A đạt, `2` = chưa đạt (in `blockedBy`), `1` = lỗi môi trường.

## 3. Đặt `CODEX_CLI_PATH` vĩnh viễn cho máy này

Chỉ khi muốn `npm run agents -- doctor` dùng đúng CLI:

```powershell
[Environment]::SetEnvironmentVariable('CODEX_CLI_PATH', 'C:\Users\Admin\AppData\Local\OpenAI\Codex\bin\896a0166b774037a\codex.exe', 'User')
```

Rồi mở terminal mới (biến User chỉ có hiệu lực ở phiên mới) và kiểm tra:

```powershell
$env:CODEX_CLI_PATH
npm run agents -- doctor
```

Kỳ vọng: `sandbox.code = 0`, `sandbox.output = "v24.18.0"`. Trường `sandbox.error` vẫn có thể chứa banner cảnh báo của `rtk` — đó là **nhiễu stderr, không phải lỗi**; tiêu chí là `code` và `timedOut`.

Kiểm tra ràng buộc mà controller áp (`2d926d9`): `CODEX_CLI_PATH` phải là **đường dẫn tuyệt đối** tới file tên `codex`/`codex.exe`, tồn tại, không phải symlink. Sai ⇒ controller ném lỗi ngay khi khởi tạo.

## 4. Nếu máy không có CLI của ứng dụng

```powershell
Get-ChildItem "$env:LOCALAPPDATA\OpenAI\Codex\bin" -Recurse -Filter codex.exe
```

- Có file ⇒ trỏ `CODEX_CLI_PATH` vào đường dẫn đó.
- Không có ⇒ CLI trên PATH là bản duy nhất. Khi đó mới cần đi tiếp: cập nhật npm `codex-cli` lên bản mới, hoặc chạy probe elevated. **Chưa có bằng chứng cho giả thuyết "cần elevated"** — nếu phải thử thì ghi lại output thật.

## 5. Nếu CLI trên PATH vẫn được dùng và vẫn lỗi

Kiểm tra CLI nào thực sự được gọi:

```powershell
Get-Command codex -All | Select-Object Source
codex --version
```

Nếu trùng `C:\Users\Admin\AppData\Roaming\npm\codex.ps1` ⇒ đang dùng bản 0.162.0 hỏng. Sửa bằng `CODEX_CLI_PATH`, **không** bằng việc nới quyền hay tắt sandbox.

## 6. Đọc kết quả canary

| Check | Kỳ vọng (profile `:read-only`) | Nếu lệch |
| --- | --- | --- |
| `writeInsideWorkspace` | `DENIED` | fail |
| `writeOutsideWorkspace` | `DENIED` | fail |
| `readOutsideWorkspace` | `DENIED` | hiện đang `ALLOWED` — đây là hạn chế đã biết, cần OS identity/container (AG01) |
| `gitCommonDirHead` / `gitCommonDirConfig` | `opened: false` | hiện đang `true` — worker đọc được Git common dir |
| `credentialFileOpen` / `accountsFileOpen` | `opened: false` | hiện đang `true` — worker mở được file credential |
| `siblingWorktreeList` / `controlStateList` | `listed: false` | hiện đang `true` |
| `homeCredentialList` | `DENIED` | đạt |
| `egressTcp80` | khác baseline host | hiện đang **trùng** baseline ⇒ chưa chứng minh (cần positive control) |
| `childProcessTree.stillAliveAfterKill` | `false` | fail V15 |

Baseline host (chạy canary không sandbox) dùng để phân biệt "sandbox chặn" với "máy chặn sẵn". Mọi mục trùng baseline đều **không** được tính là bằng chứng denial.

## 7. Cấu hình cần chốt (chưa được tự động hoá)

| Biến | Ảnh hưởng | Nơi dùng |
| --- | --- | --- |
| `CODEX_CLI_PATH` | chọn CLI cho probe/check/worker | `tools/agent-control/controller.mjs` |
| `APP_ORIGIN` | origin được API chấp nhận | `apps/api/src/server.ts` |
| `COOKIE_SECURE` | cờ cookie | `apps/api/src/server.ts` |

Không thêm `safe.directory` toàn cục và không đổi quyền hệ thống để "cho chạy được" — nếu cần, xem `GIT-ACL-NOTE.md`.
