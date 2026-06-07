// src/styles/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// 레이아웃 구조 className 및 이미지 경로 프리셋
//
// 디자인 시안 수령 후 이 파일의 backgroundImage 값만 바꾸면
// 해당 영역의 배경이 즉시 교체됩니다.
//
// 공통 규칙:
//   backgroundImage: null  → 기존 단색/그라디언트 className 사용
//   backgroundImage: '/img/xxx.png'  → 이미지로 교체
//   overlayColor: null  → 오버레이 없음
//   overlayColor: 'rgba(0,0,0,0.4)'  → 반투명 어두운 막
//   overlayColor: 'rgba(255,255,255,0.55)'  → 반투명 밝은 막
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 유틸: 배경 이미지 인라인 style 객체 생성
// 컴포넌트에서 import 해서 사용합니다
//   const style = buildBgStyle(APP_SHELL)
//   <div style={style} />
// ─────────────────────────────────────────────────────────────────────────────
export function buildBgStyle(token) {
  if (!token?.backgroundImage) return {};
  return {
    backgroundImage:      `url(${token.backgroundImage})`,
    backgroundSize:       token.backgroundSize       ?? 'cover',
    backgroundPosition:   token.backgroundPosition   ?? 'center',
    backgroundRepeat:     token.backgroundRepeat      ?? 'no-repeat',
    backgroundAttachment: token.backgroundAttachment  ?? 'fixed',
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// 1. 전체 앱 배경 (데스크톱 루트 div)
// ═════════════════════════════════════════════════════════════════════════════
export const APP_SHELL = {
  root:    'h-screen flex bg-gray-50',  // backgroundImage 사용 시 bg-gray-50 → bg-transparent 으로 변경
  content: 'flex-1 flex flex-col overflow-hidden',
  main:    'flex-1 overflow-auto p-8',

  // 배경 이미지 경로
  // ex) backgroundImage: '/img/backgrounds/app-bg.png',
  backgroundImage:      null,
  backgroundSize:       'cover',
  backgroundPosition:   'center',
  backgroundRepeat:     'no-repeat',
  backgroundAttachment: 'fixed',   // 'fixed' = 스크롤해도 배경 고정

  // 배경 위 반투명 오버레이 (텍스트 가독성 확보용)
  // ex) overlayColor: 'rgba(0, 0, 0, 0.35)',
  overlayColor: null,
};


// ═════════════════════════════════════════════════════════════════════════════
// 2. 사이드바
// ═════════════════════════════════════════════════════════════════════════════
export const SIDEBAR = {
  root: 'w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0',

  // 사이드바 전체 배경 이미지
  // ex) backgroundImage: '/img/backgrounds/sidebar-bg.png',
  backgroundImage:    null,
  backgroundSize:     'cover',
  backgroundPosition: 'center',
  backgroundRepeat:   'no-repeat',

  // 사이드바 배경 위 오버레이
  // ex) overlayColor: 'rgba(255, 255, 255, 0.85)',
  overlayColor: null,

  logo: {
    wrapper: 'p-6 border-b border-gray-200',
    // 로고 이미지 경로 — null 이면 텍스트 로고 표시
    // ex) image: '/img/sidebar/logo.png',
    image:      null,
    imageClass: 'w-auto h-10 object-contain',
    title:    'text-2xl font-bold text-indigo-600',
    subtitle: 'text-sm text-gray-500 mt-1',
  },

  profile: {
    wrapper: 'p-4 border-b border-gray-200',
    inner:   'flex items-center gap-3',
    // 아바타 기본 이미지 — null 이면 이니셜
    // 우선순위: trainer.avatarUrl > defaultAvatar > 이니셜
    // ex) defaultAvatar: '/img/sidebar/default-avatar.png',
    defaultAvatar:  null,
    avatarClass:    'w-12 h-12 rounded-full object-cover flex-shrink-0',
    avatarFallback: 'w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0',
    name:      'font-semibold text-gray-800',
    statRow:   'mt-3 flex justify-between text-sm text-gray-600',
    statValue: 'font-semibold text-indigo-600',
  },

  nav: {
    wrapper: 'flex-1 p-4 space-y-2 overflow-y-auto',
    divider: 'border-t border-gray-300 my-4 pt-2',
  },

  footer: {
    wrapper: 'p-4 border-t border-gray-200',
  },

  soundButton: {
    base: 'w-full mt-3 px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
    on:   'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    off:  'bg-gray-100 text-gray-500 hover:bg-gray-200',
  },

  logoutButton: 'w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center gap-2',
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. 네비 버튼
// ═════════════════════════════════════════════════════════════════════════════
export const NAV_BUTTON = {
  base:     'w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all',
  active:   'bg-indigo-100 text-indigo-700',
  inactive: 'text-gray-700 hover:bg-gray-100',
  labelImageClass: 'h-5 w-auto object-contain',
  iconImageClass:  'w-5 h-5 object-contain',
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. 헤더 (데스크톱 상단 바)
// ═════════════════════════════════════════════════════════════════════════════
export const HEADER = {
  root:      'bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0',
  title:     'text-2xl font-bold text-gray-800',
  statBadge: 'bg-green-50 px-5 py-2 rounded-lg border border-green-200',
  statText:  'text-sm font-bold text-green-700',

  // 헤더 배경 이미지 (root의 bg-white를 덮어씁니다)
  // ex) backgroundImage: '/img/backgrounds/header-bg.png',
  backgroundImage:    null,
  backgroundSize:     'cover',
  backgroundPosition: 'center',
  backgroundRepeat:   'no-repeat',

  // 헤더 위 오버레이
  // ex) overlayColor: 'rgba(255, 255, 255, 0.7)',
  overlayColor: null,
};


// ═════════════════════════════════════════════════════════════════════════════
// 5. 로그인 화면
// ═════════════════════════════════════════════════════════════════════════════
export const LOGIN = {
  // 화면 전체 배경 (outer div)
  root: 'min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4',

  // ex) backgroundImage: '/img/backgrounds/login-bg.png',
  backgroundImage:      null,
  backgroundSize:       'cover',
  backgroundPosition:   'center',
  backgroundRepeat:     'no-repeat',
  backgroundAttachment: 'fixed',

  // 화면 전체 오버레이
  // ex) overlayColor: 'rgba(0, 0, 0, 0.4)',
  overlayColor: null,

  // 로그인 카드 (중앙 흰색 박스)
  card: 'bg-white rounded-2xl shadow-xl p-8 w-full max-w-md',

  // 로그인 카드 배경 이미지 (카드 자체를 이미지로 교체)
  // ex) cardBackgroundImage: '/img/backgrounds/login-card-bg.png',
  cardBackgroundImage:    null,
  cardBackgroundSize:     'cover',
  cardBackgroundPosition: 'center',

  // 카드 위 오버레이 (카드 가독성)
  // ex) cardOverlayColor: 'rgba(255, 255, 255, 0.88)',
  cardOverlayColor: null,

  // 타이틀 이미지 — null 이면 텍스트 표시
  // ex) titleImage: '/img/login/title.png',
  titleImage:      null,
  titleImageClass: 'w-auto h-16 object-contain mx-auto mb-2',
  title:    'text-4xl font-bold text-gray-800 mb-2',
  subtitle: 'text-gray-600',
};


// ═════════════════════════════════════════════════════════════════════════════
// 6. 로딩 화면
// ═════════════════════════════════════════════════════════════════════════════
export const SCREEN = {
  loading: {
    root:  'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center',
    inner: 'text-center',
    text:  'text-xl text-gray-600',

    // 로딩 화면 배경 이미지
    // ex) backgroundImage: '/img/backgrounds/loading-bg.png',
    backgroundImage:      null,
    backgroundSize:       'cover',
    backgroundPosition:   'center',
    backgroundRepeat:     'no-repeat',
    backgroundAttachment: 'fixed',

    // 로딩 화면 오버레이
    overlayColor: null,

    // 로딩 스피너 대신 이미지를 쓸 경우
    // ex) spinnerImage: '/img/loading/pokeball-spin.gif',
    spinnerImage:      null,
    spinnerImageClass: 'w-16 h-16 mx-auto mb-4',
  },

  maintenance: {
    root:   'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4',
    card:   'bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center',
    title:  'text-2xl font-bold text-gray-800 mb-4',
    body:   'text-gray-600 mb-6',
    button: 'bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors',

    // 점검 화면 배경 이미지
    // ex) backgroundImage: '/img/backgrounds/maintenance-bg.png',
    backgroundImage:      null,
    backgroundSize:       'cover',
    backgroundPosition:   'center',
    backgroundRepeat:     'no-repeat',
    backgroundAttachment: 'fixed',

    overlayColor: null,

    // 점검 아이콘 대신 이미지
    // ex) iconImage: '/img/maintenance/wrench.png',
    iconImage:      null,
    iconImageClass: 'w-16 h-16 mx-auto mb-4',
  },
};


// ═════════════════════════════════════════════════════════════════════════════
// 7. 모바일 레이아웃
// ═════════════════════════════════════════════════════════════════════════════
export const MOBILE = {
  // 모바일 전체 루트 배경
  root: 'h-screen flex flex-col bg-gray-50',

  // ex) backgroundImage: '/img/backgrounds/mobile-bg.png',
  backgroundImage:      null,
  backgroundSize:       'cover',
  backgroundPosition:   'center',
  backgroundRepeat:     'no-repeat',
  backgroundAttachment: 'fixed',
  overlayColor:         null,

  header: {
    root:       'bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40',
    menuButton: 'p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700',
    title:      'text-lg font-bold text-gray-800',
    statBadge:  'bg-green-50 px-3 py-1 rounded-lg border border-green-200',
    statText:   'text-xs font-bold text-green-700',

    // 모바일 헤더 배경 이미지
    // ex) backgroundImage: '/img/backgrounds/mobile-header-bg.png',
    backgroundImage:    null,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
    backgroundRepeat:   'no-repeat',
    overlayColor:       null,
  },

  main: 'flex-1 overflow-y-auto',

  bottomNav: {
    root:     'bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center sticky bottom-0 z-40',
    button:   'flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[60px]',
    active:   'text-indigo-600 bg-indigo-50',
    inactive: 'text-gray-500',
    label:    'text-xs font-semibold mt-1',

    // 하단 탭바 배경 이미지
    // ex) backgroundImage: '/img/backgrounds/bottom-nav-bg.png',
    backgroundImage:    null,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
    backgroundRepeat:   'no-repeat',
    overlayColor:       null,
  },

  drawer: {
    overlay:      'fixed inset-0 bg-black bg-opacity-50 z-50',
    panel:        'fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 flex flex-col',
    header:       'bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6',
    headerTop:    'flex items-center justify-between mb-4',
    headerTitle:  'text-xl font-bold',
    closeButton:  'p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors',
    trainerName:  'font-semibold text-sm',
    trainerMoney: 'text-indigo-200 text-sm',
    soundSection: 'p-4 border-b border-gray-200',
    nav:          'flex-1 p-4 space-y-2 overflow-y-auto',
    footer:       'p-4 border-t border-gray-200',

    // 드로어 패널 배경 이미지 (왼쪽에서 나오는 메뉴 전체)
    // ex) backgroundImage: '/img/backgrounds/drawer-bg.png',
    backgroundImage:    null,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
    backgroundRepeat:   'no-repeat',
    overlayColor:       null,

    // 드로어 헤더 영역 배경 이미지 (그라디언트 영역)
    // ex) headerBackgroundImage: '/img/backgrounds/drawer-header-bg.png',
    headerBackgroundImage:    null,
    headerBackgroundSize:     'cover',
    headerBackgroundPosition: 'center',
    headerBackgroundRepeat:   'no-repeat',
    headerOverlayColor:       null,
  },
};
