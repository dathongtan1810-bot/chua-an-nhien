# Kết quả load test

Chạy: `npm run build && npm run loadtest` — 2026-11-05T03:57:12.796Z

Máy: 4 vCPU (Intel(R) Xeon(R) Processor @ 2.10GHz), RAM 16 GB, Node v22.23.4.
Server chạy tiến trình con trên cùng máy (client và server dùng chung CPU → số liệu là cận trên bi quan).
Mỗi client có IP giả qua `x-forwarded-for` (TRUST_PROXY=true) để không bị giới hạn kết nối/IP.

## 500 client

| Chỉ số | Giá trị |
|---|---|
| Client | 500 (kết nối được 500, lỗi 0) |
| Thời lượng | 33 s |
| Kết nối p50 / p95 | 23.7 ms / 58.2 ms |
| hello→welcome p50 / p95 | 9.1 ms / 23.0 ms |
| Fan-out chuông p50 / p95 / p99 | 6.1 ms / 11.7 ms / 13.3 ms |
| Chuông gửi / lượt nhận | 8 / 4000 (kỳ vọng ≈ 4000) |
| Sự kiện C→S / S→C | 3432 / 352236 |
| rate_limited | 121 |
| error | {"already_liked":115} |
| Ngắt kết nối ngoài ý muốn | 0 |
| presence.online cuối | 500 |
| CPU server (trung bình 1 lõi) | 15.7% |
| RSS / heap server | 124 MB / 37 MB |

## 1000 client

| Chỉ số | Giá trị |
|---|---|
| Client | 1000 (kết nối được 1000, lỗi 0) |
| Thời lượng | 35 s |
| Kết nối p50 / p95 | 19.5 ms / 53.8 ms |
| hello→welcome p50 / p95 | 14.9 ms / 34.7 ms |
| Fan-out chuông p50 / p95 / p99 | 9.7 ms / 23.2 ms / 29.7 ms |
| Chuông gửi / lượt nhận | 8 / 8000 (kỳ vọng ≈ 8000) |
| Sự kiện C→S / S→C | 6785 / 1356555 |
| rate_limited | 232 |
| error | {"already_liked":223} |
| Ngắt kết nối ngoài ý muốn | 0 |
| presence.online cuối | 1000 |
| CPU server (trung bình 1 lõi) | 40.5% |
| RSS / heap server | 151 MB / 65 MB |

## Nhận xét

- Chuông được fan-out tới mọi client; độ trễ đo từ lúc client gửi tới lúc từng client nhận (cùng đồng hồ máy).
- `rate_limited` là bình thường: script cố ý gõ chuông sát giới hạn 3 s toàn server và thắp hương ngẫu nhiên.
- Xem `HANDOFF.md` cho các tối ưu đã làm và hướng scale ngang.
