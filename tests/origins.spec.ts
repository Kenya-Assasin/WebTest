import {test,expect,type Page} from '@playwright/test';
test.skip(process.env.MCA_TEST_ORIGINS!=='1','Run npm run test:origins');
const backend='http://127.0.0.1:54399';
const kinds=['universe','galaxy','nebula','star_system','planet'];
const labels=['vũ trụ','thiên hà','tinh vân','hệ sao','hành tinh'];
test.beforeEach(async({request})=>{await request.post(`${backend}/__test/reset`);});
async function login(page:Page,admin=false,path='/tao-ho-so'){
  await page.goto(`/dang-nhap?next=${encodeURIComponent(path)}`);await page.locator('#loginEmail').fill(admin?'admin@example.com':'test@example.com');await page.locator('#loginPassword').fill('mock-password');await page.locator('#loginButton').click();await expect(page).toHaveURL(new RegExp(path));
}
async function selectChain(page:Page){for(const [index,kind] of kinds.entries()){await expect(page.locator(`#origin-${kind}`)).toBeEnabled();await page.locator(`#origin-${kind}`).selectOption(`aaaaaaaa-aaaa-4aaa-8aaa-${String(index+1).padStart(12,'0')}`);}}
async function propose(page:Page,index:number,name:string){
  await page.getByRole('button',{name:`+ Thêm ${labels[index]}`,exact:true}).click();await page.locator(`#new-origin-${kinds[index]}`).fill(name);await page.getByRole('button',{name:'Gửi đề xuất',exact:true}).click();await expect(page.locator(`#origin-${kinds[index]} option:checked`)).toContainText(name);
}
async function fillCreature(page:Page){await page.locator('#creatureName').fill('Sinh vật nguồn gốc mới');await page.locator('#creatureSpecies').selectOption('beast');await page.locator('#creatureThreat').selectOption('B');await page.locator('#creatureDescription').fill('Một mô tả đầy đủ cho sinh vật có nguồn gốc theo năm cấp.');await page.locator('#creatureWeaknesses').fill('Ánh sáng');await page.locator('#abilityName0').fill('Dịch chuyển');}
test('selection depends on parents, restores completed draft, and clears descendants on change',async({page})=>{
  await login(page);await expect(page.locator('#origin-galaxy')).toBeDisabled();await selectChain(page);
  await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await page.reload();
  await expect(page.locator('#origin-planet')).toHaveValue('aaaaaaaa-aaaa-4aaa-8aaa-000000000005');
  await expect(page.locator('#origin-planet option:checked')).toHaveText('Hành tinh A');
  await page.locator('#origin-universe').selectOption('bbbbbbbb-bbbb-4bbb-8bbb-000000000001');
  await expect(page.locator('#origin-galaxy')).toHaveValue('');await expect(page.locator('#origin-nebula')).toBeDisabled();await expect(page.locator('#origin-planet')).toHaveValue('');
});
test('users propose a complete private chain and submit its canonical names via the new RPC',async({page,request})=>{
  await login(page);for(let index=0;index<5;index++)await propose(page,index,`Mới ${index+1}`);
  const publicNodes=await(await request.get(`${backend}/rest/v1/origin_locations`)).json();expect(publicNodes.some((n:{name:string})=>n.name==='Mới 1')).toBe(false);
  await fillCreature(page);await page.locator('.create-submit-button').click();await expect(page.getByRole('heading',{name:'Sinh vật nguồn gốc mới'})).toBeVisible();await page.getByRole('link',{name:'Xem hồ sơ',exact:true}).click();
  await expect(page.locator('.mca-facts-grid')).toContainText('Tinh vân');await expect(page.locator('.mca-facts-grid')).toContainText('Mới 3');await expect(page.locator('.mca-facts-grid')).toContainText('Mới 4');
  const state=await(await request.get(`${backend}/__test/state`)).json();expect(state.origins.filter((n:{status:string})=>n.status==='pending')).toHaveLength(5);expect(state.calls.filter((c:{table:string})=>c.table==='submit_rpc')).toHaveLength(1);expect(state.records.at(-1).origin_planet_id).toBeTruthy();
});
test('admin approves a proposal before it becomes visible to the public',async({page,browser,request})=>{
  await login(page);await propose(page,0,'Vũ trụ chờ duyệt');const adminContext=await browser.newContext();const admin=await adminContext.newPage();await login(admin,true,'/admin-nguon-goc');
  await expect(admin.getByRole('heading',{name:'Vũ trụ chờ duyệt',exact:true})).toBeVisible();admin.once('dialog',dialog=>dialog.accept());await admin.getByRole('button',{name:'Duyệt Vũ trụ chờ duyệt',exact:true}).click();await expect(admin.getByRole('status').filter({hasText:'Đã duyệt'})).toContainText('Đã duyệt');
  const publicNodes=await(await request.get(`${backend}/rest/v1/origin_locations`)).json();expect(publicNodes.some((n:{name:string;status:string})=>n.name==='Vũ trụ chờ duyệt'&&n.status==='approved')).toBe(true);await adminContext.close();
});
test('catalog/add errors are retryable and phone fields do not overflow',async({page,request})=>{
  await request.post(`${backend}/__test/fail`,{data:{origins:true}});await login(page);await expect(page.locator('.mca-origin-level [role="alert"]').first()).toContainText('Không tải được');
  await request.post(`${backend}/__test/fail`,{data:{origins:false}});await page.getByRole('button',{name:'Tải lại vũ trụ',exact:true}).click();await expect(page.locator('#origin-universe')).toBeEnabled();
  await request.post(`${backend}/__test/fail`,{data:{addOrigin:true}});await page.getByRole('button',{name:'+ Thêm vũ trụ',exact:true}).click();await page.locator('#new-origin-universe').fill('Vũ trụ thử lại');await page.getByRole('button',{name:'Gửi đề xuất',exact:true}).click();await expect(page.locator('.mca-origin-level [role="alert"]')).toContainText('Chưa xác nhận');
  await request.post(`${backend}/__test/fail`,{data:{addOrigin:false}});await page.getByRole('button',{name:'Gửi đề xuất',exact:true}).click();await expect(page.locator('#origin-universe option:checked')).toContainText('Vũ trụ thử lại');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/origins-mobile.png',fullPage:true});
});
test('a response lost after origin submission retries the same request without creating duplicates',async({page,request})=>{
  await login(page);await selectChain(page);await fillCreature(page);await request.post(`${backend}/__test/fail`,{data:{submitResponseLost:true}});await page.locator('.create-submit-button').click();await expect(page.locator('#createMessage')).toContainText('Chưa xác nhận');await page.reload();await expect(page.locator('.create-submit-button')).toHaveText('KIỂM TRA LẠI YÊU CẦU');await page.locator('.create-submit-button').click();await expect(page.getByRole('heading',{name:'Sinh vật nguồn gốc mới'})).toBeVisible();
  const state=await(await request.get(`${backend}/__test/state`)).json();expect(state.records).toHaveLength(26);const calls=state.calls.filter((c:{table:string})=>c.table==='submit_rpc');expect(calls).toHaveLength(2);expect(calls[0].body).toEqual(calls[1].body);
});

test('the server denies normal accounts access to origin moderation',async({page})=>{
  await login(page);await page.goto('/admin-nguon-goc');
  await expect(page.getByRole('heading',{name:'Không có quyền truy cập'})).toBeVisible();
  await expect(page.locator('#originAdminKind')).toHaveCount(0);
});

test('a rejected proposal displays the admin note and cannot remain selected',async({page,browser})=>{
  await login(page);await propose(page,0,'Vũ trụ sai tên');
  const adminContext=await browser.newContext();const admin=await adminContext.newPage();await login(admin,true,'/admin-nguon-goc');
  await admin.getByLabel('Ghi chú cho người đề xuất').fill('Hãy dùng tên đầy đủ.');
  admin.once('dialog',dialog=>dialog.accept());await admin.getByRole('button',{name:'Từ chối Vũ trụ sai tên',exact:true}).click();
  await expect(admin.getByRole('status').filter({hasText:'Đã từ chối'})).toContainText('Đã từ chối');await page.reload();
  await expect(page.locator('#origin-universe')).toHaveValue('');
  await expect(page.getByText('Vũ trụ sai tên: Hãy dùng tên đầy đủ.',{exact:true})).toBeVisible();
  await expect(page.locator('#origin-universe option').filter({hasText:'Vũ trụ sai tên'})).toHaveJSProperty('disabled',true);
  await adminContext.close();
});
