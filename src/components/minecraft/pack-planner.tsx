'use client';

import Link from 'next/link';
import { useState } from 'react';
import { dependencyName, detailPath, isGameVersion, isLoader, kindLabel, loaderLabel, sourcePath, versionSuggestions } from '@/lib/minecraft/catalog';
import { getPlanIssues, type PlanIssue } from '@/lib/minecraft/plan';
import { translator } from '@/lib/minecraft/locale';
import { useLocale } from './language-provider';
import { LoaderOptions, MinecraftVersionOptions } from './filters';
import { Icon } from './icons';
import { removeProject, saveTarget, usePlan } from './pack-store';

const issueLabel = {
  minecraft: ["Không hỗ trợ phiên bản Minecraft đã chọn.","The selected Minecraft version is not supported."],
  loader: ["Không hỗ trợ bộ nạp đã chọn.","The selected mod loader is not supported."],
  missing: ["Thiếu phụ thuộc bắt buộc:","Missing required dependency:"],
  'wrong-version': ["Phụ thuộc cần bản phát hành khác:","Dependency requires a different release:"],
  conflict: ["Xung đột được tác giả khai báo với:","Declared conflict with:"],
} as const satisfies Record<PlanIssue['kind'], readonly [string, string]>;

export function PackPlanner() {
  const locale = useLocale();
  const t = translator(locale);
  const plan = usePlan();
  const { entries, target } = plan;
  const [error, setError] = useState<'save' | 'change' | null>(null);
  const issues = entries.map(entry => getPlanIssues(entry, plan));
  const flagged = issues.filter(row => row.length > 0).length;
  const checkingTarget = Boolean(target.mc && (target.loader || entries.every(entry => entry.kind === 'resourcepack')));
  const versions = [...new Set([...entries.flatMap(entry => entry.release.gameVersions), ...versionSuggestions])];
  function updateTarget(mc: string, loader: string) {
    if (mc && !isGameVersion(mc)) return;
    setError(saveTarget({ mc, loader: isLoader(loader) ? loader : '' }) ? null : 'save');
  }

  return <div className="mc-library mc-plan">
    <aside className="mc-panel mc-filter">
      <h2>{t('Cấu hình gói', 'Pack settings')}</h2>
      <div className="mc-filter-form">
        <label>{t('Phiên bản Minecraft', 'Minecraft version')}<input value={target.mc} onChange={event => updateTarget(event.target.value, target.loader)}
          list="plan-game-versions" maxLength={32} placeholder={t('Ví dụ: 1.20.1', 'For example: 1.20.1')} /></label>
        <MinecraftVersionOptions id="plan-game-versions" versions={versions} />
        <label>{t('Bộ nạp mod', 'Mod loader')}<select value={target.loader} onChange={event => updateTarget(target.mc, event.target.value)}><LoaderOptions locale={locale} empty={t('Chưa chọn', 'Select a loader')} /></select></label>
        <p className="mc-muted">{t('Danh sách được lưu trên trình duyệt này. Bạn có thể đổi cấu hình mà không mất các bản đã chọn.', 'Your pack is saved in this browser. Changing these settings keeps the releases you picked.')}</p>
        <Link className="mc-button mc-primary" href="/thu-vien" prefetch={false}>{t('Tìm thêm dự án ', 'Find more projects ')}<Icon name="arrow" size={16} /></Link>
      </div>
    </aside>
    <section aria-label={t('Danh sách gói', 'Pack contents')}>
      {error && <p role="alert" className="mc-notice mc-warning">{error === 'save' ? t('Không lưu được gói trên trình duyệt này.', 'Could not save the pack in this browser.') : t('Không lưu được thay đổi.', 'Could not save the change.')}</p>}
      {!entries.length ? <div className="mc-empty">
        <Icon name="modpack" size={34} /><h2>{t('Gói của bạn đang trống', 'Your pack is empty')}</h2><p>{t('Mở một dự án, chọn bản phát hành rồi bấm “Thêm vào gói”.', 'Open a project, choose a release and select “Add to pack”.')}</p>
        <Link className="mc-button mc-primary" href="/thu-vien" prefetch={false}>{t('Duyệt thư viện', 'Browse the library')}</Link>
      </div> : <>
        <div className="mc-section-head mc-result-head"><h2>{t('Dự án đã chọn', 'Selected projects')}</h2><span className="mc-muted">{entries.length} {t('mục', entries.length === 1 ? 'item' : 'items')}</span></div>
        <div className={'mc-notice' + (flagged ? ' mc-warning' : '')} role="status">
          <strong>{flagged ? t(`${flagged} dự án cần xem lại`, `${flagged} ${flagged === 1 ? 'project needs' : 'projects need'} review`) : checkingTarget ? t('Chưa phát hiện vấn đề trong dữ liệu đã khai báo', 'No issues found in the declared data') : t('Chọn cấu hình để kiểm tra bản Minecraft và bộ nạp', 'Choose a Minecraft version and loader to run compatibility checks')}</strong>
          <p>{t('Kiểm tra dựa trên phiên bản và phụ thuộc do tác giả khai báo. Hãy chạy thử gói trong hồ sơ Minecraft riêng trước khi chơi.', 'These checks use the versions and dependencies declared by project authors. Test the pack in a separate Minecraft profile before playing.')}</p>
          {entries.some(entry => entry.kind === 'modpack') && <p>{t('Thành phần đóng gói bên trong modpack chưa được tính là đã cài.', 'Mods bundled inside a modpack do not count as installed here.')}</p>}
        </div>
        <ul className="mc-plan-list">{entries.map((entry, index) => <li className="mc-panel" key={entry.id}>
          <div className="mc-plan-row"><div><span className="mc-eyebrow">{kindLabel[entry.kind]}</span>
            <h3><Link href={detailPath(entry.id) + '?v=' + entry.release.id} prefetch={false}>{entry.title}</Link></h3>
            <p>{t('Bản', 'Release')} {entry.release.number} · {entry.release.gameVersions.join(', ') || t('Chưa rõ phiên bản Minecraft', 'Minecraft version unknown')}
              {entry.kind !== 'resourcepack' && entry.release.loaders.length > 0 && ' · ' + entry.release.loaders.map(item => loaderLabel[item] ?? item).join(', ')}</p></div>
            <div className="mc-actions"><a href={sourcePath(entry, entry.release.id)} className="mc-button">{t('Bản tải ↗', 'Download ↗')}</a>
              <button type="button" className="mc-button" aria-label={t('Bỏ ', 'Remove ') + entry.title} onClick={() => setError(removeProject(entry.id) ? null : 'change')}>{t('Bỏ', 'Remove')}</button></div></div>
          {issues[index].length > 0 && <ul className="mc-plan-issues">{issues[index].map((issue, issueIndex) => <li key={issueIndex}>
            {issueLabel[issue.kind][locale === 'en' ? 1 : 0]} {issue.dependency && (issue.dependency.projectId
              ? <Link className="mc-text-link" href={detailPath(issue.dependency.projectId, target) + (issue.dependency.versionId
                ? (target.mc || target.loader ? '&' : '?') + 'v=' + issue.dependency.versionId : '')} prefetch={false}>
                {dependencyName(issue.dependency, locale)} →</Link>
              : dependencyName(issue.dependency, locale))}
          </li>)}</ul>}
        </li>)}</ul>
      </>}
    </section>
  </div>;
}
