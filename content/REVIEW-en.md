# Review – English content (native-level edit)

Scope: `_parts/en-que-xam-01..04.json` (→ `i18n/en/que-xam.json` via `tools/merge.mjs`), `i18n/en/thong-diep-ngay.json`, `i18n/en/loi-nguyen-mau.json`, `i18n/en/su-kien-am-lich.json`, `i18n/en/mua/*.json`. Ids, keys, structure unchanged. Check: `node tools/merge.mjs && node validate.mjs` → 0 errors, 0 warnings.

## Counts (targeted edits + mechanical replacements)
| File | Targeted edits | Mechanical (terminology/spelling/contractions) |
|---|---|---|
| en-que-xam-01 (1–25) | 68 (verse lines + prose) | 114 |
| en-que-xam-02 (26–50) | 62 | 112 |
| en-que-xam-03 (51–75) | 45 | 72 |
| en-que-xam-04 (76–100) | 58 | 66 |
| thong-diep-ngay | 21 messages | – |
| loi-nguyen-mau | 15 prayers | 5 (Mum → Mom) |
| su-kien-am-lich | 23 | 12 |
| mua/tet | 15 | 21 |
| mua/vu-lan | 8 | 16 |
| mua/phat-dan, ram-thang-gieng, trung-thu (new during review) | 15 verse lines/titles | 60 |

## Verses (`tho`)
- ~60 of 100 verses rewritten in whole or part to rhyme cleanly (AABB) and scan: tetrameter for 1–50 and 76–100, pentameter for 51–75 (as in each batch). Removed filler/archaisms ("comes nigh", "naught", "bide"), identical rhymes (65 leaves/leaves, 73 frame/frame), ungrammatical lines (9 "never let you stray"), and odd images (29 "railing stray", 99 "love mends the lot").
- Re-translated to the new Vietnamese verses (REVIEW-tho.md): 2, 3, 4, 5, 13, 19, 23, 24, 25, 33, 37, 42, 45, 48, 52, 59, 64, 71, 73, 76, 82, 85, 92, 93, 96, 100. Verse 93 now says the smoke rises straight because the wind is still (an image of integrity), and its `loiGiai` gained the matching sentence: "That is simply nature, not an omen…".
- Season verses (`queDacBiet`) in all 5 season files: fixed weak rhymes and meter (e.g. Vu Lan "The Rose of Gratitude" had no rhyme).

## Prose
- "This lot" / "this reading" → "This verse" everywhere (≈100×).
- Contractions in verse prose and season files ("do not" → "don't", etc.) to match the warmer tone already used in the daily messages.
- Smaller fixes: "keep fewer scores" → "keep score less"; "Family deserve" → "Your family deserves"; "learns from their own self" → "…own mistakes"; dangling modifiers (daily 43, verse 95); "speaks of fate" → "love and connection" (83); "lift" → "elevator"; "sits an exam" → "takes"; "revision" → "reviewing".
- Removed luck/superstition wording: "good fortune does not drop from the sky" → "a good harvest…", "one stroke of luck" → "one windfall", "lucky envelopes" → "red envelopes", sprig "not for holding on to luck" → "not a charm to cling to", "fortune stick" → "verse", Vu Lan "pardon day for wandering souls" → "a day to remember wandering souls with compassion". No "lucky/unlucky/guaranteed/curse/lottery/miracle" remain.
- Donations reworded as giving items in kind (daily 131, 337); no money offerings.

## Terminology decisions
- **pagoda** (never "temple"): "An Nhiên Pagoda", "pagoda bell/yard/kitchen"; verse 79 title → "The Morning Pagoda Bell".
- **verse** for quẻ/xăm (not "lot", "fortune", "reading", "fortune stick").
- **Lunar New Year (Tết)** at first mention per file, then "Tết".
- **Vu Lan (Ullambana)** at first mention per file, then "Vu Lan".
- **Buddha's Birthday (Vesak)** at first mention, then "Buddha's Birthday".
- **Guanyin (Quan Âm)** at first mention, then "Guanyin" ("Avalokiteshvara" removed; event titles: "Guanyin (Quan Âm) Birthday", "Guanyin Enlightenment Day", "Guanyin Renunciation Day").
- **American spelling**: color, honor, neighbor, gray, travelers, practice (verb), recognize, apologize, summarize, rumors, signaling, counselor, Mom.

## Session 2026-11-08
Scope: `i18n/en/giao-dien.json`, `i18n/en/thong-bao-day.json`, `i18n/en/mua/thanh-dao.json`, `i18n/en/mua/doan-ngo.json`, checked string by string against the VI source. Keys, ids and placeholders (`{n}`, `{nickname}`, `{ngay}`) unchanged. `node content/validate.mjs` → 0 errors, 0 warnings.

| File | Strings edited |
|---|---|
| giao-dien | 36 |
| thong-bao-day | 48 (titles + bodies) |
| mua/thanh-dao | 33 (incl. 4 verse lines) |
| mua/doan-ngo | 38 (incl. 8 verse lines) |

- **UI:** "Bài thơ" → "Poem" (it was "The verse", which clashed with "Verse {n}"); "Lời giải" → "Interpretation"; counters reworded so plurals still read right when n = 1 ("Sticks of incense lit today: {n}", "Strikes: {n}", "Days to go: {n}"); "Post anonymously" → "Hang anonymously"; "Suggest a wish" → "Show a sample wish"; "Hide wishes from this writer" to match "Blocked writers"; moderation messages made clearer ("unsuitable words have been hidden", "flagged for review"); contractions used consistently in the friendly messages.
- **Notifications:** removed a repeated word (01 "moment… moment"); fixed literal phrasings ("everything will have its turn" → "come in its own time", "Kindness warms both sides" → "Kind words warm both people", "Hello new month"); "Lunar New Year's Eve"; title "First Full Moon of the Lunar Year" to match the UI; Amitabha "recite a few lines" → "chant his name"; Guanyin body no longer repeats "(Quan Âm)" right after the title.
- **Thành Đạo:** "milk porridge" used everywhere (one place said "milk rice porridge"); "miracle" wording in message 9 removed; "forgive one old thing/matter" → "old hurt"; "A pot of ginger tea" (task reward and decoration kept in sync); verses: replaced "Grow calm, and open wide the heart inside", "the goal is yours to keep" (now "gray/way") and "walk more steady" (ungrammatical).
- **Đoan Ngọ:** rewrote the awkward description ("a festival folk tradition also calls…"); "con cháu" → "children and grandchildren"; "siblings in my family" → "my brothers and sisters"; verses now rhyme properly (AABB): "full/cool, low/flows" → "sweet/eat, low/flow"; "ebb and flow" (which got the meaning wrong) → "ease/cease"; "green/evening scene" → "soon/afternoon". Message 14 was left as another session's editor had just updated it.
- Note: the task brief said "fix American spelling", but D33 requires American English, so American spelling was kept and applied (e.g. "gray", "Neighborly", Oxford commas in edited lists).
