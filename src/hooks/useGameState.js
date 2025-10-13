import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';
import movesData from '../data/moves.json';
import usePokemonManagement from './usePokemonManagement';
import { useEvolution } from './useEvolution';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { useAuth } from './useAuth';
import { useMembers } from './useMembers';
import { useGameData } from './useGameData';
import { useShop } from './useShop';
import { useMoves } from './useMoves';
import { useAdminFunctions } from './useAdminFunctions';
import { isEVItem, applyEVItem } from '../utils/evItemUtils';

const getDefaultLootConfig = () => ({
  money: { min: 50, max: 200 },
  itemCount: { min: 1, max: 3 },
  itemPool: ['potion', 'super-potion', 'pokeball', 'great-ball', 'antidote', 'paralyze-heal', 'awakening', 'burn-heal'],
  ingredientCount: { min: 0, max: 1 },
  ingredientPool: ['oran-berry', 'pecha-berry', 'cheri-berry', 'rawst-berry'],
  berryCount: { min: 0, max: 1 },
  berryPool: ['oran-berry', 'sitrus-berry', 'lum-berry']
});

const generateLoot = (lootConfig, allItems) => {
  const loot = { money: 0, items: [], ingredients: [], berries: [] };
  const { money } = lootConfig;
  loot.money = Math.floor(Math.random() * (money.max - money.min + 1)) + money.min;
  
  const itemCount = Math.floor(Math.random() * (lootConfig.itemCount.max - lootConfig.itemCount.min + 1)) + lootConfig.itemCount.min;
  for (let i = 0; i < itemCount; i++) {
    if (lootConfig.itemPool && lootConfig.itemPool.length > 0) {
      const randomItemId = lootConfig.itemPool[Math.floor(Math.random() * lootConfig.itemPool.length)];
      const itemData = allItems.find(item => item.id === randomItemId);
      if (itemData) {
        const existing = loot.items.find(item => item.id === randomItemId);
        if (existing) {
          existing.count++;
        } else {
          loot.items.push({ id: randomItemId, name: itemData.name, count: 1 });
        }
      }
    }
  }
  
  const ingredientCount = Math.floor(Math.random() * (lootConfig.ingredientCount.max - lootConfig.ingredientCount.min + 1)) + lootConfig.ingredientCount.min;
  for (let i = 0; i < ingredientCount; i++) {
    if (lootConfig.ingredientPool && lootConfig.ingredientPool.length > 0) {
      const randomItemId = lootConfig.ingredientPool[Math.floor(Math.random() * lootConfig.ingredientPool.length)];
      const itemData = allItems.find(item => item.id === randomItemId);
      if (itemData) {
        const existing = loot.ingredients.find(item => item.id === randomItemId);
        if (existing) {
          existing.count++;
        } else {
          loot.ingredients.push({ id: randomItemId, name: itemData.name, count: 1 });
        }
      }
    }
  }
  
  const berryCount = Math.floor(Math.random() * (lootConfig.berryCount.max - lootConfig.berryCount.min + 1)) + lootConfig.berryCount.min;
  for (let i = 0; i < berryCount; i++) {
    if (lootConfig.berryPool && lootConfig.berryPool.length > 0) {
      const randomItemId = lootConfig.berryPool[Math.floor(Math.random() * lootConfig.berryPool.length)];
      const itemData = allItems.find(item => item.id === randomItemId);
      if (itemData) {
        const existing = loot.berries.find(item => item.id === randomItemId);
        if (existing) {
          existing.count++;
        } else {
          loot.berries.push({ id: randomItemId, name: itemData.name, count: 1 });
        }
      }
    }
  }
  
  return loot;
};

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);

  const [allPokemon] = useState(pokemonData.pokemon);
  const [allPokemonMaster] = useState(allPokemonData.pokemon);
  const [allMoves] = useState(movesData.moves || []);
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {});

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

  const { members, setMembers } = useMembers(allPokemonData.pokemon);

  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser
  } = useAuth(members, setMembers);

  const {
    shopData,
    updateShopData,
    sellItem
  } = useShop(currentUser, updateCurrentUser, allItems);

  const movesHook = useMoves(currentUser, updateCurrentUser, allMoves, pokemonLearnsets);

  // ⭐ 진화 Hook 생성 (한 번만!)
  const evolutionHook = useEvolution(
    currentUser,
    updateCurrentUser,
    allPokemonMaster
  );

  // pokemonManagement 생성
  const pokemonManagement = usePokemonManagement(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    setSharedPokedexData,
    sharedPokedexData,
    pokemonLearnsets,
    allMoves,
    null
  );

  // ⭐ useRareCandy를 래핑하여 진화 체크 추가
  const handleRareCandyWithEvolution = (uniqueId, onLevelUp) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    console.log('🎯 handleRareCandyWithEvolution 호출');
    
    // 원래 useRareCandy 호출
    pokemonManagement.useRareCandy(uniqueId, (pokemonId, newLevel, newMoves) => {
      console.log('🎯 레벨업 콜백 실행, newLevel:', newLevel, 'newMoves:', newMoves);
      
      // 약간의 딜레이 후 진화 체크
      setTimeout(() => {
        console.log('⏰ setTimeout 실행됨');
        
        const savedMembers = JSON.parse(localStorage.getItem('poke_members') || '{}');
        const latestUser = savedMembers[currentUser.id];
        
        console.log('📦 localStorage에서 가져온 유저:', latestUser?.name);
        
        if (latestUser) {
          const updatedPokemon = latestUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
          
          console.log('🎯 업데이트된 포켓몬:', updatedPokemon?.name, 'Lv.', updatedPokemon?.level);
          
          if (updatedPokemon) {
            const shouldShowEvolutionModal = evolutionHook.checkEvolutionOnLevelUp(updatedPokemon);
            
            if (shouldShowEvolutionModal) {
              console.log('✨ 진화 모달 표시됨! 기술 배우기는 건너뜀');
              return;
            }
          }
        }
        
        // 진화하지 않으면 기술 배우기 모달 표시
        if (onLevelUp && newMoves.length > 0) {
          console.log('✅ 기술 배우기 모달 표시');
          onLevelUp(pokemonId, newLevel, newMoves);
        } else {
          console.log('ℹ️ 배울 기술 없음, 레벨업만 완료');
        }
      }, 100);
    });
  };

  // pokemonManagement에서 useRareCandy 제외
  const { useRareCandy: _, ...restPokemonManagement } = pokemonManagement;

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

  const handleRegionClick = (region) => {
    if (!currentUser) return;

    const accessibleRegions = currentUser.accessibleRegions || [];
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(region.id)) {
      alert('⛔ 이 구역에 접근할 수 없습니다!');
      return;
    }
    
    if (currentUser.dailyWalks > 0) {
      const encounterRate = region.encounterRate !== undefined ? region.encounterRate : 80;
      const encounterRoll = Math.random() * 100;
      
      updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });
      
      if (encounterRoll >= encounterRate) {
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        applyLoot(loot, null);
        
        const itemList = [];
        if (loot.items.length > 0) {
          loot.items.forEach(item => itemList.push(`${item.name} ${item.count}개`));
        }
        if (loot.ingredients.length > 0) {
          loot.ingredients.forEach(item => itemList.push(`${item.name} ${item.count}개`));
        }
        if (loot.berries.length > 0) {
          loot.berries.forEach(item => itemList.push(`${item.name} ${item.count}개`));
        }
        
        const itemText = itemList.length > 0 ? `\n🎁 ${itemList.join(', ')}` : '';
        alert(`🌿 ${region.name}을(를) 탐험했지만 포켓몬을 발견하지 못했습니다!\n\n💰 ${loot.money}원을 획득했습니다!${itemText}`);
        return;
      }
      
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
          const weight = rates[id] || 10;
          for (let i = 0; i < weight; i++) {
            weightedPokemon.push(p);
          }
        });
        
        const randomPokemon = weightedPokemon[Math.floor(Math.random() * weightedPokemon.length)];
        const pokemonNumber = randomPokemon.originalNumber || randomPokemon.number;
        const isFirstEncounter = !sharedPokedexData[pokemonNumber];
        
        if (isFirstEncounter) {
          setSharedPokedexData(prev => ({
            ...prev,
            [pokemonNumber]: {
              firstEncounter: currentUser.name,
              encounteredAt: new Date().toISOString(),
              caughtBy: null,
              caughtAt: null,
              memo: null,
              regions: [region.name]
            }
          }));
        } else {
          setSharedPokedexData(prev => {
            const entry = prev[pokemonNumber];
            const currentRegions = entry?.regions || [];
            
            if (!currentRegions.includes(region.name)) {
              return {
                ...prev,
                [pokemonNumber]: {
                  ...entry,
                  regions: [...currentRegions, region.name]
                }
              };
            }
            return prev;
          });
        }
        
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        
        setEncounterPokemon({
          ...randomPokemon,
          loot: loot,
          regionName: region.name,
          isFirstEncounter: isFirstEncounter
        });
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

  const applyLoot = (loot, ballUsed = null) => {
    if (!loot || !currentUser) return;
    
    const newMoney = (currentUser.money || 0) + loot.money;
    let newInventory = [...currentUser.inventory];
    
    if (ballUsed && !currentUser.isSuperAdmin) {
      newInventory = newInventory.map(item => 
        (item.itemId === ballUsed.id || item.name === ballUsed.name)
          ? { ...item, count: Math.max(0, item.count - 1) }
          : item
      );
    }
    
    const allLootItems = [...loot.items, ...loot.ingredients, ...loot.berries];
    
    allLootItems.forEach(lootItem => {
      const existingIndex = newInventory.findIndex(i => 
        i.itemId === lootItem.id || i.name === lootItem.name
      );
      
      if (existingIndex !== -1) {
        newInventory[existingIndex] = {
          ...newInventory[existingIndex],
          count: newInventory[existingIndex].count + lootItem.count
        };
      } else {
        const itemData = allItems.find(i => i.id === lootItem.id);
        if (itemData) {
          const newItem = {
            itemId: lootItem.id,
            name: lootItem.name,
            count: lootItem.count,
            imageUrl: itemData.spriteUrl || itemData.imageUrl,
            category: itemData.category,
            onUse: itemData.onUse || null
          };
          newInventory.push(newItem);
        }
      }
    });
    
    updateCurrentUser({ 
      money: newMoney, 
      inventory: newInventory 
    });
  };

  const updateRegionLootConfig = (regionId, lootConfig) => {
    if (!currentUser?.isAdmin) return;
    setRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, lootConfig } : region
    ));
    alert('보상 설정이 저장되었습니다!');
  };

  const handleCatchSuccess = (pokemon, ballUsed) => {
    if (!currentUser) return;
    
    const nonPartnerCount = currentUser.caughtPokemon.filter(p => p && !p.isPartner).length;
    
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
    
    const regionName = pokemon.regionName;
    const region = regions.find(r => r.name === regionName);
    const minLevel = region?.minLevel || 5;
    const maxLevel = region?.maxLevel || 20;
    const level = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    
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
    updateCurrentUser({ caughtPokemon: updatedCaughtPokemon });

    const pokemonNumber = pokemonTemplate.number;
    setSharedPokedexData(prev => {
      const entry = prev[pokemonNumber] || {};
      
      if (!entry.caughtBy) {
        setFirstCatchPokemon(pokemonTemplate);
        return {
          ...prev,
          [pokemonNumber]: {
            ...entry,
            firstEncounter: entry.firstEncounter || currentUser.name,
            encounteredAt: entry.encounteredAt || new Date().toISOString(),
            caughtBy: currentUser.name,
            caughtAt: new Date().toISOString(),
            regions: entry.regions || [regionName]
          }
        };
      }
      return prev;
    });
  };

  const saveFirstCatchMemo = (pokemonNumber, memo) => {
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: {
        ...prev[pokemonNumber],
        memo: memo || null
      }
    }));
    setFirstCatchPokemon(null);
  };

  const skipFirstCatchMemo = (pokemonNumber) => {
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: {
        ...prev[pokemonNumber],
        memo: null
      }
    }));
    setFirstCatchPokemon(null);
  };

  const updatePokedexRegions = (pokemonNumber, regions) => {
    if (!currentUser?.isAdmin) return;
    setSharedPokedexData(prev => {
      const entry = prev[pokemonNumber] || {};
      return {
        ...prev,
        [pokemonNumber]: {
          ...entry,
          regions: regions,
          manuallyEdited: true
        }
      };
    });
  };

  const createCustomItem = (itemData) => {
    const result = adminCreateCustomItem(itemData);
    if (result) {
      const customItems = loadFromStorage('poke_customItems', []);
      const baseItems = itemsData.items;
      setAllItems([...baseItems, ...customItems]);
    }
    return result;
  };

  const updateGamePokedex = (selectedPokemonNumbers) => {
    return adminUpdateGamePokedex(selectedPokemonNumbers);
  };

  const updatePokedexMemo = (pokemonNumber, memo) => {
    return gameDataUpdatePokedexMemo(pokemonNumber, memo, currentUser);
  };

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
  
  
  const useItemOnPokemon = (item, pokemon) => {
  if (!currentUser || !pokemon) return;
  
  const itemData = allItems.find(i => 
    i.id === item.itemId || i.name === item.name
  );
  
  // consumeItem 함수
  const consumeItem = (item) => {
    const newInventory = currentUser.inventory
      .map(i => (i.itemId === item.itemId || i.name === item.name)
        ? { ...i, count: i.count - 1 }
        : i
      )
      .filter(i => i.count > 0);
    updateCurrentUser({ inventory: newInventory });
  };

  // 포켓몬 업데이트 함수 - caughtPokemon 배열에서 업데이트
  const updatePokemonInUser = (updatedPokemon) => {
    const updatedCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === updatedPokemon.uniqueId ? updatedPokemon : p
    );
    updateCurrentUser({ caughtPokemon: updatedCaughtPokemon });
  };
  
  // ⭐ EV 아이템 처리
  if (isEVItem(itemData?.nameEn || itemData?.name)) {
    const result = applyEVItem(
      pokemon, 
      itemData.nameEn || itemData.name,
      updatePokemonInUser
    );
    
    if (result.success) {
      alert(result.message);
      consumeItem(item);
    } else {
      alert(result.message);
    }
    return;
  }
  
  // 이상한사탕 - 레벨업 + 진화 체크
  if (itemData?.name === '이상한사탕' || 
      itemData?.nameEn?.toLowerCase().includes('rare candy')) {
    handleRareCandyWithEvolution(pokemon.uniqueId);
    consumeItem(item);
    return;
  }
  
  // 진화의 돌 - 진화 처리
  if (itemData?.category?.includes('evolution')) {
    const success = evolutionHook.evolveWithItem(pokemon, itemData.nameEn || itemData.name);
    if (success) consumeItem(item);
    return;
  }
  
  // ⭐ 나머지는 전부 "사용했습니다!" 메시지만
  alert(`${pokemon.nickname || pokemon.name}에게 ${item.name}을(를) 사용했습니다!`);
  consumeItem(item);
};
  
  
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
    movePokemonToParty: restPokemonManagement.movePokemonToParty,
    movePokemonToBox: restPokemonManagement.movePokemonToBox,
    releasePokemon: restPokemonManagement.releasePokemon,
    useRareCandy: handleRareCandyWithEvolution,
    updatePokemonNickname: restPokemonManagement.updatePokemonNickname,
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
    setPartnerPokemon: restPokemonManagement.setPartnerPokemon,
    giveItemToPokemon: restPokemonManagement.giveItemToPokemon,
    takeItemFromPokemon: restPokemonManagement.takeItemFromPokemon,
    learnMove: movesHook.learnMove,
    forgetMove: movesHook.forgetMove,
    replaceMove: movesHook.replaceMove,
    giveMoveToPokemon: movesHook.learnMove,
    getAvailableMovesForLevel: movesHook.getAvailableMovesForLevel,
    getAllLearnableMoves: movesHook.getAllLearnableMoves,
    handlePurchase,
    applyLoot,
    updateRegionLootConfig,
    updatePokedexRegions,
    useItemOnPokemon,
    evolutionModal: evolutionHook.evolutionModal,
    acceptEvolution: evolutionHook.acceptEvolution,
    cancelEvolution: evolutionHook.cancelEvolution,
	increaseEffort: pokemonManagement.increaseEffort
  };
}