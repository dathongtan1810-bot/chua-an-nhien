import { nextLunarReminders, reminderTime } from '../logic/reminders';
import { vnDateKey } from '../logic/dates';
import { getLang } from './i18n';

/** Lời nhắc hiền hòa — không thúc ép, không hứa hẹn. */
export function reminderNotices(fromKey = vnDateKey(), count = 24) {
  const vi = getLang() === 'vi';
  return nextLunarReminders(fromKey, count).map((r) => {
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
  return native.scheduleReminders(reminderNotices());
}
