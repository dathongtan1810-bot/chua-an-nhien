# Xếp hạng độ tuổi – Google Play (IARC) & App Store

Căn cứ: D17, D20 trong `content/DECISIONS.md`. Các đáp án dưới đây mô tả **nội dung do ứng dụng cung cấp**; riêng nội dung người dùng tạo (lời nguyện trên Cây nguyện) được khai ở mục tương tác/UGC. Mục nào phụ thuộc bản dựng thực tế đánh dấu **[CẦN XÁC NHẬN]**.

> Nguyên tắc: trả lời trung thực, thà khai chặt hơn một chút còn hơn bị gỡ app hoặc bị đổi xếp hạng sau khi phát hành. Mỗi khi thêm tính năng (chat, chia sẻ ảnh, mua hàng…) phải làm lại bảng câu hỏi.

---

## 1. Google Play – Bảng câu hỏi IARC (Play Console → Chính sách → Xếp hạng nội dung)

**Danh mục ứng dụng khi bắt đầu bảng câu hỏi:** "Tất cả các loại ứng dụng khác" (All Other App Types) – vì app đăng ở danh mục Lifestyle. Nếu nhóm chọn phương án B (Game → Casual) thì chọn "Trò chơi (Game)"; các đáp án nội dung vẫn như dưới.

| # | Nhóm câu hỏi | Câu hỏi (tóm tắt) | Đáp án | Giải thích |
|---|---|---|---|---|
| 1 | Bạo lực | Có mô tả bạo lực (hoạt hình, giả tưởng, thực tế), máu, hành động gây thương tích? | **Không** | Chỉ có thắp hương, gõ mõ, thỉnh chuông, lắc ống xăm. Gõ mõ/thỉnh chuông không phải hành vi bạo lực. |
| 2 | Sợ hãi / kinh dị | Có nội dung, hình ảnh, âm thanh gây sợ hãi? | **Không** | Không có ma quỷ, "cô hồn", quẻ hung (D9). Trang trí Vu Lan dùng hoa sen, hoa đăng, hoa hồng – không hình ảnh u ám. [CẦN XÁC NHẬN] âm thanh chuông không có hiệu ứng rùng rợn. |
| 3 | Tình dục / khỏa thân | Có khỏa thân, nội dung gợi dục, đề cập tình dục? | **Không** | Chủ đề "tình duyên" chỉ là lời khuyên nhẹ nhàng về sự chân thành, thấu hiểu. |
| 4 | Ngôn ngữ | Có từ ngữ thô tục, chửi thề, lăng mạ, nội dung phân biệt đối xử? | **Không** | Nội dung app tự viết, không thô tục. Lời nguyện người dùng có thể chứa từ xấu nhưng được lọc → khai ở mục tương tác. |
| 5 | Chất bị kiểm soát | Có đề cập/hình ảnh ma túy, rượu bia, thuốc lá? | **Không** | Hương (nhang) ảo là vật phẩm nghi lễ, không phải thuốc lá/chất kích thích. [CẦN XÁC NHẬN] mâm cỗ Tết/Vu Lan trong trang trí **không** có rượu. |
| 6 | Hài thô tục | Có hài về chất thải cơ thể, hành vi thô? | **Không** | |
| 7 | Cờ bạc | Có cờ bạc thật bằng tiền? Có mô phỏng cờ bạc (casino, đặt cược, quay thưởng)? | **Không / Không** | Xin quẻ xăm là bốc ngẫu nhiên một bài thơ để chiêm nghiệm: không đặt cược, không thắng/thua, không có tiền hay vật phẩm giá trị. Không có hộp quà ngẫu nhiên (loot box). |
| 8 | Biểu tượng bị cấm (câu hỏi dành cho Đức – USK) | Có chữ thập ngoặc (swastika), biểu tượng Quốc xã? | **Không** | **Lưu ý quan trọng:** chữ Vạn (卍) là biểu tượng Phật giáo nhưng hình dạng dễ bị hiểu nhầm và có thể khiến app bị gắn cờ ở một số thị trường. **Khuyến nghị không dùng chữ Vạn trong đồ họa bản 1.0** (thay bằng hoa sen, bánh xe pháp luân giản lược, mây). [CẦN XÁC NHẬN] với đội đồ họa: đã rà soát toàn bộ asset. |
| 9 | Tương tác người dùng | Người dùng có thể tương tác hoặc trao đổi nội dung với người khác (văn bản, âm thanh, hình ảnh)? | **Có** | Lời nguyện (văn bản ngắn, ≤120 ký tự) được hiển thị ẩn danh cho người dùng khác trên Cây nguyện. Không có chat riêng, không gửi ảnh/âm thanh. |
| 10 | Chia sẻ vị trí | App có chia sẻ vị trí thực của người dùng với người dùng khác? | **Không** | App không xin quyền vị trí (D17). [CẦN XÁC NHẬN] trong manifest không có `ACCESS_*_LOCATION`. |
| 11 | Mua hàng kỹ thuật số | Người dùng có thể mua hàng hóa kỹ thuật số? | **Không** | Bản 1.0 không có IAP, không nhận cúng dường (D3, D17). Thêm IAP ở bản sau → làm lại bảng câu hỏi. |
| 12 | Truy cập Internet không giới hạn | App có trình duyệt web / cho phép truy cập web tự do? | **Không** | Liên kết duy nhất ra ngoài là trang hỗ trợ/chính sách (mở bằng trình duyệt hệ thống). |
| 13 | Tin tức / trình duyệt / công cụ tìm kiếm | App là ứng dụng tin tức, trình duyệt, công cụ tìm kiếm? | **Không** | |
| 14 | Nội dung do người dùng tạo có được kiểm duyệt? | (Một số phiên bản câu hỏi có hỏi biện pháp kiểm duyệt) | **Có – lọc tự động + báo cáo + chặn** | Xem mục 3. |

### Kết quả dự kiến (Google Play)

| Hệ thống | Xếp hạng dự kiến |
|---|---|
| IARC (chung) | **3+** |
| PEGI (châu Âu) | **PEGI 3** |
| ESRB (Bắc Mỹ) | **Everyone** |
| USK (Đức) | **USK 0** (nếu không có chữ Vạn) |
| ClassInd (Brazil) | **L** |
| ACB (Úc) | **G** |
| Yếu tố tương tác (Interactive Elements) | **Users Interact** |

> Việt Nam không có hệ thống riêng trong IARC; Google Play hiển thị xếp hạng IARC chung cho người dùng Việt Nam.

### Đối tượng mục tiêu (Play Console → Đối tượng mục tiêu và nội dung)
- **Nhóm tuổi mục tiêu: 13–15, 16–17, 18+.** Không chọn nhóm dưới 13 tuổi, vì: (1) có UGC hiển thị công khai; (2) chọn nhóm dưới 13 kéo theo chính sách Gia đình (Families) với yêu cầu chặt hơn về dữ liệu và SDK.
- "Ứng dụng có thể vô tình thu hút trẻ em không?" → **Không** (phong cách đồ họa trầm, chủ đề nghi lễ, không nhân vật hoạt hình cho trẻ nhỏ). [CẦN XÁC NHẬN] nếu đồ họa dùng nhân vật chibi dễ thương, cân nhắc trả lời Có và rà soát thêm.
- Quảng cáo: **Không chứa quảng cáo.**

---

## 2. App Store – Age Rating questionnaire (App Store Connect → App Information → Age Ratings)

Từ năm 2025, Apple dùng hệ xếp hạng mới **4+ / 9+ / 13+ / 16+ / 18+** (bỏ 12+ và 17+) và bổ sung các câu hỏi về tính năng (Capabilities), chủ đề y tế/sức khỏe, kiểm soát trong app. Đáp án đề xuất:

### 2.1 In-App Controls
| Câu hỏi | Đáp án | Ghi chú |
|---|---|---|
| Parental Controls | **No** | App không có chế độ phụ huynh. |
| Age Assurance | **No** | Không xác minh tuổi. [CẦN XÁC NHẬN] theo yêu cầu pháp lý từng thị trường tại thời điểm nộp. |

### 2.2 Capabilities
| Câu hỏi | Đáp án | Ghi chú |
|---|---|---|
| Unrestricted Web Access | **No** | |
| User-Generated Content | **Yes** | Cây nguyện hiển thị lời nguyện ẩn danh của người khác. |
| Messaging and Chat | **No** | Không có tin nhắn riêng/chat giữa người dùng. Lời nguyện là bài đăng công khai ngắn, không có trả lời/bình luận. [CẦN XÁC NHẬN] nếu thêm tính năng "gửi lời chúc cho người khác" → đổi thành Yes. |
| Advertising | **No** | |

### 2.3 Mature Themes
| Câu hỏi | Đáp án |
|---|---|
| Profanity or Crude Humor | **None** |
| Horror/Fear Themes | **None** |
| Alcohol, Tobacco, or Drug Use or References | **None** |
| Mature or Suggestive Themes | **None** |

### 2.4 Medical or Wellness
| Câu hỏi | Đáp án | Ghi chú |
|---|---|---|
| Medical or Treatment Information | **None** | App không đưa thông tin chẩn đoán/điều trị. Lời giải chủ đề "sức khỏe" chỉ khích lệ nghỉ ngơi, giữ lòng bình thản, đi khám khi cần – **không** gợi ý thuốc, bài thuốc, chữa bệnh bằng cầu khấn. |
| Health or Wellness Topics | **Yes** | Khai thận trọng: app có thông điệp tĩnh tâm, nhịp gõ mõ giúp thở chậm và quẻ có chủ đề "sức khỏe". Đáp án này không mâu thuẫn với mức 13+ đã chọn. [CẦN XÁC NHẬN] |

### 2.5 Sexuality or Nudity
| Câu hỏi | Đáp án |
|---|---|
| Sexual Content or Nudity | **None** |
| Graphic Sexual Content and Nudity | **None** |

### 2.6 Violence
| Câu hỏi | Đáp án |
|---|---|
| Cartoon or Fantasy Violence | **None** |
| Realistic Violence | **None** |
| Prolonged Graphic or Sadistic Realistic Violence | **None** |
| Guns or Other Weapons | **None** |

### 2.7 Chance-Based Activities
| Câu hỏi | Đáp án | Ghi chú |
|---|---|---|
| Simulated Gambling | **None** | Xin xăm không có đặt cược, điểm thưởng hay vật phẩm. |
| Gambling (real money) | **No** | |
| Contests | **No** | |
| Loot Boxes / paid random items | **No** | |

### 2.8 Các mục khác
- **Made for Kids:** No.
- **Age Rating Override:** chọn mức **13+** (cao hơn mức hệ thống tự tính, dự kiến 4+ hoặc 9+).

### Quyết định: App Store **13+** (tương đương "12+" trong D20)
- D20 đề xuất 12+ theo hệ cũ. Hệ mới không còn 12+; mức gần nhất và không thấp hơn là **13+** → chọn 13+.
- Lý do chọn cao hơn mức tự tính: (1) UGC hiển thị công khai, dù đã lọc vẫn có rủi ro lọt nội dung không phù hợp; (2) chủ đề tâm linh/tưởng nhớ người đã khuất (cầu siêu, Vu Lan) phù hợp người đọc có khả năng tự diễn giải; (3) nhất quán với nhóm tuổi mục tiêu 13+ trên Google Play; (4) App Review thường kỳ vọng app có UGC không ở mức 4+.
- Nếu tại thời điểm nộp App Store Connect vẫn hiển thị hệ cũ → chọn **12+**.
- Đánh đổi: 13+ có thể bị Screen Time của một số gia đình chặn với trẻ dưới 13 – chấp nhận được vì không nhắm trẻ em.

---

## 3. Yêu cầu tính năng UGC (App Store Guideline 1.2 & chính sách UGC của Google Play)

Guideline 1.2 yêu cầu app có nội dung người dùng tạo phải có: **(a) cơ chế lọc** nội dung phản cảm trước khi đăng; **(b) cơ chế báo cáo** nội dung phản cảm và phản hồi kịp thời; **(c) khả năng chặn** người dùng lạm dụng; **(d) thông tin liên hệ** công khai. Google Play (chính sách User Generated Content) yêu cầu tương tự và thêm: điều khoản sử dụng người dùng phải đồng ý, kiểm duyệt liên tục.

Checklist cho đội dev – tất cả **bắt buộc trước khi nộp bản 1.0** [CẦN XÁC NHẬN từng mục]:

| # | Yêu cầu | Đặc tả đề xuất |
|---|---|---|
| U1 | **Điều khoản sử dụng** phải đồng ý trước khi treo lời nguyện đầu tiên | Hộp thoại ngắn: "Lời nguyện sẽ hiển thị ẩn danh cho mọi người. Không viết lời lẽ xúc phạm, thù ghét, quấy rối, thông tin cá nhân, quảng cáo, số tài khoản. Chúng tôi không dung thứ nội dung phản cảm và sẽ gỡ bỏ, chặn người vi phạm." + liên kết Điều khoản. Nút "Tôi đồng ý". |
| U2 | **Lọc tự động trước khi đăng** | Danh sách từ cấm tiếng Việt có dấu + không dấu + biến thể (teencode, chèn ký tự, số thay chữ), tiếng Anh; chặn số điện thoại, email, URL, số tài khoản/ví, @tên; giới hạn 120 ký tự (D15); giới hạn tần suất (ví dụ 5 lời nguyện/ngày/thiết bị). Lời nguyện bị nghi ngờ → không hiển thị công khai, chỉ người viết thấy (hoặc đưa vào hàng chờ duyệt). |
| U3 | **Báo cáo** trên mỗi lời nguyện | Nút "…" hoặc nhấn giữ → "Báo cáo" với lý do: Xúc phạm/thù ghét · Quấy rối · Nội dung người lớn · Lừa đảo/quảng cáo · Thông tin cá nhân · Tự làm hại bản thân · Khác. Lời nguyện bị báo cáo ẩn ngay với người báo cáo. |
| U4 | **Phản hồi kịp thời** | Quản trị viên xem xét báo cáo **trong vòng 24 giờ**; tự động ẩn khỏi Cây nguyện khi đạt ngưỡng (ví dụ 3 báo cáo từ 3 thiết bị khác nhau) chờ xem xét. Ghi nhật ký xử lý. |
| U5 | **Chặn người dùng** | "Chặn người viết": ẩn mọi lời nguyện từ deviceId/ID ẩn danh đó trên thiết bị người chặn; quản lý danh sách đã chặn trong Cài đặt (bỏ chặn được). Không hiển thị deviceId thật cho người khác. |
| U6 | **Xử lý người vi phạm** | Quản trị viên có thể gỡ lời nguyện và cấm (ban) ID ẩn danh vi phạm nhiều lần không được đăng công khai nữa. |
| U7 | **Thông tin liên hệ** | Email hỗ trợ trong app (Cài đặt → Liên hệ), trên trang Support URL và trong mô tả store. |
| U8 | **Nội dung nhạy cảm về tự làm hại** | Nếu lời nguyện chứa từ khóa liên quan tự làm hại/tuyệt vọng: không đăng công khai; hiển thị thông điệp nhẹ nhàng khuyến khích người viết trò chuyện với người thân tin cậy hoặc gọi cấp cứu 115 (Việt Nam) / số khẩn cấp địa phương. [CẦN XÁC NHẬN] nội dung thông điệp với chuyên gia. |
| U9 | **Không hiển thị thông tin định danh** | Lời nguyện công khai chỉ hiển thị biệt danh (nếu người dùng chọn hiện) hoặc "Một người viết"; không hiển thị vị trí, thời gian chính xác (chỉ "hôm nay", "tuần này"). |
| U10 | **Nội dung mẫu ban đầu** | Cây nguyện lúc mở đầu dùng lời nguyện mẫu do đội viết (`content/loi-nguyen-mau.json`) để không bị trống và đặt chuẩn mực văn phong. |
| U11 | **Ghi chú cho App Review** | Mô tả vị trí nút Báo cáo/Chặn và quy trình 24 giờ trong App Review Notes (xem `app-store/listing-vi.md`). |
