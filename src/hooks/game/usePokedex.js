// src/hooks/game/usePokedex.js
// 도감 관리 시스템

import { ref, set } from 'firebase/database';
import { database } from '../../firebase';

export const usePokedex = (sharedPokedexData, setSharedPokedexData, currentUser) => {
  
  // 첫 조우 기록
  const recordFirstEncounter = async (pokemonNumber, regionName) => {
    const numericKey = String(pokemonNumber);
    const isFirstEncounter = !sharedPokedexData[numericKey];
    
    if (isFirstEncounter) {
      const newEntry = {
        firstEncounter: currentUser.name,
        encounteredAt: new Date().toISOString(),
        caughtBy: null,
        caughtAt: null,
        memo: null,
        regions: [regionName]
      };
      
      setSharedPokedexData(prev => ({
        ...prev,
        [numericKey]: newEntry
      }));
      
      try {
        const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
        await set(pokedexRef, newEntry);
        console.log('✅ 첫 조우 기록 완료:', numericKey);
      } catch (error) {
        console.error('❌ 도감 데이터 저장 실패:', error);
      }
    } else {
      // 지역 추가
      const entry = sharedPokedexData[numericKey];
      const currentRegions = entry?.regions || [];
      
      if (!currentRegions.includes(regionName)) {
        const updatedEntry = {
          ...entry,
          regions: [...currentRegions, regionName]
        };
        
        setSharedPokedexData(prev => ({
          ...prev,
          [numericKey]: updatedEntry
        }));
        
        try {
          const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
          await set(pokedexRef, updatedEntry);
          console.log('✅ 지역 추가 완료:', numericKey, regionName);
        } catch (error) {
          console.error('❌ 도감 데이터 저장 실패:', error);
        }
      }
    }
  };

  // 첫 포획 기록
  const recordFirstCatch = async (pokemonNumber) => {
    const numericKey = String(pokemonNumber);
    const entry = sharedPokedexData[numericKey] || {};
    
    if (!entry.firstCatcher) {
      const updatedEntry = {
        ...entry,
        firstEncounter: entry.firstEncounter || currentUser.name,
        encounteredAt: entry.encounteredAt || new Date().toISOString(),
        firstCatcher: currentUser.name,
        caughtBy: currentUser.name,
        caughtAt: new Date().toISOString(),
        regions: entry.regions || []
      };
      
      setSharedPokedexData(prev => ({
        ...prev,
        [numericKey]: updatedEntry
      }));
        
      try {
        const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
        await set(pokedexRef, updatedEntry);
        console.log('✅ 첫 포획 기록 완료:', numericKey);
        return true; // 첫 포획임을 알림
      } catch (error) {
        console.error('❌ 도감 데이터 저장 실패:', error);
      }
    }
    return false;
  };

  // 메모 저장
  const savePokedexMemo = async (pokemonNumber, memo) => {
    const numericKey = String(pokemonNumber);
    
    const updatedEntry = {
      ...sharedPokedexData[numericKey],
      memo: memo || null
    };
    
    setSharedPokedexData(prev => ({
      ...prev,
      [numericKey]: updatedEntry
    }));
    
    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      await set(pokedexRef, updatedEntry);
      console.log('✅ 메모 저장 완료:', numericKey);
    } catch (error) {
      console.error('❌ 메모 저장 실패:', error);
    }
  };

  // 지역 정보 업데이트 (관리자)
  const updatePokedexRegions = async (pokemonNumber, regions) => {
    if (!currentUser?.isAdmin) return;
    
    const numericKey = String(pokemonNumber);
    
    const entry = sharedPokedexData[numericKey] || {};
    const updatedEntry = {
      ...entry,
      regions: regions,
      manuallyEdited: true
    };
    
    setSharedPokedexData(prev => ({
      ...prev,
      [numericKey]: updatedEntry
    }));
    
    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      await set(pokedexRef, updatedEntry);
      console.log('✅ 도감 지역 업데이트 완료:', numericKey);
    } catch (error) {
      console.error('❌ 도감 지역 업데이트 실패:', error);
    }
  };

  return {
    recordFirstEncounter,
    recordFirstCatch,
    savePokedexMemo,
    updatePokedexRegions
  };
};

export default usePokedex;