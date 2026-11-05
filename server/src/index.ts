import { loadConfig } from './config.js';
import { buildApp } from './app.js';

async function main() {
  const config = loadConfig();
  const ctx = await buildApp(config);
  await ctx.app.listen({ host: config.HOST, port: config.PORT });
  ctx.log.info({ port: config.PORT, mode: config.MODERATION_MODE, features: [...config.features] }, 'Chùa An Nhiên server ready');
  let closing = false;
  const shutdown = async (sig: string) => {
    if (closing) return;
    closing = true;
    ctx.log.info({ sig }, 'shutting down');
    const t = setTimeout(() => process.exit(1), 10_000);
    t.unref();
    await ctx.app.close();
    process.exit(0);
  };
  // Không để một lỗi bất đồng bộ lẻ làm sập cả chùa: ghi log và chạy tiếp
  process.on('unhandledRejection', (err) => ctx.log.error({ err }, 'unhandledRejection'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
