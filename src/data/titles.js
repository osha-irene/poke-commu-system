export const TITLES = [
  { id: 'none',       label: '칭호 없음',  icon: null },
  { id: 'explorer',  label: '탐험가',     icon: 'icon1' },
  { id: 'star',      label: '스타',       icon: 'icon2' },
  { id: 'champion',  label: '챔피언',     icon: 'icon3' },
  { id: 'researcher',label: '연구원',     icon: 'icon4' },
];

export const getTitleById = (id) => TITLES.find(t => t.id === id) || null;
