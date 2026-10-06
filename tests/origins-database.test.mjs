import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {auditedSchema} from './support/audited-schema.mjs';
import {phase3Bundle} from '../scripts/phase3-bundle.mjs';
import {originsBundle} from '../scripts/origins-bundle.mjs';
const owner='11111111-1111-4111-8111-111111111111',admin='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const request='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft={name:'Origin creature',species:'beast',universe:'Forged universe',galaxy:'Forged galaxy',planet:'Forged planet',world:'',age:'',size:'',element:'',rarity:'',powerSource:'',threatLevel:'B',description:'A sufficiently long creature description.',appearance:'',weaknesses:'Light',limitations:'',strongestAbilityCondition:'',abilities:[{name:'Portal',description:''}]};
let db;
before(async()=>{
  db=new PGlite();await db.exec(auditedSchema());
  for(const id of [owner,admin,other])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,'{"username":"Origin tester"}']);
  await db.query("update public.profiles set role='admin' where id=$1",[admin]);
  await db.query("insert into public.creatures(creator_id,name,species,universe,galaxy,planet,world,proposed_threat_level,description,weaknesses,status) values($1,'Old record','beast','Old universe','Old galaxy','Old planet','Old world','B','Old description stays unchanged.','Light','verified')",[owner]);
  await db.exec(await phase3Bundle());const results=await db.exec(await originsBundle());assert.equal(results.at(-1).rows[0].mca_origins_ready,true);
});
after(async()=>{await db?.close();});
async function as(uid,fn){await db.exec(`begin;set local role ${uid?'authenticated':'anon'};`);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||'']);try{return await fn();}finally{await db.exec('rollback');}}
async function denied(sql,args=[]){await db.exec('savepoint denied');let error;try{await db.query(sql,args);}catch(e){error=e;}await db.exec('rollback to savepoint denied;release savepoint denied');assert.ok(error,sql);return error;}
const add=async(kind,name,parent=null)=>(await db.query('select public.mca_add_origin($1,$2,$3) as node',[kind,name,parent])).rows[0].node;
const submit=async(value)=> (await db.query('select public.mca_submit_creature_with_origin($1,$2::jsonb,null) as creature',[request,JSON.stringify(value)])).rows[0].creature;
async function chain(){const result=[];for(const kind of ['universe','galaxy','nebula','star_system','planet'])result.push(await add(kind,`Test ${kind}`,result.at(-1)?.id||null));return result;}
test('origin bundle is exactly the delivered SQL and preserves legacy records',async()=>{
  assert.equal(await readFile(new URL('../supabase/apply-origins.sql',import.meta.url),'utf8'),await originsBundle());
  const record=(await db.query('select * from public.creatures')).rows[0];assert.equal(record.world,'Old world');assert.equal(record.planet,'Old planet');assert.equal(record.origin_planet_id,null);
  const nodes=(await db.query('select kind,status from public.origin_locations')).rows;assert.deepEqual(nodes.map(n=>n.kind).sort(),['galaxy','universe']);assert.ok(nodes.every(n=>n.status==='approved'));
});
test('guests see only approved origins and cannot add, review or read submitter IDs',async()=>{
  await as(null,async()=>{
    assert.equal((await db.query('select id,kind,name,parent_id,status from public.origin_locations')).rows.length,2);
    await denied("select public.mca_add_origin('universe','Injected',null)");await denied('select created_by from public.origin_locations');await denied('select * from public.origin_locations');
  });
});
test('same-parent names deduplicate case/whitespace, while different parents remain separate',async()=>{
  await as(owner,async()=>{
    const first=await add('universe',' New   Universe ');const again=await add('universe','new universe');assert.equal(first.id,again.id);assert.equal(first.name,'New Universe');assert.equal(first.status,'pending');
    const second=await add('universe','Other universe');const a=await add('galaxy','Same galaxy',first.id);const b=await add('galaxy','Same galaxy',second.id);assert.notEqual(a.id,b.id);
    await denied("insert into public.origin_locations(kind,name) values('universe','Injected')");await denied('update public.origin_locations set status=$1',['approved']);await denied('delete from public.origin_locations');
  });
});
test('wrong ancestry, empty/long names and normal-user approval are rejected',async()=>{
  await as(owner,async()=>{
    const root=await add('universe','Root');
    assert.match((await denied("select public.mca_add_origin('planet','Wrong',$1)",[root.id])).message,/ORIGIN_PARENT_INVALID/);
    await denied("select public.mca_add_origin('galaxy','Missing',null)");await denied("select public.mca_add_origin('universe','',null)");await denied("select public.mca_add_origin('universe',$1,null)",['x'.repeat(101)]);
    assert.match((await denied('select public.mca_review_origin($1,$2,null)',[root.id,'approved'])).message,/ADMIN_REQUIRED/);
  });
});
test('pending origins are private to their author/admin and cannot be guessed or stolen',async()=>{
  await as(owner,async()=>{
    const nodes=await chain();await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
    assert.equal((await db.query('select id from public.origin_locations where id=$1',[nodes[0].id])).rows.length,0);
    assert.match((await denied("select public.mca_add_origin('universe','Test universe',null)")).message,/ORIGIN_NAME_RESERVED/);
    assert.match((await denied('select public.mca_submit_creature_with_origin($1,$2::jsonb,null)',[request,JSON.stringify({...draft,originPlanetId:nodes[4].id})])).message,/origin permission/);
  });
});
test('admin must approve parents first; approved nodes become public and immutable to browsers',async()=>{
  await as(owner,async()=>{
    const nodes=await chain();await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
    assert.match((await denied('select public.mca_review_origin($1,$2,null)',[nodes[1].id,'approved'])).message,/PARENT_FIRST/);
    for(const node of nodes)await db.query('select public.mca_review_origin($1,$2,null)',[node.id,'approved']);
    await db.exec('set local role anon');assert.equal((await db.query('select id from public.origin_locations')).rows.length,7);
  });
});
test('rejected nodes cannot be selected or extended and ordinary users cannot read another rejection',async()=>{
  await as(owner,async()=>{
    const root=await add('universe','Rejected root');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
    await db.query('select public.mca_review_origin($1,$2,$3)',[root.id,'rejected','Please correct the name']);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
    assert.equal((await db.query('select review_note from public.origin_locations where id=$1',[root.id])).rows[0].review_note,'Please correct the name');
    assert.match((await denied("select public.mca_add_origin('galaxy','Child',$1)",[root.id])).message,/PARENT_INVALID/);
    assert.match((await denied("select public.mca_add_origin('universe','Rejected root',null)")).message,/ORIGIN_REJECTED/);
  });
});
test('new submit resolves canonical ancestry, atomically saves skills and deduplicates exact retries',async()=>{
  await as(owner,async()=>{
    const nodes=await chain();const value={...draft,originPlanetId:nodes[4].id};const first=await submit(value);const replay=await submit(value);
    assert.equal(first.id,replay.id);assert.equal(first.universe,nodes[0].name);assert.equal(first.nebula,nodes[2].name);assert.equal(first.star_system,nodes[3].name);assert.equal(first.planet,nodes[4].name);assert.equal(first.origin_planet_id,nodes[4].id);
    assert.equal((await db.query('select count(*)::int as n from public.creature_abilities')).rows[0].n,1);
    assert.match((await denied('select public.mca_submit_creature_with_origin($1,$2::jsonb,null)',[request,JSON.stringify({...value,name:'Changed'})])).message,/REQUEST_CONFLICT/);
  });
});
test('invalid leaf and failed submission roll back without creating a creature/request',async()=>{
  await as(owner,async()=>{
    const nodes=await chain();await denied('select public.mca_submit_creature_with_origin($1,$2::jsonb,null)',[request,JSON.stringify({...draft,originPlanetId:nodes[0].id})]);
    await denied('select public.mca_submit_creature_with_origin($1,$2::jsonb,null)',[request,JSON.stringify({...draft,originPlanetId:nodes[4].id,abilities:[]})]);
    assert.equal((await db.query('select count(*)::int as n from public.creatures')).rows[0].n,1);
  });
});
test('legacy RPC and pending old request remain compatible after catalog migration',async()=>{
  await as(owner,async()=>{
    const first=(await db.query('select public.mca_submit_creature($1,$2::jsonb,null) as creature',[request,JSON.stringify(draft)])).rows[0].creature;
    const again=(await db.query('select public.mca_submit_creature($1,$2::jsonb,null) as creature',[request,JSON.stringify(draft)])).rows[0].creature;
    assert.equal(first.id,again.id);assert.equal(first.nebula,null);assert.equal(first.universe,draft.universe);
  });
});

test('rejected ancestors block new descendants/submissions but committed retries still resolve',async()=>{
  await as(owner,async()=>{
    const nodes=await chain();const value={...draft,originPlanetId:nodes[4].id};const first=await submit(value);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[admin]);
    await db.query('select public.mca_review_origin($1,$2,null)',[nodes[0].id,'rejected']);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
    assert.equal((await submit(value)).id,first.id);
    assert.match((await denied("select public.mca_add_origin('planet','Another planet',$1)",[nodes[3].id])).message,/PARENT_INVALID/);
    assert.match((await denied('select public.mca_submit_creature_with_origin($1,$2::jsonb,null)',['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',JSON.stringify(value)])).message,/origin permission/);
  });
});

test('origin creation limit does not prevent retries of an existing proposal',async()=>{
  await as(owner,async()=>{
    const first=await add('universe','Limit 0');
    for(let n=1;n<100;n++)await add('universe',`Limit ${n}`);
    assert.equal((await add('universe','LIMIT 0')).id,first.id);
    assert.match((await denied("select public.mca_add_origin('universe','Limit 100',null)")).message,/LIMIT_REACHED/);
  });
});
