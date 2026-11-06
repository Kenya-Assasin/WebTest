import Link from 'next/link';
import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';
import { GuideCard } from '@/components/minecraft/cards';
import { Icon } from '@/components/minecraft/icons';
import { first, type Query } from '@/lib/minecraft/catalog';
import { findGuides } from '@/lib/minecraft/guides';

export async function generateMetadata() {
  return { title: translator(await getLocale())('Sổ tay vật phẩm', 'Item Handbook') };
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const locale = await getLocale();
  const t = translator(locale);
  const q = first(await searchParams, 'q').slice(0, 100);
  const guides = findGuides(q);
  return <main className="mc-wrap mc-subpage">
    <div className="mc-page-head"><span className="mc-eyebrow">{t('HƯỚNG DẪN TIẾNG VIỆT', 'ITEM GUIDES')}</span><h1>{t('Sổ tay vật phẩm', 'Item Handbook')}</h1>
      <p>{t('Tra công dụng, cơ chế và cách dùng. Sổ tay hiện bắt đầu với các vật phẩm cơ bản của Create.', 'Look up what items do, how they work and how to use them. The handbook starts with basic Create items.')}</p></div>
    <form className="mc-inline-form mc-item-search" action="/vat-pham">
      <label>{t('Tên vật phẩm hoặc mod', 'Item or mod name')}<input name="q" maxLength={100} defaultValue={q} placeholder={t('Ví dụ: máy ép, Water Wheel…', 'For example: Mechanical Press, Water Wheel…')} /></label>
      <button type="submit" className="mc-button mc-primary"><Icon name="search" size={17} />{t(' Tra cứu', ' Search')}</button>
      {q && <Link className="mc-text-link" href="/vat-pham">{t('Xóa tìm kiếm', 'Clear search')}</Link>}
    </form>
    <div className="mc-section-head mc-result-head"><h2>{q ? t('Kết quả tra cứu', 'Search results') : t('Hướng dẫn hiện có', 'Available guides')}</h2><span className="mc-muted">{t(`${guides.length} vật phẩm`, `${guides.length} ${guides.length === 1 ? 'item' : 'items'}`)}</span></div>
    {guides.length
      ? <div className="mc-project-grid">{guides.map(guide => <GuideCard key={guide.id} guide={guide} locale={locale} />)}</div>
      : <div className="mc-empty"><Icon name="book" size={30} /><h3>{t('Chưa có hướng dẫn phù hợp', 'No matching guides')}</h3><p>{t('Thử tên tiếng Anh, hoặc xem mô tả dự án trong thư viện.', 'Try another item name or look up the project in the library.')}</p><Link className="mc-button" href="/thu-vien" prefetch={false}>{t('Mở thư viện', 'Open the library')}</Link></div>}
  </main>;
}
