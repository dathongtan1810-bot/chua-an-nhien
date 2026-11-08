import { expect, test } from '@playwright/test';

/** PWA: sau lần mở đầu tiên, tắt mạng vẫn vào chùa và thắp hương được (service worker + cache). */
test('chơi được offline sau lần mở đầu', async ({ page, context }) => {
  await page.goto('/?skip&area=san');
  // chờ service worker cài xong và điều khiển trang
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 10000 }).toBe(true);
  await expect(page.locator('.hud-title')).toHaveText('Sân chùa');
  // để các chunk (Phaser, nội dung) được lưu cache
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.hud-title')).toHaveText('Sân chùa', { timeout: 15000 });
  await expect(page.locator('#game canvas')).toBeVisible();
  // vẫn chơi được: chuyển khu và mở nghi thức
  await page.locator('.act.nav', { hasText: 'Chính điện' }).first().click();
  await expect(page.locator('.hud-title')).toHaveText('Chính điện', { timeout: 10000 });
  await page.locator('.act', { hasText: 'Gõ mõ' }).click();
  await expect(page.locator('.ritual-panel')).toBeVisible();
  await context.setOffline(false);
});
