import { getAIConfig, assertAIConfigured } from './config.js';
import { AI_UNAVAILABLE } from './errors.js';
import { keyPool } from './keyPool.js';
import { getModelChain } from './modelChain.js';

const REQUEST_TIMEOUT_MS = 20_000;

export const requestGemini = async (contents, { systemInstruction, tools }) => {
  const config = assertAIConfigured();
  const models = getModelChain();
  const failures = [];

  for (const model of models) {
    const keys = keyPool.orderedAvailableKeys(config.keys);

    for (const key of keys) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            tools,
            generationConfig: { maxOutputTokens: config.maxOutputTokens, temperature: 0.2 },
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          failures.push(response.status);
          if (response.status === 429) keyPool.cool(key);
          if (response.status === 404 || response.status === 429 || response.status >= 500) continue;
          if (response.status === 401 || response.status === 403) continue;
          throw AI_UNAVAILABLE();
        }
        keyPool.clear(key);
        return { body, model };
      } catch (error) {
        if (error.code === 'AI_UNAVAILABLE') throw error;
        const status = error.name === 'AbortError' ? 504 : 503;
        failures.push(status);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  if (failures.length && failures.every((status) => status === 429)) throw AI_BUSY();
  if (failures.length && failures.every((status) => status === 404)) throw AI_UNAVAILABLE();
  throw AI_UNAVAILABLE();
};

export const getGeminiClientConfig = () => getAIConfig();

