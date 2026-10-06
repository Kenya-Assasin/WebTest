'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { elementNames, label, speciesNames, statusNames, threatLevels } from '@/lib/creatures/model';
import { type Filters } from '@/lib/creatures/queries';
import { useCreatureList } from './use-creatures';
import { useStatistics } from './use-statistics';
import { CreatureCard, Empty, Feedback, Pagination } from './shared';

export function Explorer({ home = false, initialSearch = '' }: { home?: boolean; initialSearch?: string }) {
  const list = useCreatureList({ search: initialSearch });
  const statistics = useStatistics();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  useEffect(() => { try { if (localStorage.getItem('mcaArchiveView') === 'list') setView('list'); } catch { /* Storage can be disabled. */ } }, []);
  function changeView(value: 'grid' | 'list') { setView(value); try { localStorage.setItem('mcaArchiveView', value); } catch { /* The current view still works. */ } }
  function toggle(field: 'statuses' | 'threats', value: string) {
    list.updateFilters({ [field]: list.filters[field].includes(value) ? list.filters[field].filter(item => item !== value) : [...list.filters[field], value] });
  }
  const active = Boolean(list.filters.search || list.filters.statuses.length || list.filters.threats.length || list.filters.species || list.filters.element || list.filters.origin);

  return <main className="mca-main">
    <section className={`mca-hero ${home ? 'mca-home-hero' : ''}`}>
      <div><span className="mca-eyebrow">MULTIVERSE CREATURE ARCHIVE</span><h1>{home ? <>KHÁM PHÁ<br /><em>SINH VẬT ĐA VŨ TRỤ</em></> : 'KHO DỮ LIỆU SINH VẬT'}</h1><p>Khám phá những hồ sơ được các điều tra viên ghi nhận, nghiên cứu và xác minh trên khắp đa vũ trụ.</p>
        {home && <div className="mca-actions"><Link className="mca-button" href="/kho-du-lieu">Khám phá kho dữ liệu →</Link><Link className="mca-button secondary" href="/tao-ho-so">+ Tạo hồ sơ sinh vật</Link></div>}
      </div>
      <div className="mca-stat-grid"><div><strong>{statistics.data?.all ?? '—'}</strong><span>Hồ sơ có thể xem</span></div><div><strong>{statistics.data?.verified ?? '—'}</strong><span>Đã xác minh</span></div><div><strong>{statistics.data?.pending ?? '—'}</strong><span>Chờ xác minh</span></div></div>
      {statistics.error && <p className="mca-muted">{statistics.error}</p>}
    </section>
    <div className="mca-workspace">
      <aside className="mca-panel mca-filters">
        <div className="mca-panel-heading"><h2>Bộ lọc</h2><button type="button" className="mca-text-button" onClick={list.resetFilters}>Xóa bộ lọc</button></div>
        <fieldset><legend>Trạng thái</legend>{Object.entries(statusNames).map(([value, name]) => <label key={value} className="mca-check"><input type="checkbox" checked={list.filters.statuses.includes(value)} onChange={() => toggle('statuses', value)} />{name}</label>)}</fieldset>
        <fieldset><legend>Cấp đe dọa</legend><div className="mca-threat-options">{threatLevels.map(value => <button key={value} className={list.filters.threats.includes(value) ? 'active' : ''} type="button" aria-pressed={list.filters.threats.includes(value)} onClick={() => toggle('threats', value)}>{value}</button>)}</div></fieldset>
        <label>Loài<select id="archiveSpecies" value={list.filters.species} onChange={event => list.updateFilters({ species: event.target.value })}><option value="">Mọi loài</option>{Object.entries(speciesNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>Nguyên tố<select id="archiveElement" value={list.filters.element} onChange={event => list.updateFilters({ element: event.target.value })}><option value="">Mọi nguyên tố</option>{Object.entries(elementNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>Thiên hà<input id="archiveOrigin" value={list.filters.origin} onChange={event => list.updateFilters({ origin: event.target.value })} placeholder="Tìm thiên hà..." /></label>
      </aside>
      <section className="mca-results" aria-label="Hồ sơ sinh vật">
        <div className="mca-toolbar"><label className="mca-search"><span className="mca-sr-only">Tìm tên sinh vật hoặc mã hồ sơ</span><input type="search" id={home ? 'homeSearchInput' : 'archiveSearchInput'} value={list.filters.search} onChange={event => list.updateFilters({ search: event.target.value })} placeholder="Tìm tên sinh vật hoặc mã hồ sơ..." /></label>
          <label><span className="mca-sr-only">Sắp xếp</span><select id="archiveSort" value={list.filters.sort} onChange={event => list.updateFilters({ sort: event.target.value as Filters['sort'] })}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="name">Tên A–Z</option></select></label>
          <div className="mca-view"><button aria-label="Dạng lưới" aria-pressed={view === 'grid'} onClick={() => changeView('grid')}>▦</button><button aria-label="Dạng danh sách" aria-pressed={view === 'list'} onClick={() => changeView('list')}>☰</button></div>
        </div>
        <div className="mca-results-heading"><h2>{home ? 'Hồ sơ mới nhất' : 'Kết quả tìm kiếm'}</h2><span id="archiveResultCount">{list.loading ? 'Đang tải...' : `${list.total} hồ sơ`}</span></div>
        {active && <div className="mca-filter-tags"><span>{list.filters.search && `Tìm kiếm: ${list.filters.search}`}</span>{list.filters.statuses.map(value => <button key={value} onClick={() => toggle('statuses', value)}>{label(statusNames, value)} ×</button>)}{list.filters.threats.map(value => <button key={value} onClick={() => toggle('threats', value)}>Cấp {value} ×</button>)}<button onClick={list.resetFilters}>Xóa tất cả ×</button></div>}
        <Feedback loading={list.loading} error={list.error} onRetry={list.reload} />
        {!list.loading && !list.error && <><div id="archiveCreatureGrid" className={`mca-creature-grid ${view === 'list' ? 'mca-list-view' : ''}`}>{list.creatures.map(creature => <CreatureCard key={creature.id} creature={creature} />)}</div>{!list.creatures.length && <Empty />}<Pagination page={list.page} total={list.total} onPage={list.setPage} /></>}
      </section>
    </div>
  </main>;
}

