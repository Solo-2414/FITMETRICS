import { AI_BUSY } from './errors.js';

export const createKeyPool = ({ cooldownMs = 60_000, now = Date.now } = {}) => {
  let nextKeyIndex = 0;
  const cooldowns = new Map();

  const orderedAvailableKeys = (keys) => {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (!uniqueKeys.length) return [];

    const start = nextKeyIndex % uniqueKeys.length;
    nextKeyIndex = (nextKeyIndex + 1) % uniqueKeys.length;
    const ordered = uniqueKeys.slice(start).concat(uniqueKeys.slice(0, start));
    const currentTime = now();
    const available = ordered.filter((key) => (cooldowns.get(key) || 0) <= currentTime);
    if (available.length) return available;

    const nextAvailableAt = Math.min(...ordered.map((key) => cooldowns.get(key) || currentTime));
    throw AI_BUSY(Math.max(1, (nextAvailableAt - currentTime) / 1000));
  };

  return {
    orderedAvailableKeys,
    cool(key) {
      cooldowns.set(key, now() + cooldownMs);
    },
    clear(key) {
      cooldowns.delete(key);
    },
    clearAll() {
      cooldowns.clear();
      nextKeyIndex = 0;
    },
  };
};

export const keyPool = createKeyPool();
