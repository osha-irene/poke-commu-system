export const UNASSIGNED_KEY = '__unassigned__';

const TEAM_PALETTE = [
  'rgba(91, 140, 255, 0.14)',
  'rgba(63, 206, 110, 0.14)',
  'rgba(240, 195, 60, 0.14)',
  'rgba(229, 72, 77, 0.14)',
  'rgba(201, 166, 255, 0.14)',
  'rgba(255, 157, 122, 0.14)',
  'rgba(80, 200, 200, 0.14)',
  'rgba(255, 121, 198, 0.14)',
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 조 키(문자열)를 고정된 팔레트의 배경색으로 매핑한다. 미배정은 색을 넣지 않는다. */
export function teamColor(key) {
  if (!key || key === UNASSIGNED_KEY) return 'transparent';
  const n = Number(key);
  const idx = Number.isFinite(n) ? Math.trunc(n) - 1 : hashString(String(key));
  return TEAM_PALETTE[((idx % TEAM_PALETTE.length) + TEAM_PALETTE.length) % TEAM_PALETTE.length];
}

/** 참가자를 p.team 기준으로 묶는다. 조 번호 오름차순, 미배정은 맨 뒤. */
export function groupByTeam(items) {
  const groups = new Map();
  items.forEach((p) => {
    const key = p.team && String(p.team).trim() ? String(p.team).trim() : UNASSIGNED_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  const teamKeys = Array.from(groups.keys())
    .filter((k) => k !== UNASSIGNED_KEY)
    .sort((a, b) => Number(a) - Number(b));
  if (groups.has(UNASSIGNED_KEY)) teamKeys.push(UNASSIGNED_KEY);

  return teamKeys.map((key) => ({ key, members: groups.get(key) }));
}
