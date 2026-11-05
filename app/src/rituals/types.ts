import type Phaser from 'phaser';
import type { ArtLayers, Hotspot } from '../art/types';
import type { AreaId } from '../core/areas';
import type { RitualKind } from '../core/state';
import type { JournalKind } from '../storage/journal';

/**
 * Môi trường AreaScene cung cấp cho một nghi thức (ritual).
 * Nghi thức vẽ trong Phaser (lớp `layers.fx` là lớp khóa màn hình, tọa độ 0..540 × 0..960)
 * và có thể dùng overlay HTML qua `panel` (một <div> nằm trên canvas, tự xóa khi kết thúc).
 */
export interface RitualHost {
  scene: Phaser.Scene;
  layers: ArtLayers;
  area: AreaId;
  hotspots: Record<string, Hotspot>;
  /** 0 ngày … 1 đêm */
  night: number;
  reducedMotion: boolean;
  /** Overlay HTML riêng cho nghi thức (đã gắn vào #ui, class "ritual-panel"). */
  panel: HTMLElement;
  /** Ghi nhận hoàn thành: cập nhật store (Hạt sen, nhiệm vụ, streak), nhật ký, hiệu ứng thưởng. */
  complete(kind: RitualKind, amount: number, detail?: Record<string, string | number>, journal?: JournalKind): void;
  /** Hiện chữ nổi nhẹ (vd "An lạc +1") tại tọa độ màn hình. */
  floatText(text: string, x: number, y: number, color?: string): void;
  /** Kết thúc nghi thức (gọi destroy và trả HUD về như cũ). */
  exit(next?: string): void;
}

export interface Ritual {
  /** Dọn dẹp mọi game object, timer, listener, DOM. Được gọi đúng một lần. */
  destroy(): void;
  /** Tùy chọn: cập nhật mỗi khung hình. */
  update?(time: number, delta: number): void;
}

export type RitualFactory = (host: RitualHost) => Ritual;
