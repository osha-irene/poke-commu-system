// src/hooks/useGameState.js - 리팩토링 버전
// 모든 게임 로직을 통합하는 메인 훅

import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

// 데이터 (JSON 파일들 먼저)
import allPokemonDataRaw from '../data/allPokemon.json';
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
  const [moveChoicePending, setMoveChoicePending] = useState(null); // { item, pokemon, options, kind }
  const [qnaItemWritePending, setQnaItemWritePending] = useState(null); // { item, permitKind }
  const [abilitySelectPending, setAbilitySelectPending] = useState(null); // { item, pokemon, options }
  
  const allPokemonDataParsed = Array.isArray(allPokemonDataRaw) 
    ? allPokemonDataRaw 
    : (allPokemonDataRaw.pokemon || []);
  const [allPokemon] = useState(allPokemonDataParsed);
  const [allPokemonMaster] = useState(allPokemonDataParsed);
  const [allMoves] = useState(movesData.moves || []);
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {});
  const [loadFullMembers, setLoadFullMembers] = useState(false);
  // caughtPokemon/partnerPokemon 상세는 멤버/NPC 목록을 실제로 보고 있을 때만 구독한다
  // (다운로드 용량 최적화 - 다른 탭에 있을 때는 다른 유저의 파티 변경이 나에게 전송되지 않음)
  const loadPartyDetails = currentTab === 'members' || currentTab === 'npcs';

  // 회원 & 인증 (레시피가 요리 결과 아이템을 파생시키려면 allItems보다 먼저 준비되어야 함)
  const { members, memberViewMembers, setMembers, isLoading: isMembersLoading } = useMembers(allPokemonDataParsed, loadFullMembers, loadPartyDetails);

  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    updateInventory,
    updateCaughtPokemon,
    updateOwnedPokemonByUniqueId,
    changeCurrentUserPassword,
    isLoading: isAuthLoading
  } = useAuth(members, setMembers, allPokemonDataParsed);

  useEffect(() => {
    setLoadFullMembers(Boolean(currentUser?.isAdmin || currentUser?.isSuperAdmin));
  }, [currentUser?.isAdmin, currentUser?.isSuperAdmin]);

  // 레시피 (요리 결과 아이템은 useGameData의 allItems에 파생되어 들어가므로 먼저 로드)
  const recipesHook = useRecipes(currentUser, updateCurrentUser, updateInventory);

  // 기본 데이터
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
  } = useGameData(allPokemonDataParsed, recipesHook.recipes);

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
  const movesHook = useMoves(currentUser, updateCurrentUser, updateOwnedPokemonByUniqueId, allMoves, pokemonLearnsets);

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
    updateOwnedPokemonByUniqueId,
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

  // 포켓몬 잡기
  const pokemonCatchHook = usePokemonCatch(
    currentUser,
    updateCurrentUser,
    updateCaughtPokemon,
    updateInventory,
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
    pokedexHook,
    updateInventory
  );

  // 아이템 효과 (useRareCandy를 직접 전달)
  const itemEffectsHook = useItemEffects(
    currentUser,
    updateCurrentUser,
    updateOwnedPokemonByUniqueId,
    updateInventory,
    allItems,
    allMoves,
    pokemonLearnsets,
    movesHook,
    evolutionHook,
    pokemonManagement.useRareCandy,
    pokemonManagement.getPokemonFormCandidates,
    pokemonManagement.changePokemonForm,
    systemSettings,
    (item, pokemon, type, amount) => setStatSelectPending({ item, pokemon, type, amount }),
    (item, pokemon, options, kind) => setMoveChoicePending({ item, pokemon, options, kind }),
    (item, permitKind) => setQnaItemWritePending({ item, permitKind }),
    allPokemonMaster,
    (item, pokemon, options) => setAbilitySelectPending({ item, pokemon, options })
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

  // 기술머신(범용)/하트비늘로 배울 기술을 고른 뒤 실제 학습 + 아이템 소모를 진행
  const handleMoveChoiceComplete = (moveData, oldMoveId = null) => {
    if (!moveChoicePending) return;
    const { item, pokemon } = moveChoicePending;
    setMoveChoicePending(null);
    if (!moveData) return; // 취소
    itemEffectsHook.useItemOnPokemon({
      ...item,
      __chosenMoveId: moveData.id,
      __chosenOldMoveId: oldMoveId
    }, pokemon);
  };

  // 특성패치로 특성을 고른 뒤 실제 적용 + 아이템 소모를 진행
  const handleAbilitySelectComplete = (chosenAbility) => {
    if (!abilitySelectPending) return;
    const { item, pokemon } = abilitySelectPending;
    setAbilitySelectPending(null);
    if (!chosenAbility) return; // 취소
    itemEffectsHook.useItemOnPokemon({
      ...item,
      __chosenAbility: chosenAbility
    }, pokemon);
  };

  // 볼 변경 티켓 / 미용실 이용권 사용 시 QnA "아이템" 탭 작성 모달을 취소 없이 닫는다 (아이템 미소모)
  const cancelQnaItemWrite = () => setQnaItemWritePending(null);

  // QnA "아이템" 탭 글이 실제로 등록된 뒤에만 호출 - 사용했던 티켓을 인벤토리에서 차감한다.
  // 인벤토리 변경은 CLAUDE.md 규칙에 따라 updateCurrentUser로 직접 건드리지 않고
  // runTransaction 기반 updateInventory로만 처리한다.
  const consumeQnaItemWrite = () => {
    if (!currentUser || !qnaItemWritePending?.item) return;
    const usedItem = qnaItemWritePending.item;
    setQnaItemWritePending(null);

    if (currentUser.isSuperAdmin) return;

    updateInventory((currentInventory = []) => {
      let consumed = false;
      return currentInventory
        .map(invItem => {
          if (consumed) return invItem;
          const matches = (usedItem.itemId != null && invItem.itemId === usedItem.itemId)
            || (usedItem.name && invItem.name === usedItem.name);
          if (matches) {
            consumed = true;
            return { ...invItem, count: (invItem.count || 0) - 1 };
          }
          return invItem;
        })
        .filter(invItem => invItem.count > 0);
    });
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
    return adminItems.createCustomItem(itemData);
  };

  const { useRareCandy, ...restPokemonManagement } = pokemonManagement;

  const updateSelfTitle = async (titleId) => {
    if (!currentUser?.id) return;
    const titleValue = titleId === 'none' ? null : titleId;
    try {
      await update(ref(database, `members/${currentUser.id}`), { title: titleValue });
      await update(ref(database, `memberSummary/${currentUser.id}`), { title: titleValue });
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
    moveChoicePending,
    handleMoveChoiceComplete,
    qnaItemWritePending,
    cancelQnaItemWrite,
    consumeQnaItemWrite,
    abilitySelectPending,
    handleAbilitySelectComplete,
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
    alcremieFlavorPending: evolutionHook.alcremieFlavorPending,
    chooseAlcremieFlavor: evolutionHook.chooseAlcremieFlavor,
    cancelAlcremieFlavor: evolutionHook.cancelAlcremieFlavor,
    increaseEffort: pokemonManagement.increaseEffort,
    recipes: recipesHook.recipes,
    discoveredRecipes: recipesHook.discoveredRecipes,
    recipeMemos: recipesHook.recipeMemos,
    createRecipe: recipesHook.createRecipe,
    updateRecipe: recipesHook.updateRecipe,
    deleteRecipe: recipesHook.deleteRecipe,
    cookRecipe: recipesHook.cookRecipe,
    discoverRecipe: recipesHook.discoverRecipe,
    updateRecipeMemo: (recipeId, memo) =>
      recipesHook.updateRecipeMemo(recipeId, memo, currentUser),
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
      if (ok) {
        setAllItems(prev => prev.map(i => (
          i.__customItemSource === 'database' && i.id === itemId
            ? { ...i, ...updatedFields }
            : i
        )));
      }
      return ok;
    },
    deleteCustomItem: async (itemId) => {
      const ok = await adminItems.deleteCustomItem(itemId);
      if (ok) {
        setAllItems(prev => prev.filter(i => (
          i.__customItemSource !== 'database' || i.id !== itemId
        )));
      }
      return ok;
    }
  };
}
