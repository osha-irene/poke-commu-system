// src/styles/colors.js
// 디자인 교체 시 이 파일만 수정하면 전체 색상이 바뀝니다

// ===== 브랜드 색상 =====
export const BRAND = {
  primary:   '#6366f1',
  secondary: '#8b5cf6',
  accent:    '#ec4899',
};

// ===== UI 기본 색상 =====
export const UI = {
  background: '#ffffff',
  surface:    '#f9fafb',
  border:     '#e5e7eb',
  overlay:    'rgba(0, 0, 0, 0.5)',
  text: {
    primary:   '#111827',
    secondary: '#6b7280',
    disabled:  '#9ca3af',
    inverse:   '#ffffff',
  },
};

// ===== 상태 색상 =====
export const STATUS = {
  success: '#10b981',
  warning: '#f59e0b',
  error:   '#ef4444',
  info:    '#3b82f6',
};

// ===== 포켓몬 타입 색상 =====
export const POKEMON_TYPES = {
  '노말':   { bg: '#A8A878', text: '#FFF' },
  '불꽃':   { bg: '#F08030', text: '#FFF' },
  '물':     { bg: '#6890F0', text: '#FFF' },
  '전기':   { bg: '#F8D030', text: '#FFF' },
  '풀':     { bg: '#78C850', text: '#FFF' },
  '얼음':   { bg: '#98D8D8', text: '#FFF' },
  '격투':   { bg: '#C03028', text: '#FFF' },
  '독':     { bg: '#A040A0', text: '#FFF' },
  '땅':     { bg: '#E0C068', text: '#FFF' },
  '비행':   { bg: '#A890F0', text: '#FFF' },
  '에스퍼': { bg: '#F85888', text: '#FFF' },
  '벌레':   { bg: '#A8B820', text: '#FFF' },
  '바위':   { bg: '#B8A038', text: '#FFF' },
  '고스트': { bg: '#705898', text: '#FFF' },
  '드래곤': { bg: '#7038F8', text: '#FFF' },
  '악':     { bg: '#705848', text: '#FFF' },
  '강철':   { bg: '#B8B8D0', text: '#FFF' },
  '페어리': { bg: '#EE99AC', text: '#FFF' },
};

// ===== 아이템 카테고리 색상 =====
export const ITEM_CATEGORIES = {
  ball:     { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700'       },
  medicine: { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700'   },
  vitamin:  { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  berry:    { bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700'     },
  battle:   { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  key:      { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  misc:     { bg: 'bg-gray-50',   border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700'     },
};
