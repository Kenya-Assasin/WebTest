import { requireAccount } from '@/lib/auth/session';
import { AdminDashboard } from '@/components/creatures/admin';
import { AccessDenied } from '@/components/access-denied';
export const metadata = { title: 'Quản trị' };
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const { denied } = await requireAccount('/admin', true);
  if (denied) return <AccessDenied />;
  return <AdminDashboard />;
}

