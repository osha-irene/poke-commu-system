// src/hooks/useGameState.js - 리팩토링 버전
// 모든 게임 로직을 통합하는 메인 훅

import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

// 데이터 (JSON 파일들 먼저)
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
import { useCamping } from './game/useCamping';

// 관리자 훅들 (맨 마지막)
import { useAdminMembers } from './admin/useAdminMembers';
import { useAdminRegions } from './admin/useAdminRegions';
import { useAdminItems } from './admin/useAdminItems';
import { useAdminTitles } from './admin/useAdminTitles';

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl) return tabFromUrl;
    const s = window.history.state;
    return (s && s.tab) ? s.tab : 'home';
  });

  const navigateTab = useCallback((tab) => {
    const url = new URL(window.location.href);
    if (tab === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    url.searchParams.delete('member');
    window.history.pushState({ tab }, '', url.toString());
    setCurrentTab(tab);
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const params = new URLSearchParams(window.location.search);
      const tab = e.state?.tab || params.get('tab') || 'home';
      setCurrentTab(tab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);
  const [statSelectPending, setStatSelectPending] = useState(null); // { item, pokemon, type, amount }
  
  const allPokemonDataParsed = Array.isArray(allPokemonDataRaw) 
    ? allPokemonDataRaw 
    : (allPokemonDataRaw.pokemon || []);
  const [allPokemon] = useState(allPokemonDataParsed);
  const [allPokemonMaster] = useState(allPokemonDataParsed);
  const [allMoves] = useState(movesData.moves || []);
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {});
  const [loadFullMembers, setLoadFullMembers] = useState(false);

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
    maintenanceScheduledAt,
    scheduleMaintenanceMode,
    cancelScheduledMaintenance,
    systemSettings,
    updateSystemSettings,
    updatePokedexMemo: gameDataUpdatePokedexMemo
  } = useGameData(allPokemonDataParsed);

  const { members, memberViewMembers, setMembers, isLoading: isMembersLoading } = useMembers(allPokemonDataParsed, loadFullMembers);

  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    updateInventory,
    changeCurrentUserPassword,
    isLoading: isAuthLoading
  } = useAuth(members, setMembers, allPokemonDataParsed);

  useEffect(() => {
    setLoadFullMembers(Boolean(currentUser?.isAdmin || currentUser?.isSuperAdmin));
  }, [currentUser?.isAdmin, currentUser?.isSuperAdmin]);

  // 상점
  const {
    shopData,
    updateShopData,
    sellItem,
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent,
    handlePurchase
  } = useShop(currentUser, updateCurrentUser, allItems, updateInventory);

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
    evolutionHook.checkEvolutionOnLevelUp,
    updateInventory
  );
  
  // 캠핑 기능
  const campingHook = useCamping(
  currentUser,
  updateCurrentUser,
  allPokemonMaster,
  allItems
);

  // 관리자 기능 (3개 훅으로 분리)
  const adminMembers = useAdminMembers(
    currentUser,
    members,
    setMembers,
    updateCurrentUser,
    allItems,
    allPokemonMaster,
    systemSettings
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
    allItems,
    updateInventory
  );

  const adminTitles = useAdminTitles();

  // 개체값
  const individualValues = useIndividualValues();

  // 전리품
  const lootHook = useLoot(currentUser, updateCurrentUser, setMembers, allItems, members, updateInventory);

  // 도감
  const pokedexHook = usePokedex(sharedPokedexData, setSharedPokedexData, currentUser);

  // 레시피
  const recipesHook = useRecipes(currentUser, updateCurrentUser, updateInventory);

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
    pokedexHook,
    systemSettings
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
    pokemonManagement.useRareCandy,
    pokemonManagement.getPokemonFormCandidates,
    pokemonManagement.changePokemonForm,
    systemSettings,
    (item, pokemon, type, amount) => setStatSelectPending({ item, pokemon, type, amount })
  );

  const handleStatSelectComplete = (statKey) => {
    if (!statSelectPending) return;
    if (!statKey) {
      setStatSelectPending(null);
      return;
    }
    const { item, pokemon, type, amount } = statSelectPending;
    setStatSelectPending(null);
    if (type === 'effortEdit') {
      itemEffectsHook.useItemOnPokemon({
        ...item,
        specialEffect: 'effortEdit',
        effortOverride: statKey
      }, pokemon);
      return;
    }
    const boostedItem = type === 'conditionSelect'
      ? { ...item, specialEffect: null, conditionBoost: { [statKey]: amount } }
      : { ...item, specialEffect: null, evBoost: { [statKey]: amount } };
    itemEffectsHook.useItemOnPokemon(boostedItem, pokemon);
  };

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
    const exhaustedExp = Number(encounterPokemon?.pendingDailyExploreExhaustedExp) || 0;
    setEncounterPokemon(null);
    if (exhaustedExp > 0) {
      setTimeout(() => {
        alert(`오늘의 모든 탐험을 완료했습니다!\n경험치 ${exhaustedExp}을 받았습니다.`);
      }, 0);
    }
  };

  // 포켓몬 잡기
  // consumeBall=true 일 때: 볼 소모 + 포켓몬 추가를 한 번의 updateCurrentUser로 처리 (stale closure 방지)
  const handleCatchSuccess = async (pokemon, ballUsed, consumeBall = false) => {
    const result = await pokemonCatchHook.handleCatchSuccess(
      pokemon,
      ballUsed,
      pokemon.regionName,
      regions,
      consumeBall
    );

    // 사파리 구역 일일 보상: 포획 시 사파리볼 조용히 지급
    if (result && pokemon.pendingSafariBallReward > 0) {
      const safariBall = allItems.find(item => item.nameEn === 'safari-ball' || item.name === '사파리볼');
      if (safariBall) {
        await updateInventory((inventory) => {
          const idx = inventory.findIndex(i => i.id === safariBall.id || i.nameEn === safariBall.nameEn);
          if (idx >= 0) {
            return inventory.map((i, n) => n === idx ? { ...i, count: (i.count || 0) + pokemon.pendingSafariBallReward } : i);
          }
          return [...inventory, { ...safariBall, count: pokemon.pendingSafariBallReward }];
        });
      }
    }

    if (result && result.isFirstCatch) {
      const tpl = result.pokemonTemplate;
      setFirstCatchPokemon({
        ...tpl,
        name: (tpl.name || '').replace(/\s*\([^)]+\)\s*$/, '').trim() || tpl.name,
        memoPokemonNumber: result.pokemonNumber
      });
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

  const updateSelfTitle = async (titleId) => {
    if (!currentUser?.id) return;
    const titleValue = titleId === 'none' ? null : titleId;
    try {
      await update(ref(database, `members/${currentUser.id}`), { title: titleValue });
      await update(ref(database, `memberViewData/${currentUser.id}`), { title: titleValue });
      updateCurrentUser({ title: titleValue });
    } catch (e) {
      console.error('칭호 변경 실패:', e);
    }
  };

  return {
    currentTab,
    setCurrentTab: navigateTab,
    currentUser,
    isAdmin: currentUser?.isAdmin || false,
    trainer: currentUser || {},
    caughtPokemon: currentUser?.caughtPokemon || [],
    partnerPokemon: currentUser?.partnerPokemon || null,
    items: currentUser?.inventory || [],
    encounterPokemon,
    firstCatchPokemon,
    statSelectPending,
    handleStatSelectComplete,
    regions,
    setRegions,
    allPokemon,
    allPokemonMaster,
    allItems,
    members,
    memberViewMembers,
    gamePokedex,
    sharedPokedexData,
    shopData,
    allMoves,
    pokemonLearnsets,
    maintenanceMode,
    maintenanceScheduledAt,
    scheduleMaintenanceMode,
    cancelScheduledMaintenance,
    systemSettings,
    setMembers,
    isMembersLoading,
    setMaintenanceMode,
    updateSystemSettings,
    updateShopData,
    handleLogin,
    handleLogout,
    changeCurrentUserPassword,
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
    resetPokedex: pokedexHook.resetPokedex,
    useItemOnPokemon: itemEffectsHook.useItemOnPokemon,
    evolutionModal: evolutionHook.evolutionModal,
    acceptEvolution: evolutionHook.acceptEvolution,
    cancelEvolution: evolutionHook.cancelEvolution,
    checkEvolution: evolutionHook.checkEvolution,
    checkEvolutionOnLevelUp: evolutionHook.checkEvolutionOnLevelUp,
    manualEvolve: evolutionHook.manualEvolve,
    increaseEffort: pokemonManagement.increaseEffort,
    recipes: recipesHook.recipes,
    discoveredRecipes: recipesHook.discoveredRecipes,
    createRecipe: recipesHook.createRecipe,
    updateRecipe: recipesHook.updateRecipe,
    deleteRecipe: recipesHook.deleteRecipe,
    cookRecipe: recipesHook.cookRecipe,
    discoverRecipe: recipesHook.discoverRecipe,
    updateIngredientStats: recipesHook.updateIngredientStats,
    updateCurrentUser,
    isAuthLoading,
    updatePokedexMemo: (pokemonNumber, memo) => 
      gameDataUpdatePokedexMemo(pokemonNumber, memo, currentUser),
	  camping: campingHook,
    
    // 포켓몬 관리
    movePokemonToParty: restPokemonManagement.movePokemonToParty,
    movePokemonToBox: restPokemonManagement.movePokemonToBox,
    releasePokemon: restPokemonManagement.releasePokemon,
    reorderPartyPokemon: restPokemonManagement.reorderPartyPokemon,
    useRareCandy: useRareCandy,
    updatePokemonNickname: restPokemonManagement.updatePokemonNickname,
    updatePokemonMemo: restPokemonManagement.updatePokemonMemo,
    getPokemonFormCandidates: restPokemonManagement.getPokemonFormCandidates,
    changePokemonForm: restPokemonManagement.changePokemonForm,
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
    
    updateSelfTitle,

    // 관리자 기능 - 칭호 관리
    titles: adminTitles.titles,

    // 관리자 기능 - 아이템 관리
    addItemToSelf: adminItems.addItemToSelf,
    giveItemToMember: adminItems.giveItemToMember,
    bulkGiveItem: adminItems.bulkGiveItem,
    deleteItemFromMember: adminItems.deleteItemFromMember,
    adjustMemberItemCount: adminItems.adjustMemberItemCount,
    updateCustomItem: async (itemId, updatedFields) => {
      const ok = await adminItems.updateCustomItem(itemId, updatedFields);
      if (ok) setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updatedFields } : i));
      return ok;
    },
    deleteCustomItem: async (itemId) => {
      const ok = await adminItems.deleteCustomItem(itemId);
      if (ok) setAllItems(prev => prev.filter(i => i.id !== itemId));
      return ok;
    }
  };
}
