import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const owner = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
let records, abilities, calls, failures, usernames, favorites, submissions;
function reset() {
  records = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, creator_id: owner, creature_code: `VX-${String(index + 1).padStart(4, '0')}`, name: index === 0 ? 'Sinh vật kiểm thử' : `Sinh vật ${index + 1}`, species: index % 2 ? 'dragon' : 'beast', universe: 'Vũ trụ thử nghiệm', galaxy: 'Ngân Hà', planet: 'Hành tinh thử nghiệm', element: index % 2 ? 'fire' : 'water', rarity: 'rare', proposed_threat_level: 'B', verified_threat_level: index % 2 ? 'A' : null, status: index % 2 ? 'verified' : 'pending', description: 'Một sinh vật có mô tả đầy đủ để dùng trong kiểm thử.', weaknesses: 'Ánh sáng mạnh', created_at: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`, image_url: null }));
  abilities = [{ id: 1, creature_id: 1, ability_name: 'Dịch chuyển', ability_description: 'Mở cổng không gian.' }];
  calls = []; failures = {}; favorites = []; submissions = new Map(); usernames = { [owner]: 'Điều tra viên thật', [adminId]: 'Quản trị viên' };
}
reset();
function identity(request) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token || token.split('.')[2] !== 'dGVzdA') return null;
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch { return null; }
}
function user(claims) {
  return { id: claims.sub, aud: 'authenticated', role: 'authenticated', email: claims.email, email_confirmed_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { username: usernames[claims.sub] } };
}
function token(email) {
  const claims = { sub: email.startsWith('admin') ? adminId : owner, aud: 'authenticated', role: 'authenticated', email, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) };
  return Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.dGVzdA';
}
async function body(request) { let value = ''; for await (const chunk of request) value += chunk; try { return JSON.parse(value); } catch { return {}; } }
function send(response, status, data, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS', 'Access-Control-Expose-Headers': 'Content-Range', ...headers });
  response.end(data === undefined ? undefined : JSON.stringify(data));
}
function filter(rows, params) {
  let result = [...rows];
  for (const field of ['id', 'user_id', 'creator_id', 'creature_id', 'status', 'species', 'element']) {
    const value = params.get(field);
    if (value?.startsWith('eq.')) result = result.filter(row => String(row[field]) === value.slice(3));
    if (value?.startsWith('in.(')) result = result.filter(row => value.slice(4, -1).split(',').includes(String(row[field])));
  }
  const or = params.getAll('or').join(',');
  const search = or.match(/name\.ilike\.%([^%]*)%/)?.[1];
  if (search) result = result.filter(row => `${row.name} ${row.creature_code}`.toLowerCase().includes(search.toLowerCase()));
  const threats = or.match(/verified_threat_level\.in\.\(([^)]*)\)/)?.[1].split(',');
  if (threats) result = result.filter(row => threats.includes(row.verified_threat_level || row.proposed_threat_level));
  const origin = params.get('galaxy');
  if (origin?.startsWith('ilike.')) result = result.filter(row => row.galaxy?.toLowerCase().includes(origin.slice(6).replaceAll('%', '').toLowerCase()));
  const order = params.get('order')?.split(',')[0];
  if (order) { const [field, direction] = order.split('.'); result.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === 'desc' ? -1 : 1)); }
  return result;
}
const backend = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:54399');
    if (request.method === 'OPTIONS') return send(response, 200);
    if (url.pathname === '/__test/reset') { reset(); return send(response, 200, {}); }
    if (url.pathname === '/__test/state') return send(response, 200, { records, abilities, calls, favorites });
    if (url.pathname === '/__test/fail') { Object.assign(failures, await body(request)); return send(response, 200, {}); }
    if (url.pathname === '/__test/seed-favorites') {
      const { count=25 }=await body(request);
      for(let id=26;id<=count;id++) records.push({...records[0],id,name:`Sinh vật ${id}`,creature_code:`VX-${id}`});
      favorites=records.slice(0,count).map(row=>({user_id:owner,creature_id:row.id,created_at:new Date().toISOString()}));
      return send(response,200,{});
    }
    if (url.pathname === '/auth/v1/token') {
      const values = await body(request); const access = token(values.email || 'test@example.com');
      const claims = JSON.parse(Buffer.from(access.split('.')[1], 'base64url').toString());
      return send(response, 200, { access_token: access, refresh_token: 'mock-refresh', token_type: 'bearer', expires_in: 3600, expires_at: claims.exp, user: user(claims) });
    }
    const claims = identity(request);
    if (url.pathname === '/auth/v1/user') return claims ? send(response, 200, user(claims)) : send(response, 401, { message: 'Invalid token', code: 'bad_jwt' });
    if (url.pathname === '/auth/v1/logout') return send(response, 204);
    if (url.pathname === '/rest/v1/profiles') {
      if (!claims) return send(response, 200, null);
      if (request.method === 'PATCH') { const values = await body(request); usernames[claims.sub] = values.username; calls.push({ method: 'PATCH', table: 'profiles', body: values }); }
      return send(response, 200, { id: claims.sub, username: usernames[claims.sub], avatar_url: null, role: claims.sub === adminId ? 'admin' : 'user', investigator_level: 'Cấp II', reputation: 12 });
    }
    if (url.pathname.startsWith('/storage/v1/')) {
      calls.push({ method: request.method, table: 'storage', path: url.pathname });
      if (request.method === 'DELETE') return send(response, 200, []);
      return send(response, 200, { Key: url.pathname, Id: 'mock-image' });
    }
    if (url.pathname === '/rest/v1/creature_favorites') {
      if (!claims) return send(response, 403, { message: 'AUTH_REQUIRED' });
      if (failures.favorites) return send(response, 500, { message: 'FAVORITES_FAILED' });
      if (request.method === 'POST') {
        const values=await body(request); calls.push({ method:'POST',table:'creature_favorites',body:values });
        if (values.user_id !== claims.sub) return send(response,403,{message:'OWNER_REQUIRED'});
        if (!favorites.some(row=>row.user_id===values.user_id&&String(row.creature_id)===String(values.creature_id))) favorites.push({...values,created_at:new Date().toISOString()});
        return send(response,201,undefined);
      }
      const matched=filter(favorites.filter(row=>row.user_id===claims.sub),url.searchParams);
      if (request.method==='DELETE') {
        calls.push({method:'DELETE',table:'creature_favorites',query:url.search});
        for (const row of matched) favorites.splice(favorites.indexOf(row),1);
        return send(response,200,undefined);
      }
      const start=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||matched.length);
      const data=matched.slice(start,start+limit);
      return send(response,200,url.searchParams.get('select')?.includes('creature:') ? data.map(row=>({creature:records.find(creature=>String(creature.id)===String(row.creature_id))})) : data,{'Content-Range':`${start}-${Math.max(start,start+data.length-1)}/${matched.length}`});
    }
    if (url.pathname === '/rest/v1/rpc/mca_submit_creature') {
      const values=await body(request); calls.push({method:'POST',table:'submit_rpc',body:values});
      if (!claims) return send(response,403,{message:'AUTH_REQUIRED'});
      if (failures.submitMissing) return send(response,404,{code:'PGRST202',message:'Function not found'});
      const key=`${claims.sub}:${values.p_request_id}`;
      if (submissions.has(key)) return send(response,200,submissions.get(key));
      if (failures.submitInvalid) return send(response,400,{code:'22023',message:'DRAFT_INVALID'});
      if (failures.creature_abilities) return send(response,500,{message:'ABILITY_FAILED'});
      const draft=values.p_draft;
      const created={...draft,id:100+records.length,creator_id:claims.sub,creature_code:`VX-${100+records.length}`,proposed_threat_level:draft.threatLevel,verified_threat_level:null,status:'pending',image_url:values.p_image_path?`/storage/v1/object/public/creature-images/${values.p_image_path}`:null,created_at:new Date().toISOString()};
      records.push(created);
      abilities.push(...draft.abilities.map((ability,index)=>({id:100+abilities.length+index,creature_id:created.id,ability_name:ability.name,ability_description:ability.description})));
      submissions.set(key,created);
      if (failures.submitResponseLost) { failures.submitResponseLost=false; return send(response,503,{message:'Response lost after commit'}); }
      return send(response,200,created);
    }
    if (url.pathname === '/rest/v1/rpc/admin_review_creature' || url.pathname === '/rest/v1/rpc/mca_review_creature') {
      const values = await body(request); calls.push({ method: 'POST', table: 'rpc', body: values });
      if (claims?.sub !== adminId) return send(response, 403, { message: 'ADMIN_REQUIRED' });
      if (failures.review) return send(response, 500, { message: 'REVIEW_FAILED' });
      const creature = records.find(row => String(row.id) === String(values.p_creature_id));
      if (!creature) return send(response, 404, { message: 'CREATURE_NOT_FOUND' });
      creature.status = values.p_status; creature.verified_threat_level = values.p_verified_threat_level;
      return send(response, 200, null);
    }
    const table = url.pathname.split('/').pop();
    if (!['creatures', 'creature_abilities'].includes(table)) return send(response, 404, { message: 'Not found' });
    const rows = table === 'creatures' ? records : abilities;
    if (request.method === 'POST') {
      const values = await body(request); calls.push({ method: 'POST', table, body: values });
      if (failures[table]) return send(response, 400, { code: '42501', message: 'INSERT_FAILED' });
      if (!claims) return send(response, 403, { message: 'AUTH_REQUIRED' });
      const created = (Array.isArray(values) ? values : [values]).map((value, index) => ({ ...value, id: 100 + rows.length + index, created_at: new Date().toISOString() }));
      rows.push(...created);
      return send(response, 201, request.headers.accept?.includes('vnd.pgrst.object') ? created[0] : created);
    }
    const matched = filter(rows, url.searchParams);
    if (request.method === 'DELETE') {
      calls.push({ method: 'DELETE', table, query: url.search });
      if (failures.delete) return send(response, 403, { message: 'DELETE_DENIED' });
      for (const row of matched) rows.splice(rows.indexOf(row), 1);
      return send(response, 200, matched.map(row => ({ id: row.id })));
    }
    if (request.method === 'PATCH') {
      const values = await body(request); calls.push({ method: 'PATCH', table, body: values });
      if (failures.code) return send(response, 400, { message: 'UPDATE_FAILED' });
      matched.forEach(row => Object.assign(row, values));
      return send(response, 200, request.headers.accept?.includes('vnd.pgrst.object') ? matched[0] : matched);
    }
    const start = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || matched.length);
    const data = matched.slice(start, start + limit);
    const total = matched.length;
    if (request.headers.accept?.includes('vnd.pgrst.object')) {
      if (!matched.length) return send(response, 406, { code: 'PGRST116', message: 'No rows' });
      return send(response, 200, matched[0]);
    }
    return send(response, 200, request.method === 'HEAD' ? undefined : data, { 'Content-Range': `${start}-${Math.max(start, start + data.length - 1)}/${total}` });
  } catch (error) { console.error(error); send(response, 500, { message: error.message }); }
});
backend.listen(54399, '127.0.0.1', () => console.log('Mock Supabase ready at 127.0.0.1:54399'));
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3100'], {
  stdio: 'inherit', env: { ...process.env, MCA_TEST: '1', NEXT_PUBLIC_MCA_PHASE3: process.env.MCA_TEST_PHASE3 === '1' ? 'true' : 'false', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54399', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' },
});
next.on('exit', code => { backend.close(); process.exit(code ?? 1); });
process.on('SIGTERM', () => { next.kill(); backend.close(); });
process.on('SIGINT', () => { next.kill(); backend.close(); });
