import type { AreaId } from './areas';
import { DEFAULT_EQUIPPED, DEFAULT_OWNED, shopItem, type ShopCategory } from './shop';
import { emptyStreak, visit, type Streak } from '../logic/streak';

export type Lang = 'vi' | 'en';
export type QuestId = 'thap-huong' | 'thien-3' | 'tha-den';
export const DAILY_QUESTS: QuestId[] = ['thap-huong', 'thien-3', 'tha-den'];

export type RitualKind =
  | 'incense'
  | 'bow'
  | 'mo'
  | 'bell'
  | 'beads'
  | 'beadRound'
  | 'fortune'
  | 'lantern'
  | 'meditation'
  | 'fish';

export interface Settings {
  master: number;
  sfx: number;
  ambient: number;
  music: number;
  muted: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
  online: boolean;
}

export interface Totals {
  incense: number;
  bow: number;
  mo: number;
  bell: number;
  beads: number;
  beadRound: number;
  fortune: number;
  lantern: number;
  meditation: number; // phút
  fish: number;
}

export interface Daily {
  dateKey: string;
  quests: Record<QuestId, boolean>;
  /** Hạt sen đã nhận từ nghi thức hôm nay (có trần). */
  ritualRewards: number;
  allDoneClaimed: boolean;
  eventDone: boolean;
  meditationMin: number;
  fortuneTopics: string[];
}

export interface GameState {
  version: 1;
  deviceId: string;
  nickname: string;
  lang: Lang;
  settings: Settings;
  hatSen: number;
  totals: Totals;
  streak: Streak;
  daily: Daily;
  owned: string[];
  equipped: Record<ShopCategory, string>;
  blocked: string[];
  area: AreaId;
  onboarded: boolean;
}

export const RITUAL_REWARD = 1;
export const RITUAL_DAILY_CAP = 20;
export const QUEST_REWARD = 3;
export const ALL_QUESTS_BONUS = 5;
export const EVENT_REWARD = 5;

export function defaultSettings(): Settings {
  return {
    master: 0.9,
    sfx: 0.9,
    ambient: 0.6,
    music: 0.4,
    muted: false,
    haptics: true,
    reducedMotion: false,
    largeText: false,
    highContrast: false,
    online: true,
  };
}

const emptyTotals = (): Totals => ({
  incense: 0,
  bow: 0,
  mo: 0,
  bell: 0,
  beads: 0,
  beadRound: 0,
  fortune: 0,
  lantern: 0,
  meditation: 0,
  fish: 0,
});

export function emptyDaily(dateKey: string): Daily {
  return {
    dateKey,
    quests: { 'thap-huong': false, 'thien-3': false, 'tha-den': false },
    ritualRewards: 0,
    allDoneClaimed: false,
    eventDone: false,
    meditationMin: 0,
    fortuneTopics: [],
  };
}

export function initialState(deviceId: string, nickname: string, dateKey: string, lang: Lang = 'vi'): GameState {
  return {
    version: 1,
    deviceId,
    nickname,
    lang,
    settings: defaultSettings(),
    hatSen: 0,
    totals: emptyTotals(),
    streak: emptyStreak(),
    daily: emptyDaily(dateKey),
    owned: [...DEFAULT_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    blocked: [],
    area: 'cong',
    onboarded: false,
  };
}

export type Action =
  | { type: 'ritual'; kind: RitualKind; amount?: number; dateKey: string; eventRitual?: RitualKind | 'any' | null; topic?: string }
  | { type: 'rollDay'; dateKey: string }
  | { type: 'buy'; itemId: string }
  | { type: 'equip'; itemId: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'lang'; lang: Lang }
  | { type: 'area'; area: AreaId }
  | { type: 'block'; userId: string }
  | { type: 'onboarded' }
  | { type: 'nickname'; nickname: string }
  | { type: 'reward'; amount: number }
  /** Thưởng nhỏ (vd. giữ nhịp mõ đều) — tính chung trần thưởng nghi thức mỗi ngày. */
  | { type: 'bonus'; dateKey: string };

export interface Reward {
  amount: number;
  reasons: string[];
}

/** Kết quả reducer kèm phần thưởng phát sinh (để UI hiện "+N Hạt sen"). */
export interface Result {
  state: GameState;
  reward: Reward;
}

function rollDay(s: GameState, dateKey: string): GameState {
  return s.daily.dateKey === dateKey ? s : { ...s, daily: emptyDaily(dateKey) };
}

export function reduce(state: GameState, action: Action): Result {
  const reward: Reward = { amount: 0, reasons: [] };
  let s = state;
  switch (action.type) {
    case 'rollDay':
      s = rollDay(s, action.dateKey);
      break;
    case 'ritual': {
      s = rollDay(s, action.dateKey);
      const amount = action.amount ?? 1;
      const totals = { ...s.totals, [action.kind]: s.totals[action.kind] + amount };
      const daily: Daily = { ...s.daily, quests: { ...s.daily.quests } };
      if (action.kind === 'meditation') daily.meditationMin += amount;
      if (action.kind === 'fortune' && action.topic) daily.fortuneTopics = [...daily.fortuneTopics, action.topic];
      // Thưởng nghi thức (có trần mỗi ngày, không thưởng cho từng hạt / từng tiếng mõ lẻ)
      const rewardable = action.kind !== 'beads' && action.kind !== 'mo';
      if (rewardable && daily.ritualRewards < RITUAL_DAILY_CAP) {
        daily.ritualRewards += RITUAL_REWARD;
        reward.amount += RITUAL_REWARD;
        reward.reasons.push('ritual');
      }
      const complete = (q: QuestId) => {
        if (!daily.quests[q]) {
          daily.quests[q] = true;
          reward.amount += QUEST_REWARD;
          reward.reasons.push('quest:' + q);
        }
      };
      if (action.kind === 'incense') complete('thap-huong');
      if (action.kind === 'lantern') complete('tha-den');
      if (action.kind === 'meditation' && daily.meditationMin >= 3) complete('thien-3');
      if (!daily.allDoneClaimed && DAILY_QUESTS.every((q) => daily.quests[q])) {
        daily.allDoneClaimed = true;
        reward.amount += ALL_QUESTS_BONUS;
        reward.reasons.push('allQuests');
      }
      if (
        action.eventRitual &&
        !daily.eventDone &&
        (action.eventRitual === 'any' || action.eventRitual === action.kind)
      ) {
        daily.eventDone = true;
        reward.amount += EVENT_REWARD;
        reward.reasons.push('event');
      }
      s = {
        ...s,
        totals,
        daily,
        streak: visit(s.streak, action.dateKey),
        hatSen: s.hatSen + reward.amount,
      };
      break;
    }
    case 'buy': {
      const item = shopItem(action.itemId);
      if (!item || s.owned.includes(item.id) || s.hatSen < item.price) break;
      s = {
        ...s,
        hatSen: s.hatSen - item.price,
        owned: [...s.owned, item.id],
        equipped: { ...s.equipped, [item.category]: item.id },
      };
      break;
    }
    case 'equip': {
      const item = shopItem(action.itemId);
      if (!item || !s.owned.includes(item.id)) break;
      s = { ...s, equipped: { ...s.equipped, [item.category]: item.id } };
      break;
    }
    case 'settings':
      s = { ...s, settings: { ...s.settings, ...action.patch } };
      break;
    case 'lang':
      s = { ...s, lang: action.lang };
      break;
    case 'area':
      s = { ...s, area: action.area };
      break;
    case 'block':
      if (!s.blocked.includes(action.userId)) s = { ...s, blocked: [...s.blocked, action.userId] };
      break;
    case 'onboarded':
      s = { ...s, onboarded: true };
      break;
    case 'nickname':
      s = { ...s, nickname: action.nickname.slice(0, 40) };
      break;
    case 'bonus': {
      s = rollDay(s, action.dateKey);
      if (s.daily.ritualRewards < RITUAL_DAILY_CAP) {
        s = { ...s, hatSen: s.hatSen + 1, daily: { ...s.daily, ritualRewards: s.daily.ritualRewards + 1 } };
        reward.amount = 1;
        reward.reasons.push('bonus');
      }
      break;
    }
    case 'reward':
      s = { ...s, hatSen: s.hatSen + action.amount };
      reward.amount = action.amount;
      break;
  }
  return { state: s, reward };
}

/** Hợp nhất trạng thái đã lưu (có thể thiếu trường do phiên bản cũ) với mặc định. */
export function hydrate(raw: unknown, fallback: GameState): GameState {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Partial<GameState>;
  if (r.version !== 1 || typeof r.deviceId !== 'string') return fallback;
  return {
    ...fallback,
    ...r,
    settings: { ...fallback.settings, ...(r.settings ?? {}) },
    totals: { ...fallback.totals, ...(r.totals ?? {}) },
    streak: { ...fallback.streak, ...(r.streak ?? {}) },
    daily: r.daily ? { ...emptyDaily(r.daily.dateKey), ...r.daily } : fallback.daily,
    equipped: { ...fallback.equipped, ...(r.equipped ?? {}) },
    owned: Array.from(new Set([...(fallback.owned ?? []), ...(r.owned ?? [])])),
  } as GameState;
}
