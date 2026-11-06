import Link from 'next/link';
import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';
import { notFound } from 'next/navigation';
import { AddToPack } from '@/components/minecraft/add-to-pack';
import { GuideCard, ProjectMark } from '@/components/minecraft/cards';
import { LoaderOptions, MinecraftVersionOptions } from '@/components/minecraft/filters';
import { Icon } from '@/components/minecraft/icons';
import {
  dependencyName, detailPath, first, idKey, kindLabel, loaderLabel, readTarget, relationLabel, sourcePath, type Query,
} from '@/lib/minecraft/catalog';
import { featured, guides } from '@/lib/minecraft/guides';
import { getProject, getReleases, resolveDependencies } from '@/lib/minecraft/modrinth';

const releaseLabel = { release: ['Ổn định', 'Stable'] as const, beta: ['Beta', 'Beta'] as const, alpha: ['Alpha', 'Alpha'] as const };
const installHelp = {
  mod: ["Dùng bản Minecraft và bộ nạp được ghi ở trên. Cài các thư viện bắt buộc, rồi đặt tệp mod vào thư mục mods của đúng hồ sơ chơi.","Use the Minecraft version and loader listed above. Install required dependencies, then put the mod file in the profile's mods folder."] as const,
  modpack: ["Nhập bản modpack đã chọn bằng launcher hỗ trợ định dạng của gói. Xem hướng dẫn trên trang dự án trước khi thêm mod vào gói có sẵn.","Import the release using a launcher that supports the pack format. Read the project instructions before adding mods to an existing pack."] as const,
  resourcepack: ["Đặt tệp resource pack vào thư mục resourcepacks của hồ sơ chơi, sau đó bật gói trong mục Gói tài nguyên của Minecraft.","Put the file in your profile's resourcepacks folder, then enable it in Minecraft's Resource Packs menu."] as const,
};

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ project: string }>; searchParams: Promise<Query>;
}) {
  const locale = await getLocale();
  const t = translator(locale);
  const translated = ([vi, en]: readonly [string, string]) => t(vi, en);
  const [{ project: key }, query] = await Promise.all([params, searchParams]);
  const target = readTarget(query);
  const selectedId = first(query, 'v');
  const result = await getProject(key);
  if (result.status === 'missing') notFound();
  const localProject = featured.find(item => item.id === key || item.slug === key);
  const back = <Link href="/thu-vien" className="mc-text-link mc-back" prefetch={false}>{t('← Về thư viện', '← Back to library')}</Link>;
  if (result.status !== 'ok') return <main className="mc-wrap mc-subpage">
    {back}<div className="mc-notice mc-warning" role="status"><h1>{localProject?.title ?? t('Chưa tải được dự án', 'Could not load the project')}</h1>
      <p>{t('Modrinth đang không phản hồi. Thử tải lại trang để lấy danh sách phiên bản.', 'Modrinth is not responding. Reload to try fetching the releases again.')}</p>
      {localProject && <a href={sourcePath(localProject)} className="mc-text-link">{t('Mở dự án trên Modrinth ↗', 'Open project on Modrinth ↗')}</a>}</div>
    {localProject && guides.some(guide => guide.projectId === localProject.id) &&
      <section className="mc-home-section"><h2>{t('Hướng dẫn vật phẩm', 'Item guides')}</h2><div className="mc-project-grid">
        {guides.filter(guide => guide.projectId === localProject.id).map(guide => <GuideCard key={guide.id} guide={guide} locale={locale} />)}</div></section>}
  </main>;

  const project = result.value;
  const releases = await getReleases(project, target);
  const options = releases.status === 'ok' ? releases.value : [];
  const selected = idKey(selectedId) ? options.find(item => item.id === selectedId) : options.find(item => item.channel === 'release') ?? options[0];
  const visibleOptions = options.slice(0, 60);
  if (selected && !visibleOptions.includes(selected)) visibleOptions.push(selected);
  const dependencies = selected ? await resolveDependencies(selected.dependencies) : [];
  const itemGuides = guides.filter(guide => guide.projectId === project.id);

  return <main className="mc-wrap mc-subpage">
    {back}
    <section className="mc-project-head mc-panel">
      <ProjectMark kind={project.kind} icon={project.icon} />
      <div><span className="mc-eyebrow">{kindLabel[project.kind]} · MODRINTH</span><h1>{project.title}</h1>
        <p>{locale === 'vi' ? localProject?.description ?? project.description : project.description}</p>
        {locale === 'vi' && localProject && project.description && <p className="mc-muted">{project.description}</p>}
        <div className="mc-pills"><span>{new Intl.NumberFormat(locale).format(project.downloads)} {t('lượt tải', project.downloads === 1 ? 'download' : 'downloads')}</span>
          {project.tags.slice(0, 4).map(tag => <span key={tag}>{loaderLabel[tag] ?? tag}</span>)}</div></div>
      <a className="mc-button" href={sourcePath(project)}>{t('Trang tác giả ↗', 'Author\'s page ↗')}</a>
    </section>
    <div className="mc-detail-grid">
      <section className="mc-panel">
        <span className="mc-eyebrow">{t('CHỌN TỆP PHÙ HỢP', 'CHOOSE A FILE')}</span><h2>{t('Bản phát hành', 'Releases')}</h2>
        <form action={detailPath(project.id)} className="mc-inline-form mc-detail-form">
          <label>{t('Phiên bản Minecraft', 'Minecraft version')}<input name="mc" defaultValue={target.mc} maxLength={32} list="project-mc-versions" placeholder={t('Mọi phiên bản', 'Any version')} /></label>
          <MinecraftVersionOptions id="project-mc-versions" versions={[...project.gameVersions].reverse()} />
          {project.kind !== 'resourcepack' && <label>{t('Bộ nạp mod', 'Mod loader')}<select name="loader" defaultValue={target.loader}><LoaderOptions locale={locale} /></select></label>}
          <button className="mc-button" type="submit">{t('Lọc bản', 'Filter releases')}</button>
        </form>
        {releases.status !== 'ok' ? <p className="mc-notice mc-warning">{t('Chưa lấy được bản phát hành. Bạn có thể xem trực tiếp trên Modrinth.', 'Could not load releases. You can check them directly on Modrinth.')}</p>
          : options.length === 0 ? <p className="mc-notice">{t('Không có bản phát hành khớp với bộ lọc. Hãy thử phiên bản Minecraft hoặc bộ nạp khác.', 'No matching releases. Try a different Minecraft version or mod loader.')}</p>
          : <form action={detailPath(project.id)} className="mc-inline-form mc-detail-form">
            {target.mc && <input type="hidden" name="mc" value={target.mc} />}
            {target.loader && <input type="hidden" name="loader" value={target.loader} />}
            <label>{t('Chọn bản tải', 'Select a release')}<select name="v" defaultValue={selected?.id ?? ''} required>
              {!selected && <option value="">{t('Chọn một bản phát hành', 'Choose a release')}</option>}
              {visibleOptions.map(item => <option key={item.id} value={item.id}>{item.number} · {translated(releaseLabel[item.channel])}</option>)}
            </select></label><button className="mc-button" type="submit">{t('Xem bản này', 'View release')}</button>
          </form>}
        {options.length > 60 && <p className="mc-muted">{t('Đang hiển thị các bản gần đây. Lọc theo phiên bản Minecraft để tìm bản cũ hơn.', 'Showing recent releases. Filter by Minecraft version to find older ones.')}</p>}
        {idKey(selectedId) && options.length > 0 && !selected && <p className="mc-notice mc-warning">{t('Bản yêu cầu không có trong kết quả. Thử bỏ bộ lọc hoặc xem trang tác giả.', 'The requested release is missing from these results. Clear the filters or check the author\'s page.')}</p>}
        {selected && <div className="mc-release">
          <div className="mc-release-head"><strong>{selected.number}</strong><span className="mc-tag">{translated(releaseLabel[selected.channel])}</span></div>
          <dl className="mc-facts"><div><dt>Minecraft</dt><dd>{selected.gameVersions.join(', ') || t('Chưa khai báo', 'Not listed')}</dd></div>
            <div><dt>{t('Bộ nạp', 'Loader')}</dt><dd>{project.kind === 'resourcepack' ? t('Không áp dụng', 'Not applicable') : selected.loaders.map(loader => loaderLabel[loader] ?? loader).join(', ') || t('Chưa khai báo', 'Not listed')}</dd></div></dl>
          <div className="mc-actions"><a href={sourcePath(project, selected.id)} className="mc-button">{t('Mở bản tải ↗', 'Open download ↗')}</a>
            <AddToPack key={selected.id} entry={{ id: project.id, slug: project.slug, title: project.title, kind: project.kind, release: { ...selected, dependencies } }} target={target} /></div>
        </div>}
      </section>
      <aside className="mc-panel">
        <span className="mc-eyebrow">{t('TRƯỚC KHI CÀI', 'BEFORE INSTALLING')}</span><h2>{t('Cần tải thêm gì?', 'What else do I need?')}</h2>
        {!selected ? <p>{t('Chọn một bản phát hành để xem phụ thuộc.', 'Choose a release to see its dependencies.')}</p>
          : dependencies.length === 0 ? <p>{t('Bản này không có mục phụ thuộc được khai báo trên Modrinth. Xem thêm hướng dẫn của tác giả.', 'This release lists no dependencies on Modrinth. Check the author\'s instructions for details.')}</p>
          : <ul className="mc-dependencies">{dependencies.map((dep, index) => <li key={index}>
            <span className={'mc-relation mc-relation-' + dep.relation}>{translated(relationLabel[dep.relation])}</span>
            {dep.projectId ? <Link className="mc-text-link" href={detailPath(dep.projectId, target) + (dep.versionId ? (target.mc || target.loader ? '&' : '?') + 'v=' + dep.versionId : '')}
              prefetch={false}>{dependencyName(dep, locale)} <Icon name="arrow" size={14} /></Link> : <strong>{dependencyName(dep, locale)}</strong>}
          </li>)}</ul>}
        <h3 className="mc-install-title">{t('Cách cài', 'Installation')}</h3><p>{translated(installHelp[project.kind])}</p>
      </aside>
    </div>
    <section className="mc-home-section"><div className="mc-section-head"><div><span className="mc-eyebrow">{t('SỔ TAY', 'HANDBOOK')}</span><h2>{t('Hướng dẫn vật phẩm', 'Item guides')}</h2></div>
      <Link href="/vat-pham" className="mc-text-link">{t('Mở sổ tay →', 'Open the handbook →')}</Link></div>
      {itemGuides.length ? <div className="mc-project-grid">{itemGuides.map(guide => <GuideCard key={guide.id} guide={guide} locale={locale} />)}</div>
        : <p className="mc-notice">{t('Chưa có hướng dẫn tiếng Việt cho từng vật phẩm của dự án này.', 'The handbook has no item guides for this project yet.')}</p>}
    </section>
  </main>;
}
