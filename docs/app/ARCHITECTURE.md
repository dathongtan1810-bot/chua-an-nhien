# Kiến trúc app — Chùa An Nhiên

```
app/
├─ index.html              # canvas #game + overlay HTML #ui
├─ public/                 # manifest, sw.js (offline), icons, privacy.html
├─ src/
│  ├─ main.ts              # khởi động Phaser (540×960, Scale.FIT), màn chào, HUD, net, PWA, native
│  ├─ config.ts            # cờ VITE_*: ONLINE_FEATURES, USE_MOCK_SERVER, SERVER_URL, ADS_ENABLED
│  ├─ core/                # areas (8 khu), state (reducer thuần), store (localStorage), i18n vi/en,
│  │                       # shop, today (âm lịch + sự kiện + thông điệp), bus (HUD ↔ scene)
│  ├─ lunar/lunar.ts       # âm lịch VN tự cài theo Meeus (UTC+7)
│  ├─ logic/               # streak, dates (giờ VN), filter (lọc từ), ratelimit, nickname, fortune, lunarEvents
│  ├─ data/                # content.ts (đọc ../content/*.json nếu có) + sample-*.json cùng schema
│  ├─ art/                 # vẽ 100% bằng code: sky, primitives, areas-buildings, areas-water, sprites, registry
│  ├─ audio/               # engine.ts (Web Audio tổng hợp: chuông, mõ, ambient…), haptics.ts
│  ├─ scenes/AreaScene.ts  # 1 scene tham số theo khu: parallax 5 lớp, ngày/đêm, điểm nóng, nghi thức, online
│  ├─ rituals/             # mỗi nghi thức là RitualFactory(host) → {update?, destroy}
│  ├─ net/                 # protocol.ts (hợp đồng Socket.IO), client/socket-client/mock-server, service.ts
│  ├─ storage/journal.ts   # Nhật ký an lạc (IndexedDB)
│  ├─ share/               # ảnh chia sẻ 1080×1920 (canvas), Web Share / Capacitor Share, link mời
│  ├─ ui/                  # dom helpers, HUD, mini-map SVG, các bảng (Hôm nay, Nhật ký, Trang trí, Cài đặt, Bản đồ)
│  └─ native.ts            # cầu nối Capacitor (import động)
├─ tests/                  # Vitest (logic thuần)
├─ e2e/                    # Playwright smoke
└─ android/, ios/          # Capacitor
```

## Luồng chính
1. `main.ts` nạp `store` (localStorage) → `applySettings` → tạo `Phaser.Game` → màn chào (một chạm mở khóa âm thanh).
2. `AreaScene.create`: vẽ trời (`drawSky`, theo giờ VN) → vẽ khu (`AREA_ART[area]`) vào 5 lớp container
   (scrollFactor 0/0.3/0.6/1/1.25 → parallax khi kéo ngang) → điểm nóng, trang trí sự kiện âm lịch/giao diện mùa,
   lư hương (`BurnerDisplay`), dòng sông đèn (`RiverLanterns`), cá (`boids`).
3. Chạm điểm nóng hoặc nút HUD → `startRitual(id)` tạo `RitualHost` (layers, panel HTML, `complete()`).
   `complete()` → `store.dispatch({type:'ritual'})` (Hạt sen, nhiệm vụ, streak) + `journal.addEntry`.
4. `net` (`NetService`) bọc `NetClient` (Mock / Socket.IO / Null), giữ presence, hương đang cháy, đèn trên sông;
   scene và HUD `subscribe` sự kiện.
5. Chuyển khu: fade + trượt camera → `scene.restart({area})`; texture tĩnh đã nướng được tái dùng.

## Nguyên tắc
- Không có thao tác trên tượng Phật; không quảng cáo ở chính điện / thiền đường (`AREA_INFO[].solemn`).
- Hạt sen chỉ từ tu tập nhẹ nhàng, trần thưởng mỗi ngày; không tiền thật.
- Lời nguyện: lọc từ client (`logic/filter.ts`) + server; Báo cáo, Chặn, Xóa dữ liệu của tôi.
