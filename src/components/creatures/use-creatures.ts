'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { defaultFilters, listCreatures, type Filters } from '@/lib/creatures/queries';
import type { Creature } from '@/lib/creatures/model';

export function useCreatureList(initial: Partial<Filters> = {}, owner?: string) {
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, ...initial });
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ creatures: [] as Creature[], total: 0, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState(old => ({ ...old, loading: true, error: '' }));
    const timer = setTimeout(() => {
      Promise.resolve().then(() => listCreatures(createClient(), filters, page, controller.signal, owner))
        .then(result => {
          if (controller.signal.aborted) return;
          if (page > 1 && !result.creatures.length && result.total > 0) { setPage(1); return; }
          setState({ ...result, loading: false, error: '' });
        }).catch(error => {
          if (!controller.signal.aborted) setState({ creatures: [], total: 0, loading: false, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.' });
        });
    }, filters.search || filters.origin ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, owner, retry]);
  return {
    ...state, filters, page, setPage,
    updateFilters(patch: Partial<Filters>) { setPage(1); setFilters(old => ({ ...old, ...patch })); },
    resetFilters() { setPage(1); setFilters({ ...defaultFilters, ...initial }); },
    reload() { setRetry(value => value + 1); },
  };
}

