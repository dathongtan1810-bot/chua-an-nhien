# PLAN — Chùa An Nhiên (phiên app)

Trải nghiệm đi chùa online nhẹ nhàng: web PWA + Android/iOS (Capacitor), thấy người khác cùng viếng.
Phạm vi phiên này: `app/`, `docs/app/`, `.github/workflows/app-*.yml`, file gốc repo.

## Giai đoạn (todo)
- [x] P0 PLAN, ARCHITECTURE, scaffold Vite + Phaser + TS, ESLint/Prettier, Vitest, CI
- [x] P1 Cổng, sân, chính điện + thắp hương + gõ mõ + âm thanh cơ bản + PWA
- [x] P2 Đủ 8 khu, parallax, ngày/đêm, chuyển cảnh, mini-map
- [x] P3 Thỉnh chuông, chuỗi 108 hạt, xin xăm, thả đèn, thiền, cho cá ăn
- [x] P4 Âm thanh tổng hợp hoàn chỉnh + ambient + cài đặt âm lượng
- [x] P5 Âm lịch, Hôm nay, nhiệm vụ, streak, sự kiện, nhật ký, Hạt sen, cửa hàng
- [x] P6 Online: socket client, MockServer, presence, hương/chuông/đèn chung, báo cáo/chặn/xóa
- [x] P7 Ảnh chia sẻ, link mời, i18n
- [x] P8 Capacitor android/ios, icon/splash, CI Android, PUBLISHING.md
- [ ] P9 Tích hợp nhánh server/content/qa, e2e, hiệu năng, a11y
- [ ] P10 Đánh bóng, README ảnh chụp, HANDOFF.md

## Phân công song song (subagent)
Âm lịch (Meeus) · Âm thanh Web Audio · Mạng + MockServer + lọc từ · Dữ liệu mẫu + chọn quẻ ·
Vẽ cảnh kiến trúc · Vẽ trời/nước/sprite. Tech lead: kiến trúc, store, cảnh, nghi thức, UI, tích hợp.

## Đã làm thêm (ngoài P0–P8)
- Phòng "Đi chùa cùng gia đình" (EXT server: room_*), đốm sáng người viếng khác, thẻ tên khu khi bước vào,
  gợi ý lần đầu, `?date=`/`?hour=` để xem trước sự kiện âm lịch & ngày/đêm.

## Ý tưởng tiếp theo (ưu tiên điều người chơi cảm nhận rõ nhất)
1. ✅ Đèn hoa đăng của người thân trong phòng gia đình được viền sáng riêng trên sông.
2. ✅ (sương sớm) Mưa nhẹ / sương sớm theo mùa (tháng âm lịch) — chỉ hiệu ứng, có giảm chuyển động.
3. "Lời nguyện tuần" — xem lại các lời nguyện của mình, đánh dấu điều đã thành (không hứa linh ứng).
4. Chế độ hiệu năng thấp tự động (giảm glow/particle khi FPS < 40 trong 5 giây đầu).
5. Thông báo nhắc nhẹ mùng 1 / rằm (Capacitor Local Notifications, người dùng tự bật).
6. ✅ Đọc to thông điệp ngày (SpeechSynthesis tiếng Việt nếu máy có).
