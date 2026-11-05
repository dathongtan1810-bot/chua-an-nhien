# App Store – Trang sản phẩm (Tiếng Việt, localization `vi`)

> Đếm ký tự bằng Node (`[...s.normalize('NFC')].length`). Với Keywords ghi thêm số byte UTF-8 để tham khảo: Apple công bố giới hạn 100 **ký tự**, nhưng nếu App Store Connect báo vượt (một số trường hợp tính theo byte với chữ có dấu), dùng **bộ dự phòng không dấu** bên dưới.
> Quy tắc Keywords: phân tách bằng dấu phẩy, không có dấu cách quanh dấu phẩy, không lặp từ đã có trong Name/Subtitle (Apple đã tự index các từ đó), không dùng tên app/thương hiệu khác, không dùng tên chùa thật.

## Name
Giới hạn: 30 · Thực tế: **29** ký tự

```text
Chùa An Nhiên: Đi chùa online
```

## Subtitle
Giới hạn: 30 · Thực tế: **30** ký tự

```text
Thắp hương, gõ mõ, xin quẻ xăm
```

## Promotional Text
Giới hạn: 170 · Thực tế: **148** ký tự

```text
Sắp đến mùng Một, ngày Rằm? Ghé Chùa An Nhiên thắp một nén hương, thỉnh một hồi chuông và đọc thông điệp bình an hôm nay. Miễn phí, không quảng cáo.
```

> Promotional Text có thể đổi bất kỳ lúc nào mà không cần duyệt lại. Mẫu theo mùa:
> - Tết (từ Rằm tháng Chạp): "Sân chùa đã trang hoàng đón Tết Đinh Mùi. Viết lời chúc đầu năm cho người thân và treo lên Cây nguyện. Miễn phí, không quảng cáo." (129 ký tự)
> - Vu Lan (từ mùng 1 tháng Bảy âm lịch): "Mùa Vu Lan, cài một bông hồng ảo và viết đôi dòng cảm ơn cha mẹ. Chùa An Nhiên luôn mở cửa, miễn phí, không quảng cáo." (118 ký tự)
> Kiểm lại số ký tự (≤170) mỗi lần thay.

## Description
Giới hạn: 4000 · Thực tế: **2213** ký tự

```text
Chùa An Nhiên là một ngôi chùa hư cấu nằm gọn trong điện thoại của bạn – một góc nhỏ yên tĩnh để dừng lại vài phút giữa ngày bận rộn. Thắp một nén hương, nghe một hồi chuông, đọc một lời nhắn bình an, rồi tiếp tục ngày của mình với lòng nhẹ nhàng hơn.

THẮP HƯƠNG ẢO
Chạm để thắp nén hương và ngắm làn khói bay chậm lên mái chùa. Không khói thật, không tàn tro – phù hợp cả khi bạn đang ở văn phòng, ký túc xá hay xa quê.

GÕ MÕ, THỈNH CHUÔNG
Gõ mõ theo nhịp đều, thỉnh một tiếng chuông ngân dài. Âm thanh mộc mạc giúp bạn chậm lại, hít thở sâu hơn.

XIN QUẺ XĂM – 100 QUẺ THƠ LỤC BÁT
Lắc ống xăm và nhận một quẻ thơ lục bát sáng tác riêng cho Chùa An Nhiên, kèm lời giải chung, lời giải theo chủ đề (gia đạo, công việc, sức khỏe, học hành, tình duyên, tài lộc) và một lời khuyên nhỏ. Không có quẻ "xấu" để hù dọa. Quẻ mang tính chiêm nghiệm, giúp bạn soi lại lòng mình; không phải lời tiên đoán.

CÂY NGUYỆN
Viết lời nguyện cho bản thân, gia đình hay muôn loài và treo lên Cây nguyện; đọc lời nguyện ẩn danh của người khác. Lời nguyện được lọc từ ngữ tự động. Bạn có thể báo cáo một lời nguyện, hoặc chặn để không còn thấy lời nguyện của người viết đó. Mọi báo cáo đều được xem xét.

THÔNG ĐIỆP BÌNH AN MỖI NGÀY
Mỗi ngày một thông điệp ngắn về lòng biết ơn, sự kiên nhẫn, tình thân và cách đối đãi tử tế với chính mình.

LỊCH LỄ ÂM LỊCH
Mùng Một, ngày Rằm, Tết Nguyên Đán, Rằm tháng Giêng, Phật Đản, Vu Lan… Mỗi mùa lễ sân chùa được trang trí riêng, kèm những nhiệm vụ nhẹ nhàng như viết lời cảm ơn gửi cha mẹ hay lời chúc đầu năm cho người thân.

CAM KẾT
• Miễn phí, không quảng cáo, không mua trong ứng dụng.
• Không cần tài khoản – chỉ cần một biệt danh.
• Không nhận tiền công đức hay cúng dường dưới bất kỳ hình thức nào.
• Xóa dữ liệu của bạn bất cứ lúc nào trong Cài đặt.
• Thơ, lời giải, thông điệp và âm thanh đều do đội ngũ tự sáng tác.

Chùa An Nhiên là chùa hư cấu, không đại diện cho bất kỳ ngôi chùa, giáo hội hay tổ chức tôn giáo nào. Ứng dụng là không gian tĩnh tâm và chiêm nghiệm, không thay thế việc lễ chùa, tu tập hay lời khuyên của người có chuyên môn. Chúng tôi không hứa hẹn điều ước sẽ thành hiện thực – chỉ mong bạn có thêm vài phút bình yên mỗi ngày.

Hỗ trợ: hotro@chuaannhien.example
```

## Keywords
Giới hạn: 100 · Thực tế: **98** ký tự · UTF-8: **127** byte

```text
chuông,bình an,cầu an,lời nguyện,cây nguyện,lịch âm,rằm,mùng một,phật đản,vu lan,tết,tâm linh,phật
```

### Bộ dự phòng không dấu (nếu App Store Connect tính theo byte)
Giới hạn: 100 · Thực tế: **98** ký tự · UTF-8: **98** byte

```text
chuong,binh an,cau an,loi nguyen,cay nguyen,lich am,ram,mung mot,phat dan,vu lan,tet,tam linh,phat
```

> Ghi chú: không đưa "chùa", "thắp hương", "gõ mõ", "xin quẻ xăm", "online" vào Keywords vì đã có trong Name/Subtitle. Theo dõi thứ hạng 2–4 tuần rồi thay bớt từ yếu (xem `store/aso-keywords.md`).

## Danh mục

| Trường | Đề xuất | Lý do |
|---|---|---|
| Primary category | **Lifestyle (Phong cách sống)** | Nhất quán với Google Play; cạnh tranh hợp lý với từ khóa tâm linh/lịch âm. |
| Secondary category | **Entertainment (Giải trí)** | Phần xin quẻ, trang trí mùa lễ, nhiệm vụ mang tính giải trí nhẹ. (Nếu chọn Games làm Primary thì phải chọn 2 tiểu thể loại game – không khuyến nghị.) |

## URL

| Trường | URL |
|---|---|
| Support URL | https://chuaannhien.example/support.html |
| Marketing URL | https://chuaannhien.example/ |
| Privacy Policy URL | https://chuaannhien.example/privacy.html |
| (Tham khảo) Trang xóa dữ liệu | https://chuaannhien.example/support.html#xoa-du-lieu |

> [CẦN XÁC NHẬN] Tên miền `chuaannhien.example` là giữ chỗ (D18) – thay bằng tên miền thật, và đảm bảo các trang đã có trên `site/` trước khi nộp duyệt.

## Ghi chú cho App Review (App Review Information → Notes)
```
Chùa An Nhiên is a fictional Vietnamese temple for calm and reflection. No login is required.
User-generated content: the "Wishing Tree" (Cây nguyện) shows short anonymous wishes.
- Automatic word filter before publishing.
- Report: long-press a wish → "Báo cáo" (Report). Reports reviewed within 24 hours.
- Block: long-press a wish → "Chặn người viết" (Block author) hides all wishes from that author on this device.
- Contact: hotro@chuaannhien.example
No ads, no in-app purchases, no donations. Fortune poems are presented as reflection, not prediction.
```
> [CẦN XÁC NHẬN] Thao tác chính xác (nhấn giữ hay nút "…") phải khớp bản dựng thực tế.
