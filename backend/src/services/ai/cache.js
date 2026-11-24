import { createHash } from 'node:crypto';

export const createTTLCache = ({ ttlMs = 30_000, maxEntries = 100, now = Date.now } = {}) => {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    },
    clear() {
      entries.clear();
    },
  };
};

export const adminAnswerCache = createTTLCache();

export const adminQuestionCacheKey = (messages, userText) => createHash('sha256')
  .update(JSON.stringify([messages, userText]))
  .digest('hex');
