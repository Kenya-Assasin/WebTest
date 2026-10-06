import {readFile,writeFile} from 'node:fs/promises';
export async function originsBundle(){
  const migration=await readFile(new URL('../supabase/migrations/202610060004_origins.sql',import.meta.url),'utf8');
  const verify=await readFile(new URL('../supabase/verify-origins.sql',import.meta.url),'utf8');
  return `-- MCA origins: run the WHOLE file once as postgres, AFTER phase 3.\n-- Preserves old creature data; new proposals require admin approval.\n${migration}\n${verify.replace('select bool_and(ok) as mca_origins_ready',"select 'MCA_ORIGINS_APPLIED'::text as result,bool_and(ok) as mca_origins_ready")}`;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/origins-bundle.mjs')){
  await writeFile(new URL('../supabase/apply-origins.sql',import.meta.url),await originsBundle());
  console.log('Prepared supabase/apply-origins.sql');
}
