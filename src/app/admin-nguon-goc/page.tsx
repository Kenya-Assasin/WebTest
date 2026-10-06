import { requireAccount } from '@/lib/auth/session';
import { AccessDenied } from '@/components/access-denied';
import { OriginAdmin } from '@/components/creatures/origin-admin';
import { originsEnabled } from '@/lib/supabase/features';
export const metadata={title:'Duyệt địa danh'};
export const dynamic='force-dynamic';
export default async function OriginAdminPage(){
  const {denied}=await requireAccount('/admin-nguon-goc',true);
  if(denied)return <AccessDenied/>;
  if(!originsEnabled)return <main className="mca-main"><p>Danh mục địa danh chưa được bật.</p></main>;
  return <OriginAdmin/>;
}
