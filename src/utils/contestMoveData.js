// 오메가루비·알파사파이어(6세대) Contest Spectacular 타입 색상 (공식 리본 색상 기준)
export const CONTEST_TYPE_COLORS = {
  '근사함': { bg: '#fee2e2', text: '#dc2626' },
  '아름다움': { bg: '#dbeafe', text: '#2563eb' },
  '귀여움': { bg: '#fce7f3', text: '#db2777' },
  '슬기로움': { bg: '#dcfce7', text: '#16a34a' },
  '강인함': { bg: '#fef9c3', text: '#ca8a04' },
};

// src/data/moves.json의 contestEffect는 podic.kr 6세대 Contest Spectacular 원문(한국어)이라 번역이 필요 없음.
export const getContestEffectKo = (contestEffect) => contestEffect || '';

export const getContestTypeColor = (contestType) =>
  CONTEST_TYPE_COLORS[contestType] || { bg: '#f3f4f6', text: '#4b5563' };
