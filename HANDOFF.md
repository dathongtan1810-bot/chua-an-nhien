# HANDOFF — phiên app (Chùa An Nhiên)

Nhánh: `claude/jolly-mendel-hppn0t` · PR nháp: https://github.com/dathongtan1810-bot/chua-an-nhien/pull/2

## Đã xong
- **P0–P8**: scaffold Vite + Phaser 3.90 + TS strict, CI; 8 khu vẽ 100% bằng mã (parallax 5 lớp, ngày/đêm theo giờ VN,
  chuyển cảnh, mini-map); 9 nghi thức (thắp hương, vái, mõ, chuông, chuỗi 108, xin xăm, thả đèn, thiền 4-4-6, cho cá ăn);
  âm thanh Web Audio + ambient + cài đặt âm lượng; âm lịch Meeus (test Tết 2023–2027, 2007); Hôm nay, nhiệm vụ, streak
  (nghỉ 1 ngày/tuần), sự kiện âm lịch, nhật ký IndexedDB, Hạt sen, cửa hàng trang trí; online (MockServer + Socket.IO,
  presence, hương/chuông/đèn chung, báo cáo/chặn/xóa dữ liệu); ảnh chia sẻ 1080×1920, link mời, i18n vi/en;
  Capacitor android/ios, icon/splash vẽ bằng mã, CI Android (APK/AAB chưa ký), PUBLISHING.md, privacy.html.
- **P9 (một phần)**: đã merge nhánh server (`server/`, `shared/`, `admin/`) và nội dung (`content/`, `site/`, `store/`).
  App đọc nội dung thật từ `content/*.json` (100 quẻ, 366 thông điệp, 22 sự kiện, 300 lời nguyện) qua bước chuẩn hóa
  schema trong `app/src/data/content.ts`. Client đã khớp giới hạn tần suất và sự kiện EXT của server
  (`lantern_liked`, phòng gia đình `room_*`). Sửa 17/20 lỗi từ đợt review code (xem commit "review fixes").
- **P10 / thêm**: README có ảnh chụp 8 khu, thẻ tên khu, gợi ý lần đầu, sương sớm, đốm sáng người viếng,
  phòng "Đi chùa cùng gia đình", quầng sáng đèn người thân, đọc to thông điệp ngày.
- Test: 210 Vitest + Playwright smoke (vào game → thắp hương → thả đèn; link mời). CI `app-ci` + `app-android` xanh.

## Cách chạy
```bash
cd app && npm install && npm run dev      # MockServer trong trình duyệt
npm test && npm run build && npm run e2e
```
Với server thật (phiên backend): `cd server && npm install && npm start` (cổng 8080), rồi
`VITE_SERVER_URL=http://localhost:8080 npm run dev` trong `app/`.
Debug: `/?skip&area=<khu>&ritual=<id>&hour=<0-23>` (dev thêm `&date=YYYY-MM-DD`).

## Đợt 2 (06/11) — đã làm hết mục "Còn lại"
- **E2E với server thật**: `e2e/online.spec.ts` — hai người chơi thấy nhau (presence), thấy hương & đèn của nhau,
  đèn có trong REST `/api/lanterns`. `npm run e2e:server` (build app với `VITE_SERVER_URL`, chạy cả bộ e2e);
  CI: `.github/workflows/app-e2e-server.yml` dựng `server/` rồi chạy. Qua đó tìm và sửa 2 lỗi client thật:
  biệt danh > 24 ký tự bị server từ chối `hello` (nay ≤ 24, `clampNickname`); client gửi `enter_area` trước khi
  server xử lý xong `hello` → `not_hello` (nay chờ `welcome` rồi mới gửi, có hàng đợi nhỏ).
- **Nội dung tiếng Anh**: `content/i18n/en/*.json` tải lười khi chọn English (chunk riêng, không tăng gói đầu);
  quẻ/thông điệp/sự kiện/lời nguyện tiếng Anh, cùng id nên quẻ trùng giữa hai ngôn ngữ. Đọc to & ảnh chuỗi ngày theo ngôn ngữ.
- **Review**: focus trap trong bảng (a11y, có e2e); bật/tắt online khởi động lại khu → tải lại đèn.
- **Native**: Android APK debug + APK/AAB release chưa ký build thật trên CI (`app-android`, artifact);
  `app-ios.yml` build iOS Simulator trên macOS (không ký) — đã xanh trên CI. Ký phát hành: xem docs/app/PUBLISHING.md.
- **Hiệu năng**: `?fps` hiện bộ đếm FPS để đo trên máy thật; FPS trung bình < 40 trong 4 giây đầu → các khu sau
  bỏ hiệu ứng trang trí (hạt rơi, đốm sáng, sương) trong phiên (`src/core/perf.ts`).
- Đã merge lại nhánh server/content mới nhất (không xung đột). Vẫn chưa có nhánh `qa/`.

## Đợt 3 — ý tưởng tiếp theo (PLAN.md, đã xong cả 6)
- **Lời nguyện của tôi** (Nhật ký → nút): lời nguyện theo tuần, đánh dấu "Đã thành — tri ân" (sổ biết ơn,
  không hứa linh ứng); lưu trong IndexedDB (`updateEntry`).
- **Nhắc nhẹ mùng 1 & rằm**: công tắc trong Cài đặt (chỉ app điện thoại, mặc định tắt), Capacitor Local
  Notifications, ~24 lần nhắc lúc 6:30 giờ VN, lên lịch lại mỗi lần mở app (`src/logic/reminders.ts`, tính cả tháng nhuận).
- **Mưa phùn xuân**: tháng 1–3 âm lịch, ~45% số ngày (cố định theo ngày), khu ngoài trời; `?weather=rain` để xem.

## Đợt 4
- Gỡ toàn bộ quảng cáo (AdMob) theo quyết định chủ dự án — app không có quảng cáo/SDK theo dõi.
- **E2E offline (PWA)**: `e2e/offline.spec.ts` — mở một lần, tắt mạng, tải lại vẫn vào chùa, chuyển khu, mở nghi thức.
- **Quét a11y tự động (axe-core, WCAG 2.1 A/AA)**: `e2e/a11y.spec.ts` — màn chào, HUD, các bảng, bản đồ, nghi thức;
  sửa nhãn đọc của bản đồ (tên khu + số người, huy hiệu ẩn khỏi trình đọc màn hình). Canvas game không quét được.

## Còn lại (cần người/thiết bị thật)
- Đo FPS trên điện thoại tầm trung thật bằng `?fps` (trình duyệt headless ở đây render phần mềm, ~20 fps).
- Ký bản phát hành (keystore Android, chứng chỉ Apple) và thử trên máy thật.
- Khi phiên QA có `qa/BUGS.md`: merge và sửa.

