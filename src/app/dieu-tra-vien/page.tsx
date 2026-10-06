import { requireAccount } from '@/lib/auth/session';
import { Investigator } from '@/components/creatures/investigator';
export const metadata = { title: 'Điều tra viên' };
export const dynamic = 'force-dynamic';
export default async function InvestigatorPage() {
  const { user, profile } = await requireAccount('/dieu-tra-vien');
  return <Investigator owner={user!.id} profile={profile} fallbackName={user!.user_metadata?.username || user!.email?.split('@')[0] || 'Điều tra viên'} key={user!.id} />;
}

