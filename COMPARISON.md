# So sánh workspace `Job-traccker-cv` với repo GitHub `Job_Application_Tracker`

Ngày thực hiện: 2026-11-05.

## 1. Kết luận nhanh

`F:\Project\Job-traccker-cv` **không phải mã nguồn dự án**. Đó là gói xuất lịch sử hội thoại (67 MB JSON + `conversation.md`) của các phiên phát triển trước. Mã nguồn thật nằm trên GitHub và đã được clone về `F:\Project\Job_Application_Tracker` như yêu cầu.

| | `F:\Project\Job-traccker-cv` | `F:\Project\Job_Application_Tracker` |
| --- | --- | --- |
| Bản chất | Lịch sử chat/export từ Antigravity + Kilo Code | Mã nguồn monorepo |
| Nội dung | `full_data.json`, `conversation.md`, `dialogue.json`, `subagents_full_data.json`, 4 thư mục session | 633 file được Git theo dõi |
| Có chạy được | Không | Có (web 64364, API 64366, PostgreSQL 55432) |
| Git | Không | Có, HEAD `f74f2a6` |

## 2. Repo GitHub

- URL: `https://github.com/tan21072005/Job_Application_Tracker`
- Clone: `F:\Project\Job_Application_Tracker` (đúng tên repo, đúng yêu cầu lưu vào `F:\Project`)
- Nhánh: `main`, commit mới nhất `f74f2a6` — "feat(privacy): implement enterprise data privacy sovereign ai governance and cross border transfer nexus", tác giả Nhat Tan, 2026-10-25.
- Quyền truy cập: repo **private** (API GitHub trả 404, clone cần credential). Máy có sẵn credential Git nên clone được.

### Cấu trúc thực tế trong repo

```
apps/web                   React 19 + Vite 8 (154 file) — giao diện chính
apps/api                   Express 5 + TypeScript + PostgreSQL (142 file)
apps/experiences           5 giao diện thử nghiệm (Dossier/Rhythm/Atlas/Workbench/Indexer)
packages/jobtrack-contract 62 file domain dùng chung (schema, validator, công thức)
packages/jobtrack-core     6 file core cho 5 experiences
packages/jobtrack-extension Manifest V3 (PageWeave)
packages/jobtrack-mcp      MCP server
tools/agent-control        Orchestrator/controller/policy + test
tools/sandbox, tools/ops   Công cụ cô lập và vận hành
docs/system-design         Thiết kế hệ thống + openapi.json + schema.sql
planning/                  Hồ sơ kế hoạch và bằng chứng các mốc
deploy/docker              Dockerfile.api, Dockerfile.web, nginx.conf
```

## 3. Những gì repo KHÔNG có (khác với mô tả trong lịch sử chat)

Đây là điểm quan trọng: nhiều tài liệu trong `conversation.md` nhắc tới các đường dẫn không tồn tại trong repo.

| Được nhắc trong lịch sử | Có trong repo? |
| --- | --- |
| `design/JobTrack-UI.drawio` (33 màn hình) | **Không** |
| `design/experiences/*.drawio` (125 trang) | **Không** |
| `planning/jobtrack-ui-redesign/BRIEF.md`, `COMPLETION.md` | **Không** |
| `START-JOBTRACK.cmd`, `START-JOBTRACK-WEB.cmd` | **Không** |
| `deliverables/jobtrack-five-experiences/` | **Không** |
| `references/ui-sources/` | **Không** |
| `apps/web/.impeccable/design.json` | Có |
| `docs/system-design/schema.sql`, `openapi.json` | Có |
| `packages/jobtrack-extension/manifest.json` | Có |

Các tệp bị loại khỏi Git do `.gitignore` (`design/` không bị ignore nhưng chưa từng được commit; `output/`, `evidence/`, `deliverables/`, `references/`, `.tooling/` bị ignore).

## 4. Đối chiếu với các tuyên bố trong lịch sử session

| Tuyên bố trong lịch sử | Thực tế kiểm chứng ngày 2026-11-05 |
| --- | --- |
| "API 188 tests pass" | 352 test, **352 pass** khi chạy tuần tự trên PostgreSQL thật |
| "Web 114 tests pass" | **381 test, 381 pass** (55 file) |
| "Web build pass" | Build thành công (Vite 8.3.4, ~0,8 s) |
| "Backend chạy cổng 64366, web 64364" | Đúng |
| "Milestone 56 privacy nexus đã commit" | Đúng, có `privacy-data-sovereignty-nexus.ts` 45 KB + service + UI + test |
| "Milestone 57 ethics-investigations đã xong 3 tầng" | **Không có trong repo** — chưa từng commit, chỉ tồn tại trong lịch sử chat |
| "Migration 001–007 áp dụng sạch" | Đúng, 7/7 áp dụng thành công trên PostgreSQL 18 |

## 5. Chênh lệch môi trường

- `apps/api/.env` và `apps/web/.env.local` **không có trong repo** (đúng, vì `.env` bị ignore). Phải tự tạo.
- Thiếu `.env.example` dù README nhắc tới — README `apps/api/README.md` dòng 7 nói "theo mẫu `../api/.env.example`" nhưng tệp này không tồn tại.
- `npm ci` ở thư mục gốc workspace là bắt buộc trước khi chạy API, nếu không API sẽ lỗi `Cannot find package '@jobtrack/contract'`.
- `apps/api` cần `argon2` build native; trên máy này npm 11 chặn install-script nên phải chạy `npm install-scripts approve argon2` hoặc kiểm tra module đã build sẵn.

## 6. Việc đã làm trong phiên này

1. Clone repo về `F:\Project\Job_Application_Tracker`.
2. Cài dependency cho `apps/web`, `apps/api` và workspace root.
3. Dựng PostgreSQL 18 bằng Docker CLI (WSL engine), chạy 7 migration.
4. Tạo `apps/api/.env` và `apps/web/.env.development` (`VITE_DATA_MODE=api`) để web dùng API thật.
5. Chạy web + API, smoke test luồng thật: đăng ký → tạo hồ sơ → tạo vòng phỏng vấn → dashboard → đăng xuất → 401 khi chưa đăng nhập.
6. Chạy `npm run test:api` (352/352 pass) và `npm --prefix apps/web run test` (381/381 pass), build web thành công.
7. Kiểm tra giao diện bằng Chrome thật ở 390/768/1440px, phát hiện và sửa 9 lỗi responsive + 1 lỗi tương phản.
8. Dựng toàn stack bằng `docker compose`, phát hiện và sửa 2 lỗi Dockerfile.
9. Viết `RUN-LOCAL.md` hướng dẫn chạy và các lỗi đã gặp.

### Lỗi responsive đã sửa

| Lỗi | Nguyên nhân | Sửa |
| --- | --- | --- |
| Tiêu đề "Hôm nay của bạn" bị bóp 1 ký tự/dòng trên mobile | Nhóm nút trong `page-heading` là `div` con nên không nhận rule thu gọn icon, chiếm hết chiều ngang | Thêm class `page-heading-actions` + CSS thu gọn nút thành icon 44×44 |
| Bottom nav mobile có 7 ô nhồi vào lưới 3 cột, chữ bị cắt | Dùng chung `navigation` của sidebar (6 mục) + nút thêm | Tách `mobileNavigation` 5 mục và đổi lưới thành 5 cột |
| Danh sách hồ sơ mobile: tên vị trí xuống dòng từng ký tự | `application-row.has-checkbox` giữ grid 7 cột của desktop | Thêm grid 4 cột cho mobile |
| Danh sách hồ sơ tablet 768px tràn 156px | 5 nút hành động không thu gọn vì ngưỡng là 700px | Nâng ngưỡng thu gọn lên 1000px, thêm menu "Thao tác khác" |
| Trang Phân tích mobile: bộ lọc thời gian tràn, tiêu đề lệch | `.analytics-view` padding 32px cộng thêm padding `main`, controls không wrap | Bỏ padding, controls cuộn ngang, card nhỏ lại |
| Trang Lộ trình AI mobile tràn 14px | `.roadmap-top-grid` dùng `minmax(360px, 1fr)` lớn hơn viewport khả dụng | Đổi sang 1 cột, giảm padding card |
| Chữ trong thẻ lộ trình tuần 1–4 gần như vô hình | `.milestone-card` định nghĩa hai lần; rule của Succession Studio (nền `#0f172a`) đè lên Career Roadmap, chữ `#17243b` trên nền tối, tương phản **1.15** | Scope rule nền tối vào `.succession-studio-container` |
| Filter bar tablet bị nén chữ ("Tìm công ty hơ", "Tất cả mứ") | Input và 3 select chen trên một hàng ở 768px | Cho `flex-wrap`, search chiếm cả hàng |
| Trang chi tiết desktop: tiêu đề xuống 3 dòng | 7 nút hành động chiếm hết chiều ngang, `.detail-heading` không wrap | Cho `.detail-heading` wrap, khối tiêu đề `flex: 1 1 260px` |

Tất cả sửa đổi giao diện nằm trong 5 file, không thêm comment code (theo quy tắc `AGENTS.md` của repo):

- `apps/web/src/JobTrack.tsx`
- `apps/web/src/jobtrack.css`
- `apps/web/src/views/Applications.tsx`
- `apps/web/src/views/Dashboard.tsx`
- `apps/web/src/views/Datasets.tsx`

## 7. Kết quả các bộ kiểm tra khác của repo

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm run check:contract` | **278/278 pass** | Contract package build + test sạch |
| `npm run test:extension` | **9/9 pass** | Manifest V3 |
| `npm run test:web` | **381/381 pass** | 55 file |
| `npm run test:api` | **352/352 pass** | Chạy tuần tự trên PostgreSQL thật |
| `npm run build:web` | Pass | Vite 8.3.4 |
| `npm run agents:test` | 172/214 pass, 37 fail | **Hạ tầng thiếu, không phải lỗi sản phẩm**: test gọi `rtk proxy git` (không có `rtk` trên máy) và `docker` qua `spawnSync` không thấy binary trong PATH của node |
| `npm run test:agent-loop` | 1 fail | Cùng nguyên nhân `rtk` |
| `npm run check:mcp` | **5/5 pass** | Cần đặt `DATABASE_URL` và `TEST_DATABASE_URL` cùng trỏ `127.0.0.1:55432`; mặc định subprocess dùng cổng 5432 nên fail |
| `apps/experiences` (5 giao diện) | Cả 6 route trả 200 và render đúng | `npx vite --port 64363` từ `apps/experiences`; lưu ý `npm run dev:experiences -- --port` không truyền được cờ qua npm |
| `docker compose up -d` (toàn stack) | **3 container healthy**: postgres, api, web | Kiểm chứng qua nginx: web 200, `/api/ready` trả `version: 7`, smoke test đầy đủ 201/201/201/204 |

Ba bộ sau thuộc hạ tầng điều phối agent (`tools/agent-control`, `tools/agent-loop`), không phải luồng sản phẩm. Chúng cần `rtk` — một wrapper nội bộ của quy trình agent, **không có trên máy này và không phải gói npm `rtk`** (gói npm đó là công cụ release versioning của cliffano, không liên quan).

## Công cụ đã kiểm tra là có sẵn

| Công cụ | Đường dẫn | Phiên bản |
| --- | --- | --- |
| Docker CLI | `F:\long-app\docker\bin\docker.exe` | 29.9.2 |
| Docker Compose | `F:\long-app\docker\cli-plugins\docker-compose.exe` | 5.7.0 |
| Docker Engine | Ubuntu WSL2, `tcp://127.0.0.1:2375` | 29.1.3 |
| Node.js | WinGet Packages `node-v24.20.0-win-x64` | 24.20.0 |
| npm | cùng thư mục | 11.19.0 |
| Git | `C:\Program Files\Git\cmd` | 2.x |

Tất cả đã nằm trong PATH hệ thống (`Machine` + `User`). Chỉ shell mở trước thời điểm cài mới cần nạp lại.

## 8. Lỗi thật phát hiện thêm khi dựng Docker Compose

Dựng toàn stack lần đầu thất bại ở 4 điểm, tất cả đều là lỗi trong repo:

| Lỗi | Nguyên nhân | Sửa |
| --- | --- | --- |
| `initdb: directory "/var/lib/postgresql/18/docker" exists but is not empty` | Volume `jobtrack-postgres-data` còn dữ liệu từ container tạo bằng mount path khác | Chỉ cần dọn volume cũ; cấu hình compose đúng |
| `Cannot find module '/app/packages/jobtrack-mcp/src/mcp-server.ts'` | `Dockerfile.api` thiếu `COPY packages/jobtrack-mcp` dù `server.ts` import | Thêm dòng COPY |
| `Cannot find package '@jobtrack/contract'` | `npm install --omit=dev` trong `apps/api` không link được workspace package | Copy contract rồi tạo symlink `node_modules/@jobtrack/contract` |
| Bản container hiện 12 hồ sơ mẫu thay vì dữ liệu thật | `VITE_DATA_MODE` chỉ có trong `.env.development`, không áp dụng khi build production | Thêm `ENV VITE_DATA_MODE=api` vào `Dockerfile.web` |

Sau khi sửa, `docker compose up -d` cho 3 container healthy và smoke test qua nginx đạt đủ.

## 9. Chưa làm

- Chưa commit/push các sửa đổi. **Cần bạn quyết định**: xem mục 10 bên dưới.
- Chưa kiểm thử các tính năng AI/MCP/n8n vì cần API key và dịch vụ ngoài.
- Chưa cài `rtk` vì đây là wrapper nội bộ không có bản phát hành công khai; muốn chạy bộ test điều phối agent cần lấy `rtk` từ đúng nguồn của quy trình đó.

## 10. Commit sẽ gồm những gì

Nếu bạn muốn commit, đây chính xác là nội dung:

**Sửa lỗi giao diện (5 file):**

| File | Thay đổi |
| --- | --- |
| `apps/web/src/JobTrack.tsx` | Tách `mobileNavigation` 5 mục riêng cho bottom nav |
| `apps/web/src/jobtrack.css` | +79 dòng: `.page-heading-actions`, menu "Thao tác khác", bottom nav 5 cột, grid mobile cho danh sách có checkbox, rule responsive cho Analytics/Roadmap, scope `.milestone-card` vào Succession Studio để hết lỗi chữ vô hình |
| `apps/web/src/views/Applications.tsx` | Gom 4 nút phụ vào `<details>` trên mobile, giữ nguyên trên desktop |
| `apps/web/src/views/Dashboard.tsx` | Đổi `div` inline-style sang class `page-heading-actions` |
| `apps/web/src/views/Datasets.tsx` | Như trên |

**Sửa lỗi Docker (2 file):**

| File | Thay đổi |
| --- | --- |
| `deploy/docker/Dockerfile.api` | COPY thêm `packages/jobtrack-mcp`, symlink `@jobtrack/contract` |
| `deploy/docker/Dockerfile.web` | Thêm `ENV VITE_DATA_MODE=api` |

**Tài liệu và công cụ mới:**

| File | Nội dung |
| --- | --- |
| `COMPARISON.md` | So sánh workspace vs repo, kết quả kiểm chứng |
| `RUN-LOCAL.md` | Hướng dẫn chạy bằng Docker Compose và dev mode |
| `tools/verify/` (7 script) | smoke API, audit responsive 3 kích thước, kiểm tra desktop/mobile |

Không có file nào trong `.gitignore` bị thêm vào. `.env`, `node_modules`, `output/` đều bị loại trừ đúng.
