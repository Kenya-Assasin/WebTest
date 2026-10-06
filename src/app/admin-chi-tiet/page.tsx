import { requireAccount } from '@/lib/auth/session';
import { CreatureReview } from '@/components/creatures/review';
import { AccessDenied } from '@/components/access-denied';
export const metadata = { title: 'Kiểm duyệt hồ sơ' };
export const dynamic = 'force-dynamic';
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { denied } = await requireAccount(`/admin-chi-tiet${id ? `?id=${encodeURIComponent(id)}` : ''}`, true);
  if (denied) return <AccessDenied />;
  return <CreatureReview id={id} key={id || ''} />;
}
