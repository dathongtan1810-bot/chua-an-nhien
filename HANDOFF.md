# HANDOFF — phiên app (Chùa An Nhiên)

_Cập nhật: xem `git log` nhánh `claude/jolly-mendel-hppn0t`._

## Đã xong
- P0–P8: scaffold, 8 khu vẽ bằng mã + parallax + ngày/đêm + mini-map, 9 nghi thức, âm thanh Web Audio,
  âm lịch + Hôm nay + nhiệm vụ + streak + sự kiện + nhật ký + Hạt sen + cửa hàng, online (MockServer/Socket.IO),
  ảnh chia sẻ + link mời + i18n vi/en, Capacitor android/ios + icon/splash + CI Android + PUBLISHING.md.
- Test: Vitest (logic) + Playwright smoke (`app/e2e`).

## Cách chạy
Xem README.md mục "Chạy app". Debug nhanh: `/?skip&area=<khu>&ritual=<id>&hour=<0-23>`
(ritual: incense, bow, mo, bell, beads, fortune, lantern, meditation, fish).

## Còn lại / ghi chú
- Chưa build native thật (máy CI cần Android SDK; iOS cần macOS + Xcode).
- Tích hợp nhánh server/content/qa: xem mục P9 trong PLAN.md.
