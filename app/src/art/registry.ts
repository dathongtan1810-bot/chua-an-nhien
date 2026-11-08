import type { AreaId } from '../core/areas';
import { GAME_W, type AreaArtRegistry } from './types';
import { drawBoSong, drawHoSen, WORLD_WIDTH_WATER } from './areas-water';
import {
  drawAmXam,
  drawChinhDien,
  drawCong,
  drawLauChuong,
  drawSan,
  drawThienDuong,
  WORLD_WIDTH as WORLD_WIDTH_BUILDINGS,
} from './areas-buildings';

export const AREA_ART: AreaArtRegistry = {
  cong: drawCong,
  san: drawSan,
  'chinh-dien': drawChinhDien,
  'lau-chuong': drawLauChuong,
  'am-xam': drawAmXam,
  'thien-duong': drawThienDuong,
  'ho-sen': drawHoSen,
  'bo-song': drawBoSong,
};

const WORLD_WIDTH: Partial<Record<AreaId, number>> = { ...WORLD_WIDTH_BUILDINGS, ...WORLD_WIDTH_WATER };

export function worldWidthOf(area: AreaId): number {
  return Math.max(GAME_W, WORLD_WIDTH[area] ?? 720);
}
