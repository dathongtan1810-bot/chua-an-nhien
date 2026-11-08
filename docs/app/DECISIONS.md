# Quyết định kỹ thuật (app)

Ghi lại các lựa chọn tự đưa ra khi yêu cầu chưa rõ.

1. **Phaser 3.90.0 ghim chính xác** (npm `latest` đã là 4.x) — đúng yêu cầu, tránh API đổi.
2. **Kích thước logic 540×960** (9:16), `Scale.FIT` + căn giữa; HUD/form là overlay HTML/CSS nằm trên canvas.
3. **Một AreaScene tham số hóa** cho 8 khu (vẽ theo registry `src/art/registry.ts`); chuyển khu bằng fade camera
   rồi restart scene với area mới → bộ nhớ thấp, texture tĩnh được "nướng" (generateTexture) và tái dùng.
4. **Parallax 2.5D**: 5 lớp container với scrollFactor 0 / 0.3 / 0.6 / 1 / 1.25; người chơi kéo ngang để ngắm.
5. **Ngày/đêm theo giờ Việt Nam (UTC+7)** chứ không theo múi giờ máy — đồng bộ với âm lịch.
6. **Nghi thức là "overlay ritual"** (lớp Phaser + HTML) gắn vào AreaScene, không phải scene riêng, để giữ cảnh nền.
7. **Trạng thái người chơi**: reducer thuần (`src/core/state.ts`) + lưu localStorage; nhật ký chi tiết ở IndexedDB.
8. **Chuỗi ngày (streak)**: mỗi tuần lịch (thứ Hai–Chủ nhật, giờ VN) được miễn 1 ngày nghỉ không mất chuỗi;
   ngày nghỉ không cộng vào số chuỗi.
9. **Hạt sen**: +1 mỗi nghi thức (giới hạn theo ngày để không "cày"), +3 mỗi nhiệm vụ ngày, +5 nhiệm vụ sự kiện.
   Không có tiền thật, không mua được Hạt sen.
10. **Nội dung**: `src/data/content.ts` dùng `import.meta.glob('../../../content/*.json')` — có file của phiên
    nội dung thì dùng, không thì dùng `src/data/sample-*.json` cùng schema.
11. **Online**: `ONLINE_FEATURES` (mặc định bật) + `USE_MOCK_SERVER` (mặc định bật khi không cấu hình
    `VITE_SERVER_URL`). Cấu hình bằng biến môi trường Vite, xem `src/config.ts`.
12. ~~Quảng cáo thưởng (khung AdMob)~~ — **bỏ**, xem mục 26.
13. **Giới hạn tần suất phía client khớp server** (`shared/PROTOCOL.md`): hương 1/15 s, chuông 1/20 s, đèn 3/giờ.
    Chuông/hương vẫn chơi được tại máy khi bị giới hạn; chỉ không gửi lên server (không làm phiền bằng thông báo).
14. **Hương của chính mình** hiện ngay trong lư khi cắm (không chờ server); tiếng vọng `incense_lit` của mình bị bỏ qua.
15. **Phòng gia đình** dùng sự kiện EXT của server (`room_create/join/leave`, `room_state`, `room_left`); mã phòng lưu
    localStorage để vào lại khi kết nối lại; link `?room=MÃ`. MockServer mô phỏng 1–2 người thân.
16. **Tham số xem trước cho QA**: `?skip&area=…&ritual=…&hour=0-23&date=YYYY-MM-DD` (sự kiện âm lịch, ngày/đêm).
17. **Người viếng khác** được thể hiện bằng đốm sáng ấm mờ đi chậm trên nền (không vẽ hình người) — trang nghiêm, riêng tư.
18. **Đo hiệu năng**: Chromium headless dùng SwiftShader (render phần mềm) nên FPS đo được (~15) không đại diện;
    mỗi khu giữ < 150 game object, texture tĩnh được nướng một lần. Cần đo lại trên máy thật tầm trung.
19. **Chuẩn hóa nội dung thật** (`normalizeExternal` trong `src/data/content.ts`): `tho` dạng mảng → nối dòng;
    sự kiện `thang: null` = hằng tháng; `trangTri` là mô tả văn xuôi → suy ra token hiệu ứng theo từ khóa;
    `nhiemVu` là danh sách → lấy việc đầu tiên. Không sửa thư mục `content/` (thuộc phiên nội dung).
20. `?date=` chỉ có hiệu lực ở bản dev (tránh làm hỏng streak người chơi ở bản phát hành).
21. **Biệt danh ≤ 24 ký tự** cho khớp `LIMITS.NICKNAME_MAX_CHARS` của server (dài hơn → `hello` bị từ chối).
22. **Client chờ `welcome` rồi mới gửi sự kiện khác** (server trả `not_hello` nếu nhận trước khi xử lý xong `hello`);
    `enter_area` gửi lại khi có welcome, hành động khác xếp hàng tối đa 10.
23. **Nội dung tiếng Anh tải lười** (`import.meta.glob` không eager) để gói tải đầu không tăng; sự kiện giữ ngày và
    token trang trí của bản tiếng Việt cùng `id`.
24. **Hiệu ứng nhẹ tự động** theo FPS đo bằng đồng hồ thật (đồng hồ Phaser chậm khi FPS thấp); lưu sessionStorage.
25. ~~AdMob rewarded (đã tích hợp ở f2795d2)~~ — **gỡ bỏ**, xem mục 26.
26. **Không dùng quảng cáo** (quyết định của chủ dự án): gỡ plugin `@capacitor-community/admob`, code `src/ads/`, cờ
    `VITE_ADS_ENABLED`, App ID trong AndroidManifest/Info.plist. Hạt sen chỉ đến từ tu tập nhẹ nhàng; app không có SDK
    quảng cáo hay theo dõi → Data safety không khai báo Advertising ID.
27. **Chữ giao diện của phiên nội dung** (`content/giao-dien.json`, `i18n/en/giao-dien.json`) được nạp làm lớp bổ sung cho
    i18n (`setContentStrings`, `tOr` có chữ dự phòng). Khóa của app ưu tiên trước; app đang dùng: màn giới thiệu bước 1–3
    (`onboarding.*`), lý do báo cáo (`bao-cao.*`). Không dùng các chuỗi nói về "Cây nguyện" / tab (app dùng dòng sông
    thả đèn và bản đồ) — bước 4 giới thiệu do app viết (`onboarding.river-*`).
28. **Chưa có "Bỏ chặn"**: giao thức server chưa có sự kiện bỏ chặn; nếu chỉ bỏ ở client thì server vẫn ẩn → không làm
    để tránh giao diện báo sai. Cần phiên backend thêm `unblock_user` rồi mới thêm danh sách chặn trong Cài đặt.
29. **Chủ đề xin xăm lấy từ dữ liệu** (`availableTopics`), không cố định: trước đây app hiện 6 chủ đề của dữ liệu mẫu
    (binh-an, cong-danh, hoc-tap…) mà nội dung thật dùng bộ mã chung D6 (gia-dao, cong-viec, suc-khoe, hoc-hanh,
    tinh-duyen, tai-loc) → 3/6 chủ đề không có quẻ/lời giải riêng. Nhãn hiển thị lấy `xin-que.chu-de.*` của phiên nội dung
    (`tai-loc` = "Làm ăn", D35). Nhật ký lưu và hiện tên quẻ + tên chủ đề.
30. **Bộ mùa** (`content/mua/*.json`, 7 bộ, + bản EN): mùa đang diễn ra tính theo khoảng ngày âm (có vắt qua năm, vd. Tết
    23/12 → 15/1); mùa chồng nhau thì chọn mùa có khoảng ngắn hơn (Rằm tháng Giêng thắng mùa Tết). Trong mùa: thông điệp
    ngày lấy từ mùa, trang trí theo `trangTri` (từ khóa → token), lời chào mỗi ngày một lần, 2/3 gợi ý lời nguyện từ mùa,
    thêm lựa chọn "Quẻ đặc biệt của mùa" (queDacBiet).
31. **Nhiệm vụ của mùa** (`nhiemVu`): phân loại theo cái app có (`classifyQuest`) — khớp nghi thức (thiền, thả đèn, xin
    xăm…) thì tự hoàn thành khi làm trong mùa (thiền "5 phút" cần ≥ 5 phút); việc ngoài đời (gọi cho cha mẹ, ăn chay…)
    người chơi tự đánh dấu; việc chỉ có "ảo"/Cây nguyện/gửi quà trong app thì ẩn. Thưởng +2 Hạt sen một lần mỗi nhiệm vụ
    mỗi mùa mỗi năm (năm = năm bắt đầu mùa, vì mùa Tết vắt năm) thay cho đồ trang trí app chưa có.
32. **Đồng hồ Phaser vs đồng hồ thật**: `scene.time.now` cộng dồn thời gian thật (`TimeStep.time += rawDelta`) nên giữ
    nhang 1,3 s, nhịp mõ, tuổi viên thức ăn cá vẫn đúng trên máy chậm. Còn `delayedCall`/`addEvent` chạy theo delta đã làm
    mượt → trễ khi FPS thấp: chỗ ảnh hưởng thao tác/điều hướng đã chuyển sang `setTimeout` (`AreaScene.later`, goTo) hoặc
    `performance.now()` (bộ đếm thiền, `advanceClock`). Cố ý GIỮ Phaser clock cho chờ thoát sau lạy (1,5 s), hiện quẻ sau
    lắc ống xăm (0,65 s) và hiệu ứng nền (lá rơi…) vì chúng phải đi cùng nhịp tween — đổi sang đồng hồ thật thì quẻ có thể
    hiện khi ống xăm còn đang lắc.
