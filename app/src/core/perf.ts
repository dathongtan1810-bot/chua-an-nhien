/**
 * Hiệu năng: đo FPS thực tế và tự bật "hiệu ứng nhẹ" trên máy yếu.
 * - `?fps` hiện bộ đếm FPS (dùng để đo trên điện thoại thật).
 * - Nếu FPS trung bình < 40 trong vài giây đầu ở một khu, các khu sau bỏ bớt hiệu ứng trang trí
 *   (hạt rơi, đốm sáng, sương) — lưu trong phiên (sessionStorage).
 */
const KEY = 'chua-an-nhien:lowPerf';

export function isLowPerf(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setLowPerf(v: boolean): void {
  try {
    if (v) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Đánh giá các mẫu FPS: true nếu nên chuyển sang hiệu ứng nhẹ. */
export function shouldLowerQuality(samples: number[], threshold = 40): boolean {
  if (samples.length < 4) return false;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return avg < threshold;
}

export function showFpsMeter(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('fps');
}
