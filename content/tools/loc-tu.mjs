// Bộ lọc từ cho lời nguyện / nickname – "Chùa An Nhiên".
// Không dùng thư viện ngoài. Dữ liệu: content/tu-cam.json (xem "ghiChu" trong file đó).
//
//   import { chuanHoa, boDau, kiemTra, che } from './loc-tu.mjs';
//   const data = JSON.parse(readFileSync('content/tu-cam.json', 'utf8'));
//   kiemTra('...', data)  -> { hopLe, mucDoCaoNhat, viPham: [{ tu, nhom, mucDo }] }
//   che('...', data)      -> chuỗi gốc, đoạn vi phạm thay bằng "***"
//
// Ý tưởng chính:
//  - Mọi biến đổi (chữ thường, thay ký tự lách, nối chữ cái rời, rút ký tự lặp, bỏ dấu)
//    được làm trên mảng "đơn vị" (mỗi đơn vị = 1 ký tự + vị trí trong chuỗi gốc), nên
//    khi tìm thấy vi phạm có thể che đúng vị trí trên chuỗi gốc.
//  - Hai không gian so khớp: A = có dấu (sau chuẩn hóa), B = đã bỏ dấu.
//    `tu` và biến thể có dấu so trong A; biến thể không dấu (chỉ ASCII) so trong B.
//    `bienTheLach` (vd "lon", "cac", "buoi") chỉ tính khi đoạn khớp có dấu hiệu lách
//    (ký tự bị thay như l0n, hoặc chữ cái bị tách rời như c.a.c / c a c).
//  - Cụm allowlist được thay bằng khoảng trắng (giữ nguyên độ dài) trước khi so.

export const THAY_KY_TU_MAC_DINH = Object.freeze({
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't',
  '@': 'a', $: 's', '€': 'e', '!': 'i', '|': 'l',
});

const LA_CHU = /\p{L}/u;
const LA_CHU_SO = /[\p{L}\p{N}]/u;
const DAU_KET_HOP = /\p{M}/u;
const KHONG_RONG = /[​-‏⁠﻿­]/u;
// Ký tự lách "mạnh" (chữ số & ký hiệu thay chữ): chỉ cần 1 bên là chữ cái.
// Ký tự khác (vd "!", "|"): cần chữ cái ở cả hai bên, để "ngu!" không thành "ngui".
const LACH_MANH = /[\p{N}@$€]/u;

/** Bỏ dấu tiếng Việt, đ → d. Giữ nguyên độ dài với chuỗi NFC tiếng Việt. */
export function boDau(text) {
  let out = '';
  for (const ch of String(text).normalize('NFC')) out += boDauKyTu(ch);
  return out;
}

function boDauKyTu(ch) {
  if (ch === 'đ') return 'd';
  if (ch === 'Đ') return 'D';
  const r = ch.normalize('NFD').replace(/\p{M}/gu, '');
  return r.length === 1 ? r : ch;
}

/** Bước 1: tách chuỗi gốc thành đơn vị (chữ thường, NFKC, bỏ ký tự vô hình). */
function taoDonVi(text) {
  const goc = String(text ?? '').normalize('NFC');
  const dv = [];
  let i = 0;
  for (const cp of goc) {
    const s = i;
    const e = i + cp.length;
    i = e;
    if (KHONG_RONG.test(cp)) continue;
    if (cp.length > 1) { // emoji / ký tự ngoài BMP -> coi như khoảng trắng
      dv.push({ ch: ' ', s, e, lach: false });
      continue;
    }
    if (DAU_KET_HOP.test(cp)) continue; // dấu rời còn sót sau NFC
    const lower = cp.normalize('NFKC').toLowerCase().normalize('NFC');
    for (const c of lower) {
      if (c.length > 1 || DAU_KET_HOP.test(c)) continue;
      dv.push({ ch: /\s/u.test(c) ? ' ' : c, s, e, lach: false });
    }
  }
  return { goc, dv };
}

const chuoi = (dv) => dv.map((u) => u.ch).join('');

/** Bước 2: nối chữ cái đơn bị tách: "c.a.c", "c-ặ-c", "đ i t" (≥3 chữ khi tách bằng khoảng trắng). */
const DON = '[\\p{L}\\p{N}@$€]';
const RE_NOI_KY_HIEU = new RegExp(
  `(?<![\\p{L}\\p{N}])${DON}(?:[ ]*[.\\-_*~+^'\`·•]+[ ]*${DON}(?![\\p{L}\\p{N}]))+`, 'gu');
const RE_NOI_KHOANG = new RegExp(
  `(?<![\\p{L}\\p{N}])${DON}(?:[ ]+${DON}(?![\\p{L}\\p{N}])){2,}`, 'gu');

function noiChuRoi(dv) {
  for (const re of [RE_NOI_KY_HIEU, RE_NOI_KHOANG]) {
    const s = chuoi(dv);
    const xoa = new Set();
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      if (!LA_CHU.test(m[0])) continue; // "1.2.3" -> bỏ qua
      for (let k = m.index; k < m.index + m[0].length; k++) {
        if (LA_CHU_SO.test(s[k]) || '@$€'.includes(s[k])) dv[k].lach = true;
        else xoa.add(k);
      }
    }
    dv = dv.filter((_, k) => !xoa.has(k));
  }
  return dv;
}

/** Bước 3: thay ký tự lách (0→o, @→a, ...). */
function thayKyTu(dv, bang) {
  const goc = dv.map((u) => u.ch);
  for (let k = 0; k < dv.length; k++) {
    const c = goc[k];
    if (!Object.prototype.hasOwnProperty.call(bang, c)) continue;
    const trai = k > 0 && LA_CHU.test(goc[k - 1]);
    const phai = k < goc.length - 1 && LA_CHU.test(goc[k + 1]);
    // ký tự bên cạnh cũng là ký tự lách (vd "l00n") thì tính như chữ cái
    const traiLach = k > 0 && LACH_MANH.test(goc[k - 1]) && Object.hasOwn(bang, goc[k - 1]);
    const phaiLach = k < goc.length - 1 && LACH_MANH.test(goc[k + 1]) && Object.hasOwn(bang, goc[k + 1]);
    const ok = LACH_MANH.test(c)
      ? (trai || phai || traiLach || phaiLach) && coChuGan(goc, k)
      : trai && phai;
    if (ok) {
      dv[k] = { ...dv[k], ch: bang[c], lach: true };
    }
  }
  return dv;
}

function coChuGan(goc, k) {
  // trong cùng một "từ" (không có khoảng trắng) có chữ cái
  let a = k; while (a > 0 && goc[a - 1] !== ' ') a--;
  let b = k; while (b < goc.length - 1 && goc[b + 1] !== ' ') b++;
  for (let i = a; i <= b; i++) if (LA_CHU.test(goc[i])) return true;
  return false;
}

/** Bước 4: rút chuỗi chữ cái lặp ≥3 lần (hoặc ≥2 lần nếu có ký tự lách, vd "l00n") còn `giu` lần.
 *  giu = 0: không rút. Đơn vị bị bỏ được gộp vị trí vào đơn vị giữ lại (để che đúng). */
function rutLap(dv, giu) {
  if (!giu) return dv;
  const out = [];
  let k = 0;
  while (k < dv.length) {
    let j = k;
    while (j + 1 < dv.length && dv[j + 1].ch === dv[k].ch) j++;
    const run = dv.slice(k, j + 1);
    const dai = run.length;
    const rut = LA_CHU.test(dv[k].ch) && (dai >= 3 || (dai >= 2 && run.some((u) => u.lach)));
    if (rut) {
      const giuLai = run.slice(0, giu).map((u) => ({ ...u }));
      const cuoi = giuLai[giuLai.length - 1];
      cuoi.e = run[dai - 1].e;
      if (run.some((u) => u.lach)) giuLai.forEach((u) => { u.lach = true; });
      out.push(...giuLai);
    } else out.push(...run);
    k = j + 1;
  }
  return out;
}

function gopKhoang(dv) {
  const out = [];
  for (const u of dv) {
    if (u.ch === ' ' && (out.length === 0 || out[out.length - 1].ch === ' ')) continue;
    out.push(u);
  }
  while (out.length && out[out.length - 1].ch === ' ') out.pop();
  return out;
}

function phanTich(text, bang, giu = 0) {
  const { goc, dv: dv0 } = taoDonVi(text);
  let dv = noiChuRoi(dv0);
  dv = thayKyTu(dv, bang);
  dv = rutLap(dv, giu);
  dv = gopKhoang(dv);
  return { goc, dv };
}

/** Chuẩn hóa: chữ thường, NFC, thay ký tự lách, nối chữ cái rời, gộp khoảng trắng. */
export function chuanHoa(text, bang = THAY_KY_TU_MAC_DINH) {
  return chuoi(phanTich(text, bang).dv);
}

// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const laAscii = (s) => /^[\x00-\x7F]*$/.test(s);

function taoRegex(cum) {
  const phan = cum.split(' ').filter(Boolean).map(escapeRe).join('[^\\p{L}\\p{N}]+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${phan}(?![\\p{L}\\p{N}])`, 'gu');
}

const cache = new WeakMap();

function bienDich(data) {
  if (cache.has(data)) return cache.get(data);
  const bang = { ...THAY_KY_TU_MAC_DINH, ...(data.thayKyTu || {}) };
  const nh = (s) => chuanHoa(s, bang);
  const mauA = []; // so trong không gian có dấu
  const mauB = []; // so trong không gian bỏ dấu
  (data.tuCam || []).forEach((muc, idx) => {
    const info = { idx, tu: muc.tu, nhom: muc.nhom, mucDo: muc.mucDo };
    const them = (raw, lachOnly, laTu = false) => {
      const t = nh(raw);
      if (!t) return;
      // `tu` luôn so trong không gian có dấu (để "ngu" không bắt nhầm "ngủ");
      // biến thể chỉ gồm ASCII so trong không gian bỏ dấu.
      if (!laTu && laAscii(t)) mauB.push({ re: taoRegex(t), lachOnly, info });
      else mauA.push({ re: taoRegex(t), lachOnly, info });
    };
    them(muc.tu, false, true);
    for (const b of muc.bienThe || []) them(b, false);
    for (const b of muc.bienTheLach || []) them(b, true);
  });
  const allowA = [];
  const allowAKhongDau = [];
  const allowB = [];
  for (const a of data.allowlist || []) {
    const t = nh(a);
    if (!t) continue;
    allowA.push(taoRegex(t));
    allowAKhongDau.push(taoRegex(boDau(t)));
    allowB.push(taoRegex(boDau(t)));
  }
  const c = { bang, mauA, mauB, allowA, allowAKhongDau, allowB };
  cache.set(data, c);
  return c;
}

function xoaAllow(s, dsRe) {
  for (const re of dsRe) {
    re.lastIndex = 0;
    s = s.replace(re, (m) => ' '.repeat(m.length));
  }
  return s;
}

function timViPham(text, data) {
  const c = bienDich(data);
  const ketQua = []; // {info, s, e}
  for (const giu of [0, 1, 2]) {
    const { dv } = phanTich(text, c.bang, giu);
    const s0 = chuoi(dv);
    // Văn bản gõ hoàn toàn không dấu: áp cả dạng không dấu của allowlist lên không gian A
    // (vd "chuc ngu ngon"). Văn bản có dấu thì chỉ áp dạng có dấu, để "con ngu" (có dấu
    // đầy đủ ngữ cảnh) không được tha nhờ allowlist "con ngủ".
    const khongDau = s0 === boDau(s0);
    let sA = xoaAllow(s0, c.allowA);
    if (khongDau) sA = xoaAllow(sA, c.allowAKhongDau);
    const sB = xoaAllow(boDau(chuoi(dv)), c.allowB);
    for (const [s, ds] of [[sA, c.mauA], [sB, c.mauB]]) {
      for (const m of ds) {
        m.re.lastIndex = 0;
        let r;
        while ((r = m.re.exec(s))) {
          const a = r.index;
          const b = a + r[0].length;
          if (b === a) { m.re.lastIndex++; continue; }
          if (m.lachOnly && !dv.slice(a, b).some((u) => u.lach)) continue;
          ketQua.push({ info: m.info, s: dv[a].s, e: dv[b - 1].e });
        }
      }
    }
  }
  return ketQua;
}

/** Kiểm tra văn bản. hopLe = không có vi phạm nào (mọi mức độ). */
export function kiemTra(text, data) {
  const ds = timViPham(text, data);
  const daCo = new Set();
  const viPham = [];
  for (const { info } of ds) {
    if (daCo.has(info.idx)) continue;
    daCo.add(info.idx);
    viPham.push({ tu: info.tu, nhom: info.nhom, mucDo: info.mucDo });
  }
  viPham.sort((x, y) => y.mucDo - x.mucDo);
  return {
    hopLe: viPham.length === 0,
    mucDoCaoNhat: viPham.length ? viPham[0].mucDo : 0,
    viPham,
  };
}

/** Che các đoạn vi phạm trong chuỗi gốc bằng "***". */
export function che(text, data, ky = '***') {
  const goc = String(text ?? '').normalize('NFC');
  const khoang = timViPham(goc, data)
    .map(({ s, e }) => [s, e])
    .sort((x, y) => x[0] - y[0] || y[1] - x[1]);
  const gop = [];
  for (const [s, e] of khoang) {
    const cuoi = gop[gop.length - 1];
    if (cuoi && s <= cuoi[1]) cuoi[1] = Math.max(cuoi[1], e);
    else gop.push([s, e]);
  }
  let out = '';
  let i = 0;
  for (const [s, e] of gop) {
    out += goc.slice(i, s) + ky;
    i = e;
  }
  return out + goc.slice(i);
}
