# DECISIONS – Chùa An Nhiên (nội dung & marketing)

Nhật ký các quyết định biên tập được đưa ra tự chủ (không hỏi lại chủ dự án). Mục nào cần nhóm dev/pháp lý xác nhận được đánh dấu **[CẦN XÁC NHẬN]**.

## Chung
- D1. Phạm vi: chỉ ghi vào `content/`, `site/`, `store/`, `.github/workflows/content-*.yml`.
- D2. Tất cả văn bản tự sáng tác. Không trích kinh/thơ/lời bài hát có bản quyền. Nếu cần câu cổ thuộc phạm vi công cộng thì ghi nguồn ngay cạnh.
- D3. Chùa trong game là chùa hư cấu "Chùa An Nhiên". Không nêu tên chùa thật, không nhắc cúng dường tiền, không hứa linh ứng.
- D4. Mọi quẻ có trường `ghiChu` cố định: "Quẻ mang tính chiêm nghiệm, giúp bạn soi lại lòng mình; không phải lời tiên đoán." (được thêm tự động khi gộp).
- D5. Bảng chữ: tiếng Việt Unicode dựng sẵn (NFC). Dấu thanh đặt theo kiểu mới hay cũ đều được, nhưng trong một file phải nhất quán (ưu tiên kiểu cũ phổ biến: "hoà/hòa" → dùng **"hòa"**, "thuỷ/thủy" → **"thủy"**).
- D6. Mã chủ đề dùng chung: `gia-dao`, `cong-viec`, `suc-khoe`, `hoc-hanh`, `tinh-duyen`, `tai-loc`.

## Quẻ xăm (`content/que-xam.json`)
- D7. `id`: số nguyên 1–100. `tieuDe`: "Quẻ <số> – <tên quẻ>" không dùng; chỉ lưu tên quẻ (≤ 40 ký tự), app tự ghép số.
- D8. `tho`: mảng 4 chuỗi (6-8-6-8). Kiểm bằng `content/tools/lucbat.mjs`: đếm tiếng, luật bằng–trắc tiếng 2-4-6(-8), vần (6↔6, 8↔6, 6↔6). Vần chính bắt buộc; vần thông (a/ă/â, o/ô/ơ, e/ê) chấp nhận nhưng cảnh báo.
- D9. Không xếp quẻ "hung/cát", không "Thượng/Hạ". Quẻ nào cũng có hướng đi tích cực.
- D10. Độ dài: `loiGiai` 120–600 ký tự; mỗi mục `loiGiaiTheoChuDe` 50–300; `loiKhuyen` 30–220. `chuDe`: 1–3 mã chủ đề (chủ đề quẻ "nói nhiều nhất").
- D11. Viết song song 4 lô × 25 quẻ vào `content/_parts/`, sau đó gộp bằng `content/tools/merge.mjs`. Bản EN viết cùng lúc vào `content/_parts/en-*`.

## Định dạng file khác
- D12. `su-kien-am-lich.json`: `thang` = 1–12, hoặc `null` nghĩa là lặp lại hằng tháng (mùng 1, rằm). `trangTri`, `nhiemVu` là mảng chuỗi để app hiển thị danh sách. Thêm `id` (slug) và `loai` (`phat-giao` | `dan-gian`).
- D13. Ngày âm lịch 30 (vd Trừ tịch 30/12) có thể không tồn tại ở tháng thiếu → app tự lùi về ngày cuối tháng; ghi trong `moTa`/`ghiChu`.
- D14. `thong-diep-ngay.json`: `id` 1–366 (ngày thứ n trong năm dương lịch), ≤ 160 ký tự.
- D15. `loi-nguyen-mau.json`: ≤ 120 ký tự; `chuDe` dùng 6 mã chủ đề + `binh-an`, `bien-on` (biết ơn), `cau-sieu` (tưởng nhớ người đã khuất – lời lẽ nhẹ nhàng, không hứa siêu thoát), `the-gioi` (cho muôn loài/thế giới). Thêm `id`.
- D16. Bản tiếng Anh: `content/i18n/en/<cùng tên file>.json`, cùng `id`, cùng cấu trúc; thơ EN là 4 dòng có vần tự do (không ép lục bát).

## Pháp lý / cửa hàng [CẦN XÁC NHẬN]
- D17. Giả định dữ liệu: deviceId ẩn danh (do app sinh, không phải IMEI/quảng cáo ID), nickname tự đặt, lời nguyện (có thể hiển thị công khai ẩn danh trên "Cây nguyện"). Không quảng cáo, không mua trong app ở bản 1.0, không bán/chia sẻ dữ liệu cho bên thứ ba, có thể dùng nhà cung cấp hạ tầng đám mây làm bên xử lý dữ liệu.
- D18. Email liên hệ giữ chỗ: `hotro@chuaannhien.example` (tên miền .example dành riêng) — thay bằng email thật trước khi nộp store.
- D19. Xóa dữ liệu: trong app (Cài đặt → Xóa dữ liệu của tôi) xóa ngay; hoặc gửi email kèm mã thiết bị hiển thị trong Cài đặt, xử lý trong tối đa 30 ngày. Trang web xóa dữ liệu: `site/support.html#xoa-du-lieu` (Google Play yêu cầu URL).
- D20. Độ tuổi: nội dung tôn giáo nhẹ, không bạo lực; có nội dung người dùng tạo (lời nguyện) được lọc tự động + báo cáo → IARC có "Users Interact"; App Store: xem D22 (13+, thay cho 12+ đề xuất ban đầu) — xem `store/`.

## Store & ra mắt
- D21. Danh mục cửa hàng: Lifestyle (không xếp "Game") để phản ánh tính chất chiêm nghiệm.
- D22. Độ tuổi App Store: 13+ (hệ xếp hạng mới của Apple không còn 12+; nếu App Store Connect còn hệ cũ thì chọn 12+). Google Play: IARC 3/PEGI 3 + "Users Interact".
- D23. Lịch ra mắt: phát hành 1.0 vào mùng 1 tháng Chạp (thứ Sáu 08/01/2027), bản 1.1 Tết vào Rằm tháng Chạp (22/01/2027); Tết Đinh Mùi = thứ Bảy 06/02/2027 (Giao thừa tối 05/02 vì tháng Chạp Bính Ngọ chỉ 29 ngày). Dự phòng: lùi toàn bộ 14 ngày.
- D24. Không dùng chữ Vạn (卍) trong đồ họa/ảnh store để tránh hiểu nhầm ở thị trường quốc tế (khuyến nghị cho đội thiết kế).
- D25. Ảnh chụp màn hình không chứa chữ "Miễn phí/Không quảng cáo" (chính sách đồ họa Google Play).

## Bộ lọc từ
- D26. `mucDo`: 1 = che `***`, 2 = chặn gửi, 3 = chặn + ghi nhận để kiểm duyệt. Từ nhạy cảm nhưng có thể xuất hiện trong lời nguyện thiện (ma túy, tự tử…) để mức 1, kèm allowlist ("cai nghiện ma túy", "bỏ cờ bạc"…).
- D27. Dạng không dấu dễ trùng từ vô hại (lon, cac, buoi, deo, dit…) để trong `bienTheLach`: chỉ bắt khi có dấu hiệu lách (l0n, c.a.c). Không ánh xạ chữ→chữ (z→d) để tránh sai tên riêng/tiếng Anh.
- D28. Nhóm `chinh-tri-cuc-doan` cần đội kiểm duyệt duyệt lại **[CẦN XÁC NHẬN]**.
- D29. Thơ quẻ: không đặt dấu câu ở cuối dòng (dấu phẩy giữa dòng giữ nguyên); `merge.mjs` tự chuẩn hóa. Viết hoa danh xưng tôn giáo: "Tịnh Độ", "Niết Bàn", "Tây Phương Cực Lạc".

## Bộ mùa & tham chiếu chéo
- D30. Khi nhiều bộ mùa cùng hiệu lực (vd Tết 23/12→15/1 và Rằm tháng Giêng 13/1→16/1), bộ có khoảng ngày NGẮN hơn được ưu tiên hiển thị (lời chào, thông điệp, quẻ đặc biệt); nhiệm vụ của cả hai bộ đều mở.
- D31. Site/store dẫn quẻ thật: quẻ 53 "Sen hồng giữa đầm" (landing, ảnh 4), quẻ 82 "Con đường qua đồi" (video 2). Nếu sửa 2 quẻ này phải cập nhật `site/index.html`, `site/en/index.html`, `store/video-scripts.md`, `store/screenshots.md`.
- D32. Biệt danh là tùy chọn; không đặt thì hiển thị "Một người viết" / "Someone". App không có tài khoản → vi phạm dẫn tới "hạn chế thiết bị" thay vì "khóa tài khoản".
