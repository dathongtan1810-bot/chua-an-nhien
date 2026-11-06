/** Vẽ ảnh chia sẻ 1080×1920 bằng canvas (không dùng ảnh ngoài). */
export const CARD_W = 1080;
export const CARD_H = 1920;

export type ShareKind =
  | { kind: 'fortune'; title: string; poem: string; meaning: string; advice: string; disclaimer: string }
  | { kind: 'lantern'; text: string; color: string; nickname: string }
  | { kind: 'streak'; streak: number; lunar: string; message: string; label?: string };

const LANTERN_HEX: Record<string, string> = {
  hong: '#f28bb0', vang: '#f6c453', trang: '#f4efe4', xanh: '#7cc4c9', tim: '#b48be0', do: '#e0533d',
};

/** Ngắt dòng theo độ rộng (giữ xuống dòng có sẵn). */
export function wrapText(measure: (s: string) => number, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (measure(test) > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function roof(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 - 40, y - 60);
  ctx.quadraticCurveTo(cx - w / 2 + 20, y, cx - w / 2 + 80, y);
  ctx.lineTo(cx + w / 2 - 80, y);
  ctx.quadraticCurveTo(cx + w / 2 - 20, y, cx + w / 2 + 40, y - 60);
  ctx.quadraticCurveTo(cx + w / 2 - 30, y - 40, cx + w / 2 - 120, y - 120);
  ctx.lineTo(cx - w / 2 + 120, y - 120);
  ctx.quadraticCurveTo(cx - w / 2 + 30, y - 40, cx - w / 2 - 40, y - 60);
  ctx.fill();
}

function lotus(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.rotate(i * 0.38);
    const g = ctx.createLinearGradient(0, -s, 0, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, '#fff3f6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.42, -s * 0.55, 0, -s);
    ctx.quadraticCurveTo(-s * 0.42, -s * 0.55, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function frame(ctx: CanvasRenderingContext2D, night: boolean): void {
  const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
  if (night) {
    g.addColorStop(0, '#0f1530');
    g.addColorStop(0.55, '#2a2350');
    g.addColorStop(1, '#4a2a2a');
  } else {
    g.addColorStop(0, '#f6e7c8');
    g.addColorStop(1, '#e9c99a');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (night) {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,250,230,${0.3 + ((i * 37) % 60) / 100})`;
      ctx.beginPath();
      ctx.arc((i * 211) % CARD_W, (i * 97) % 900, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    const m = ctx.createRadialGradient(820, 260, 10, 820, 260, 200);
    m.addColorStop(0, 'rgba(255,244,214,1)');
    m.addColorStop(0.45, 'rgba(255,236,190,0.95)');
    m.addColorStop(0.5, 'rgba(255,236,190,0.25)');
    m.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = m;
    ctx.beginPath();
    ctx.arc(820, 260, 200, 0, Math.PI * 2);
    ctx.fill();
  }
  // mái chùa ở chân ảnh
  roof(ctx, CARD_W / 2, CARD_H - 250, 760, night ? '#2a1610' : '#6b3a22');
  ctx.fillStyle = night ? '#3a1a12' : '#8c2117';
  ctx.fillRect(CARD_W / 2 - 300, CARD_H - 250, 600, 250);
  ctx.fillStyle = night ? '#f2cd6b' : '#f6d68a';
  for (let i = 0; i < 4; i++) ctx.fillRect(CARD_W / 2 - 240 + i * 150, CARD_H - 210, 26, 210);
  // viền vàng
  ctx.strokeStyle = 'rgba(217,164,65,0.85)';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, CARD_W - 72, CARD_H - 72);
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, CARD_W - 104, CARD_H - 104);
}

function brand(ctx: CanvasRenderingContext2D, url: string, night: boolean): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = night ? '#f2cd6b' : '#8c2117';
  ctx.font = '700 68px Georgia, "Noto Serif", serif';
  ctx.fillText('Chùa An Nhiên', CARD_W / 2, 150);
  ctx.font = '32px system-ui, sans-serif';
  ctx.fillStyle = night ? 'rgba(255,248,236,0.8)' : 'rgba(43,29,20,0.75)';
  ctx.fillText(url.replace(/^https?:\/\//, ''), CARD_W / 2, CARD_H - 290);
}

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareKind, url: string): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const night = data.kind !== 'fortune';
  frame(ctx, night);
  brand(ctx, url, night);
  ctx.textAlign = 'center';
  const measure = (s: string) => ctx.measureText(s).width;
  if (data.kind === 'fortune') {
    // thẻ giấy
    ctx.fillStyle = '#fbf3e3';
    ctx.strokeStyle = '#c9a35a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(110, 230, CARD_W - 220, 1300, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9e2a1f';
    ctx.font = '700 58px Georgia, serif';
    ctx.fillText(data.title, CARD_W / 2, 330);
    ctx.fillStyle = '#3a2516';
    ctx.font = 'italic 44px Georgia, serif';
    let y = 430;
    for (const l of data.poem.split('\n')) {
      ctx.fillText(l, CARD_W / 2, y);
      y += 66;
    }
    ctx.font = '36px system-ui, sans-serif';
    y += 30;
    for (const l of wrapText(measure, data.meaning, CARD_W - 320).slice(0, 8)) {
      ctx.fillText(l, CARD_W / 2, y);
      y += 52;
    }
    ctx.fillStyle = '#6b3a1f';
    ctx.font = '600 36px system-ui, sans-serif';
    y += 20;
    for (const l of wrapText(measure, '✦ ' + data.advice, CARD_W - 320).slice(0, 4)) {
      ctx.fillText(l, CARD_W / 2, y);
      y += 52;
    }
    ctx.fillStyle = '#7a5a3a';
    ctx.font = 'italic 30px system-ui, sans-serif';
    let dy = 1480;
    for (const l of wrapText(measure, data.disclaimer, CARD_W - 300)) {
      ctx.fillText(l, CARD_W / 2, dy);
      dy += 40;
    }
    lotus(ctx, CARD_W / 2, 1600, 90, '#f28bb0');
  } else if (data.kind === 'lantern') {
    // dòng sông & đèn
    const river = ctx.createLinearGradient(0, 1050, 0, 1500);
    river.addColorStop(0, '#1d2a4a');
    river.addColorStop(1, '#0d1428');
    ctx.fillStyle = river;
    ctx.fillRect(56, 1050, CARD_W - 112, 420);
    const col = LANTERN_HEX[data.color] ?? data.color;
    const glow = ctx.createRadialGradient(CARD_W / 2, 1180, 20, CARD_W / 2, 1180, 320);
    glow.addColorStop(0, 'rgba(255,214,140,0.85)');
    glow.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 860, CARD_W, 640);
    lotus(ctx, CARD_W / 2, 1220, 190, col);
    ctx.fillStyle = 'rgba(255,230,170,0.35)';
    ctx.fillRect(CARD_W / 2 - 60, 1240, 120, 230);
    ctx.fillStyle = '#fff6e0';
    ctx.font = 'italic 54px Georgia, serif';
    let y = 420;
    for (const l of wrapText(measure, '“' + data.text + '”', CARD_W - 240).slice(0, 7)) {
      ctx.fillText(l, CARD_W / 2, y);
      y += 78;
    }
    ctx.font = '36px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,248,236,0.8)';
    ctx.fillText('— ' + data.nickname, CARD_W / 2, y + 30);
  } else {
    ctx.fillStyle = '#f2cd6b';
    ctx.font = '700 260px Georgia, serif';
    ctx.fillText(String(data.streak), CARD_W / 2, 640);
    ctx.font = '600 56px system-ui, sans-serif';
    ctx.fillStyle = '#fff6e0';
    ctx.fillText(data.label ?? (data.streak === 1 ? 'ngày an lạc' : 'ngày an lạc liên tiếp'), CARD_W / 2, 740);
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillText(data.lunar, CARD_W / 2, 840);
    ctx.font = 'italic 46px Georgia, serif';
    let y = 1000;
    for (const l of wrapText(measure, data.message, CARD_W - 260).slice(0, 6)) {
      ctx.fillText(l, CARD_W / 2, y);
      y += 66;
    }
    lotus(ctx, CARD_W / 2, 1500, 150, '#f28bb0');
  }
}
