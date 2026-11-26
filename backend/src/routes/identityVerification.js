import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  IDENTITY_BUCKET,
  IDENTITY_CONSENT_VERSION,
  IDENTITY_MAX_FILE_BYTES,
  IDENTITY_UPLOAD_FIELDS,
  IdentityInputError,
  automatedReviewResult,
  isIdentityUuid,
  sanitizeReviewReason,
  validateIdLast4,
  validateIdentityImage,
} from '../lib/identityVerification.js';
import { compareIdAndSelfie, idTextContainsName, readIdName } from '../services/identityProviders.js';

const router = Router();
router.use('/admin', requireAuth, requireRole('admin'));

const statuses = ['pending', 'verified', 'needs_review', 'rejected', 'expired'];
const idTypes = ['national_id', 'drivers_license', 'passport', 'postal_id', 'voters_id', 'other'];
const providerImageMaxBytes = 900 * 1024;
const signedUrlLifetimeSeconds = 5 * 60;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IDENTITY_MAX_FILE_BYTES, files: 2, fields: 8, fieldSize: 2048 },
});

const ipUploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many identity attempts from this connection. Try again later.' },
});

const memberUploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60_000,
  limit: 3,
  keyGenerator: (req) => `member:${req.body.member_id}`,
  skip: (req) => !isIdentityUuid(req.body?.member_id),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'This member has reached the daily identity attempt limit.' },
});

const retentionDays = () => {
  const value = Number(process.env.ID_IMAGE_RETENTION_DAYS || 30);
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('ID_IMAGE_RETENTION_DAYS must be a whole number from 1 to 3650.');
  }
  return value;
};

const escapePostgrestValue = (value) => String(value).replace(/([\\%_(),])/g, '\\$1');

const auditIdentityAction = async (actorId, action, verificationId, details = {}) => {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_id: actorId,
    action,
    entity_type: 'identity_verification',
    entity_id: verificationId,
    details,
  });
  if (error) throw error;
};

const findMember = async (memberId) => {
  const { data, error } = await supabaseAdmin.from('profiles')
    .select('id, full_name, email')
    .eq('id', memberId)
    .eq('role', 'member')
    .maybeSingle();
  if (error) throw error;
  return data;
};

const normalizePhoto = async (file) => {
  validateIdentityImage(file);
  const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 20_000_000 }).rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
  try {
    for (const quality of [82, 72, 62, 52]) {
      const buffer = await image.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
      if (buffer.length <= providerImageMaxBytes) return buffer;
    }
  } catch {
    throw new IdentityInputError('The selected image could not be decoded. Choose a clear JPG or PNG image.');
  }
  throw new IdentityInputError('This image is too detailed to process safely. Choose a smaller, clearer image.', 413);
};

const removeUploadedFiles = async (paths) => {
  if (!paths.length) return;
  const { error } = await supabaseAdmin.storage.from(IDENTITY_BUCKET).remove(paths);
  if (error) throw error;
};

router.get('/admin/identity-verifications/config', (_req, res, next) => {
  try {
    res.json({
      consent_version: IDENTITY_CONSENT_VERSION,
      retention_days: retentionDays(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/identity-verifications/members', async (req, res, next) => {
  try {
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (rawSearch.length > 80) throw new IdentityInputError('Search must be 80 characters or fewer.');
    let query = supabaseAdmin.from('profiles').select('id, full_name, email')
      .eq('role', 'member').order('full_name').limit(20);
    if (rawSearch) {
      const search = escapePostgrestValue(rawSearch);
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) return next(error);
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/identity-verifications', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'needs_review';
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (status !== 'all' && !statuses.includes(status)) throw new IdentityInputError('Choose a valid verification status.');
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new IdentityInputError('Page must be a positive whole number.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new IdentityInputError('Page size must be from 1 to 50.');

    let query = supabaseAdmin.from('identity_verifications')
      .select('id, member_id, status, method, score, id_name_match, id_type, id_last4, created_at, reviewed_at, review_reason, verified_at, expires_at, images_deleted_at, profiles!identity_verifications_member_id_fkey(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (status !== 'all') query = query.eq('status', status);
    const { data, count, error } = await query;
    if (error) return next(error);
    res.json({
      rows: (data || []).map(({ profiles, ...row }) => ({ ...row, member: profiles })),
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/admin/identity-verifications',
  ipUploadLimiter,
  upload.fields(IDENTITY_UPLOAD_FIELDS),
  memberUploadLimiter,
  async (req, res, next) => {
    const uploadedPaths = [];
    let verificationId;
    try {
      const {
        member_id: memberId,
        consent,
        consent_version: consentVersion,
        id_type: idType,
        liveness_check_completed: livenessCheckCompleted,
      } = req.body || {};
      if (!isIdentityUuid(memberId)) throw new IdentityInputError('Choose a valid member.');
      if (consent !== 'true' || consentVersion !== IDENTITY_CONSENT_VERSION) {
        throw new IdentityInputError('Record the member’s explicit consent before capturing or uploading images.');
      }
      if (!idTypes.includes(idType)) throw new IdentityInputError('Choose a valid ID type.');
      if (!['true', 'false'].includes(livenessCheckCompleted)) {
        throw new IdentityInputError('The liveness check state is invalid.');
      }
      const idLast4 = validateIdLast4(req.body.id_last4);
      const idFile = req.files?.id_image?.[0];
      const selfieFile = req.files?.selfie_image?.[0];
      if (!idFile || !selfieFile) throw new IdentityInputError('Both an ID photo and a selfie are required.');

      const member = await findMember(memberId);
      if (!member) throw new IdentityInputError('Member not found.', 404);
      const [idImage, selfieImage] = await Promise.all([normalizePhoto(idFile), normalizePhoto(selfieFile)]);
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + retentionDays() * 86_400_000).toISOString();
      verificationId = crypto.randomUUID();
      const idImagePath = `${verificationId}/${crypto.randomUUID()}.jpg`;
      const selfieImagePath = `${verificationId}/${crypto.randomUUID()}.jpg`;

      const { error: insertError } = await supabaseAdmin.from('identity_verifications').insert({
        id: verificationId,
        member_id: memberId,
        status: 'pending',
        method: 'facepp_ocrspace',
        consent_version: IDENTITY_CONSENT_VERSION,
        consent_at: createdAt.toISOString(),
        liveness_check_completed: livenessCheckCompleted === 'true',
        id_type: idType,
        id_last4: idLast4,
        id_image_path: idImagePath,
        selfie_image_path: selfieImagePath,
        expires_at: expiresAt,
      });
      if (insertError) return next(insertError);

      const storage = supabaseAdmin.storage.from(IDENTITY_BUCKET);
      for (const [path, buffer] of [[idImagePath, idImage], [selfieImagePath, selfieImage]]) {
        const { error } = await storage.upload(path, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '0',
          upsert: false,
        });
        if (error) throw error;
        uploadedPaths.push(path);
      }

      const [ocrResult, faceResult] = await Promise.allSettled([
        readIdName(idImage),
        compareIdAndSelfie(idImage, selfieImage),
      ]);
      const idNameMatch = ocrResult.status === 'fulfilled'
        ? idTextContainsName(ocrResult.value, member.full_name)
        : null;
      const faceMatch = faceResult.status === 'fulfilled' ? faceResult.value : null;
      const result = automatedReviewResult({ faceMatch, idNameMatch });
      const automatedCheck = ocrResult.status === 'fulfilled' && faceResult.status === 'fulfilled'
        ? 'complete'
        : 'unavailable';
      const { error: updateError } = await supabaseAdmin.from('identity_verifications')
        .update({ ...result, status: 'needs_review' })
        .eq('id', verificationId);
      if (updateError) return next(updateError);

      await auditIdentityAction(req.user.id, 'identity_verification_created', verificationId, {
        method: 'facepp_ocrspace',
        status: 'needs_review',
        automated_check: automatedCheck,
      });
      res.status(201).json({
        id: verificationId,
        status: 'needs_review',
        score: result.score,
        id_name_match: result.id_name_match,
        automated_check: automatedCheck,
      });
    } catch (error) {
      if (uploadedPaths.length) {
        try {
          await removeUploadedFiles(uploadedPaths);
        } catch {
          return next(new Error('Identity images could not be safely finalized or cleaned up. Contact support before retrying.'));
        }
      }
      if (verificationId) {
        const now = new Date().toISOString();
        const removedPaths = uploadedPaths.length ? { id_image_path: null, selfie_image_path: null, images_deleted_at: now } : {};
        const { error: updateError } = await supabaseAdmin.from('identity_verifications')
          .update({ ...removedPaths, status: 'needs_review' })
          .eq('id', verificationId);
        if (updateError) return next(updateError);
        try {
          await auditIdentityAction(req.user.id, 'identity_verification_upload_failed', verificationId, {
            status: 'needs_review',
            images_removed: uploadedPaths.length,
          });
        } catch (auditError) {
          return next(auditError);
        }
      }
      next(error);
    }
  },
);

router.post('/admin/identity-verifications/manual', async (req, res, next) => {
  try {
    const { member_id: memberId } = req.body || {};
    if (!isIdentityUuid(memberId)) throw new IdentityInputError('Choose a valid member.');
    const reason = sanitizeReviewReason(req.body.reason);
    const member = await findMember(memberId);
    if (!member) throw new IdentityInputError('Member not found.', 404);
    const verificationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('identity_verifications').insert({
      id: verificationId,
      member_id: memberId,
      status: 'verified',
      method: 'manual',
      review_reason: reason,
      reviewed_by: req.user.id,
      reviewed_at: now,
      verified_by: req.user.id,
      verified_at: now,
    });
    if (error) return next(error);
    await auditIdentityAction(req.user.id, 'identity_verification_manual', verificationId, {
      status: 'verified',
      reason_recorded: true,
    });
    res.status(201).json({ id: verificationId, status: 'verified', method: 'manual' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/identity-verifications/:id/images', async (req, res, next) => {
  try {
    if (!uuidPattern.test(req.params.id)) throw new IdentityInputError('Verification not found.', 404);
    const { data, error } = await supabaseAdmin.from('identity_verifications')
      .select('id, id_image_path, selfie_image_path, images_deleted_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) return next(error);
    if (!data) throw new IdentityInputError('Verification not found.', 404);
    if (!data.id_image_path || !data.selfie_image_path || data.images_deleted_at) {
      throw new IdentityInputError('The retained images are no longer available.', 410);
    }

    const bucket = supabaseAdmin.storage.from(IDENTITY_BUCKET);
    const [idResult, selfieResult] = await Promise.all([
      bucket.createSignedUrl(data.id_image_path, signedUrlLifetimeSeconds),
      bucket.createSignedUrl(data.selfie_image_path, signedUrlLifetimeSeconds),
    ]);
    if (idResult.error) return next(idResult.error);
    if (selfieResult.error) return next(selfieResult.error);
    await auditIdentityAction(req.user.id, 'identity_image_viewed', data.id, {
      image_types: ['id', 'selfie'],
      signed_url_lifetime_seconds: signedUrlLifetimeSeconds,
    });
    res.json({
      id_image_url: idResult.data.signedUrl,
      selfie_image_url: selfieResult.data.signedUrl,
      expires_in: signedUrlLifetimeSeconds,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/identity-verifications/:id/review', async (req, res, next) => {
  try {
    if (!uuidPattern.test(req.params.id)) throw new IdentityInputError('Verification not found.', 404);
    const decision = req.body?.decision;
    if (!['verified', 'rejected'].includes(decision)) throw new IdentityInputError('Choose approve or reject.');
    const reason = sanitizeReviewReason(req.body?.reason);
    const now = new Date().toISOString();
    const updates = {
      status: decision,
      reviewed_by: req.user.id,
      reviewed_at: now,
      review_reason: reason,
      verified_by: decision === 'verified' ? req.user.id : null,
      verified_at: decision === 'verified' ? now : null,
    };
    const { data, error } = await supabaseAdmin.from('identity_verifications')
      .update(updates)
      .eq('id', req.params.id)
      .eq('status', 'needs_review')
      .select('id, status, reviewed_at')
      .maybeSingle();
    if (error) return next(error);
    if (!data) throw new IdentityInputError('This record is no longer waiting for review.', 409);
    await auditIdentityAction(req.user.id, `identity_verification_${decision}`, data.id, {
      status: decision,
      reason_recorded: true,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/identity-verifications/:id/images', async (req, res, next) => {
  try {
    if (!uuidPattern.test(req.params.id)) throw new IdentityInputError('Verification not found.', 404);
    const { data, error } = await supabaseAdmin.from('identity_verifications')
      .select('id, id_image_path, selfie_image_path, images_deleted_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) return next(error);
    if (!data) throw new IdentityInputError('Verification not found.', 404);
    const paths = [data.id_image_path, data.selfie_image_path].filter(Boolean);
    if (!paths.length) return res.json({ deleted: false, images_deleted_at: data.images_deleted_at });

    const removal = await supabaseAdmin.storage.from(IDENTITY_BUCKET).remove(paths);
    if (removal.error) return next(removal.error);
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin.from('identity_verifications')
      .update({ id_image_path: null, selfie_image_path: null, images_deleted_at: now })
      .eq('id', data.id);
    if (updateError) return next(updateError);
    await auditIdentityAction(req.user.id, 'identity_images_deleted', data.id, { count: paths.length });
    res.json({ deleted: true, images_deleted_at: now });
  } catch (error) {
    next(error);
  }
});

router.use((error, _req, res, next) => {
  if (error instanceof IdentityInputError) return res.status(error.statusCode).json({ error: error.message });
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Choose images smaller than 8 MB.' : 'The upload must contain one ID photo and one selfie.';
    return res.status(400).json({ error: message });
  }
  return next(error);
});

export default router;
