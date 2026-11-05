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

## Còn lại
- Chạy e2e với server thật (chưa làm: hết giờ). Kiểm tra nhánh `qa/` khi có (`qa/BUGS.md` chưa tồn tại).
- Nội dung tiếng Anh của phiên nội dung (`content/i18n`) chưa được nối vào chế độ English (thơ/quẻ vẫn tiếng Việt).
- 3 lỗi review nhỏ chưa sửa: chia sẻ trên iOS Safari có thể mất "user gesture" (nên tạo blob trước khi await);
  sheet chưa có focus trap; nút "online" bật lại chưa xin lại danh sách đèn ngay.
- Build native thật (Android Studio / Xcode trên macOS), ký bằng keystore (xem docs/app/PUBLISHING.md).
- Đo FPS trên máy thật tầm trung (headless SwiftShader không đại diện).
