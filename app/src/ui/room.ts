import { AREA_INFO, isAreaId } from '../core/areas';
import { t } from '../core/i18n';
import { PUBLIC_URL } from '../config';
import { net } from '../net/service';
import { h, openSheet, toast } from './dom';

export function roomInviteUrl(code: string): string {
  return `${PUBLIC_URL}/?room=${code}`;
}

/** Bảng "Đi chùa cùng gia đình": tạo / vào phòng riêng, xem người thân đang ở khu nào. */
export function openRoom(): void {
  const s = openSheet(t('room.title'));
  const render = () => {
    s.body.replaceChildren(h('p', { class: 'muted' }, t('room.hint')));
    if (net.status !== 'online') {
      s.body.append(h('p', {}, t('room.offline')));
      return;
    }
    const r = net.room;
    if (!r) {
      const input = h('input', {
        class: 'textarea',
        style: { minHeight: '48px', textTransform: 'uppercase', letterSpacing: '0.2em', maxWidth: '220px' },
        maxlength: 6,
        placeholder: t('room.codePh'),
        'aria-label': t('room.codePh'),
      }) as HTMLInputElement;
      s.body.append(
        h('section', {}, h('button', { class: 'btn primary', onclick: () => net.createRoom() }, '🏠 ' + t('room.create'))),
        h(
          'section',
          { class: 'row' },
          input,
          h('button', { class: 'btn', onclick: () => (net.joinRoom(input.value) ? undefined : toast(t('room.bad'))) }, t('room.join')),
        ),
      );
      return;
    }
    const ul = h('ul', { class: 'list' });
    for (const m of r.members) {
      const area = isAreaId(m.area) ? t(AREA_INFO[m.area].nameKey) : String(m.area);
      ul.append(h('li', {}, h('span', {}, '🪷 ' + m.nickname + (m.userId === net.userId ? ' ' + t('room.you') : '')), h('span', { class: 'muted' }, area)));
    }
    s.body.append(
      h('section', {}, h('div', { class: 'muted' }, t('room.code')), h('div', { class: 'big-date', style: { letterSpacing: '0.25em' } }, r.code)),
      h(
        'section',
        { class: 'row' },
        h(
          'button',
          {
            class: 'btn primary',
            onclick: async () => {
              const url = roomInviteUrl(r.code);
              const text = `${t('share.inviteText')} (${t('room.code')}: ${r.code})`;
              try {
                if (navigator.share) await navigator.share({ title: t('room.title'), text, url });
                else {
                  await navigator.clipboard.writeText(`${text} ${url}`);
                  toast(t('share.copied'));
                }
              } catch {
                /* hủy */
              }
            },
          },
          '💌 ' + t('room.invite'),
        ),
        h('button', { class: 'btn', onclick: () => net.leaveRoom() }, t('room.leave')),
      ),
      h('section', {}, h('h3', {}, t('room.members')), ul),
    );
  };
  render();
  const off = net.subscribe((e) => {
    if (e.type === 'room' || e.type === 'status') {
      if (!document.body.contains(s.el)) return off();
      render();
    }
  });
}
