// Đóng gói src + ../shared thành một file ESM; thư viện npm để external (resolve từ server/node_modules).
import { build } from 'esbuild';
const entries = { index: 'src/index.ts', loadtest: 'scripts/loadtest.ts', soak: 'scripts/soak.ts' };
await build({
  entryPoints: entries,
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
console.log('build ok');
