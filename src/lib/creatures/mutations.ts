import type { SupabaseClient } from '@supabase/supabase-js';
import { type Creature, type RecordId } from './model';
import { validateDraft, validateImage, type CreatureDraft } from './draft';
import { phase3Enabled } from '@/lib/supabase/features';

export class SubmissionError extends Error {
  constructor(message: string, public unresolvedId?: RecordId, public uncertain = false) { super(message); }
}

/** Uses existing tables only. Database atomicity is deferred until its schema/RPC is audited. */
export async function submitCreature(client: SupabaseClient, draft: CreatureDraft, image: File | null, owner: string) {
  const validation = validateDraft(draft) || (image ? validateImage(image) : '');
  if (validation) throw new SubmissionError(validation);
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || user?.id !== owner) throw new SubmissionError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại trước khi gửi hồ sơ.');
  let imagePath: string | null = null;
  let created: Creature | null = null;
  let insertAttempted = false;
  let insertUncertain = false;
  const warnings: string[] = [];
  try {
    let imageUrl: string | null = null;
    if (image) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[image.type];
      imagePath = `${owner}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from('creature-images').upload(imagePath, image, { upsert: false, contentType: image.type, cacheControl: '3600' });
      if (error) throw new SubmissionError('Không tải được ảnh. Hãy kiểm tra quyền tải ảnh và thử lại.');
      imageUrl = client.storage.from('creature-images').getPublicUrl(imagePath).data.publicUrl;
    }
    const optional = (value: string) => value.trim() || null;
    insertAttempted = true;
    const { data, error, status } = await client.from('creatures').insert({
      creator_id: owner, name: draft.name.trim(), species: draft.species, universe: draft.universe.trim(), planet: draft.planet.trim(),
      galaxy: optional(draft.galaxy), world: optional(draft.world), age: optional(draft.age), size: optional(draft.size),
      element: optional(draft.element), rarity: optional(draft.rarity), power_source: optional(draft.powerSource),
      proposed_threat_level: draft.threatLevel, verified_threat_level: null, description: draft.description.trim(),
      appearance: optional(draft.appearance), weaknesses: draft.weaknesses.trim(), limitations: optional(draft.limitations),
      strongest_ability_condition: optional(draft.strongestAbilityCondition), image_url: imageUrl, status: 'pending',
    }).select().single();
    if (error || !data) {
      // A network failure or failed SELECT after INSERT does not prove the write failed.
      insertUncertain = status === 0 || status >= 500 || error?.code === 'PGRST116';
      throw new SubmissionError('Không thể xác nhận việc tạo hồ sơ.', undefined, insertUncertain);
    }
    created = data as Creature;
    const { error: abilityError } = await client.from('creature_abilities').insert(draft.abilities.map(ability => ({ creature_id: created!.id, ability_name: ability.name.trim(), ability_description: optional(ability.description) })));
    if (abilityError) throw new SubmissionError('Không lưu được kỹ năng.');
    if (!created.creature_code && /^\d+$/.test(String(created.id))) {
      const code = `VX-${String(created.id).padStart(4, '0')}`;
      try {
        const { data: updated, error: codeError } = await client.from('creatures').update({ creature_code: code, updated_at: new Date().toISOString() }).eq('id', created.id).eq('creator_id', owner).select('creature_code').single();
        if (!codeError && updated?.creature_code) created.creature_code = updated.creature_code;
        else warnings.push('Hồ sơ đã lưu; mã hồ sơ chưa được cập nhật. Bạn vẫn có thể mở bằng liên kết bên dưới.');
      } catch { warnings.push('Hồ sơ đã lưu; mã hồ sơ chưa được cập nhật. Bạn vẫn có thể mở bằng liên kết bên dưới.'); }
    }
    return { creature: created, warnings };
  } catch (cause) {
    let unresolvedId: RecordId | undefined;
    if (created) {
      // Compensate only a known row belonging to this user; confirm the deletion actually happened.
      try {
        const { data, error } = await client.from('creatures').delete().eq('id', created.id).eq('creator_id', owner).select('id');
        if (error || !data?.length) unresolvedId = created.id;
      } catch { unresolvedId = created.id; }
    }
    if (imagePath && !unresolvedId && !insertUncertain) {
      try {
        const { error } = await client.storage.from('creature-images').remove([imagePath]);
        if (error) warnings.push('Ảnh đã tải chưa được dọn; hãy liên hệ quản trị viên trước khi gửi lại.');
      } catch { warnings.push('Ảnh đã tải chưa được dọn; hãy liên hệ quản trị viên trước khi gửi lại.'); }
    }
    const uncertain = insertUncertain || (insertAttempted && !created && !(cause instanceof SubmissionError));
    const message = unresolvedId ? 'Một phần hồ sơ đã lưu nhưng không thể hoàn tác. Hãy mở hồ sơ bên dưới và liên hệ quản trị viên trước khi gửi lại.'
      : uncertain ? 'Chưa xác định được hồ sơ đã lưu hay chưa. Hãy kiểm tra hồ sơ của bạn trước khi gửi lại để tránh tạo trùng.'
      : `${cause instanceof Error ? cause.message : 'Không thể gửi hồ sơ.'} ${warnings.join(' ')}`.trim();
    throw new SubmissionError(message, unresolvedId, uncertain);
  }
}

export async function reviewCreature(client: SupabaseClient, id: RecordId, status: string, threat: string | null) {
  const { error } = await client.rpc(phase3Enabled ? 'mca_review_creature' : 'admin_review_creature', { p_creature_id: phase3Enabled ? String(id) : id, p_status: status, p_verified_threat_level: status === 'verified' ? threat : null });
  if (error) {
    if (error.message.includes('ADMIN_REQUIRED')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    if (error.message.includes('CREATURE_NOT_FOUND')) throw new Error('Hồ sơ không còn tồn tại.');
    throw new Error('Không thể duyệt hồ sơ. Hãy kiểm tra quyền quản trị và thử lại.');
  }
}
