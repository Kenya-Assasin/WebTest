'use client';
import Link from 'next/link';
import { statusNames } from '@/lib/creatures/model';
import { useCreatureList } from './use-creatures';
import { useStatistics } from './use-statistics';
import { CreatureCard, Empty, Feedback, Pagination } from './shared';

export function AdminDashboard() {
  const list = useCreatureList({ statuses: ['pending'] });
  const stats = useStatistics();
  return <main className="mca-main" id="adminDashboard"><header className="mca-page-heading"><div><span className="mca-eyebrow">MCA / ADMIN CONTROL</span><h1>QUẢN TRỊ HỒ SƠ</h1><p>Xem xét phát hiện mới và xác minh dữ liệu sinh vật.</p></div><Link href="/kho-du-lieu" className="mca-button secondary">Mở kho dữ liệu</Link></header>
    <div className="mca-stat-grid mca-admin-stats">{Object.entries(statusNames).map(([status, name]) => <div key={status}><strong>{stats.data?.[status] ?? '—'}</strong><span>{name}</span></div>)}</div>{stats.error && <p role="alert" className="mca-error">{stats.error}</p>}
    <section className="mca-panel"><div className="mca-tabs" role="group" aria-label="Lọc trạng thái kiểm duyệt"><button className={!list.filters.statuses.length ? 'active' : ''} aria-pressed={!list.filters.statuses.length} onClick={() => list.updateFilters({ statuses: [] })}>Tất cả</button>{Object.entries(statusNames).map(([status, name]) => <button key={status} className={list.filters.statuses.includes(status) ? 'active' : ''} aria-pressed={list.filters.statuses.includes(status)} onClick={() => list.updateFilters({ statuses: [status] })}>{name}</button>)}</div><div className="mca-toolbar"><label className="mca-search"><span className="mca-sr-only">Tìm hồ sơ kiểm duyệt</span><input id="adminSearchInput" type="search" value={list.filters.search} onChange={event => list.updateFilters({ search: event.target.value })} placeholder="Tìm tên sinh vật hoặc mã hồ sơ..." /></label><button onClick={list.reload}>Làm mới danh sách</button></div><div className="mca-panel-heading"><h2>{list.filters.statuses.length ? statusNames[list.filters.statuses[0]] : 'Tất cả hồ sơ'}</h2><span>{list.loading ? 'Đang tải...' : `${list.total} hồ sơ`}</span></div>
      <Feedback loading={list.loading} error={list.error} onRetry={list.reload} />{!list.loading && !list.error && <><div className="mca-creature-grid" id="adminCreatureList">{list.creatures.map(creature => <CreatureCard key={creature.id} creature={creature} review />)}</div>{!list.creatures.length && <Empty message="Không có hồ sơ trong danh sách này." />}<Pagination page={list.page} total={list.total} onPage={list.setPage} /></>}
    </section></main>;
}

