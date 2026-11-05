# content/ – Nội dung game "Chùa An Nhiên"

| File | Mô tả | Schema |
|---|---|---|
| `que-xam.json` | 100 quẻ xăm, thơ lục bát 4 câu tự sáng tác, lời giải theo 6 chủ đề | `que-xam.schema.json` |
| `tu-cam.json` | Từ cần lọc (có dấu/không dấu/viết tắt/teencode) + allowlist | `tu-cam.schema.json` |
| `su-kien-am-lich.json` | Lễ Phật giáo & dân gian theo âm lịch, trang trí, nhiệm vụ | `su-kien-am-lich.schema.json` |
| `thong-diep-ngay.json` | 366 thông điệp mỗi ngày (≤ 160 ký tự) | `thong-diep-ngay.schema.json` |
| `loi-nguyen-mau.json` | 300 lời nguyện mẫu (≤ 120 ký tự) | `loi-nguyen-mau.schema.json` |
| `i18n/en/*.json` | Bản tiếng Anh (cùng id, cùng schema) | như trên |
| `mua/` | Bộ nội dung theo mùa (Tết, Vu Lan) | — |

## Lệnh
```bash
node content/validate.mjs          # schema, trùng lặp, độ dài, luật lục bát, cụm từ cấm trong nội dung biên tập
node --test content/tu-cam.test.mjs # kiểm thử bộ lọc từ
node content/tools/lucbat.mjs content/que-xam.json   # kiểm riêng luật lục bát
node content/tools/merge.mjs       # gộp các lô trong _parts/ thành que-xam.json (+ bản EN)
node content/tools/check-site.mjs  # kiểm tra site/
```

Quy ước & quyết định: xem `DECISIONS.md`. Bàn giao: `HANDOFF.md`.
