import type { TableRow } from '@/lib/supabase/database.types';
import { traitsEnabled } from '@/lib/supabase/features';
import { dimensionsLabel, newRarityNames, threatName } from './traits';

export type RecordId = number | string;
export type Creature = TableRow<'creatures'>;
export type Ability = TableRow<'creature_abilities'>;
export const speciesNames: Record<string, string> = { dragon: 'Rồng', beast: 'Thú', entity: 'Thực thể', insect: 'Côn trùng', mythical: 'Sinh vật thần thoại', humanoid: 'Dạng người', machine: 'Sinh vật cơ giới', plant: 'Thực vật', unknown: 'Chưa xác định' };
export const elementNames: Record<string, string> = { fire: 'Lửa', ice: 'Băng', water: 'Nước', earth: 'Đất', wind: 'Gió', light: 'Ánh sáng', dark: 'Bóng tối', void: 'Hư không', space: 'Không gian', crystal: 'Tinh thể', electric: 'Điện', multi: 'Đa thuộc tính', unknown: 'Chưa xác định' };
export const rarityNames: Record<string, string> = { common: 'Phổ biến', uncommon: 'Không phổ biến', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại', unique: 'Độc nhất', unknown: 'Chưa xác định' };
export const statusNames: Record<string, string> = { pending: 'Chờ xác minh', verified: 'Đã xác minh', investigation: 'Cần điều tra thêm', conflicting: 'Thông tin mâu thuẫn', canon: 'Chính sử' };
export const threatLevels = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'X'] as const;
export const PAGE_SIZE = 12;
export const creatureCode = (creature: Creature) => creature.creature_code || `MCA-${creature.id}`;
export const creatureThreatLabel=(creature:Creature,value:string)=>traitsEnabled||creature.traits_version===1?threatName(value):value;
export const threatLevel = (creature: Creature) => creatureThreatLabel(creature,creature.verified_threat_level || creature.proposed_threat_level || '?');
export const creatureSpecies=(creature:Creature)=>creature.species_name||label(speciesNames,creature.species);
export const creatureElements=(creature:Creature)=>creature.element_names?.join(' · ')||label(elementNames,creature.element);
export const creatureSize=(creature:Creature)=>dimensionsLabel(creature.dimensions)||creature.size;
export const creatureRarity=(creature:Creature)=>creature.rarity?newRarityNames[({common:'normal',uncommon:'special',legendary:'legend'} as Record<string,string>)[creature.rarity]||creature.rarity]||label(rarityNames,creature.rarity):'Chưa xác định';
export const detailPath = (id: RecordId, review = false) => `/${review ? 'admin-chi-tiet' : 'chi-tiet-sinh-vat'}?id=${encodeURIComponent(id)}`;
export function label(names: Record<string, string>, value: string | null | undefined) { return value ? names[value] || value : 'Chưa xác định'; }
export function formatDate(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}
export function safeImageUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    if (/^\/storage\/v1\/object\/public\/creature-images\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/.test(value)) value = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${value}`;
    const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

