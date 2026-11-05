# Giao thức realtime — Chùa An Nhiên

Nguồn sự thật: [`shared/protocol.ts`](./protocol.ts) (type TypeScript + zod schema). File này mô tả bằng lời.

- Transport: **Socket.IO v4** (client nên dùng `transports: ['websocket']`), cùng cổng với REST.
- Mọi thời gian (`at`, `serverTime`) là **chuỗi ISO-8601 UTC**.
- Payload C→S được kiểm tra bằng zod; sai → sự kiện `error {code:'invalid_payload'}`.
- Kích thước tối đa mỗi gói: `MAX_PAYLOAD_BYTES` (mặc định 4 KB).
- **Ack tuỳ chọn**: mọi sự kiện C→S có thể kèm callback cuối; server trả
  `{ok:true, ...}` hoặc `{ok:false, code, retryAfterMs?}`. Client không dùng ack vẫn nhận `error`/`rate_limited` như bình thường.
- Phải gửi `hello` trước mọi sự kiện khác (nếu không → `error {code:'not_hello'}`).

## Khu vực (`area`)

`cong | san | chinh-dien | lau-chuong | ho-sen | bo-song | am-xam | thien-duong`

## Client → Server (hợp đồng gốc)

| Sự kiện | Payload | Ghi chú |
|---|---|---|
| `hello` | `{deviceId, nickname, lang}` | `deviceId` 8–128 ký tự `[A-Za-z0-9._:-]` (UUID khuyến nghị). `nickname` có thể rỗng/null → server cấp biệt danh tiếng Việt ngẫu nhiên; biệt danh tục bị thay. `lang` 2–10 ký tự. Gửi lại `hello` để đổi biệt danh. |
| `enter_area` | `{area}` | |
| `light_incense` | `{count}` | số nguyên 1–9. Mỗi người 1 lần/15 s. |
| `ring_bell` | `{force}` | số 0–1. Mỗi người 1 lần/20 s, toàn server tối đa 1 lần/3 s. |
| `release_lantern` | `{text, color}` | `text` ≤ 120 ký tự sau chuẩn hoá; `color` = `#rrggbb` hoặc tên màu `[a-z-]`. 3 đèn/giờ/người. Ack: `{ok:true, id, status:'approved'|'pending'}`. |
| `like_lantern` | `{id}` | mỗi người 1 lần/đèn (`already_liked`). |
| `report` | `{type:'lantern'|'user', id, reason}` | `reason` ≤ 200 ký tự (có thể rỗng). Đủ 3 người khác nhau báo cáo → tự ẩn chờ duyệt. Ack: `{ok:true, autoHidden}`. |
| `block_user` | `{userId}` | Hai bên không còn thấy đèn/hương của nhau (realtime + REST). |

## Server → Client (hợp đồng gốc)

| Sự kiện | Payload |
|---|---|
| `welcome` | `{userId, nickname, online, areas, incense[], serverTime}` — `areas` là map khu → số người; `incense` = hương thắp trong 3 phút gần nhất `[{userId, nickname, count, at}]`. |
| `presence` | `{online, areas}` — phát gộp mỗi 3 s, **chỉ khi có thay đổi**. `online` đếm theo người (nhiều tab cùng thiết bị = 1). |
| `incense_lit` | `{userId, nickname, count, at}` |
| `bell_rung` | `{force, at}` |
| `lantern_released` | `{id, text, color, nickname, at, likes}` — khi `MODERATION_MODE=pre` (hoặc người dùng bị gắn cờ), chỉ **tác giả** nhận ngay; mọi người nhận khi admin duyệt. |
| `lantern_removed` | `{id}` — đèn bị ẩn (báo cáo/admin), tác giả xoá dữ liệu, hoặc do chặn. |
| `rate_limited` | `{event, retryAfterMs}` |
| `error` | `{code, message}` — `code` ∈ `invalid_payload, not_hello, banned, feature_disabled, content_rejected, not_found, already_liked, already_reported, cannot_target_self, room_not_found, room_full, too_many_connections, internal`. `message` là tiếng Việt, hiển thị được cho người dùng. |

Khi bị khoá (`banned`) server gửi `error` rồi ngắt kết nối. Vượt số kết nối/IP → `connect_error` với message `too_many_connections`.

## REST

| Route | Mô tả |
|---|---|
| `GET /api/health` | `{ok, uptimeSec, version, serverTime}` |
| `GET /api/lanterns?since=ISO` | `{lanterns: LanternPayload[], serverTime}` — đèn đã duyệt, chưa hết hạn (24 h), mới nhất trước, tối đa 200. Header tuỳ chọn `x-device-id` để lọc người đã chặn. |
| `GET /api/stats` | `{online, areas, today:{lanterns, incense, bells}, serverTime}` — "hôm nay" theo giờ Việt Nam (UTC+7). |
| `POST /api/me/delete` | body `{deviceId}` → `{ok:true, deleted:{lanterns, likes, reports, blocks, incense, user}}`. Luôn trả `ok` (kể cả deviceId không tồn tại). Ngắt mọi kết nối của thiết bị. |
| `GET /metrics` | Prometheus (nếu đặt `METRICS_TOKEN` thì cần `Authorization: Bearer <token>`). |

## MỞ RỘNG (EXT) — không phá hợp đồng gốc

Các sự kiện dưới đây là **bổ sung**; client cũ có thể bỏ qua.

### `lantern_liked` (S→C)
`{id, likes}` — số tim mới của đèn, phát cho mọi người (trừ người bị chặn với tác giả).

### Phòng riêng "đi chùa cùng gia đình"
Mã phòng 6 ký tự `[A-HJ-NP-Z2-9]` (bỏ I, O, 0, 1). Tối đa 20 người/phòng, mỗi người ở tối đa 1 phòng.
Phòng chỉ là lớp "thấy nhau": thành viên thấy ai đang ở khu nào; hương/chuông/đèn vẫn là chung toàn chùa.

| Sự kiện | Hướng | Payload |
|---|---|---|
| `room_create` | C→S | `{}` → ack `{ok:true, code}`; người tạo tự vào phòng. |
| `room_join` | C→S | `{code}` (không phân biệt hoa thường) → ack `{ok:true, code}` hoặc `error room_not_found / room_full`. Vào phòng mới sẽ tự rời phòng cũ. |
| `room_leave` | C→S | `{}` |
| `room_state` | S→C | `{code, members:[{userId, nickname, area}]}` — gửi cho cả phòng khi có người vào/ra/đổi khu. |
| `room_left` | S→C | `{code}` — bạn đã rời phòng. |

Phòng không lưu DB; người dùng rời phòng khi đóng kết nối cuối cùng (client nên lưu mã và `room_join` lại khi kết nối lại). Phòng trống quá 10 phút bị huỷ. Tính năng bật/tắt bằng `ONLINE_FEATURES` (khoá `room`).
