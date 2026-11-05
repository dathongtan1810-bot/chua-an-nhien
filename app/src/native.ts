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

let wakeLock: { release: () => Promise<void> } | null = null;
async function webWakeLock(on: boolean): Promise<void> {
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
  try {
    if (on && nav.wakeLock && !wakeLock) wakeLock = await nav.wakeLock.request('screen');
    else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
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
