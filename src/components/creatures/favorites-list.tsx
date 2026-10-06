'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PAGE_SIZE, type Creature } from '@/lib/creatures/model';
import { useFavorites } from './favorites-provider';
import { CreatureCard, Empty, Feedback, Pagination } from './shared';

export function FavoritesList({ owner }: { owner: string }) {
  const favorites = useFavorites();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ creatures: [] as Creature[], total: 0, loading: true, error: '' });
  useEffect(() => {
    if (!favorites.enabled || !favorites.ready || favorites.owner !== owner) return;
    const abort = new AbortController();
    setState(old => ({ ...old, loading: true, error: '' }));
    Promise.resolve().then(async () => {
      const start = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await createClient().from('creature_favorites').select('creature:creatures!inner(*)', { count: 'exact' }).eq('user_id', owner).order('created_at', { ascending: false }).order('creature_id').range(start, start + PAGE_SIZE - 1).abortSignal(abort.signal);
      if (error) throw new Error('Không tải được các hồ sơ yêu thích.');
      if (abort.signal.aborted) return;
      const total = count ?? 0;
      if (page > 1 && start >= total) { setPage(Math.max(1, Math.ceil(total / PAGE_SIZE))); return; }
      setState({ creatures: (data || []).map(row => row.creature as unknown as Creature), total, loading: false, error: '' });
    }).catch(error => { if (!abort.signal.aborted) setState(old => ({ ...old, loading: false, error: error.message })); });
    return () => abort.abort();
  }, [owner, page, retry, favorites.enabled, favorites.ready, favorites.owner, favorites.revision]);
  if (!favorites.enabled) return null;
  return <section className="mca-panel" id="favoriteRecords"><div className="mca-panel-heading"><h2>Hồ sơ yêu thích</h2><span>{state.loading ? 'Đang tải...' : `${state.total} hồ sơ`}</span></div>
    {favorites.error ? <Feedback loading={false} error={favorites.error} onRetry={favorites.reload} /> : <Feedback loading={state.loading} error={state.error} onRetry={() => setRetry(value => value + 1)} />}
    {!state.loading && !state.error && favorites.owner === owner && <><div className="mca-creature-grid">{state.creatures.map(creature => <CreatureCard key={creature.id} creature={creature} />)}</div>{!state.total && <Empty message="Bạn chưa yêu thích hồ sơ nào. Chọn biểu tượng trái tim trong kho dữ liệu để lưu vào tài khoản." />}<Pagination page={page} total={state.total} onPage={setPage} /></>}
  </section>;
}
