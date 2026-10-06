import { speciesNames, threatLevels } from './model';
import { emptyDimensions, modernThreats, newRarityNames, unitNames, validateDimensions, type Dimensions } from './traits';

export type DraftAbility = { name: string; description: string };
export type CreatureDraft = {
  name: string; species: string; universe: string; galaxy: string; planet: string; world: string;
  originPlanetId?: string;
  originIds?: string[];
  traitsVersion?: 1; speciesTermId?: string; elementTermIds?: string[]; dimensions?: Dimensions;
  age: string; size: string; element: string; rarity: string; powerSource: string; threatLevel: string;
  description: string; appearance: string; weaknesses: string; limitations: string; strongestAbilityCondition: string;
  abilities: DraftAbility[];
};
export type DraftTextField = Exclude<keyof CreatureDraft, 'abilities' | 'originPlanetId' | 'originIds' | 'traitsVersion' | 'speciesTermId' | 'elementTermIds' | 'dimensions'>;
export const emptyDraft = (): CreatureDraft => ({ name: '', species: '', universe: '', galaxy: '', planet: '', world: '', age: '', size: '', element: '', rarity: '', powerSource: '', threatLevel: '', description: '', appearance: '', weaknesses: '', limitations: '', strongestAbilityCondition: '', abilities: [{ name: '', description: '' }] });
export const fieldLimits: Record<DraftTextField, number> = { name: 100, species: 50, universe: 100, galaxy: 100, planet: 100, world: 150, age: 50, size: 100, element: 50, rarity: 50, powerSource: 150, threatLevel: 10, description: 3000, appearance: 2000, weaknesses: 2000, limitations: 2000, strongestAbilityCondition: 1500 };

export function restoreDraft(value: unknown): CreatureDraft {
  const result = emptyDraft();
  if (!value || typeof value !== 'object') throw new Error('Bản nháp không hợp lệ.');
  const saved = value as Record<string, unknown>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(saved.traitsVersion===1)result.traitsVersion=1;
  if(typeof saved.speciesTermId==='string'&&uuid.test(saved.speciesTermId))result.speciesTermId=saved.speciesTermId;
  if(Array.isArray(saved.elementTermIds))result.elementTermIds=[...new Set(saved.elementTermIds.filter((id):id is string=>typeof id==='string'&&uuid.test(id)))].slice(0,20);
  if(saved.dimensions&&typeof saved.dimensions==='object'){
    result.dimensions=emptyDimensions();for(const key of ['height','length','width'] as const){const d=(saved.dimensions as Dimensions)[key];if(d&&typeof d.value==='string')result.dimensions[key]={value:d.value.slice(0,43),unit:Object.hasOwn(unitNames,d.unit)?d.unit:'m'};}
  }
  if (typeof saved.originPlanetId === 'string' && uuid.test(saved.originPlanetId)) result.originPlanetId = saved.originPlanetId;
  if (Array.isArray(saved.originIds)) result.originIds = saved.originIds.slice(0,5).map(id => typeof id === 'string' && uuid.test(id) ? id : '');
  for (const [key, limit] of Object.entries(fieldLimits)) {
    if (typeof saved[key] === 'string') result[key as DraftTextField] = saved[key].slice(0, limit);
  }
  if (Array.isArray(saved.abilities) && saved.abilities.length) result.abilities = saved.abilities.slice(0, 5).map(value => ({ name: typeof value?.name === 'string' ? value.name.slice(0, 100) : '', description: typeof value?.description === 'string' ? value.description.slice(0, 1000) : '' }));
  return result;
}

export function validateDraft(draft: CreatureDraft) {
  if (!draft.name.trim()) return 'Vui lòng nhập tên sinh vật.';
  if (draft.traitsVersion===1?!draft.speciesTermId:!(draft.species in speciesNames)) return 'Vui lòng chọn loài sinh vật.';
  if (!draft.universe.trim()) return 'Vui lòng nhập vũ trụ.';
  if (!draft.planet.trim()) return 'Vui lòng nhập hành tinh.';
  if (!(draft.traitsVersion===1?modernThreats:threatLevels as readonly string[]).includes(draft.threatLevel)) return 'Vui lòng chọn cấp độ đe dọa.';
  if(draft.traitsVersion===1){
    if(draft.rarity&&!Object.hasOwn(newRarityNames,draft.rarity))return 'Hãy chọn độ hiếm trong bảy cấp mới.';
    if(!Array.isArray(draft.elementTermIds)||draft.elementTermIds.length>20||new Set(draft.elementTermIds).size!==draft.elementTermIds.length)return 'Hãy chọn tối đa 20 nguyên tố khác nhau.';
    const error=validateDimensions(draft.dimensions as Dimensions);if(error)return error;
  }
  for (const [key, limit] of Object.entries(fieldLimits)) if (draft[key as DraftTextField].length > limit) return 'Một trường dữ liệu vượt quá độ dài cho phép.';
  if (draft.description.trim().length < 30) return 'Mô tả sinh vật phải có ít nhất 30 ký tự.';
  if (!draft.weaknesses.trim()) return 'Sinh vật phải có ít nhất một điểm yếu.';
  if (!draft.abilities.length || draft.abilities.length > 5) return 'Hồ sơ cần từ 1 đến 5 kỹ năng.';
  if (draft.abilities.some(ability => !ability.name.trim())) return 'Hãy nhập tên cho mỗi kỹ năng hoặc xóa kỹ năng trống.';
  if (draft.abilities.some(ability => ability.name.length > 100 || ability.description.length > 1000)) return 'Tên hoặc mô tả kỹ năng vượt quá độ dài cho phép.';
  return '';
}

export function validateImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  if (file.size > 5 * 1024 * 1024) return 'Ảnh không được vượt quá 5MB.';
  return '';
}

