import {requireAccount} from '@/lib/auth/session';
import {AccessDenied} from '@/components/access-denied';
import {TermAdmin} from '@/components/creatures/term-admin';
import {traitsEnabled} from '@/lib/supabase/features';
export const metadata={title:'Duyệt loài và nguyên tố'};
export const dynamic='force-dynamic';
export default async function TermAdminPage(){
  const {denied}=await requireAccount('/admin-phan-loai',true);if(denied)return <AccessDenied/>;
  if(!traitsEnabled)return <main className="mca-main"><p>Danh mục loài và nguyên tố chưa được bật.</p></main>;
  return <TermAdmin/>;
}
