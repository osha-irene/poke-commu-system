// src/hooks/useGameData.js - Firebase 완전 버전 + TM 통합

import { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';
import itemsData from '../../data/items.json';
import regionsData from '../../data/regions.json';
import technicalMachinesData from '../../data/technicalMachines.json';
import { ITEM_POCKETS } from '../../utils/itemUtils';

export const useGameData = (allPokemonData) => {
  const [allItems, setAllItems] = useState([]);
  const [regions, setRegions] = useState([]);
  const [gamePokedex, setGamePokedex] = useState([]);
  const [sharedPokedexData, setSharedPokedexData] = useState({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase에서 데이터 로드
  useEffect(() => {
    const loadGameData = async () => {
      try {
        // 1. 커스텀 아이템 로드
        const customItemsRef = ref(database, 'gameData/customItems');
        const customSnapshot = await get(customItemsRef);
        const customItems = customSnapshot.exists() ? customSnapshot.val() : [];
        
        // 2. 기본 아이템 + TM 아이템 병합
        const baseItems = itemsData.items;
        const tmItems = technicalMachinesData.tms.map(tm => ({
            id: tm.id,
            name: tm.name,
            nameEn: tm.nameEn,
            category: ITEM_POCKETS.MACHINES,
            categoryData: {
              id: ITEM_POCKETS.MACHINES, 
              nameEn: 'machines',
              name: '기술머신',
              pocket: ITEM_POCKETS.MACHINES 
            },
          cost: 10000, // 기본 가격 (필요시 조정)
          sellPrice: 5000,
          canSell: true,
          effect: tm.description,
          description: tm.description,
          spriteUrl: tm.spriteUrl,
          imageUrl: tm.spriteUrl,
          // TM 전용 데이터
          tmNumber: tm.tmNumber,
          moveId: tm.moveId,
          type: tm.type,
          typeEn: tm.typeEn,
          moveCategory: tm.category,
          power: tm.power,
          accuracy: tm.accuracy,
          pp: tm.pp,
          isTM: true,
          generation: tm.generation
        }));
        
        const allItemsCombined = [...baseItems, ...tmItems, ...customItems];
        setAllItems(allItemsCombined);
        console.log('📦 전체 아이템 로딩:', allItemsCombined.length, '개');
        console.log('   - 기본 아이템:', baseItems.length, '개');
        console.log('   - TM:', tmItems.length, '개');
        console.log('   - 커스텀:', customItems.length, '개');

        // 3. 지역 데이터 로드
        const regionsRef = ref(database, 'gameData/regions');
        const regionsSnapshot = await get(regionsRef);
        if (regionsSnapshot.exists()) {
          setRegions(regionsSnapshot.val());
          console.log('💾 지역 데이터 로드:', regionsSnapshot.val().length, '개');
        } else {
          // 초기 데이터 설정
          const initialRegions = regionsData.regions.map(region => ({
            ...region,
            pokemons: region.defaultPokemon
          }));
          await set(regionsRef, initialRegions);
          setRegions(initialRegions);
          console.log('🔧 초기 지역 데이터 생성');
        }

        // 4. 게임 도감 로드
        const pokedexRef = ref(database, 'gameData/gamePokedex');
        const pokedexSnapshot = await get(pokedexRef);
        if (pokedexSnapshot.exists()) {
          setGamePokedex(pokedexSnapshot.val());
          console.log('📖 게임 도감 로드 완료:', pokedexSnapshot.val().length, '마리');
        } else {
          // 초기 데이터 설정 (1세대만)
          const initialPokedex = allPokemonData
            .filter(p => parseInt(p.generation) === 1)
            .map((p, index) => ({
              ...p,
              originalNumber: p.number,
              newNumber: index + 1
            }));
          await set(pokedexRef, initialPokedex);
          setGamePokedex(initialPokedex);
          console.log('🔧 초기 게임 도감 생성');
        }

        // 5. 공유 도감 로드
        const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
        const sharedSnapshot = await get(sharedPokedexRef);
        if (sharedSnapshot.exists()) {
          const sharedData = sharedSnapshot.val();
          
          // 데이터 검증
          const validatedData = {};
          Object.entries(sharedData).forEach(([key, value]) => {
            if (!isNaN(key) && typeof value === 'object' && value !== null) {
              validatedData[key] = value;
            } else {
              console.warn('⚠️ 잘못된 공유 도감 엔트리 발견:', key, value);
            }
          });
          
          setSharedPokedexData(validatedData);
          console.log('🌐 공유 도감 로드 완료:', Object.keys(validatedData).length, '개 엔트리');
        } else {
          setSharedPokedexData({});
          console.log('🔧 공유 도감 초기화');
        }

        // 6. 점검 모드 로드
        const maintenanceRef = ref(database, 'gameData/maintenanceMode');
        const maintenanceSnapshot = await get(maintenanceRef);
        if (maintenanceSnapshot.exists()) {
          setMaintenanceMode(maintenanceSnapshot.val());
        } else {
          await set(maintenanceRef, false);
          setMaintenanceMode(false);
        }
        console.log('🔧 점검 모드:', maintenanceSnapshot.exists() ? maintenanceSnapshot.val() : false);

        console.log('✅ 게임 데이터 로딩 완료!');
      } catch (error) {
        console.error('❌ 게임 데이터 로드 실패:', error);
        // 폴백: JSON 파일 사용
        const tmItems = technicalMachinesData.tms.map(tm => ({
          id: tm.id,
          name: tm.name,
          nameEn: tm.nameEn,
          category: 'machines',
          spriteUrl: tm.spriteUrl,
          isTM: true
        }));
        setAllItems([...itemsData.items, ...tmItems]);
        setRegions(regionsData.regions.map(r => ({ ...r, pokemons: r.defaultPokemon })));
        setGamePokedex(allPokemonData.filter(p => parseInt(p.generation) === 1));
        setSharedPokedexData({});
        setMaintenanceMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [allPokemonData]);

  // 🔥 지역 데이터 변경 시 Firebase에 저장
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

  // 🔥 게임 도감 변경 시 Firebase에 저장
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

  // 🔥 공유 도감 변경 시 Firebase에 저장
  useEffect(() => {
    const saveSharedPokedex = async () => {
      if (isLoading) return;
      
      try {
        const validatedData = {};
        let hasInvalidData = false;
        
        Object.entries(sharedPokedexData).forEach(([key, value]) => {
          if (!isNaN(key) && typeof value === 'object' && value !== null) {
            validatedData[key] = value;
          } else {
            console.error('❌ 잘못된 키 타입 발견:', key, typeof key, value);
            hasInvalidData = true;
          }
        });
        
        if (hasInvalidData) {
          console.error('❌ 공유 도감에 잘못된 데이터가 있습니다!');
          console.error('원본 데이터:', sharedPokedexData);
          return;
        }
        
        const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
        await set(sharedPokedexRef, validatedData);
        console.log('💾 공유 도감 저장:', Object.keys(validatedData).length, '개 엔트리');
      } catch (error) {
        console.error('❌ 공유 도감 저장 실패:', error);
        console.error('문제가 된 데이터:', sharedPokedexData);
      }
    };
    saveSharedPokedex();
  }, [sharedPokedexData, isLoading]);

  // 🔥 점검 모드 변경 시 Firebase에 저장
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

  const updatePokedexMemo = async (pokemonNumber, memo, currentUser) => {
    const numericKey = String(pokemonNumber);
    
    const entry = sharedPokedexData[numericKey];
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
      [numericKey]: updatedEntry
    }));
    
    // 🔥 Firebase에 직접 저장
    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      await set(pokedexRef, updatedEntry);
      console.log('✅ 메모 저장 완료:', numericKey);
    } catch (error) {
      console.error('❌ 메모 저장 실패:', error);
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