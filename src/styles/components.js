// src/styles/components.js
// UI 컴포넌트별 className 프리셋
// 디자인 교체 시 이 파일만 수정하면 모든 버튼/카드/배지/입력창이 바뀝니다

// ===== 버튼 =====
export const BUTTON = {
  base: 'inline-flex items-center justify-center font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed',
  sizes: {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  },
  variants: {
    primary:   'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    success:   'bg-green-600 text-white hover:bg-green-700',
    warning:   'bg-orange-100 text-orange-700 hover:bg-orange-200',
    ghost:     'bg-transparent text-gray-700 hover:bg-gray-100',
  },
};

// ===== 카드 =====
export const CARD = {
  base: 'bg-white rounded-lg border transition-all',
  variants: {
    default:     'border-gray-200 shadow-sm',
    hover:       'border-gray-200 shadow-sm hover:shadow-md',
    interactive: 'border-gray-200 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md',
    selected:    'border-indigo-400 bg-indigo-50 shadow-lg',
  },
};

// ===== 배지 =====
export const BADGE = {
  base: 'inline-flex items-center px-2 py-0.5 rounded font-bold text-xs',
  variants: {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger:  'bg-red-100 text-red-700',
  },
};

// ===== 입력창 =====
export const INPUT = {
  base: 'w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all',
  variants: {
    default: 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200',
    error:   'border-red-500 focus:border-red-600 focus:ring-red-200',
  },
};

// ===== 모달 =====
export const MODAL = {
  overlay: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
  container: 'bg-white rounded-lg p-6 w-full m-4 max-h-[90vh] overflow-y-auto',
  sizes: {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  },
  header: 'flex items-center justify-between mb-4',
  title:  'text-xl font-bold text-gray-900',
  closeButton: 'text-gray-400 hover:text-gray-600 transition-colors',
};
