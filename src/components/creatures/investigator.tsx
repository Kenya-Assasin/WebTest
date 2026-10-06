'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/auth/session';
import { statusNames } from '@/lib/creatures/model';
import { useCreatureList } from './use-creatures';
import { useStatistics } from './use-statistics';
import { CreatureCard, CreatureImage, Empty, Feedback, Pagination } from './shared';
import { FavoritesList } from './favorites-list';

export function Investigator({ owner, profile, fallbackName }: { owner: string; profile: Profile | null; fallbackName: string }) {
  const list = useCreatureList({}, owner);
  const stats = useStatistics(owner);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || fallbackName);
  const [displayName, setDisplayName] = useState(profile?.username || fallbackName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function saveProfile() {
    const name = username.trim();
    if (!name || name.length > 40) { setMessage('Tên điều tra viên cần từ 1 đến 40 ký tự.'); return; }
    setBusy(true); setMessage('');
    try {
      const { data, error } = await createClient().from('profiles').update({ username: name }).eq('id', owner).select('username').single();
      if (error || !data) throw new Error('Không thể cập nhật tên điều tra viên. Hãy kiểm tra quyền sửa hồ sơ và thử lại.');
      setDisplayName(data.username); setUsername(data.username); setEditing(false); setMessage('Đã cập nhật tên điều tra viên.');
      window.dispatchEvent(new Event('mca-profile-updated')); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.'); }
    finally { setBusy(false); }
  }
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setMessage('Đã sao chép liên kết. Đây là trang hồ sơ cá nhân cần đăng nhập.'); }
    catch { setMessage('Không thể sao chép liên kết.'); }
  }
  return <main className="mca-main"><section className="mca-panel mca-profile"><div className="mca-profile-avatar"><CreatureImage url={profile?.avatar_url} name={displayName} /></div><div><span className="mca-eyebrow">MCA INVESTIGATOR</span><h1 id="investigatorUsername">{displayName}</h1><p>{profile?.investigator_level || 'Cấp I'} · Danh tiếng: {profile?.reputation ?? 0}</p><div className="mca-actions"><button onClick={() => setEditing(value => !value)}>Chỉnh sửa tên</button><button onClick={share}>Sao chép liên kết</button><Link href="/tao-ho-so" className="mca-button">+ Tạo hồ sơ</Link></div></div></section>
    {editing && <form className="mca-panel mca-inline-form" onSubmit={event => { event.preventDefault(); if (!busy) void saveProfile(); }}><label htmlFor="profileUsername">Tên điều tra viên<input id="profileUsername" value={username} maxLength={40} onChange={event => setUsername(event.target.value)} disabled={busy} /></label><button type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button><button type="button" disabled={busy} onClick={() => { setUsername(displayName); setEditing(false); }}>Hủy</button></form>}
    {message && <p role="status" className="mca-feedback">{message}</p>}
    <div className="mca-stat-grid mca-profile-stats">{[['all', 'Hồ sơ của tôi'], ['verified', 'Đã xác minh'], ['pending', 'Chờ xác minh'], ['investigation', 'Cần điều tra thêm']].map(([key, name]) => <div key={key}><strong>{stats.data?.[key] ?? '—'}</strong><span>{name}</span></div>)}</div>
    {stats.error && <p className="mca-error" role="alert">{stats.error}</p>}
    <section className="mca-panel"><div className="mca-panel-heading"><h2>Hồ sơ của tôi</h2><span>{list.loading ? 'Đang tải...' : `${list.total} hồ sơ`}</span></div><div className="mca-toolbar"><label className="mca-search"><span className="mca-sr-only">Tìm hồ sơ của tôi</span><input type="search" value={list.filters.search} onChange={event => list.updateFilters({ search: event.target.value })} placeholder="Tìm tên hoặc mã hồ sơ..." /></label><label><span className="mca-sr-only">Trạng thái hồ sơ</span><select id="profileStatusFilter" value={list.filters.statuses[0] || ''} onChange={event => list.updateFilters({ statuses: event.target.value ? [event.target.value] : [] })}><option value="">Tất cả trạng thái</option>{Object.entries(statusNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label></div><Feedback loading={list.loading} error={list.error} onRetry={list.reload} />{!list.loading && !list.error && <><div className="mca-creature-grid">{list.creatures.map(creature => <CreatureCard key={creature.id} creature={creature} />)}</div>{!list.creatures.length && <Empty message="Bạn chưa có hồ sơ phù hợp. Hãy bắt đầu với phát hiện đầu tiên." />}<Pagination page={list.page} total={list.total} onPage={list.setPage} /></>}</section>
    <FavoritesList owner={owner} />
  </main>;
}

