import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TableRow } from '@/lib/supabase/database.types';

export const originLevels = [
  { kind: 'universe', label: 'Vũ trụ' }, { kind: 'galaxy', label: 'Thiên hà' },
  { kind: 'nebula', label: 'Tinh vân' }, { kind: 'star_system', label: 'Hệ sao' },
  { kind: 'planet', label: 'Hành tinh' },
] as const;
export type OriginKind = typeof originLevels[number]['kind'];
export type Origin = Pick<TableRow<'origin_locations'>, 'id' | 'kind' | 'name' | 'parent_id' | 'status' | 'review_note'>;
export const originColumns = 'id,kind,name,parent_id,status,review_note';

export async function listOrigins(client: SupabaseClient<Database>, kind: OriginKind, parent: string | null, signal: AbortSignal) {
  const nodes: Origin[] = [];
  for (let start=0;;start+=500) {
    let query=client.from('origin_locations').select(originColumns).eq('kind',kind).order('name').order('id');
    query=parent?query.eq('parent_id',parent):query.is('parent_id',null);
    const {data,error}=await query.range(start,start+499).abortSignal(signal);
    if(error) throw new Error('Không tải được danh sách địa danh. Hãy thử lại.');
    nodes.push(...(data||[])); if(!data || data.length<500) return nodes;
  }
}

export async function addOrigin(client: SupabaseClient<Database>, kind: OriginKind, name: string, parent: string|null) {
  const {data,error}=await client.rpc('mca_add_origin',{p_kind:kind,p_name:name.trim(),p_parent_id:parent});
  if(error) {
    const messages: Record<string,string>={
      AUTH_REQUIRED:'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
      ORIGIN_NAME_INVALID:'Tên địa danh cần từ 1 đến 100 ký tự.',
      ORIGIN_PARENT_INVALID:'Địa danh cấp trên không còn hợp lệ. Hãy chọn lại.',
      ORIGIN_LIMIT_REACHED:'Bạn đã thêm nhiều địa danh hôm nay. Hãy thử lại ngày mai.',
      ORIGIN_NAME_RESERVED:'Địa danh này đang được người khác đề xuất. Hãy chờ admin duyệt.',
      ORIGIN_REJECTED:'Địa danh này đã bị từ chối. Hãy kiểm tra tên hoặc chọn địa danh khác.',
    };
    throw new Error(Object.entries(messages).find(([code])=>error.message.includes(code))?.[1]||'Chưa xác nhận được địa danh đã thêm. Bạn có thể thử lại cùng tên.');
  }
  if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.id!=='string') throw new Error('Chưa xác nhận được địa danh đã thêm. Hãy thử lại cùng tên.');
  return data as Origin;
}
