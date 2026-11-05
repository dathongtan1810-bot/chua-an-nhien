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
- D20. Độ tuổi: nội dung tôn giáo nhẹ, không bạo lực; có nội dung người dùng tạo (lời nguyện) được lọc tự động + báo cáo → IARC có "Users Interact"; App Store đề xuất 12+ (vì UGC) — xem `store/`.
