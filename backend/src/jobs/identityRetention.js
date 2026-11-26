import { supabaseAdmin } from '../config/supabase.js';
import { IDENTITY_BUCKET } from '../lib/identityVerification.js';

export const runIdentityImageRetention = async (now = new Date()) => {
  const { data: expired, error } = await supabaseAdmin.from('identity_verifications')
    .select('id, status, id_image_path, selfie_image_path')
    .lte('expires_at', now.toISOString())
    .is('images_deleted_at', null)
    .order('expires_at')
    .limit(100);
  if (error) throw error;

  for (const record of expired || []) {
    const paths = [record.id_image_path, record.selfie_image_path].filter(Boolean);
    if (paths.length) {
      const { error: removalError } = await supabaseAdmin.storage.from(IDENTITY_BUCKET).remove(paths);
      if (removalError) throw removalError;
    }

    const imagesDeletedAt = now.toISOString();
    const updates = {
      id_image_path: null,
      selfie_image_path: null,
      images_deleted_at: imagesDeletedAt,
      ...(record.status === 'pending' || record.status === 'needs_review' ? { status: 'expired' } : {}),
    };
    const { error: updateError } = await supabaseAdmin.from('identity_verifications')
      .update(updates)
      .eq('id', record.id);
    if (updateError) throw updateError;

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      actor_id: null,
      action: 'identity_images_retention_deleted',
      entity_type: 'identity_verification',
      entity_id: record.id,
      details: { image_count: paths.length, status_after_retention: updates.status || record.status },
    });
    if (auditError) throw auditError;
  }
  return expired?.length || 0;
};
