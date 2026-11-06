import { expect, test } from '@playwright/test';
import { getPlanIssues, type PackPlan } from '../src/lib/minecraft/plan';
import type { PlanEntry } from '../src/lib/minecraft/catalog';

const backend = 'http://127.0.0.1:54399';
test.beforeEach(async ({ request }) => { await request.post(backend + '/__test/reset'); });

test('new home searches by name; detail filters releases and opens an item guide', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Khám phá mod/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('minecraft-home.png'), fullPage: true });
  await page.getByRole('textbox', { name: 'Tìm dự án Minecraft' }).fill('Create');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.locator('.mc-results article')).toHaveCount(1);
  await page.getByRole('link', { name: /Create/ }).filter({ has: page.getByRole('heading', { name: 'Create', exact: true }) }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Create' })).toBeVisible();
  await page.getByLabel('Phiên bản Minecraft').fill('1.20.1');
  await page.getByLabel('Bộ nạp mod').selectOption('forge');
  await page.getByRole('button', { name: 'Lọc bản' }).click();
  await expect(page.getByLabel('Chọn bản tải')).toHaveValue('Create20');
  await expect(page.getByRole('link', { name: 'Mở bản tải' })).toHaveAttribute('href', 'https://modrinth.com/mod/create/version/Create20');
  const item = page.locator('#mechanical-press');
  await item.getByText('Cơ chế và cách sử dụng').click();
  await expect(item.getByText('Nối trục của máy với nguồn lực quay.')).toBeVisible();
  await expect(item.getByRole('link', { name: 'Nguồn của tác giả' })).toHaveAttribute('href', /github\.com\/Creators-of-Create/);
});

test('resource packs remain visible with a loader filter, and item search ignores Vietnamese accents', async ({ page }) => {
  await page.goto('/thu-vien?kind=resourcepack&loader=forge&mc=1.20.1');
  await expect(page.locator('.mc-results article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Faithful 32x' })).toBeVisible();
  await page.goto('/vat-pham?q=may%20ep');
  await expect(page.locator('.mc-guide')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Máy ép cơ khí' })).toBeVisible();
});

test('pack persists, finds missing and pinned dependencies, and detects target mismatch', async ({ page }) => {
  await page.goto('/thu-vien/iris?mc=1.20.1&loader=fabric');
  await expect(page.getByRole('link', { name: 'Sodium' })).toHaveAttribute('href', /AANobbMI.*v=SodReq01/);
  await page.getByRole('button', { name: 'Thêm vào gói' }).click();
  await page.getByRole('link', { name: 'Xem gói của tôi' }).click();
  await expect(page.getByText('Thiếu phụ thuộc bắt buộc:')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Iris Shaders' })).toBeVisible();
  await page.getByRole('link', { name: 'Sodium' }).click();
  await expect(page.getByLabel('Chọn bản tải')).toHaveValue('SodReq01');
  await page.getByLabel('Chọn bản tải').selectOption('SodOld01');
  await page.getByRole('button', { name: 'Xem bản này' }).click();
  await page.getByRole('button', { name: 'Thêm vào gói' }).click();
  await page.getByRole('link', { name: 'Xem gói của tôi' }).click();
  await expect(page.getByText('Phụ thuộc cần bản phát hành khác:')).toBeVisible();
  await page.locator('.mc-plan-issues').getByRole('link', { name: 'Sodium' }).click();
  await page.getByRole('button', { name: 'Đổi bản trong gói' }).click();
  await page.getByRole('link', { name: 'Xem gói của tôi' }).click();
  await expect(page.getByText('Chưa phát hiện vấn đề trong dữ liệu đã khai báo')).toBeVisible();
  await page.getByLabel('Bộ nạp mod').selectOption('forge');
  await expect(page.getByText('Không hỗ trợ bộ nạp đã chọn.')).toHaveCount(2);
  await page.getByLabel('Phiên bản Minecraft').fill('1.21.1');
  await expect(page.getByText('Không hỗ trợ phiên bản Minecraft đã chọn.')).toHaveCount(2);
  await page.getByRole('button', { name: 'Bỏ Sodium' }).click();
  await expect(page.getByText('Thiếu phụ thuộc bắt buộc:')).toBeVisible();
});

test('a declared incompatibility is reported only when its matching version is selected', () => {
  const entry: PlanEntry = { id: 'Example1', slug: 'example', title: 'Example', kind: 'mod', release: {
    id: 'Release1', channel: 'release', date: '', number: '1', gameVersions: ['1.20.1'], loaders: ['fabric'],
    dependencies: [{ relation: 'incompatible', projectId: 'Other123', versionId: 'OtherVer', file: null, title: 'Other' }],
  } };
  const other: PlanEntry = { ...entry, id: 'Other123', release: { ...entry.release, id: 'OldVer12', dependencies: [] } };
  const plan: PackPlan = { entries: [entry, other], target: { mc: '1.20.1', loader: 'fabric' } };
  expect(getPlanIssues(entry, plan)).toEqual([]);
  other.release.id = 'OtherVer';
  expect(getPlanIssues(entry, plan).map(issue => issue.kind)).toEqual(['conflict']);
});

test('a Modrinth outage leaves local guides available; the site fits on mobile', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await request.post(backend + '/__test/fail', { data: { modrinth: true } });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Khám phá mod/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('minecraft-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Thư viện', exact: true }).click();
  await expect(page.getByText('Chưa kết nối được với Modrinth')).toBeVisible();
  await expect(page.locator('.mc-results article')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Vật phẩm', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sổ tay vật phẩm' })).toBeVisible();
  await expect(page.locator('.mc-guide')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the publication has no creature archive or legacy account routes', async ({ request, page }) => {
  for (const path of ['/sinh-vat', '/kho-du-lieu', '/dang-nhap', '/admin']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  }
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Kho sinh vật cũ' })).toHaveCount(0);
});

test('switching language keeps the current page, filters and saved pack', async ({ page, browser }) => {
  const detail = '/thu-vien/iris?mc=1.20.1&loader=fabric';
  await page.goto(detail);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.getByRole('button', { name: 'Thêm vào gói' }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveURL(detail);
  await expect(page.getByLabel('Minecraft version')).toHaveValue('1.20.1');
  await expect(page.getByLabel('Mod loader')).toHaveValue('fabric');
  await expect(page.getByRole('button', { name: 'Already in pack' })).toBeDisabled();

  await page.getByRole('link', { name: 'My Pack', exact: true }).click();
  await expect(page.getByText('Missing required dependency:')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My Pack', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Iris Shaders', exact: true })).toBeVisible();
  await page.goto('/vat-pham?q=may+ep');
  const guide = page.locator('#mechanical-press');
  await expect(guide.getByRole('heading', { name: 'Mechanical Press' })).toBeVisible();
  await guide.getByText('How it works and how to use it').click();
  await expect(guide.getByText('Connect its shaft to a source of rotational power.')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page).toHaveURL('/vat-pham?q=may+ep');
  await expect(guide.getByRole('heading', { name: 'Máy ép cơ khí' })).toBeVisible();

  await page.setViewportSize({ width: 501, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Explore mods/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const visitor = await browser.newPage();
  try {
    await visitor.goto(new URL('/', page.url()).href);
    await expect(visitor.locator('html')).toHaveAttribute('lang', 'vi');
  } finally {
    await visitor.close();
  }
});
