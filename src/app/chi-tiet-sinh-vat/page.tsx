import { CreatureDetail } from '@/components/creatures/detail';
export const metadata = { title: 'Hồ sơ sinh vật' };
export default async function CreaturePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <CreatureDetail id={id} key={id || ''} />;
}

