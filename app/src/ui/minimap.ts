import { AREAS, AREA_INFO, type AreaId } from '../core/areas';
import { t } from '../core/i18n';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

/** Bản đồ chùa vẽ bằng SVG: các khu nối nhau, khu hiện tại sáng, số người mỗi khu. */
export function mapSvg(
  current: AreaId,
  counts: Partial<Record<AreaId, number>>,
  opts: { large?: boolean; onPick?: (a: AreaId) => void } = {},
): SVGSVGElement {
  const W = 100;
  const svg = el('svg', { viewBox: `0 0 ${W} ${W}`, role: opts.large ? 'group' : 'img', 'aria-label': t('map.title') }) as SVGSVGElement;
  svg.append(el('rect', { x: 2, y: 2, width: 96, height: 96, rx: 10, fill: opts.large ? '#e9dcc0' : 'rgba(40,28,18,0.55)' }));
  // dòng sông & hồ
  svg.append(el('path', { d: 'M60 4 Q 80 30 98 40 L 98 22 Q 82 16 72 4 Z', fill: '#7fa7b5', opacity: 0.7 }));
  svg.append(el('ellipse', { cx: 80, cy: 62, rx: 12, ry: 8, fill: '#8db8a0', opacity: 0.8 }));
  const seen = new Set<string>();
  for (const a of AREAS) {
    for (const b of AREA_INFO[a].links) {
      const k = [a, b].sort().join('|');
      if (seen.has(k)) continue;
      seen.add(k);
      const p = AREA_INFO[a].map;
      const q = AREA_INFO[b].map;
      svg.append(el('line', { x1: p.x * W, y1: p.y * W, x2: q.x * W, y2: q.y * W, stroke: '#b8925a', 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }));
    }
  }
  for (const a of AREAS) {
    const { x, y } = AREA_INFO[a].map;
    const g = el('g', { class: 'mapnode', tabindex: opts.large ? 0 : -1, role: opts.large ? 'button' : 'presentation' });
    if (opts.large) g.setAttribute('aria-label', t(AREA_INFO[a].nameKey));
    const isCur = a === current;
    g.append(el('circle', { cx: x * W, cy: y * W, r: isCur ? 6 : 4.2, fill: isCur ? '#f2cd6b' : '#9e2a1f', stroke: '#fff6e0', 'stroke-width': 1 }));
    if (opts.large) {
      const label = el('text', { x: x * W, y: y * W + 10.5, 'text-anchor': 'middle', 'font-size': 4.6, fill: '#2b1d14', 'font-weight': 600 });
      label.textContent = t(AREA_INFO[a].nameKey);
      g.append(label);
      const n = counts[a] ?? 0;
      if (n > 0) {
        const badge = el('text', { x: x * W + 7, y: y * W - 4, 'font-size': 4, fill: '#3f7d5c', 'font-weight': 700 });
        badge.textContent = '👤' + n;
        g.append(badge);
      }
      const pick = () => opts.onPick?.(a);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') pick();
      });
    }
    svg.append(g);
  }
  return svg;
}
