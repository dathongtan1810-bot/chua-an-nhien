import { nextLunarReminders, reminderTime } from '../logic/reminders';
import { vnDateKey } from '../logic/dates';
import { getLang } from './i18n';
import { store } from './store';
import { getThongBao, type ThongBao } from '../data/content';

/**
 * Lời nhắc hiền hòa — không thúc ép, không hứa hẹn. Dùng câu của phiên nội dung (thong-bao-day.json, loại
 * `mung-1` / `ram`, xoay vòng) nếu có; `{nickname}` được thay bằng biệt danh.
 */
export function reminderNotices(fromKey = vnDateKey(), count = 24, texts: ThongBao[] = [], nickname = '') {
  const vi = getLang() === 'vi';
  const byKind: Record<string, ThongBao[]> = { 'mung-1': [], ram: [] };
  for (const b of texts) if (b.loai in byKind) byKind[b.loai].push(b);
  const used: Record<string, number> = { 'mung-1': 0, ram: 0 };
  const fill = (s: string) => s.split('{nickname}').join(nickname || (vi ? 'bạn' : 'friend'));
  return nextLunarReminders(fromKey, count).map((r) => {
    const pool = byKind[r.kind];
    if (pool.length) {
      const b = pool[used[r.kind]++ % pool.length];
      return { at: reminderTime(r.dateKey), title: fill(b.tieuDe), body: fill(b.noiDung) };
    }
    const m = r.lunarMonth + (r.leap ? (vi ? ' nhuận' : ' (leap)') : '');
    const title = vi ? (r.kind === 'mung-1' ? `Mùng 1 tháng ${m}` : `Rằm tháng ${m}`) : r.kind === 'mung-1' ? `New moon, lunar month ${m}` : `Full moon, lunar month ${m}`;
    const body = vi
      ? 'Một khoảng lặng nhỏ: ghé Chùa An Nhiên thắp nén hương, thở chậm vài nhịp nhé.'
      : 'A small quiet moment: visit An Nhien Pagoda, light incense and breathe slowly.';
    return { at: reminderTime(r.dateKey), title, body };
  });
}

/** Áp dụng cài đặt nhắc: bật → lên lịch ~1 năm tới; tắt → hủy. */
export async function applyReminders(on: boolean): Promise<boolean> {
  const native = await import('../native');
  if (!on) {
    await native.cancelReminders();
    return true;
  }
  const texts = await getThongBao(getLang());
  return native.scheduleReminders(reminderNotices(vnDateKey(), 24, texts, store.state.nickname));
}
