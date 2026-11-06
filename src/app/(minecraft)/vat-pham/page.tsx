import Link from 'next/link';
import { GuideCard } from '@/components/minecraft/cards';
import { Icon } from '@/components/minecraft/icons';
import { first, type Query } from '@/lib/minecraft/catalog';
import { findGuides } from '@/lib/minecraft/guides';

export const metadata = { title: 'Sổ tay vật phẩm' };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const q = first(await searchParams, 'q').slice(0, 100);
  const guides = findGuides(q);
  return <main className="mc-wrap mc-subpage">
    <div className="mc-page-head"><span className="mc-eyebrow">HƯỚNG DẪN TIẾNG VIỆT</span><h1>Sổ tay vật phẩm</h1>
      <p>Tra công dụng, cơ chế và cách dùng. Sổ tay hiện bắt đầu với các vật phẩm cơ bản của Create.</p></div>
    <form className="mc-inline-form mc-item-search" action="/vat-pham">
      <label>Tên vật phẩm hoặc mod<input name="q" maxLength={100} defaultValue={q} placeholder="Ví dụ: máy ép, Water Wheel…" /></label>
      <button type="submit" className="mc-button mc-primary"><Icon name="search" size={17} /> Tra cứu</button>
      {q && <Link className="mc-text-link" href="/vat-pham">Xóa tìm kiếm</Link>}
    </form>
    <div className="mc-section-head mc-result-head"><h2>{q ? 'Kết quả tra cứu' : 'Hướng dẫn hiện có'}</h2><span className="mc-muted">{guides.length} vật phẩm</span></div>
    {guides.length
      ? <div className="mc-project-grid">{guides.map(guide => <GuideCard key={guide.id} guide={guide} />)}</div>
      : <div className="mc-empty"><Icon name="book" size={30} /><h3>Chưa có hướng dẫn phù hợp</h3><p>Thử tên tiếng Anh, hoặc xem mô tả dự án trong thư viện.</p><Link className="mc-button" href="/thu-vien" prefetch={false}>Mở thư viện</Link></div>}
  </main>;
}
