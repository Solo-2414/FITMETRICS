import { AI_NOT_CONFIGURED } from './errors.js';

const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const splitUnique = (value) => [...new Set(String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean))];

export const getAIConfig = (env = process.env) => ({
  enabled: String(env.AI_ENABLED || 'false').toLowerCase() === 'true',
  keys: splitUnique(env.GEMINI_API_KEYS),
  models: splitUnique(env.GEMINI_MODELS),
  memberDailyLimit: positiveInteger(env.AI_MEMBER_DAILY_LIMIT, 20),
  memberMinuteLimit: positiveInteger(env.AI_MEMBER_MINUTE_LIMIT, 5),
  adminDailyLimit: positiveInteger(env.AI_ADMIN_DAILY_LIMIT, 30),
  maxInputChars: positiveInteger(env.AI_MAX_INPUT_CHARS, 2_000),
  maxOutputTokens: positiveInteger(env.AI_MAX_OUTPUT_TOKENS, 700),
});

export const assertAIConfigured = (env = process.env) => {
  const config = getAIConfig(env);
  if (!config.keys.length || !config.models.length) throw AI_NOT_CONFIGURED();
  if (!config.enabled) {
    const error = new Error('The AI assistant is disabled by configuration.');
    error.code = 'AI_DISABLED';
    error.statusCode = 503;
    throw error;
  }
  return config;
};
