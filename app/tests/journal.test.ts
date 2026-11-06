import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addEntry, clearJournal, listEntries, updateEntry } from '../src/storage/journal';

describe('journal (IndexedDB)', () => {
  it('lưu và đọc theo thứ tự mới nhất trước', async () => {
    await addEntry({ at: '2026-11-05T01:00:00Z', kind: 'incense', detail: { count: 3 } });
    await addEntry({ at: '2026-11-05T02:00:00Z', kind: 'meditation', detail: { minutes: 5 } });
    const list = await listEntries();
    expect(list.map((e) => e.kind)).toEqual(['meditation', 'incense']);
    await clearJournal();
    expect(await listEntries()).toEqual([]);
  });
});

describe('journal — đánh dấu lời nguyện', () => {
  it('updateEntry gộp chi tiết vào mục có sẵn', async () => {
    await addEntry({ at: '2026-11-06T01:00:00Z', kind: 'lantern', detail: { text: 'Mẹ khỏe', color: 'vang' } });
    const [e] = await listEntries();
    await updateEntry(e.id!, { fulfilledAt: '2026-11-07' });
    const [after] = await listEntries();
    expect(after.detail).toEqual({ text: 'Mẹ khỏe', color: 'vang', fulfilledAt: '2026-11-07' });
    await clearJournal();
  });
});
