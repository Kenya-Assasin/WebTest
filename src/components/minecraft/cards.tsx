import Link from 'next/link';
import { detailPath, kindLabel, loaderLabel, type Project, type Target } from '@/lib/minecraft/catalog';
import type { ItemGuide } from '@/lib/minecraft/guides';
import { Icon } from './icons';

export function ProjectMark({ kind, icon }: Pick<Project, 'kind'> & { icon?: string | null }) {
  return <span className={'mc-project-icon mc-mark-' + kind}>
    <Icon name={kind} size={25} />
    {icon && <img src={icon} alt="" width="48" height="48" loading="lazy" referrerPolicy="no-referrer" />}
  </span>;
}

export function ProjectCard({ project, target }: {
  project: Pick<Project, 'id' | 'title' | 'description' | 'kind'> & Partial<Project>; target?: Target;
}) {
  const knownLoaders = project.tags?.filter(tag => tag in loaderLabel && tag !== 'minecraft') ?? [];
  return <article className="mc-project-card">
    <Link href={detailPath(project.id, target)} prefetch={false} className="mc-card-link">
      <div className="mc-card-top"><ProjectMark kind={project.kind} icon={project.icon} />
        <span className="mc-tag">{kindLabel[project.kind]}</span></div>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="mc-card-bottom">
        <span>{typeof project.downloads === 'number' ? new Intl.NumberFormat('vi', { notation: 'compact' }).format(project.downloads) + ' lượt tải' : 'Xem dự án'}
          {knownLoaders.length > 0 && ' · ' + knownLoaders.slice(0, 3).map(loader => loaderLabel[loader]).join(', ')}</span>
        <Icon name="arrow" size={18} />
      </div>
    </Link>
  </article>;
}

export function GuideCard({ guide }: { guide: ItemGuide }) {
  return <article className="mc-guide" id={guide.id}>
    <div className="mc-guide-head"><span className="mc-guide-icon"><Icon name="book" /></span>
      <div><span className="mc-eyebrow">{guide.project} · {guide.category}</span>
      <h3>{guide.name}</h3><span className="mc-muted">{guide.english}</span></div>
    </div>
    <p>{guide.purpose}</p>
    <details><summary>Cơ chế và cách sử dụng</summary>
      <p>{guide.function}</p>
      <ol>{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="mc-muted">Công thức và thao tác có thể thay đổi theo bản Create. Xem hướng dẫn trong bản mod đang chơi.</p>
      <a href={guide.source} className="mc-text-link">Nguồn của tác giả ↗</a>
    </details>
    <Link href={detailPath(guide.projectId)} prefetch={false} className="mc-text-link">Xem phiên bản mod <Icon name="arrow" size={15} /></Link>
  </article>;
}
