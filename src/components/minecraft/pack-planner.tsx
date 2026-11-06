'use client';

import Link from 'next/link';
import { useState } from 'react';
import { dependencyName, detailPath, isGameVersion, isLoader, kindLabel, loaderLabel, sourcePath, versionSuggestions } from '@/lib/minecraft/catalog';
import { getPlanIssues, type PlanIssue } from '@/lib/minecraft/plan';
import { LoaderOptions, MinecraftVersionOptions } from './filters';
import { Icon } from './icons';
import { removeProject, saveTarget, usePlan } from './pack-store';

const issueLabel: Record<PlanIssue['kind'], string> = {
  minecraft: 'Không hỗ trợ phiên bản Minecraft đã chọn.',
  loader: 'Không hỗ trợ bộ nạp đã chọn.',
  missing: 'Thiếu phụ thuộc bắt buộc:',
  'wrong-version': 'Phụ thuộc cần bản phát hành khác:',
  conflict: 'Xung đột được tác giả khai báo với:',
};

export function PackPlanner() {
  const plan = usePlan();
  const { entries, target } = plan;
  const [error, setError] = useState('');
  const issues = entries.map(entry => getPlanIssues(entry, plan));
  const flagged = issues.filter(row => row.length > 0).length;
  const checkingTarget = Boolean(target.mc && (target.loader || entries.every(entry => entry.kind === 'resourcepack')));
  const versions = [...new Set([...entries.flatMap(entry => entry.release.gameVersions), ...versionSuggestions])];
  function updateTarget(mc: string, loader: string) {
    if (mc && !isGameVersion(mc)) return;
    setError(saveTarget({ mc, loader: isLoader(loader) ? loader : '' }) ? '' : 'Không lưu được gói trên trình duyệt này.');
  }

  return <div className="mc-library mc-plan">
    <aside className="mc-panel mc-filter">
      <h2>Cấu hình gói</h2>
      <div className="mc-filter-form">
        <label>Phiên bản Minecraft<input value={target.mc} onChange={event => updateTarget(event.target.value, target.loader)}
          list="plan-game-versions" maxLength={32} placeholder="Ví dụ: 1.20.1" /></label>
        <MinecraftVersionOptions id="plan-game-versions" versions={versions} />
        <label>Bộ nạp mod<select value={target.loader} onChange={event => updateTarget(target.mc, event.target.value)}><LoaderOptions empty="Chưa chọn" /></select></label>
        <p className="mc-muted">Danh sách được lưu trên trình duyệt này. Bạn có thể đổi cấu hình mà không mất các bản đã chọn.</p>
        <Link className="mc-button mc-primary" href="/thu-vien" prefetch={false}>Tìm thêm dự án <Icon name="arrow" size={16} /></Link>
      </div>
    </aside>
    <section aria-label="Danh sách gói">
      {error && <p role="alert" className="mc-notice mc-warning">{error}</p>}
      {!entries.length ? <div className="mc-empty">
        <Icon name="modpack" size={34} /><h2>Gói của bạn đang trống</h2><p>Mở một dự án, chọn bản phát hành rồi bấm “Thêm vào gói”.</p>
        <Link className="mc-button mc-primary" href="/thu-vien" prefetch={false}>Duyệt thư viện</Link>
      </div> : <>
        <div className="mc-section-head mc-result-head"><h2>Dự án đã chọn</h2><span className="mc-muted">{entries.length} mục</span></div>
        <div className={'mc-notice' + (flagged ? ' mc-warning' : '')} role="status">
          <strong>{flagged ? flagged + ' dự án cần xem lại' : checkingTarget ? 'Chưa phát hiện vấn đề trong dữ liệu đã khai báo' : 'Chọn cấu hình để kiểm tra bản Minecraft và bộ nạp'}</strong>
          <p>Kiểm tra dựa trên phiên bản và phụ thuộc do tác giả khai báo. Hãy chạy thử gói trong hồ sơ Minecraft riêng trước khi chơi.</p>
          {entries.some(entry => entry.kind === 'modpack') && <p>Thành phần đóng gói bên trong modpack chưa được tính là đã cài.</p>}
        </div>
        <ul className="mc-plan-list">{entries.map((entry, index) => <li className="mc-panel" key={entry.id}>
          <div className="mc-plan-row"><div><span className="mc-eyebrow">{kindLabel[entry.kind]}</span>
            <h3><Link href={detailPath(entry.id) + '?v=' + entry.release.id} prefetch={false}>{entry.title}</Link></h3>
            <p>Bản {entry.release.number} · {entry.release.gameVersions.join(', ') || 'Chưa rõ phiên bản Minecraft'}
              {entry.kind !== 'resourcepack' && entry.release.loaders.length > 0 && ' · ' + entry.release.loaders.map(item => loaderLabel[item] ?? item).join(', ')}</p></div>
            <div className="mc-actions"><a href={sourcePath(entry, entry.release.id)} className="mc-button">Bản tải ↗</a>
              <button type="button" className="mc-button" aria-label={'Bỏ ' + entry.title} onClick={() => setError(removeProject(entry.id) ? '' : 'Không lưu được thay đổi.')}>Bỏ</button></div></div>
          {issues[index].length > 0 && <ul className="mc-plan-issues">{issues[index].map((issue, issueIndex) => <li key={issueIndex}>
            {issueLabel[issue.kind]} {issue.dependency && (issue.dependency.projectId
              ? <Link className="mc-text-link" href={detailPath(issue.dependency.projectId, target) + (issue.dependency.versionId
                ? (target.mc || target.loader ? '&' : '?') + 'v=' + issue.dependency.versionId : '')} prefetch={false}>
                {dependencyName(issue.dependency)} →</Link>
              : dependencyName(issue.dependency))}
          </li>)}</ul>}
        </li>)}</ul>
      </>}
    </section>
  </div>;
}
