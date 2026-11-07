# HANDOFF — server Chùa An Nhiên

_Cập nhật lần cuối: 2026-11-05 ~06:56 UTC (xem `git log -- server/HANDOFF.md`)._

## Trạng thái

| Giai đoạn | Trạng thái |
|---|---|
| B0 scaffold + `shared/protocol.ts` + CI (`.github/workflows/server-ci.yml`) | ✅ |
| B1 hello / presence / hương / chuông | ✅ |
| B2 đèn hoa đăng + kiểm duyệt + báo cáo/chặn + xoá dữ liệu | ✅ |
| B3 trang admin (`admin/`) + admin API | ✅ (kiểm tra bằng Playwright: đăng nhập, 5 tab, không lỗi JS) |
| B4 bảo mật, rate limit, metrics | ✅ |
| B5 Docker + compose + `fly.toml` + DEPLOY.md | ✅ image build xanh trên CI (job `docker`); sandbox không build được do docker build không có mạng |
| B6 load test 500/1000 client | ✅ xem `LOADTEST.md` |
| B7 README / HANDOFF | ✅ |
| Thêm: phòng riêng gia đình (sự kiện EXT `room_*`) | ✅ có test |

## Dành cho người làm client (app/)

- Import type & schema từ `shared/protocol.ts`. Mọi sự kiện gốc giữ **đúng hợp đồng**; phần mở rộng
  (`lantern_liked`, `room_create/join/leave`, `room_state`, `room_left`, ack callback) là tuỳ chọn.
- Thời gian là chuỗi ISO UTC. `error.message` hiển thị được cho người dùng: tiếng Anh nếu `hello.lang` bắt đầu bằng `en`, còn lại tiếng Việt.
- `TRUST_PROXY` là số hop proxy (DEPLOY.md). Không đổi `deviceId` trên cùng kết nối.
- Gửi header `x-device-id` khi gọi `GET /api/lanterns` để lọc người đã chặn.
- `MODERATION_MODE=pre`: tác giả vẫn nhận `lantern_released` cho đèn của mình (ack có `status:'pending'`) — nên hiển thị nhãn "đang chờ duyệt".

## Từ cấm

- **Đã tích hợp `content/tu-cam.json`** của nhánh nội dung → `server/data/tu-cam.json` (nguồn chính). `server/data/banned-words.json` chỉ là dự phòng.
- Seed vào bảng `banned_words` khi DB trống; sau đó sửa trong `/admin/` tab "Từ cấm" hoặc bấm **"Nạp lại từ file gốc"**.
- Khi nhóm nội dung cập nhật tu-cam.json: copy lại file vào `server/data/tu-cam.json`, chạy `npm test` (test tương thích dùng chính bộ ca của họ: `test/fixtures/tu-cam.test.mjs.txt` — copy lại cả file test), deploy, rồi bấm "Nạp lại".
- Mã hoá dòng: `từ` / `~lách` / `+allowlist` / `=đúng chữ` (DECISIONS #25, #29).

## Đã làm thêm (tăng độ bền)

- Review bảo mật bằng subagent → sửa 7 lỗi (race 3 đèn/giờ, giả mạo X-Forwarded-For, lách khoá bằng tự xoá, lộ nội dung giữa 2 người chặn nhau khi tác giả offline, lách HTTP rate limit bằng `%61`, phòng không dọn khi đổi deviceId, crash do unhandled rejection). Test hồi quy: `test/regressions.test.ts`.
- Bộ lọc: 0 chặn nhầm trên 300 lời nguyện mẫu + 919 câu nội dung khác; nhanh gấp 40 lần (0,8 ms/câu).
- Báo cáo đếm theo IP băm (chống 1 người nhiều deviceId); i18n thông điệp lỗi vi/en; test rò rỉ bộ nhớ; migration SQLite theo `user_version`.

- PostgreSQL (`DATABASE_URL`, `src/repo/postgres.ts`): toàn bộ test tích hợp chạy trên Postgres 16 thật (`TEST_ALL_PG=1`), CI `server-postgres.yml`.
- Admin: nhật ký thao tác, tải sao lưu SQLite, "Nạp lại từ file gốc" cho từ cấm. Soak test + gauge `chua_internal_entries`.
- Kiểm tra 04:30 (thực hiện 06:35 do phiên bị gián đoạn vì giới hạn sử dụng): `content/tu-cam.json` trên `origin/claude/sweet-tesla-9rdbof` **trùng** với `server/data/tu-cam.json`.

## Phiên bị gián đoạn

Từ ~04:11 đến 06:30 UTC phiên dừng do hết hạn mức sử dụng; sau đó làm tiếp theo yêu cầu "sửa tiếp các ghi chú trong HANDOFF".

### Review lần 2 — đã xử lý hết

| Ghi chú | Kết quả |
|---|---|
| `*` thay chữ ("f*ck", "đ*t mẹ") lọt | ✅ `*` giữa chữ cái = ký tự đại diện 1 ký tự (DECISIONS #32) |
| Từ 3 ký tự bị tách ("đ ịt", "l ồn") lọt | ✅ ghép bản có dấu; không ghép không dấu (không chặn nhầm "lon len") |
| `MAX_SPAN` cố định | ✅ theo mẫu dài nhất + 1 (4..12) |
| Allowlist không che `raw`; backup để lại file tạm | ✅ |
| Chưa so sánh `postgres.ts` ↔ `sqlite.ts` | ✅ đã review; thêm test đồng thời trên Postgres thật (tim/báo cáo/tạo user trùng) |
| (mới phát hiện) "lý do cho con" bị chặn nhầm là "đồ chó" | ✅ cụm không dấu chỉ tính khi token sát hai bên cũng không dấu |
| (mới phát hiện) 2 instance khởi động cùng lúc trên Postgres → lỗi tạo bảng | ✅ advisory lock |
| (mới phát hiện, CI) unhandled "Connection is closed" khi đóng server ở chế độ cụm | ✅ lệnh không-chờ của redis-adapter được bắt sẵn; tái hiện tất định bằng proxy chậm (`cluster.test.ts`) |

### "Việc nên làm tiếp" cũ — trạng thái

| Mục | Trạng thái |
|---|---|
| Deploy thử Fly.io | ⏳ **cần tài khoản/token Fly của bạn** (phiên này không có). Làm theo DEPLOY.md: `fly launch` → `fly volumes create` → `fly secrets set` → `fly deploy -c server/fly.toml`. |
| Postgres + Redis cho > 1 instance | ✅ `DATABASE_URL` + `REDIS_URL` (DEPLOY.md "Scale"); test 2 instance thật + toàn bộ bộ test ở chế độ cụm; load test cụm 800 client (LOADTEST.md) |
| Dùng `mucDo` của tu-cam.json | ✅ `MILD_WORD_ACTION=reject\|pending` (mặc định reject như cũ) |
| Admin phân trang đèn; audit log | ✅ con trỏ `before` + nút "Tải thêm"; nhật ký thao tác |
| "Nghi ngờ → pending" | ✅ chính là `MILD_WORD_ACTION=pending` cho từ mức nhẹ |

## Đối chiếu với client app (nhánh `claude/jolly-mendel-hppn0t`, 07/11)

Nhánh app đã merge server/shared mới nhất. So `app/src/net/protocol.ts` với server, đã bổ sung phía server (chỉ THÊM, không phá hợp đồng):
- `lantern_released` / `GET /api/lanterns` có **`userId`** tác giả — trước đây thiếu nên nút "Chặn" tác giả trong app (`rituals/lantern.ts`) không bao giờ hiện khi chạy server thật.
- Màu **`#rgb`** (app chấp nhận) được server nhận.
- `/api/stats` có `incenseToday`/`lanternsToday`/`bellsToday`; `/api/health` có `uptime`/`online` (tên app đọc).
- `SOCKET_TRANSPORTS`: chế độ cụm mặc định chỉ websocket (app khai báo `['websocket','polling']`, polling cần sticky session).
Test: `test/client-compat.test.ts`.

**Kiểm thử đầu-cuối với client thật** (07/11): chạy `app/src/net/socket-client.ts` của nhánh app (không sửa) với `server/dist/index.js` — 15/15 kịch bản PASS:
welcome 2 người, hương/chuông/đèn phát chéo, đèn có `userId`, thả tim, lọc nội dung, lỗi tiếng Anh khi `lang=en`, phòng gia đình (mã chữ thường),
REST `fetchLanterns`/`stats`/`health`, chặn từ đèn ⇒ không còn thấy đèn, **server khởi động lại ⇒ client tự kết nối & hello lại cùng userId**, `deleteMyData`.
Cách chạy lại: `git archive origin/claude/jolly-mendel-hppn0t app/src | tar -x -C <thư mục nháp>`, symlink `node_modules` → `server/node_modules`, viết script import `SocketClient` rồi chạy bằng `tsx`.

**Ghi chú cho nhóm app**: có thể bỏ `'polling'` khỏi `transports` nếu deploy nhiều instance; `app/src/net/protocol.ts` có thể import thẳng `shared/protocol.ts` để tránh lệch.

## Việc nên làm tiếp

1. **Deploy** lên Fly.io/Render (cần thông tin tài khoản) và đặt `DEVICE_SALT`, `ADMIN_PASSWORD`, `CORS_ORIGINS` thật.
2. **Báo nhóm nội dung**: 2 câu trong chính nội dung của họ bị danh sách của họ chặn — "…chạy theo những cách **kiếm tiền nhanh**" (thong-diep-ngay) và "Tránh **cờ bạc**, vay nóng…" — nên thêm allowlist ("cách kiếm tiền nhanh", "tránh cờ bạc", "bỏ cờ bạc"…) nếu lời nguyện kiểu này cần qua.
3. Lọt có chủ đích: leet 2 chữ số liền ("t40", "fr33") — đổi thì chặn nhầm "Mã D17"/"giấy A4".
4. ~~Chế độ cụm: rate limit theo sự kiện tính riêng từng instance~~ → ✅ đã chuyển sang Redis (`windowHits`); chỉ giới hạn kết nối/IP & chống flood theo socket còn theo từng instance (có chủ đích).
5. Nếu bật `MILD_WORD_ACTION` hoặc cập nhật tu-cam.json trên DB đã chạy: vào admin bấm **"Nạp lại từ file gốc"** (để có tiền tố `!` mức nhẹ).

## Rủi ro / lưu ý

- Không đặt `REDIS_URL` → trạng thái realtime trong bộ nhớ → **chỉ chạy 1 instance**. Muốn nhiều instance: `DATABASE_URL` + `REDIS_URL`.
- `DEVICE_SALT` đổi = mất liên kết mọi thiết bị với dữ liệu cũ.
- Đồng hồ: "hôm nay" theo UTC+7.
