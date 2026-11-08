# REVIEW – Tăng độ đa dạng thông điệp ngày & lời nguyện mẫu (07/11/2026)

Phạm vi sửa: `content/thong-diep-ngay.json`, `content/loi-nguyen-mau.json` và bản EN cùng tên trong `content/i18n/en/`. Không đổi `id`, `chuDe`, số câu (366 / 300) hay số lời nguyện mỗi chủ đề. `node content/validate.mjs` → **0 lỗi, 0 cảnh báo**.

## Cách đo
Script Node (chạy ngoài repo, trong scratchpad của phiên): `dodang.mjs <file> [--uni]`.
- Chuẩn hóa: NFC, chữ thường, bỏ dấu câu. Lời nguyện bỏ cụm mở đầu chung ("con nguyện", "con mong (mình)", "xin cho (con)") trước khi so, để cụm mở đầu không làm các câu giống nhau một cách giả tạo.
- Jaccard trên tập **từ + bigram** (mặc định) và trên tập **từ đơn** (`--uni`, nhạy hơn).
- `meanMaxSim`: trung bình độ giống của mỗi câu với câu gần nó nhất. `distinctBigramRatio`: số bigram khác nhau / tổng bigram (càng cao càng ít lặp).
- Tần suất cụm 2–3 từ = số câu chứa cụm đó.
- Chọn câu để viết lại: `rank.mjs` chấm điểm = độ giống lớn nhất + trung bình 3 câu gần nhất + số cụm sáo (bình an, hôm nay, cảm ơn, lắng nghe, món quà, kiên nhẫn, mỗi ngày…) + tỉ lệ bigram phổ biến; sau đó đọc lại bằng mắt.

Kết quả đo ban đầu: **không có cặp nào > 0.5** ở cả hai cách đo. Bộ nội dung không có câu trùng nhau; vấn đề nằm ở các cụm từ và khuôn câu lặp lại ("Hôm nay hãy…", "Gửi lời cảm ơn tới…", "Con biết ơn X đã…", "…mỗi ngày"). Vì vậy tiêu chí chọn chính là cụm sáo và khuôn câu, cộng với các cặp > 0.3.

## Câu được giữ nguyên có chủ đích
- Thông điệp được trích nguyên văn ở `store/social-posts-30-ngay.md` / `store/video-scripts.md`: **1, 9, 10, 12, 14, 16, 21, 23, 238, 327, 343, 357**.
- Lời nguyện được trích ở store: **104, 119** (`screenshots.md`), **213** (`social-posts-30-ngay.md`).
- Các câu gắn ngày dương đặc biệt hoặc mốc tháng (vd 67 – 8/3, 121 – 1/5, 151, 171, 208 – 27/7, 243, 293 – 20/10, 324 – 20/11, 334, 356, 364–366): không đổi.
- Đã grep đoạn đầu câu cũ của mọi id bị đổi trong `site/`, `store/`, `content/`: không còn nơi nào trích các câu này.

## Đã đổi
**Thông điệp ngày: 39 câu.** id 2, 18, 19, 29, 45, 47, 61, 66, 74, 86, 89, 104, 123, 126, 139, 157, 166, 169, 175, 184, 190, 196, 202, 207, 214, 220, 231, 235, 237, 242, 259, 263, 275, 280, 282, 286, 291, 294, 342. Câu mới vẫn đúng mốc mùa: 2–47 đầu năm, 61–139 xuân–hè, 157–242 hè, 259–294 thu, 342 đông.

**Lời nguyện mẫu: 38 câu.** bien-on 17 (241, 243, 244, 245, 247, 248, 250, 251, 252, 254, 255, 258, 260, 261, 262, 263, 265) · binh-an 5 (207, 219, 238, 239, 240) · cong-viec 5 (43, 62, 65, 67, 75) · gia-dao 3 (5, 9, 20) · suc-khoe 3 (83, 91, 115) · hoc-hanh 2 (116, 136) · tinh-duyen 1 (180) · tai-loc 1 (198) · the-gioi 1 (300).
- Nhóm `bien-on` là nhóm rập khuôn nhất ("Con biết ơn/cảm ơn X đã…"). Câu mới vẫn giữ lòng biết ơn nhưng gắn với một việc người nguyện **tự làm** để đáp lại.
- Các câu kiểu "Xin cho…" mang ý cầu xin (vd 43 phỏng vấn, 65 ca đêm, 207 đi xa, 238 "bước qua cổng chùa đều mang về an yên") được đổi thành hành động cụ thể của bản thân. Câu 238 cũ có thể bị hiểu là hứa linh ứng.

Bản EN của toàn bộ 77 id trên đã cập nhật (tiếng Anh Mỹ, D33: "Lunar New Year (Tết)" ở id 5). Câu EN cũng nằm trong giới hạn 160/120 ký tự.

## Chỉ số trước → sau

| Chỉ số | Thông điệp (trước → sau) | Lời nguyện (trước → sau) |
|---|---|---|
| Jaccard TB mọi cặp (từ+bigram) | 0.0220 → 0.0211 | 0.0149 → 0.0145 |
| meanMaxSim (từ+bigram) | 0.1243 → 0.1171 | 0.1339 → 0.1235 |
| meanMaxSim (từ đơn) | 0.2023 → 0.1926 | 0.2075 → 0.1917 |
| Cặp > 0.5 (cả hai cách đo) | 0 → 0 | 0 → 0 |
| Cặp > 0.3 (từ đơn) | 7 → 2 | 14 → 4 |
| Câu có câu gần nhất > 0.35 (từ đơn) | 4 → 0 | 8 → 4 |
| Tỉ lệ bigram khác nhau | 0.7034 → 0.7229 | 0.7166 → 0.7324 |

Số câu chứa cụm:
- **Thông điệp:** "hôm nay" 33 → 15 · "cảm ơn" 33 → 21 · "lắng nghe" 13 → 6 · "kiên nhẫn" 13 → 7 · "món quà" 9 → 4 · "biết ơn" 8 → 5 · "mỗi ngày" 4 → 2 · "một chút" 16 → 11 · "hôm nay hãy" 8 → 4 · "lời cảm ơn" 9 → 6. "bình an" 5, "nhẹ nhàng" 11, "tử tế" 11 không đổi, vì các câu chứa chúng không nằm trong nhóm yếu nhất. "thong dong" vốn không có (0).
- **Lời nguyện:** "mỗi ngày" 12 → 2 · "biết ơn" 11 → 1 · "cảm ơn" 10 → 5 · "con biết" 14 → 3 · "bình an" 3 → 1 · "an yên" 1 → 0. Câu mở đầu "Con mong" 85 → 80, "Xin cho" 42 → 37, "Con nguyện" 122 → 129.

Cặp còn > 0.3 (từ đơn) là những cặp khác ý nhau, chỉ trùng từ, nên giữ nguyên. Thông điệp: 46/234, 110/251. Lời nguyện: 52/287, 44/191, 10/166, 61/253.

## Ví dụ
| id | Cũ | Mới |
|---|---|---|
| TĐ 2 | Thử viết ra ba điều bạn biết ơn trong năm qua. Những điều nhỏ cũng đáng được ghi nhớ. | Tờ lịch mới còn thẳng nếp. Lấy bút khoanh một ngày trong tháng này, hẹn với mình sẽ thử một việc chưa từng làm. |
| TĐ 74 | Ai cũng cần được lắng nghe. Hãy hỏi một người "Dạo này bạn thế nào?" và thật sự chờ nghe. | Hỏi tên bác bảo vệ hay cô lao công, rồi sáng mai chào bằng đúng tên ấy. Được gọi tên là cảm giác được nhìn thấy. |
| TĐ 175 | Trong mỗi người đều có hạt giống hiền lành. Hôm nay hãy tưới hạt giống ấy bằng một việc làm tốt. | Đặt một chai nước mát trước cổng cho người giao hàng giữa trưa nắng. Việc nhỏ thôi, nhưng người nhận sẽ nhớ cả ngày. |
| TĐ 280 | Cảm ơn người đã nấu ăn cho bạn hôm nay, dù đó là cha mẹ, vợ chồng hay cô bán quán đầu ngõ. | Trả lại hộp đựng thức ăn cho hàng xóm, đừng để trống: bỏ vào vài quả ổi hay một nắm lạc rang. Tình làng xóm đi bằng những chiếc hộp như thế. |
| TĐ 294 | Lắng nghe trọn vẹn nghĩa là không vừa nghe vừa nghĩ cách đáp. Hôm nay thử nghe như vậy. | Khi người khác vừa nói xong, đếm thầm đến ba rồi mới đáp. Khoảng lặng ngắn ấy thường kéo ra câu quan trọng nhất họ muốn nói. |
| LN 248 | Con biết ơn những bác sĩ đã cứu sống bố con. | Các bác sĩ đã cứu bố con, con nguyện đi hiến máu đều đặn để tiếp nối điều tốt ấy. |
| LN 252 | Con biết ơn người nông dân làm ra hạt gạo con ăn mỗi ngày. | Nghĩ đến người cấy lúa, con nguyện ăn hết phần cơm mình xới, không bỏ thừa hạt nào. |
| LN 238 | Xin cho mỗi người bước qua cổng chùa đều mang về chút an yên. | Con nguyện giữ lời nói ôn hòa, để ai đi cạnh con cũng thấy dễ chịu hơn một chút. |
| LN 43 | Xin cho con giữ được bình tĩnh trong buổi phỏng vấn sắp tới. | Trước buổi phỏng vấn, con nguyện chuẩn bị kỹ, tập trả lời thành tiếng và đến sớm mười lăm phút. |
| LN 300 | Con nguyện mỗi ngày làm một việc tốt nhỏ cho người lạ. | Con nguyện học vài câu chào bằng tiếng mẹ đẻ của những người lao động nước ngoài sống quanh con. |

## Kiểm tra chéo
- So từng câu mới với mọi chuỗi trong `content/mua/*.json` (gồm cả `thanh-dao.json`, `doan-ngo.json` mới thêm) và `content/thong-bao-day.json` (Jaccard từ+bigram). Không câu nào vượt 0.2. Bản nháp LN 219 từng giống một lời nguyện Vu Lan ở mức 0.28 ("ngủ sớm, ăn đúng bữa để cha mẹ bớt lo") nên đã được viết lại.
- Toàn bộ là câu tự sáng tác. Không trích danh ngôn, kinh, thơ hay bài hát. Không nhắc cúng dường, không hứa linh ứng, không hù dọa.

## Gợi ý lần sau
- Thông điệp: "nhẹ nhàng" (11) và "tử tế" (11) vẫn khá dày. Có thể thay ở các câu không bị trích.
- Lời nguyện: khuôn "Con mong mình…" (32) và "Xin cho con…" (14) vẫn nhiều.
