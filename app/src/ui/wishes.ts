import { getLang, t } from '../core/i18n';
import { vnDateKey, weekKey } from '../logic/dates';
import { listEntries, updateEntry, type JournalEntry } from '../storage/journal';
import { h, openSheet } from './dom';

const SWATCH: Record<string, string> = { hong: '#f28bb0', vang: '#f6c453', trang: '#f4efe4', xanh: '#7cc4c9', tim: '#b48be0' };

export interface WishWeek {
  week: string; // khóa thứ Hai (YYYY-MM-DD, giờ VN)
  wishes: JournalEntry[];
}

/** Nhóm lời nguyện (mục nhật ký 'lantern') theo tuần, tuần mới nhất trước. */
export function groupWishesByWeek(entries: readonly JournalEntry[]): WishWeek[] {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    if (e.kind !== 'lantern' || !e.detail.text) continue;
    const wk = weekKey(vnDateKey(Date.parse(e.at)));
    map.set(wk, [...(map.get(wk) ?? []), e]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([week, wishes]) => ({ week, wishes: wishes.sort((a, b) => (a.at < b.at ? 1 : -1)) }));
}

function weekLabel(week: string): string {
  const thisWeek = weekKey(vnDateKey());
  if (week === thisWeek) return t('wishes.thisWeek');
  const [y, m, d] = week.split('-');
  return t('wishes.weekOf', { d: `${d}/${m}/${y}` });
}

/** "Lời nguyện của tôi": xem lại lời nguyện theo tuần, đánh dấu điều đã thành để biết ơn. */
export function openWishes(): void {
  const s = openSheet(t('wishes.title'));
  const render = (entries: JournalEntry[]) => {
    const weeks = groupWishesByWeek(entries);
    s.body.replaceChildren(h('p', { class: 'muted' }, t('wishes.hint')));
    if (!weeks.length) {
      s.body.append(h('p', {}, t('wishes.empty')));
      return;
    }
    const thisWeek = weeks.find((w) => w.week === weekKey(vnDateKey()));
    const done = (w: JournalEntry[]) => w.filter((e) => e.detail.fulfilledAt).length;
    if (thisWeek) {
      s.body.append(
        h('div', { class: 'message' }, t('wishes.summary', { n: thisWeek.wishes.length, m: done(thisWeek.wishes) })),
      );
    }
    for (const w of weeks) {
      const ul = h('ul', { class: 'list' });
      for (const e of w.wishes) {
        const fulfilled = !!e.detail.fulfilledAt;
        const when = new Date(e.at).toLocaleDateString(getLang() === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
        const btn = h(
          'button',
          {
            class: 'chip' + (fulfilled ? ' active' : ''),
            'aria-pressed': fulfilled ? 'true' : 'false',
            onclick: async () => {
              await updateEntry(e.id!, { fulfilledAt: fulfilled ? '' : vnDateKey() });
              render(await listEntries(500));
            },
          },
          fulfilled ? '🙏 ' + t('wishes.fulfilled') : t('wishes.mark'),
        );
        ul.append(
          h(
            'li',
            { style: { alignItems: 'flex-start' } },
            h(
              'div',
              {},
              h('span', {
                style: {
                  display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', marginRight: '8px',
                  background: SWATCH[String(e.detail.color)] ?? String(e.detail.color ?? '#f6c453'),
                },
                'aria-hidden': 'true',
              }),
              h('span', { class: fulfilled ? 'poem' : '', style: { fontSize: '1em', textAlign: 'left' } }, '“' + String(e.detail.text) + '”'),
              h('div', { class: 'muted' }, when),
            ),
            btn,
          ),
        );
      }
      s.body.append(h('section', {}, h('h3', {}, `${weekLabel(w.week)} · ${done(w.wishes)}/${w.wishes.length}`), ul));
    }
  };
  s.body.append(h('p', {}, '…'));
  void listEntries(500).then(render);
}
