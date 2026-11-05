# Ghi chú phát hành (Release notes / What's new)

- Google Play "Có gì mới" giới hạn 500 ký tự mỗi ngôn ngữ; App Store cho phép 4000 nhưng ta giữ chung ≤500 để dùng một bản cho cả hai store.
- Đếm bằng Node (`[...s.normalize('NFC')].length`). Phần trong `[...]` của mẫu là chỗ cần điền – đếm lại sau khi điền.
- Không viết "linh nghiệm", không hứa điều ước thành sự thật, không nhắc cúng dường.

## 1.0.0 – Ra mắt

### Tiếng Việt
Giới hạn: 500 · Thực tế: **429** ký tự

```text
Chào mừng bạn đến Chùa An Nhiên – ngôi chùa hư cấu, yên tĩnh trong điện thoại.
• Thắp hương ảo, gõ mõ, thỉnh chuông
• Xin quẻ: 100 quẻ thơ lục bát tự sáng tác, có lời giải theo chủ đề – để chiêm nghiệm, không phải tiên đoán
• Cây nguyện: viết và đọc lời nguyện ẩn danh, có lọc từ, báo cáo và chặn
• Thông điệp bình an mỗi ngày
• Lịch lễ âm lịch, trang trí và nhiệm vụ theo mùa
Miễn phí, không quảng cáo, không mua trong ứng dụng.
```

### English
Limit: 500 · Actual: **445** characters

```text
Welcome to Chùa An Nhiên – a quiet, fictional temple in your pocket.
• Light virtual incense, tap the wooden fish, ring the bell
• Draw a fortune: 100 original lục bát poems with readings by topic – for reflection, not prediction
• Wishing Tree: write and read anonymous wishes, with filtering, reporting and blocking
• A peaceful message every day
• Lunar festival calendar with seasonal decorations and tasks
Free, no ads, no in-app purchases.
```

## Mẫu 1.1 – Mùa Tết (dự kiến phát hành trước Rằm tháng Chạp)

> Gợi ý lịch: bản 1.1 lên store khoảng Rằm tháng Chạp (thứ Sáu 22/01/2027) để kịp Ông Công Ông Táo (23 tháng Chạp, thứ Bảy 30/01/2027) và Tết Đinh Mùi (mùng 1 tháng Giêng, thứ Bảy 06/02/2027). Tháng Chạp năm Bính Ngọ là tháng thiếu (29 ngày) → đêm Giao thừa là tối 29 tháng Chạp (thứ Sáu 05/02/2027). Ngày đã kiểm bằng thuật toán âm lịch Việt Nam (múi giờ UTC+7) – đội dev đối chiếu lại với `content/su-kien-am-lich.json`.

### Tiếng Việt
Giới hạn: 500 · Thực tế: **400** ký tự

```text
Sân chùa đã sẵn sàng đón Tết Đinh Mùi!
• Trang trí Tết: hoa mai, hoa đào, câu đối đỏ, đèn lồng
• Nhiệm vụ Tết: tiễn ông Công ông Táo, dọn nhà dọn lòng, tĩnh tâm đêm Giao thừa, gửi phong bao lời chúc cho người thân
• [Tính năng mới, ví dụ: thiệp chúc Tết chia sẻ được]
• Thông điệp bình an riêng cho những ngày đầu năm
• Sửa lỗi và cải thiện hiệu năng
Chúc bạn năm mới an nhiên, vui khỏe bên gia đình.
```

### English
Limit: 500 · Actual: **480** characters

```text
The temple yard is ready for the Lunar New Year (Tết)!
• Tết decorations: apricot and peach blossoms, red couplets, lanterns
• Tết tasks: farewell to the Kitchen Gods, tidy the home and the heart, a moment of stillness on New Year's Eve, an envelope of wishes for a loved one
• [New feature, e.g. shareable New Year cards]
• Special peaceful messages for the first days of the year
• Bug fixes and performance improvements
Wishing you a serene and happy New Year with your family.
```

## Mẫu 1.2 – Mùa Vu Lan (dự kiến phát hành đầu tháng Bảy âm lịch)

> Gợi ý lịch: Rằm tháng Bảy năm Đinh Mùi rơi vào thứ Hai 16/08/2027; phát hành 1.2 khoảng mùng 1 tháng Bảy (thứ Hai 02/08/2027) để có hai tuần chuẩn bị trước Rằm. Nội dung Vu Lan chỉ nói về báo hiếu, tưởng nhớ nhẹ nhàng – không nói "cúng cô hồn để tránh xui", không hù dọa "tháng cô hồn".

### Tiếng Việt
Giới hạn: 500 · Thực tế: **411** ký tự

```text
Mùa Vu Lan đã về Chùa An Nhiên.
• Trang trí Vu Lan: hồ sen, đèn hoa đăng, bông hồng cài áo
• Cài bông hồng ảo: hồng đỏ cho người còn cha mẹ, hồng trắng để tưởng nhớ
• Nhiệm vụ Vu Lan: lời cảm ơn cha mẹ, thả đèn hoa đăng, kể một kỷ niệm về ông bà, cha mẹ
• Lời nguyện mẫu mới cho chủ đề biết ơn và tưởng nhớ
• [Tính năng mới]
• Sửa lỗi và cải thiện hiệu năng
Mong bạn một mùa Vu Lan ấm áp, đong đầy lòng biết ơn.
```

### English
Limit: 500 · Actual: **433** characters

```text
Vu Lan season has arrived at Chùa An Nhiên.
• Vu Lan decorations: lotus pond, floating lanterns, roses
• Pin a virtual rose: red to honor living parents, white in remembrance
• Vu Lan tasks: thank your parents, float a lantern, share a memory of your grandparents or parents
• New sample wishes for gratitude and remembrance
• [New feature]
• Bug fixes and performance improvements
Wishing you a warm Vu Lan season full of gratitude.
```
