# PLAN — Chùa An Nhiên (phiên app)

Trải nghiệm đi chùa online nhẹ nhàng: web PWA + Android/iOS (Capacitor), thấy người khác cùng viếng.
Phạm vi phiên này: `app/`, `docs/app/`, `.github/workflows/app-*.yml`, file gốc repo.

## Giai đoạn (todo)
- [ ] P0 PLAN, ARCHITECTURE, scaffold Vite + Phaser + TS, ESLint/Prettier, Vitest, CI
- [ ] P1 Cổng, sân, chính điện + thắp hương + gõ mõ + âm thanh cơ bản + PWA
- [ ] P2 Đủ 8 khu, parallax, ngày/đêm, chuyển cảnh, mini-map
- [ ] P3 Thỉnh chuông, chuỗi 108 hạt, xin xăm, thả đèn, thiền, cho cá ăn
- [ ] P4 Âm thanh tổng hợp hoàn chỉnh + ambient + cài đặt âm lượng
- [ ] P5 Âm lịch, Hôm nay, nhiệm vụ, streak, sự kiện, nhật ký, Hạt sen, cửa hàng
- [ ] P6 Online: socket client, MockServer, presence, hương/chuông/đèn chung, báo cáo/chặn/xóa
- [ ] P7 Ảnh chia sẻ, link mời, i18n
- [ ] P8 Capacitor android/ios, icon/splash, CI Android, PUBLISHING.md
- [ ] P9 Tích hợp nhánh server/content/qa, e2e, hiệu năng, a11y
- [ ] P10 Đánh bóng, README ảnh chụp, HANDOFF.md

## Phân công song song (subagent)
Âm lịch (Meeus) · Âm thanh Web Audio · Mạng + MockServer + lọc từ · Dữ liệu mẫu + chọn quẻ ·
Vẽ cảnh kiến trúc · Vẽ trời/nước/sprite. Tech lead: kiến trúc, store, cảnh, nghi thức, UI, tích hợp.
