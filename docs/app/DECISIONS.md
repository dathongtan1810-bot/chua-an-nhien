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
12. **Quảng cáo thưởng**: chỉ khung, `ADS_ENABLED=false`, dùng AdMob test ID; không bao giờ hiện ở chính điện/thiền.
