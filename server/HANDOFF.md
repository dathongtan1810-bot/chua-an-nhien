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
| B5 Docker + compose + `fly.toml` + DEPLOY.md | ✅ file xong; **chưa build được image trong sandbox** (docker build không có mạng ra ngoài) → job `docker` trong CI là nơi kiểm chứng |
| B6 load test 500/1000 client | ✅ xem `LOADTEST.md` |
| B7 README / HANDOFF | ✅ |
| Thêm: phòng riêng gia đình (sự kiện EXT `room_*`) | ✅ có test |

## Dành cho người làm client (app/)

- Import type & schema từ `shared/protocol.ts`. Mọi sự kiện gốc giữ **đúng hợp đồng**; phần mở rộng
  (`lantern_liked`, `room_create/join/leave`, `room_state`, `room_left`, ack callback) là tuỳ chọn.
- Thời gian là chuỗi ISO UTC. `error.message` là tiếng Việt hiển thị được.
- Gửi header `x-device-id` khi gọi `GET /api/lanterns` để lọc người đã chặn.
- `MODERATION_MODE=pre`: tác giả vẫn nhận `lantern_released` cho đèn của mình (ack có `status:'pending'`) — nên hiển thị nhãn "đang chờ duyệt".

## Từ cấm

- Mặc định: `server/data/banned-words.json`. Nếu có `server/data/tu-cam.json` thì được gộp vào khi **seed lần đầu** (DB trống).
- Khi DB đã có từ → sửa trong `/admin/` tab "Từ cấm" (có hiệu lực ngay), hoặc xoá bảng `banned_words` để seed lại.
- Quy tắc 04:30 UTC: kiểm tra các nhánh khác có `content/tu-cam.json` → sao chép vào `server/data/tu-cam.json` (xem DECISIONS #18).

## Việc nên làm tiếp

1. Xác nhận job `docker` của CI xanh; deploy thử Fly.io theo DEPLOY.md.
2. Postgres repo (`src/repo/postgres.ts`) + Redis adapter nếu cần > 1 instance.
3. Thêm i18n cho `error.message` theo `lang` (hiện chỉ tiếng Việt).
4. Admin: phân trang đèn khi > 500; nhật ký thao tác admin (audit log).
5. Bộ lọc: bổ sung từ cấm theo phản hồi kiểm duyệt; cân nhắc chế độ "nghi ngờ → pending" thay vì từ chối.

## Rủi ro / lưu ý

- Trạng thái realtime trong bộ nhớ → **chỉ chạy 1 instance**.
- `DEVICE_SALT` đổi = mất liên kết mọi thiết bị với dữ liệu cũ.
- Đồng hồ: "hôm nay" theo UTC+7.
