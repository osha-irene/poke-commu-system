// src/hooks/useGameData.js - Firebase 완전 버전 (수정됨)

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';

export const useGameData = (allPokemonData) => {
  // ✅ 수정: 초기값을 JSON 데이터로 설정
  const [allItems, setAllItems] = useState(() => {
    console.log('📦 초기 아이템 로딩:', itemsData?.items?.length || 0, '개');
    return itemsData?.items || [];
  });
  
  const [regions, setRegions] = useState([]);
  const [gamePokedex, setGamePokedex] = useState([]);
  const [sharedPokedexData, setSharedPokedexData] = useState({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase에서 모든 게임 데이터 로드
  useEffect(() => {
    const loadGameData = async () => {
      setIsLoading(true);
      console.log('🎮 게임 데이터 로딩 시작...');

      try {
        // 1. 커스텀 아이템 로드
        const customItemsRef = ref(database, 'gameData/customItems');
        const customSnapshot = await get(customItemsRef);
        const customItems = customSnapshot.exists() ? customSnapshot.val() : [];
        
        // ✅ 수정: itemsData.items가 undefined일 경우 대비
        const baseItems = itemsData?.items || [];
        const loadedItems = [...baseItems, ...customItems];
        
        setAllItems(loadedItems);
        console.log('📦 전체 아이템 로딩:', loadedItems.length, '개');
        console.log('  - 기본 아이템:', baseItems.length, '개');
        console.log('  - 커스텀 아이템:', customItems.length, '개');

        // 2. 지역 데이터 로드
        const regionsRef = ref(database, 'gameData/regions');
        const regionsSnapshot = await get(regionsRef);
        
        if (regionsSnapshot.exists()) {
          setRegions(regionsSnapshot.val());
          console.log('🗺️ 지역 데이터 로드 완료:', regionsSnapshot.val().length, '개');
        } else {
          // 초기 지역 데이터 생성
          const initialRegions = regionsData.regions.map(region => ({
            ...region,
            pokemons: region.defaultPokemon
          }));
          await set(regionsRef, initialRegions);
          setRegions(initialRegions);
          console.log('✅ 초기 지역 데이터 생성:', initialRegions.length, '개');
        }

        // 3. 게임 도감 로드
        const pokedexRef = ref(database, 'gameData/gamePokedex');
        const pokedexSnapshot = await get(pokedexRef);
        
        if (pokedexSnapshot.exists()) {
          setGamePokedex(pokedexSnapshot.val());
          console.log('📖 게임 도감 로드 완료:', pokedexSnapshot.val().length, '마리');
        } else {
          // 초기 도감 생성 (1세대)
          const initialPokedex = allPokemonData
            .filter(p => parseInt(p.generation) === 1)
            .map((p, index) => ({
              ...p,
              originalNumber: p.number,
              newNumber: index + 1
            }));
          await set(pokedexRef, initialPokedex);
          setGamePokedex(initialPokedex);
          console.log('✅ 초기 게임 도감 생성:', initialPokedex.length, '마리');
        }

        // 4. 공유 도감 데이터 로드
        const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
        const sharedSnapshot = await get(sharedPokedexRef);
        
        if (sharedSnapshot.exists()) {
          setSharedPokedexData(sharedSnapshot.val());
          console.log('🌐 공유 도감 로드 완료:', Object.keys(sharedSnapshot.val()).length, '개 엔트리');
        } else {
          console.log('ℹ️ 공유 도감 데이터 없음 (정상)');
        }

        // 5. 점검 모드 로드
        const maintenanceRef = ref(database, 'gameData/maintenanceMode');
        const maintenanceSnapshot = await get(maintenanceRef);
        
        if (maintenanceSnapshot.exists()) {
          setMaintenanceMode(maintenanceSnapshot.val());
          console.log('🔧 점검 모드:', maintenanceSnapshot.val());
        } else {
          await set(maintenanceRef, false);
          console.log('✅ 점검 모드 초기화: false');
        }

        console.log('✅ 게임 데이터 로딩 완료!');
      } catch (error) {
        console.error('❌ 게임 데이터 로드 실패:', error);
        
        // 폴백: JSON 파일 사용
        console.log('⚠️ 폴백: JSON 파일에서 로드');
        const baseItems = itemsData?.items || [];
        const customItems = customItemsData?.items || [];
        setAllItems([...baseItems, ...customItems]);
        
        setRegions(regionsData.regions.map(region => ({
          ...region,
          pokemons: region.defaultPokemon
        })));
        
        setGamePokedex(
          allPokemonData
            .filter(p => parseInt(p.generation) === 1)
            .map((p, index) => ({
              ...p,
              originalNumber: p.number,
              newNumber: index + 1
            }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [allPokemonData]);

  // 🔥 커스텀 아이템 변경 시 Firebase 저장
  useEffect(() => {
    const saveCustomItems = async () => {
      if (isLoading) return;

      try {
        const baseItemCount = itemsData?.items?.length || 0;
        const customItems = allItems.slice(baseItemCount);
        
        if (customItems.length > 0) {
          const customItemsRef = ref(database, 'gameData/customItems');
          await set(customItemsRef, customItems);
          console.log('💾 커스텀 아이템 저장:', customItems.length, '개');
        }
      } catch (error) {
        console.error('❌ 커스텀 아이템 저장 실패:', error);
      }
    };

    saveCustomItems();
  }, [allItems, isLoading]);

  // 🔥 지역 데이터 변경 시 Firebase 저장
  useEffect(() => {
    const saveRegions = async () => {
      if (isLoading || regions.length === 0) return;

      try {
        const regionsRef = ref(database, 'gameData/regions');
        await set(regionsRef, regions);
        console.log('💾 지역 데이터 저장:', regions.length, '개');
      } catch (error) {
        console.error('❌ 지역 데이터 저장 실패:', error);
      }
    };

    saveRegions();
  }, [regions, isLoading]);

  // 🔥 게임 도감 변경 시 Firebase 저장
  useEffect(() => {
    const saveGamePokedex = async () => {
      if (isLoading || gamePokedex.length === 0) return;

      try {
        const pokedexRef = ref(database, 'gameData/gamePokedex');
        await set(pokedexRef, gamePokedex);
        console.log('💾 게임 도감 저장:', gamePokedex.length, '마리');
      } catch (error) {
        console.error('❌ 게임 도감 저장 실패:', error);
      }
    };

    saveGamePokedex();
  }, [gamePokedex, isLoading]);

  // 🔥 공유 도감 변경 시 Firebase 저장
  useEffect(() => {
    const saveSharedPokedex = async () => {
      if (isLoading) return;

      try {
        const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
        await set(sharedPokedexRef, sharedPokedexData);
        console.log('💾 공유 도감 저장:', Object.keys(sharedPokedexData).length, '개 엔트리');
      } catch (error) {
        console.error('❌ 공유 도감 저장 실패:', error);
      }
    };

    saveSharedPokedex();
  }, [sharedPokedexData, isLoading]);

  // 🔥 점검 모드 변경 시 Firebase 저장
  useEffect(() => {
    const saveMaintenanceMode = async () => {
      if (isLoading) return;

      try {
        const maintenanceRef = ref(database, 'gameData/maintenanceMode');
        await set(maintenanceRef, maintenanceMode);
        console.log('💾 점검 모드 저장:', maintenanceMode);
      } catch (error) {
        console.error('❌ 점검 모드 저장 실패:', error);
      }
    };

    saveMaintenanceMode();
  }, [maintenanceMode, isLoading]);

  // 도감 메모 업데이트
  const updatePokedexMemo = async (pokemonNumber, memo, currentUser) => {
    const entry = sharedPokedexData[pokemonNumber];
    if (!entry || entry.firstCatcher !== currentUser.name) {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
      return;
    }

    const updatedEntry = {
      ...entry,
      memo: memo
    };

    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: updatedEntry
    }));

    // 즉시 Firebase에 저장
    try {
      const pokedexEntryRef = ref(database, `gameData/sharedPokedex/${pokemonNumber}`);
      await set(pokedexEntryRef, updatedEntry);
      console.log('✅ 도감 메모 저장 완료');
    } catch (error) {
      console.error('❌ 도감 메모 저장 실패:', error);
    }
  };

  return {
    allItems,
    setAllItems,
    regions,
    setRegions,
    gamePokedex,
    setGamePokedex,
    sharedPokedexData,
    setSharedPokedexData,
    maintenanceMode,
    setMaintenanceMode,
    updatePokedexMemo,
    isLoading
  };
};