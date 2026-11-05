# HANDOFF – Nội dung & marketing "Chùa An Nhiên"

_Cập nhật: 2026-11-05 (UTC). Nhánh: `claude/sweet-tesla-9rdbof` · PR nháp: dathongtan1810-bot/chua-an-nhien#3_

## Trạng thái 8 sản phẩm
| # | Sản phẩm | File | Trạng thái |
|---|---|---|---|
| 1 | 100 quẻ xăm lục bát + lời giải 6 chủ đề | `content/que-xam.json` (gộp từ `content/_parts/`) | ✅ 100/100, lục bát 0 lỗi |
| 2 | Từ cấm + allowlist + test | `content/tu-cam.json`, `content/tools/loc-tu.mjs`, `content/tu-cam.test.mjs` | ✅ 195 mục, 82 test pass |
| 3 | Sự kiện âm lịch | `content/su-kien-am-lich.json` | ✅ 22 lễ |
| 4 | 366 thông điệp ngày | `content/thong-diep-ngay.json` | ✅ |
| 5 | 300 lời nguyện mẫu | `content/loi-nguyen-mau.json` | ✅ |
| 6 | Site tĩnh + pháp lý (VI/EN) | `site/` | ✅ |
| 7 | Tài liệu store/ASO/marketing | `store/` | ✅ |
| 8 | Bản tiếng Anh | `content/i18n/en/` | ✅ |
| + | Bộ mùa | `content/mua/` (+ `i18n/en/mua/`) | ✅ Tết, Rằm tháng Giêng, Phật Đản, Vu Lan, Trung Thu |
| + | Thông báo đẩy (VI/EN) | `content/thong-bao-day.json` | ✅ 90 mục, đã đưa vào validate |
| + | 30 bài đăng MXH | `store/social-posts-30-ngay.md` | ✅ (chưa rà lại thủ công) |
| + | Rà soát | `content/REVIEW-chinh-ta.md`, `REVIEW-tho.md`, `REVIEW-en.md`, `store/REVIEW-nhat-quan.md` | ✅ 26 bài thơ biên tập lại, EN thống nhất thuật ngữ |

Kiểm tra: `node content/validate.mjs` (0 lỗi) · `node --test content/tu-cam.test.mjs` · `node content/tools/check-site.mjs` · CI `.github/workflows/content-validate.yml`.

## Quy trình sửa quẻ
Sửa trong `content/_parts/que-xam-0N.json` (VI) / `en-que-xam-0N.json` (EN) → `node content/tools/merge.mjs` → `node content/validate.mjs`. Không sửa trực tiếp `content/que-xam.json`.

## Việc cần người thật xác nhận trước khi nộp store
- Email & tên miền thật thay `hotro@chuaannhien.example` / `https://chuaannhien.example` (site, store, privacy).
- Tên pháp nhân/bên kiểm soát dữ liệu (đang ghi "Nhóm phát triển Chùa An Nhiên").
- Danh sách SDK thực tế (analytics, crash, push) → cập nhật `store/data-safety.md` và privacy policy.
- Thời hạn lưu trữ (sao lưu 30 ngày, log lỗi 90 ngày, hồ sơ vi phạm 12 tháng, dữ liệu không hoạt động 24 tháng) — giả định trong `site/privacy-policy.html`.
- Luồng Báo cáo/Chặn trong app và mục tiêu xử lý 24 giờ (App Store Guideline 1.2).
- Link Google Play/App Store (đang `href="#"`), ảnh `og:image`.
- Nhóm từ `chinh-tri-cuc-doan` trong `tu-cam.json` cần đội kiểm duyệt duyệt.
- Giấy phép trò chơi điện tử/quảng cáo nội dung tín ngưỡng theo quy định Việt Nam.
- Ngày ra mắt đề xuất: 08/01/2027 (mùng 1 tháng Chạp) — xem `store/launch-plan-30-days.md`.

## Gợi ý việc tiếp theo
- Bộ mùa còn lại nếu cần (Thành Đạo, Vía Quan Âm).
- Thu âm voice-over & dựng 3 video theo `store/video-scripts.md`.
- Thiết kế 6 ảnh chụp màn hình theo `store/screenshots.md` (không dùng chữ Vạn, không ghi "Miễn phí").

## Dở dang (do chạm giới hạn sử dụng lúc ~04:07 UTC, phiên dừng đến 06:30)
- `content/giao-dien.json` (chữ giao diện/onboarding/thông báo kiểm duyệt VI+EN): **chưa tạo**.
- `store/press-kit.md`: **chưa tạo**. `store/review-replies.md`: 12 mẫu (đề xuất ban đầu là 20).
- QA giao diện site bằng ảnh (độ tương phản, focus, skip-link, theme-color): **chưa làm**; `site/QA.md` chưa có.
- `store/social-posts-30-ngay.md` do subagent viết xong nhưng chưa được biên tập viên đọc lại toàn bộ.

## Ưu tiên cho phiên sau
1. Viết `content/giao-dien.json` (+ schema, EN) — thông báo kiểm duyệt theo `mucDo` 1/2/3 (D26), luồng xóa dữ liệu (D19), biệt danh tùy chọn (D32).
2. QA site (Playwright 360/390/768/1280, sáng/tối, WCAG AA).
3. Press kit; bổ sung 8 mẫu trả lời đánh giá.
4. Đọc lại thủ công 30 bài đăng MXH (90 thông báo đẩy đã đọc lúc 06:40 UTC, chỉ đổi 1 tiêu đề trùng tên tác phẩm có bản quyền).
