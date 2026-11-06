import { PackPlanner } from '@/components/minecraft/pack-planner';

import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';

export async function generateMetadata() {
  return { title: translator(await getLocale())('Gói của tôi', 'My Pack') };
}

export default async function PackPage() {
  const t = translator(await getLocale());
  return <main className="mc-wrap mc-subpage">
    <div className="mc-page-head"><span className="mc-eyebrow">{t('CHUẨN BỊ GÓI MOD', 'PACK BUILDER')}</span><h1>{t('Gói của tôi', 'My Pack')}</h1>
      <p>{t('Xem những bản đã chọn, biết cần tải thêm gì và phát hiện các xung đột đã được khai báo.', 'Review the releases you picked, find missing dependencies and spot declared conflicts.')}</p></div>
    <PackPlanner />
  </main>;
}
