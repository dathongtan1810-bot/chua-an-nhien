# store/ – Tài liệu phát hành & marketing "Chùa An Nhiên"

Bộ tài liệu cho bản **1.0.0**: miễn phí, không quảng cáo, không mua trong ứng dụng. Căn cứ các quyết định D1–D29 trong `content/DECISIONS.md` (đặc biệt D17–D20 về dữ liệu, liên hệ, xóa dữ liệu, độ tuổi; D21–D25 về store & ra mắt: Lifestyle, App Store 13+ / IARC 3, lịch ra mắt, không chữ Vạn, không chữ "Miễn phí/Không quảng cáo" trên ảnh; D26–D28 về bộ lọc từ). Kết quả soát nhất quán: `REVIEW-nhat-quan.md`. Mục **[CẦN XÁC NHẬN]** phải được dev/pháp lý kiểm tra trước khi nộp store.

## Mục lục

| File | Nội dung |
|---|---|
| [google-play/listing-vi.md](google-play/listing-vi.md) | Google Play – tên app, mô tả ngắn, mô tả đầy đủ, danh mục, thẻ (tiếng Việt) |
| [google-play/listing-en.md](google-play/listing-en.md) | Google Play – store listing (English) |
| [app-store/listing-vi.md](app-store/listing-vi.md) | App Store – Name, Subtitle, Promotional Text, Description, Keywords, danh mục, URL, ghi chú cho App Review (tiếng Việt) |
| [app-store/listing-en.md](app-store/listing-en.md) | App Store – product page (English) |
| [aso-keywords.md](aso-keywords.md) | Bộ từ khóa VN (có dấu/không dấu) & EN theo ý định tìm kiếm, ưu tiên, từ khóa nên tránh |
| [release-notes.md](release-notes.md) | Ghi chú phát hành 1.0.0 (VN/EN) + mẫu 1.1 Tết, 1.2 Vu Lan |
| [age-rating.md](age-rating.md) | Đáp án IARC (Google Play), App Store age rating, yêu cầu tính năng UGC (Guideline 1.2) |
| [data-safety.md](data-safety.md) | Mẫu khai Google Play Data safety & App Store App Privacy |
| [screenshots.md](screenshots.md) | Kịch bản 6 ảnh chụp màn hình, caption, bố cục, màu, kích thước |
| [video-scripts.md](video-scripts.md) | 3 kịch bản TikTok/Reels/Shorts 15–30 giây, chi tiết từng giây |
| [launch-plan-30-days.md](launch-plan-30-days.md) | Kế hoạch ra mắt 30 ngày gắn lịch âm (D0 = mùng 1 tháng Chạp, 08/01/2027 → Tết Đinh Mùi 06/02/2027), KPI, ngân sách, phản hồi đánh giá, xử lý khủng hoảng |

## Nguyên tắc chung cho mọi nội dung phát hành
1. Chùa An Nhiên là **chùa hư cấu** – không nêu tên, hình ảnh chùa/tổ chức tôn giáo có thật.
2. **Không mê tín, không hứa linh ứng** ("linh nghiệm", "cầu gì được nấy"), **không hù dọa** (quẻ hung, năm hạn).
3. **Không kêu gọi cúng dường/công đức** dưới bất kỳ hình thức nào.
4. Mọi văn bản, thơ, nhạc **tự sáng tác**; âm thanh trong video dùng file của app hoặc nhạc có giấy phép thương mại rõ ràng.
5. Trường có giới hạn ký tự được đếm bằng Node: `[...s.normalize('NFC')].length` (Unicode NFC, tính cả dấu cách và xuống dòng). Khi sửa nội dung, đếm lại.

## Ngày tháng
Các ngày âm lịch → dương lịch trong bộ tài liệu được tính bằng thuật toán âm lịch Việt Nam (UTC+7) ngày 05/11/2026: Rằm tháng Chạp = 22/01/2027, Ông Công Ông Táo = 30/01/2027, Giao thừa = tối 05/02/2027 (29 tháng Chạp – tháng thiếu), **Tết Đinh Mùi = thứ Bảy 06/02/2027**, Rằm tháng Giêng = 20/02/2027, Phật Đản = 20/05/2027, Vu Lan = 16/08/2027. Đã đối chiếu tên lễ và ngày âm với `content/su-kien-am-lich.json` (22 sự kiện; Tất niên – Đêm Trừ tịch ghi ngày 30/12, tháng thiếu lùi về 29/12 theo D13).

## Việc cần làm trước khi nộp (tóm tắt các [CẦN XÁC NHẬN])
- [ ] Email hỗ trợ thật thay cho `hotro@chuaannhien.example`; tên miền thật thay `chuaannhien.example` (D18).
- [ ] Dev xác nhận danh sách SDK (analytics, crash, push) và cập nhật `data-safety.md`.
- [ ] Bản dựng có đủ Báo cáo / Chặn / Lọc / Điều khoản UGC (`age-rating.md` mục 3).
- [ ] Rà soát asset: không có chữ Vạn, không hình ảnh chùa/tượng có thật.
- [ ] Tư vấn pháp lý: phân loại sản phẩm (ứng dụng hay trò chơi điện tử) và quy định quảng cáo nội dung tín ngưỡng tại Việt Nam.
- [ ] Google Play: kiểm thử kín ≥ 12 người thử × 14 ngày (nếu tài khoản cá nhân mới).
