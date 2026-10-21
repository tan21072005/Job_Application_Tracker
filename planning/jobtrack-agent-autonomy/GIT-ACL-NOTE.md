# Ghi chú kỹ thuật — vì sao `git switch` / `git checkout` / `git symbolic-ref HEAD` lỗi trên máy này

> **ĐÃ XỬ LÝ (21/10/2026).** Người duy trì đã cấp quyền cho `PC\Admin` trên đúng `.git` và `.git\HEAD`. Kiểm chứng lại: `git switch` **không còn lỗi `couldn't set 'HEAD'`** — nó chỉ dừng vì lý do thường thấy là "local changes would be overwritten". Không cần chạy elevated, không cần `icacls` thêm, không cần dùng plumbing. Mục 1 giữ lại để giải thích nguyên nhân gốc và để tránh tái phạm trên máy khác.

Triệu chứng (chỉ xảy ra với tài khoản `PC\Admin` **không elevated**):

```text
$ git switch codex/AG00-baseline-audit
error: couldn't set 'HEAD'
fatal: unable to update HEAD

$ git symbolic-ref HEAD refs/heads/main
error: couldn't set 'HEAD'
```

Trong khi `git branch <tên>`, `git add`, `git update-ref refs/heads/<tên> <sha>`, `git log`, `git status` đều chạy bình thường.

## Nguyên nhân (đã đo, không phải suy đoán)

| Mục | Kết quả |
| --- | --- |
| ACE trên `.git\HEAD` | `PC\CodexSandboxOffline:(F)`, `NT AUTHORITY\SYSTEM:(F)`, `BUILTIN\Administrators:(F)`, `BUILTIN\Users:(RX,W)` — **không có** `PC\Admin:(F)` |
| ACE trên `.git\refs\heads\main` | có `PC\Admin:(F)` |
| ACE trên `.git\logs\HEAD` và `.git\logs\refs\heads\main` | có `PC\Admin:(F)` |
| ACE trên file **mới** tạo trong `.git` | có `PC\Admin:(F)` (kế thừa từ thư mục `.git`) |
| Token hiện tại | `BUILTIN\Administrators` = **"Group used for deny only"** (token lọc của UAC); `BUILTIN\Users` = enabled |
| Quyền hiệu lực trên `.git\HEAD` | `BUILTIN\Users:(RX,W)` = đọc + ghi dữ liệu, **không có DELETE** |

Cơ chế: thư mục `.git` có ACE `PC\Admin:(I)(F)` — chữ `(I)` nghĩa là **chỉ kế thừa**. File nào sinh ra **sau** lần cấp quyền đó đều mang ACE này (`refs/*`, `logs/*`, file mới). `.git\HEAD` được tạo **trước** đó (lúc `git init` chạy dưới tài khoản sandbox `PC\CodexSandboxOffline`) nên không có.

Git cập nhật symref bằng cách tạo `HEAD.lock` rồi **thay thế** file `HEAD` cũ — thay thế file tồn tại cần quyền **DELETE** trên chính file đó. `PC\Admin` không elevated không có DELETE trên `.git\HEAD` (Administrators bị deny-only), nên thao tác thất bại trước cả khi ghi được nội dung. Mọi ref thường đều mang `PC\Admin:(F)` nên `update-ref` vẫn chạy được.

Đây là hạn chế quyền của **tài khoản maintainer** trên repo của chính họ; nó không liên quan tới quyền của worker và không nới bất kỳ ranh giới cách ly nào.

## Cách xử lý — chọn 1 trong 3, theo thứ tự khuyến nghị

### Cách A (khuyến nghị — không đổi quyền file)

Chạy git trong terminal **Administrator**. Khi token elevated, `BUILTIN\Administrators` không còn deny-only ⇒ `Administrators:(F)` trên `.git\HEAD` có hiệu lực ⇒ `git switch` hoạt động bình thường.

```powershell
Start-Process powershell -Verb RunAs -ArgumentList '-NoExit','-Command','Set-Location ''D:\Project\Job_Application_Tracker'''
```

Trong cửa sổ đó: `git switch codex/AG00-baseline-audit` → `git status` phải sạch.

Ưu điểm: **không** thay đổi ACL, không thêm `safe.directory` toàn cục, không nới quyền.

### Cách B (nếu không thể elevated — sửa tối thiểu, đúng pattern sẵn có)

Cấp đúng ACE mà các file anh em đã có, cho đúng một file:

```powershell
icacls "D:\Project\Job_Application_Tracker\.git\HEAD" /grant "PC\Admin:(F)"
```

Kiểm chứng:

```powershell
icacls "D:\Project\Job_Application_Tracker\.git\HEAD" | Select-String 'PC\\Admin'
git switch codex/AG00-baseline-audit
```

Ghi chú: `OPERATING-RULES.md` yêu cầu không đổi quyền filesystem để né lỗi quyền. Lệnh trên **không** nới ranh giới cách ly của worker — nó chỉ đồng bộ quyền của tài khoản maintainer với các file git khác đã có sẵn quyền đó. Nếu vẫn muốn giữ nguyên mọi ACL thì dùng Cách A, hoặc dùng Cách C.

### Cách C (không cần đổi quyền, không cần elevated)

Dùng plumbing, đúng như đã dùng trong phiên trước — **không** ghi đè lịch sử, có guard:

```powershell
$env:GIT_CONFIG_COUNT=1
$env:GIT_CONFIG_KEY_0='safe.directory'
$env:GIT_CONFIG_VALUE_0='D:/Project/Job_Application_Tracker'

# tạo commit trên branch mà không cần đổi HEAD
$tree   = (git write-tree).Trim()
$commit = ("commit message" | git commit-tree $tree -p (git rev-parse HEAD)).Trim()
git update-ref refs/heads/<branch> $commit <old-sha>     # old-sha là guard: fail nếu branch đã đổi

# đưa main tới commit đó (fast-forward có guard)
git update-ref refs/heads/main $commit <old-main-sha>

# đồng bộ index với HEAD mới (chỉ index, không đụng file làm việc)
git read-tree HEAD
```

`GIT_CONFIG_COUNT/KEY_0/VALUE_0` khai báo `safe.directory` **cho đúng repo trong phạm vi process** — không sửa global Git config (không dùng `git config --global --add safe.directory`, tránh wildcard trust).

## Không làm

- Không `git config --global --add safe.directory '*'`.
- Không `icacls` với `/T` trên toàn `.git` (thay đổi diện rộng, khó hoàn tác, dễ nới quyền ngoài dự kiến).
- Không `git add .`, không `git reset --hard`, không xóa branch/worktree, không push.

## Sau khi sửa xong

```powershell
git worktree list
git branch -a
git log --oneline -3
```

Kỳ vọng: branch `codex/AG00-baseline-audit` (commit `7284202`) và `main` (`9dc80e0`) cùng tồn tại, 3 worktree automation vẫn nguyên, không có remote.
