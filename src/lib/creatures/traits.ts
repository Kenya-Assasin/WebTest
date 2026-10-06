import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TableRow } from '@/lib/supabase/database.types';
export type TermKind='species'|'element';
export type Term=Pick<TableRow<'creature_terms'>,'id'|'kind'|'code'|'name'|'status'|'review_note'>;
export const termColumns='id,kind,code,name,status,review_note';
export const newRarityNames:Record<string,string>={normal:'Phổ Thông / Normal',special:'Dị Biệt / Special',rare:'Hiếm / Rare',unique:'Độc Nhất / Unique',legend:'Huyền Thoại / Legend',god:'Thần Tính / God',genesis:'Sáng Thế / Genesis'};
export const planetaryThreats=['F','E','D','C','B','A','S'] as const;
export const cosmicThreatNames:Record<string,string>={S:'(1) Phá Tinh',T2:'(2) Trầm Hệ',T3:'(3) Vẫn Hà',T4:'(4) Loạn Kỷ',T5:'(5) Tịch Thế',T6:'(6) Hỗn Giới',T7:'(7) Quy Bản'};
export const modernThreats=[...planetaryThreats,'T2','T3','T4','T5','T6','T7'];
export const unitNames:Record<string,string>={nm:'Nanomet (nm)',um:'Micromet (µm)',mm:'Milimet (mm)',cm:'Centimet (cm)',dm:'Decimet (dm)',m:'Mét (m)',dam:'Decamet (dam)',hm:'Hectomet (hm)',km:'Kilomet (km)',Mm:'Megamet (Mm)',Gm:'Gigamet (Gm)',au:'Đơn vị thiên văn (AU)',ly:'Năm ánh sáng (ly)'};
export const dimensionAxes=[{key:'height',name:'Cao'},{key:'length',name:'Dài'},{key:'width',name:'Rộng'}] as const;
export type Dimensions=Record<typeof dimensionAxes[number]['key'],{value:string;unit:string}>;
export const emptyDimensions=():Dimensions=>({height:{value:'',unit:'m'},length:{value:'',unit:'m'},width:{value:'',unit:'m'}});
export function validateDimensions(dimensions:Dimensions){
  for(const axis of dimensionAxes){const d=dimensions?.[axis.key];if(!d||!Object.hasOwn(unitNames,d.unit)||typeof d.value!=='string')return 'Hãy chọn đơn vị đo hợp lệ.';
    if(d.value!==''&&(!/^\d{1,30}(\.\d{1,12})?$/.test(d.value)||!/[1-9]/.test(d.value)))return `${axis.name} cần là số lớn hơn 0, tối đa 30 chữ số và 12 số thập phân.`;
  }return '';
}
export function dimensionsLabel(value:unknown){
  if(!value||typeof value!=='object')return '';
  const dimensions=value as Dimensions;return dimensionAxes.flatMap(axis=>{const d=dimensions[axis.key];return d&&typeof d.value==='string'&&d.value?`${axis.name}: ${d.value} ${d.unit==='um'?'µm':d.unit==='au'?'AU':d.unit==='ly'?'năm ánh sáng':d.unit}`:[];}).join(' · ');
}
export function threatName(value:string){return cosmicThreatNames[value]||(planetaryThreats.includes(value as typeof planetaryThreats[number])?`Trong hành tinh · ${value}`:value);}
export async function listTerms(client:SupabaseClient<Database>,kind:TermKind,signal:AbortSignal){
  const result:Term[]=[];for(let start=0;;start+=500){const {data,error}=await client.from('creature_terms').select(termColumns).eq('kind',kind).order('name').order('id').range(start,start+499).abortSignal(signal);if(error)throw new Error('Không tải được danh mục. Hãy thử lại.');result.push(...data||[]);if(!data||data.length<500)return result;}
}
export async function addTerm(client:SupabaseClient<Database>,kind:TermKind,name:string){
  const {data,error}=await client.rpc('mca_add_term',{p_kind:kind,p_name:name.trim()});
  if(error){const messages:Record<string,string>={AUTH_REQUIRED:'Hãy đăng nhập lại để gửi đề xuất.',TERM_NAME_INVALID:'Tên cần từ 1 đến 100 ký tự.',TERM_LIMIT_REACHED:'Bạn đã đạt giới hạn đề xuất trong 24 giờ.',TERM_REJECTED:'Tên này đã bị admin từ chối. Hãy kiểm tra tên khác.',TERM_NAME_RESERVED:'Tên này đang được người khác đề xuất. Hãy chờ admin duyệt.'};throw new Error(Object.entries(messages).find(([code])=>error.message.includes(code))?.[1]||'Chưa xác nhận được đề xuất. Hãy thử lại cùng tên.');}
  if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.id!=='string')throw new Error('Chưa xác nhận được đề xuất. Hãy thử lại cùng tên.');return data as Term;
}
