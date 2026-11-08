import { PUBLIC_URL } from '../config';
import { getLang, t } from '../core/i18n';
import { store } from '../core/store';
import { todayInfo } from '../core/today';
import type { QueXam } from '../data/content';
import { interpretationFor } from '../logic/fortune';
import { formatLunar } from '../lunar/lunar';
import { toast } from '../ui/dom';
import { drawShareCard, type ShareKind } from './card';

/** Link mời "Đi chùa cùng mình" — mở thẳng ra bờ sông thả đèn. */
export function inviteUrl(): string {
  return `${PUBLIC_URL}/?invite=1#bo-song`;
}

async function nativeShare(opts: { title: string; text: string; url: string; dataUrl?: string }): Promise<boolean> {
  try {
    const mod = await import('../native');
    if (!mod.isNative()) return false;
    await mod.nativeShare({ title: opts.title, text: opts.text, url: opts.url, files: opts.dataUrl ? [opts.dataUrl] : undefined });
    return true;
  } catch {
    return false;
  }
}

export async function shareInvite(): Promise<void> {
  const url = inviteUrl();
  const text = t('share.inviteText');
  if (await nativeShare({ title: t('share.invite'), text, url })) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: t('share.invite'), text, url });
      return;
    } catch {
      /* người dùng hủy */
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast(t('share.copied'));
  } catch {
    toast(url, 6000);
  }
}

export async function shareCard(data: ShareKind): Promise<void> {
  const canvas = document.createElement('canvas');
  drawShareCard(canvas, data, PUBLIC_URL);
  const dataUrl = canvas.toDataURL('image/png');
  const url = inviteUrl();
  const title = t('app.name');
  const text = data.kind === 'lantern' ? t('share.inviteText') : t('app.tagline');
  // Web: gọi navigator.share ngay (đồng bộ từ dataURL) để không mất "user gesture" trên iOS Safari
  const isNativeApp = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  if (!isNativeApp) {
    const bin = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], `chua-an-nhien-${data.kind}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title, text: `${text} ${url}` });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return; // người dùng hủy
        // lỗi khác (NotAllowedError…) → tải ảnh xuống bên dưới
      }
    }
  } else if (await nativeShare({ title, text, url, dataUrl })) return;
  // Dự phòng: tải ảnh xuống
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `chua-an-nhien-${data.kind}.png`;
  document.body.append(a);
  a.click();
  a.remove();
}

interface ShareDetail {
  kind: 'fortune' | 'lantern' | 'streak' | 'invite';
  que?: QueXam;
  topic?: string;
  text?: string;
  color?: string;
  streak?: number;
}

export function installShare(): void {
  window.addEventListener('can:share', (e) => {
    const d = (e as CustomEvent<ShareDetail>).detail;
    if (!d) return;
    if (d.kind === 'invite') return void shareInvite();
    if (d.kind === 'fortune' && d.que) {
      return void shareCard({
        kind: 'fortune',
        title: d.que.tieuDe,
        poem: d.que.tho,
        meaning: interpretationFor(d.que, d.topic ?? ''),
        advice: d.que.loiKhuyen,
        disclaimer: t('fortune.disclaimer'),
      });
    }
    if (d.kind === 'lantern') {
      return void shareCard({ kind: 'lantern', text: d.text ?? '', color: d.color ?? 'vang', nickname: store.state.nickname });
    }
    if (d.kind === 'streak') {
      const info = todayInfo();
      const n = d.streak ?? 0;
      const label = getLang() === 'vi' ? (n === 1 ? 'ngày an lạc' : 'ngày an lạc liên tiếp') : n === 1 ? 'peaceful day' : 'peaceful days in a row';
      return void shareCard({ kind: 'streak', streak: n, lunar: formatLunar(info.lunar, getLang()), message: info.message, label });
    }
  });
}
