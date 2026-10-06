import { test, expect, type Page } from '@playwright/test';
import { emptyDraft, restoreDraft, validateDraft } from '../src/lib/creatures/draft';

const backend = 'http://127.0.0.1:54399';
const owner = '11111111-1111-4111-8111-111111111111';
test.beforeEach(async ({ request }) => { await request.post(`${backend}/__test/reset`); });

async function login(page: Page, admin = false, next = '/dieu-tra-vien') {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.locator('#loginEmail').fill(admin ? 'admin@example.com' : 'test@example.com');
  await page.locator('#loginPassword').fill('mock-password');
  await page.locator('#loginButton').click();
  await expect(page).toHaveURL(new RegExp(next.split('?')[0] + '(?:\\?|$)'));
}
async function fillRecord(page: Page) {
  await page.locator('#creatureName').fill('Sinh vật React mới');
  await page.locator('#creatureSpecies').selectOption('beast');
  await page.locator('#creatureUniverse').fill('Vũ trụ React');
  await page.locator('#creaturePlanet').fill('Hành tinh React');
  await page.locator('#creatureThreat').selectOption('B');
  await page.locator('#creatureDescription').fill('Một sinh vật đang được mô tả đủ chi tiết để kiểm tra việc lưu hồ sơ mới.');
  await page.locator('#creatureWeaknesses').fill('Ánh sáng mạnh');
  await page.locator('#abilityName0').fill('Dịch chuyển');
  await page.locator('#abilityDescription0').fill('Mở cổng không gian.');
}

test('archive paginates all results, filters statuses and restores list view', async ({ page }) => {
  await page.goto('/kho-du-lieu');
  await expect(page.locator('.archive-creature-card')).toHaveCount(12);
  await expect(page.locator('#archiveResultCount')).toHaveText('25 hồ sơ');
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toContainText('Trang 2 / 3');
  await page.getByLabel('Đã xác minh', { exact: true }).check();
  await expect(page.locator('#archiveResultCount')).toHaveText('12 hồ sơ');
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toContainText('Trang 1 / 1');
  await page.getByRole('button', { name: 'Dạng danh sách' }).click();
  await expect(page.locator('#archiveCreatureGrid')).toHaveClass(/mca-list-view/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dạng danh sách' })).toHaveAttribute('aria-pressed', 'true');
});

test('search changes cancel stale requests instead of restoring old results', async ({ page }) => {
  await page.route('**/rest/v1/creatures?**', async route => {
    if (route.request().method() !== 'HEAD' && decodeURIComponent(route.request().url()).includes('ilike.%cũ%')) {
      await new Promise(resolve => setTimeout(resolve, 700));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 999, name: 'Dữ liệu cũ', species: 'beast' }]) });
    }
    return route.continue();
  });
  await page.goto('/kho-du-lieu');
  await page.locator('#archiveSearchInput').fill('cũ');
  await page.waitForTimeout(300);
  await page.locator('#archiveSearchInput').fill('Sinh vật kiểm thử');
  await expect(page.locator('.archive-creature-card')).toHaveCount(1);
  await expect(page.locator('.archive-creature-card')).toContainText('Sinh vật kiểm thử');
  await page.waitForTimeout(800);
  await expect(page.locator('.archive-creature-card')).toContainText('Sinh vật kiểm thử');
});

test('Next Link navigation retains the document and safely escapes database text', async ({ page }) => {
  await page.goto('/kho-du-lieu');
  await page.evaluate(() => { (window as unknown as { marker: string }).marker = 'same-document'; });
  await page.locator('.archive-creature-card').first().getByRole('link').click();
  await expect(page.locator('#creatureDetailContent')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { marker?: string }).marker)).toBe('same-document');
  await page.getByRole('link', { name: '← Kho dữ liệu' }).click();
  await expect(page.locator('.archive-creature-card')).toHaveCount(12);
  await page.route('**/rest/v1/creatures?**', route => {
    if (route.request().method() === 'HEAD') return route.continue();
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 777, name: '<img src=x onerror=alert(1)>', species: 'beast', status: 'pending' }]) });
  });
  await page.locator('#archiveSearchInput').fill('unsafe');
  await expect(page.locator('.archive-creature-card h3')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('img[src="x"], [onclick], [data-legacy-action]')).toHaveCount(0);
});

test('signed in investigator sees their real profile and can update their own name', async ({ page, request }) => {
  await login(page);
  await expect(page.locator('#investigatorUsername')).toHaveText('Điều tra viên thật');
  await expect(page.locator('.mca-profile-stats')).toContainText('25');
  await expect(page.locator('body')).not.toContainText('Kenya');
  await page.getByRole('button', { name: 'Chỉnh sửa tên' }).click();
  await page.locator('#profileUsername').fill('Tên mới từ React');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.locator('#investigatorUsername')).toHaveText('Tên mới từ React');
  await expect(page.locator('#headerUsername')).toHaveText('Tên mới từ React');
  const state = await (await request.get(`${backend}/__test/state`)).json();
  expect(state.calls.find((call: { table: string }) => call.table === 'profiles').body).toEqual({ username: 'Tên mới từ React' });
});

test('regular users remain denied by the server on admin pages', async ({ page }) => {
  await login(page, false, '/admin');
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible();
  await expect(page.locator('#adminDashboard')).toHaveCount(0);
  await page.goto('/admin-chi-tiet?id=1');
  await expect(page.locator('#reviewContent')).toHaveCount(0);
});

test('draft restores by account, limits abilities and clears only after a complete submission', async ({ page, request }) => {
  await login(page, false, '/tao-ho-so');
  await fillRecord(page);
  for (let i = 1; i < 5; i++) { await page.locator('#addAbilityButton').click(); await page.locator(`#abilityName${i}`).fill(`Kỹ năng ${i + 1}`); }
  await expect(page.locator('#abilityCounter')).toHaveText('5/5');
  await expect(page.locator('#addAbilityButton')).toBeDisabled();
  await page.locator('#saveDraftButton').click();
  await page.reload();
  await expect(page.locator('#creatureName')).toHaveValue('Sinh vật React mới');
  await expect(page.locator('.ability-item')).toHaveCount(5);
  await page.locator('.create-submit-button').dblclick();
  await expect(page.getByRole('heading', { name: 'Sinh vật React mới' })).toBeVisible();
  const state = await (await request.get(`${backend}/__test/state`)).json();
  expect(state.calls.filter((call: { table: string; method: string }) => call.table === 'creatures' && call.method === 'POST')).toHaveLength(1);
  expect(state.calls.find((call: { table: string; method: string }) => call.table === 'creature_abilities' && call.method === 'POST').body).toHaveLength(5);
  expect(await page.evaluate(key => localStorage.getItem(key), `mcaCreatureDraft:${owner}`)).toBeNull();
});

test('image validation rejects invalid files and successful upload uses the user folder', async ({ page, request }) => {
  await login(page, false, '/tao-ho-so');
  await fillRecord(page);
  await page.locator('#creatureImage').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.locator('#createMessage')).toContainText('Chỉ chấp nhận ảnh');
  await page.locator('#creatureImage').setInputFiles({ name: 'creature.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrlsAAAAASUVORK5CYII=', 'base64') });
  await expect(page.locator('#creatureImagePreview')).toBeVisible();
  await page.locator('.create-submit-button').click();
  await expect(page.getByRole('heading', { name: 'Sinh vật React mới' })).toBeVisible();
  const state = await (await request.get(`${backend}/__test/state`)).json();
  expect(state.calls.find((call: { table: string; method: string }) => call.table === 'storage' && call.method === 'POST').path).toContain(`/creature-images/${owner}/`);
});

test('failed ability save rolls back the created record and retains the draft', async ({ page, request }) => {
  await request.post(`${backend}/__test/fail`, { data: { creature_abilities: true } });
  await login(page, false, '/tao-ho-so'); await fillRecord(page);
  await page.locator('#saveDraftButton').click();
  await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('Không lưu được kỹ năng');
  await expect(page.locator('.create-submit-button')).toBeEnabled();
  const state = await (await request.get(`${backend}/__test/state`)).json();
  expect(state.records).toHaveLength(25);
  expect(state.calls.some((call: { table: string; method: string }) => call.table === 'creatures' && call.method === 'DELETE')).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), `mcaCreatureDraft:${owner}`)).not.toBeNull();
});

test('rollback denial blocks blind retries and exposes the partially saved record', async ({ page, request }) => {
  await request.post(`${backend}/__test/fail`, { data: { creature_abilities: true, delete: true } });
  await login(page, false, '/tao-ho-so'); await fillRecord(page);
  await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('không thể hoàn tác');
  await expect(page.getByRole('link', { name: 'Mở hồ sơ đã lưu một phần' })).toBeVisible();
  await expect(page.locator('.create-submit-button')).toBeDisabled();
});

test('admin review requires a threat level, calls the existing RPC once and displays the new status', async ({ page, request }) => {
  await login(page, true, '/admin');
  await expect(page.locator('#adminCreatureList .archive-creature-card')).toHaveCount(12);
  await page.locator('#adminCreatureList .archive-creature-card').first().getByRole('link').click();
  await expect(page.locator('#reviewContent')).toBeVisible();
  await page.locator('#verifyCreatureButton').click();
  await expect(page.locator('#reviewMessage')).toHaveText('Hãy chọn cấp đe dọa chính thức trước khi xác minh.');
  await page.locator('#adminThreatSelect').selectOption('S');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#verifyCreatureButton').click();
  await expect(page.locator('#reviewMessage')).toHaveText('Đã cập nhật hồ sơ.');
  const state = await (await request.get(`${backend}/__test/state`)).json();
  const rpc = state.calls.filter((call: { table: string }) => call.table === 'rpc');
  expect(rpc).toHaveLength(1);
  expect(rpc[0].body.p_status).toBe('verified'); expect(rpc[0].body.p_verified_threat_level).toBe('S');
});

test('corrupted drafts are bounded and validation rejects unnamed abilities', () => {
  const draft = restoreDraft({ name: 'x'.repeat(10000), abilities: Array.from({ length: 20 }, () => ({ name: 'x', description: 'y' })) });
  expect(draft.name).toHaveLength(100); expect(draft.abilities).toHaveLength(5);
  const complete = { ...emptyDraft(), name: 'Sinh vật', species: 'beast', universe: 'Vũ trụ', planet: 'Hành tinh', threatLevel: 'A', description: 'Mô tả sinh vật đủ dài để hoàn thành kiểm tra.', weaknesses: 'Ánh sáng' };
  expect(validateDraft(complete)).toContain('tên cho mỗi kỹ năng');
});

test('combined search and threat filtering use the verified level first', async ({ page }) => {
  await page.goto('/kho-du-lieu');
  await page.locator('#archiveSearchInput').fill('Sinh vật');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(page.locator('#archiveResultCount')).toHaveText('12 hồ sơ');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.locator('#archiveResultCount')).toHaveText('13 hồ sơ');
  await expect(page.locator('.mca-card-badges')).toContainText(Array.from({ length: 12 }, () => 'Cấp B'));
});

test('failed submission removes an uploaded orphan image after confirmed rollback', async ({ page, request }) => {
  await request.post(`${backend}/__test/fail`, { data: { creature_abilities: true } });
  await login(page, false, '/tao-ho-so'); await fillRecord(page);
  await page.locator('#creatureImage').setInputFiles({ name: 'creature.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrlsAAAAASUVORK5CYII=', 'base64') });
  await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('Không lưu được kỹ năng');
  const state = await (await request.get(`${backend}/__test/state`)).json();
  expect(state.calls.some((call: { table: string; method: string }) => call.table === 'storage' && call.method === 'DELETE')).toBe(true);
});

test('native pages fit mobile and retain their usable controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/kho-du-lieu', '/chi-tiet-sinh-vat?id=1']) {
    await page.goto(path);
    await expect(page.locator('.mca-main')).toBeVisible();
    if (path.includes('chi-tiet')) await expect(page.locator('#creatureDetailContent')).toBeVisible();
    else await expect(page.locator('.archive-creature-card')).toHaveCount(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('detail-mobile.png'), fullPage: true });
  await login(page, false, '/tao-ho-so');
  await expect(page.locator('#creatureForm')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('create-mobile.png'), fullPage: true });
  await login(page, true, '/admin');
  await expect(page.locator('#adminDashboard')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('admin-mobile.png'), fullPage: true });
});
