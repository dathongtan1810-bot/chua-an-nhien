import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Quét a11y (WCAG 2.1 A/AA) phần giao diện HTML: HUD, các bảng, nghi thức. Canvas game không quét được. */
const scan = async (page: import('@playwright/test').Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} — ${v.nodes[0]?.target.join(' ')}`);
};

test('a11y: màn chào', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bước vào cổng chùa' })).toBeVisible();
  expect(await scan(page)).toEqual([]);
  // màn giới thiệu lần đầu
  await page.getByRole('button', { name: 'Bước vào cổng chùa' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await scan(page)).toEqual([]);
});

test('a11y: HUD và các bảng', async ({ page }) => {
  await page.goto('/?skip&area=san');
  await expect(page.locator('.hud-title')).toHaveText('Sân chùa');
  const found: string[] = [...(await scan(page))];
  for (const name of ['Hôm nay', 'Nhật ký', 'Trang trí', 'Cài đặt', 'Đi chùa cùng gia đình']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    found.push(...(await scan(page)).map((v) => `[${name}] ${v}`));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.locator('.minimap').click();
  found.push(...(await scan(page)).map((v) => `[Bản đồ] ${v}`));
  expect(found).toEqual([]);
});

test('a11y: nghi thức thả đèn & xin xăm', async ({ page }) => {
  const found: string[] = [];
  await page.goto('/?skip&area=bo-song&ritual=lantern');
  await expect(page.locator('.ritual-panel textarea')).toBeVisible();
  found.push(...(await scan(page)).map((v) => `[đèn] ${v}`));
  await page.goto('/?skip&area=am-xam&ritual=fortune');
  await expect(page.locator('.ritual-panel .chip').first()).toBeVisible();
  found.push(...(await scan(page)).map((v) => `[xăm] ${v}`));
  expect(found).toEqual([]);
});
