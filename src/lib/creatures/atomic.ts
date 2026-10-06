import type { SupabaseClient } from '@supabase/supabase-js';
import type { Creature } from './model';
import { validateDraft, validateImage, type CreatureDraft } from './draft';
import { SubmissionError } from './mutations';

export type SubmissionAttempt = { requestId: string; draft: CreatureDraft; imagePath: string | null };
export const submissionKey = (owner: string) => `mcaCreatureSubmission:${owner}`;

export function restoreAttempt(value: unknown): SubmissionAttempt {
  const attempt = value as SubmissionAttempt;
  if (!attempt || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attempt.requestId) || !attempt.draft ||
      (attempt.imagePath !== null && typeof attempt.imagePath !== 'string')) throw new Error('Yêu cầu đang chờ không hợp lệ. Hãy kiểm tra hồ sơ của bạn trước khi gửi lại.');
  try { if (validateDraft(attempt.draft)) throw new Error(); }
  catch { throw new Error('Nội dung yêu cầu đang chờ không hợp lệ. Hãy kiểm tra hồ sơ của bạn.'); }
  return attempt;
}

/** Persist the exact request before sending it. Retrying the same UUID is idempotent. */
export async function prepareAttempt(client: SupabaseClient, draft: CreatureDraft, image: File | null, owner: string) {
  const validation = validateDraft(draft) || (image ? validateImage(image) : '');
  if (validation) throw new SubmissionError(validation);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || user?.id !== owner) throw new SubmissionError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const requestId = crypto.randomUUID();
  let imagePath: string | null = null;
  if (image) {
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[image.type];
    imagePath = `${owner}/${requestId}.${extension}`;
    const { error: uploadError } = await client.storage.from('creature-images').upload(imagePath, image, { upsert: false, contentType: image.type, cacheControl: '3600' });
    if (uploadError) throw new SubmissionError('Không tải được ảnh. Hãy kiểm tra kết nối và quyền tải ảnh.');
  }
  const attempt: SubmissionAttempt = { requestId, draft: structuredClone(draft), imagePath };
  try { localStorage.setItem(submissionKey(owner), JSON.stringify(attempt)); }
  catch {
    if (imagePath) await client.storage.from('creature-images').remove([imagePath]);
    throw new SubmissionError('Không lưu được mã yêu cầu trên trình duyệt. Hãy cho phép lưu dữ liệu trước khi gửi hồ sơ.');
  }
  return attempt;
}

export async function submitAtomic(client: SupabaseClient, attempt: SubmissionAttempt, owner: string) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || user?.id !== owner) throw new SubmissionError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để kiểm tra yêu cầu này.', undefined, true);
  let result;
  try {
    result = await client.rpc('mca_submit_creature', { p_request_id: attempt.requestId, p_draft: attempt.draft, p_image_path: attempt.imagePath });
  } catch { throw new SubmissionError('Kết nối bị gián đoạn. Hãy kiểm tra lại cùng yêu cầu này; hệ thống sẽ không tạo hồ sơ trùng.', undefined, true); }
  const { data, error, status } = result;
  if (error || !data?.id) {
    // Only our explicit validation failures prove the request did not commit.
    const knownFailure = error?.code === '22023' && /DRAFT_INVALID|IMAGE_INVALID|REQUEST_CONFLICT/.test(error.message);
    if (!knownFailure) throw new SubmissionError(error?.code === 'PGRST202'
      ? 'Chức năng gửi hồ sơ chưa sẵn sàng. Yêu cầu đã được giữ lại để kiểm tra sau khi cập nhật.'
      : `Chưa xác nhận được kết quả${status === 0 ? ' vì mất kết nối' : ''}. Hãy kiểm tra lại cùng yêu cầu này để tránh tạo trùng.`, undefined, true);
    const warnings: string[] = [];
    if (attempt.imagePath && !error.message.includes('REQUEST_CONFLICT')) {
      const { error: cleanupError } = await client.storage.from('creature-images').remove([attempt.imagePath]);
      if (cleanupError) warnings.push('Ảnh đã tải chưa được dọn.');
    }
    // A conflict may refer to a successful request. Keep the original request intact.
    if (error.message.includes('REQUEST_CONFLICT')) throw new SubmissionError('Mã yêu cầu đã được dùng với nội dung khác. Hãy kiểm tra hồ sơ của bạn.', undefined, true);
    try { localStorage.removeItem(submissionKey(owner)); } catch { /* Safe to retry the failed request. */ }
    throw new SubmissionError(`Dữ liệu hồ sơ hoặc ảnh không hợp lệ. Hãy kiểm tra và gửi lại. ${warnings.join(' ')}`.trim());
  }
  try { localStorage.removeItem(submissionKey(owner)); } catch { /* A completed UUID still resolves to the same record. */ }
  return { creature: data as Creature, warnings: [] as string[] };
}
