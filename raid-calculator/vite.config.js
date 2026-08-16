import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri(beforeDevCommand/beforeBuildCommand)로 실행될 때는 TAURI_ENV_PLATFORM이 설정된다.
// 이때는 앱이 tauri:// 커스텀 프로토콜 루트에서 정적 파일을 그대로 서빙하므로 상대 경로(./)가
// 필요하고, outDir도 src-tauri가 기대하는 ../dist로 맞춘다. 그 외(웹 배포)에는 기존처럼
// 메인 사이트(poke-commu-system)의 /raid-calculator/ 하위 경로로 함께 배포된다.
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  base: isTauri ? './' : '/raid-calculator/',
  plugins: [react()],
  build: {
    outDir: isTauri ? 'dist' : '../public/raid-calculator',
    emptyOutDir: true,
  },
});
