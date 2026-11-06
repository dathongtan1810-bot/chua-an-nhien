import { t } from '../core/i18n';
/** Tiện ích DOM nhỏ gọn cho overlay HTML. */
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export const uiRoot = (): HTMLElement => document.getElementById('ui') as HTMLElement;

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string, ms = 2600): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    uiRoot().append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el?.classList.remove('show'), ms);
}

export interface ModalHandle {
  el: HTMLElement;
  body: HTMLElement;
  close: () => void;
}

/** Bảng (sheet) trượt từ dưới lên. */
let activeClose: (() => void) | null = null;
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function openSheet(title: string, opts: { onClose?: () => void; className?: string } = {}): ModalHandle {
  const root = uiRoot();
  activeClose?.();
  root.querySelector('.sheet-wrap')?.remove();
  const body = h('div', { class: 'sheet-body' });
  const opener = document.activeElement as HTMLElement | null;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (activeClose === close) activeClose = null;
    opener?.focus?.();
    wrap.classList.add('closing');
    setTimeout(() => wrap.remove(), 220);
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    // Giữ focus trong bảng (a11y): Tab ở phần tử cuối quay về đầu và ngược lại
    const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const cur = document.activeElement;
    if (e.shiftKey && (cur === first || !sheet.contains(cur))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) {
      e.preventDefault();
      first.focus();
    }
  };
  const closeBtn = h('button', { class: 'btn icon close', 'aria-label': t('common.close'), onclick: close }, '✕');
  const sheet = h(
    'section',
    { class: 'sheet ' + (opts.className ?? ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', { class: 'sheet-head' }, h('h2', {}, title), closeBtn),
    body,
  );
  const wrap = h('div', { class: 'sheet-wrap', onclick: (e: Event) => e.target === wrap && close() }, sheet);
  root.append(wrap);
  activeClose = close;
  document.addEventListener('keydown', onKey);
  setTimeout(() => closeBtn.focus(), 50);
  return { el: sheet, body, close };
}

/** Đóng bảng đang mở; trả về true nếu có bảng để đóng. */
export function closeSheet(): boolean {
  if (activeClose) {
    activeClose();
    return true;
  }
  return false;
}
