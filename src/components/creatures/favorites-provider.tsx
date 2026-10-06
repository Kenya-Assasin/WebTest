'use client';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { phase3Enabled } from '@/lib/supabase/features';
import type { RecordId } from '@/lib/creatures/model';

type FavoritesState = { owner: string | null; ids: Set<string>; ready: boolean; error: string; busy: Set<string>; revision: number };
type FavoritesContextValue = FavoritesState & { enabled: boolean; toggle: (id: RecordId) => Promise<void>; reload: () => void };
const initial = (): FavoritesState => ({ owner: null, ids: new Set(), ready: false, error: '', busy: new Set(), revision: 0 });
const FavoritesContext = createContext<FavoritesContextValue>({ ...initial(), enabled: false, toggle: async () => {}, reload: () => {} });

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const epoch = useRef(0);
  const activeOwner = useRef<string | null>(null);
  const pending = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!phase3Enabled || !isSupabaseConfigured()) return;
    const version = ++epoch.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (version !== epoch.current) return;
      if (activeOwner.current !== (user?.id || null)) {
        activeOwner.current = user?.id || null; pending.current.clear(); setState(initial());
      }
      if (!user) { setState(old => ({ ...initial(), ready: true, revision: old.revision + 1 })); return; }
      const ids = new Set<string>();
      // Do not silently truncate when the account has more than PostgREST's row limit.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('creature_favorites').select('creature_id').eq('user_id', user.id).order('creature_id').range(offset, offset + 499).abortSignal(abort.signal);
        if (error) throw new Error('Không tải được danh sách yêu thích. Hãy thử lại.');
        for (const row of data || []) ids.add(String(row.creature_id));
        if (!data || data.length < 500) break;
      }
      if (version === epoch.current) setState(old => ({ ...old, owner: user.id, ids, ready: true, error: '', busy: new Set(pending.current), revision: old.revision + 1 }));
    } catch (error) {
      if (version === epoch.current) setState(old => ({ ...old, owner: activeOwner.current, ready: true, error: error instanceof Error ? error.message : 'Không tải được danh sách yêu thích.' }));
    }
  }, []);
  useEffect(() => {
    if (!phase3Enabled || !isSupabaseConfigured()) return;
    const client = createClient();
    void refresh();
    let timer: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (activeOwner.current !== (session?.user.id || null)) {
        epoch.current++; controller.current?.abort(); activeOwner.current = session?.user.id || null;
        pending.current.clear(); setState(initial());
      }
      clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 0);
    });
    const focused = () => { void refresh(); };
    window.addEventListener('focus', focused);
    return () => { epoch.current++; controller.current?.abort(); clearTimeout(timer); subscription.unsubscribe(); window.removeEventListener('focus', focused); };
  }, [refresh]);

  async function toggle(id: RecordId) {
    const key = String(id), owner = state.owner;
    if (!owner || !state.ready || state.error || pending.current.has(key)) return;
    const creatureId = Number(id);
    if (!Number.isSafeInteger(creatureId)) { setState(old => ({ ...old, error: 'Mã hồ sơ không hợp lệ.' })); return; }
    const removing = state.ids.has(key);
    pending.current.add(key); setState(old => ({ ...old, busy: new Set(pending.current), error: '' }));
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (user?.id !== owner || activeOwner.current !== owner) return;
      const { error } = removing
        ? await client.from('creature_favorites').delete().eq('user_id', owner).eq('creature_id', creatureId)
        : await client.from('creature_favorites').upsert({ user_id: owner, creature_id: creatureId }, { onConflict: 'user_id,creature_id', ignoreDuplicates: true });
      if (error) throw new Error('Chưa xác nhận được thay đổi yêu thích. Hãy tải lại danh sách trước khi thử lại.');
      if (activeOwner.current === owner) await refresh();
    } catch (error) {
      if (activeOwner.current === owner) setState(old => ({ ...old, error: error instanceof Error ? error.message : 'Chưa xác nhận được thay đổi yêu thích. Hãy tải lại.' }));
    } finally {
      if (activeOwner.current === owner) { pending.current.delete(key); setState(old => ({ ...old, busy: new Set(pending.current) })); }
    }
  }
  return <FavoritesContext.Provider value={{ ...state, enabled: phase3Enabled, toggle, reload: () => { void refresh(); } }}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
export function FavoriteButton({ id, name }: { id: RecordId; name: string }) {
  const favorites = useFavorites();
  const path = usePathname();
  if (!favorites.enabled) return null;
  if (favorites.ready && !favorites.owner) return <Link className="mca-favorite-login" href={`/dang-nhap?next=${encodeURIComponent(path + (path === '/chi-tiet-sinh-vat' ? `?id=${encodeURIComponent(id)}` : ''))}`}>♡ Đăng nhập để yêu thích</Link>;
  const selected = favorites.ids.has(String(id));
  return <div className="mca-favorite-control"><button type="button" className="mca-favorite-button" aria-label={`${selected ? 'Bỏ yêu thích' : 'Yêu thích'} ${name}`} aria-pressed={selected} disabled={!favorites.ready || favorites.busy.has(String(id)) || Boolean(favorites.error)} onClick={() => { void favorites.toggle(id); }}>{favorites.busy.has(String(id)) ? 'Đang lưu...' : selected ? '♥ Đã yêu thích' : '♡ Yêu thích'}</button>{favorites.error && <span className="mca-error" role="alert">{favorites.error} <button type="button" onClick={favorites.reload}>Tải lại yêu thích</button></span>}</div>;
}
