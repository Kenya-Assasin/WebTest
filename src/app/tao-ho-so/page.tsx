import { requireAccount } from '@/lib/auth/session';
import { CreateCreatureForm } from '@/components/creatures/create-form';
export const metadata = { title: 'Tạo hồ sơ' };
export const dynamic = 'force-dynamic';
export default async function CreatePage() {
  const { user } = await requireAccount('/tao-ho-so');
  return <CreateCreatureForm owner={user!.id} key={user!.id} />;
}

