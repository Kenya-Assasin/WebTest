import { test, expect } from '@playwright/test';
import { safeReturnPath } from '../src/lib/auth/redirect';

test('return URLs reject external sites and retain detail parameters', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/dang-nhap', '/%2f%2fevil.example']) expect(safeReturnPath(value)).toBe('/');
  expect(safeReturnPath('/admin-chi-tiet?id=42')).toBe('/admin-chi-tiet?id=42');
  expect(safeReturnPath('/tao-ho-so')).toBe('/tao-ho-so');
});

test('old URLs preserve the creature ID when redirected', async ({ request }) => {
  const response = await request.get('/chi-tiet-sinh-vat.html?id=42', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe('/chi-tiet-sinh-vat?id=42');
});

test('guests cannot receive protected pages', async ({ page }) => {
  for (const path of ['/tao-ho-so', '/dieu-tra-vien', '/admin', '/admin-chi-tiet?id=42']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dang-nhap\?next=/);
    await expect(page.locator('#loginForm')).toBeVisible();
    expect(new URL(page.url()).searchParams.get('next')).toBe(path);
    await expect(page.locator('#creatureForm, #adminDashboard, #reviewContent')).toHaveCount(0);
  }
});

test('registration validates mismatched passwords without writing to Supabase', async ({ page }) => {
  let writes = 0;
  await page.route('**/auth/v1/signup**', route => { writes++; return route.abort(); });
  await page.goto('/dang-ky');
  await page.getByLabel('TÊN ĐIỀU TRA VIÊN').fill('Điều tra viên thử nghiệm');
  await page.getByLabel('EMAIL', { exact: true }).fill('test@example.com');
  await page.getByLabel('MẬT KHẨU', { exact: true }).fill('password123');
  await page.getByLabel('XÁC NHẬN MẬT KHẨU', { exact: true }).fill('different123');
  await page.locator('#registerButton').click();
  await expect(page.locator('#authMessage')).toHaveText('Mật khẩu xác nhận không khớp.');
  expect(writes).toBe(0);
});

test('login reports Supabase errors and re-enables submit', async ({ page }) => {
  await page.route('**/auth/v1/token**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) }));
  await page.goto('/dang-nhap');
  await page.getByLabel('EMAIL', { exact: true }).fill('test@example.com');
  await page.getByLabel('MẬT KHẨU', { exact: true }).fill('wrong-password');
  await page.locator('#loginButton').click();
  await expect(page.locator('#authMessage')).toHaveText('Email hoặc mật khẩu không chính xác.');
  await expect(page.locator('#loginButton')).toBeEnabled();
});

test('archive filters backend data and opens the detail route', async ({ page, request }) => {
  await request.post('http://127.0.0.1:54399/__test/reset');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/kho-du-lieu');
  await expect(page.locator('.archive-creature-card')).toHaveCount(12);
  await page.locator('#archiveSearchInput').fill('Sinh vật kiểm thử');
  await expect(page.locator('.archive-creature-card:visible')).toHaveCount(1);
  await page.locator('.archive-creature-card:visible').click();
  await expect(page).toHaveURL(/\/chi-tiet-sinh-vat\?id=1$/);
  await expect(page.locator('#detailCreatureName')).toHaveText('Sinh vật kiểm thử');
  expect(errors).toEqual([]);
});

test('detail without an ID shows a helpful message', async ({ page }) => {
  await page.goto('/chi-tiet-sinh-vat');
  await expect(page.locator('#creatureErrorMessage')).toHaveText('URL không chứa ID hồ sơ.');
  await expect(page.locator('#creatureError')).toBeVisible();
});

test('home initializes in React and contains no inline JavaScript or CDN SDK', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.topbar')).toHaveCount(1);
  await expect(page.locator('.site-footer')).toHaveCount(1);
  await expect(page.locator('[onclick], script[src*="jsdelivr"]')).toHaveCount(0);
  await page.locator('#homeSearchInput').fill('không-có-sinh-vật-này');
  await expect(page.locator('.home-creature-card:visible')).toHaveCount(0);
  expect(errors).toEqual([]);
});
