import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';
import movesData from '../data/moves.json';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { useAuth } from './useAuth';
import { useMembers } from './useMembers';
import { useGameData } from './useGameData';
import { useShop } from './useShop';
import { usePokemonManagement } from './usePokemonManagement';
import { useMoves } from './useMoves';
import { useAdminFunctions } from './useAdminFunctions';

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);

  // 마스터 데이터
  const [allPokemon] = useState(pokemonData.pokemon);
  const [allPokemonMaster] = useState(allPokemonData.pokemon);
  const [allMoves] = useState(movesData.moves || []);
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {});

  // 게임 데이터 (지역, 도감, 아이템 등)
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
  } = useGameData(allPokemonData.pokemon);

  // 멤버 관리
  const { members, setMembers } = useMembers(allPokemonData.pokemon);

  // 인증 (로그인/로그아웃)
  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser
  } = useAuth(members, setMembers);

  // 상점 기능
  const {
    shopData,
    updateShopData,
    sellItem
  } = useShop(currentUser, updateCurrentUser, allItems);

  // 기술 관리 (분리됨)
  const movesHook = useMoves(currentUser, updateCurrentUser, allMoves, pokemonLearnsets);

  // 포켓몬 관리 (기술 제외)
  const pokemonManagement = usePokemonManagement(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    setSharedPokedexData,
    sharedPokedexData,
    pokemonLearnsets,
    allMoves
  );

  // 관리자 기능들
  const adminFunctions = useAdminFunctions(
    currentUser,
    members,
    setMembers,
    updateCurrentUser,
    setRegions,
    setGamePokedex,
    allPokemonData.pokemon,
    pokemonData.pokemon
  );

  const {
    addMember,
    toggleAdminStatus,
    toggleItemManagement,
    updateMaxDailyWalks,
    resetMemberWalkCount,
    resetAllWalkCounts,
    givePokemonToMember,
    addPokemonToSelf,
    addItemToSelf,
    giveItemToMember,
    createCustomItem: adminCreateCustomItem,
    updateRegionPokemon,
    updateGamePokedex: adminUpdateGamePokedex,
    resetGameData,
    editMemberPokemon,
    updateMemberMoney,
    updateMemberRegionAccess
  } = adminFunctions;

  // 매일 자정 산책 리셋
  useEffect(() => {
    if (!currentUser) return;

    const checkAndResetWalks = () => {
      const lastReset = localStorage.getItem('poke_lastWalkReset');
      const today = new Date().toDateString();
      
      if (lastReset !== today) {
        setMembers(prev => {
          const updated = {};
          Object.keys(prev).forEach(id => {
            updated[id] = { ...prev[id], dailyWalks: prev[id].maxDailyWalks };
          });
          return updated;
        });
        localStorage.setItem('poke_lastWalkReset', today);
      }
    };

    checkAndResetWalks();
    const interval = setInterval(checkAndResetWalks, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser, setMembers]);

  // 구역 클릭
  const handleRegionClick = (region) => {
    if (!currentUser) return;

    const accessibleRegions = currentUser.accessibleRegions || [];
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(region.id)) {
      alert('❌ 이 구역에 접근할 수 없습니다!');
      return;
    }
    
    if (currentUser.dailyWalks > 0) {
      const regionPokemonIds = region.pokemons;
      const availablePokemon = gamePokedex.filter(p => 
        regionPokemonIds.includes(p.id) || 
        regionPokemonIds.includes(p.number) || 
        regionPokemonIds.includes(p.originalNumber)
      );
      
      if (availablePokemon.length > 0) {
        const rates = region.pokemonRates || {};
        const weightedPokemon = [];
        
        availablePokemon.forEach(p => {
          const id = p.id || p.number;
          const weight = rates[id] || 1;
          for (let i = 0; i < weight * 10; i++) {
            weightedPokemon.push(p);
          }
        });
        
        const randomPokemon = weightedPokemon[Math.floor(Math.random() * weightedPokemon.length)];
        setEncounterPokemon(randomPokemon);
        updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });
      } else {
        alert('이 지역에 등장하는 포켓몬이 없습니다!');
      }
    } else {
      alert('오늘의 탐험 횟수를 모두 사용했습니다!');
    }
  };

  const handleCloseEncounter = () => {
    setEncounterPokemon(null);
  };

 const handleCatchSuccess = (pokemon, ballUsed) => {
  if (!currentUser) return;
  
  // 파트너를 제외한 포켓몬 수 계산
  const nonPartnerCount = currentUser.caughtPokemon.filter(p => p && !p.isPartner).length;
  
  // 파트너 제외 20마리 제한 (총 21마리)
  if (nonPartnerCount >= 20) {
    alert('⚠️ 파트너를 제외한 포켓몬이 20마리입니다!\n더 이상 포켓몬을 잡을 수 없습니다.');
    return;
  }
    
    const pokemonTemplate = allPokemonMaster.find(p => 
      p.number === (pokemon.number || pokemon.originalNumber)
    );
    
    if (!pokemonTemplate) {
      alert('포켓몬 정보를 찾을 수 없습니다!');
      return;
    }
    
    const level = Math.floor(Math.random() * 20) + 5;
    
    const newPokemon = {
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      level: level,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      friendship: 0,
      heldItem: null,
      moves: movesHook.getStartingMoves(pokemonTemplate.number, level, movesData),
      caughtWithBall: ballUsed.name,
      isPartner: false,
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
    };
      
    const updatedCaughtPokemon = [...currentUser.caughtPokemon, newPokemon];
    
    const updatedInventory = currentUser.isSuperAdmin 
      ? currentUser.inventory
      : currentUser.inventory.map(item => 
          (item.itemId === ballUsed.id || item.name === ballUsed.name)
            ? { ...item, count: Math.max(0, item.count - 1) }
            : item
        );
    
    updateCurrentUser({
      caughtPokemon: updatedCaughtPokemon,
      inventory: updatedInventory
    });

    const isFirstCatch = !sharedPokedexData[pokemonTemplate.number];
    if (isFirstCatch) {
      setFirstCatchPokemon(pokemonTemplate);
    }
  };

  const saveFirstCatchMemo = (pokemonNumber, memo) => {
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: {
        firstCatcher: currentUser.name,
        caughtAt: new Date().toISOString(),
        memo: memo || null
      }
    }));
    setFirstCatchPokemon(null);
  };

  const skipFirstCatchMemo = (pokemonNumber) => {
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: {
        firstCatcher: currentUser.name,
        caughtAt: new Date().toISOString(),
        memo: null
      }
    }));
    setFirstCatchPokemon(null);
  };

  // createCustomItem을 래핑해서 allItems 업데이트 포함
  const createCustomItem = (itemData) => {
    const result = adminCreateCustomItem(itemData);
    if (result) {
      const customItems = loadFromStorage('poke_customItems', []);
      const baseItems = itemsData.items;
      setAllItems([...baseItems, ...customItems]);
    }
    return result;
  };

  // 도감 업데이트 래퍼
  const updateGamePokedex = (selectedPokemonNumbers) => {
    return adminUpdateGamePokedex(selectedPokemonNumbers);
  };

  // 도감 메모 업데이트 래퍼
  const updatePokedexMemo = (pokemonNumber, memo) => {
    return gameDataUpdatePokedexMemo(pokemonNumber, memo, currentUser);
  };

  // 구매 핸들러
  const handlePurchase = (item, quantity) => {
    if (!currentUser) return false;
    
    const totalCost = item.cost * quantity;
    if (currentUser.money < totalCost) {
      alert('돈이 부족합니다!');
      return false;
    }
    
    const existingItem = currentUser.inventory.find(
      i => i.itemId === item.id || i.name === item.name
    );
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i =>
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + quantity }
            : i
        )
      : [
          ...currentUser.inventory,
          {
            itemId: item.id,
            name: item.name,
            nameEn: item.nameEn,
            count: quantity,
            imageUrl: item.spriteUrl || item.imageUrl
          }
        ];
    
    updateCurrentUser({
      inventory: newInventory,
      money: currentUser.money - totalCost
    });
    
    alert(`${item.name} ${quantity}개를 구매했습니다!`);
    return true;
  };

  // 반환값
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
    setMaintenanceMode,
    updateShopData,
    handleLogin,
    handleLogout,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    updateMaxDailyWalks,
    updateRegionPokemon,
    addMember,
    toggleAdminStatus,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetGameData,
    movePokemonToParty: pokemonManagement.movePokemonToParty,
    movePokemonToBox: pokemonManagement.movePokemonToBox,
    releasePokemon: pokemonManagement.releasePokemon,
    useRareCandy: pokemonManagement.useRareCandy,
    updatePokemonNickname: pokemonManagement.updatePokemonNickname,
    updatePokedexMemo,
    updateGamePokedex,
    addItemToSelf,
    giveItemToMember,
    toggleItemManagement,
    givePokemonToMember,
    addPokemonToSelf,
    sellItem,
    createCustomItem,
    updateMemberMoney,
    updateMemberRegionAccess,
    editMemberPokemon,
    setPartnerPokemon: pokemonManagement.setPartnerPokemon,
    giveItemToPokemon: pokemonManagement.giveItemToPokemon,
    takeItemFromPokemon: pokemonManagement.takeItemFromPokemon,
    // 기술 관련 (useMoves에서)
    learnMove: movesHook.learnMove,
    forgetMove: movesHook.forgetMove,
    replaceMove: movesHook.replaceMove,
    giveMoveToPokemon: movesHook.learnMove,
    getAvailableMovesForLevel: movesHook.getAvailableMovesForLevel,
    getAllLearnableMoves: movesHook.getAllLearnableMoves,
    handlePurchase
  };
}