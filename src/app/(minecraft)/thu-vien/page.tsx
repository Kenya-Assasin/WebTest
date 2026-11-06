import Link from 'next/link';
import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';
import { ProjectCard } from '@/components/minecraft/cards';
import { LoaderOptions, MinecraftVersionOptions } from '@/components/minecraft/filters';
import { Icon } from '@/components/minecraft/icons';
import { first, isKind, kindLabel, kinds, queryString, readTarget, type Query } from '@/lib/minecraft/catalog';
import { featured, findGuides } from '@/lib/minecraft/guides';
import { maxPage, pageSize, searchProjects, type CatalogFilters } from '@/lib/minecraft/modrinth';

export async function generateMetadata() {
  return { title: translator(await getLocale())('Thư viện dự án', 'Project Library') };
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  const locale = await getLocale();
  const t = translator(locale);
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
    <div className="mc-page-head"><span className="mc-eyebrow">{t('DANH MỤC · MODRINTH', 'CATALOG · MODRINTH')}</span>
      <h1>{t('Thư viện Minecraft', 'Minecraft Library')}</h1><p>{t('Tìm dự án theo loại, phiên bản Minecraft và bộ nạp mod. Mở dự án để xem từng bản phát hành.', 'Find projects by type, Minecraft version and mod loader. Open a project to see its releases.')}</p></div>
    <div className="mc-library">
      <aside className="mc-panel mc-filter">
        <h2>{t('Bộ lọc', 'Filters')}</h2>
        <form action="/thu-vien" className="mc-filter-form">
          <label>{t('Tên dự án', 'Project name')}<input name="q" maxLength={100} defaultValue={filters.q} placeholder={t('Ví dụ: Create', 'For example: Create')} /></label>
          <label>{t('Loại dự án', 'Project type')}<select name="kind" defaultValue={filters.kind}><option value="">{t('Tất cả', 'All')}</option>
            {kinds.map(item => <option key={item} value={item}>{kindLabel[item]}</option>)}</select></label>
          <label>{t('Phiên bản Minecraft', 'Minecraft version')}<input name="mc" list="catalog-game-versions" maxLength={32} defaultValue={target.mc} placeholder={t('Ví dụ: 1.20.1', 'For example: 1.20.1')} /></label>
          <MinecraftVersionOptions id="catalog-game-versions" />
          <label>{t('Bộ nạp mod', 'Mod loader')}<select name="loader" defaultValue={target.loader}><LoaderOptions locale={locale} /></select></label>
          <label>{t('Sắp xếp', 'Sort by')}<select name="sort" defaultValue={filters.sort}>
            <option value="relevance">{t('Liên quan nhất', 'Most relevant')}</option><option value="downloads">{t('Nhiều lượt tải', 'Most downloaded')}</option><option value="updated">{t('Mới cập nhật', 'Recently updated')}</option>
          </select></label>
          <button className="mc-button mc-primary" type="submit"><Icon name="search" size={17} />{t(' Tìm dự án', ' Find projects')}</button>
          <Link href="/thu-vien" prefetch={false} className="mc-text-link">{t('Xóa bộ lọc', 'Clear filters')}</Link>
        </form>
      </aside>
      <section aria-label={t('Kết quả thư viện', 'Library results')}>
        <div className="mc-tabs" aria-label={t('Lọc nhanh', 'Quick filters')}>
          <Link aria-current={!filters.kind ? 'page' : undefined} href={href({ kind: '', page: 1 })} prefetch={false}>{t('Tất cả', 'All')}</Link>
          {kinds.map(item => <Link key={item} aria-current={filters.kind === item ? 'page' : undefined}
            href={href({ kind: item, page: 1 })} prefetch={false}>{kindLabel[item]}</Link>)}
        </div>
        {itemMatches.length > 0 && <p className="mc-notice">{t(`Có ${itemMatches.length} hướng dẫn liên quan.`, `${itemMatches.length} related ${itemMatches.length === 1 ? 'guide' : 'guides'}.`)}{' '}
          <Link className="mc-text-link" href={'/vat-pham' + queryString({ q: filters.q })}>{t('Xem trong sổ tay vật phẩm →', 'See the item handbook →')}</Link></p>}
        {results.status === 'ok' ? <>
          <div className="mc-section-head mc-result-head"><h2>{filters.q ? t(`Kết quả cho “${filters.q}”`, `Results for “${filters.q}”`) : t('Khám phá dự án', 'Explore projects')}</h2>
            <span className="mc-muted">{new Intl.NumberFormat(locale).format(total)} {t('dự án', total === 1 ? 'project' : 'projects')}</span></div>
          {results.value.projects.length
            ? <div className="mc-project-grid mc-results">{results.value.projects.map(project => <ProjectCard key={project.id} project={project} target={target} locale={locale} />)}</div>
            : <div className="mc-empty"><Icon name="search" size={30} /><h3>{t('Không có dự án phù hợp', 'No matching projects')}</h3><p>{t('Thử bỏ bớt bộ lọc, tìm theo tên tiếng Anh hoặc quay lại trang đầu.', 'Try fewer filters, a different project name or the first page.')}</p>
                <Link className="mc-button" prefetch={false} href={href({ page: 1, q: '', mc: '', loader: '' })}>{t('Tìm lại', 'Search again')}</Link></div>}
          {pages > 1 && <nav className="mc-pagination" aria-label={t('Phân trang dự án', 'Project pages')}>
            {filters.page > 1 && <Link className="mc-button" prefetch={false} href={href({ page: filters.page - 1 })}>{t('← Trước', '← Previous')}</Link>}
            <span>{t('Trang', 'Page')} {filters.page} / {pages}</span>
            {filters.page < pages && <Link className="mc-button" prefetch={false} href={href({ page: filters.page + 1 })}>{t('Tiếp →', 'Next →')}</Link>}
          </nav>}
          {filters.page === maxPage && total > maxPage * pageSize && <p className="mc-notice">{t('Thu hẹp từ khóa hoặc bộ lọc để tìm thêm dự án.', 'Narrow your search or change the filters to find more projects.')}</p>}
        </> : <>
          <div className="mc-notice mc-warning" role="status"><strong>{t('Chưa kết nối được với Modrinth', 'Could not connect to Modrinth')}</strong>
            <p>{t('Thử tải lại trang sau ít phút. Dưới đây là dự án gợi ý, không phải kết quả lọc.', 'Try reloading in a few minutes. These are featured projects from the library.')}</p></div>
          <div className="mc-project-grid mc-results">{featured.map(project => <ProjectCard key={project.id} project={project} locale={locale} />)}</div>
        </>}
      </section>
    </div>
  </main>;
}
