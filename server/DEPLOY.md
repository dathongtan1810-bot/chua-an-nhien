# Triển khai server Chùa An Nhiên

Server là **một tiến trình Node** (Fastify + Socket.IO) dùng **SQLite** trên đĩa bền. Trạng thái realtime
(presence, hương 3 phút, rate limit, phòng riêng) nằm trong bộ nhớ ⇒ **chạy đúng 1 instance** (xem "Scale" bên dưới).

## Biến môi trường

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `PORT` / `HOST` | `8080` / `0.0.0.0` | |
| `NODE_ENV` | `development` | đặt `production` (bật cookie Secure, bắt buộc `DEVICE_SALT`) |
| `DB_PATH` | `./data/chua.db` (Docker: `/data/chua.db`) | phải nằm trên volume bền |
| `REDIS_URL` | rỗng | `redis://...` → chế độ nhiều instance (xem "Scale"). Cần `DATABASE_URL` dùng chung |
| `REDIS_PREFIX` | `chua:` | tiền tố khoá Redis |
| `SOCKET_TRANSPORTS` | rỗng | `websocket` hoặc `websocket,polling`. Rỗng = cả hai khi 1 instance, chỉ websocket khi có `REDIS_URL` |
| `DATABASE_URL` | rỗng | `postgres://...` → dùng PostgreSQL (src/repo/postgres.ts) thay SQLite; sao lưu bằng `pg_dump` |
| `DEVICE_SALT` | — | **bắt buộc** ở production, chuỗi ngẫu nhiên dài; **không đổi** sau khi chạy (đổi = mọi thiết bị thành người mới) |
| `ADMIN_PASSWORD` | rỗng (tắt admin) | mật khẩu trang `/admin/` |
| `SESSION_SECRET` | suy ra từ mật khẩu+salt | khoá ký cookie admin |
| `CORS_ORIGINS` | `*` | danh sách origin cách nhau dấu phẩy, vd `https://chua-an-nhien.vn,capacitor://localhost` |
| `ONLINE_FEATURES` | `all` | `none` hoặc `presence,incense,bell,lantern,report,room` |
| `MODERATION_MODE` | `post` | `pre` = mọi đèn chờ duyệt |
| `MILD_WORD_ACTION` | `reject` | đèn chỉ chứa từ mức nhẹ (mucDo 1 của tu-cam.json): `reject` = từ chối, nhắc sửa; `pending` = nhận nhưng chờ admin duyệt |
| `MAX_CONN_PER_IP` | `20` | |
| `MAX_PAYLOAD_BYTES` | `4096` | gói socket & body HTTP |
| `SOCKET_EVENTS_PER_10S` | `40` | chống flood mỗi socket |
| `HTTP_RATE_PER_MIN` | `120` | mỗi IP cho `/api/*`, `/admin/api/*` |
| `RATE_LIMIT_IP_FACTOR` | `5` | giới hạn theo IP = giới hạn theo người × hệ số. Tăng (vd 100) cho server chạy e2e, nơi mọi client cùng 127.0.0.1 |
| `TRUST_PROXY` | `false` | số proxy tin cậy phía trước (`true` = 1). **Đặt `true` sau load balancer** (Fly/Render: 1 hop). IP thật = phần tử thứ N tính từ **phải** của `X-Forwarded-For` (phần bên trái client tự đặt được nên không tin). Đặt sai số hop = giới hạn theo IP bị lách hoặc gộp nhầm người dùng. |
| `METRICS_TOKEN` | rỗng | nếu đặt, `/metrics` cần `Authorization: Bearer <token>` |
| `BANNED_WORDS_PATH` | rỗng | file JSON từ cấm để seed lần đầu (chỉ khi bảng trống) |
| `LOG_LEVEL` | `info` | |

Sinh salt: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## Chạy local bằng Docker

```bash
cd server
cp .env.example .env   # sửa DEVICE_SALT, ADMIN_PASSWORD
docker compose up --build
# http://localhost:8080/api/health  ·  http://localhost:8080/admin/
```

Build thủ công (context là **gốc repo** vì cần `shared/` và `admin/`):

```bash
docker build -f server/Dockerfile -t chua-an-nhien-server .
```

## Fly.io

1. `fly launch --no-deploy --dockerfile server/Dockerfile` ở **gốc repo** (chọn tên app, region `sin` gần Việt Nam).
2. Tạo volume: `fly volumes create chua_data --size 1 --region sin`
3. Sửa `fly.toml` (đặt ở gốc khi deploy, hoặc giữ trong `server/fly.toml` và dùng `fly deploy -c server/fly.toml`):

```toml
app = "chua-an-nhien"
primary_region = "sin"

[build]
  dockerfile = "server/Dockerfile"

[env]
  NODE_ENV = "production"
  TRUST_PROXY = "true"
  MODERATION_MODE = "post"
  CORS_ORIGINS = "https://chua-an-nhien.vn"

[mounts]
  source = "chua_data"
  destination = "/data"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "off"   # socket realtime cần máy luôn chạy
  min_machines_running = 1
  [http_service.concurrency]
    type = "connections"
    soft_limit = 4000
    hard_limit = 5000

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/health"
  timeout = "3s"
```

4. Bí mật: `fly secrets set DEVICE_SALT=... ADMIN_PASSWORD=... METRICS_TOKEN=...`
5. `fly deploy -c server/fly.toml` (từ gốc repo). **Chỉ 1 máy**: `fly scale count 1`.

## Render

1. New → **Web Service** → chọn repo, Runtime **Docker**, Dockerfile path `server/Dockerfile`, Docker context `.` (gốc repo).
2. Plan có **Persistent Disk** (Starter trở lên): mount path `/data`, 1 GB.
3. Environment: `NODE_ENV=production`, `TRUST_PROXY=true`, `DEVICE_SALT`, `ADMIN_PASSWORD`, `CORS_ORIGINS`, `METRICS_TOKEN`.
4. Health check path: `/api/health`. Instance count: **1** (disk chỉ gắn được 1 instance).
5. Render hỗ trợ WebSocket sẵn; client kết nối `wss://<app>.onrender.com`.

## Client kết nối

```ts
import { io } from 'socket.io-client';
const socket = io('https://chua-an-nhien.fly.dev', { transports: ['websocket'] });
socket.emit('hello', { deviceId, nickname: null, lang: 'vi' });
```

## Vận hành

- **Sao lưu**: trang admin → tab Thống kê → "Tải bản sao lưu" (`GET /admin/api/backup`, sao lưu nóng an toàn). Hoặc thủ công: SQLite ở chế độ WAL. Sao lưu nóng: `sqlite3 /data/chua.db ".backup /data/backup-$(date +%F).db"` (Fly: `fly ssh console`).
- **Giám sát**: scrape `/metrics` (Prometheus/Grafana Cloud). Chỉ số chính: `chua_online_users`, `chua_socket_connections`,
  `chua_rate_limited_total`, `chua_lantern_rejected_total`, `chua_http_request_duration_seconds`.
- **Tắt khẩn cấp tính năng online**: đặt `ONLINE_FEATURES=none` (hoặc bỏ `lantern`) rồi restart; app vẫn chạy offline.
- **Kiểm duyệt gắt hơn** (vd dịp lễ đông người): `MODERATION_MODE=pre`.
- Dừng an toàn: server bắt `SIGTERM`, đóng socket & DB trong ≤ 10 s.

## Scale nhiều instance (khi > ~5–10k người đồng thời)

Đã hỗ trợ sẵn — chỉ cần cấu hình:

1. `DATABASE_URL=postgres://...` — mọi instance dùng chung một Postgres.
2. `REDIS_URL=redis://...` — bật chế độ cụm:
   - `@socket.io/redis-adapter`: mọi sự kiện (chuông, đèn, hương, phòng, ngắt kết nối khi khoá) phát xuyên instance;
   - presence gộp toàn cụm (mỗi instance ghi bản đồ người→khu vào Redis, TTL 10 s);
   - cooldown chuông (20 s/người, 3 s toàn server) kiểm tra & đặt **nguyên tử** bằng Lua;
   - phòng riêng lưu trong Redis (vào phòng nguyên tử, phòng trống tự hết hạn sau 10 phút);
   - hương trong `welcome` đọc từ DB; quan hệ chặn luôn đọc DB.
3. Ở chế độ cụm server mặc định **chỉ nhận websocket** (`SOCKET_TRANSPORTS` rỗng + `REDIS_URL`) → **không cần sticky session**. Client app hiện khai báo `['websocket', 'polling']`: vẫn kết nối được (thử websocket trước); chỉ mạng chặn websocket mới không vào được. Muốn cho phép polling ở chế độ cụm: `SOCKET_TRANSPORTS=websocket,polling` **và** bật sticky session ở load balancer.
4. `REDIS_PREFIX` nếu nhiều môi trường dùng chung một Redis.

Rate limit theo sự kiện (theo người & theo IP), giới hạn chuông/đèn theo IP cũng dùng chung qua Redis (cửa sổ trượt nguyên tử, Lua).
Còn theo từng instance (có chủ đích): giới hạn số kết nối/IP và chống flood theo socket — vì mỗi kết nối chỉ nằm trên một instance. Kiểm thử: `test/cluster.test.ts` (2 instance thật) và toàn bộ bộ test với `TEST_ALL_REDIS=1` (CI job `redis-cluster`).

Fly.io: `fly scale count 3` + Upstash Redis (`fly redis create`) + Fly Postgres; bỏ `[mounts]` (không cần volume SQLite).
