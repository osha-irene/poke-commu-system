// src/hooks/useGameState.js - 리팩토링 버전
// 모든 게임 로직을 통합하는 메인 훅

import { useState, useEffect } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

// 데이터 (JSON 파일들 먼저)
import pokemonData from '../data/pokemon.json';
import allPokemonDataRaw from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import movesData from '../data/moves.json';

// 의존성 없는 기본 훅들 (순서 중요!)
import { useIndividualValues } from './game/useIndividualValues';

// 데이터 레이어 훅들
import { useGameData } from './data/useGameData';
import { useMembers } from './members/useMembers';

// 인증 레이어
import { useAuth } from './auth/useAuth';

// 게임 로직 훅들
import { useShop } from './shop/useShop';
import { useMoves } from './moves/useMoves';
import { useEvolution } from './pokemon/useEvolution';
import usePokemonManagement from './pokemon/usePokemonManagement';
import { useLoot } from './game/useLoot';
import { usePokedex } from './game/usePokedex';
import { useRecipes } from './game/useRecipes';
import { usePokemonCatch } from './game/usePokemonCatch';
import { useRegionExplore } from './game/useRegionExplore';
import { useItemEffects } from './items/useItemEffects';

// 관리자 훅들 (맨 마지막)
import { useAdminMembers } from './admin/useAdminMembers';
import { useAdminRegions } from './admin/useAdminRegions';
import { useAdminItems } from './admin/useAdminItems';

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);
  
  const [allPokemon] = useState(pokemonData.pokemon);
  const allPokemonDataParsed = Array.isArray(allPokemonDataRaw) 
    ? allPokemonDataRaw 
    : (allPokemonDataRaw.pokemon || []);
  const [allPokemonMaster] = useState(allPokemonDataParsed);
  const [allMoves] = useState(movesData.moves || []);
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {});

  // 기본 데이터 & 인증
  const {
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
    updatePokedexMemo: gameDataUpdatePokedexMemo
  } = useGameData(allPokemonDataParsed);

  const { members, setMembers, isLoading: isMembersLoading } = useMembers(allPokemonDataParsed);

  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    isLoading: isAuthLoading
  } = useAuth(members, setMembers);

  // 상점
  const {
    shopData,
    updateShopData,
    sellItem,
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    handlePurchase
  } = useShop(currentUser, updateCurrentUser, allItems);

  // 기술
  const movesHook = useMoves(currentUser, updateCurrentUser, allMoves, pokemonLearnsets);

  // 진화
  const evolutionHook = useEvolution(
    currentUser,
    updateCurrentUser,
    allPokemonMaster
  );

  // 포켓몬 관리
  const pokemonManagement = usePokemonManagement(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    setSharedPokedexData,
    sharedPokedexData,
    pokemonLearnsets,
    allMoves,
    evolutionHook.checkEvolutionOnLevelUp 
  );

  // 관리자 기능 (3개 훅으로 분리)
  const adminMembers = useAdminMembers(
    currentUser,
    members,
    setMembers,
    updateCurrentUser,
    allItems,
    allPokemonMaster
  );

  const adminRegions = useAdminRegions(
    currentUser,
    regions,
    setRegions,
    setGamePokedex,
    allPokemonMaster,
    allPokemon
  );

  const adminItems = useAdminItems(
    currentUser,
    members,
    setMembers,
    updateCurrentUser,
    allItems
  );

  // 개체값
  const individualValues = useIndividualValues();

  // 전리품
  const lootHook = useLoot(currentUser, updateCurrentUser, setMembers, allItems);

  // 도감
  const pokedexHook = usePokedex(sharedPokedexData, setSharedPokedexData, currentUser);

  // 레시피
  const recipesHook = useRecipes(currentUser, updateCurrentUser);

  // 포켓몬 잡기
  const pokemonCatchHook = usePokemonCatch(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    allItems,
    allMoves,
    movesData,
    individualValues,
    movesHook,
    pokedexHook
  );

  // 지역 탐험
  const regionExploreHook = useRegionExplore(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    gamePokedex,
    lootHook,
    pokedexHook
  );

  // 아이템 효과 (useRareCandy를 직접 전달)
  const itemEffectsHook = useItemEffects(
    currentUser,
    updateCurrentUser,
    allItems,
    allMoves,
    pokemonLearnsets,
    movesHook,
    evolutionHook,
    pokemonManagement.useRareCandy
  );

  // 매일 자정 산책 횟수 리셋
  useEffect(() => {
    if (!currentUser) return;

    const checkAndResetWalks = async () => {
      try {
        const lastResetRef = ref(database, 'gameData/lastWalkReset');
        const snapshot = await get(lastResetRef);
        const lastReset = snapshot.exists() ? snapshot.val() : null;
        const today = new Date().toDateString();
        
        if (lastReset !== today) {
          const membersRef = ref(database, 'members');
          const membersSnapshot = await get(membersRef);
          
          if (membersSnapshot.exists()) {
            const membersData = membersSnapshot.val();
            const updates = {};
            
            Object.keys(membersData).forEach(id => {
              updates[`members/${id}/dailyWalks`] = membersData[id].maxDailyWalks;
            });
            
            await update(ref(database), updates);
            await set(lastResetRef, today);
            
            console.log('✅ 모든 회원 산책 횟수 리셋 완료');
          }
        }
      } catch (error) {
        console.error('산책 횟수 리셋 실패:', error);
      }
    };

    checkAndResetWalks();
    const interval = setInterval(checkAndResetWalks, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // 지역 클릭 핸들러
  const handleRegionClick = (region) => {
    return regionExploreHook.handleRegionClick(region, setEncounterPokemon, allItems);
  };

  // 조우 닫기
  const handleCloseEncounter = () => {
    setEncounterPokemon(null);
  };

  // 포켓몬 잡기
  const handleCatchSuccess = async (pokemon, ballUsed) => {
    const result = await pokemonCatchHook.handleCatchSuccess(
      pokemon,
      ballUsed,
      pokemon.regionName,
      regions
    );
    
    if (result && result.isFirstCatch) {
      setFirstCatchPokemon(result.pokemonTemplate);
    }
  };

  // 첫 포획 메모 저장
  const saveFirstCatchMemo = async (pokemonNumber, memo) => {
    await pokedexHook.savePokedexMemo(pokemonNumber, memo);
    setFirstCatchPokemon(null);
  };

  // 첫 포획 메모 건너뛰기
  const skipFirstCatchMemo = async (pokemonNumber) => {
    await pokedexHook.savePokedexMemo(pokemonNumber, null);
    setFirstCatchPokemon(null);
  };

  // 커스텀 아이템 생성 (adminItems 훅 사용)
  const createCustomItem = async (itemData) => {
    console.log('🎯 useGameState createCustomItem 호출');
    
    const result = await adminItems.createCustomItem(itemData);
    
    if (result) {
      try {
        const customItemsRef = ref(database, 'gameData/customItems');
        const snapshot = await get(customItemsRef);
        const customItems = snapshot.exists() ? snapshot.val() : [];
        
        const baseItems = itemsData.items;
        const updatedAllItems = [...baseItems, ...customItems];
        
        setAllItems(updatedAllItems);
        
      } catch (error) {
        console.error('❌ 커스텀 아이템 로드 실패:', error);
      }
    }
    
    return result;
  };

  const { useRareCandy, ...restPokemonManagement } = pokemonManagement;

  return {
    currentTab,
    setCurrentTab,
    currentUser,
    isAdmin: currentUser?.isAdmin || false,
    trainer: currentUser || {},
    caughtPokemon: currentUser?.caughtPokemon || [],
    items: currentUser?.inventory || [],
    encounterPokemon,
    firstCatchPokemon,
    regions,
    setRegions,
    allPokemon,
    allPokemonMaster,
    allItems,
    members,
    gamePokedex,
    sharedPokedexData,
    shopData,
    allMoves,
    pokemonLearnsets,
    maintenanceMode,
    setMembers,
    isMembersLoading,
    setMaintenanceMode,
    updateShopData,
    handleLogin,
    handleLogout,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    handlePurchase,
    createCustomItem,
    applyLoot: lootHook.applyLoot,
    updateRegionLootConfig: (regionId, lootConfig) => 
      lootHook.updateRegionLootConfig(regionId, lootConfig, regions, setRegions),
    updatePokedexRegions: pokedexHook.updatePokedexRegions,
    useItemOnPokemon: itemEffectsHook.useItemOnPokemon,
    evolutionModal: evolutionHook.evolutionModal,
    acceptEvolution: evolutionHook.acceptEvolution,
    cancelEvolution: evolutionHook.cancelEvolution,
    checkEvolution: evolutionHook.checkEvolution,
    manualEvolve: evolutionHook.manualEvolve,
    increaseEffort: pokemonManagement.increaseEffort,
    recipes: recipesHook.recipes,
    discoveredRecipes: recipesHook.discoveredRecipes,
    createRecipe: recipesHook.createRecipe,
    deleteRecipe: recipesHook.deleteRecipe,
    cookRecipe: recipesHook.cookRecipe,
    discoverRecipe: recipesHook.discoverRecipe,
    updateIngredientStats: recipesHook.updateIngredientStats,
    updateCurrentUser,
    isAuthLoading,
    updatePokedexMemo: (pokemonNumber, memo) => 
      gameDataUpdatePokedexMemo(pokemonNumber, memo, currentUser),
    
    // 포켓몬 관리
    movePokemonToParty: restPokemonManagement.movePokemonToParty,
    movePokemonToBox: restPokemonManagement.movePokemonToBox,
    releasePokemon: restPokemonManagement.releasePokemon,
    reorderPartyPokemon: restPokemonManagement.reorderPartyPokemon,
    useRareCandy: useRareCandy,
    updatePokemonNickname: restPokemonManagement.updatePokemonNickname,
    setPartnerPokemon: restPokemonManagement.setPartnerPokemon,
    giveItemToPokemon: restPokemonManagement.giveItemToPokemon,
    takeItemFromPokemon: restPokemonManagement.takeItemFromPokemon,
    
    // 기술 관리
    learnMove: movesHook.learnMove,
    forgetMove: movesHook.forgetMove,
    replaceMove: movesHook.replaceMove,
    giveMoveToPokemon: movesHook.learnMove,
    getAvailableMovesForLevel: movesHook.getAvailableMovesForLevel,
    getAllLearnableMoves: movesHook.getAllLearnableMoves,
    
    // 상점 관리
    sellItem,
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    
    // 관리자 기능 - 회원 관리
    ...adminMembers,
    
    // 관리자 기능 - 지역 관리
    ...adminRegions,
    
    // 관리자 기능 - 아이템 관리
    addItemToSelf: adminItems.addItemToSelf,
    giveItemToMember: adminItems.giveItemToMember
  };
}