import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeReturnPath } from './redirect';

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  investigator_level: string | null;
  reputation: number | null;
};

export async function getAccount() {
  if (!isSupabaseConfigured()) return { user: null, profile: null };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, profile: null };
  const { data: profile } = await supabase.from('profiles')
    .select('id, username, avatar_url, role, investigator_level, reputation')
    .eq('id', user.id).maybeSingle();
  return { user, profile: profile as Profile | null };
}

export async function requireAccount(path: string, admin = false) {
  const account = await getAccount();
  if (!account.user) redirect(`/dang-nhap?next=${encodeURIComponent(safeReturnPath(path))}`);
  return { ...account, denied: admin && account.profile?.role !== 'admin' };
}

