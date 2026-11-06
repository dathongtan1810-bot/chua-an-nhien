import { expect, test } from '@playwright/test';

// E2E_CPU_THROTTLE=4 mô phỏng máy CI chậm
test.beforeEach(async ({ page }) => {
  const rate = Number(process.env.E2E_CPU_THROTTLE || 0);
  if (rate > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  }
});

test('vào game → thắp hương → thả đèn', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('[console.error]', m.text()));
  await page.goto('/');
  await page.getByRole('button', { name: 'Bước vào cổng chùa' }).click();
  await expect(page.locator('.hud-title')).toHaveText('Cổng tam quan');

  // Đi tới sân chùa rồi chính điện qua thanh hành động
  await page.locator('.act.nav', { hasText: 'Sân chùa' }).first().click();
  await expect(page.locator('.hud-title')).toHaveText('Sân chùa', { timeout: 10000 });
  expect(errors, errors.join('\n')).toEqual([]);

  // Thắp hương
  await page.locator('.act', { hasText: 'Thắp hương' }).click();
  await page.getByRole('button', { name: '3 nén' }).click();
  const hold = page.locator('.ritual-panel .btn.primary');
  const box = (await hold.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1700);
  await page.mouse.up();
  await page.locator('.ritual-panel .btn.primary', { hasText: 'Thắp hương' }).click();
  await expect(page.locator('.ritual-hint')).toContainText('Hương đã thắp', { timeout: 5000 });
  await expect(page.locator('.hatsen')).not.toHaveText('🪷 0');
  await page.getByRole('button', { name: 'Xong' }).click();

  // Đi tới bờ sông bằng bản đồ
  await page.locator('.minimap').click();
  await page.getByRole('dialog').locator('button.chip', { hasText: 'Bờ sông thả đèn' }).click();
  await expect(page.locator('.hud-title')).toHaveText('Bờ sông thả đèn', { timeout: 5000 });

  // Thả đèn
  await page.locator('.act', { hasText: 'Thả đèn hoa đăng' }).click();
  await page.locator('.ritual-panel textarea').fill('Cầu cho gia đình bình an, mạnh khỏe.');
  await page.locator('.ritual-panel button', { hasText: /Thả đèn$/ }).click();
  await expect(page.locator('.hatsen')).not.toHaveText('🪷 4', { timeout: 5000 });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('link mời mở thẳng ra bờ sông', async ({ page }) => {
  await page.goto('/?invite=1#bo-song');
  await page.getByRole('button', { name: 'Bước vào cổng chùa' }).click();
  await expect(page.locator('.hud-title')).toHaveText('Bờ sông thả đèn');
});

test('a11y: bảng Cài đặt giữ focus bàn phím và trả focus khi đóng', async ({ page }) => {
  await page.goto('/?skip&area=san');
  const opener = page.getByRole('button', { name: 'Cài đặt', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.sheet'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
