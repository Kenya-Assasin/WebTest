import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGE_SIZE, statusNames, threatLevels, type Ability, type Creature, type RecordId } from './model';

export type Filters = { search: string; statuses: string[]; threats: string[]; species: string; element: string; origin: string; sort: 'newest' | 'oldest' | 'name' };
export const defaultFilters: Filters = { search: '', statuses: [], threats: [], species: '', element: '', origin: '', sort: 'newest' };

export async function listCreatures(client: SupabaseClient, filters: Filters, page: number, signal: AbortSignal, owner?: string) {
  let query = client.from('creatures').select('*', { count: 'exact' });
  if (owner) query = query.eq('creator_id', owner);
  const search = filters.search.trim().replace(/[,()%_\\.:"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (search) query = query.or(`name.ilike.%${search}%,creature_code.ilike.%${search}%`);
  const statuses = filters.statuses.filter(value => value in statusNames);
  if (statuses.length) query = query.in('status', statuses);
  const threats = filters.threats.filter(value => (threatLevels as readonly string[]).includes(value));
  if (threats.length) query = query.or(`verified_threat_level.in.(${threats.join(',')}),and(verified_threat_level.is.null,proposed_threat_level.in.(${threats.join(',')}))`);
  if (filters.species) query = query.eq('species', filters.species);
  if (filters.element) query = query.eq('element', filters.element);
  if (filters.origin.trim()) query = query.ilike('galaxy', `%${filters.origin.trim().replace(/[%_]/g, '')}%`);
  query = query.order(filters.sort === 'name' ? 'name' : 'created_at', { ascending: filters.sort !== 'newest' }).order('id', { ascending: true });
  const start = Math.max(0, page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(start, start + PAGE_SIZE - 1).abortSignal(signal);
  if (error) throw new Error('Không thể tải dữ liệu sinh vật. Hãy kiểm tra kết nối và thử lại.');
  return { creatures: (data || []) as Creature[], total: count ?? data?.length ?? 0 };
}

export async function getCreature(client: SupabaseClient, id: RecordId, signal: AbortSignal) {
  const { data, error } = await client.from('creatures').select('*').eq('id', id).abortSignal(signal).single();
  if (error || !data) throw new Error('Không tìm thấy hồ sơ sinh vật hoặc bạn chưa có quyền xem hồ sơ này.');
  return data as Creature;
}

export async function getAbilities(client: SupabaseClient, id: RecordId, signal: AbortSignal) {
  const { data, error } = await client.from('creature_abilities').select('*').eq('creature_id', id).order('id', { ascending: true }).abortSignal(signal);
  if (error) throw new Error('Không tải được kỹ năng. Hãy thử lại.');
  return (data || []) as Ability[];
}

export async function getStatistics(client: SupabaseClient, signal: AbortSignal, owner?: string) {
  const entries = await Promise.all(['all', ...Object.keys(statusNames)].map(async status => {
    let query = client.from('creatures').select('id', { count: 'exact', head: true });
    if (owner) query = query.eq('creator_id', owner);
    if (status !== 'all') query = query.eq('status', status);
    const { count, error } = await query.abortSignal(signal);
    if (error) throw new Error('Không tải được thống kê.');
    return [status, count ?? 0] as const;
  }));
  return Object.fromEntries(entries) as Record<string, number>;
}

