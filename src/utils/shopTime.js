const KOREA_TIME_ZONE = 'Asia/Seoul';

const koreaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KOREA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getKoreaDateKey = (date = new Date()) => {
  const parts = koreaDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getKoreaDayIndex = (date = new Date()) => {
  const [year, month, day] = getKoreaDateKey(date).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const getKoreaWeekKey = (date = new Date()) => {
  const [year, month, day] = getKoreaDateKey(date).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const weekYear = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNumber = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${weekYear}-W${weekNumber}`;
};

export const getKoreaWeekEndDateKey = (date = new Date()) => {
  const [year, month, day] = getKoreaDateKey(date).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day));
  const daysUntilSunday = (7 - target.getUTCDay()) % 7;
  target.setUTCDate(target.getUTCDate() + daysUntilSunday);
  return target.toISOString().split('T')[0];
};
export const getMillisecondsUntilNextKoreaMidnight = (date = new Date()) => {
  const [year, month, day] = getKoreaDateKey(date).split('-').map(Number);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1) - (9 * 60 * 60 * 1000);
  return Math.max(0, nextMidnightUtc - date.getTime());
};
