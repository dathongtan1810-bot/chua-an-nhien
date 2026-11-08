#!/usr/bin/env node
// Sinh toàn bộ icon & splash của Chùa An Nhiên 100% bằng code (SVG -> PNG qua Playwright/Chromium).
// Chạy: npm run icons   (cần Playwright cài global: npm i -g playwright && npx playwright install chromium)
//
// Đầu ra:
//   public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon-180,favicon-32}.png
//   resources/{icon.png (1024), splash.png (2732)}
//   android/app/src/main/res/{mipmap-*,drawable*}/...   (nếu thư mục android/ tồn tại)
//   ios/App/App/Assets.xcassets/{AppIcon.appiconset,Splash.imageset}/... (nếu ios/ tồn tại)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    const req = createRequire(join(globalRoot, 'noop.js'));
    return req('playwright');
  }
}

const BG_DARK = '#1a120c';
const SERIF = `'Noto Serif', 'DejaVu Serif', 'FreeSerif', Georgia, 'Times New Roman', serif`;

/** Định nghĩa gradient dùng chung. */
const DEFS = `
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="70%">
    <stop offset="0" stop-color="#6b2a1b"/>
    <stop offset="0.55" stop-color="#43180f"/>
    <stop offset="1" stop-color="#220c07"/>
  </radialGradient>
  <radialGradient id="moon" cx="50%" cy="45%" r="50%">
    <stop offset="0" stop-color="#fff4d6"/>
    <stop offset="0.75" stop-color="#f6dfa4"/>
    <stop offset="1" stop-color="#e9c47a"/>
  </radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0.55" stop-color="#ffd98a" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd77a"/>
    <stop offset="0.6" stop-color="#e3a63f"/>
    <stop offset="1" stop-color="#b8741f"/>
  </linearGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7c2416"/>
    <stop offset="1" stop-color="#9e3220"/>
  </linearGradient>
  <linearGradient id="door" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe3a0"/>
    <stop offset="1" stop-color="#f0a948"/>
  </linearGradient>
  <linearGradient id="petal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd6e0"/>
    <stop offset="0.55" stop-color="#f39ab4"/>
    <stop offset="1" stop-color="#d2577f"/>
  </linearGradient>
  <linearGradient id="petalBack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f7b3c6"/>
    <stop offset="1" stop-color="#b9446c"/>
  </linearGradient>
</defs>`;

/** Mái cong: dải mái với hai đầu đao vút lên. cx tâm, y = mép dưới giữa, w = nửa bề rộng, h = độ dày. */
function roof(cx, y, w, h) {
  const tipX = w;
  const tipLift = h * 1.25;
  const L = cx - tipX;
  const R = cx + tipX;
  return `
  <path d="M ${L} ${y - tipLift}
           C ${L + w * 0.18} ${y - h * 0.15}, ${cx - w * 0.55} ${y}, ${cx} ${y}
           C ${cx + w * 0.55} ${y}, ${R - w * 0.18} ${y - h * 0.15}, ${R} ${y - tipLift}
           C ${R - w * 0.16} ${y - h * 0.95}, ${cx + w * 0.5} ${y - h * 1.0}, ${cx + w * 0.34} ${y - h * 1.55}
           L ${cx - w * 0.34} ${y - h * 1.55}
           C ${cx - w * 0.5} ${y - h * 1.0}, ${L + w * 0.16} ${y - h * 0.95}, ${L} ${y - tipLift} Z"
        fill="url(#roof)"/>
  <path d="M ${L + w * 0.04} ${y - tipLift * 0.92}
           C ${L + w * 0.2} ${y - h * 0.05}, ${cx - w * 0.55} ${y + h * 0.1}, ${cx} ${y + h * 0.1}
           C ${cx + w * 0.55} ${y + h * 0.1}, ${R - w * 0.2} ${y - h * 0.05}, ${R - w * 0.04} ${y - tipLift * 0.92}"
        fill="none" stroke="#8a2a18" stroke-width="${h * 0.16}" stroke-linecap="round"/>
  <circle cx="${L + h * 0.12}" cy="${y - tipLift - h * 0.12}" r="${h * 0.16}" fill="#ffd77a"/>
  <circle cx="${R - h * 0.12}" cy="${y - tipLift - h * 0.12}" r="${h * 0.16}" fill="#ffd77a"/>
  <rect x="${cx - w * 0.36}" y="${y - h * 1.62}" width="${w * 0.72}" height="${h * 0.14}" rx="${h * 0.07}" fill="#ffe7a8"/>`;
}

/** Hoa sen hồng (tâm cx, đáy y, cỡ s). */
function lotus(cx, y, s) {
  const petal = (angle, len, wid, fill) => `
    <path transform="rotate(${angle} ${cx} ${y})"
          d="M ${cx} ${y}
             C ${cx - wid} ${y - len * 0.35}, ${cx - wid * 0.8} ${y - len * 0.8}, ${cx} ${y - len}
             C ${cx + wid * 0.8} ${y - len * 0.8}, ${cx + wid} ${y - len * 0.35}, ${cx} ${y} Z"
          fill="${fill}" stroke="#fbe1e8" stroke-opacity="0.55" stroke-width="${s * 0.012}"/>`;
  return `
  <g>
    ${petal(-62, s * 0.78, s * 0.2, 'url(#petalBack)')}
    ${petal(62, s * 0.78, s * 0.2, 'url(#petalBack)')}
    ${petal(-34, s * 0.95, s * 0.24, 'url(#petal)')}
    ${petal(34, s * 0.95, s * 0.24, 'url(#petal)')}
    ${petal(0, s * 1.08, s * 0.27, 'url(#petal)')}
    <ellipse cx="${cx}" cy="${y + s * 0.02}" rx="${s * 0.62}" ry="${s * 0.07}" fill="#3e7a4f" opacity="0.9"/>
    <ellipse cx="${cx}" cy="${y + s * 0.0}" rx="${s * 0.5}" ry="${s * 0.04}" fill="#5a9a68" opacity="0.8"/>
  </g>`;
}

/**
 * Biểu tượng chính trên hệ toạ độ 1024×1024.
 * Nội dung nằm gọn trong vùng ~ [150..874] × [150..880].
 */
function emblem() {
  return `
  <!-- trăng rằm -->
  <circle cx="512" cy="372" r="300" fill="url(#halo)"/>
  <circle cx="512" cy="372" r="215" fill="url(#moon)" opacity="0.95"/>
  <circle cx="452" cy="322" r="26" fill="#e8c983" opacity="0.35"/>
  <circle cx="586" cy="420" r="18" fill="#e8c983" opacity="0.3"/>
  <circle cx="560" cy="300" r="11" fill="#e8c983" opacity="0.3"/>

  <!-- thân chùa -->
  <rect x="300" y="560" width="424" height="118" fill="url(#wall)"/>
  <rect x="300" y="560" width="424" height="14" fill="#5a1a10" opacity="0.6"/>
  ${[330, 410, 614, 694].map((x) => `<rect x="${x - 7}" y="572" width="14" height="106" fill="#c8862e" opacity="0.85"/>`).join('')}
  <path d="M 470 678 L 470 622 Q 512 586 554 622 L 554 678 Z" fill="url(#door)"/>
  <rect x="384" y="398" width="256" height="76" fill="url(#wall)"/>
  <rect x="490" y="414" width="44" height="48" rx="22" fill="url(#door)"/>

  <!-- mái cong hai tầng -->
  ${roof(512, 566, 372, 58)}
  ${roof(512, 404, 236, 46)}

  <!-- ngọc trên nóc -->
  <path d="M 462 330 Q 486 296 512 318 Q 538 296 562 330" fill="none" stroke="#9e3220" stroke-width="10" stroke-linecap="round"/>
  <circle cx="512" cy="298" r="18" fill="#d9532c" stroke="#ffd77a" stroke-width="5"/>

  <!-- bậc thềm -->
  <rect x="270" y="676" width="484" height="18" rx="6" fill="#c8862e"/>
  <rect x="240" y="692" width="544" height="16" rx="6" fill="#9b6322"/>

  <!-- mặt nước gợn -->
  <path d="M 230 742 Q 300 730 370 742 T 510 742 T 650 742 T 794 742" fill="none" stroke="#ffd77a" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>

  <!-- hoa sen -->
  ${lotus(512, 868, 150)}`;
}

/**
 * SVG icon.
 * @param {number} size  kích thước PNG
 * @param {'square'|'round'|'full'|'none'} shape  nền
 * @param {number} scale tỉ lệ thu nhỏ emblem quanh tâm
 */
function iconSvg(size, shape, scale = 1) {
  let bg = '';
  if (shape === 'square') bg = `<rect x="0" y="0" width="1024" height="1024" rx="224" fill="url(#bg)"/>`;
  else if (shape === 'round') bg = `<circle cx="512" cy="512" r="512" fill="url(#bg)"/>`;
  else if (shape === 'full') bg = `<rect x="0" y="0" width="1024" height="1024" fill="url(#bg)"/>`;
  // emblem có tâm thị giác ~ (512, 545) -> dời về giữa
  const t = `translate(512 512) scale(${scale}) translate(-512 -515)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  ${DEFS}${bg}<g transform="${t}">${emblem()}</g></svg>`;
}

/** Splash: nền nâu sẫm, emblem tròn ở giữa + chữ "Chùa An Nhiên". */
function splashHtml(w, h) {
  const m = Math.min(w, h);
  // trên màn vuông 2732 (iOS aspect-fill sang dọc), giữ nội dung trong ~40% giữa
  const em = Math.round(m * (w === h ? 0.3 : 0.46));
  const fontPx = Math.round(em * 0.17);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
  body{background:radial-gradient(circle at 50% 45%, #3a2216 0%, ${BG_DARK} ${Math.round(m * 0.5)}px);
       display:flex;flex-direction:column;align-items:center;justify-content:center;}
  .t{font-family:${SERIF};color:#f3d58f;font-size:${fontPx}px;letter-spacing:${fontPx * 0.04}px;
     margin-top:${Math.round(em * 0.12)}px;text-shadow:0 0 ${fontPx * 0.4}px rgba(255,200,120,.35);white-space:nowrap}
  .s{font-family:${SERIF};color:#c9a571;opacity:.75;font-size:${Math.round(fontPx * 0.42)}px;
     letter-spacing:${fontPx * 0.12}px;margin-top:${Math.round(fontPx * 0.35)}px;white-space:nowrap}
  </style></head><body>
  ${iconSvg(em, 'round', 0.86)}
  <div class="t">Chùa An Nhiên</div>
  <div class="s">TÂM AN · NHIÊN TĨNH</div>
  </body></html>`;
}

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

async function main() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  async function renderHtml(html, w, h, out, transparent = false) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
    for (const o of [].concat(out)) {
      ensureDir(o);
      writeFileSync(o, buf);
      console.log('  ✓', o.replace(ROOT + '/', ''), `${w}×${h}`);
    }
  }
  const svgPage = (svg) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  const icon = (size, shape, scale, out) => renderHtml(svgPage(iconSvg(size, shape, scale)), size, size, out, true);

  const P = (...a) => join(ROOT, ...a);

  console.log('Web/PWA icons');
  await icon(192, 'square', 1, P('public/icons/icon-192.png'));
  await icon(512, 'square', 1, P('public/icons/icon-512.png'));
  // maskable: vùng an toàn là hình tròn bán kính 40% -> nền tràn viền, emblem thu nhỏ
  await icon(512, 'full', 0.74, P('public/icons/icon-maskable-512.png'));
  // apple-touch: iOS tự bo góc, không được trong suốt
  await icon(180, 'full', 0.9, P('public/icons/apple-touch-icon-180.png'));
  await icon(32, 'square', 1.12, P('public/icons/favicon-32.png'));

  console.log('Resources');
  await icon(1024, 'full', 0.9, P('resources/icon.png'));
  await renderHtml(splashHtml(2732, 2732), 2732, 2732, P('resources/splash.png'));

  const androidRes = P('android/app/src/main/res');
  if (existsSync(androidRes)) {
    console.log('Android');
    const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const [d, k] of Object.entries(dens)) {
      await icon(48 * k, 'square', 1, join(androidRes, `mipmap-${d}/ic_launcher.png`));
      await icon(48 * k, 'round', 0.92, join(androidRes, `mipmap-${d}/ic_launcher_round.png`));
      // adaptive foreground 108dp: vùng an toàn 66dp (~61%), nền màu @color/ic_launcher_background
      await icon(108 * k, 'none', 0.6, join(androidRes, `mipmap-${d}/ic_launcher_foreground.png`));
    }
    const splashes = {
      drawable: [480, 320],
      'drawable-land-mdpi': [480, 320],
      'drawable-land-hdpi': [800, 480],
      'drawable-land-xhdpi': [1280, 720],
      'drawable-land-xxhdpi': [1600, 960],
      'drawable-land-xxxhdpi': [1920, 1280],
      'drawable-port-mdpi': [320, 480],
      'drawable-port-hdpi': [480, 800],
      'drawable-port-xhdpi': [720, 1280],
      'drawable-port-xxhdpi': [960, 1600],
      'drawable-port-xxxhdpi': [1280, 1920],
    };
    for (const [dir, [w, h]] of Object.entries(splashes)) {
      await renderHtml(splashHtml(w, h), w, h, join(androidRes, dir, 'splash.png'));
    }
  }

  const iosAssets = P('ios/App/App/Assets.xcassets');
  if (existsSync(iosAssets)) {
    console.log('iOS');
    // App Store icon: 1024, không trong suốt, không bo góc
    await icon(1024, 'full', 0.9, join(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png'));
    await renderHtml(splashHtml(2732, 2732), 2732, 2732, [
      join(iosAssets, 'Splash.imageset/splash-2732x2732.png'),
      join(iosAssets, 'Splash.imageset/splash-2732x2732-1.png'),
      join(iosAssets, 'Splash.imageset/splash-2732x2732-2.png'),
    ]);
  }

  await browser.close();
  console.log('Xong.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
