import { test, expect, type Page } from '@playwright/test';
test.skip(process.env.MCA_TEST_PHASE3 !== '1', 'Run with npm run test:phase3 to enable the isolated phase 3 backend.');
const backend = 'http://127.0.0.1:54399';
const owner = '11111111-1111-4111-8111-111111111111';
const attemptKey=`mcaCreatureSubmission:${owner}`;
test.beforeEach(async ({request}) => { await request.post(`${backend}/__test/reset`); });
async function login(page:Page,admin=false,next='/chi-tiet-sinh-vat?id=1') {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.locator('#loginEmail').fill(admin?'admin@example.com':'test@example.com');
  await page.locator('#loginPassword').fill('mock-password');
  await page.locator('#loginButton').click();
  await expect(page).toHaveURL(new RegExp(next.split('?')[0]));
}
async function fill(page:Page) {
  await page.locator('#creatureName').fill('Sinh vật giai đoạn ba');
  await page.locator('#creatureSpecies').selectOption('beast');
  await page.locator('#creatureUniverse').fill('Vũ trụ');
  await page.locator('#creaturePlanet').fill('Hành tinh');
  await page.locator('#creatureThreat').selectOption('B');
  await page.locator('#creatureDescription').fill('Một mô tả đầy đủ cho sinh vật mới trong giai đoạn ba.');
  await page.locator('#creatureWeaknesses').fill('Ánh sáng');
  await page.locator('#abilityName0').fill('Dịch chuyển');
}
test('guests are invited to sign in and cannot write a favorite',async({page,request})=>{
  await page.goto('/chi-tiet-sinh-vat?id=1');
  await page.getByRole('link',{name:'Đăng nhập để yêu thích'}).click();
  await expect(page).toHaveURL(/dang-nhap.*chi-tiet-sinh-vat/);
  expect((await (await request.get(`${backend}/__test/state`)).json()).favorites).toHaveLength(0);
});
test('favorites sync across sessions, are removed from profile and isolate switched accounts',async({page,browser,request})=>{
  await login(page);
  const heart=page.getByRole('button',{name:'Yêu thích Sinh vật kiểm thử',exact:true});
  await expect(heart).toBeEnabled(); await heart.dblclick();
  await expect(page.getByRole('button',{name:'Bỏ yêu thích Sinh vật kiểm thử'})).toHaveAttribute('aria-pressed','true');
  const second=await browser.newContext();const secondPage=await second.newPage();
  await login(secondPage,false,'/dieu-tra-vien');
  await expect(secondPage.locator('#favoriteRecords .mca-card')).toHaveCount(1);
  await expect(secondPage.locator('#favoriteRecords')).toContainText('Sinh vật kiểm thử');
  await secondPage.locator('#favoriteRecords').getByRole('button',{name:'Bỏ yêu thích Sinh vật kiểm thử'}).click();
  await expect(secondPage.locator('#favoriteRecords')).toContainText('Bạn chưa yêu thích hồ sơ nào');
  await page.reload(); await expect(heart).toHaveAttribute('aria-pressed','false');
  await heart.click(); await expect(page.getByRole('button',{name:'Bỏ yêu thích Sinh vật kiểm thử'})).toBeEnabled();
  await page.locator('#headerLogoutButton').click();
  await login(page,true);
  await expect(heart).toHaveAttribute('aria-pressed','false');
  const state=await(await request.get(`${backend}/__test/state`)).json();
  expect(state.favorites).toHaveLength(1);expect(state.favorites[0].user_id).toBe(owner);
  await second.close();
});
test('failed favorites display retry and never claim a successful write',async({page,request})=>{
  await login(page);await expect(page.getByRole('button',{name:'Yêu thích Sinh vật kiểm thử',exact:true})).toBeEnabled();
  await request.post(`${backend}/__test/fail`,{data:{favorites:true}});
  await page.getByRole('button',{name:'Yêu thích Sinh vật kiểm thử',exact:true}).click();
  await expect(page.locator('.mca-favorite-control [role="alert"]')).toContainText('Chưa xác nhận được');
  await expect(page.getByRole('button',{name:'Yêu thích Sinh vật kiểm thử',exact:true})).toHaveAttribute('aria-pressed','false');
  await request.post(`${backend}/__test/fail`,{data:{favorites:false}});
  await page.getByRole('button',{name:'Tải lại yêu thích'}).click();
  await expect(page.getByRole('button',{name:'Yêu thích Sinh vật kiểm thử',exact:true})).toBeEnabled();
});
test('create sends one atomic RPC and clears request and draft after confirmation',async({page,request})=>{
  await login(page,false,'/tao-ho-so');await fill(page);
  await page.locator('.create-submit-button').dblclick();
  await expect(page.getByRole('heading',{name:'Sinh vật giai đoạn ba'})).toBeVisible();
  const state=await(await request.get(`${backend}/__test/state`)).json();
  expect(state.calls.filter((c:{table:string})=>c.table==='submit_rpc')).toHaveLength(1);
  expect(state.records).toHaveLength(26);expect(state.abilities).toHaveLength(2);
  expect(state.calls.filter((c:{table:string;method:string})=>['creatures','creature_abilities'].includes(c.table)&&c.method==='POST')).toHaveLength(0);
  expect(await page.evaluate(key=>localStorage.getItem(key),attemptKey)).toBeNull();
  expect(await page.evaluate(key=>localStorage.getItem(key),`mcaCreatureDraft:${owner}`)).toBeNull();
});
test('favorites load beyond the API row limit and profile paginates all saved records',async({page,request})=>{
  await request.post(`${backend}/__test/seed-favorites`,{data:{count:1001}});
  await login(page,false,'/chi-tiet-sinh-vat?id=1001');
  await expect(page.getByRole('button',{name:'Bỏ yêu thích Sinh vật 1001'})).toHaveAttribute('aria-pressed','true');
  await page.goto('/dieu-tra-vien');
  await expect(page.locator('#favoriteRecords .mca-panel-heading')).toContainText('1001 hồ sơ');
  await expect(page.locator('#favoriteRecords .mca-card')).toHaveCount(12);
  await page.locator('#favoriteRecords').getByRole('button',{name:'Trang sau'}).click();
  await expect(page.locator('#favoriteRecords').getByRole('navigation',{name:'Phân trang'})).toContainText('Trang 2 / 84');
});
test('response lost after commit restores pending request on reload and retries without duplicating or reuploading',async({page,request})=>{
  await request.post(`${backend}/__test/fail`,{data:{submitResponseLost:true}});
  await login(page,false,'/tao-ho-so');await fill(page);
  await page.locator('#creatureImage').setInputFiles({name:'creature.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrlsAAAAASUVORK5CYII=','base64')});
  await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('Chưa xác nhận');
  await expect(page.locator('#creatureName')).toBeDisabled();
  const saved=JSON.parse((await page.evaluate(key=>localStorage.getItem(key),attemptKey))!);
  await page.reload();await expect(page.locator('.create-submit-button')).toHaveText('KIỂM TRA LẠI YÊU CẦU');
  await expect(page.locator('#creatureName')).toHaveValue(saved.draft.name);
  await page.locator('.create-submit-button').click();
  await expect(page.getByRole('heading',{name:saved.draft.name})).toBeVisible();
  const state=await(await request.get(`${backend}/__test/state`)).json();
  expect(state.records).toHaveLength(26);expect(state.abilities).toHaveLength(2);
  expect(state.calls.filter((c:{table:string;method:string})=>c.table==='storage'&&c.method==='POST')).toHaveLength(1);
  const submits=state.calls.filter((c:{table:string})=>c.table==='submit_rpc');
  expect(submits).toHaveLength(2);expect(submits[0].body).toEqual(submits[1].body);
  expect(state.calls.filter((c:{table:string;method:string})=>c.table==='storage'&&c.method==='DELETE')).toHaveLength(0);
});
test('missing backend keeps the request and known validation failures restore editing',async({page,request})=>{
  await request.post(`${backend}/__test/fail`,{data:{submitMissing:true}});
  await login(page,false,'/tao-ho-so');await fill(page);await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('Chức năng gửi hồ sơ chưa sẵn sàng');
  await expect(page.locator('#creatureName')).toBeDisabled();
  await request.post(`${backend}/__test/fail`,{data:{submitMissing:false,submitInvalid:true}});
  await page.locator('.create-submit-button').click();
  await expect(page.locator('#createMessage')).toContainText('không hợp lệ');
  await expect(page.locator('#creatureName')).toBeEnabled();
  expect(await page.evaluate(key=>localStorage.getItem(key),attemptKey)).toBeNull();
});
test('admin uses the phase3 RPC and mobile favorite controls fit the page',async({page},testInfo)=>{
  await login(page,true,'/admin-chi-tiet?id=1');
  await page.locator('#adminThreatSelect').selectOption('S');
  page.on('dialog',dialog=>dialog.accept());
  const rpc=page.waitForRequest('**/rest/v1/rpc/mca_review_creature');
  await page.locator('#verifyCreatureButton').click();expect((await rpc).postDataJSON().p_creature_id).toBe('1');
  await expect(page.locator('#reviewMessage')).toHaveText('Đã cập nhật hồ sơ.');
  await page.setViewportSize({width:390,height:844});await page.goto('/kho-du-lieu');
  await expect(page.locator('.mca-card')).toHaveCount(12);
  const card=page.locator('.mca-card').first(); const heart=card.getByRole('button',{name:/Yêu thích/});
  await expect(heart).toBeEnabled();
  const cardBox=(await card.boundingBox())!,heartBox=(await heart.boundingBox())!;
  expect(heartBox.y+heartBox.height).toBeLessThanOrEqual(cardBox.y+cardBox.height);
  await heart.click();await expect(card.getByRole('button',{name:/Bỏ yêu thích/})).toHaveAttribute('aria-pressed','true');
  await card.screenshot({path:testInfo.outputPath('favorite-card.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('favorites-mobile.png'),fullPage:true});
});
