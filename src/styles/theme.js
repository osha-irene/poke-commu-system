// src/styles/theme.js
// 📦 나중에 여기만 수정하면 전체 디자인이 바뀝니다

// ===== 색상 시스템 =====
export const COLORS = {
  // 포켓몬 타입 색상 (변경 가능)
  types: {
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
  },

  // 브랜드 색상 (나중에 완전히 바꿀 부분)
  brand: {
    primary: '#6366f1',      // 메인 색상
    secondary: '#8b5cf6',    // 보조 색상
    accent: '#ec4899',       // 강조 색상
  },

  // UI 색상
  ui: {
    background: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb',
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af'
    }
  },

  // 상태 색상
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
};

// ===== 포켓몬 볼 리스트 =====
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
  { name: '러브볼', nameEn: 'love-ball' },
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

// ===== 타이포그래피 =====
export const TYPOGRAPHY = {
  fontFamily: {
    main: '"Pretendard", -apple-system, sans-serif', // 나중에 커스텀 폰트로 교체
    mono: '"JetBrains Mono", monospace'
  },
  
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  }
};

// ===== 간격 시스템 =====
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem'    // 48px
};

// ===== 그림자 =====
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
};

// ===== 테두리 반경 =====
export const RADIUS = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  full: '9999px'
};

// ===== 애니메이션 =====
export const ANIMATIONS = {
  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms'
  },
  
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
};

// ===== 컴포넌트별 스타일 프리셋 =====
export const COMPONENT_STYLES = {
  // 버튼 스타일들
  button: {
    base: 'font-semibold rounded-lg transition-all',
    sizes: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    },
    variants: {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      success: 'bg-green-600 text-white hover:bg-green-700',
      warning: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
    }
  },

  // 카드 스타일들
  card: {
    base: 'bg-white rounded-lg border transition-all',
    variants: {
      default: 'border-gray-200 hover:shadow-md',
      selected: 'border-indigo-400 bg-indigo-50 shadow-lg',
      interactive: 'cursor-pointer hover:border-indigo-300 hover:shadow-md'
    }
  },

  // 배지 스타일들
  badge: {
    base: 'inline-flex items-center px-2 py-0.5 rounded font-bold text-xs',
    variants: {
      default: 'bg-gray-100 text-gray-700',
      primary: 'bg-indigo-100 text-indigo-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      danger: 'bg-red-100 text-red-700'
    }
  },

  // 입력 필드
  input: {
    base: 'border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all',
    variants: {
      default: 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200',
      error: 'border-red-500 focus:border-red-600 focus:ring-red-200'
    }
  }
};

// ===== 헬퍼 함수들 =====
export const getTypeColor = (type) => {
  return COLORS.types[type] || { bg: '#777', text: '#FFF' };
};

export const getCategoryColor = (category) => {
  const categoryMap = {
    'ball': { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
    'medicine': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
    'vitamin': { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
    'berry': { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700' },
    'battle': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
    'key': { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
    'misc': { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' }
  };
  
  return categoryMap[category] || categoryMap.misc;
};

export const getButtonClass = (variant = 'primary', size = 'md') => {
  const { base, sizes, variants } = COMPONENT_STYLES.button;
  return `${base} ${sizes[size]} ${variants[variant]}`;
};

export const getCardClass = (variant = 'default') => {
  const { base, variants } = COMPONENT_STYLES.card;
  return `${base} ${variants[variant]}`;
};

export const getBadgeClass = (variant = 'default') => {
  const { base, variants } = COMPONENT_STYLES.badge;
  return `${base} ${variants[variant]}`;
};

export const getInputClass = (variant = 'default') => {
  const { base, variants } = COMPONENT_STYLES.input;
  return `${base} ${variants[variant]}`;
};