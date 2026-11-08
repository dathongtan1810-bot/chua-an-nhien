# BUGS — QA Chùa An Nhiên

Cập nhật: 2026-11-08 04:39 UTC (vòng 1, đang làm dở — tạm dừng theo yêu cầu, chạy lại lúc 15:50 giờ VN).

Cơ sở kiểm thử: nhánh `claude/intelligent-franklin-c55pfd` đã merge `jolly-mendel-hppn0t` (app, gồm cả server/content),
`practical-mccarthy-6bx621` (server), `sweet-tesla-9rdbof` (content).

## Kết quả chạy bộ test hiện có (vòng 1)

| Phần | Lệnh | Kết quả |
|---|---|---|
| server | `npm run typecheck && npm test && npm run build` | ✅ 133 passed, 10 skipped (Postgres/Redis thật) |
| content | `node validate.mjs`, `node tu-cam.test.mjs` | ✅ |
| app | `tsc`, `lint`, `npm test`, `vite build` | ✅ 236 passed; cảnh báo `INEFFECTIVE_DYNAMIC_IMPORT` (reminders.ts) |
| app e2e với server thật | `npm run e2e:server` | ✅ 9/9 (2.5 phút) |

Các lỗi dưới đây tái hiện bằng client Socket.IO thật nối vào server thật (`qa/lib/harness.ts`, script dò trong `qa/probes/`).

---

## BUG-001 — Lách bộ lọc bằng chữ full-width / chữ toán học / chữ Cyrillic giống Latin
- **Mức độ:** Cao (kiểm duyệt nội dung — lời nguyện công khai, biệt danh công khai)
- **Tái hiện:** `hello` rồi `release_lantern {text:'ｄｉｔ ｍｅ', color:'vang'}` (cũng vậy: `'𝐝𝐢𝐭 𝐦𝐞 𝐦𝐚𝐲'`, `'dіt mе mày'` với `і`/`е` Cyrillic).
  Biệt danh `hello {nickname:'𝐝𝐢𝐭 𝐦𝐞'}` / `'ｄｉｔ'` / `'dіt mе'` cũng được giữ nguyên.
- **Mong đợi:** `content_rejected` (như `'dit me may'`); biệt danh bị thay bằng biệt danh ngẫu nhiên.
- **Thực tế:** `{ok:true, status:'approved'}`; biệt danh hiển thị nguyên văn cho mọi người.
- **File nghi ngờ:** `server/src/services/filter.ts` (`tokenizeDetailed`, `cleanText` chỉ dùng NFC).
- **Gợi ý sửa:** trước khi tách token, chuẩn hoá NFKC (full-width, chữ toán học → ASCII) rồi gập bảng "confusables"
  Cyrillic/Hy Lạp → Latin (а е і о р с у х ѕ ј ԁ …). Chỉ dùng cho so khớp, vẫn lưu văn bản gốc đã NFC.

## BUG-002 — Lách bộ lọc bằng chữ `Ð` (U+00D0, Eth) thay cho `Đ` (U+0110)
- **Mức độ:** Cao
- **Tái hiện:** `release_lantern {text:'Ðịt mẹ'}` → approved. (`'ĐỊT MẸ'`, `'địt mẹ'` thì bị chặn.)
- **Nguyên nhân:** `'Ð'.toLowerCase()` = `ð` (U+00F0), không phải `đ`; `stripDiacritics` chỉ đổi `đ/Đ`.
- **File nghi ngờ:** `server/src/services/filter.ts` (`stripDiacritics`, `tokenizeDetailed`); bản client `app/src/logic/filter.ts` nên kiểm tra tương tự.
- **Gợi ý sửa:** gập `ð`/`Ð`/`ɖ`/`đ` → `đ` khi chuẩn hoá để so khớp.

## BUG-003 — Tách từng chữ cái của CẢ câu thì lọt lọc
- **Mức độ:** Trung bình–Cao
- **Tái hiện:** `release_lantern {text:'đ ị t m ẹ m à y'}` → approved. Nhưng `'đ ị t'` (chỉ một từ) thì bị chặn.
- **Nguyên nhân (dự đoán):** các token 1 ký tự liền nhau được ghép thành MỘT token `địtmẹmày`; khớp nén có lẽ chỉ so
  toàn token với mẫu, không tìm mẫu như chuỗi con của token ghép.
- **File nghi ngờ:** `server/src/services/filter.ts` (bước 3 "ghép token 1 ký tự" + so khớp compact).
- **Gợi ý sửa:** với token ghép từ chữ rời (cờ `evasive`, `bufN ≥ 2`), tìm từ cấm như chuỗi con (đã bỏ/không bỏ dấu).

## BUG-004 — Lời nguyện BỊ TỪ CHỐI vẫn trừ hạn mức đèn theo IP (15/giờ) → người dùng chung IP (NAT/CGNAT) bị khoá thả đèn
- **Mức độ:** Cao (ảnh hưởng người dùng thật: mạng di động VN dùng CGNAT, wifi gia đình/quán)
- **Tái hiện:** từ cùng một IP, 15 người dùng khác nhau mỗi người gửi 1 đèn (kể cả đèn bị `content_rejected`);
  người thứ 16 gửi `'Cầu bình an'` → `{ok:false, code:'rate_limited', retryAfterMs:~3600000}`.
- **Mong đợi:** chỉ đèn được nhận mới tính hạn mức; hạn mức IP đủ rộng cho NAT, hoặc hạn mức IP chỉ áp lên lần bị từ chối nhiều bất thường.
- **Thực tế:** `onLantern` gọi `lanternIp.hit(ip)` TRƯỚC khi lọc nội dung; mọi lần bị từ chối cũng tốn quota của cả IP.
- **File nghi ngờ:** `server/src/realtime/hub.ts` (`onLantern`, `createLantern`).
- **Gợi ý sửa:** đặt chỗ (reserve) theo IP rồi hoàn lại khi bị `content_rejected`; cân nhắc tăng `IP_FACTOR` cho đèn
  hoặc đưa ra biến môi trường; client nên hiện thông báo dễ hiểu khi `retryAfterMs` lớn.

## BUG-005 — Biệt danh mạo danh "Admin", "Quản trị viên", "Sư thầy" được chấp nhận
- **Mức độ:** Thấp–Trung bình (lừa đảo/mạo danh trong không gian tâm linh)
- **Tái hiện:** `hello {nickname:'Quản trị viên'}` → `welcome.nickname = 'Quản trị viên'`.
- **Gợi ý sửa:** thêm danh sách tên dành riêng (admin, quản trị, ban quản lý, sư thầy, trụ trì, thầy …) vào `tu-cam.json`/server.

## BUG-006 — Một số câu xúc phạm/quảng cáo nhẹ lọt lọc (cần nhóm nội dung quyết)
- **Mức độ:** Thấp
- **Tái hiện:** `'chó chết'`, `'mả mẹ'`, `'mua bán acc'`, `'đ̣it'` (dấu chấm dưới tổ hợp đặt trên `đ`) → approved.
- **File:** `content/tu-cam.json`.

---

## Ghi nhận đã kiểm và ĐÚNG (không phải lỗi)
- Chặn đúng: có/không dấu, chữ rời `đ.ị.t`, leet `d1t m3`/`l0n`, zero-width, NFD, kéo dài chữ, emoji chen giữa, SĐT viết số/chữ/cách,
  link `zalo.me`, `fb.com`, `t.me`, `abc[.]com`, `abc dot com`, từ khoá quảng cáo/cá độ/vay tiền. Không chặn nhầm 21 câu hợp lệ
  ("Đi ngủ ngon nhé", "Bưởi Năm Roi", "Cái đít nồi", "Nguyễn Thị Lồng", "Mã số 0912"…).
- Tim đồng thời từ 10 người: đếm đúng 1..10, REST = 10; xoá dữ liệu người thả tim → giảm còn 9.
- Báo cáo bởi 3 IP khác nhau → tự ẩn, mọi người nhận `lantern_removed`, REST không còn đèn.
- `POST /api/me/delete`: ngắt socket, xoá đèn/báo cáo, phát `lantern_removed`; `hello` lại với cùng deviceId → userId mới.
- Nhiều tab cùng thiết bị tính 1 người online. Chuông toàn server 1 lần/3 s, hương 1 lần/15 s.

## Còn phải làm (vòng sau)
- Chuyển các script dò thành test có khẳng định trong `qa/api/` (test lỗi đã biết dùng `test.fails` với mã BUG).
- Kiểm tra client: luồng xoá dữ liệu (`app/src/ui/panels.ts:400` — có xoá IndexedDB/localStorage không, xử lý 429),
  hiển thị `rate_limited`/`content_rejected`, chặn/báo cáo; Playwright trong `qa/e2e/`; hiệu năng (nhiều client), a11y.
