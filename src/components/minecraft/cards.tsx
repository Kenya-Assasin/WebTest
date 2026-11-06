import Link from 'next/link';
import { detailPath, kindLabel, loaderLabel, type Project, type Target } from '@/lib/minecraft/catalog';
import type { ItemGuide } from '@/lib/minecraft/guides';
import { translator, type Locale } from '@/lib/minecraft/locale';
import { Icon } from './icons';

export function ProjectMark({ kind, icon }: Pick<Project, 'kind'> & { icon?: string | null }) {
  return <span className={'mc-project-icon mc-mark-' + kind}>
    <Icon name={kind} size={25} />
    {icon && <img src={icon} alt="" width="48" height="48" loading="lazy" referrerPolicy="no-referrer" />}
  </span>;
}

export function ProjectCard({ project, target, locale }: {
  project: Pick<Project, 'id' | 'title' | 'description' | 'kind'> & Partial<Project> & { descriptionEn?: string };
  target?: Target; locale: Locale;
}) {
  const t = translator(locale);
  const knownLoaders = project.tags?.filter(tag => tag in loaderLabel && tag !== 'minecraft') ?? [];
  return <article className="mc-project-card">
    <Link href={detailPath(project.id, target)} prefetch={false} className="mc-card-link">
      <div className="mc-card-top"><ProjectMark kind={project.kind} icon={project.icon} />
        <span className="mc-tag">{kindLabel[project.kind]}</span></div>
      <h3>{project.title}</h3>
      <p>{locale === 'en' ? project.descriptionEn ?? project.description : project.description}</p>
      <div className="mc-card-bottom">
        <span>{typeof project.downloads === 'number'
          ? new Intl.NumberFormat(locale, { notation: 'compact' }).format(project.downloads) + t(' lượt tải', project.downloads === 1 ? ' download' : ' downloads')
          : t('Xem dự án', 'View project')}
          {knownLoaders.length > 0 && ' · ' + knownLoaders.slice(0, 3).map(loader => loaderLabel[loader]).join(', ')}</span>
        <Icon name="arrow" size={18} />
      </div>
    </Link>
  </article>;
}

export function GuideCard({ guide, locale }: { guide: ItemGuide; locale: Locale }) {
  const t = translator(locale);
  const content = locale === 'en' ? guide.translation : guide;
  return <article className="mc-guide" id={guide.id}>
    <div className="mc-guide-head"><span className="mc-guide-icon"><Icon name="book" /></span>
      <div><span className="mc-eyebrow">{guide.project} · {content.category}</span>
      <h3>{t(guide.name, guide.english)}</h3>{locale === 'vi' && <span className="mc-muted" lang="en">{guide.english}</span>}</div>
    </div>
    <p>{content.purpose}</p>
    <details><summary>{t('Cơ chế và cách sử dụng', 'How it works and how to use it')}</summary>
      <p>{content.function}</p>
      <ol>{content.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="mc-muted">{t('Công thức và thao tác có thể thay đổi theo bản Create. Xem hướng dẫn trong bản mod đang chơi.', 'Recipes and steps can vary by Create version. Check the instructions for the version you play.')}</p>
      <a href={guide.source} className="mc-text-link">{t('Nguồn của tác giả ↗', "Author's guide ↗")}</a>
    </details>
    <Link href={detailPath(guide.projectId)} prefetch={false} className="mc-text-link">{t('Xem phiên bản mod', 'View mod releases')} <Icon name="arrow" size={15} /></Link>
  </article>;
}
