import { classifyQuest, questKey, seasonYear, type QuestKind, type SeasonQuest } from '../logic/season';
import type { RitualKind } from './state';
import { store } from './store';
import { todayInfo } from './today';

export interface SeasonQuestView {
  quest: SeasonQuest;
  kind: QuestKind;
  key: string;
  done: boolean;
}

/** Nhiệm vụ của mùa đang diễn ra mà app làm được (đã bỏ các nhiệm vụ "ảo"/Cây nguyện). */
export function seasonQuestsToday(): { seasonName: string; quests: SeasonQuestView[] } | null {
  const info = todayInfo();
  const s = info.season;
  if (!s?.nhiemVu?.length) return null;
  const year = seasonYear(s, info.lunar);
  const quests = s.nhiemVu
    .map((quest) => ({ quest, kind: classifyQuest(quest), key: questKey(s.id, year, quest.id) }))
    .filter((q) => !q.kind.hidden)
    .map((q) => ({ ...q, done: !!store.state.seasonQuests[q.key] }));
  return quests.length ? { seasonName: s.ten, quests } : null;
}

/** Gọi khi người chơi xong một nghi thức: hoàn thành các nhiệm vụ mùa khớp. Trả về tên nhiệm vụ vừa xong. */
export function completeSeasonQuestsByRitual(kind: RitualKind, amount: number): string[] {
  const today = seasonQuestsToday();
  if (!today) return [];
  const done: string[] = [];
  for (const q of today.quests) {
    if (q.done || q.kind.ritual !== kind) continue;
    if (kind === 'meditation' && amount < (q.kind.minMinutes ?? 1)) continue;
    const r = store.dispatch({ type: 'seasonQuest', key: q.key, dateKey: todayInfo().dateKey });
    if (r.amount > 0) done.push(q.quest.ten);
  }
  return done;
}

/** Người chơi tự đánh dấu một việc ngoài đời đã làm. */
export function markSeasonQuestDone(key: string): number {
  return store.dispatch({ type: 'seasonQuest', key, dateKey: todayInfo().dateKey }).amount;
}
