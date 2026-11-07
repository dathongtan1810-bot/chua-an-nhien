/** Biệt danh ngẫu nhiên, nhẹ nhàng: "<Danh xưng> <Thiên nhiên> <Tính từ/màu>". */

export const NICK_TITLES_VI = [
  'Lữ khách',
  'Người viếng',
  'Khách hành hương',
  'Khách phương xa',
  'Người lữ hành',
  'Khách thập phương',
  'Người tìm an',
  'Khách dạo chùa',
  'Người nghe chuông',
  'Khách ghé thăm',
  'Người thắp hương',
  'Khách tĩnh tâm',
] as const;

/** Cặp [danh từ thiên nhiên, tính từ/màu phù hợp]. Mọi tổ hợp danh từ × tính từ đều hiền hoà. */
export const NICK_NATURE_VI = [
  'Sen',
  'Trúc',
  'Mây',
  'Trăng',
  'Suối',
  'Gió',
  'Mai',
  'Lan',
  'Cúc',
  'Tùng',
  'Sương',
  'Núi',
  'Sóng',
  'Nắng',
  'Hạc',
  'Liễu',
  'Đào',
  'Lúa',
] as const;

export const NICK_ADJ_VI = [
  'Hồng',
  'Xanh',
  'Trắng',
  'Vàng',
  'Tím',
  'Rằm',
  'Sớm',
  'Chiều',
  'Thu',
  'Xuân',
  'Lành',
  'Hiền',
  'Biếc',
  'Ngọc',
  'Bạc',
  'Mai',
] as const;

export const NICK_TITLES_EN = [
  'Wanderer',
  'Pilgrim',
  'Traveler',
  'Visitor',
  'Seeker',
  'Guest',
  'Listener',
  'Dreamer',
  'Keeper',
  'Friend',
] as const;

export const NICK_NATURE_EN = [
  'Lotus',
  'Bamboo',
  'Cloud',
  'Moon',
  'Stream',
  'Wind',
  'Blossom',
  'Orchid',
  'Pine',
  'Mist',
  'Mountain',
  'River',
  'Sunlight',
  'Crane',
  'Willow',
] as const;

export const NICK_ADJ_EN = [
  'Pink',
  'Green',
  'White',
  'Golden',
  'Violet',
  'Full',
  'Morning',
  'Evening',
  'Autumn',
  'Spring',
  'Gentle',
  'Quiet',
  'Silver',
  'Jade',
  'Azure',
] as const;

function pick<T>(arr: readonly T[], rand: () => number): T {
  const i = Math.floor(rand() * arr.length);
  return arr[Math.min(arr.length - 1, Math.max(0, i))] as T;
}

/** Server chỉ nhận biệt danh ≤ 24 ký tự (shared/protocol.ts LIMITS.NICKNAME_MAX_CHARS). */
export const NICKNAME_MAX_CHARS = 24;

/** Cắt biệt danh cho vừa giới hạn server, ưu tiên cắt ở ranh giới từ. */
export function clampNickname(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if ([...t].length <= NICKNAME_MAX_CHARS) return t;
  const words = t.split(' ');
  while (words.length > 1 && [...words.join(' ')].length > NICKNAME_MAX_CHARS) words.pop();
  return [...words.join(' ')].slice(0, NICKNAME_MAX_CHARS).join('');
}

export function randomNickname(rand: () => number = Math.random): string {
  // thử vài lần để có biệt danh đủ 3 phần mà vẫn ≤ 24 ký tự
  for (let i = 0; i < 12; i++) {
    const n = randomNicknameRaw(rand);
    if ([...n].length <= NICKNAME_MAX_CHARS) return n;
  }
  return clampNickname(randomNicknameRaw(rand));
}

function randomNicknameRaw(rand: () => number): string {
  const title = pick(NICK_TITLES_VI, rand);
  const nature = pick(NICK_NATURE_VI, rand);
  let adj = pick(NICK_ADJ_VI, rand);
  if (adj === nature) adj = pick(NICK_ADJ_VI.filter((a) => a !== nature), rand);
  return `${title} ${nature} ${adj}`;
}

/** Biệt danh tiếng Anh thô (chưa kiểm độ dài). */
function randomNicknameEnRaw(rand: () => number): string {
  const title = pick(NICK_TITLES_EN, rand);
  const adj = pick(NICK_ADJ_EN, rand);
  const nature = pick(NICK_NATURE_EN, rand);
  return `${title} of ${adj} ${nature}`;
}

/** English nickname, e.g. "Pink Lotus Wanderer" — ≤ 24 ký tự. */
export function randomNicknameEn(rand: () => number = Math.random): string {
  for (let i = 0; i < 12; i++) {
    const n = randomNicknameEnRaw(rand);
    if ([...n].length <= NICKNAME_MAX_CHARS) return n;
  }
  return clampNickname(randomNicknameEnRaw(rand));
}
