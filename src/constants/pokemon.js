// src/constants/pokemon.js
// 포켓몬 관련 상수 정의

// 타입 이름 매핑 (영문 -> 한글)
export const TYPE_NAMES_KR = {
  normal: '노말',
  fire: '불꽃',
  water: '물',
  electric: '전기',
  grass: '풀',
  ice: '얼음',
  fighting: '격투',
  poison: '독',
  ground: '땅',
  flying: '비행',
  psychic: '에스퍼',
  bug: '벌레',
  rock: '바위',
  ghost: '고스트',
  dragon: '드래곤',
  dark: '악',
  steel: '강철',
  fairy: '페어리'
};

// 타입 이름 매핑 (한글 -> 영문)
export const TYPE_NAMES_EN = {
  '노말': 'normal',
  '불꽃': 'fire',
  '물': 'water',
  '전기': 'electric',
  '풀': 'grass',
  '얼음': 'ice',
  '격투': 'fighting',
  '독': 'poison',
  '땅': 'ground',
  '비행': 'flying',
  '에스퍼': 'psychic',
  '벌레': 'bug',
  '바위': 'rock',
  '고스트': 'ghost',
  '드래곤': 'dragon',
  '악': 'dark',
  '강철': 'steel',
  '페어리': 'fairy'
};

// 타입별 색상
export const TYPE_COLORS = {
  '노말': { bg: '#A8A878', text: '#FFF' },
  '불꽃': { bg: '#F08030', text: '#FFF' },
  '물': { bg: '#6890F0', text: '#FFF' },
  '전기': { bg: '#F8D030', text: '#FFF' },
  '풀': { bg: '#78C850', text: '#FFF' },
  '얼음': { bg: '#98D8D8', text: '#FFF' },
  '격투': { bg: '#C03028', text: '#FFF' },
  '독': { bg: '#A040A0', text: '#FFF' },
  '땅': { bg: '#E0C068', text: '#FFF' },
  '비행': { bg: '#A890F0', text: '#FFF' },
  '에스퍼': { bg: '#F85888', text: '#FFF' },
  '벌레': { bg: '#A8B820', text: '#FFF' },
  '바위': { bg: '#B8A038', text: '#FFF' },
  '고스트': { bg: '#705898', text: '#FFF' },
  '드래곤': { bg: '#7038F8', text: '#FFF' },
  '악': { bg: '#705848', text: '#FFF' },
  '강철': { bg: '#B8B8D0', text: '#FFF' },
  '페어리': { bg: '#EE99AC', text: '#FFF' }
};

// 포켓볼 리스트
export const POKEBALL_LIST = [
  // 기본 볼
  { name: '몬스터볼', nameEn: 'poke-ball' },
  { name: '수퍼볼', nameEn: 'great-ball' },
  { name: '하이퍼볼', nameEn: 'ultra-ball' },
  { name: '마스터볼', nameEn: 'master-ball' },
  
  // 2세대 어프리코트 볼
  { name: '사파리볼', nameEn: 'safari-ball' },
  { name: '레벨볼', nameEn: 'level-ball' },
  { name: '루어볼', nameEn: 'lure-ball' },
  { name: '문볼', nameEn: 'moon-ball' },
  { name: '프렌드볼', nameEn: 'friend-ball' },
  { name: '러브러브볼', nameEn: 'love-ball' },
  { name: '헤비볼', nameEn: 'heavy-ball' },
  { name: '스피드볼', nameEn: 'fast-ball' },
  { name: '스포츠볼', nameEn: 'sport-ball' },
  
  // 3세대 이후
  { name: '프리미어볼', nameEn: 'premier-ball' },
  { name: '넷트볼', nameEn: 'net-ball' },
  { name: '다이브볼', nameEn: 'dive-ball' },
  { name: '네스트볼', nameEn: 'nest-ball' },
  { name: '리피트볼', nameEn: 'repeat-ball' },
  { name: '타이머볼', nameEn: 'timer-ball' },
  { name: '럭셔리볼', nameEn: 'luxury-ball' },
  
  // 4세대 이후
  { name: '다크볼', nameEn: 'dusk-ball' },
  { name: '힐볼', nameEn: 'heal-ball' },
  { name: '퀵볼', nameEn: 'quick-ball' },
  { name: '파크볼', nameEn: 'park-ball' },
  
  // 5세대 이후
  { name: '드림볼', nameEn: 'dream-ball' },
  
  // 특별 볼
  { name: '프레셔스볼', nameEn: 'cherish-ball' },
  { name: '울트라볼', nameEn: 'beast-ball' }
];

// 헬퍼 함수들
export const getTypeNameKr = (typeEn) => {
  return TYPE_NAMES_KR[typeEn?.toLowerCase()] || typeEn;
};

export const getTypeNameEn = (typeKr) => {
  return TYPE_NAMES_EN[typeKr] || typeKr;
};

export const getTypeColor = (type) => {
  return TYPE_COLORS[type] || { bg: '#777', text: '#FFF' };
};

export const getTypeColorByEn = (typeEn) => {
  const typeKr = TYPE_NAMES_KR[typeEn?.toLowerCase()];
  return TYPE_COLORS[typeKr] || { bg: '#777', text: '#FFF' };
};
