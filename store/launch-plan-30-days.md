# Kế hoạch ra mắt 30 ngày – Chùa An Nhiên 1.0

## 0. Mốc thời gian (đã kiểm tra)

Hôm nay: **thứ Năm 05/11/2026** (năm Bính Ngọ). Ngày âm lịch dưới đây được tính bằng thuật toán âm lịch Việt Nam (múi giờ UTC+7) và đối chiếu thứ trong tuần bằng Node. Đội dev đối chiếu lại với `content/su-kien-am-lich.json` trước khi chốt lịch đăng bài.

| Âm lịch | Dương lịch | Ghi chú |
|---|---|---|
| Rằm tháng Mười (Tết Hạ Nguyên), Bính Ngọ | T2 23/11/2026 | Mở teaser |
| Mùng 1 tháng Mười Một | T4 09/12/2026 | Nộp duyệt bản 1.0 |
| Rằm tháng Mười Một | T4 23/12/2026 | |
| **Mùng 1 tháng Chạp → D0 – Ra mắt** | **T6 08/01/2027** | Ngày đi chùa đầu tháng, sát mùa Tết |
| Rằm tháng Chạp | T6 22/01/2027 (D+14) | Phát hành bản 1.1 Tết |
| 23 tháng Chạp – Ông Công Ông Táo | T7 30/01/2027 (D+22) | |
| 29 tháng Chạp – **Giao thừa** (sự kiện "Tất niên – Đêm Trừ tịch" ghi 30/12; tháng Chạp năm Bính Ngọ là tháng thiếu nên app lùi về 29/12 – D13) | T6 05/02/2027 (D+28) | |
| **Mùng 1 Tết Đinh Mùi** | **T7 06/02/2027 (D+29)** | Đỉnh lưu lượng dự kiến |
| Mùng 2 Tết | CN 07/02/2027 (D+30) | Kết thúc giai đoạn 30 ngày |
| Rằm tháng Giêng – Tết Thượng Nguyên | T7 20/02/2027 (D+43) | Chiến dịch tiếp nối sau 30 ngày |
| Lễ Phật Đản (Rằm tháng Tư) | T5 20/05/2027 | Bản/chiến dịch theo mùa |
| Lễ Vu Lan – Rằm tháng Bảy | T2 16/08/2027 | Bản 1.2 (mùng 1 tháng Bảy: T2 02/08/2027) |

**Vì sao chọn D0 = mùng 1 tháng Chạp (08/01/2027)?** Có 4 tuần tích lũy đánh giá, sửa lỗi và tối ưu ASO trước Tết – thời điểm người Việt tìm "đi lễ đầu năm", "xin xăm đầu năm" nhiều nhất. Ra mắt sát Tết hơn thì rủi ro lỗi/duyệt chậm đúng lúc cao điểm; ra mắt sớm hơn (tháng 11) thì mất "câu chuyện mùa lễ". Nếu bản dựng trễ: phương án B là **D0 = Rằm tháng Chạp (22/01/2027)** và gộp luôn nội dung Tết vào 1.0 – khi đó dời toàn bộ bảng dưới đây 14 ngày, bỏ bản 1.1 riêng.

---

## 1. Mục tiêu & KPI (30 ngày đầu, D0 → D+30)

| Chỉ số | Mức sàn | Mục tiêu | Vượt kỳ vọng | Nguồn đo |
|---|---|---|---|---|
| Lượt cài đặt (2 store) | 8.000 | **15.000** | 30.000 | Play Console, App Store Connect |
| Giữ chân D1 | 30% | **≥ 35%** | 45% | Store console / analytics [CẦN XÁC NHẬN có analytics] |
| Giữ chân D7 | 12% | **≥ 15%** | 22% | như trên |
| Giữ chân D30 (đo sau D+30) | 5% | 7% | 10% | như trên |
| Điểm đánh giá trung bình | 4,3 | **≥ 4,5** | 4,7 | Cả hai store, ≥ 150 lượt đánh giá |
| Tỷ lệ người dùng không gặp crash | 99,0% | **≥ 99,5%** | 99,8% | Android vitals / Xcode Organizer. Ngưỡng "hành vi xấu" của Play: crash ≥ 1,09%, ANR ≥ 0,47% – phải ở dưới xa. |
| Tỷ lệ chuyển đổi trang store (xem → cài) | 20% | 30% | 40% | Store console |
| Lời nguyện được treo / người dùng hoạt động | – | ≥ 0,5 | – | Backend |
| Báo cáo UGC xử lý trong 24 giờ | 95% | **100%** | – | Bảng kiểm duyệt |
| Phản hồi đánh giá store | trong 48 giờ | **trong 24 giờ** | – | |
| Chi phí mỗi lượt cài (CPI) quảng cáo trả phí | ≤ 8.000 đ | ≤ 5.000 đ | ≤ 3.000 đ | TikTok/Meta Ads [ước lượng, kiểm lại sau tuần 1] |

---

## 2. Ngân sách gợi ý (thấp) – tổng ~ 20.000.000 đ

| Hạng mục | Ngân sách | Ghi chú |
|---|---|---|
| TikTok Ads (Spark Ads đẩy video tự nhiên tốt nhất) | 7.000.000 đ | Chỉ đẩy video đã có tỷ lệ xem hết cao; tập trung D+14 → D+29 (mùa Tết). |
| Meta Ads (Facebook/Instagram Reels) | 4.000.000 đ | Nhắm 22–45 tuổi, người Việt xa quê/nước ngoài, sở thích văn hóa truyền thống. |
| KOC/micro-creator (5–8 người, 10k–100k theo dõi, mảng văn hóa – đời sống – sinh viên) | 6.000.000 đ | Có hợp đồng, có nhãn quảng cáo/hợp tác; duyệt kịch bản theo nguyên tắc ở `video-scripts.md`. Không chọn người làm nội dung bói toán, "tâm linh kiếm tiền". |
| Nhạc nền tự sáng tác / thuê nhạc sĩ trọn quyền | 2.000.000 đ | Hoặc dùng nhạc thư viện miễn phí bản quyền (0 đ). |
| Dự phòng (xử lý khủng hoảng, tăng ngân sách video tốt) | 1.000.000 đ | |
| Zalo OA, YouTube Shorts, Facebook Page, cộng đồng | 0 đ | Tự nhiên (organic). Zalo OA cần xác thực doanh nghiệp/hộ kinh doanh [CẦN XÁC NHẬN]. |

Quy tắc chi: tuần 1 chỉ chi ≤ 20% ngân sách để thử nội dung; tuần 3–4 dồn ngân sách vào 2–3 video có hiệu quả nhất. Dừng quảng cáo ngay nếu có dấu hiệu khủng hoảng (mục 6).

---

## 3. Giai đoạn chuẩn bị (từ hôm nay đến D-1)

| Thời điểm | Việc | Kênh / Phụ trách |
|---|---|---|
| T5 05/11 – T6 13/11 (D-64 → D-56) | Chốt listing (`google-play/`, `app-store/`), ảnh chụp, biểu tượng; dựng `site/` (support, privacy, xóa dữ liệu). Lập tài khoản TikTok, Facebook Page, YouTube, Zalo OA cùng tên "Chùa An Nhiên". Mời 1–2 **cố vấn văn hóa/Phật giáo** đọc duyệt nội dung (quẻ, thông điệp, lời nguyện mẫu, video). | Marketing + Nội dung |
| Trước T6 13/11 (D-56) | **Google Play kiểm thử kín:** nếu tài khoản nhà phát triển cá nhân tạo sau 13/11/2023, cần **≥ 12 người thử tham gia liên tục ≥ 14 ngày** trước khi xin quyền phát hành chính thức. Bắt đầu ngay. TestFlight cho iOS song song. | Dev + Marketing (tuyển tester từ người quen, nhóm sinh viên) |
| T2 23/11 (D-46, Rằm tháng Mười) | Teaser đầu tiên: video "Một ngôi chùa yên tĩnh đang được dựng" (cảnh dựng sân chùa, tiếng chuông). Mở **đăng ký trước** trên Google Play (nếu đủ điều kiện) và **đặt trước (pre-order)** trên App Store. | TikTok, Facebook, YouTube Shorts |
| T6 27/11 → T2 30/11 (D-42 → D-39) | Kết thúc 14 ngày kiểm thử kín; nộp đơn xin quyền phát hành chính thức trên Play (có thể mất vài ngày đến ~1 tuần). Tổng hợp góp ý tester. | Dev |
| Hằng tuần từ D-46 | 2–3 video/tuần: hậu trường viết thơ lục bát, âm thanh chuông/mõ, "đoán xem quẻ này nói gì". Không hé lộ quá nhiều tính năng. | TikTok, Reels, Shorts |
| T4 09/12 (D-30, mùng 1 tháng Mười Một) | **Nộp duyệt 1.0** lên cả hai store, chọn phát hành **thủ công** để kiểm soát ngày D0. Tránh nộp sát giai đoạn nghỉ lễ cuối năm của Apple (thường quanh 23–27/12) – nếu bị từ chối cần còn thời gian nộp lại. | Dev |
| T2 14/12 → T4 23/12 (D-25 → D-16) | Sửa lỗi nếu bị từ chối; chuẩn bị bản 1.1 Tết (trang trí, nhiệm vụ, Keywords iOS theo mùa). Viết sẵn bộ câu trả lời đánh giá (mục 5) và thông cáo khủng hoảng (mục 6). | Dev + Marketing |
| T4 23/12 (D-16, Rằm tháng Mười Một) | Video "Đếm ngược: còn 16 ngày Chùa An Nhiên mở cửa". Gửi bản dùng thử cho KOC đã ký. | Mạng xã hội, KOC |
| T2 04/01 (D-4) | Lên lịch đăng bài D0 → D+7; kiểm tra lần cuối link store, link bio, trang support; bật bảng kiểm duyệt UGC, phân ca trực (2 người, mỗi ca 12 giờ). | Cả nhóm |

---

## 4. 30 ngày sau ra mắt – bảng theo ngày

Ký hiệu kênh: **TT** TikTok · **FB** Facebook Page/Reels · **ZL** Zalo OA · **YT** YouTube Shorts · **CĐ** cộng đồng (nhóm sinh viên, nhóm người Việt xa xứ, nhóm văn hóa – chỉ đăng khi nhóm cho phép quảng bá) · **ST** store.

### Tuần 1 – Mở cửa chùa (D0 → D+6)
| Ngày | Dương lịch | Âm lịch | Việc chính | Kênh |
|---|---|---|---|---|
| D0 | T6 08/01 | Mùng 1 tháng Chạp | **Phát hành 1.0** (sáng 6:00). Video 1 "2 phút đi chùa giữa giờ làm". Bài giới thiệu trên Page + ZL. Thông báo cho người đăng ký trước/đặt trước (tự động). | ST, TT, FB, ZL, YT |
| D+1 | T7 09/01 | 2/12 | Video hậu trường "Vì sao chùa hư cấu?" (giải thích: không đại diện chùa thật, không nhận cúng dường). Trả lời bình luận. | TT, FB |
| D+2 | CN 10/01 | 3/12 | Đăng ở 3–5 nhóm cộng đồng (bài kể chuyện làm app, không spam link). | CĐ |
| D+3 | T2 11/01 | 4/12 | **Nộp duyệt bản 1.1 Tết** (phát hành thủ công). Video 2 "Xin một quẻ thơ lục bát". Đọc 100% đánh giá, phản hồi. | ST, TT, YT |
| D+4 | T3 12/01 | 5/12 | Hotfix nếu crash > 0,5%. Bài Zalo OA: "Thông điệp bình an tuần này". | ZL |
| D+5 | T4 13/01 | 6/12 | 2 KOC đầu đăng video (đã duyệt kịch bản). Bật TikTok Spark Ads thử 1.000.000 đ cho 2 video tốt nhất. | TT |
| D+6 | T5 14/01 | 7/12 | Báo cáo tuần 1: cài đặt, D1, điểm đánh giá, báo cáo UGC. Chỉnh Promotional Text iOS nếu cần. | Nội bộ |

### Tuần 2 – Lắng nghe & tinh chỉnh (D+7 → D+13)
| Ngày | Dương lịch | Âm lịch | Việc chính | Kênh |
|---|---|---|---|---|
| D+7 | T6 15/01 | 8/12 | Đo D7 cohort đầu. Video "Một lời nguyện mẫu mỗi ngày" (đọc lời nguyện mẫu của đội). | TT, FB |
| D+8 | T7 16/01 | 9/12 | Live ngắn 20 phút trên FB/TT: đội làm app trả lời câu hỏi, gõ mõ cùng người xem. | FB, TT |
| D+9 | CN 17/01 | 10/12 | Tổng hợp góp ý → backlog 1.1.x. Phản hồi đánh giá. | ST |
| D+10 | T2 18/01 | 11/12 | Google Play: chạy **thử nghiệm mô tả ngắn** (Store listing experiment) 2 biến thể. | ST |
| D+11 | T3 19/01 | 12/12 | KOC 3–4 đăng video. Bài ZL "Chuẩn bị đón Rằm tháng Chạp". | TT, ZL |
| D+12 | T4 20/01 | 13/12 | Video "Hậu trường thơ lục bát: viết một quẻ mất bao lâu?" | TT, YT |
| D+13 | T5 21/01 | 14/12 | Đổi ảnh chụp/feature graphic Google Play sang bản Tết (không cần bản mới). Chuẩn bị Promotional Text iOS mùa Tết (129 ký tự – xem `app-store/listing-vi.md`). Báo cáo tuần 2. | ST |

### Tuần 3 – Vào mùa Tết (D+14 → D+20)
| Ngày | Dương lịch | Âm lịch | Việc chính | Kênh |
|---|---|---|---|---|
| D+14 | T6 22/01 | **Rằm tháng Chạp** | **Phát hành 1.1 Tết** (ghi chú phát hành: `release-notes.md`). Đổi Promotional Text iOS. Video "Sân chùa đã trang hoàng đón Tết". | ST, TT, FB, ZL, YT |
| D+15 | T7 23/01 | 16/12 | Tăng Spark Ads cho video Tết hiệu quả nhất (2.000.000 đ). | TT |
| D+16 | CN 24/01 | 17/12 | Bài cộng đồng: "Người Việt xa quê đón Tết – góc chùa nhỏ trong điện thoại". | CĐ, FB |
| D+17 | T2 25/01 | 18/12 | Bật Meta Ads (Reels) nhắm người Việt ở nước ngoài + sinh viên xa nhà. | FB |
| D+18 | T3 26/01 | 19/12 | Video "Nhiệm vụ dọn sân chùa đón Ông Công Ông Táo". | TT, YT |
| D+19 | T4 27/01 | 20/12 | KOC 5–8 đăng video mùa Tết. Phản hồi đánh giá (lượng tăng). | TT, ST |
| D+20 | T5 28/01 | 21/12 | Báo cáo tuần 3. Kiểm tra tải server cho đợt cao điểm Tết (gấp 3–5 lần) [CẦN XÁC NHẬN với dev]. | Nội bộ |

### Tuần 4 – Cao điểm Tết (D+21 → D+30)
| Ngày | Dương lịch | Âm lịch | Việc chính | Kênh |
|---|---|---|---|---|
| D+21 | T6 29/01 | 22/12 | Bài ZL "Ngày mai Ông Công Ông Táo – vào chùa dọn sân cùng nhau". | ZL, FB |
| D+22 | T7 30/01 | **23/12 – Ông Công Ông Táo** | Video ngắn chủ đề dọn dẹp, chuẩn bị năm mới (không nói "tiễn xui"). | TT, FB, YT |
| D+23 | CN 31/01 | 24/12 | Trả lời đánh giá; tổng hợp lời nguyện mẫu Tết đẹp nhất (của đội) cho bài đăng. | ST |
| D+24 | T2 01/02 | 25/12 | **Video 3 "Tết này chưa về quê được"** + Spark Ads (phần ngân sách lớn nhất). | TT, FB, YT |
| D+25 | T3 02/02 | 26/12 | Chốt danh sách trực Tết (kiểm duyệt UGC, đánh giá store, máy chủ) từ 28 tháng Chạp đến mùng 4. | Nội bộ |
| D+26 | T4 03/02 | 27/12 | Bài cộng đồng & ZL: lời chúc Tết từ đội làm app. | CĐ, ZL |
| D+27 | T5 04/02 | 28/12 | Kiểm tra lại chuyển cảnh trang trí Giao thừa/mùng 1 trên máy thật (giờ Việt Nam). | Dev |
| D+28 | T6 05/02 | **29/12 – Giao thừa** | Bài "Thắp nén hương Giao thừa" đăng 21:00; giảm quảng cáo sau 22:00. Trực UGC tăng cường. | TT, FB, ZL |
| D+29 | T7 06/02 | **Mùng 1 Tết Đinh Mùi** | Bài chúc mừng năm mới; video "Lời nguyện đầu năm treo kín Cây nguyện" (dùng lời nguyện mẫu/được người dùng đồng ý). Theo dõi crash từng giờ. | Tất cả |
| D+30 | CN 07/02 | Mùng 2 Tết | **Tổng kết 30 ngày** (bảng KPI mục 1). Lên kế hoạch Rằm tháng Giêng (20/02/2027): nhiệm vụ "Ngắm trăng Rằm tháng Giêng" (đã có trong bộ mùa Tết `content/mua/tet.json`), video "Rằm tháng Giêng – đi chùa trong điện thoại". | Nội bộ |

---

## 5. Phản hồi đánh giá trên store

Nguyên tắc: trả lời **trong 24 giờ**, ký tên "Đội Chùa An Nhiên", lịch sự, ngắn, không tranh luận về tín ngưỡng, không hứa linh ứng, không xin đánh giá 5 sao đổi quà. Gợi ý đánh giá trong app dùng API chính thức (Google Play In-App Review, `SKStoreReviewController`/`requestReview` của Apple), chỉ hiện sau trải nghiệm tích cực (ví dụ lần thứ 3 thắp hương), không hiện ngay sau khi xin quẻ.

| Tình huống | Mẫu trả lời |
|---|---|
| Khen | "Cảm ơn bạn đã ghé Chùa An Nhiên. Mong mỗi lần mở app là thêm vài phút bình yên cho bạn. – Đội Chùa An Nhiên" |
| Báo lỗi | "Xin lỗi bạn vì sự bất tiện. Bạn có thể gửi mẫu máy và mô tả lỗi đến hotro@chuaannhien.example để chúng tôi sửa sớm nhất không? Cảm ơn bạn đã báo." |
| "Quẻ không đúng / không linh" | "Cảm ơn bạn đã chia sẻ. Quẻ ở Chùa An Nhiên được viết để chiêm nghiệm – giúp mình soi lại lòng mình – chứ không phải lời tiên đoán. Mong một câu thơ nào đó vẫn đem lại cho bạn chút gợi ý nhẹ nhàng." |
| "Đi chùa online là bất kính" | "Cảm ơn bạn đã thẳng thắn góp ý. Chùa An Nhiên là chùa hư cấu, không thay thế việc lễ chùa hay tu tập; chúng tôi làm app như một góc tĩnh tâm cho những lúc không thể đến chùa. Nếu có chi tiết nào khiến bạn thấy chưa phù hợp, mong bạn chỉ giúp qua hotro@chuaannhien.example để chúng tôi điều chỉnh." |
| Gặp lời nguyện phản cảm | "Rất xin lỗi bạn. Bạn có thể nhấn giữ lời nguyện → Báo cáo hoặc Chặn người viết; chúng tôi xem xét mọi báo cáo trong 24 giờ. Chúng tôi đã kiểm tra thêm bộ lọc." |
| Muốn thêm tính năng (ví dụ văn khấn, nhắc ngày rằm) | "Cảm ơn ý tưởng của bạn! Chúng tôi đã ghi lại để cân nhắc cho các bản sau." (Không hứa ngày cụ thể.) |
| Hỏi về dữ liệu/xóa dữ liệu | "Bạn có thể xóa dữ liệu ngay trong Cài đặt → Xóa dữ liệu của tôi, hoặc xem hướng dẫn tại https://chuaannhien.example/support.html#xoa-du-lieu." |

---

## 6. Rủi ro & xử lý khủng hoảng truyền thông

### 6.1 Bảng rủi ro
| Rủi ro | Khả năng | Ảnh hưởng | Phòng ngừa |
|---|---|---|---|
| Bị cho là **bất kính / thương mại hóa tâm linh** | Trung bình | Cao | Cố vấn văn hóa/Phật giáo duyệt nội dung trước ra mắt; thông điệp nhất quán "chùa hư cấu, không thay thế đi chùa, không nhận tiền"; trang FAQ "Vì sao có Chùa An Nhiên?"; không dùng tượng/biểu tượng có thật, không chữ Vạn; không làm nội dung hài cợt nghi lễ. |
| Bị nhầm là app của một chùa/tổ chức có thật | Thấp | Cao | Không dùng tên chùa thật trong từ khóa, quảng cáo, hashtag; ghi rõ "chùa hư cấu" trong mô tả. |
| **Lời nguyện phản cảm** lọt lên Cây nguyện, bị chụp màn hình lan truyền | Trung bình | Cao | Bộ lọc + ngưỡng tự ẩn + trực 24/7 dịp Tết (xem `age-rating.md` mục 3). Có công cụ gỡ hàng loạt. |
| Quẻ/thông điệp bị hiểu là **mê tín, hù dọa** hoặc có câu chữ nhạy cảm | Thấp | Trung bình | D4, D9: mọi quẻ tích cực, có ghi chú chiêm nghiệm. [CẦN XÁC NHẬN] nội dung có thể sửa từ server (không cần nộp bản mới) để sửa nhanh. |
| KOC nói quá ("app linh lắm", "xin là trúng") | Trung bình | Trung bình | Kịch bản duyệt trước; điều khoản hợp đồng cho phép yêu cầu gỡ/sửa; không thanh toán phần còn lại khi vi phạm. |
| **Pháp lý tại Việt Nam:** nếu sản phẩm bị coi là "trò chơi điện tử trên mạng" có thể cần giấy phép/thông báo phát hành theo quy định hiện hành về trò chơi điện tử; quảng cáo sản phẩm có yếu tố tín ngưỡng, tôn giáo cần tuân thủ Luật Tín ngưỡng, tôn giáo và Luật Quảng cáo | Trung bình | Cao | **[CẦN XÁC NHẬN với tư vấn pháp lý trước khi nộp store]**. Đây cũng là lý do đề xuất phân loại "Ứng dụng – Lifestyle" thay vì "Trò chơi" – nhưng phân loại phải đúng bản chất sản phẩm, không dùng để né quy định. |
| Quá tải máy chủ dịp Giao thừa/mùng 1 | Trung bình | Trung bình | Kiểm thử tải trước D+20; chế độ "chỉ đọc" cho Cây nguyện nếu quá tải; thắp hương/gõ mõ/xin quẻ hoạt động ngoại tuyến [CẦN XÁC NHẬN]. |
| Đánh giá 1 sao hàng loạt (bị "brigading") | Thấp | Trung bình | Không phản ứng gay gắt; báo cáo đánh giá vi phạm chính sách qua console; trả lời mẫu điềm tĩnh. |
| Lỗi ngày âm lịch (hiển thị sai Rằm/Tết) | Thấp | Cao (mất uy tín đúng dịp lễ) | Kiểm thử tự động bảng ngày 2026–2030 với thuật toán chuẩn UTC+7; kiểm tra tháng thiếu (D13). |

### 6.2 Quy trình xử lý khủng hoảng
| Mức | Dấu hiệu | Hành động | Thời hạn |
|---|---|---|---|
| **1 – Theo dõi** | Vài bình luận tiêu cực rời rạc | Trả lời bằng mẫu ở mục 5; ghi nhật ký. | Trong 24 giờ |
| **2 – Cảnh báo** | Một bài/video chỉ trích được chia sẻ > 500 lần, hoặc nhiều đánh giá 1 sao cùng nội dung | (1) Tạm dừng toàn bộ quảng cáo trả phí; (2) họp nhóm xử lý (Marketing, Dev, Nội dung, cố vấn văn hóa); (3) kiểm tra sự thật: lỗi có thật không, nằm ở đâu; (4) đăng **phản hồi chờ** trên Page/TikTok; (5) nếu là nội dung UGC: gỡ ngay, rà soát bộ lọc. | Phản hồi chờ trong **2 giờ**; xử lý gốc trong 24 giờ |
| **3 – Khủng hoảng** | Báo chí, cơ quan chức năng, tổ chức tôn giáo lên tiếng; hoặc lan truyền diện rộng | Tất cả bước mức 2 + (6) một người phát ngôn duy nhất; (7) gặp/trao đổi trực tiếp với bên lên tiếng, lắng nghe; (8) sửa nội dung/tính năng gây tranh cãi, nếu cần tạm ẩn tính năng (ví dụ Cây nguyện) hoặc tạm ngừng phân phối; (9) tham vấn pháp lý; (10) thông báo công khai những gì đã sửa. | Trong ngày |

Nguyên tắc ứng xử: **lắng nghe trước, giải thích sau**; xin lỗi về tác động khi có lỗi thật, không đổ lỗi cho người dùng; không xóa bình luận chỉ trích (chỉ ẩn bình luận xúc phạm, spam, lộ thông tin cá nhân); không tranh luận giáo lý; không dùng khủng hoảng để "câu view".

**Mẫu phản hồi chờ (mức 2–3):**
> "Chúng tôi đã đọc các góp ý về [vấn đề]. Chùa An Nhiên là ngôi chùa hư cấu, được làm với mong muốn tạo một góc tĩnh tâm và tôn trọng văn hóa đi chùa của người Việt – không nhằm thay thế việc lễ chùa, tu tập và không nhận bất kỳ khoản tiền công đức nào. Chúng tôi đang xem xét kỹ [nội dung/tính năng] và sẽ cập nhật cụ thể trong vòng 24 giờ. Mọi góp ý xin gửi về hotro@chuaannhien.example. Chân thành cảm ơn và mong được mọi người chỉ giáo thêm."

**Mẫu cập nhật sau xử lý:**
> "Cập nhật về [vấn đề]: chúng tôi đã [gỡ nội dung / sửa câu chữ / tạm ẩn tính năng / thêm bộ lọc]. Chúng tôi xin lỗi vì đã để điều này xảy ra và cảm ơn những người đã thẳng thắn góp ý. Từ nay, [biện pháp phòng ngừa cụ thể]."

---

## 7. Sau D+30
- Rằm tháng Giêng (T7 20/02/2027): chiến dịch nhỏ, đổi ảnh/Promotional Text về bản thường sau mùng 10 Tết.
- Đánh giá lại từ khóa (`aso-keywords.md` mục 4), cập nhật Keywords iOS trong bản 1.1.x.
- Chuẩn bị Phật Đản (T5 20/05/2027 – bộ mùa `content/mua/phat-dan.json`, mùng 8–Rằm tháng Tư) và bản 1.2 Vu Lan (bộ mùa `content/mua/vu-lan.json`) (phát hành khoảng T2 02/08/2027, Rằm tháng Bảy T2 16/08/2027).
