# QA front-end – 2026-11-06

Phạm vi: 8 trang (VI + EN), mở qua file:// bằng Playwright/Chromium ở viewport 360x740, 390x844 và 1280x800, cả chế độ sáng và tối (tổng 48 lần chạy, kèm ảnh chụp toàn trang).

Đã kiểm: tràn ngang; tương phản WCAG AA cho mọi phần tử có chữ (cả sau khi bấm nút chuyển giao diện); vùng chạm a/button/summary ≥ 44px (trừ link nằm trong đoạn văn, theo ngoại lệ inline); lỗi console và request hỏng; mỗi trang đúng 1 h1; SVG có aria-hidden hoặc role="img" kèm nhãn; nút chuyển giao diện (aria-label, aria-pressed khớp theme, đổi meta theme-color); anchor #xoa-du-lieu / #delete-data; skip-link (là điểm dừng Tab đầu tiên, nhìn thấy khi focus); meta theme-color cho sáng/tối; @media (prefers-reduced-motion); :focus-visible; id trùng lặp, anchor nội trang hỏng.

## Đã sửa
- `assets/style.css`: link "FAQ" trong menu trang chủ EN (1280px) chỉ rộng 29px → thêm `min-width: 44px; justify-content: center` cho `.nav a`.

## Kết quả sau khi sửa
- Script QA: 0 lỗi. `node content/tools/check-site.mjs`: 12 file, 0 lỗi.

## Còn lại (không nghiêm trọng)
- Kiểm tương phản dùng màu nền phẳng; chữ trên nền gradient ở hero đã được tính tay cho trường hợp xấu nhất (muted trên gold-soft: 5.35:1 ở chế độ sáng, 5.59:1 ở chế độ tối), đều đạt.
- Các nút store vẫn trỏ tới `href="#"` (đã có TODO, chờ app phát hành); chưa có og:image.
