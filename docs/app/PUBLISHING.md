# Phát hành Chùa An Nhiên lên Google Play & App Store

Ứng dụng: **Chùa An Nhiên** · appId/bundle ID `vn.chuaannhien.app` · Capacitor 8 (`app/capacitor.config.ts`).
Chùa trong app là **hư cấu**. Định vị: trải nghiệm thư giãn, chánh niệm, văn hóa — **không** phải bói toán,
cờ bạc hay gây quỹ.

---

## 0. Chuẩn bị chung

- [ ] `cd app && npm ci && npm run icons` — sinh icon/splash bằng code (`scripts/gen-icons.mjs`, cần Playwright global
      + Chromium). Ghi đè PNG trong `public/icons`, `resources/`, `android/.../res`, `ios/.../Assets.xcassets`.
- [ ] `npm run cap:sync` (= `npm run build && cap sync`).
- [ ] Trang chính sách: `app/public/privacy.html` → sau deploy là `https://<domain>/privacy.html`. Thay email
      `lienhe@chuaannhien.example` bằng email thật.
- [ ] Trang/URL xóa dữ liệu (Play bắt buộc): có thể dùng `https://<domain>/privacy.html#vi` mục 3 (hướng dẫn nút
      "Xóa dữ liệu của tôi" + email), hoặc tạo form riêng.
- [ ] Cấu hình build production: `VITE_SERVER_URL` trỏ máy chủ thật; `ADS_ENABLED=false` (mặc định).

### Tăng phiên bản (mỗi lần nộp)
- `app/package.json` → `version`.
- Android: `app/android/app/build.gradle` → `versionCode` (số nguyên, **luôn tăng**) và `versionName` ("1.0.1").
- iOS: Xcode → target App → General → *Version* (`MARKETING_VERSION`) và *Build* (`CURRENT_PROJECT_VERSION`, luôn tăng).

---

## 1. Nội dung do người dùng tạo (UGC) — bắt buộc cả 2 store

Lời nguyện trên đèn hoa đăng hiển thị công khai 24h, biệt danh hiển thị cho người khác → là UGC.
Apple Guideline **1.2** và chính sách UGC của Google Play yêu cầu:

- [ ] **Lọc từ ngữ thô tục ở client** (trước khi gửi) **và ở server** (không tin client).
- [ ] **Nút báo cáo** trên mỗi đèn/lời nguyện/biệt danh; báo cáo gửi về hàng đợi kiểm duyệt.
- [ ] **Chặn người dùng**: ẩn ngay nội dung của người đó trên máy mình.
- [ ] **Kiểm duyệt**: tự ẩn nội dung khi đủ N báo cáo; người kiểm duyệt xem trong 24h; có cách khóa mã thiết bị vi phạm.
- [ ] **Điều khoản sử dụng/EULA** có điều khoản "không dung thứ nội dung phản cảm, quấy rối" — iOS yêu cầu người dùng
      đồng ý trước khi đăng nội dung (ví dụ màn hình lần đầu thả đèn: "Tôi đồng ý giữ lời nguyện an lành" + link điều khoản).
      Có thể dùng EULA chuẩn của Apple + bổ sung điều khoản UGC trong App Store Connect.
- [ ] Thông tin liên hệ trong app (Cài đặt → Liên hệ).
- [ ] Có thể tắt toàn bộ tính năng trực tuyến trong Cài đặt.

## 2. Xóa dữ liệu & quyền riêng tư

- [ ] Nút **"Xóa dữ liệu của tôi"** trong Cài đặt: xóa localStorage/IndexedDB + gọi API xóa mã thiết bị, biệt danh,
      lời nguyện trên server. (Apple 5.1.1(v) yêu cầu xóa trong app khi có "tài khoản"; mã thiết bị + biệt danh nên coi như tài khoản.)
- [ ] Play Console → *App content* → *Data deletion*: khai URL xóa dữ liệu (xem mục 0).
- [ ] Privacy policy URL: khai ở cả Play Console và App Store Connect.

### Google Play — Data safety (gợi ý trả lời)
| Câu hỏi | Trả lời |
|---|---|
| Thu thập/chia sẻ dữ liệu? | **Có thu thập**, **không chia sẻ** với bên thứ ba |
| Mã hóa khi truyền | Có (HTTPS/WSS) |
| Người dùng yêu cầu xóa được | Có (trong app + URL) |
| *Device or other IDs* | Có — mã ngẫu nhiên do app tạo; mục đích: App functionality, Fraud prevention/security; không bắt buộc (có thể tắt online) |
| *Personal info → Name* | Biệt danh ngẫu nhiên — có thể khai "Other info: nickname", App functionality |
| *Messages / User-generated content (Other in-app messages)* | Lời nguyện — App functionality; công khai 24h |
| Vị trí, danh bạ, ảnh, sức khỏe, tài chính | **Không** |
| Quảng cáo / Analytics | Bản build **có SDK AdMob** (plugin `@capacitor-community/admob`) nhưng quảng cáo **tắt** (`VITE_ADS_ENABLED=false`). Google Play vẫn coi app có SDK quảng cáo: khai báo *Advertising ID* trong Data safety. Nếu không định dùng quảng cáo: gỡ plugin trước khi phát hành (xem mục Quảng cáo). |

### Apple — App Privacy (nutrition label)
- *Identifiers → Device ID* (không liên kết danh tính, không tracking) · *User Content → Other User Content* (lời nguyện)
  · *Other Data* (biệt danh). **Data Used to Track You: None.** Không cần ATT prompt khi không có quảng cáo.
- Privacy manifest (`PrivacyInfo.xcprivacy`): Capacitor 8 & plugin chính thức đã kèm manifest cho API "required reason";
  kiểm tra lại cảnh báo khi upload.

## 3. Phân loại độ tuổi

- **Google Play (IARC)**: trả lời bảng câu hỏi trung thực → kỳ vọng **PEGI 3 / ESRB Everyone**, khai
  *"Users can interact / share user-generated content"* (nhãn "Users Interact"). Không có bạo lực, cờ bạc, mua hàng.
- **Apple**: chọn **12+**. Lý do: app có UGC công khai không kiểm duyệt trước từng tin; Apple thường từ chối 4+/9+ cho
  app có giao tiếp người lạ nếu không có kiểm duyệt trước. 12+ an toàn hơn khi duyệt và vẫn không bị hạn chế với người lớn.
  Trong câu hỏi "Unrestricted Web Access" trả lời **No** (app không mở trình duyệt tự do). Nếu sau này tắt UGC trên iOS
  có thể hạ xuống 4+.
- Không đánh dấu "Gambling / Simulated gambling": xin xăm không có cược, không có phần thưởng, không có tiền.

## 4. Định vị nội dung — tránh bị từ chối

- **Xin xăm** = gợi ý suy ngẫm (reflective prompt). Không dùng từ "bói", "tiên tri", "dự đoán vận mệnh", "may mắn đảm bảo"
  trong listing/ảnh chụp. Trong app có dòng chú thích "chỉ để suy ngẫm".
- **Không có tiền cúng dường/quyên góp**, không bán "lộc", "may mắn", không mua Hạt sen bằng tiền thật
  (Hạt sen chỉ kiếm bằng nghi thức). Apple 3.2.1(vi) & Play Payments: quyên góp trong app có nhiều ràng buộc — ta không làm.
- **Quảng cáo**: chỉ quảng cáo **có thưởng, người chơi tự bấm xem** (+5 Hạt sen, tối đa 3 lần/ngày), SDK AdMob đã tích hợp
  (`src/ads/rewarded.ts`), **tắt mặc định** (`VITE_ADS_ENABLED=false`), chỉ trên app điện thoại, chỉ **ID thử nghiệm** của Google,
  yêu cầu quảng cáo không cá nhân hóa (`npa`). Không bao giờ hiện ở chính điện, thiền đường hay khi đang làm nghi thức.
  - App ID thử nghiệm đã khai báo sẵn (bắt buộc, thiếu là app crash khi mở): Android `AndroidManifest.xml`
    (`com.google.android.gms.ads.APPLICATION_ID`), iOS `Info.plist` (`GADApplicationIdentifier`, `SKAdNetworkItems`).
  - **Muốn bật thật**: tạo App ID + ad unit thật, thay trong `src/config.ts` (`ADMOB_TEST_IDS` → ID thật, bỏ `isTesting`)
    và trong manifest/Info.plist; build với `VITE_ADS_ENABLED=true`; cập nhật Data safety (*Contains ads*), App Privacy,
    ATT (iOS, nếu dùng quảng cáo cá nhân hóa) và UMP consent (EU/UK). Phân loại nội dung quảng cáo phù hợp mọi lứa tuổi.
  - **Không dùng quảng cáo**: `npm uninstall @capacitor-community/admob`, xóa `src/ads/` + nút trong `src/ui/hud.ts`,
    gỡ meta-data/Info.plist ở trên, `npx cap sync` — khi đó Data safety không cần khai báo Advertising ID.
- Ngôi chùa là hư cấu; không dùng tên/logo chùa thật, không dùng hình tượng có bản quyền.
- Tôn trọng: không gamify quá đà nghi lễ (không bảng xếp hạng thắp hương...).

## 5. Quyền & plugin Capacitor

| Plugin | Android | iOS |
|---|---|---|
| `@capacitor/haptics` | `VIBRATE` (plugin tự merge vào manifest) | không cần |
| `@capacitor-community/keep-awake` | không cần (FLAG_KEEP_SCREEN_ON) | không cần |
| `@capacitor/share` | dùng FileProvider (có sẵn trong template) | không cần; nếu chia sẻ "Lưu ảnh" iOS cần `NSPhotoLibraryAddUsageDescription` → thêm vào `Info.plist`: "Lưu ảnh khoảnh khắc ở chùa vào Thư viện ảnh." |
| `@capacitor/filesystem` | chỉ ghi Cache của app — không cần quyền bộ nhớ | không cần |
| `@capacitor/status-bar`, `splash-screen`, `app` | không | không |

Hướng: chỉ dọc (Android `screenOrientation="portrait"`, iOS Info.plist chỉ `Portrait`).
`INTERNET` có sẵn. **Không** xin vị trí, camera, micro, danh bạ.

## 6. Android — build & ký

### Tạo keystore (một lần, giữ bí mật, sao lưu!)
```bash
keytool -genkeypair -v -keystore chua-an-nhien-release.jks -alias chuaannhien \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 chua-an-nhien-release.jks > keystore.b64   # macOS: base64 -i ... -o keystore.b64
```
GitHub → Settings → Secrets and variables → Actions:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

`app/android/app/build.gradle` đọc biến môi trường `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Không có → bản release **unsigned**.
Khuyến nghị bật **Play App Signing**: keystore trên chỉ là *upload key*.

### CI
`.github/workflows/app-android.yml` (push vào `app/**` hoặc chạy tay): Node 22 + JDK 21 + Android SDK →
`npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleDebug assembleRelease bundleRelease`.
Artifact: `chua-an-nhien-debug-apk` (cài thử), `chua-an-nhien-release-{signed|unsigned}` (APK + AAB).

### Build máy local
```bash
cd app
npm run cap:sync
npm run android:apk                     # debug APK: android/app/build/outputs/apk/debug/
export ANDROID_KEYSTORE_PATH=$PWD/../chua-an-nhien-release.jks ANDROID_KEYSTORE_PASSWORD=... \
       ANDROID_KEY_ALIAS=chuaannhien ANDROID_KEY_PASSWORD=...
cd android && ./gradlew bundleRelease   # AAB: app/build/outputs/bundle/release/app-release.aab
```
Hoặc `npx cap open android` để mở Android Studio.

### Play Console
- [ ] Tạo app, ngôn ngữ mặc định vi-VN; danh mục **Lifestyle** (hoặc Health & Fitness › thiền).
- [ ] Internal testing → Closed testing (tài khoản cá nhân mới: ≥12 tester trong 14 ngày) → Production.
- [ ] App content: Privacy policy, Ads = **No**, App access (không cần đăng nhập), Content rating, Target audience
      (13+ để tránh chính sách Families khi có UGC), Data safety, Data deletion, Government apps = No.
- [ ] Target SDK: 36 (template Capacitor 8) — đáp ứng yêu cầu target API của Play.

## 7. iOS — build trên macOS

Yêu cầu: macOS + Xcode 16+ (Capacitor 8 dùng **Swift Package Manager**, không cần CocoaPods), tài khoản Apple Developer.
```bash
cd app
npm ci && npm run cap:sync
npx cap open ios          # mở ios/App/App.xcodeproj
```
Trong Xcode:
1. Target **App** → Signing & Capabilities → chọn Team, bundle ID `vn.chuaannhien.app`.
2. General → Version/Build; Deployment target theo Capacitor 8 (iOS 15+).
3. Kiểm tra Info.plist: chỉ Portrait; `CFBundleDisplayName` = "Chùa An Nhiên"; `ITSAppUsesNonExemptEncryption` = NO
   (chỉ dùng HTTPS chuẩn).
4. Product → Archive → Distribute App → App Store Connect → Upload. Thử qua TestFlight.

App Store Connect:
- [ ] Privacy Policy URL, Support URL, App Privacy, Age rating 12+, danh mục **Lifestyle** (phụ: Health & Fitness).
- [ ] Ghi chú cho reviewer (App Review Notes): "Không cần đăng nhập. Tính năng trực tuyến: thả đèn với lời nguyện công khai
      24h, có lọc từ ngữ client+server, nút Báo cáo và Chặn trên mỗi đèn, nút Xóa dữ liệu trong Cài đặt. Xin xăm chỉ là gợi ý
      suy ngẫm, không có cược/tiền. Không có giao dịch tiền thật."

## 8. Gợi ý nội dung store

**Tên**: Chùa An Nhiên — Đi chùa online (vi) · Chùa An Nhiên — Calm Pagoda Visit (en)

**Mô tả ngắn (≤80 ký tự)**
- vi: Thắp hương, thỉnh chuông, thả đèn hoa đăng và ngồi thiền trong ngôi chùa yên bình.
- en: Light incense, ring the bell, float lanterns and meditate in a peaceful pagoda.

**Mô tả dài (vi)**
> Ghé thăm Chùa An Nhiên — một ngôi chùa Việt hư cấu nép mình bên sông, mở cửa mọi lúc cho những phút giây tĩnh lặng.
> • Thắp hương, gõ mõ, thỉnh chuông với âm thanh mộc mạc.
> • Thả đèn hoa đăng gửi lời nguyện an lành, cùng ngắm đèn của những người đang viếng chùa.
> • Ngồi thiền với hơi thở dẫn dắt, lần chuỗi 108 hạt.
> • Xin một quẻ xăm như lời nhắc để suy ngẫm (không phải bói toán).
> • Âm lịch, ngày rằm mùng một, nhật ký tâm an.
> Không quảng cáo. Không cần tài khoản. Không có giao dịch tiền thật.

**Long description (en)**
> Visit Chùa An Nhiên — a fictional Vietnamese pagoda by the river, open anytime for a quiet moment.
> Light incense, strike the wooden fish, ring the temple bell, float lotus lanterns with kind wishes and see lanterns
> from other visitors, meditate with guided breathing, and draw a verse as a gentle prompt for reflection (not
> fortune‑telling). Lunar calendar and a calm journal included. No ads, no account, no real‑money purchases.

**Từ khóa (iOS, ≤100 ký tự)**: `chùa,thiền,thắp hương,hoa đăng,chánh niệm,an yên,âm lịch,pagoda,meditation,mindfulness`

## 9. Ảnh chụp màn hình (9:16 dọc)

Android: điện thoại 1080×1920 (tối thiểu 2, nên 6–8) + Feature graphic 1024×500.
iOS: 6.9" (1320×2868) bắt buộc; iPad 13" (2064×2752) nếu bật iPad.

1. Cổng chùa lúc hoàng hôn + tiêu đề "Một chốn an yên, mở cửa mọi lúc".
2. Chính điện — thắp hương, khói bay.
3. Thỉnh chuông / gõ mõ.
4. Bờ sông đêm rằm với đèn hoa đăng của nhiều người.
5. Ngồi thiền — vòng thở.
6. Xin xăm — quẻ với chú thích "lời nhắc để suy ngẫm".
7. Âm lịch / Hôm nay & nhiệm vụ nhẹ nhàng.
8. Ảnh chia sẻ khoảnh khắc.

Không chèn chữ "bói", "may mắn", "cầu tài lộc" lên ảnh. Không hiện lời nguyện thật của người dùng — dùng dữ liệu mẫu.

## 10. Checklist trước khi nộp

- [ ] Chạy trên máy thật Android (API 24 & mới nhất) và iPhone; nút Back Android (`can:back`) đóng modal/quay lại.
- [ ] Offline vẫn vào chùa được; online lỗi không crash.
- [ ] Splash ẩn sau khi game sẵn sàng (`initNative()` → `SplashScreen.hide`).
- [ ] Báo cáo/chặn/xóa dữ liệu hoạt động với server thật.
- [ ] `VITE_ADS_ENABLED=false` (mặc định). Bản build có SDK AdMob nhưng không hiện quảng cáo — khai báo Advertising ID, hoặc gỡ plugin nếu không dùng.
- [ ] Privacy policy & email liên hệ là thật.

## Thông báo nhắc mùng 1 / rằm (Local Notifications)
- Mặc định **tắt**; người dùng tự bật trong Cài đặt → app xin quyền thông báo (Android 13+: `POST_NOTIFICATIONS`,
  iOS: hộp thoại cho phép thông báo). Lịch ~24 lần nhắc (khoảng 1 năm), 6:30 sáng giờ VN, lên lại mỗi lần mở app.
- Nội dung chỉ mời ghé thắp hương / thở chậm — không thúc ép, không hứa linh ứng. Không dùng thông báo đẩy từ server.
- Data safety / App Privacy: thông báo cục bộ, không thu thập thêm dữ liệu.
