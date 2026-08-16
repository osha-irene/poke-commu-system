import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 메인 사이트(poke-commu-system)에 /raid-calculator/ 하위 경로로 함께 배포되도록
// base와 outDir을 메인 프로젝트의 public 폴더로 맞춘다. CRA(react-scripts build)가
// public/ 내용을 그대로 build/에 복사하므로, 이 프로젝트를 먼저 빌드해두면
// 메인 사이트 배포에 자동으로 포함된다.
export default defineConfig({
  base: '/raid-calculator/',
  plugins: [react()],
  build: {
    outDir: '../public/raid-calculator',
    emptyOutDir: true,
  },
});
