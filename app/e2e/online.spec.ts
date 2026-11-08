import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * E2E với server Socket.IO thật (phiên backend). Chỉ chạy khi có E2E_SERVER_URL
 * và app được build với VITE_SERVER_URL trỏ tới server đó (xem script `npm run e2e:server`).
 */
const SERVER = process.env.E2E_SERVER_URL;
test.skip(!SERVER, 'Cần E2E_SERVER_URL (server thật) — xem npm run e2e:server');

type Net = { status: string; online: number; userId: string; lanterns: Map<string, { text: string; nickname: string }> };
const netState = (p: Page) =>
  p.evaluate(() => {
    const n = (window as unknown as { __net: Net }).__net;
    return { status: n.status, online: n.online, userId: n.userId, texts: [...n.lanterns.values()].map((l) => l.text) };
  });

async function visitor(browser: Browser, area: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 } });
  const p = await ctx.newPage();
  await p.goto(`/?skip&area=${area}`);
  await expect.poll(async () => (await netState(p)).status, { timeout: 15000 }).toBe('online');
  return p;
}

test('hai người cùng viếng: thấy nhau, thấy hương và đèn của nhau', async ({ browser }) => {
  const errors: string[] = [];
  const a = await visitor(browser, 'san');
  const b = await visitor(browser, 'san');
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));

  // Presence: cả hai thấy ≥ 2 người đang viếng
  await expect.poll(async () => (await netState(a)).online, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  await expect(b.locator('.hud-online')).toContainText(/Đang có [2-9]\d* người viếng chùa/, { timeout: 10000 });

  // A thắp hương → B thấy hương mới trong lư (đếm que hương trong BurnerDisplay)
  const sticks = (p: Page) =>
    p.evaluate(() => {
      const g = (window as unknown as { __game: { scene: { getScene(k: string): { burner?: { count: number } } } } }).__game;
      return g.scene.getScene('area').burner?.count ?? 0;
    });
  const before = await sticks(b);
  await a.evaluate(() => (window as unknown as { __net: { lightIncense(n: number): void } }).__net.lightIncense(3));
  await expect.poll(() => sticks(b), { timeout: 10000 }).toBeGreaterThan(before);

  // A thả đèn ở bờ sông → B (ở bờ sông) thấy đèn trôi trên sông
  const wish = 'Cầu cho mọi người bình an ' + Date.now().toString(36);
  for (const p of [a, b]) {
    await p.goto('/?skip&area=bo-song');
    await expect.poll(async () => (await netState(p)).status, { timeout: 15000 }).toBe('online');
  }
  await a.locator('.act', { hasText: 'Thả đèn hoa đăng' }).click();
  await a.locator('.ritual-panel textarea').fill(wish);
  await a.locator('.ritual-panel button', { hasText: /Thả đèn$/ }).click();
  await expect.poll(async () => (await netState(b)).texts, { timeout: 10000 }).toContain(wish);
  const onRiver = await b.evaluate((w) => {
    const g = (window as unknown as { __game: { scene: { getScene(k: string): { river?: { count: number } } } } }).__game;
    return { count: g.scene.getScene('area').river?.count ?? 0, w };
  }, wish);
  expect(onRiver.count).toBeGreaterThan(0);

  // REST: đèn có trong /api/lanterns
  const res = await (await fetch(`${SERVER}/api/lanterns`)).json();
  const list = Array.isArray(res) ? res : res.lanterns;
  expect(list.map((l: { text: string }) => l.text)).toContain(wish);
  expect(errors).toEqual([]);
});
