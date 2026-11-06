import Link from 'next/link';
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

const formatNumber = new Intl.NumberFormat('vi');
const releaseLabel = { release: 'Ổn định', beta: 'Beta', alpha: 'Alpha' };
const installHelp = {
  mod: 'Dùng bản Minecraft và bộ nạp được ghi ở trên. Cài các thư viện bắt buộc, rồi đặt tệp mod vào thư mục mods của đúng hồ sơ chơi.',
  modpack: 'Nhập bản modpack đã chọn bằng launcher hỗ trợ định dạng của gói. Xem hướng dẫn trên trang dự án trước khi thêm mod vào gói có sẵn.',
  resourcepack: 'Đặt tệp resource pack vào thư mục resourcepacks của hồ sơ chơi, sau đó bật gói trong mục Gói tài nguyên của Minecraft.',
};

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ project: string }>; searchParams: Promise<Query>;
}) {
  const [{ project: key }, query] = await Promise.all([params, searchParams]);
  const target = readTarget(query);
  const selectedId = first(query, 'v');
  const result = await getProject(key);
  if (result.status === 'missing') notFound();
  const localProject = featured.find(item => item.id === key || item.slug === key);
  const back = <Link href="/thu-vien" className="mc-text-link mc-back" prefetch={false}>← Về thư viện</Link>;
  if (result.status !== 'ok') return <main className="mc-wrap mc-subpage">
    {back}<div className="mc-notice mc-warning" role="status"><h1>{localProject?.title ?? 'Chưa tải được dự án'}</h1>
      <p>Modrinth đang không phản hồi. Thử tải lại trang để lấy danh sách phiên bản.</p>
      {localProject && <a href={sourcePath(localProject)} className="mc-text-link">Mở dự án trên Modrinth ↗</a>}</div>
    {localProject && guides.some(guide => guide.projectId === localProject.id) &&
      <section className="mc-home-section"><h2>Hướng dẫn vật phẩm</h2><div className="mc-project-grid">
        {guides.filter(guide => guide.projectId === localProject.id).map(guide => <GuideCard key={guide.id} guide={guide} />)}</div></section>}
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
        <p>{localProject?.description ?? project.description}</p>
        {localProject && project.description && <p className="mc-muted" lang="en">{project.description}</p>}
        <div className="mc-pills"><span>{formatNumber.format(project.downloads)} lượt tải</span>
          {project.tags.slice(0, 4).map(tag => <span key={tag}>{loaderLabel[tag] ?? tag}</span>)}</div></div>
      <a className="mc-button" href={sourcePath(project)}>Trang tác giả ↗</a>
    </section>
    <div className="mc-detail-grid">
      <section className="mc-panel">
        <span className="mc-eyebrow">CHỌN TỆP PHÙ HỢP</span><h2>Bản phát hành</h2>
        <form action={detailPath(project.id)} className="mc-inline-form mc-detail-form">
          <label>Phiên bản Minecraft<input name="mc" defaultValue={target.mc} maxLength={32} list="project-mc-versions" placeholder="Mọi phiên bản" /></label>
          <MinecraftVersionOptions id="project-mc-versions" versions={[...project.gameVersions].reverse()} />
          {project.kind !== 'resourcepack' && <label>Bộ nạp mod<select name="loader" defaultValue={target.loader}><LoaderOptions /></select></label>}
          <button className="mc-button" type="submit">Lọc bản</button>
        </form>
        {releases.status !== 'ok' ? <p className="mc-notice mc-warning">Chưa lấy được bản phát hành. Bạn có thể xem trực tiếp trên Modrinth.</p>
          : options.length === 0 ? <p className="mc-notice">Không có bản phát hành khớp với bộ lọc. Hãy thử phiên bản Minecraft hoặc bộ nạp khác.</p>
          : <form action={detailPath(project.id)} className="mc-inline-form mc-detail-form">
            {target.mc && <input type="hidden" name="mc" value={target.mc} />}
            {target.loader && <input type="hidden" name="loader" value={target.loader} />}
            <label>Chọn bản tải<select name="v" defaultValue={selected?.id ?? ''} required>
              {!selected && <option value="">Chọn một bản phát hành</option>}
              {visibleOptions.map(item => <option key={item.id} value={item.id}>{item.number} · {releaseLabel[item.channel]}</option>)}
            </select></label><button className="mc-button" type="submit">Xem bản này</button>
          </form>}
        {options.length > 60 && <p className="mc-muted">Đang hiển thị các bản gần đây. Lọc theo phiên bản Minecraft để tìm bản cũ hơn.</p>}
        {idKey(selectedId) && options.length > 0 && !selected && <p className="mc-notice mc-warning">Bản yêu cầu không có trong kết quả. Thử bỏ bộ lọc hoặc xem trang tác giả.</p>}
        {selected && <div className="mc-release">
          <div className="mc-release-head"><strong>{selected.number}</strong><span className="mc-tag">{releaseLabel[selected.channel]}</span></div>
          <dl className="mc-facts"><div><dt>Minecraft</dt><dd>{selected.gameVersions.join(', ') || 'Chưa khai báo'}</dd></div>
            <div><dt>Bộ nạp</dt><dd>{project.kind === 'resourcepack' ? 'Không áp dụng' : selected.loaders.map(loader => loaderLabel[loader] ?? loader).join(', ') || 'Chưa khai báo'}</dd></div></dl>
          <div className="mc-actions"><a href={sourcePath(project, selected.id)} className="mc-button">Mở bản tải ↗</a>
            <AddToPack key={selected.id} entry={{ id: project.id, slug: project.slug, title: project.title, kind: project.kind, release: { ...selected, dependencies } }} target={target} /></div>
        </div>}
      </section>
      <aside className="mc-panel">
        <span className="mc-eyebrow">TRƯỚC KHI CÀI</span><h2>Cần tải thêm gì?</h2>
        {!selected ? <p>Chọn một bản phát hành để xem phụ thuộc.</p>
          : dependencies.length === 0 ? <p>Bản này không có mục phụ thuộc được khai báo trên Modrinth. Xem thêm hướng dẫn của tác giả.</p>
          : <ul className="mc-dependencies">{dependencies.map((dep, index) => <li key={index}>
            <span className={'mc-relation mc-relation-' + dep.relation}>{relationLabel[dep.relation]}</span>
            {dep.projectId ? <Link className="mc-text-link" href={detailPath(dep.projectId, target) + (dep.versionId ? (target.mc || target.loader ? '&' : '?') + 'v=' + dep.versionId : '')}
              prefetch={false}>{dependencyName(dep)} <Icon name="arrow" size={14} /></Link> : <strong>{dependencyName(dep)}</strong>}
          </li>)}</ul>}
        <h3 className="mc-install-title">Cách cài</h3><p>{installHelp[project.kind]}</p>
      </aside>
    </div>
    <section className="mc-home-section"><div className="mc-section-head"><div><span className="mc-eyebrow">SỔ TAY</span><h2>Hướng dẫn vật phẩm</h2></div>
      <Link href="/vat-pham" className="mc-text-link">Mở sổ tay →</Link></div>
      {itemGuides.length ? <div className="mc-project-grid">{itemGuides.map(guide => <GuideCard key={guide.id} guide={guide} />)}</div>
        : <p className="mc-notice">Chưa có hướng dẫn tiếng Việt cho từng vật phẩm của dự án này.</p>}
    </section>
  </main>;
}
