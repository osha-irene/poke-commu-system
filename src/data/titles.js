export const TITLES = [
  { id: 'none',       label: '칭호 없음',  icon: null }
];

export const getTitleById = (id) => TITLES.find(t => t.id === id) || null;
