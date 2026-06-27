// src/hooks/useSound.js
// 사운드 관련 로직 훅

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';

export function useSound(currentUser) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 사운드 설정 로드
  useEffect(() => {
    const loadSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        const snapshot = await get(soundRef);
        
        if (snapshot.exists()) {
          setSoundEnabled(snapshot.val());
        }
      } catch (error) {
        console.error('사운드 설정 로드 실패:', error);
      }
    };

    loadSoundSettings();
  }, [currentUser?.id]);

  // 사운드 설정 저장
  useEffect(() => {
    const saveSoundSettings = async () => {
      if (!currentUser?.id) return;

      try {
        const soundRef = ref(database, `users/${currentUser.id}/settings/soundEnabled`);
        await set(soundRef, soundEnabled);
      } catch (error) {
        console.error('사운드 설정 저장 실패:', error);
      }
    };

    saveSoundSettings();
  }, [soundEnabled, currentUser?.id]);

  // 클릭 사운드 재생
  useEffect(() => {
    const basePath = window.location.pathname.includes('/poke-commu-system') 
      ? '/poke-commu-system' 
      : '';
    
    const audioPath = `${basePath}/sound/A-button.mp3`;
    const audio = new Audio(audioPath);
    audio.preload = 'auto';
    audio.volume = 0.5;

    const handleGlobalClick = () => {
      if (!soundEnabled) return;
      audio.currentTime = 0.2;
      audio.play().catch(() => {});
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [soundEnabled]);

  const toggleSound = () => setSoundEnabled(prev => !prev);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound
  };
}

export default useSound;
