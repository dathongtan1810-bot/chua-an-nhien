// Kiểm tra gói tải đầu < 3 MB (tổng file trong dist trừ icon PWA lớn & sw cache phụ).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const LIMIT = 3 * 1024 * 1024;
let total = 0;
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (!/icons?\//.test(p) && !/splash/.test(p)) total += s.size;
  }
};
walk('dist');
console.log(`dist size (excluding icons/splash): ${(total / 1024).toFixed(1)} KiB`);
if (total > LIMIT) {
  console.error('Initial bundle exceeds 3 MB');
  process.exit(1);
}
