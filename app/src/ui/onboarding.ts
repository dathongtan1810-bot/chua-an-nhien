import { t, tOr } from '../core/i18n';
import { h, uiRoot } from './dom';

interface Step {
  icon: string;
  title: string;
  body: string;
}

/** Các bước giới thiệu: 1–3 lấy chữ của phiên nội dung (content/giao-dien.json), bước 4 của app (dòng sông thả đèn). */
export function onboardingSteps(): Step[] {
  return [
    { icon: '🪷', title: tOr('onboarding.1-tieu-de', 'Chào mừng đến Chùa An Nhiên'), body: tOr('onboarding.1-mo-ta', t('app.tagline')) },
    { icon: '🪔', title: tOr('onboarding.2-tieu-de', 'Thắp hương, thỉnh chuông, gõ mõ'), body: tOr('onboarding.2-mo-ta', '') },
    { icon: '🎋', title: tOr('onboarding.3-tieu-de', t('act.fortune')), body: tOr('onboarding.3-mo-ta', t('fortune.disclaimer')) },
    { icon: '🏮', title: t('onboarding.river-title'), body: t('onboarding.river-body') },
  ];
}

/** Màn giới thiệu lần đầu (hộp thoại, bàn phím: ←/→, Esc = bỏ qua). Gọi onDone khi xong hoặc bỏ qua. */
export function showOnboarding(onDone: () => void): void {
  const steps = onboardingSteps();
  let i = 0;
  const icon = h('div', { class: 'onb-icon', 'aria-hidden': 'true' });
  const title = h('h2', { id: 'onb-title' });
  const body = h('p', {});
  const dots = h('div', { class: 'onb-dots', 'aria-hidden': 'true' });
  const skip = h('button', { class: 'btn ghost', onclick: () => finish() }, tOr('onboarding.bo-qua', 'Bỏ qua'));
  const next = h('button', { class: 'btn primary', onclick: () => go(1) });
  const card = h(
    'section',
    { class: 'onb-card card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'onb-title' },
    icon,
    title,
    body,
    dots,
    h('div', { class: 'row between' }, skip, next),
  );
  const wrap = h('div', { class: 'onb-wrap' }, card);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') finish();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  const render = () => {
    const s = steps[i];
    icon.textContent = s.icon;
    title.textContent = s.title;
    body.textContent = s.body;
    dots.replaceChildren(...steps.map((_, k) => h('span', { class: k === i ? 'on' : '' })));
    next.textContent = i === steps.length - 1 ? tOr('onboarding.bat-dau', 'Bắt đầu') : tOr('onboarding.tiep', 'Tiếp');
    next.focus();
  };
  const go = (d: number) => {
    if (d > 0 && i === steps.length - 1) return finish();
    i = Math.max(0, Math.min(steps.length - 1, i + d));
    render();
  };
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.removeEventListener('keydown', onKey);
    wrap.remove();
    onDone();
  };
  document.addEventListener('keydown', onKey);
  uiRoot().append(wrap);
  render();
}
