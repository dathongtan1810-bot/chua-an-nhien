import { createHash, randomBytes, randomInt } from 'node:crypto';

/** Băm deviceId bằng SHA-256 + salt; server không bao giờ lưu deviceId gốc. */
export function hashDevice(deviceId: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${deviceId}`).digest('hex');
}

/** Id công khai ngẫu nhiên (base64url, khớp IdSchema). */
export function newId(prefix = '', bytes = 9): string {
  return prefix + randomBytes(bytes).toString('base64url');
}

const ADJ = ['An', 'Tĩnh', 'Hiền', 'Thiện', 'Minh', 'Tâm', 'Huệ', 'Từ', 'Bi', 'Hỷ', 'Xả', 'Nhiên', 'Lành', 'Thanh', 'Diệu', 'Phúc', 'Khánh', 'Bình', 'Hòa', 'Ngọc'];
const NOUN = ['Sen', 'Mây', 'Trăng', 'Suối', 'Trúc', 'Chuông', 'Hương', 'Đèn', 'Gió', 'Lá', 'Núi', 'Sương', 'Nắng', 'Bồ Đề', 'Cỏ', 'Hạc', 'Sóng', 'Sao', 'Đá', 'Mai'];

/** Biệt danh ngẫu nhiên tiếng Việt, ví dụ "Sen An 042". */
export function randomNickname(): string {
  const n = NOUN[randomInt(NOUN.length)]!;
  const a = ADJ[randomInt(ADJ.length)]!;
  return `${n} ${a} ${String(randomInt(1000)).padStart(3, '0')}`;
}

/** Chuẩn hoá biệt danh do người dùng chọn: NFC, bỏ ký tự điều khiển, gộp khoảng trắng. */
export function sanitizeNickname(input: string | null | undefined, max: number): string {
  if (!input) return '';
  return input
    .normalize('NFC')
    .replace(/[\p{C}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
