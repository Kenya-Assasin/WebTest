import { readFile,writeFile } from 'node:fs/promises';
export const migrationNames=['202610060001_phase3.sql','202610060002_permissions.sql','202610060003_profile_functions.sql'];
export async function phase3Bundle() {
  const preflight=await readFile(new URL('../supabase/phase3-preflight.sql',import.meta.url),'utf8');
  const verification=await readFile(new URL('../supabase/verify-phase3.sql',import.meta.url),'utf8');
  const parts=await Promise.all(migrationNames.map(name=>readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')));
  return `-- MCA phase 3: reviewed against the CSV audit supplied on 2026-10-06.
-- Run the WHOLE file once as postgres in Supabase SQL Editor.
-- Preserves existing creatures/abilities/profiles and public images.
-- Changes browser write permissions: use the Next.js phase 3 frontend afterwards.
-- All changes roll back if any statement fails. Do not run 001/002/003 separately afterwards.
begin;
select pg_advisory_xact_lock(hashtextextended('mca:phase3:migration',0));
${preflight}
${parts.map(part=>part.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')).join('\n')}
-- Keep the original dataset intact and enable the frontend only after verification.
commit;
${verification.replace('select bool_and(ok) as mca_phase3_ready', `select 'MCA_PHASE3_APPLIED'::text as result,
  (select count(*) from public.creatures) as creature_count,
  (select count(*) from public.creature_abilities) as ability_count,
  (select count(*) from public.profiles) as profile_count,
  bool_and(ok) as mca_phase3_ready`)}
`;
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/phase3-bundle.mjs')) {
  await writeFile(new URL('../supabase/apply-phase3.sql',import.meta.url),await phase3Bundle());
  console.log('Prepared supabase/apply-phase3.sql');
}
