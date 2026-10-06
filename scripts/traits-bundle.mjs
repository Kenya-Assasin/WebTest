import {readFile,writeFile} from 'node:fs/promises';
export async function traitsBundle(){
  const migration=await readFile(new URL('../supabase/migrations/202610060005_traits.sql',import.meta.url),'utf8');
  const verify=await readFile(new URL('../supabase/verify-traits.sql',import.meta.url),'utf8');
  return `-- MCA traits: run the WHOLE file once, after phase 3 and origins.\n${migration}\n${verify.replace('select bool_and(ok) as mca_traits_ready',"select 'MCA_TRAITS_APPLIED'::text as result,bool_and(ok) as mca_traits_ready")}`;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/traits-bundle.mjs')){
  await writeFile(new URL('../supabase/apply-traits.sql',import.meta.url),await traitsBundle());
  console.log('Prepared supabase/apply-traits.sql');
}
