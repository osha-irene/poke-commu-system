// src/hooks/admin/useAdminRegions.js
// 지역 및 마을 관리 전용 훅

import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

export const useAdminRegions = (
  currentUser,
  regions,
  setRegions,
  setGamePokedex,
  allPokemonMaster,
  allPokemon
) => {

  // ========== 지역 추가 ==========
  const addRegion = async (newRegion) => {
    if (!currentUser?.isAdmin) return;
    
    setRegions(prev => [...prev, newRegion]);
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      const updatedRegions = [...(currentConfig.regions || []), newRegion];
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 지역 추가 완료:', newRegion.id);
    } catch (error) {
      console.error('❌ 지역 추가 실패:', error);
    }
  };

  // ========== 지역 삭제 ==========
  const deleteRegion = async (regionId) => {
    if (!currentUser?.isAdmin) return;
    
    setRegions(prev => prev.filter(r => r.id !== regionId));
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      const updatedRegions = (currentConfig.regions || []).filter(r => r.id !== regionId);
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 지역 삭제 완료:', regionId);
    } catch (error) {
      console.error('❌ 지역 삭제 실패:', error);
    }
  };

  // ========== 지역 포켓몬 업데이트 ==========
  const updateRegionPokemon = async (regionId, updatedData) => {
    if (!currentUser?.isAdmin) return;
    
    const updateObj = {
      pokemons: Array.isArray(updatedData.pokemons) 
        ? updatedData.pokemons 
        : [],
      pokemonRates: updatedData.pokemonRates || {},
      encounterRate: updatedData.encounterRate !== undefined 
        ? updatedData.encounterRate 
        : 0.5,
      minLevel: updatedData.minLevel || 5,
      maxLevel: updatedData.maxLevel || 20,
      shinyRate: updatedData.shinyRate || 4096,
      allowNationalPokedex: updatedData.allowNationalPokedex !== undefined 
        ? updatedData.allowNationalPokedex 
        : false,
      groupId: updatedData.groupId !== undefined ? updatedData.groupId : null,
      groupName: updatedData.groupName !== undefined ? updatedData.groupName : null,
      areaName: updatedData.areaName !== undefined ? updatedData.areaName : null,
      groupVisible: updatedData.groupVisible !== undefined ? updatedData.groupVisible : true,
      isDefaultTown: updatedData.isDefaultTown !== undefined ? updatedData.isDefaultTown : false,
      name: updatedData.name || updatedData.name
    };
    
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { ...region, ...updateObj } 
        : region
    ));
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      const updatedRegions = (currentConfig.regions || []).map(r =>
        r.id === regionId ? { ...r, ...updateObj } : r
      );
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 지역 업데이트 완료:', regionId);
    } catch (error) {
      console.error('❌ 지역 업데이트 실패:', error);
    }
  };

  // ========== 마을 생성 ==========
  const createTown = async (townData) => {
    if (!currentUser?.isAdmin) return;
    
    let updatedRegions = Array.isArray(regions) ? [...regions] : [];
    
    // 기본 마을 설정 시 기존 기본 마을 해제
    if (townData.isDefaultTown) {
      updatedRegions = updatedRegions.map(r => 
        r.isDefaultTown ? { ...r, isDefaultTown: false } : r
      );
    }
    
    // 마을 메타데이터 지역 생성
    const townMetaRegion = {
      id: `town_meta_${townData.groupId}`,
      name: `[마을] ${townData.groupName}`,
      groupId: townData.groupId,
      groupName: townData.groupName,
      x: townData.x,
      y: townData.y,
      color: townData.color,
      isDefaultTown: townData.isDefaultTown,
      groupVisible: true,
      isTownMeta: true,
      pokemons: [],
      encounterRate: 0,
      minLevel: 1,
      maxLevel: 1,
      description: '마을 정보 (탐험 불가)'
    };
    
    updatedRegions.push(townMetaRegion);
    setRegions(updatedRegions);
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      // 마을 정보를 towns 배열에도 저장
      const townsRef = ref(database, 'gameData/towns');
      const townsSnapshot = await get(townsRef);
      const currentTowns = townsSnapshot.exists() ? townsSnapshot.val() : [];
      
      const newTowns = [...currentTowns, townData];
      await set(townsRef, newTowns);
      
      console.log('✅ 마을 생성 완료:', townData);
      alert(`마을 "${townData.groupName}"이(가) 생성되었습니다!\n\n이제 지역 관리에서 구역을 이 마을에 연결할 수 있습니다.`);
    } catch (error) {
      console.error('❌ 마을 생성 실패:', error);
      alert('마을 생성 중 오류가 발생했습니다.');
    }
  };

  // ========== 마을 수정 ==========
  const updateTown = async (groupId, townData) => {
    if (!currentUser?.isAdmin) return;
    
    let updatedRegions = Array.isArray(regions) ? [...regions] : [];
    
    // 해당 마을에 속한 모든 지역 업데이트
    updatedRegions = updatedRegions.map(region => {
      if (region.groupId === groupId) {
        return {
          ...region,
          groupName: townData.groupName,
          x: townData.x,
          y: townData.y,
          color: townData.color,
          isDefaultTown: townData.isDefaultTown,
          groupVisible: townData.visible !== undefined ? townData.visible : region.groupVisible
        };
      }
      // 다른 마을의 기본 설정 해제
      if (townData.isDefaultTown && region.isDefaultTown && region.groupId !== groupId) {
        return { ...region, isDefaultTown: false };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 마을 수정 완료:', groupId);
    } catch (error) {
      console.error('❌ 마을 수정 실패:', error);
    }
  };

  // ========== 마을 삭제 ==========
  const deleteTown = async (groupId) => {
    if (!currentUser?.isAdmin) return;
    
    // 해당 마을에 속한 모든 지역의 연결 해제
    const updatedRegions = regions.map(region => {
      if (region.groupId === groupId) {
        return {
          ...region,
          groupId: null,
          groupName: null,
          areaName: null,
          isDefaultTown: false
        };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      await set(configRef, {
        ...currentConfig,
        regions: updatedRegions
      });
      
      console.log('✅ 마을 삭제 완료:', groupId);
      alert('마을이 삭제되었습니다!');
    } catch (error) {
      console.error('❌ 마을 삭제 실패:', error);
    }
  };

  // ========== 게임 도감 업데이트 ==========
  const updateGamePokedex = async (selectedPokemonNumbers) => {
    if (!currentUser?.isAdmin) return;
    
    console.log('도감 업데이트 시작');
    console.log('  - 입력 번호:', selectedPokemonNumbers);
    
    const newPokedex = selectedPokemonNumbers
      .map(num => {
        const found = allPokemonMaster.find(p => 
          p.originalNumber === num || p.number === num
        );
        console.log(`  - 번호 ${num} 검색 결과:`, found?.name);
        return found;
      })
      .filter(Boolean)
      .filter(p => !p.isTownMeta && !p.groupId && p.name && p.number)
      .sort((a, b) => (a.originalNumber || a.number) - (b.originalNumber || b.number))
      .map((p, index) => ({ 
        ...p, 
        originalNumber: p.originalNumber || p.number, 
        newNumber: index + 1 
      }));
    
    console.log('  - 최종 도감:', newPokedex.length, '종');
    console.log('  - 샘플:', newPokedex.slice(0, 5).map(p => ({ name: p.name, number: p.number, originalNumber: p.originalNumber })));
    
    setGamePokedex(newPokedex);
    
    const validPokemonNumbers = new Set(selectedPokemonNumbers);
    
    // 지역에서 도감에 없는 포켓몬 제거
    const updatedRegions = regions.map(region => ({
      ...region,
      pokemons: (region.pokemons || []).filter(pokemonId => {
        const pokemon = allPokemon.find(p => p.id === pokemonId);
        if (pokemon) return validPokemonNumbers.has(pokemon.number);
        return validPokemonNumbers.has(pokemonId);
      })
    }));
    
    setRegions(updatedRegions);
    
    try {
      const configRef = ref(database, 'gameData/config');
      const snapshot = await get(configRef);
      const currentConfig = snapshot.val() || {};
      
      await set(configRef, {
        ...currentConfig,
        pokedex: newPokedex,
        regions: updatedRegions
      });
      
      console.log('✅ 게임 도감 업데이트 완료');
      alert('✅ 게임 도감이 업데이트되었습니다!\n도감에서 제거된 포켓몬은 구역에서도 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 도감 업데이트 실패:', error);
      alert('도감 업데이트 중 오류가 발생했습니다.');
    }
  };

  return {
    addRegion,
    deleteRegion,
    updateRegionPokemon,
    createTown,
    updateTown,
    deleteTown,
    updateGamePokedex
  };
};