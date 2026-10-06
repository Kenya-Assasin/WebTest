import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {auditedSchema} from './support/audited-schema.mjs';
import {phase3Bundle} from '../scripts/phase3-bundle.mjs';
const owner='11111111-1111-4111-8111-111111111111',admin='22222222-2222-4222-8222-222222222222',missing='33333333-3333-4333-8333-333333333333';
const request='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft={name:'Atomic creature',species:'beast',universe:'Universe',galaxy:'',planet:'Planet',world:'',age:'',size:'',element:'',rarity:'',powerSource:'',threatLevel:'B',description:'A sufficiently long creature description.',appearance:'',weaknesses:'Light',limitations:'',strongestAbilityCondition:'',abilities:[{name:'Portal',description:'Open a portal.'}]};
let db,existingId;
before(async()=>{
  db=new PGlite();await db.exec(auditedSchema());
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb),($3,$4::jsonb),($5,$6::jsonb)',[owner,'{"username":"Original owner"}',admin,'{"username":"Original admin"}',missing,'{"username":"Missing","role":"admin","reputation":999}']);
  await db.query("update public.profiles set role='admin',reputation=42,investigator_level='Cấp IV' where id=$1",[admin]);
  await db.query('delete from public.profiles where id=$1',[missing]);
  existingId=(await db.query("insert into public.creatures(creator_id,creature_code,name,species,universe,planet,proposed_threat_level,description,weaknesses,image_url) values($1,'VX-OLD','Existing creature','beast','Universe','Planet','B','Existing description remains intact.','Light','https://example.com/existing.png') returning id",[owner])).rows[0].id;
  await db.query('insert into public.creature_abilities(creature_id,ability_name) values($1,$2)',[existingId,'Existing ability']);
  const results=await db.exec(await phase3Bundle());
  const report=results.at(-1).rows[0];
  assert.equal(report.result,'MCA_PHASE3_APPLIED');assert.equal(report.mca_phase3_ready,true);
});
after(async()=>{await db?.close();});
async function as(uid,fn) {
  await db.exec('begin;set local role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);
  try{return await fn();}finally{await db.exec('rollback');}
}
async function denied(sql,params=[]) {
  await db.exec('savepoint denied');let error;try{await db.query(sql,params);}catch(e){error=e;}
  await db.exec('rollback to savepoint denied;release savepoint denied');assert.ok(error,sql);return error;
}
test('delivered SQL exactly matches the tested single-transaction bundle',async()=>{
  assert.equal(await readFile(new URL('../supabase/apply-phase3.sql',import.meta.url),'utf8'),await phase3Bundle());
});
test('read-only verification confirms the permission and Auth contract after migration',async()=>{
  const report=(await db.query(await readFile(new URL('../supabase/verify-phase3.sql',import.meta.url),'utf8'))).rows[0];
  assert.equal(report.mca_phase3_ready,true);assert.ok(Object.values(report.checks).every(Boolean));
});
test('audited schema migration preserves creatures, skills, image URLs and existing administrators',async()=>{
  assert.equal((await db.query('select count(*)::int as n from public.creatures')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from public.creature_abilities')).rows[0].n,1);
  assert.equal((await db.query('select image_url from public.creatures')).rows[0].image_url,'https://example.com/existing.png');
  const profile=(await db.query('select * from public.profiles where id=$1',[admin])).rows[0];
  assert.equal(profile.role,'admin');assert.equal(profile.reputation,42);assert.equal(profile.investigator_level,'Cấp IV');
  const recovered=(await db.query('select * from public.profiles where id=$1',[missing])).rows[0];
  assert.equal(recovered.role,'user');assert.equal(recovered.reputation,0);
});
test('actual Auth trigger rejects privilege metadata and bounds or defaults usernames',async()=>{
  await db.exec('begin');
  try {
    const id='44444444-4444-4444-8444-444444444444';
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,JSON.stringify({username:' x'.repeat(100),role:'admin',reputation:999,investigator_level:'Cấp X'})]);
    const profile=(await db.query('select * from public.profiles where id=$1',[id])).rows[0];
    assert.equal(profile.username.length,40);assert.equal(profile.role,'user');assert.equal(profile.reputation,0);assert.equal(profile.investigator_level,'Cấp I');
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',['55555555-5555-4555-8555-555555555555','{"username":{"role":"admin"}}']);
    assert.equal((await db.query('select username from public.profiles where id=$1',['55555555-5555-4555-8555-555555555555'])).rows[0].username,'Investigator');
  }finally{await db.exec('rollback');}
});
test('Auth service can still trigger profile creation after public RPC permission is revoked',async()=>{
  await db.exec('create role supabase_auth_admin nologin;grant usage on schema auth to supabase_auth_admin;grant insert on auth.users to supabase_auth_admin;');
  assert.equal((await db.query("select has_function_privilege('supabase_auth_admin','public.handle_new_user()','EXECUTE') as allowed")).rows[0].allowed,false);
  await db.exec('begin;set local role supabase_auth_admin;');
  try{
    const id='66666666-6666-4666-8666-666666666666';
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,'{"username":"Auth service signup","role":"admin"}']);
    await db.exec('reset role');
    assert.equal((await db.query('select role from public.profiles where id=$1',[id])).rows[0].role,'user');
  }finally{await db.exec('rollback');}
});
test('exact old column grants cannot bypass profile boundaries or archive writes',async()=>{
  await as(owner,async()=>{
    assert.equal((await db.query('select * from public.profiles')).rows.length,1);
    await denied("update public.profiles set role='admin'");await denied('update public.profiles set reputation=999');
    await denied('update public.creatures set creature_code=$1 where id=$2',['hacked',existingId]);
    await denied('truncate public.creatures cascade');await denied('truncate public.creature_abilities');await denied('truncate public.profiles cascade');
    assert.equal((await db.query('update public.profiles set username=$1 where id=$2 returning username',['  New name  ',owner])).rows[0].username,'New name');
    await denied('update public.profiles set username=$1 where id=$2',['',owner]);await denied('update public.profiles set username=$1 where id=$2',['x'.repeat(41),owner]);
    assert.equal((await db.query('update public.profiles set username=$1 where id=$2 returning id',['Other',admin])).rows.length,0);
  });
});
test('atomic RPC works with real NOT NULL/defaults and deduplicates requests',async()=>{
  await as(owner,async()=>{
    const first=(await db.query('select public.mca_submit_creature($1,$2::jsonb,null) as c',[request,JSON.stringify(draft)])).rows[0].c;
    const second=(await db.query('select public.mca_submit_creature($1,$2::jsonb,null) as c',[request,JSON.stringify(draft)])).rows[0].c;
    assert.equal(first.id,second.id);assert.equal(first.status,'pending');assert.equal(first.creator_id,owner);assert.ok(first.created_at);assert.ok(first.updated_at);assert.match(first.creature_code,/^VX-/);
    await db.query('insert into public.creature_favorites(user_id,creature_id) values($1,$2)',[owner,first.id]);
    assert.equal((await db.query('select * from public.creature_favorites')).rows.length,1);
  });
});
test('review helper and retired RPC privileges match the audited policy migration',async()=>{
  await as(owner,async()=>{
    assert.equal((await db.query('select public.is_admin() as yes')).rows[0].yes,false);
    await denied('select public.admin_review_creature($1,$2,$3)',[existingId,'verified','X']);
    await denied('select public.mca_review_creature($1,$2,$3)',[String(existingId),'verified','X']);
    await denied('select public.handle_new_user()');
  });
  await as(admin,async()=>{
    assert.equal((await db.query('select public.is_admin() as yes')).rows[0].yes,true);
    await db.query('select public.mca_review_creature($1,$2,$3)',[String(existingId),'verified','S']);
    assert.equal((await db.query('select verified_threat_level from public.creatures where id=$1',[existingId])).rows[0].verified_threat_level,'S');
  });
});
test('rerunning the bundle fails before modifying existing phase3 tables',async()=>{
  await assert.rejects(db.exec(await phase3Bundle()),/PHASE3_ALREADY_PRESENT/);
  await db.exec('rollback');
  assert.equal((await db.query('select count(*)::int as n from public.creatures')).rows[0].n,1);
});
test('an audit mismatch rolls back the entire bundle without leaving new tables',async()=>{
  const fresh=new PGlite();
  try{
    await fresh.exec(auditedSchema());await fresh.exec('alter table storage.objects rename column owner_id to missing_owner');
    await assert.rejects(fresh.exec(await phase3Bundle()),/STORAGE_SCHEMA_MISMATCH/);await fresh.exec('rollback');
    assert.equal((await fresh.query("select to_regclass('public.creature_favorites') as table_name")).rows[0].table_name,null);
    assert.equal((await fresh.query("select has_column_privilege('authenticated','public.profiles','avatar_url','UPDATE') as allowed")).rows[0].allowed,true);
  }finally{await fresh.close();}
});
