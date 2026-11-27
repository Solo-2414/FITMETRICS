export const IDENTITY_CONSENT_VERSION = 'face-id-consent-v1';
export const IDENTITY_BUCKET = 'identity-verifications';
export const IDENTITY_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const IDENTITY_UPLOAD_FIELDS = [
  { name: 'id_image', maxCount: 1 },
  { name: 'selfie_image', maxCount: 1 },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class IdentityInputError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'IdentityInputError';
    this.statusCode = statusCode;
  }
}

export const isIdentityUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

export function sniffImageMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  return null;
}

export function validateIdentityImage(file) {
  if (!file?.buffer?.length || file.buffer.length > IDENTITY_MAX_FILE_BYTES) {
    throw new IdentityInputError('Choose an image smaller than 8 MB.');
  }
  const detectedMime = sniffImageMime(file.buffer);
  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new IdentityInputError('The selected file is not a valid JPG or PNG image.');
  }
  return detectedMime;
}

export function validateIdLast4(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]{4}$/i.test(value.trim())) {
    throw new IdentityInputError('Enter only the final four letters or numbers of the ID.');
  }
  return value.trim().toUpperCase();
}

export function sanitizeReviewReason(value) {
  if (typeof value !== 'string') throw new IdentityInputError('A review reason is required.');
  const reason = value.trim().replace(/\s+/g, ' ');
  if (reason.length < 5 || reason.length > 500) {
    throw new IdentityInputError('The review reason must be 5-500 characters.');
  }
  return reason.replace(/(?:\d[\s./-]*){5,}/g, (sequence) => {
    const digits = sequence.replace(/\D/g, '');
    const trailingSeparator = sequence.match(/[\s./-]+$/)?.[0] || '';
    return `****${digits.slice(-4)}${trailingSeparator}`;
  });
}

export function automatedReviewResult({ faceMatch, idNameMatch }) {
  return {
    status: 'needs_review',
    method: 'facepp_ocrspace',
    score: Number.isFinite(faceMatch?.confidence) ? faceMatch.confidence : null,
    id_name_match: typeof idNameMatch === 'boolean' ? idNameMatch : null,
  };
}

export function automatedIdentityCheckStatus({ livenessCheckCompleted, ocrSucceeded, faceSucceeded }) {
  if (!livenessCheckCompleted) return 'manual_only';
  return ocrSucceeded && faceSucceeded ? 'complete' : 'unavailable';
}
