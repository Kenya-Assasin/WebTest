'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStatistics } from '@/lib/creatures/queries';

export function useStatistics(owner?: string) {
  const [state, setState] = useState({ data: null as Record<string, number> | null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => getStatistics(createClient(), controller.signal, owner)).then(data => {
      if (!controller.signal.aborted) setState({ data, error: '' });
    }).catch(() => { if (!controller.signal.aborted) setState({ data: null, error: 'Không tải được thống kê.' }); });
    return () => controller.abort();
  }, [owner]);
  return state;
}

