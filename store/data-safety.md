# Khai báo dữ liệu – Google Play Data safety & App Store App Privacy

**Căn cứ: giả định D17 (chưa được dev xác nhận).** Toàn bộ file này là **mẫu khai** – mọi dòng có **[CẦN XÁC NHẬN]** phải được đội dev đối chiếu với mã nguồn, các SDK thực tế (analytics, crash, push, backend) và hợp đồng với nhà cung cấp đám mây trước khi nộp. Khai sai Data safety là lỗi chính sách có thể khiến app bị gỡ.

Giả định D17 tóm tắt:
- **deviceId ẩn danh** do app tự sinh (UUID ngẫu nhiên khi cài), không phải IMEI, Android ID, IDFA/IDFV hay Advertising ID.
- **Nickname** (biệt danh) người dùng tự đặt.
- **Lời nguyện** (≤120 ký tự) lưu trên máy chủ, có thể hiển thị công khai ẩn danh trên Cây nguyện.
- Không quảng cáo, không IAP, không bán/chia sẻ dữ liệu cho bên thứ ba; có thể dùng nhà cung cấp hạ tầng đám mây làm **bên xử lý dữ liệu** (service provider – không tính là "chia sẻ" theo định nghĩa của Google và Apple).
- Xóa dữ liệu (D19): trong app (Cài đặt → Xóa dữ liệu của tôi) xóa ngay; hoặc email `hotro@chuaannhien.example` kèm mã thiết bị, xử lý tối đa 30 ngày.

Danh sách cần dev kiểm tra trước khi điền:
- [ ] [CẦN XÁC NHẬN] Có SDK analytics nào không (Firebase Analytics, v.v.)? Nếu có → khai thêm "Tương tác với ứng dụng" (App interactions).
- [ ] [CẦN XÁC NHẬN] Có SDK báo lỗi (Crashlytics, Sentry…)? Nếu có → khai "Nhật ký sự cố" và "Chẩn đoán".
- [ ] [CẦN XÁC NHẬN] Có thông báo đẩy (FCM/APNs)? Push token thường được coi là "Device or other IDs".
- [ ] [CẦN XÁC NHẬN] Máy chủ có ghi log địa chỉ IP lâu dài không? (IP được Google coi là có thể suy ra vị trí gần đúng – nếu chỉ dùng cho bảo mật và xóa ngắn hạn, ghi rõ trong chính sách quyền riêng tư.)
- [ ] [CẦN XÁC NHẬN] Nickname bắt buộc hay tùy chọn? (Mẫu dưới giả định **tùy chọn** – có thể dùng app và treo lời nguyện dưới tên "Một người viết".)
- [ ] [CẦN XÁC NHẬN] Mọi kết nối dùng HTTPS/TLS.
- [ ] [CẦN XÁC NHẬN] Lịch sử quẻ đã xin, nén hương đã thắp… chỉ lưu trên máy hay đồng bộ lên server? (Mẫu dưới giả định **chỉ lưu trên máy** → không phải khai.)

---

## 1. Google Play – Data safety (Play Console → Chính sách → An toàn dữ liệu)

### 1.1 Câu hỏi tổng quan

| Câu hỏi | Đáp án |
|---|---|
| Ứng dụng có thu thập hoặc chia sẻ loại dữ liệu người dùng bắt buộc khai báo nào không? | **Có** |
| Mọi dữ liệu người dùng được thu thập có được mã hóa khi truyền không? | **Có** [CẦN XÁC NHẬN: HTTPS toàn bộ] |
| Bạn có cung cấp cách để người dùng yêu cầu xóa dữ liệu không? | **Có** – trong app và qua URL |
| URL xóa dữ liệu (Delete data URL) | **https://chuaannhien.example/support.html#xoa-du-lieu** (bản thật: `site/support.html#xoa-du-lieu`) |
| Ứng dụng có cho phép tạo tài khoản không? | **Không** – không có đăng ký/đăng nhập; chỉ có ID ẩn danh trên thiết bị. (Vì vậy yêu cầu "xóa tài khoản" không áp dụng, nhưng vẫn cung cấp URL xóa dữ liệu.) [CẦN XÁC NHẬN] |
| Ứng dụng đã được đánh giá bảo mật độc lập (MASA)? | **Không** (tùy chọn) |
| Ứng dụng tuân thủ chính sách Gia đình? | Không áp dụng (đối tượng 13+, xem `age-rating.md`) |

### 1.2 Bảng loại dữ liệu

Chú thích cột: **Thu thập** = gửi ra khỏi thiết bị · **Chia sẻ** = chuyển cho bên thứ ba (không tính bên xử lý dữ liệu, không tính hành động người dùng chủ động chia sẻ công khai) · **Tạm thời** = chỉ xử lý trong bộ nhớ, không lưu.

| Danh mục Play | Loại dữ liệu | Thu thập | Chia sẻ | Tạm thời? | Bắt buộc / Tùy chọn | Mục đích | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Thiết bị hoặc mã nhận dạng khác** (Device or other IDs) | deviceId ẩn danh do app sinh | **Có** | **Không** | Không | **Bắt buộc** | Chức năng ứng dụng; Ngăn chặn gian lận, bảo mật và tuân thủ | Dùng để gắn lời nguyện với người viết (xóa/chặn/giới hạn tần suất) và để người dùng yêu cầu xóa dữ liệu. Không dùng cho quảng cáo. Nếu có push token → khai cùng mục này, mục đích "Chức năng ứng dụng" [CẦN XÁC NHẬN]. |
| **Thông tin cá nhân → Tên** (Personal info → Name) | Nickname tự đặt | **Có** | **Không** | Không | **Tùy chọn** [CẦN XÁC NHẬN] | Chức năng ứng dụng | Google định nghĩa "Tên" gồm cả biệt danh (nickname). Nếu nickname **chỉ lưu trên máy** và không bao giờ gửi lên server → không phải khai [CẦN XÁC NHẬN]. |
| Thông tin cá nhân → Email | Email người dùng gửi khi yêu cầu hỗ trợ/xóa dữ liệu | **Không** (qua app) | – | – | – | – | Email gửi ngoài app (qua ứng dụng email) không tính là dữ liệu do app thu thập. Nếu sau này thêm form liên hệ trong app → khai "Email", mục đích "Liên lạc của nhà phát triển". |
| **Hoạt động trong ứng dụng → Nội dung khác do người dùng tạo** (App activity → Other user-generated content) | Lời nguyện | **Có** | **Không** | Không | **Tùy chọn** (người dùng tự chọn viết) | Chức năng ứng dụng; Ngăn chặn gian lận, bảo mật và tuân thủ (kiểm duyệt, lọc từ) | Lời nguyện hiển thị công khai ẩn danh do người dùng chủ động treo – là hành động người dùng khởi tạo, không tính là "chia sẻ" với bên thứ ba. Nêu rõ trong chính sách quyền riêng tư. |
| Hoạt động trong ứng dụng → Tương tác với ứng dụng (App interactions) | Báo cáo/chặn lời nguyện; (nếu có analytics: số lần thắp hương, xin quẻ…) | **Có** (báo cáo) | **Không** | Không | Tùy chọn | Ngăn chặn gian lận, bảo mật và tuân thủ; (Phân tích – nếu có analytics) | Báo cáo gồm ID lời nguyện + lý do + deviceId người báo cáo. Nếu **không** dùng analytics thì chỉ khai mục đích kiểm duyệt. [CẦN XÁC NHẬN] |
| **Thông tin và hiệu suất ứng dụng → Nhật ký sự cố** (Crash logs) | Báo cáo crash | **Có nếu dùng SDK crash** [CẦN XÁC NHẬN] | **Không** | Không | Tùy chọn hoặc Bắt buộc tùy SDK | Phân tích | Nếu không dùng SDK crash (chỉ dựa vào Android vitals của Google Play) → **không khai**. |
| Thông tin và hiệu suất ứng dụng → Chẩn đoán (Diagnostics) | Thời gian tải, lỗi mạng | **Có nếu dùng SDK** [CẦN XÁC NHẬN] | **Không** | Không | – | Phân tích | |
| Vị trí (chính xác/gần đúng) | – | **Không** | – | – | – | – | Không xin quyền vị trí. Xem lưu ý IP ở trên. |
| Thông tin tài chính, Sức khỏe & thể chất, Tin nhắn, Ảnh/video, Âm thanh, Tệp & tài liệu, Lịch, Danh bạ, Ứng dụng đã cài, Lịch sử duyệt web | – | **Không** | – | – | – | – | Lịch lễ âm lịch là dữ liệu của app, không đọc lịch của người dùng. Âm thanh gõ mõ/chuông phát ra, không ghi âm. [CẦN XÁC NHẬN] app không xin quyền micro/ảnh/danh bạ. |

### 1.3 Câu chữ gợi ý cho trang "Xóa dữ liệu" (`site/support.html#xoa-du-lieu`)
> **Xóa dữ liệu của bạn – Chùa An Nhiên**
> Cách 1 (ngay lập tức): mở ứng dụng → Cài đặt → Xóa dữ liệu của tôi → Xác nhận. Toàn bộ lời nguyện, biệt danh và mã thiết bị ẩn danh của bạn trên máy chủ sẽ bị xóa.
> Cách 2: gửi email đến hotro@chuaannhien.example với tiêu đề "Xóa dữ liệu" kèm **mã thiết bị** hiển thị trong Cài đặt. Chúng tôi xử lý trong tối đa 30 ngày.
> Dữ liệu bị xóa: mã thiết bị ẩn danh, biệt danh, lời nguyện, báo cáo bạn đã gửi. Dữ liệu có thể được giữ lại: nhật ký kiểm duyệt dạng ẩn danh hóa của lời nguyện vi phạm (tối đa [90] ngày) để ngăn tái vi phạm [CẦN XÁC NHẬN].

---

## 2. App Store – App Privacy (App Store Connect → App Privacy)

### 2.1 Tổng quan
| Câu hỏi | Đáp án |
|---|---|
| Do you or your third-party partners collect data from this app? | **Yes** |
| Tracking (theo định nghĩa ATT: liên kết dữ liệu với dữ liệu của công ty khác cho quảng cáo, hoặc chia sẻ cho data broker) | **No – Data Used to Track You: none** |
| Có cần hiển thị lời nhắc App Tracking Transparency? | **Không** (không theo dõi, không dùng IDFA) |
| Privacy Policy URL | https://chuaannhien.example/privacy.html |
| Privacy Choices URL (tùy chọn) | https://chuaannhien.example/support.html#xoa-du-lieu |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | [CẦN XÁC NHẬN] dev khai "Required Reason APIs" (ví dụ UserDefaults → `CA92.1`) và kiểm tra privacy manifest của mọi SDK bên thứ ba. |

### 2.2 Bảng loại dữ liệu

Apple coi dữ liệu là **Linked to You** nếu gắn với danh tính người dùng qua tài khoản, thiết bị hoặc thông tin khác. Vì lời nguyện, nickname được lưu gắn với deviceId ẩn danh và có thể truy ngược để xóa/chặn → khai thận trọng là **Linked to You**.

| Nhóm Apple | Loại dữ liệu | Thu thập | Linked / Not Linked | Tracking | Mục đích (Purposes) | Ghi chú |
|---|---|---|---|---|---|---|
| **Identifiers** | **User ID** – nickname (Apple xếp "screen name, handle… assigned user ID" vào User ID) | Có | **Linked to You** | No | App Functionality | Nếu nickname chỉ lưu trên máy → không khai [CẦN XÁC NHẬN]. |
| **Identifiers** | **Device ID** – deviceId ẩn danh do app sinh | Có | **Linked to You** | No | App Functionality; (Other Purposes: kiểm duyệt, chống spam) | Không phải IDFA/IDFV. Có thể cân nhắc khai là User ID (ID do app gán); chọn một cách và giữ nhất quán với chính sách quyền riêng tư [CẦN XÁC NHẬN]. |
| **User Content** | **Other User Content** – lời nguyện | Có | **Linked to You** | No | App Functionality | Hiển thị công khai ẩn danh trên Cây nguyện. |
| **User Content** | **Customer Support** | Không (qua app) | – | – | – | Email hỗ trợ gửi ngoài app. Nếu thêm form trong app → khai. |
| **Usage Data** | **Product Interaction** – báo cáo/chặn; (analytics nếu có) | Có | **Linked to You** (báo cáo gắn deviceId) | No | App Functionality (kiểm duyệt); Analytics (nếu có SDK) | [CẦN XÁC NHẬN] |
| **Diagnostics** | **Crash Data**, **Performance Data** | Có nếu dùng SDK crash [CẦN XÁC NHẬN] | **Not Linked to You** (nếu SDK cấu hình không gắn ID) | No | Analytics; App Functionality | Nếu chỉ dùng báo cáo crash mặc định của Apple (người dùng đồng ý chia sẻ với nhà phát triển) → không khai. |
| Contact Info (Name, Email, Phone, Address) | – | Không | – | – | – | Nickname không phải tên thật → khai ở User ID. |
| Location, Health & Fitness, Financial Info, Contacts, Browsing/Search History, Sensitive Info, Purchases | – | Không | – | – | – | **Sensitive Info** (bao gồm niềm tin tôn giáo): app **không** thu thập tôn giáo của người dùng; việc dùng app không được ghi nhận như một thuộc tính tôn giáo. Tuy nhiên lời nguyện tự do có thể chứa thông tin nhạy cảm do người dùng tự viết – nhắc người dùng không viết thông tin cá nhân (U1 trong `age-rating.md`). |

### 2.3 Kết quả "nhãn dinh dưỡng" dự kiến trên App Store
- **Data Used to Track You:** không có.
- **Data Linked to You:** Identifiers, User Content, Usage Data.
- **Data Not Linked to You:** Diagnostics (chỉ khi dùng SDK crash).

---

## 3. Nhất quán với tài liệu khác
- Chính sách quyền riêng tư (`site/privacy.html`) phải liệt kê đúng các loại dữ liệu trên, bên xử lý dữ liệu đám mây (tên nhà cung cấp, vị trí máy chủ) [CẦN XÁC NHẬN], thời gian lưu trữ, quyền xóa (D19), email liên hệ (D18).
- Mô tả store đã ghi "Không cần tài khoản", "Xóa dữ liệu bất cứ lúc nào trong Cài đặt" – giữ đúng như vậy trong bản dựng.
- Khi thêm IAP, quảng cáo, analytics, push hoặc đăng nhập ở bản sau → cập nhật lại cả hai bảng **trước** khi phát hành bản đó.
