import { speciesNames, threatLevels } from './model';

export type DraftAbility = { name: string; description: string };
export type CreatureDraft = {
  name: string; species: string; universe: string; galaxy: string; planet: string; world: string;
  age: string; size: string; element: string; rarity: string; powerSource: string; threatLevel: string;
  description: string; appearance: string; weaknesses: string; limitations: string; strongestAbilityCondition: string;
  abilities: DraftAbility[];
};
export const emptyDraft = (): CreatureDraft => ({ name: '', species: '', universe: '', galaxy: '', planet: '', world: '', age: '', size: '', element: '', rarity: '', powerSource: '', threatLevel: '', description: '', appearance: '', weaknesses: '', limitations: '', strongestAbilityCondition: '', abilities: [{ name: '', description: '' }] });
export const fieldLimits: Record<Exclude<keyof CreatureDraft, 'abilities'>, number> = { name: 100, species: 50, universe: 100, galaxy: 100, planet: 100, world: 150, age: 50, size: 100, element: 50, rarity: 50, powerSource: 150, threatLevel: 10, description: 3000, appearance: 2000, weaknesses: 2000, limitations: 2000, strongestAbilityCondition: 1500 };

export function restoreDraft(value: unknown): CreatureDraft {
  const result = emptyDraft();
  if (!value || typeof value !== 'object') throw new Error('Bản nháp không hợp lệ.');
  const saved = value as Record<string, unknown>;
  for (const [key, limit] of Object.entries(fieldLimits)) {
    if (typeof saved[key] === 'string') result[key as Exclude<keyof CreatureDraft, 'abilities'>] = saved[key].slice(0, limit);
  }
  if (Array.isArray(saved.abilities) && saved.abilities.length) result.abilities = saved.abilities.slice(0, 5).map(value => ({ name: typeof value?.name === 'string' ? value.name.slice(0, 100) : '', description: typeof value?.description === 'string' ? value.description.slice(0, 1000) : '' }));
  return result;
}

export function validateDraft(draft: CreatureDraft) {
  if (!draft.name.trim()) return 'Vui lòng nhập tên sinh vật.';
  if (!(draft.species in speciesNames)) return 'Vui lòng chọn loài sinh vật.';
  if (!draft.universe.trim()) return 'Vui lòng nhập vũ trụ.';
  if (!draft.planet.trim()) return 'Vui lòng nhập hành tinh.';
  if (!(threatLevels as readonly string[]).includes(draft.threatLevel)) return 'Vui lòng chọn cấp độ đe dọa.';
  for (const [key, limit] of Object.entries(fieldLimits)) if (draft[key as Exclude<keyof CreatureDraft, 'abilities'>].length > limit) return 'Một trường dữ liệu vượt quá độ dài cho phép.';
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

