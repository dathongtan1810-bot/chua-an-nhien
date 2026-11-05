# Soát nhất quán site/ + store/ với content/ (05/11/2026)

Đối chiếu với `content/` tại thời điểm soát: 100 quẻ (VI + EN), 366 thông điệp, 300 lời nguyện mẫu, 22 sự kiện âm lịch. Bộ mùa đang có file: VI có Tết, Rằm tháng Giêng, Phật Đản, Vu Lan, Trung Thu; EN có Tết, Rằm tháng Giêng, Phật Đản, Vu Lan. `node content/tools/check-site.mjs` báo 12 file, 0 lỗi.

## Đã sửa
1. **Quẻ mẫu trên trang chủ** (`site/index.html`, `site/en/index.html`): bỏ quẻ không có thật "Sen trong sương / Lotus in the Mist", thay bằng **Quẻ số 53 "Sen hồng giữa đầm" / "The Lotus in the Pond"**. Thơ, lời giải (rút gọn), lời khuyên và ghi chú lấy nguyên văn từ `que-xam.json` và `i18n/en/que-xam.json`. Bỏ dấu câu cuối dòng thơ theo D29.
2. **Video 2** (`video-scripts.md`): bỏ quẻ không có thật, thay bằng **Quẻ số 82 "Con đường qua đồi"**, dùng bản thơ mới nhất. Lời giải tab Công việc và lời khuyên lấy đúng theo dữ liệu. Video 1 dùng thông điệp ngày số 238. Video 3 dùng 3 lời nguyện thật trong `mua/tet.json`, đổi 2 nhiệm vụ Tết sang tên thật ("Phong bao lời chúc", "Chúc Tết người thân").
3. **Ảnh chụp màn hình** (`screenshots.md`): ảnh 4 dẫn Quẻ 53 (cùng quẻ với site). Ảnh 5 dùng lời nguyện mẫu thật (id 104, 119). Biến thể Phật Đản và Vu Lan ghi rõ file mùa tương ứng.
4. **URL chính sách quyền riêng tư**: `…/privacy.html` (trang không tồn tại) đổi thành `…/privacy-policy.html` ở 2 listing Google Play, 2 listing App Store và `data-safety.md`.
5. **Thời hạn lưu trữ**: trong `data-safety.md`, hồ sơ vi phạm lưu "[90] ngày" mâu thuẫn với chính sách quyền riêng tư và trang Hỗ trợ. Đã thống nhất theo hai trang đó: sao lưu 30 ngày, nhật ký lỗi 90 ngày, hồ sơ vi phạm 12 tháng, yêu cầu qua email xử lý trong tối đa 30 ngày.
6. **Biệt danh tùy chọn**: chính sách quyền riêng tư, data safety và U9 đều coi biệt danh là tùy chọn, còn Hỗ trợ và listing lại ngụ ý bắt buộc. Đã sửa FAQ Hỗ trợ và FAQ trang chủ (VI/EN): không đặt biệt danh thì hiển thị "Một người viết" / "Someone". Gạch đầu dòng ở 4 listing đổi thành "Không cần tài khoản, email hay số điện thoại".
7. **Chặn người viết** (Guideline 1.2): store và App Review Notes có nhắc tính năng này nhưng site thì không. Đã thêm vào Hỗ trợ và Điều khoản (VI/EN). Đổi "Khóa tài khoản" thành "Hạn chế thiết bị" vì app không có tài khoản.
8. **Độ tuổi**: Điều khoản (VI/EN) thêm câu "dành cho người từ 13 tuổi trở lên (13+ App Store)", khớp với D22, `age-rating.md` và mục Trẻ em trong chính sách. `age-rating.md` thêm căn cứ D22. Chính sách VI thêm câu về GDPR cho khớp bản EN.
9. **Tên lễ và ngày** (`launch-plan-30-days.md`): "Rằm tháng Giêng (Tết Nguyên Tiêu)" đổi thành "Rằm tháng Giêng – Tết Thượng Nguyên". Tên Lễ Phật Đản và Lễ Vu Lan sửa theo `su-kien-am-lich.json`. Thêm ghi chú Trừ tịch 30/12 lùi về 29/12 (D13). Nhiệm vụ Rằm tháng Giêng đổi sang tên thật. Đã kiểm lại toàn bộ ngày âm/dương và thứ trong tuần bằng thuật toán âm lịch UTC+7, tất cả đều đúng.
10. **Ghi chú phát hành 1.1/1.2**: nhiệm vụ Tết và Vu Lan đổi sang tên có trong `mua/tet.json` và `mua/vu-lan.json` (VI/EN).
11. **`store/README.md`**: căn cứ cập nhật thành D1–D29. Thêm danh sách bộ mùa đang có file và ghi đã đối chiếu với `su-kien-am-lich.json`.
12. **Số ký tự**: đếm lại tất cả các trường. Mọi trường đều trong giới hạn: Play gồm tên 29/30, mô tả ngắn 79/80, mô tả đầy đủ VI 2671 và EN 2865 (giới hạn 4000). App Store gồm Name 29/30, Subtitle 30 và 29/30, Promo 148 và 140/170, Keywords 98 và 100/100, Description VI 2214 và EN 2325. Release notes ≤ 500 sau khi sửa. Caption ảnh đều đúng số ghi.
13. **Chính tả**: dấu thanh kiểu cũ đã nhất quán (D5). EN trên site dùng chính tả Anh–Anh, EN trên store dùng Anh–Mỹ (en-US), trong từng nhóm đều nhất quán. Không thấy lỗi chính tả.

## Cần dev/nội dung xác nhận
- **Nội dung đang được sửa song song**: thơ quẻ 82 đã đổi trong lúc soát. Nếu thơ quẻ 53 hoặc 82 còn đổi nữa thì phải cập nhật lại site, video và ảnh chụp.
- **Bản EN của quẻ 82** vẫn dịch theo thơ VI cũ ("Walk on unhurried…", "Keep steady steps…"), chưa khớp bản VI mới. Cần dịch lại.
- **Thiếu `content/i18n/en/mua/trung-thu.json`**, mà site ghi "toàn bộ … song ngữ".
- **Bộ mùa Rằm tháng Giêng (13–16/1) chồng ngày với bộ mùa Tết** (23/12–15/1), và trong bộ Tết đã có nhiệm vụ "Ngắm trăng Rằm tháng Giêng". Cần quy tắc ưu tiên khi hai bộ cùng hiệu lực.
- **D20 vẫn ghi "App Store đề xuất 12+"**, mâu thuẫn với D22 (13+). Nên sửa D20 trong `content/DECISIONS.md` (ngoài phạm vi soát này).
- Biệt danh bắt buộc hay tùy chọn, nhãn "Một người viết"/"Someone", thao tác Chặn/bỏ chặn trong Cài đặt: phải khớp bản dựng thật.
- Các thời hạn lưu 24 tháng / 30 ngày / 90 ngày / 12 tháng cần pháp lý xác nhận.
- Email và tên miền `.example` vẫn là giữ chỗ (D18).
