export const DAILY_ATTENDANCE_EXP = 500;

export const getKoreaDateKey = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const getRequiredExpForLevel = (level = 1) => {
  const numericLevel = Number(level) || 1;

  if (numericLevel <= 30) return 50;
  if (numericLevel <= 40) return 100;
  if (numericLevel <= 50) return 150;
  if (numericLevel <= 60) return 200;
  if (numericLevel <= 70) return 250;
  if (numericLevel <= 80) return 300;

  return null;
};

export const canUseLevelExp = (level, availableExp) => {
  const requiredExp = getRequiredExpForLevel(level);
  return requiredExp !== null && (Number(availableExp) || 0) >= requiredExp;
};
