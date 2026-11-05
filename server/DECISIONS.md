# Các quyết định tự đưa ra (server)

Ghi lại các chỗ đặc tả chưa rõ và lựa chọn đã làm. Mới nhất ở cuối.

1. **Cấu trúc mã**: `server/` là package Node riêng (ESM). `shared/protocol.ts` được import trực tiếp bằng đường dẫn tương đối.
   Vì `shared/` không có `node_modules`, `zod` được trỏ về `server/node_modules` qua `paths` (tsc) và `alias` (vitest); bản build dùng esbuild bundle (`packages: external`) nên lúc chạy `zod` được resolve từ `server/node_modules`. Không sửa file ở gốc repo (không dùng npm workspaces).
2. **Thời gian** trong giao thức là chuỗi ISO-8601 UTC (đồng bộ với `?since=ISO`).
3. **Ack tuỳ chọn** cho mọi sự kiện C→S — bổ sung, không phá hợp đồng.
4. **`nickname` trong hello** có thể rỗng/null → server cấp biệt danh ngẫu nhiên kiểu "Sen An 042". Biệt danh bị bộ lọc từ chối → thay bằng ngẫu nhiên.
5. **`light_incense.count`** là số nguyên 1–9; rate limit 1 lần/15 s/người (đặc tả không nêu).
6. **`ring_bell.force`** là số 0–1.
7. **`color`** của đèn: `#rrggbb` hoặc tên màu chữ thường (client tự map).
8. **Online** đếm theo `userId` duy nhất, không theo kết nối. `presence` chỉ phát khi có thay đổi (giảm băng thông), chu kỳ 3 s.
9. **Định danh**: `users.device_hash = SHA-256(DEVICE_SALT + ':' + deviceId)`; `userId` công khai là chuỗi ngẫu nhiên, không suy ra được deviceId.
10. **MODERATION_MODE=pre**: đèn mới ở trạng thái `pending`; chỉ tác giả nhận `lantern_released` ngay (để thấy đèn của mình); mọi người nhận khi admin duyệt. `post`: duyệt tự động nếu qua bộ lọc. Nội dung không qua bộ lọc bị **từ chối** (không lưu) với `error content_rejected`.
11. **Báo cáo user** đủ 3 người → user bị gắn cờ `flagged`: các đèn đang hiện của họ chuyển `pending`, đèn mới luôn `pending` cho tới khi admin "giải quyết".
    Báo cáo đèn đủ 3 người → đèn `pending` (ẩn chờ duyệt) + phát `lantern_removed`.
12. **Thả tim**: thêm sự kiện EXT `lantern_liked {id, likes}` vì hợp đồng gốc không có cách báo số tim mới.
13. **Chặn**: hai chiều. Lọc ở `incense_lit`, `lantern_released`, `lantern_liked`, `welcome.incense`, `GET /api/lanterns` (nếu client gửi header `x-device-id`). Chuông không mang danh tính nên không lọc. Khi chặn, server gửi `lantern_removed` cho các đèn của bên kia.
14. **"Hôm nay"** trong thống kê tính theo giờ Việt Nam (UTC+7).
15. **ONLINE_FEATURES**: `all` (mặc định) | `none` | danh sách `presence,incense,bell,lantern,report,room`. Tắt hết → `hello` trả `feature_disabled`. REST vẫn chạy.
16. **Khoá device** trong admin thao tác theo `userId` (1 user = 1 deviceId băm). Khoá → ẩn mọi đèn đang hiện, ngắt kết nối, `hello` sau đó trả `banned`.
17. **Bộ lọc từ cấm**: từ 1 âm tiết có dấu (vd "lồn") chỉ khớp khi văn bản có dấu y hệt, để không chặn nhầm "lớn"/"lon"; từ trong `unaccentedAlso` (vd "dit", "dm") khớp cả không dấu. Cụm ≥ 2 âm tiết khớp cả có dấu & không dấu. Ghép token 1 ký tự liền nhau để bắt "đ.ị.t", "d i t"; bản nén (bỏ khoảng trắng) chỉ dùng cho từ ≥ 5 ký tự.
18. **Danh sách từ cấm**: lưu ở bảng `banned_words` (admin sửa được). Lần đầu khởi động seed từ `BANNED_WORDS_PATH` → `server/data/tu-cam.json` (bản sao của `content/tu-cam.json` nếu nhánh nội dung có) → `server/data/banned-words.json`. Không `git merge` nhánh nội dung vào nhánh này (sẽ kéo theo file ngoài phạm vi `server/`), mà **sao chép** file `content/tu-cam.json` thành `server/data/tu-cam.json`.
19. **Admin**: cookie phiên `chua_admin` = `exp.HMAC(exp)`, httpOnly, SameSite=Strict, Secure ở production, path `/admin`, hạn 12 h. Thao tác ghi bắt buộc header `x-admin-request: 1` (chống CSRF). Đăng nhập tối đa 5 lần/phút/IP.
20. **Rate limit**: theo user và theo IP (IP được phép gấp 5 lần user, cho trường hợp nhiều người chung NAT). Chống flood chung: `SOCKET_EVENTS_PER_10S` sự kiện/10 s/socket; vượt quá nhiều lần → ngắt kết nối. Đèn 3/giờ đếm cả trong DB (bền khi kết nối lại/khởi động lại).
21. **Hương** giữ trong bộ nhớ (3 phút) và ghi DB (giữ 2 ngày) để khôi phục lư hương sau khi server khởi động lại.
22. **Phòng riêng** chỉ trong bộ nhớ (không cần bền); khi scale nhiều instance cần Redis adapter (xem DEPLOY.md).
23. **Một instance**: trạng thái realtime (presence, hương, rate limit) ở bộ nhớ → chạy 1 instance. Scale ngang cần `@socket.io/redis-adapter` + chuyển limiter sang Redis + Postgres.
24. **Chống chặn nhầm** (phát hiện khi chạy 300 lời nguyện mẫu của nhánh nội dung — trước khi sửa chặn nhầm 139/300):
    - Bản nén chỉ so **theo ranh giới token** (nối token i..j phải BẰNG từ cấm đã nén), không so chuỗi con ("Con nguyện" ≠ "con ngu").
    - Văn bản **có dấu** chỉ so với dạng có dấu của từ cấm; so không dấu chỉ áp lên đoạn văn bản **không dấu** ("chỗ để" ≠ "chó đẻ").
      Hệ quả: người gõ không dấu có thể bị chặn nhầm các cụm trùng âm — chấp nhận, vì họ vẫn sửa được và báo cáo/kiểm duyệt bù lại.
    - Quảng cáo chia từ khoá mạnh (chặn ngay) và yếu ("giảm giá", "liên hệ"… cần ≥ 2 từ).
    - Bỏ khỏi danh sách mặc định các từ hay xuất hiện trong lời nguyện thật ("con chó", "óc chó", "ma túy", "tự tử", "khủng bố"...).
    - Test `filter.test.ts` chạy toàn bộ `test/fixtures/loi-nguyen-mau*.json` (sao chép từ `content/` nhánh nội dung) và yêu cầu 0 chặn nhầm.
25. **Định dạng `content/tu-cam.json`** (theo `content/tools/loc-tu.mjs` của nhánh nội dung): `{tuCam:[{tu, nhom, mucDo, bienThe[], bienTheLach[]}], allowlist[], thayKyTu{}}`.
    Server mã hoá thành dòng trong bảng `banned_words`: `tu`/`bienThe` → "từ", `bienTheLach` → "~từ" (chỉ chặn khi có dấu hiệu lách: đổi ký tự, chữ rời, kéo dài chữ),
    `allowlist` → "+cụm". `thayKyTu` bổ sung bảng ký tự lách. `mucDo`/`nhom` hiện **bỏ qua** — mọi mức đều từ chối (đơn giản, an toàn cho chùa).
    Allowlist không dấu chỉ áp khi cả văn bản không dấu (giống loc-tu.mjs).
