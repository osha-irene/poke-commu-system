// src/styles/helpers.js
// theme.js 에 있던 헬퍼 함수들 — 색상 토큰을 받아 값을 반환합니다
// 컴포넌트에서 직접 import해서 사용

import { POKEMON_TYPES, ITEM_CATEGORIES, BUTTON, CARD, BADGE, INPUT } from './index';

// ===== 포켓몬 타입 색상 =====
export const getTypeColor = (typeKr) => {
  return POKEMON_TYPES[typeKr] || { bg: '#777', text: '#FFF' };
};

// ===== 영문 타입명 → 한글 =====
const TYPE_KR = {
  normal: '노말', fire: '불꽃', water: '물', electric: '전기',
  grass: '풀', ice: '얼음', fighting: '격투', poison: '독',
  ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레',
  rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악',
  steel: '강철', fairy: '페어리',
};

export const getTypeNameKr = (typeEn) => TYPE_KR[typeEn?.toLowerCase()] || typeEn;

export const getTypeColorByEn = (typeEn) => {
  const kr = getTypeNameKr(typeEn);
  return getTypeColor(kr);
};

// ===== 아이템 카테고리 색상 =====
export const getCategoryColor = (category) => {
  return ITEM_CATEGORIES[category] || ITEM_CATEGORIES.misc;
};

// ===== 컴포넌트 className 조합 =====
export const getButtonClass = (variant = 'primary', size = 'md') =>
  `${BUTTON.base} ${BUTTON.sizes[size]} ${BUTTON.variants[variant]}`;

export const getCardClass = (variant = 'default') =>
  `${CARD.base} ${CARD.variants[variant]}`;

export const getBadgeClass = (variant = 'default') =>
  `${BADGE.base} ${BADGE.variants[variant]}`;

export const getInputClass = (variant = 'default') =>
  `${INPUT.base} ${INPUT.variants[variant]}`;
