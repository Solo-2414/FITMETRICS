export const AI_NOT_CONFIGURED = () => Object.assign(
  new Error('The AI assistant is not configured. Set GEMINI_API_KEYS and GEMINI_MODELS on the backend.'),
  { code: 'AI_NOT_CONFIGURED', statusCode: 503 },
);

export const AI_BUSY = (retryAfter = 60) => Object.assign(
  new Error('The AI assistant is temporarily busy. Please try again shortly.'),
  { code: 'AI_BUSY', statusCode: 503, retryAfter: Math.max(1, Math.ceil(retryAfter)) },
);

export const AI_RATE_LIMITED = (retryAfter = 60, requestCount) => Object.assign(
  new Error('AI assistant quota reached. Please try again later.'),
  {
    code: 'AI_RATE_LIMITED',
    statusCode: 429,
    retryAfter: Math.max(1, Math.ceil(retryAfter)),
    remainingQuota: Number.isSafeInteger(requestCount) ? 0 : undefined,
  },
);

export const AI_UNAVAILABLE = () => Object.assign(
  new Error('The AI assistant is unavailable. Please try again later.'),
  { code: 'AI_UNAVAILABLE', statusCode: 503 },
);
