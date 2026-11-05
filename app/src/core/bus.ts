import type { AreaId } from './areas';

export type BusEvent =
  | { type: 'areaChanged'; area: AreaId }
  | { type: 'ritualStarted'; id: string; zen: boolean }
  | { type: 'ritualEnded'; id: string }
  | { type: 'reward'; amount: number; reasons: string[] };

type L = (e: BusEvent) => void;
const ls = new Set<L>();
export const bus = {
  emit(e: BusEvent): void {
    for (const l of ls) l(e);
  },
  on(l: L): () => void {
    ls.add(l);
    return () => ls.delete(l);
  },
};

/** Cầu nối HUD → cảnh game (AreaScene đăng ký khi tạo). */
export interface GameApi {
  goTo(area: AreaId): void;
  startRitual(id: string): void;
  exitRitual(): void;
  readonly ritual: string | null;
}
export const game: { api: GameApi | null; pending: { goTo?: AreaId; ritual?: string } } = { api: null, pending: {} };

/** Gọi từ HUD: nếu cảnh đang khởi động lại thì xếp hàng, cảnh sẽ thực hiện khi sẵn sàng. */
export function requestGoTo(area: AreaId): void {
  if (game.api) game.api.goTo(area);
  else game.pending.goTo = area;
}
export function requestRitual(id: string): void {
  if (game.api) game.api.startRitual(id);
  else game.pending.ritual = id;
}
