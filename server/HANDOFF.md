# HANDOFF — server Chùa An Nhiên

_Cập nhật lần cuối: xem `git log -- server/HANDOFF.md`._

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

## Việc nên làm tiếp

1. Deploy thử Fly.io theo DEPLOY.md (job `docker` của CI đã xanh).
2. Postgres repo (`src/repo/postgres.ts`) + Redis adapter nếu cần > 1 instance.
3. Dùng `mucDo` của tu-cam.json (vd mức 1 → chờ duyệt thay vì từ chối) nếu nhóm sản phẩm muốn.
4. Admin: phân trang đèn khi > 500; nhật ký thao tác admin (audit log).
5. Bộ lọc: bổ sung từ cấm theo phản hồi kiểm duyệt; cân nhắc chế độ "nghi ngờ → pending" thay vì từ chối.

## Rủi ro / lưu ý

- Trạng thái realtime trong bộ nhớ → **chỉ chạy 1 instance**.
- `DEVICE_SALT` đổi = mất liên kết mọi thiết bị với dữ liệu cũ.
- Đồng hồ: "hôm nay" theo UTC+7.
