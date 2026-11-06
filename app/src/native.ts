/**
 * Cầu nối Capacitor (Android/iOS). Trên web mọi hàm đều là no-op an toàn.
 * Các plugin được nạp bằng `import()` động để bundle web không phải tải chúng.
 */

type CapGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export function isNative(): boolean {
  return !!(window as unknown as { Capacitor?: CapGlobal }).Capacitor?.isNativePlatform?.();
}

export function nativePlatform(): 'android' | 'ios' | 'web' {
  const p = (window as unknown as { Capacitor?: CapGlobal }).Capacitor?.getPlatform?.();
  return p === 'android' || p === 'ios' ? p : 'web';
}

function isCancel(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return msg.includes('cancel') || msg.includes('abort');
}

/** Ghi data URL ảnh vào thư mục Cache để chia sẻ qua share sheet. Trả về file URI. */
async function writeDataUrlToCache(dataUrl: string, idx: number): Promise<string | null> {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m || !m[2]) return null;
  const mime = m[1] ?? 'image/png';
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const res = await Filesystem.writeFile({
    path: `share/chua-an-nhien-${Date.now()}-${idx}.${ext}`,
    data: m[3],
    directory: Directory.Cache,
    recursive: true,
  });
  return res.uri;
}

/**
 * Mở share sheet gốc. `files` là các data URL (ảnh) — được ghi tạm vào Cache rồi chia sẻ.
 * Người dùng huỷ chia sẻ không bị coi là lỗi. Lỗi khác được ném ra để nơi gọi tự fallback.
 */
export async function nativeShare(o: { title: string; text: string; url: string; files?: string[] }): Promise<void> {
  const { Share } = await import('@capacitor/share');
  let files: string[] | undefined;
  if (o.files?.length) {
    try {
      const uris = await Promise.all(o.files.map((f, i) => writeDataUrlToCache(f, i)));
      files = uris.filter((u): u is string => !!u);
      if (!files.length) files = undefined;
    } catch {
      files = undefined; // không ghi được ảnh -> chia sẻ chữ + link
    }
  }
  try {
    await Share.share({
      title: o.title,
      text: o.text,
      url: o.url || undefined,
      files,
      dialogTitle: o.title,
    });
  } catch (e) {
    if (isCancel(e)) return;
    throw e;
  }
}

/** Giữ màn hình sáng (ngồi thiền / tụng kinh). */
export async function keepAwake(on: boolean): Promise<void> {
  if (!isNative()) {
    await webWakeLock(on);
    return;
  }
  try {
    const { KeepAwake } = await import('@capacitor-community/keep-awake');
    if (on) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    /* ignore */
  }
}

type Sentinel = { release: () => Promise<void>; addEventListener?: (t: 'release', cb: () => void) => void };
let wakeLock: Sentinel | null = null;
let wantAwake = false;
let visHooked = false;
async function webWakeLock(on: boolean): Promise<void> {
  wantAwake = on;
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
  if (!visHooked && typeof document !== 'undefined') {
    visHooked = true;
    // trình duyệt tự nhả khóa khi ẩn tab → xin lại khi quay về nếu vẫn đang thiền
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wantAwake && !wakeLock) void webWakeLock(true);
    });
  }
  try {
    if (on && nav.wakeLock && !wakeLock) {
      const s = await nav.wakeLock.request('screen');
      if (!wantAwake) {
        await s.release();
        return;
      }
      wakeLock = s;
      s.addEventListener?.('release', () => {
        if (wakeLock === s) wakeLock = null;
      });
    } else if (!on && wakeLock) {
      const s = wakeLock;
      wakeLock = null;
      await s.release();
    }
  } catch {
    wakeLock = null;
  }
}

/** Rung nhẹ (thỉnh chuông, gõ mõ...). */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNative()) {
    try {
      navigator.vibrate?.(style === 'heavy' ? 30 : style === 'medium' ? 18 : 10);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    /* ignore */
  }
}

let inited = false;

/**
 * Khởi tạo khi chạy native: thanh trạng thái tối, ẩn splash, nút Back Android
 * phát sự kiện `can:back` (app tự quyết: đóng modal / về cảnh trước; gọi `exitApp()` nếu ở màn chính).
 */
export async function initNative(): Promise<void> {
  if (inited || !isNative()) return;
  inited = true;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (nativePlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#1a120c' });
    }
  } catch {
    /* ignore */
  }

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('backButton', () => {
      window.dispatchEvent(new CustomEvent('can:back'));
    });
    await App.addListener('appStateChange', ({ isActive }) => {
      window.dispatchEvent(new CustomEvent('can:appstate', { detail: { active: isActive } }));
    });
  } catch {
    /* ignore */
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch {
    /* ignore */
  }
}

/** Thoát app (Android) — dùng khi nhận `can:back` ở màn hình gốc. */
export async function exitApp(): Promise<void> {
  if (!isNative()) return;
  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch {
    /* ignore */
  }
}

// ---------- Nhắc nhẹ mùng 1 / rằm (Local Notifications, người dùng tự bật) ----------
const REMINDER_ID_BASE = 7000;

export interface ReminderNotice {
  at: Date;
  title: string;
  body: string;
}

/** Lên lịch lại toàn bộ lời nhắc (hủy lịch cũ trước). Trả về false nếu không có quyền / không phải app. */
export async function scheduleReminders(list: ReminderNotice[]): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    await cancelReminders();
    const now = Date.now();
    await LocalNotifications.schedule({
      notifications: list
        .filter((n) => n.at.getTime() > now)
        .map((n, i) => ({ id: REMINDER_ID_BASE + i, title: n.title, body: n.body, schedule: { at: n.at } })),
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= REMINDER_ID_BASE && n.id < REMINDER_ID_BASE + 100);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch {
    /* ignore */
  }
}
