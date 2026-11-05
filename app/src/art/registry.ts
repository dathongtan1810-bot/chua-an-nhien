import type { AreaId } from '../core/areas';
import { GAME_W, type AreaArtRegistry } from './types';
import { drawBoSong, drawHoSen, WORLD_WIDTH_WATER } from './areas-water';

// TODO(art-buildings): thêm cong, san, chinh-dien, lau-chuong, am-xam, thien-duong từ areas-buildings.ts
export const AREA_ART: AreaArtRegistry = {
  'ho-sen': drawHoSen,
  'bo-song': drawBoSong,
};

const WORLD_WIDTH: Partial<Record<AreaId, number>> = { ...WORLD_WIDTH_WATER };

export function worldWidthOf(area: AreaId): number {
  return Math.max(GAME_W, WORLD_WIDTH[area] ?? 720);
}
