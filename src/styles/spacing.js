// src/styles/spacing.js
// 간격, 모서리, 그림자 — 교체 시 이 파일만 수정

export const SPACING = {
  xs:   '0.25rem',  // 4px
  sm:   '0.5rem',   // 8px
  md:   '1rem',     // 16px
  lg:   '1.5rem',   // 24px
  xl:   '2rem',     // 32px
  '2xl':'3rem',     // 48px
};

export const RADIUS = {
  sm:   '0.375rem', // 6px
  md:   '0.5rem',   // 8px
  lg:   '0.75rem',  // 12px
  xl:   '1rem',     // 16px
  full: '9999px',
};

export const SHADOW = {
  sm:   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  md:   '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg:   '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl:   '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

export const TRANSITION = {
  fast:   '150ms ease',
  base:   '200ms ease',
  slow:   '300ms ease',
};
