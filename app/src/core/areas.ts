/** Mã 8 khu trong chùa — khớp hợp đồng giao thức (area). */
export const AREAS = [
  'cong',
  'san',
  'chinh-dien',
  'lau-chuong',
  'ho-sen',
  'bo-song',
  'am-xam',
  'thien-duong',
] as const;

export type AreaId = (typeof AREAS)[number];

export interface AreaInfo {
  id: AreaId;
  /** Khóa i18n tên khu */
  nameKey: string;
  /** Vị trí trên mini-map (0..1) */
  map: { x: number; y: number };
  /** Khu kế bên có thể đi tới */
  links: AreaId[];
  /** Không hiện quảng cáo / giữ trang nghiêm */
  solemn: boolean;
}

export const AREA_INFO: Record<AreaId, AreaInfo> = {
  cong: { id: 'cong', nameKey: 'area.cong', map: { x: 0.5, y: 0.92 }, links: ['san'], solemn: false },
  san: { id: 'san', nameKey: 'area.san', map: { x: 0.5, y: 0.7 }, links: ['cong', 'chinh-dien', 'lau-chuong', 'ho-sen', 'am-xam'], solemn: false },
  'chinh-dien': { id: 'chinh-dien', nameKey: 'area.chinh-dien', map: { x: 0.5, y: 0.42 }, links: ['san', 'thien-duong'], solemn: true },
  'lau-chuong': { id: 'lau-chuong', nameKey: 'area.lau-chuong', map: { x: 0.2, y: 0.6 }, links: ['san'], solemn: false },
  'ho-sen': { id: 'ho-sen', nameKey: 'area.ho-sen', map: { x: 0.8, y: 0.62 }, links: ['san', 'bo-song'], solemn: false },
  'bo-song': { id: 'bo-song', nameKey: 'area.bo-song', map: { x: 0.85, y: 0.3 }, links: ['ho-sen'], solemn: false },
  'am-xam': { id: 'am-xam', nameKey: 'area.am-xam', map: { x: 0.18, y: 0.32 }, links: ['san', 'thien-duong'], solemn: false },
  'thien-duong': { id: 'thien-duong', nameKey: 'area.thien-duong', map: { x: 0.5, y: 0.12 }, links: ['chinh-dien', 'am-xam'], solemn: true },
};

export function isAreaId(v: unknown): v is AreaId {
  return typeof v === 'string' && (AREAS as readonly string[]).includes(v);
}
