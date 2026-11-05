import type { AreaId } from '../core/areas';
import { bellRitual } from './bell';
import { beadsRitual } from './beads';
import { bowRitual } from './bow';
import { fishRitual } from './fish';
import { fortuneRitual } from './fortune';
import { incenseRitual } from './incense';
import { lanternRitual } from './lantern';
import { meditationRitual } from './meditation';
import { moRitual } from './mo';
import type { RitualFactory } from './types';

export type RitualId = 'incense' | 'bow' | 'mo' | 'bell' | 'beads' | 'fortune' | 'lantern' | 'meditation' | 'fish';

export const RITUALS: Record<RitualId, { factory: RitualFactory; labelKey: string; icon: string; zen?: boolean }> = {
  incense: { factory: incenseRitual, labelKey: 'act.incense', icon: '🪔' },
  bow: { factory: bowRitual, labelKey: 'act.bow', icon: '🙏' },
  mo: { factory: moRitual, labelKey: 'act.mo', icon: '🪵' },
  bell: { factory: bellRitual, labelKey: 'act.bell', icon: '🔔' },
  beads: { factory: beadsRitual, labelKey: 'act.beads', icon: '📿' },
  fortune: { factory: fortuneRitual, labelKey: 'act.fortune', icon: '🎋' },
  lantern: { factory: lanternRitual, labelKey: 'act.lantern', icon: '🏮' },
  meditation: { factory: meditationRitual, labelKey: 'act.meditate', icon: '🧘', zen: true },
  fish: { factory: fishRitual, labelKey: 'act.fish', icon: '🐟' },
};

/** Nghi thức có ở mỗi khu (thứ tự hiển thị trên thanh hành động). */
export const AREA_RITUALS: Record<AreaId, RitualId[]> = {
  cong: [],
  san: ['incense', 'bow'],
  'chinh-dien': ['incense', 'bow', 'mo', 'beads'],
  'lau-chuong': ['bell'],
  'ho-sen': ['fish'],
  'bo-song': ['lantern'],
  'am-xam': ['fortune'],
  'thien-duong': ['meditation', 'beads'],
};

/** Điểm nóng (hotspot) → nghi thức khi chạm. Tượng Phật (altar) KHÔNG có thao tác. */
export function ritualForHotspot(area: AreaId, name: string): RitualId | null {
  switch (name) {
    case 'burner':
      return 'incense';
    case 'mo':
      return 'mo';
    case 'cushion':
      return area === 'thien-duong' ? 'meditation' : 'bow';
    case 'bell':
    case 'beam':
      return 'bell';
    case 'pond':
      return 'fish';
    case 'river':
    case 'steps':
      return 'lantern';
    case 'sticks':
    case 'table':
      return 'fortune';
    default:
      return null;
  }
}

export function isRitualId(v: string): v is RitualId {
  return v in RITUALS;
}
