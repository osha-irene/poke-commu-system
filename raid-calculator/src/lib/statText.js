const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

export function statsToText(stats) {
  return STAT_KEYS.map((k) => stats?.[k] ?? 0).join(',');
}

export function textToStats(text, fallback) {
  const parts = text.split(',').map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 6 || parts.some((n) => Number.isNaN(n))) return fallback;
  const result = {};
  STAT_KEYS.forEach((k, i) => {
    result[k] = parts[i];
  });
  return result;
}
