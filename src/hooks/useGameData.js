import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';

export const useGameData = (allPokemonData) => {
  // 아이템 데이터 - 기본 + 커스텀 합치기
  const [allItems, setAllItems] = useState(() => {
    const baseItems = itemsData.items;
    const customItems = loadFromStorage('poke_customItems', customItemsData.items || []);
    console.log('📦 전체 아이템 로딩:', baseItems.length + customItems.length, '개');
    console.log('🎨 커스텀 아이템:', customItems);
    return [...baseItems, ...customItems];
  });

  // 구역 설정
  const [regions, setRegions] = useState(() => {
    const saved = loadFromStorage('poke_regions', null);
    if (saved) return saved;
    
    return regionsData.regions.map(region => ({
      ...region,
      pokemons: region.defaultPokemon
    }));
  });

  // 게임 도감 설정
  const [gamePokedex, setGamePokedex] = useState(() => {
    const saved = loadFromStorage('poke_gamePokedex', null);
    if (saved) return saved;
    
    return allPokemonData
      .filter(p => parseInt(p.generation) === 1)
      .map((p, index) => ({
        ...p,
        originalNumber: p.number,
        newNumber: index + 1
      }));
  });

  // 전체 공유 도감 데이터
  const [sharedPokedexData, setSharedPokedexData] = useState(() => 
    loadFromStorage('poke_sharedPokedex', {})
  );

  // 점검 모드
  const [maintenanceMode, setMaintenanceMode] = useState(() => 
    loadFromStorage('poke_maintenanceMode', false)
  );

  // 자동 저장
  useEffect(() => { 
    saveToStorage('poke_regions', regions); 
  }, [regions]);
  
  useEffect(() => { 
    saveToStorage('poke_gamePokedex', gamePokedex); 
  }, [gamePokedex]);
  
  useEffect(() => { 
    saveToStorage('poke_sharedPokedex', sharedPokedexData); 
  }, [sharedPokedexData]);
  
  useEffect(() => { 
    saveToStorage('poke_maintenanceMode', maintenanceMode); 
  }, [maintenanceMode]);

  const updatePokedexMemo = (pokemonNumber, memo, currentUser) => {
    const entry = sharedPokedexData[pokemonNumber];
    if (!entry || entry.firstCatcher !== currentUser.name) {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
      return;
    }
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: { ...prev[pokemonNumber], memo: memo }
    }));
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
    updatePokedexMemo
  };
};