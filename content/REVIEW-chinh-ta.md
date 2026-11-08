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

## Phiên 2026-11-07

Phạm vi: phần tiếng Việt của `mua/tet.json`, `mua/vu-lan.json`, `mua/ram-thang-gieng.json`, `mua/phat-dan.json`, `mua/trung-thu.json`, `giao-dien.json`, `thong-bao-day.json`. Đối chiếu trùng lặp với `thong-diep-ngay.json` (không sửa file này).

### Cách rà
- Quét tự động (node): NFC, dấu thanh kiểu mới (oà/oá/oẻ/uỷ…), khoảng trắng kép/thừa, khoảng trắng trước dấu câu, thiếu khoảng trắng sau dấu câu, dấu câu lặp, từ lặp liền nhau, chữ thường đầu câu, i/y, viết hoa danh xưng (D29), từ nhạy cảm (linh ứng, phù hộ, cúng dường, giải hạn, tiền, may mắn, quả báo…). Lập danh sách các âm tiết hiếm để soát chính tả (ch/tr, s/x, d/gi/r, l/n, hỏi/ngã).
- So sánh trùng lặp: tách câu, chuẩn hóa (NFC, chữ thường, bỏ dấu câu), tính hệ số Dice theo cặp từ (bigram) giữa mọi câu của 5 bộ mùa (lời chào, thông điệp, lời nguyện, mô tả nhiệm vụ, lời giải/lời khuyên quẻ) và với 366 thông điệp ngày. Xem tay các cặp từ 0,40 trở lên.
- Đọc lại toàn bộ từng câu.

### Kết quả quét
- Không có lỗi NFC, khoảng trắng kép, dấu câu sai, dấu thanh kiểu mới, lỗi i/y hay lỗi chính tả phụ âm/hỏi-ngã ở cả 7 file.
- Không có nội dung mê tín, hứa linh ứng, hù dọa hay nhắc tiền cúng dường ("lễ vật" ở ram-thang-gieng thongDiep#16 chỉ để khuyên mang theo lòng nhẹ thay vì nhiều lễ vật; giữ nguyên).
- Danh xưng tôn giáo đã viết hoa đúng (Niết Bàn, Bồ Tát, Phật Đản, Quán Thế Âm…).
- Không sửa trường `tho` nào nên không cần chạy `lucbat.mjs`.

### Thay đổi (34 chỗ)

| File | Mục | Trước | Sau | Lý do | Sửa EN |
|---|---|---|---|---|---|
| mua/tet.json | loiChao 7 | Năm cũ sắp khép lại. Cảm ơn bạn đã đi cùng mình đến tận hôm nay. | Năm cũ chỉ còn vài ngày nữa. Cảm ơn bạn đã đi cùng mình đến tận hôm nay. | Na ná tdn#365 ("Một năm sắp khép lại") | Có |
| mua/tet.json | thongDiep 6 | Năm cũ có chỗ vụng về, có chỗ vấp ngã. Bạn vẫn ở đây, thế là đã đáng khen rồi. | Năm cũ có chỗ vụng về, có chỗ vấp ngã. Đi được đến cuối năm, bạn đã đáng được khen rồi. | Na ná tdn#300 ("Bạn vẫn ở đây…") | Có |
| mua/tet.json | thongDiep 19 | Hoa đào nở rồi sẽ rụng, mai vàng nở rồi sẽ tàn. Biết vậy để quý ngày xuân đang có. | Chậu đào chỉ thắm vài tuần đầu năm. Vì ngắn ngủi nên mỗi ngày xuân càng đáng ngắm cho trọn. | Trùng ý và hình ảnh với tdn#44 (hoa đào, hoa mai nở rồi sẽ rụng) | Có |
| mua/tet.json | loiNguyen 17 | Con mong người neo đơn trong dịp Tết có ai đó ghé thăm, hỏi han. | Con mong ai phải đón Tết một mình cũng nhận được một lời chúc ấm lòng. | Na ná vu-lan loiNguyen#20 và ram-thang-gieng loiNguyen#24 (người neo đơn có ai ghé thăm) | Có |
| mua/tet.json | loiNguyen 27 | Con nguyện dành nhiều thời gian bên cha mẹ hơn là bên chiếc điện thoại. | Con nguyện những ngày Tết ở bên cha mẹ thật trọn vẹn, cùng nấu ăn và trò chuyện. | Na ná ram-thang-gieng loiNguyen#28 (thời gian cho người thân hơn màn hình) và vu-lan loiNguyen#6 | Có |
| mua/tet.json | nhiemVu loi-cam-on-nam-cu (moTa) | Viết ba điều bạn biết ơn trong năm qua và treo lên Cây nguyện. | Ghi lại ba điều khiến bạn biết ơn trong năm cũ và treo lên Cây nguyện. | Gần trùng câu tdn#2 ("viết ra ba điều bạn biết ơn trong năm qua") | Không |
| mua/vu-lan.json | thongDiep 4 | Nếu cha mẹ đã đi xa, hãy sống tử tế như cách họ từng mong. Đó là bông hồng bền lâu nhất. | Nếu cha mẹ đã đi xa, hãy giữ lấy một điều tốt họ từng dạy và làm theo mỗi ngày. Đó là bông hồng bền lâu nhất. | Trùng ý tdn#230 (cha mẹ đã khuất → sống tử tế) | Có |
| mua/vu-lan.json | thongDiep 14 | Xin lỗi cha mẹ về một lần nói nặng lời. Lời xin lỗi muộn vẫn ấm hơn sự im lặng. | Xin lỗi cha mẹ về một lần lỡ nói nặng lời. Cha mẹ thường đã tha thứ từ lâu, chỉ chờ con mở lời. | Na ná tdn#205 (lời xin lỗi muộn…); bỏ lặp "lời… lời" | Có |
| mua/vu-lan.json | thongDiep 18 | Việc thiện không cần lớn: nhường một chỗ ngồi, chia một bữa cơm, hỏi han một người cô đơn. | Việc lành mùa Vu Lan có thể rất nhỏ: rót một chén nước, chia một bữa cơm, hỏi han một người cô đơn. | Trùng mở câu với phat-dan thongDiep#28 ("Việc thiện không cần lớn"), trùng "nhường một chỗ ngồi" với phat-dan thongDiep#2 | Có |
| mua/vu-lan.json | thongDiep 28 | Cha mẹ già đi từng ngày mà mình ít nhận ra. Hôm nay hãy nhìn kỹ đôi bàn tay ấy một lần. | Tóc cha mẹ bạc thêm từng ngày mà mình ít nhận ra. Hôm nay hãy nhìn kỹ đôi bàn tay của họ một lần. | Trùng câu mở với tdn#102 ("Cha mẹ già đi từng ngày") | Có |
| mua/vu-lan.json | loiNguyen 11 | Con nguyện làm một việc thiện nhỏ mỗi ngày trong mùa Vu Lan. | Con nguyện làm việc lành trong mùa Vu Lan như một cách nói lời cảm ơn cha mẹ. | Na ná phat-dan loiNguyen#1 (một việc thiện nhỏ mỗi ngày) | Có |
| mua/vu-lan.json | loiNguyen 16 | Con mong anh chị em trong nhà luôn thương nhau để cha mẹ được vui. | Con mong anh chị em con biết nhường nhịn nhau, để cha mẹ không phải buồn lòng. | Na ná tet loiNguyen#19, trung-thu loiNguyen#25 và trùng ý thongDiep#24 cùng file | Có |
| mua/vu-lan.json | loiNguyen 20 | Con mong những người già neo đơn có ai đó ghé thăm trong mùa Vu Lan này. | Con mong các cụ già sống một mình được con cháu, xóm giềng hỏi han trong mùa Vu Lan này. | Na ná tet loiNguyen#17, ram-thang-gieng loiNguyen#24 | Có |
| mua/vu-lan.json | loiNguyen 21 | Con nguyện chăm sóc sức khỏe của mình, vì đó là cách để cha mẹ bớt lo. | Con nguyện ngủ sớm, ăn uống đúng bữa để cha mẹ ở xa bớt lo cho con. | Trùng mở câu tet loiNguyen#20 ("Con nguyện chăm sóc sức khỏe của mình") | Có |
| mua/ram-thang-gieng.json | loiChao 4 | Nửa tháng Giêng đã qua. Bạn có muốn ngồi lại nhìn một chút không? | Tháng Giêng đã đi được một nửa. Bạn có muốn ngồi lại nhìn một chút không? | Trùng ý gần nguyên văn thongDiep#5 cùng file ("Nửa tháng… đã qua") | Không |
| mua/ram-thang-gieng.json | thongDiep 10 | Đêm rằm tháng Giêng, hãy rót một chén trà cho người bên cạnh trước khi rót cho mình. | Đêm Rằm tháng Giêng, hãy rót một chén trà cho người bên cạnh trước khi rót cho mình. | Viết hoa "Rằm tháng Giêng" (tên lễ) cho nhất quán với tên mùa và bộ Tết | Không |
| mua/ram-thang-gieng.json | thongDiep 22 | Hãy viết điều mong ước lên giấy rồi đọc lại vào rằm tháng Giêng năm sau. Bạn sẽ thấy mình lớn lên. | Hãy viết điều mong ước lên giấy rồi đọc lại vào Rằm tháng Giêng năm sau. Bạn sẽ thấy mình lớn lên. | Như trên | Không |
| mua/phat-dan.json | loiChao 8 | Bếp chùa đang nấu một nồi canh chay. Mời bạn ghé dùng bữa cùng. | Mùi canh chay thơm từ gian bếp chùa. Bạn ghé ngồi ăn cùng mọi người nhé. | Na ná vu-lan loiChao#8 (bếp chùa nấu chay, mời ghé dùng bữa) | Có |
| mua/phat-dan.json | loiChao 12 | Sen nở từ bùn mà vẫn thơm. Chúc bạn một ngày dịu dàng với chính mình. | Sen nở từ bùn mà vẫn thơm. Mong hôm nay bạn cũng hiền với chính mình. | Na ná vu-lan loiChao#7 ("chúc bạn một ngày dịu dàng với…") | Không |
| mua/phat-dan.json | thongDiep 12 | Bạn không cần hoàn hảo mới bắt đầu tu tập. Chỉ cần hôm nay hiền hơn hôm qua một chút. | Bạn không cần hoàn hảo mới bắt đầu tu tập. Mỗi ngày bớt đi một chút nóng nảy là đã đang tập rồi. | Na ná tet thongDiep#11 ("hiền hơn hôm qua một chút") | Có |
| mua/phat-dan.json | thongDiep 21 | Hôm nay hãy cho một con vật nhỏ ăn, tưới một cái cây, hoặc nhặt một mẩu rác bên đường. | Hôm nay hãy để ý đến những sinh linh nhỏ quanh mình: tưới chậu cây khô, rắc ít gạo cho chim sẻ, nhặt một mẩu rác bên đường. | Gần trùng nguyên văn nhiệm vụ cham-sinh-vat cùng file | Có |
| mua/phat-dan.json | thongDiep 28 | Việc thiện không cần lớn. Một nụ cười với người bán hàng mệt mỏi cũng làm ngày của họ khác đi. | Đôi khi một nụ cười với người bán hàng đang mệt cũng đủ làm ngày của họ khác đi. | Trùng mở câu với vu-lan thongDiep#18 | Có |
| mua/phat-dan.json | loiNguyen 3 | Con nguyện ăn chay một ngày trong tuần để tập sống nhẹ nhàng với muôn loài. | Con nguyện ăn chay trọn ngày Rằm tháng Tư để tập sống nhẹ nhàng với muôn loài. | Na ná vu-lan loiNguyen#7 (ăn chay một ngày trong tuần) | Có |
| mua/phat-dan.json | loiNguyen 7 | Con nguyện lắng nghe cha mẹ nhiều hơn, kể cả khi con nghĩ mình đã biết. | Con nguyện nghe cho trọn lời người khác, kể cả khi con nghĩ mình đã biết. | Na ná vu-lan loiNguyen#17 (lắng nghe cha mẹ nhiều hơn) | Có |
| mua/phat-dan.json | loiNguyen 27 | Con nguyện ăn uống vừa đủ, không bỏ phí thức ăn. | Con nguyện ăn uống vừa đủ, biết dừng lại khi đã no. | Na ná trung-thu loiNguyen#6 (không bỏ phí thức ăn) | Có |
| mua/phat-dan.json | nhiemVu thap-den-hoa-sen (moTa) | Chọn màu và thắp một chiếc đèn hoa sen ảo dọc lối đi, gửi kèm một lời chúc an vui. | Thắp một chiếc đèn hoa sen ảo theo màu bạn thích và treo dọc lối đi, gửi kèm một lời chúc an vui. | Gần trùng nguyên văn ram-thang-gieng nhiemVu thap-den-long ("Chọn màu và thắp một chiếc đèn… ảo dọc lối…") | Có |
| mua/trung-thu.json | loiChao 1 | Trăng thu đã lên trên tháp chuông. Mời bạn vào sân chùa ngắm cùng. | Trăng thu đã lên trên tháp chuông. Sân chùa còn một chỗ ngồi cho bạn. | Na ná ram-thang-gieng loiChao#1 ("Mời bạn vào sân chùa ngắm cùng") | Có |
| mua/trung-thu.json | loiChao 11 | Trăng rằm tháng Tám sáng lắm. Cảm ơn bạn đã ghé chùa mùa này. | Trăng Rằm tháng Tám sáng lắm. Bạn ở lại thêm một chút rồi hẵng về nhé. | Na ná ram-thang-gieng loiChao#12 ("Cảm ơn bạn đã ghé chùa…"); viết hoa "Rằm tháng Tám" | Có |
| mua/trung-thu.json | thongDiep 1 | Trăng rằm tháng Tám tròn nhất năm, nhưng điều làm Trung Thu trọn vẹn là có người ngồi bên cạnh. | Trăng Rằm tháng Tám tròn nhất năm, nhưng điều làm Trung Thu trọn vẹn là có người ngồi bên cạnh. | Viết hoa "Rằm tháng Tám" (tên lễ) cho nhất quán với các bộ khác | Không |
| mua/trung-thu.json | thongDiep 5 | Có người không về kịp đêm rằm. Một cuộc gọi có hình cũng là cùng nhau ngắm một vầng trăng. | Người thân ở xa chưa về được đêm rằm? Một cuộc gọi có hình cũng đủ để cùng nhau ngắm một vầng trăng. | Na ná tet thongDiep#12 ("Có người không về kịp…") | Có |
| mua/trung-thu.json | loiNguyen 25 | Con mong anh chị em trong nhà luôn có dịp quây quần như đêm trăng này. | Con mong mùa trăng nào anh chị em con cũng có dịp quây quần như đêm nay. | Na ná tet loiNguyen#19, vu-lan loiNguyen#16 ("Con mong anh chị em trong nhà…") | Có |
| mua/trung-thu.json | nhiemVu goi-ve-sum-vay (moTa) | Gọi điện hoặc gọi có hình cho người thân ở xa trong những ngày rằm tháng Tám. | Gọi điện hoặc gọi có hình cho người thân ở xa trong những ngày Rằm tháng Tám. | Viết hoa "Rằm tháng Tám" | Không |
| mua/ram-thang-gieng.json | queDacBiet trang-ram-thong-tha (loiGiai) | …vầng trăng rằm tháng Giêng… | …vầng trăng Rằm tháng Giêng… | Như trên | Không |
| giao-dien.json | xin-que.goi-y-moi-ngay | Mỗi ngày nên xin một quẻ, để có thời gian ngẫm lại. | Mỗi ngày chỉ nên xin một quẻ, để có thời gian ngẫm lại. | Tối nghĩa: câu cũ đọc như lời giục xin quẻ hằng ngày; ý đúng (khớp bản EN "One verse a day is plenty") là giới hạn một quẻ/ngày | Không (EN đã đúng ý) |

Bản EN tương ứng (`i18n/en/mua/*.json`) được cập nhật cho các câu đổi nghĩa (cột "Sửa EN"), giữ trong giới hạn độ dài (lời chào ≤ 80 ký tự).

### Kiểm tra sau khi sửa
- `id`, số phần tử và cấu trúc giữ nguyên; định dạng file giữ nguyên (thay chuỗi tại chỗ).
- Chạy lại so sánh: không còn cặp câu nào trùng ý rõ ràng từ 0,5 trở lên ngoài các cụm ngắn mang tính khung câu ("Mời bạn…", "Quẻ này nói về…") hoặc lặp có chủ ý trong cùng bộ (lời chào ↔ thông điệp "Tháng Bảy mưa ngâu").
- `node content/validate.mjs`: 0 lỗi, 0 cảnh báo.

### Ghi chú (không sửa)
- tet nhiemVu, phat-dan/trung-thu loiChao#2 và tet loiChao#2 cùng khung "Chùa An Nhiên chúc bạn một mùa…": khung lời chào chung, giữ.
- `thong-bao-day.json` dùng "ba mẹ", các bộ mùa dùng "cha mẹ": cả hai đều đúng, giữ theo giọng từng file.
- giao-dien `chan.nut` dùng "Ẩn lời nguyện từ người này" nhưng các khóa khác dùng "chặn/bỏ chặn": nên thống nhất thuật ngữ khi dev chốt tính năng.

## Phiên 2026-11-08

Phạm vi: phần tiếng Việt của `_parts/que-xam-01.json` (quẻ 1–25: tieuDe, tho, loiGiai, loiGiaiTheoChuDe, loiKhuyen), `mua/thanh-dao.json`, `mua/doan-ngo.json`. Bản EN cùng id được cập nhật khi câu đổi nghĩa (`_parts/en-que-xam-01.json`, `i18n/en/mua/doan-ngo.json`).

### Cách rà
- Quét tự động (node): NFC, dấu thanh kiểu mới ở cuối âm tiết (oà/oá/uỷ…), i/y, khoảng trắng kép/trước dấu câu, từ lặp liền nhau, từ nhạy cảm (linh ứng, phù hộ, cúng dường, giải hạn, tiền, hung/cát…); đếm cụm 2–4 từ lặp trong lời giải lô 01 và so với lô 02–04.
- Đối chiếu lời giải của các quẻ có thơ đã biên tập lại (2, 3, 4, 5, 13, 19, 23, 24, 25 – xem `REVIEW-tho.md`) với bài thơ mới.
- Đọc lại toàn bộ từng câu.

### Kết quả quét
- Không có lỗi NFC, dấu thanh kiểu mới, i/y, khoảng trắng hay dấu câu; không thấy lỗi ch/tr, s/x, d/gi/r, l/n, hỏi/ngã.
- Không có nội dung mê tín, hứa linh ứng, hù dọa hay nhắc tiền cúng dường. Mục `tai-loc` đều khuyên làm ăn lương thiện, tránh cờ bạc/đầu tư mạo hiểm.
- Cụm khung "Đây là quẻ nói nhiều về …" xuất hiện 18 lần trong lô 01 (lô 02–04: 0 lần) → bỏ ở 12 mục, còn 6 (mỗi chủ đề một lần: quẻ 2, 4, 7, 9, 10, 15). "nhẹ nhàng" 14 → 9, "đều đặn" 18 → 14, "vững vàng" 5 → 2.
- Quẻ 2, 3, 19: lời giải vẫn khớp thơ mới, không sửa vì lý do này.
- Không sửa trường `tho` nào.

### Thay đổi (32 chỗ)

| File | Mục | Trước | Sau | Lý do | Sửa EN |
|---|---|---|---|---|---|
| _parts/que-xam-01.json | 4 loiGiai | …duyên lành sẽ tự tìm đến như gió nồm thổi qua sân. | …duyên lành sẽ tự tìm đến như gió ngoài song đến lúc tự lùa vào nhà. | Khớp thơ mới ("như gió ngoài song") | Có |
| _parts/que-xam-01.json | 5 loiGiai | …thành quả sẽ đến vững vàng theo năm tháng. | …đến lúc, thành quả sẽ trổ bông như mầm cây được mưa xuân nuôi lớn. | Khớp thơ mới ("nuôi mầm", "tới tầm trổ bông"); bớt "vững vàng" | Có |
| _parts/que-xam-01.json | 13 loiGiai | Chi tiêu vừa phải, sống giản dị, thì dù bữa cơm chỉ có rau cũng vẫn ấm lòng. Sự chuẩn bị hôm nay giúp bạn vững vàng… | Tiêu pha vừa đủ, sống giản dị, thì mai sau lòng vẫn yên. Sự chuẩn bị hôm nay giúp bạn vững chân… | "cơm rau ấm lòng" là ý thơ cũ; thơ mới "Tiêu pha vừa đủ, mai sau yên lòng"; bớt "vững vàng" | Có |
| _parts/que-xam-01.json | 23 loiGiai | Nếu lòng còn son sắt, chỉ cần biết chờ đợi, thấu hiểu và nhường nhịn nhau đôi chút, tình cảm… | Giận hờn rồi cũng qua như gió thổi qua sông. Nếu lòng vẫn còn đợi trông, chỉ cần thấu hiểu và nhường nhau một bước, tình cảm… | "son sắt", "đôi chút" là ý thơ cũ; khớp thơ mới (gió qua sông, nhường nhau một bước) | Có |
| _parts/que-xam-01.json | 24 loiGiai | Người có mục tiêu rõ ràng, dù đường xa hay gần cũng biết mình đang đi đâu. | Người học có mục tiêu rõ ràng cũng như người lên đường biết nơi mình đến: đường dài mấy cũng không thấy xa. | Khớp thơ mới ("Học hành như kẻ lên đường / Biết nơi mình đến, dặm trường chẳng xa") | Có |
| _parts/que-xam-01.json | 25 loiGiai | Quẻ này khuyên đừng chạy theo những cơn gió nhất thời… | Quẻ này khuyên đừng chạy theo đám đông hay những cơn gió nhất thời… | Khớp thơ mới ("chớ chạy theo nhau") | Có |
| _parts/que-xam-01.json | 25 loiGiai | Vững vàng như thế thì gió đổi chiều cũng chẳng ngại. | Giữ được nhịp ấy thì gió có đổi chiều, thổi mạnh đến đâu cũng chẳng ngại. | Khớp thơ mới ("gió mau chẳng nề"); bớt "vững vàng" | Có |
| _parts/que-xam-01.json | 3 suc-khoe | Lo âu kéo dài ảnh hưởng… Nếu lo âu kéo dài, đừng ngại tìm gặp chuyên gia. | Lo âu lâu ngày ảnh hưởng… Nếu lo âu kéo dài, đừng ngại tìm gặp bác sĩ hoặc chuyên gia tâm lý. | Lặp "lo âu kéo dài" hai câu liền; nói rõ gặp bác sĩ | Có |
| _parts/que-xam-01.json | 16 suc-khoe | …khi thấy cơn giận dâng lên. | …khi thấy cơn giận dâng lên; nếu hay đau đầu, hồi hộp, nên đi khám. | Nhắc huyết áp mà thiếu ý khám bác sĩ khi cần | Có |
| _parts/que-xam-01.json | 17 tai-loc | …sẽ tiết kiệm hơn để đến lúc cần mới mua vội. | …sẽ tiết kiệm hơn là đợi đến lúc cần mới mua vội. | Ngữ pháp: thiếu "là" trong phép so sánh | Không (EN đã đúng ý) |
| _parts/que-xam-01.json | 2 loiGiai | …vận động nhẹ nhàng, lòng vui vẻ. …mới có chỗ dựa vững vàng. | …vận động vừa sức, lòng vui vẻ. …mới có chỗ dựa. | Giảm cụm lặp "nhẹ nhàng", "vững vàng" | Không |
| _parts/que-xam-01.json | 3 loiGiai | …rồi nhẹ nhàng buông bớt phần còn lại. | …rồi buông bớt phần còn lại. | Giảm "nhẹ nhàng" (câu sau đã có "Lòng nhẹ") | Không |
| _parts/que-xam-01.json | 4 cong-viec | Cơ hội có khi đến nhẹ nhàng như gió. | Cơ hội có khi đến khẽ khàng như gió. | Giảm "nhẹ nhàng" | Không |
| _parts/que-xam-01.json | 8 suc-khoe | …đi dạo nhẹ nhàng. …giữ giấc ngủ đều đặn. | …đi dạo thong thả. …giữ giấc ngủ đúng giờ. | Giảm "nhẹ nhàng", "đều đặn" (quẻ 8 có 3 lần "đều đặn") | Không |
| _parts/que-xam-01.json | 8 tinh-duyen | Sự chân thành, đều đặn hỏi han sẽ giúp… | Sự chân thành và những lần hỏi han nhau mỗi ngày sẽ giúp… | Như trên; câu cũ hơi trúc trắc | Không |
| _parts/que-xam-01.json | 5 tinh-duyen | …nhờ sự quan tâm đều đặn, … | …nhờ sự quan tâm bền bỉ, … | Quẻ 5 có 3 lần "đều đặn" | Không |
| _parts/que-xam-01.json | 1 tai-loc | Tiền bạc đến từ công sức đều đặn mỗi ngày. | Tiền bạc đến từ công sức bỏ ra mỗi ngày. | Giảm "đều đặn" (lời giải quẻ 1 đã có) | Không |
| _parts/que-xam-01.json | 21 suc-khoe | …cùng họ đi bộ nhẹ nhàng mỗi chiều. | …cùng họ đi bộ chậm mỗi chiều. | Giảm "nhẹ nhàng" | Không |
| _parts/que-xam-01.json | 11 suc-khoe | Đây là quẻ nói nhiều về sức khỏe. Uống đủ nước… | Uống đủ nước… | Bỏ câu khung lặp 18 lần (xem trên) | Có (bỏ "This verse speaks mostly of …") |
| _parts/que-xam-01.json | 12 hoc-hanh | Đây là quẻ nói nhiều về học hành. Hãy dọn gọn… | Hãy dọn gọn… | Như trên | Có |
| _parts/que-xam-01.json | 13 tai-loc | Đây là quẻ nói nhiều về tài lộc. Hãy lập… | Hãy lập… | Như trên | Có |
| _parts/que-xam-01.json | 14 tinh-duyen | Đây là quẻ nói nhiều về tình duyên. Tình mới chớm… | Tình mới chớm… | Như trên | Có |
| _parts/que-xam-01.json | 16 gia-dao | Đây là quẻ nói nhiều về gia đạo. Khi nóng giận… | Khi nóng giận… | Như trên | Có |
| _parts/que-xam-01.json | 18 cong-viec | Đây là quẻ nói nhiều về công việc. Khi chưa rõ hướng… | Khi chưa rõ hướng… | Như trên | Có |
| _parts/que-xam-01.json | 19 suc-khoe | Đây là quẻ nói nhiều về sức khỏe. Hãy nghỉ ngơi đủ… | Hãy nghỉ ngơi đủ… | Như trên | Có |
| _parts/que-xam-01.json | 20 hoc-hanh | Đây là quẻ nói nhiều về học hành. Hãy so mình… | Hãy so mình… | Như trên | Có |
| _parts/que-xam-01.json | 21 gia-dao | Đây là quẻ nói nhiều về gia đạo. Hãy sắp xếp… | Hãy sắp xếp… | Như trên | Có |
| _parts/que-xam-01.json | 22 tai-loc | Đây là quẻ nói nhiều về tài lộc. Hãy để dành… | Hãy để dành… | Như trên | Có |
| _parts/que-xam-01.json | 23 tinh-duyen | Đây là quẻ nói nhiều về tình duyên. Đang có khoảng cách… | Đang có khoảng cách… | Như trên | Có |
| _parts/que-xam-01.json | 25 tai-loc | Đây là quẻ nói nhiều về tài lộc. Tránh xa cờ bạc… | Tránh xa cờ bạc… | Như trên | Có |
| mua/thanh-dao.json | queDacBiet duoi-coi-bo-de (loiGiai) | Mùa Thành Đạo là dịp tập sự kiên nhẫn ấy, từng hơi thở một. | Mùa Thành Đạo là dịp để tập kiên nhẫn như thế, từng hơi thở một. | Tối nghĩa: "tập sự" dễ đọc thành từ "tập sự" (học việc) | Không (EN đã đúng ý) |
| mua/doan-ngo.json | thongDiep 14 | Cơ thể luôn lên tiếng trước khi mệt. Hãy lắng nghe những tín hiệu nhỏ như khát, mỏi hay đau đầu. | Cơ thể thường lên tiếng trước khi kiệt sức. Hãy để ý những tín hiệu nhỏ như khát, mỏi, đau đầu; nếu kéo dài, nên đi khám. | "luôn… trước khi mệt" khẳng định quá mức, mâu thuẫn (mỏi đã là mệt); thêm ý khám bác sĩ khi triệu chứng kéo dài | Có |


### Kiểm tra sau khi sửa
- `id`, cấu trúc, `tieuDe`, `tho`, `chuDe` giữ nguyên; độ dài trong giới hạn D10/schema.
- `node content/tools/lucbat.mjs content/_parts/que-xam-01.json`: 25 quẻ, 0 lỗi luật, 0 cảnh báo.
- `node content/tools/merge.mjs && node content/validate.mjs && node content/tools/check-site.mjs`: 0 lỗi, 0 cảnh báo; 13 file site/store, 0 lỗi (lô này không chứa quẻ 53, 82 nên không đụng site/store).

### Ghi chú (không sửa)
- Quẻ 8, thơ câu 2 "Soi chung mọi ngả, chẳng nào riêng ai": "chẳng nào" hơi gượng (chêm cho vần "cao–nào"); ý vẫn hiểu được ("chẳng riêng ai"). Đề nghị nhóm thơ cân nhắc khi rà đợt sau.
- `thanh-dao` loiChao 8 "Chào bạn tháng Chạp." và `doan-ngo` loiChao 4 "Chào bạn giữa năm." dùng cùng khung chào theo thời điểm; giữ theo giọng bộ mùa, có thể thêm dấu phẩy ("Chào bạn, tháng Chạp…") nếu muốn rõ hơn.
- Quẻ 6 hoc-hanh "không định nghĩa bạn" là lối nói vay từ tiếng Anh, vẫn dễ hiểu; giữ.
