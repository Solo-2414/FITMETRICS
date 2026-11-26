const FACE_PLUS_PLUS_URL = 'https://api-us.faceplusplus.com/facepp/v3/compare';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';
const PROVIDER_TIMEOUT_MS = 30_000;

export class IdentityProviderError extends Error {
  constructor(provider, kind, status = null) {
    super(`${provider} ${kind}`);
    this.name = 'IdentityProviderError';
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}

const providerFetch = async (provider, url, options) => {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch {
    throw new IdentityProviderError(provider, 'unavailable');
  }
};

const responseJson = async (provider, response) => {
  try {
    return await response.json();
  } catch {
    throw new IdentityProviderError(provider, 'invalid_response', response.status);
  }
};

const normalizedName = (value) => String(value || '').toLocaleLowerCase('en')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/g, '');

export function idTextContainsName(ocrText, fullName) {
  const tokens = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  const normalizedText = normalizedName(ocrText);
  const normalizedTokens = tokens.map(normalizedName).filter(Boolean);
  return normalizedTokens.length > 0 && normalizedTokens.every((token) => normalizedText.includes(token));
}

export async function readIdName(imageBuffer) {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  if (!apiKey) throw new IdentityProviderError('OCR.space', 'not_configured');

  const form = new URLSearchParams({
    language: 'eng',
    isOverlayRequired: 'false',
    base64Image: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
  });
  const response = await providerFetch('OCR.space', OCR_SPACE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', apikey: apiKey },
    body: form,
  });
  if (!response.ok) throw new IdentityProviderError('OCR.space', 'request_failed', response.status);
  const result = await responseJson('OCR.space', response);
  if (result.IsErroredOnProcessing || !(result.ParsedResults || []).length) {
    throw new IdentityProviderError('OCR.space', 'could_not_read_id', response.status);
  }
  return (result.ParsedResults || []).map((item) => item.ParsedText || '').join('\n');
}

export async function compareIdAndSelfie(idImageBuffer, selfieBuffer) {
  const apiKey = process.env.FACEPP_API_KEY?.trim();
  const apiSecret = process.env.FACEPP_API_SECRET?.trim();
  if (!apiKey || !apiSecret) throw new IdentityProviderError('Face++', 'not_configured');

  const form = new URLSearchParams({
    api_key: apiKey,
    api_secret: apiSecret,
    image_base64_1: selfieBuffer.toString('base64'),
    image_base64_2: idImageBuffer.toString('base64'),
  });
  const response = await providerFetch('Face++', FACE_PLUS_PLUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!response.ok) throw new IdentityProviderError('Face++', 'request_failed', response.status);
  const result = await responseJson('Face++', response);
  const confidence = Number(result.confidence);
  if (result.error_message || !Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new IdentityProviderError('Face++', 'could_not_compare', response.status);
  }
  return { confidence };
}
