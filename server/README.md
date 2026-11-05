# Server realtime — Chùa An Nhiên

Server cho game đi chùa online "Chùa An Nhiên" (chùa hư cấu): người online cùng thắp hương, gõ chuông,
thả đèn hoa đăng, thấy nhau theo từng khu; kèm trang quản trị kiểm duyệt.

- **Node 22 · TypeScript strict · Fastify 5 · Socket.IO 4 · SQLite (better-sqlite3) · zod · pino · prom-client**
- Hợp đồng giao thức: [`../shared/protocol.ts`](../shared/protocol.ts) · mô tả: [`../shared/PROTOCOL.md`](../shared/PROTOCOL.md)
- Trang quản trị: [`../admin/`](../admin) phục vụ tại `/admin/`
- Quyết định thiết kế: [`DECISIONS.md`](DECISIONS.md) · Triển khai: [`DEPLOY.md`](DEPLOY.md) · Tải: [`LOADTEST.md`](LOADTEST.md) · Bàn giao: [`HANDOFF.md`](HANDOFF.md)

## Chạy nhanh

```bash
cd server
npm ci
npm run build
ADMIN_PASSWORD=doi-mat-khau npm start      # http://localhost:8080
```

| Lệnh | |
|---|---|
| `npm run typecheck` | `tsc` strict (gồm `shared/`, test, script) |
| `npm run build` | esbuild → `dist/index.js`, `dist/loadtest.js` |
| `npm test` | Vitest: unit + tích hợp socket nhiều client |
| `npm run dev` | build + chạy |
| `npm run loadtest` | 500 rồi 1000 client, ghi `LOADTEST.md` (cần build trước) |
| `docker compose up --build` | chạy bằng Docker (cần `.env`, xem `.env.example`) |

Cấu hình hoàn toàn qua biến môi trường — bảng đầy đủ trong [`DEPLOY.md`](DEPLOY.md#biến-môi-trường).

## Cấu trúc

```
server/
  src/
    index.ts            khởi động, tắt an toàn (SIGTERM)
    app.ts              ráp Fastify + Socket.IO + repo + hub; seed từ cấm
    config.ts           đọc env (zod), cờ ONLINE_FEATURES / MODERATION_MODE
    realtime/hub.ts     mọi sự kiện socket: validate → feature flag → rate limit → xử lý → phát
    services/
      filter.ts         lọc nội dung đèn (từ cấm có/không dấu, chèn ký tự, link, SĐT, quảng cáo)
      presence.ts       đếm online & theo khu
      rateLimit.ts      sliding window + cooldown
      rooms.ts          phòng riêng gia đình (EXT)
      identity.ts       băm deviceId, biệt danh ngẫu nhiên
    repo/types.ts       interface repository (async → thay Postgres được)
    repo/sqlite.ts      cài đặt SQLite
    http/api.ts         /api/health, /api/lanterns, /api/stats, /api/me/delete, /metrics
    http/admin.ts       /admin/api/* (cookie httpOnly, CSRF header)
  test/                 vitest
  scripts/loadtest.ts
  data/banned-words.json  từ cấm mặc định (seed lần đầu)
```

## Luồng chính

1. Client kết nối Socket.IO → `hello {deviceId, nickname, lang}` → server băm deviceId (SHA-256 + `DEVICE_SALT`),
   tạo/tìm user, trả `welcome` (kèm hương 3 phút gần nhất).
2. `enter_area` cập nhật presence; server phát `presence` gộp mỗi 3 s khi có thay đổi.
3. `light_incense` / `ring_bell` / `release_lantern` / `like_lantern` → kiểm tra → lưu → phát cho mọi người
   (trừ những người có quan hệ chặn với tác giả).
4. `report` đủ 3 người khác nhau → tự ẩn chờ duyệt; admin duyệt/ẩn trong `/admin/`.
5. `POST /api/me/delete {deviceId}` xoá mọi dữ liệu của thiết bị.

## Kiểm thử

`npm test` gồm: bộ lọc từ (có dấu/không dấu, "đ.ị.t", leet, link, SĐT, quảng cáo), rate limiter, repository SQLite,
tích hợp socket (hello/presence/hương/chuông/đèn/tim/báo cáo/chặn/xoá/phòng), admin API, payload rác, flood,
giới hạn kết nối/IP, CORS, HTTP rate limit, metrics, cờ tính năng, khôi phục sau khởi động lại.
