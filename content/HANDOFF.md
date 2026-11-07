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

## Phiên 2026-11-06 (05:28–05:35 UTC) — đã hoàn tất các việc dở
- `content/giao-dien.json` (+ schema, EN): 148 khóa chữ giao diện, đã đưa vào `validate.mjs`.
- QA site: 8 trang × 3 viewport × sáng/tối, WCAG AA đạt; sửa vùng chạm menu; báo cáo `site/QA.md`.
- `store/press-kit.md` có bản 400 chữ VI/EN; `store/review-replies.md` đủ 20 mẫu; `store/social-posts-30-ngay.md` đã đọc lại, trích dẫn khớp dữ liệu.
- DECISIONS thêm D34 (cách chọn thông điệp năm nhuận) và D35 (nhãn "Làm ăn").

## Phiên 2026-11-07 (01:20–01:30 UTC) — mục "còn giờ"
- Rà chính tả 5 bộ mùa, chữ giao diện, thông báo đẩy: không lỗi chính tả; viết lại 28 câu trùng/na ná (VI + EN). `content/REVIEW-chinh-ta.md`.
- Tăng đa dạng: viết lại 39 thông điệp + 38 lời nguyện (VI + EN), giữ nguyên các id được store trích. `content/REVIEW-da-dang.md`.
- Thêm 2 bộ mùa: Phật Thành Đạo (1–8/12 âm), Tết Đoan Ngọ (1–5/5 âm) — tổng 7 bộ (D36).
- `validate.mjs` kiểm thêm: câu thơ quẻ mùa không trùng 100 quẻ chính.

## Còn lại (chỉ phụ thuộc người thật)
- Các mục **[CẦN XÁC NHẬN]** ở phần trên: email/tên miền, pháp nhân, SDK, thời hạn lưu, thao tác Báo cáo/Chặn/Cài đặt thật, nhóm từ chính trị, link store, og:image.
- Dev triển khai D30 (ưu tiên bộ mùa) và D34 (thông điệp năm nhuận).
