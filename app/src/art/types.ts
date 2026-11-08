import type Phaser from 'phaser';
import type { AreaId } from '../core/areas';

/** Logical game size (portrait 9:16). */
export const GAME_W = 540;
export const GAME_H = 960;

/**
 * Layers for 2.5D parallax. Each container has a scrollFactor:
 * sky 0, far 0.3, mid 0.6, main 1, near 1.25. fx is screen-locked overlay (scrollFactor 0, above main).
 */
export interface ArtLayers {
  sky: Phaser.GameObjects.Container;
  far: Phaser.GameObjects.Container;
  mid: Phaser.GameObjects.Container;
  main: Phaser.GameObjects.Container;
  near: Phaser.GameObjects.Container;
  fx: Phaser.GameObjects.Container;
}

export interface ArtContext {
  scene: Phaser.Scene;
  layers: ArtLayers;
  /** World width of the area in px (>= GAME_W, camera pans horizontally). Height is GAME_H. */
  worldWidth: number;
  /** 0 = full day, 1 = full night (real-time). */
  night: number;
  /** Reduced-motion preference: avoid large continuous movements when true. */
  reducedMotion: boolean;
}

export interface Hotspot {
  /** World coordinates (main layer, scrollFactor 1). */
  x: number;
  y: number;
  /** Hit radius in px. */
  r: number;
}

export interface AreaArtResult {
  /** Named interactive spots, e.g. 'burner', 'mo', 'bell', 'river', 'pond', 'bodhi', 'shrine', 'cushion'. */
  hotspots: Record<string, Hotspot>;
  /** Optional per-frame animation (water ripples, leaves, fish…). time/delta in ms. */
  update?: (time: number, delta: number) => void;
}

export type AreaArtFn = (ctx: ArtContext) => AreaArtResult;
export type AreaArtRegistry = Partial<Record<AreaId, AreaArtFn>>;
