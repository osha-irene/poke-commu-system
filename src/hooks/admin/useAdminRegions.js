// src/hooks/admin/useAdminRegions.js
// 吏??諛?留덉쓣 愿由??꾩슜 ??

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
  const persistRegions = async (updatedRegions, extraConfig = {}) => {
    await set(ref(database, 'gameData/regions'), updatedRegions);
    if (extraConfig.pokedex) {
      await set(ref(database, 'gameData/gamePokedex'), extraConfig.pokedex);
    }

    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};

    await set(configRef, {
      ...currentConfig,
      ...extraConfig,
      regions: updatedRegions
    });
  };

  // ========== 吏??異붽? ==========
  const addRegion = async (newRegion) => {
    if (!currentUser?.isAdmin) return;

    const updatedRegions = [...(Array.isArray(regions) ? regions : []), newRegion];
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);
      console.log('??吏??異붽? ?꾨즺:', newRegion.id);
    } catch (error) {
      console.error('??吏??異붽? ?ㅽ뙣:', error);
    }
  };

  // ========== 吏????젣 ==========
  const deleteRegion = async (regionId) => {
    if (!currentUser?.isAdmin) return;

    const updatedRegions = (Array.isArray(regions) ? regions : []).filter(r => r.id !== regionId);
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);
      console.log('??吏????젣 ?꾨즺:', regionId);
    } catch (error) {
      console.error('??吏????젣 ?ㅽ뙣:', error);
    }
  };

  // ========== 吏???ъ폆紐??낅뜲?댄듃 ==========
  const updateRegionPokemon = async (regionId, updatedData, legacyRates, legacyEncounterRate, legacyMinLevel, legacyMaxLevel, background) => {
    if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin) {
      console.error('❌ updateRegionPokemon: 관리자 권한 없음 (저장되지 않음)', currentUser);
      alert('관리자 권한이 없어 저장하지 못했습니다.');
      return false;
    }

    const existingRegion = regions.find(region => region.id === regionId) || {};
    const normalizedData = Array.isArray(updatedData)
      ? {
          ...existingRegion,
          pokemons: updatedData,
          pokemonRates: legacyRates || {},
          encounterRate: legacyEncounterRate,
          minLevel: legacyMinLevel,
          maxLevel: legacyMaxLevel,
          background: background !== undefined ? background : existingRegion.background,
        }
      : {
          ...existingRegion,
          ...(updatedData || {})
        };
    
    const updateObj = {
      pokemons: Array.isArray(normalizedData.pokemons) 
        ? normalizedData.pokemons 
        : [],
      pokemonRates: normalizedData.pokemonRates || {},
      encounterRate: normalizedData.encounterRate !== undefined 
        ? normalizedData.encounterRate 
        : 0.5,
      minLevel: normalizedData.minLevel || 5,
      maxLevel: normalizedData.maxLevel || 20,
      maxCatchRate: normalizedData.maxCatchRate !== undefined ? normalizedData.maxCatchRate : 1,
      shinyRate: normalizedData.shinyRate || 4096,
      allowNationalPokedex: normalizedData.allowNationalPokedex !== undefined 
        ? normalizedData.allowNationalPokedex 
        : false,
      groupId: normalizedData.groupId !== undefined ? normalizedData.groupId : null,
      groupName: normalizedData.groupName !== undefined ? normalizedData.groupName : null,
      areaName: normalizedData.areaName !== undefined ? normalizedData.areaName : null,
      groupVisible: normalizedData.groupVisible !== undefined ? normalizedData.groupVisible : true,
      visible: normalizedData.visible !== undefined ? normalizedData.visible : true,
      isDefaultTown: normalizedData.isDefaultTown !== undefined ? normalizedData.isDefaultTown : false,
      name: normalizedData.name !== undefined ? normalizedData.name : existingRegion.name,
      description: normalizedData.description !== undefined ? normalizedData.description : '',
      x: normalizedData.x !== undefined ? normalizedData.x : 50,
      y: normalizedData.y !== undefined ? normalizedData.y : 50,
      color: normalizedData.color || '#87CEEB',
      isCave: normalizedData.isCave === true,
      isWaterside: normalizedData.isWaterside === true,
      isSafari: normalizedData.isSafari === true,
      places: Array.isArray(normalizedData.places) ? normalizedData.places : [],
      pokemonFormConfig: normalizedData.pokemonFormConfig !== undefined ? normalizedData.pokemonFormConfig : {},
      lootConfig: normalizedData.lootConfig !== undefined
        ? normalizedData.lootConfig
        : (existingRegion.lootConfig !== undefined ? existingRegion.lootConfig : null),
      ...(normalizedData.background ? { background: normalizedData.background } : {}),
    };
    
    const updatedRegions = (Array.isArray(regions) ? regions : []).map(region => 
      region.id === regionId 
        ? { ...region, ...updateObj } 
        : region
    );

    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);
      console.log('region update complete:', regionId);
      return true;
    } catch (error) {
      console.error('region update failed:', error);
      alert('저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  // ========== 留덉쓣 ?앹꽦 ==========
  const createTown = async (townData) => {
    if (!currentUser?.isAdmin) return;
    
    let updatedRegions = Array.isArray(regions) ? [...regions] : [];
    
    // 湲곕낯 留덉쓣 ?ㅼ젙 ??湲곗〈 湲곕낯 留덉쓣 ?댁젣
    if (townData.isDefaultTown) {
      updatedRegions = updatedRegions.map(r => 
        r.isDefaultTown ? { ...r, isDefaultTown: false } : r
      );
    }
    
    // 留덉쓣 硫뷀??곗씠??吏???앹꽦
    const townMetaRegion = {
      id: `town_meta_${townData.groupId}`,
      name: `[마을] ${townData.groupName}`,
      groupId: townData.groupId,
      groupName: townData.groupName,
      x: townData.x,
      y: townData.y,
      color: townData.color,
      isDefaultTown: townData.isDefaultTown,
      townOrder: townData.townOrder ?? updatedRegions.filter(region => region.isTownMeta).length,
      groupVisible: true,
      isTownMeta: true,
      pokemons: [],
      encounterRate: 0,
      minLevel: 1,
      maxLevel: 1,
      description: '마을 정보 (탐험 불가)',
      places: []
    };
    
    updatedRegions.push(townMetaRegion);
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);
      
      // 留덉쓣 ?뺣낫瑜?towns 諛곗뿴?먮룄 ???
      const townsRef = ref(database, 'gameData/towns');
      const townsSnapshot = await get(townsRef);
      const currentTowns = townsSnapshot.exists() ? townsSnapshot.val() : [];
      
      const townList = Array.isArray(currentTowns) ? currentTowns : [];
      const nextTownData = {
        ...townData,
        townOrder: townData.townOrder ?? townMetaRegion.townOrder
      };
      const newTowns = [
        ...townList.filter(town => town.groupId !== townData.groupId),
        nextTownData
      ];
      await set(townsRef, newTowns);
      
      console.log('마을 생성 완료:', townData);
      alert(`마을 "${townData.groupName}"이(가) 생성되었습니다.`);
    } catch (error) {
      console.error('마을 생성 실패:', error);
      alert('마을 생성 중 오류가 발생했습니다.');
    }
  };

  // ========== 留덉쓣 ?섏젙 ==========
  const updateTown = async (groupId, townData) => {
    if (!currentUser?.isAdmin) return;
    
    let updatedRegions = Array.isArray(regions) ? [...regions] : [];
    
    // ?대떦 留덉쓣???랁븳 紐⑤뱺 吏???낅뜲?댄듃
    updatedRegions = updatedRegions.map(region => {
      if (region.groupId === groupId) {
        return {
          ...region,
          groupName: townData.groupName,
          x: townData.x,
          y: townData.y,
          color: townData.color,
          isDefaultTown: townData.isDefaultTown,
          townOrder: townData.townOrder !== undefined ? townData.townOrder : region.townOrder,
          groupVisible: townData.visible !== undefined ? townData.visible : region.groupVisible
        };
      }
      // ?ㅻⅨ 留덉쓣??湲곕낯 ?ㅼ젙 ?댁젣
      if (townData.isDefaultTown && region.isDefaultTown && region.groupId !== groupId) {
        return { ...region, isDefaultTown: false };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);

      const townsRef = ref(database, 'gameData/towns');
      const townsSnapshot = await get(townsRef);
      const currentTowns = townsSnapshot.exists() ? townsSnapshot.val() : [];
      if (Array.isArray(currentTowns) && currentTowns.length > 0) {
        const updatedTowns = currentTowns.map(town => {
          if (town.groupId === groupId) {
            return { ...town, ...townData };
          }
          if (townData.isDefaultTown) {
            return { ...town, isDefaultTown: false };
          }
          return town;
        });
        await set(townsRef, updatedTowns);
      }
      
      console.log('마을 수정 완료:', groupId);
    } catch (error) {
      console.error('마을 수정 실패:', error);
    }
  };

  // ========== 留덉쓣 ??젣 ==========
  const deleteTown = async (groupId) => {
    if (!currentUser?.isAdmin) return;
    
    const updatedRegions = (Array.isArray(regions) ? regions : [])
      .filter(region => !(region.isTownMeta && region.groupId === groupId))
      .map(region => {
      if (region.groupId === groupId) {
        return {
          ...region,
          groupId: null,
          groupName: null,
          areaName: null,
          isDefaultTown: false,
          groupVisible: true
        };
      }
      return region;
    });
    
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions);

      const townsRef = ref(database, 'gameData/towns');
      const townsSnapshot = await get(townsRef);
      const currentTowns = townsSnapshot.exists() ? townsSnapshot.val() : [];
      if (Array.isArray(currentTowns)) {
        await set(townsRef, currentTowns.filter(town => town.groupId !== groupId));
      }
      
      console.log('마을 삭제 완료:', groupId);
      alert('마을이 삭제되었습니다.');
    } catch (error) {
      console.error('마을 삭제 실패:', error);
    }
  };

  // ========== 寃뚯엫 ?꾧컧 ?낅뜲?댄듃 ==========
  const updateGamePokedex = async (selectedPokemonNumbers) => {
    if (!currentUser?.isAdmin) return;
    
    console.log('?꾧컧 ?낅뜲?댄듃 ?쒖옉');
    console.log('  - ?낅젰 踰덊샇:', selectedPokemonNumbers);
    
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
      .sort((a, b) => {
        const aDn = a.displayNumber || a.number;
        const bDn = b.displayNumber || b.number;
        if (aDn !== bDn) return aDn - bDn;
        return (a.isRegionalForm ? 1 : 0) - (b.isRegionalForm ? 1 : 0);
      })
      .reduce((acc, p, _i, arr) => {
        const dn = p.displayNumber || p.number;
        const prev = acc[acc.length - 1];
        const prevDn = prev ? (prev.displayNumber || prev.number) : null;
        const counter = prevDn === dn ? prev.newNumber : (prev ? prev.newNumber + 1 : 1);
        acc.push({ ...p, originalNumber: p.originalNumber || p.number, newNumber: counter });
        return acc;
      }, []);
    
    console.log('  - 최종 영운 도감:', newPokedex.length, '종');
    console.log('  - 샘플:', newPokedex.slice(0, 5).map(p => ({ name: p.name, number: p.number, originalNumber: p.originalNumber })));
    
    setGamePokedex(newPokedex);
    
    const validPokemonNumbers = new Set(selectedPokemonNumbers);
    
    // 지역에 도감에 없는 포켓몬 제거
    const isValidPokemonId = (pokemonId) => {
      const pokemon = allPokemon.find(p => p.id === pokemonId);
      if (pokemon) return validPokemonNumbers.has(pokemon.number);
      return validPokemonNumbers.has(pokemonId);
    };

    const updatedRegions = regions.map(region => ({
      ...region,
      pokemons: (region.pokemons || []).filter(isValidPokemonId),
      places: Array.isArray(region.places)
        ? region.places.map(place => ({
            ...place,
            pokemons: (place.pokemons || []).filter(isValidPokemonId)
          }))
        : []
    }));
    
    setRegions(updatedRegions);
    
    try {
      await persistRegions(updatedRegions, {
        pokedex: newPokedex,
      });
      
      console.log('영운 도감 업데이트 완료');
      alert('영운 도감이 업데이트되었습니다.\n도감에서 제거된 포켓몬은 구역에서도 삭제되었습니다.');
    } catch (error) {
      console.error('도감 업데이트 실패:', error);
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
