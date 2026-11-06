import Link from 'next/link';
import { ProjectCard } from '@/components/minecraft/cards';
import { LoaderOptions, MinecraftVersionOptions } from '@/components/minecraft/filters';
import { Icon } from '@/components/minecraft/icons';
import { first, isKind, kindLabel, kinds, queryString, readTarget, type Query } from '@/lib/minecraft/catalog';
import { featured, findGuides } from '@/lib/minecraft/guides';
import { maxPage, pageSize, searchProjects, type CatalogFilters } from '@/lib/minecraft/modrinth';

export const metadata = { title: 'Thư viện dự án' };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const target = readTarget(query);
  const kind = first(query, 'kind');
  const sort = first(query, 'sort');
  const requestedPage = Number(first(query, 'page'));
  const filters: CatalogFilters = {
    ...target, q: first(query, 'q').trim().slice(0, 100), kind: isKind(kind) ? kind : '',
    sort: sort === 'downloads' || sort === 'updated' ? sort : 'relevance',
    page: Number.isSafeInteger(requestedPage) ? Math.min(maxPage, Math.max(1, requestedPage)) : 1,
  };
  const results = await searchProjects(filters);
  const total = results.status === 'ok' ? results.value.total : 0;
  const pages = Math.max(1, Math.min(maxPage, Math.ceil(total / pageSize)));
  const itemMatches = filters.q ? findGuides(filters.q) : [];
  const href = (changes: Partial<CatalogFilters>) => '/thu-vien' + queryString({ ...filters, ...changes });

  return <main className="mc-wrap mc-subpage">
    <div className="mc-page-head"><span className="mc-eyebrow">DANH MỤC · MODRINTH</span>
      <h1>Thư viện Minecraft</h1><p>Tìm dự án theo loại, phiên bản Minecraft và bộ nạp mod. Mở dự án để xem từng bản phát hành.</p></div>
    <div className="mc-library">
      <aside className="mc-panel mc-filter">
        <h2>Bộ lọc</h2>
        <form action="/thu-vien" className="mc-filter-form">
          <label>Tên dự án<input name="q" maxLength={100} defaultValue={filters.q} placeholder="Ví dụ: Create" /></label>
          <label>Loại dự án<select name="kind" defaultValue={filters.kind}><option value="">Tất cả</option>
            {kinds.map(item => <option key={item} value={item}>{kindLabel[item]}</option>)}</select></label>
          <label>Phiên bản Minecraft<input name="mc" list="catalog-game-versions" maxLength={32} defaultValue={target.mc} placeholder="Ví dụ: 1.20.1" /></label>
          <MinecraftVersionOptions id="catalog-game-versions" />
          <label>Bộ nạp mod<select name="loader" defaultValue={target.loader}><LoaderOptions /></select></label>
          <label>Sắp xếp<select name="sort" defaultValue={filters.sort}>
            <option value="relevance">Liên quan nhất</option><option value="downloads">Nhiều lượt tải</option><option value="updated">Mới cập nhật</option>
          </select></label>
          <button className="mc-button mc-primary" type="submit"><Icon name="search" size={17} /> Tìm dự án</button>
          <Link href="/thu-vien" prefetch={false} className="mc-text-link">Xóa bộ lọc</Link>
        </form>
      </aside>
      <section aria-label="Kết quả thư viện">
        <div className="mc-tabs" aria-label="Lọc nhanh">
          <Link aria-current={!filters.kind ? 'page' : undefined} href={href({ kind: '', page: 1 })} prefetch={false}>Tất cả</Link>
          {kinds.map(item => <Link key={item} aria-current={filters.kind === item ? 'page' : undefined}
            href={href({ kind: item, page: 1 })} prefetch={false}>{kindLabel[item]}</Link>)}
        </div>
        {itemMatches.length > 0 && <p className="mc-notice">Có {itemMatches.length} hướng dẫn liên quan.{' '}
          <Link className="mc-text-link" href={'/vat-pham' + queryString({ q: filters.q })}>Xem trong sổ tay vật phẩm →</Link></p>}
        {results.status === 'ok' ? <>
          <div className="mc-section-head mc-result-head"><h2>{filters.q ? 'Kết quả cho “' + filters.q + '”' : 'Khám phá dự án'}</h2>
            <span className="mc-muted">{new Intl.NumberFormat('vi').format(total)} dự án</span></div>
          {results.value.projects.length
            ? <div className="mc-project-grid mc-results">{results.value.projects.map(project => <ProjectCard key={project.id} project={project} target={target} />)}</div>
            : <div className="mc-empty"><Icon name="search" size={30} /><h3>Không có dự án phù hợp</h3><p>Thử bỏ bớt bộ lọc, tìm theo tên tiếng Anh hoặc quay lại trang đầu.</p>
                <Link className="mc-button" prefetch={false} href={href({ page: 1, q: '', mc: '', loader: '' })}>Tìm lại</Link></div>}
          {pages > 1 && <nav className="mc-pagination" aria-label="Phân trang dự án">
            {filters.page > 1 && <Link className="mc-button" prefetch={false} href={href({ page: filters.page - 1 })}>← Trước</Link>}
            <span>Trang {filters.page} / {pages}</span>
            {filters.page < pages && <Link className="mc-button" prefetch={false} href={href({ page: filters.page + 1 })}>Tiếp →</Link>}
          </nav>}
          {filters.page === maxPage && total > maxPage * pageSize && <p className="mc-notice">Thu hẹp từ khóa hoặc bộ lọc để tìm thêm dự án.</p>}
        </> : <>
          <div className="mc-notice mc-warning" role="status"><strong>Chưa kết nối được với Modrinth</strong>
            <p>Thử tải lại trang sau ít phút. Dưới đây là dự án gợi ý, không phải kết quả lọc.</p></div>
          <div className="mc-project-grid mc-results">{featured.map(project => <ProjectCard key={project.id} project={project} />)}</div>
        </>}
      </section>
    </div>
  </main>;
}
