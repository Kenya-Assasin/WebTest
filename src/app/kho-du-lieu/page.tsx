import { Explorer } from '@/components/creatures/explorer';
export const metadata = { title: 'Kho dữ liệu' };
export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <Explorer initialSearch={q || ''} key={q || ''} />;
}

