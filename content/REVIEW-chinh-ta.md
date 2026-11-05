# Rà soát chính tả & văn phong (tiếng Việt)

Phạm vi: `thong-diep-ngay.json`, `loi-nguyen-mau.json`, `su-kien-am-lich.json`, `_parts/que-xam-02.json`, `_parts/que-xam-03.json`, `_parts/que-xam-04.json`. Không đụng `_parts/que-xam-01.json`.

## Cách rà
- Quét tự động: Unicode NFC, dấu thanh kiểu mới (oà/oá/oả/oẹ/uỳ/uý/uỷ…), khoảng trắng kép, khoảng trắng trước dấu câu, thiếu khoảng trắng sau dấu câu, dấu câu lặp, từ lặp, chữ thường đầu câu, i/y (kỹ/lý/quý/hy…), ngh/ng, gh/g, c/k, các từ nhạy cảm (linh ứng, phù hộ, cúng dường, giải hạn, xui, hung/cát…).
- Đọc lại toàn bộ từng câu.

## Kết quả quét tự động
- Không có lỗi NFC, khoảng trắng kép, dấu câu lặp hay sai vị trí.
- Dấu thanh đã thống nhất kiểu cũ ở cả 6 file (hòa, khỏe, thủy, tỏa, lũy, xóa…). Không còn dạng "hoà/khoẻ/thuỷ/loà".
- i/y thống nhất (kỹ, lý, quý, hy sinh, hy vọng, kỷ niệm).
- Không có nội dung mê tín, hứa linh ứng, hù dọa hay nhắc tiền cúng dường. Chữ "tiền" chỉ xuất hiện ở lời khuyên quản lý chi tiêu, không liên quan cúng dường. Chữ "cúng" chỉ có ở "mâm cúng" (Ông Công Ông Táo, tín ngưỡng dân gian) và "ấm cúng".
- Dấu "..." ở thông điệp 167 và 363 là dấu chấm lửng có chủ ý, giữ nguyên.

## Thay đổi (8 chỗ)

| File | id | Trước | Sau | Lý do |
|---|---|---|---|---|
| thong-diep-ngay.json | 308 | Nửa ngày chưa vui chưa có nghĩa cả ngày sẽ tệ. | Nửa ngày chưa vui không có nghĩa là cả ngày sẽ tệ. | Ngữ pháp: "chưa" lặp, thiếu "là" |
| thong-diep-ngay.json | 254 | …tặng trẻ em khó khăn. | …tặng trẻ em có hoàn cảnh khó khăn. | Dùng từ: "trẻ em khó khăn" là cách nói tắt, cách nói chuẩn là "có hoàn cảnh khó khăn" |
| loi-nguyen-mau.json | 5 | Con là người làm xa, … | Con là người đi làm xa, … | Thiếu từ: "người làm xa" → "người đi làm xa" |
| loi-nguyen-mau.json | 162 | Con mong hai đứa con biết bất đồng… | Con mong hai đứa chúng con biết bất đồng… | Tối nghĩa: "hai đứa con" dễ hiểu là hai người con (chủ đề tình duyên) |
| su-kien-am-lich.json | phat-nhap-niet-ban (moTa) | Lời nhắc cuối cùng của Ngài thường được nhắc lại… | Lời dạy cuối cùng của Ngài thường được nhắc lại… | Lặp từ "nhắc… nhắc lại" |
| su-kien-am-lich.json | tet-han-thuc (moTa) | Những viên bánh tròn trắng cũng là dịp quây quần… | Làm những viên bánh tròn trắng cũng là dịp quây quần… | Sai logic câu: "viên bánh" không phải là "dịp" |
| su-kien-am-lich.json | via-quan-the-am-dan-sanh (trangTri[0]) | Tượng Quán Âm cầm bình nước cành dương liễu | Tượng Quán Âm cầm bình nước và cành dương liễu | Thiếu liên từ, đọc tối nghĩa |
| _parts/que-xam-02.json | 31 (loiGiai) | Giữ chí bền như son, rồi… | Giữ chí son sắt, rồi… | Thành ngữ đúng là "son sắt" (khớp với "sắt son" trong thơ) |

Không sửa trường `tho` nào. Đã chạy `node content/tools/lucbat.mjs` cho que-xam-02/03/04: mỗi file 25 quẻ, 0 lỗi luật, 0 cảnh báo.

## Kiểm tra sau khi sửa
- Số phần tử, `id` và cấu trúc giữ nguyên. Thông điệp dài nhất 110 ký tự (giới hạn 160), lời nguyện dài nhất 75 ký tự (giới hạn 120).
- `node content/validate.mjs`: chỉ còn 2 lỗi có từ trước ("que-xam.json không tồn tại", "i18n/en/que-xam.json không tồn tại"), không có lỗi mới.

## Ghi chú (không sửa, để nhóm nội dung cân nhắc)
- Dấu câu cuối dòng thơ không thống nhất giữa các lô: que-xam-03 có dấu phẩy/chấm ở cuối dòng, que-xam-02 và 04 thì không. Trong mỗi file đã nhất quán. Nên thống nhất khi gộp.
- `su-kien-am-lich.json` dùng "Tịnh độ" (viết thường chữ "độ") nhưng lại viết hoa "Niết Bàn", "Tây Phương Cực Lạc". Có thể thống nhất là "Tịnh Độ".
- `tet-trung-thu.trangTri[3]` "Đầu sư tử múa lân" vẫn dùng được, nhưng "Đầu lân" thông dụng hơn.
