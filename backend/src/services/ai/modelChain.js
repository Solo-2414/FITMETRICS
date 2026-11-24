import { AI_NOT_CONFIGURED } from './errors.js';

export const getModelChain = (env = process.env) => {
  const models = [...new Set(String(env.GEMINI_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean))];
  if (!models.length) throw AI_NOT_CONFIGURED();
  return models;
};
