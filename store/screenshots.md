# Kịch bản ảnh chụp màn hình (Screenshots)

## 1. Kích thước & yêu cầu kỹ thuật

| Store | Thiết bị | Kích thước (dọc) | Bắt buộc? | Ghi chú |
|---|---|---|---|---|
| Google Play | Điện thoại | **1080×1920** (9:16) | Bắt buộc: tối thiểu 2, tối đa 8 ảnh | PNG hoặc JPEG 24-bit, không kênh alpha, ≤8 MB/ảnh. Nên có ≥4 ảnh để đủ điều kiện hiển thị nổi bật. |
| Google Play | Ảnh nổi bật (Feature graphic) | **1024×500** | Bắt buộc | Không đặt chữ quan trọng sát mép; không nhồi chữ. |
| Google Play | Biểu tượng | **512×512** PNG 32-bit | Bắt buộc | |
| Google Play | Máy tính bảng 7"/10" | ví dụ 1200×1920 / 1600×2560 | Tùy chọn (nên có nếu app hỗ trợ tablet) | |
| App Store | iPhone 6.9" | **1320×2868** (cũng chấp nhận 1290×2796) | Bắt buộc (tối đa 10 ảnh/ngôn ngữ) | PNG/JPEG, RGB, không trong suốt. |
| App Store | iPhone 6.5" | **1284×2778** (hoặc 1242×2688) | Tùy chọn khi đã có 6.9" – Apple tự thu nhỏ; vẫn nên xuất để kiểm soát bố cục | |
| App Store | iPad 13" | **2064×2752** (hoặc 2048×2732) | **Bắt buộc nếu bản dựng hỗ trợ iPad** [CẦN XÁC NHẬN] | Nếu chỉ iPhone thì tắt iPad trong target để khỏi cần. |

Quy tắc chung:
- Chụp từ bản dựng thật (không vẽ tính năng không có). Thanh trạng thái để giờ 9:41, pin đầy, không thông báo.
- **Không** đặt "Miễn phí", "Không quảng cáo", "#1", xếp hạng sao hay giá vào ảnh – chính sách đồ họa của Google Play cấm thông tin giá/khuyến mại/xếp hạng trên ảnh; đưa các ý này vào mô tả.
- Lời nguyện xuất hiện trong ảnh là **lời nguyện mẫu do đội viết** (không dùng lời nguyện thật của người dùng); biệt danh hư cấu.
- Không dùng chữ Vạn (卍), không ảnh chùa/tượng có thật, không ảnh chân dung người thật.
- Tách lớp chữ để xuất bản VN và EN từ cùng một file thiết kế.

## 2. Hệ màu & chữ

| Vai trò | Màu | Mã gợi ý |
|---|---|---|
| Nền chính (trời chiều / tường gỗ) | Nâu gỗ trầm | `#3B2A20` |
| Nền phụ (giấy dó) | Kem | `#F4EBDD` |
| Điểm nhấn (khói hương, đèn) | Vàng nghệ ấm | `#E3A33B` |
| Điểm nhấn 2 (câu đối, mai Tết) | Đỏ son dịu | `#B4432F` |
| Thiên nhiên (lá, rêu) | Xanh rêu | `#5E7352` |
| Chữ caption | Kem trên nền tối / nâu trên nền sáng | tương phản ≥ 4.5:1 |

- Font caption: **Be Vietnam Pro** (SemiBold, giấy phép SIL OFL – hiển thị tốt dấu tiếng Việt). Thơ: **Noto Serif** (OFL). [CẦN XÁC NHẬN] khớp font trong app.
- Caption: 1 dòng (tối đa 2 dòng), cỡ ~ 64–72 px trên khung 1080×1920 (tương đương ~ 88–96 px trên 1320×2868).

## 3. Bố cục chuẩn cho mỗi ảnh
```
┌──────────────────────┐
│  CAPTION (vùng 22%)  │  ← nền màu đặc/gradient nhẹ, chữ căn giữa
│                      │
│   ┌──────────────┐   │
│   │  ẢNH CHỤP    │   │  ← màn hình app thu nhỏ ~78–82%, bo góc,
│   │  MÀN HÌNH    │   │    đổ bóng mềm; có thể bỏ khung máy
│   │              │   │
│   └──────────────┘   │
└──────────────────────┘
```
Vùng an toàn: chừa 80 px mỗi mép (Play) và 100 px (iPhone 6.9"). Ảnh 1–2 có thể làm "panorama" nối liền (mái chùa kéo dài qua hai ảnh).

## 4. Sáu ảnh

Số ký tự caption VN đếm bằng Node (giới hạn 40).

| # | Màn hình | Caption VN (ký tự) | Caption EN | Bố cục & màu | Mục đích |
|---|---|---|---|---|---|
| 1 | **Sân chùa (màn hình chính)** lúc chiều tà: mái chùa, cây bồ đề, bát hương có làn khói, Cây nguyện phía xa | **Một góc chùa yên tĩnh trong điện thoại** (38) | A quiet temple in your pocket | Nền nâu gỗ → vàng nghệ (hoàng hôn); logo nhỏ "Chùa An Nhiên" dưới caption. Ảnh quan trọng nhất – hiển thị ở kết quả tìm kiếm. | Định vị: chùa hư cấu, yên tĩnh |
| 2 | **Thắp hương**: tay chạm nén hương, đầu hương đỏ, khói uốn lượn; chỉ báo "Đã thắp 3 nén hôm nay" (nếu có) | **Thắp nén hương, lòng nhẹ nhàng hơn** (34) | Light incense, feel lighter | Nền tối, khói vàng nghệ nổi bật; nối panorama với ảnh 1 | Tính năng cốt lõi số 1 |
| 3 | **Gõ mõ / thỉnh chuông**: chuông đồng lớn, vòng sóng âm lan tỏa; mõ gỗ bên cạnh, bộ đếm nhịp | **Gõ mõ, thỉnh chuông – chậm lại một chút** (39) | Wooden fish & bell: slow down | Nền kem giấy dó, chuông đồng ấm; sóng âm vẽ bằng vòng tròn mảnh | Trải nghiệm âm thanh, thư giãn |
| 4 | **Quẻ xăm**: thẻ quẻ mở ra với 4 câu lục bát – dùng **Quẻ số 53 "Sen hồng giữa đầm"** (quẻ thật trong `content/que-xam.json`, cùng quẻ mẫu trên trang web; bản EN "The Lotus in the Pond"), tab chủ đề (Gia đạo · Công việc · Sức khỏe…), dòng ghi chú "Quẻ mang tính chiêm nghiệm…" **phải nhìn thấy được** | **100 quẻ thơ lục bát để chiêm nghiệm** (35) | 100 original poems for reflection | Nền kem; thẻ quẻ viền đỏ son, chữ thơ Noto Serif. Không dùng chữ "Thượng/Hạ/Cát/Hung". | Điểm khác biệt: thơ tự sáng tác, không mê tín |
| 5 | **Cây nguyện**: cây lớn treo nhiều thẻ lời nguyện mẫu (lấy nguyên văn từ `content/loi-nguyen-mau.json`, ví dụ id 104 "Con mong ba mẹ ăn ngon ngủ yên, tuổi già ít bệnh tật.", id 119 "Xin cho con giữ được bình tĩnh trong phòng thi, làm bài cẩn thận."), một thẻ đang mở với nút **Báo cáo** và **Chặn** nhìn thấy rõ | **Treo lời nguyện lên Cây nguyện** (30) | Hang your wish on the Wishing Tree | Nền xanh rêu chuyển kem; thẻ nguyện màu đỏ/vàng nhạt. Hiển thị nút báo cáo giúp App Review và người dùng thấy an toàn. | Cộng đồng ấm áp + an toàn UGC |
| 6 | **Lịch lễ âm lịch**: tháng có đánh dấu mùng Một, Rằm; thẻ sự kiện "Tết Nguyên Đán" với trang trí mai vàng và danh sách nhiệm vụ | **Lịch lễ âm lịch, trang trí theo mùa** (35) | Lunar festivals, seasonal decor | Nền đỏ son dịu + mai vàng (bản Tết). Chuẩn bị sẵn biến thể Phật Đản (sen hồng) và Vu Lan (hoa hồng, hoa đăng) để thay theo mùa. | Lý do quay lại theo mùa |

> Có thể thêm ảnh 7 (tùy chọn): **Thông điệp bình an mỗi ngày** – caption "Mỗi ngày một lời nhắn bình an" (29 ký tự) / "A gentle message every day".

## 5. Feature graphic Google Play (1024×500)
- Trái: mái chùa + cây bồ đề trong ánh chiều, khói hương mảnh bay ngang.
- Phải: tên "Chùa An Nhiên" (Be Vietnam Pro SemiBold) + dòng phụ "Thắp hương · Thỉnh chuông · Xin quẻ" (EN: "Incense · Bell · Poem fortunes").
- Không chữ khuyến mại, không nút "Tải ngay" giả.

## 6. Biến thể theo mùa (đổi trong store, không cần bản mới trên Google Play; App Store đổi ảnh cần nộp bản mới hoặc dùng Product Page Optimization/Custom Product Pages)
| Mùa | Thay ảnh | Caption VN thay thế (ký tự) |
|---|---|---|
| Tết | Ảnh 1 & 6 trang trí mai, đào, câu đối | "Sân chùa rộn ràng đón Tết" (25) |
| Phật Đản | Ảnh 1 & 6 hoa sen, cờ ngũ sắc giản lược (theo trang trí sự kiện `phat-dan` trong `content/su-kien-am-lich.json` và bộ mùa `content/mua/phat-dan.json`) [CẦN XÁC NHẬN tính phù hợp hình ảnh] | "Mùa Phật Đản, sen nở khắp sân chùa" (34) |
| Vu Lan | Ảnh 1 & 6 hoa hồng, hoa đăng (`content/mua/vu-lan.json`) | "Mùa Vu Lan, cài bông hồng biết ơn" (33) |
