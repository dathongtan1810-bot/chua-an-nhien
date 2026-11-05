import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addEntry, clearJournal, listEntries } from '../src/storage/journal';

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
