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

// 기본 보상 설정
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
  const loot = {
    money: 0,
    items: [],
    ingredients: [],
    berries: []
  };
  
  // 돈 생성
  const { money } = lootConfig;
  loot.money = Math.floor(Math.random() * (money.max - money.min + 1)) + money.min;
  
  // 아이템 생성
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
  
  // 식재료 생성
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
  
  // 나무열매 생성
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

  // ⭐ 구역 클릭 (조우 시 도감 등록 추가)
  const handleRegionClick = (region) => {
    if (!currentUser) return;

    const accessibleRegions = currentUser.accessibleRegions || [];
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(region.id)) {
      alert('❌ 이 구역에 접근할 수 없습니다!');
      return;
    }
    
    if (currentUser.dailyWalks > 0) {
      // 1단계: 포켓몬 출현 여부 결정
      const encounterRate = region.encounterRate !== undefined ? region.encounterRate : 80;
      const encounterRoll = Math.random() * 100;
      
      console.log('🎲 출현 판정:', encounterRoll.toFixed(2), '/ 출현율:', encounterRate + '%');
      
      // 산책 횟수 차감
      updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });
      
      // 포켓몬이 나오지 않는 경우
      if (encounterRoll >= encounterRate) {
        console.log('❌ 포켓몬 출현 실패! 아이템만 지급');
        
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        console.log('🎁 생성된 loot:', loot);
        
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
      
      // 2단계: 포켓몬 출현
      console.log('✅ 포켓몬 출현!');
      
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
        console.log('🎯 선택된 포켓몬:', randomPokemon.name);
        
        // ⭐ 조우만 해도 도감 등록
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
          // 이미 등록된 포켓몬이면 출현 지역만 추가
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

  // 보상 적용 함수
  const applyLoot = (loot, ballUsed = null) => {
    console.log('🎁 applyLoot 호출됨!');
    console.log('📦 받은 loot:', loot);
    console.log('⚾ 사용한 볼:', ballUsed);
    console.log('👤 currentUser:', currentUser);
    
    if (!loot || !currentUser) {
      console.log('❌ loot 또는 currentUser가 없음');
      return;
    }
    
    const newMoney = (currentUser.money || 0) + loot.money;
    console.log('💰 새로운 돈:', newMoney);
    
    let newInventory = [...currentUser.inventory];
    console.log('🎒 현재 인벤토리:', newInventory);
    
    // 볼 차감
    if (ballUsed && !currentUser.isSuperAdmin) {
      console.log('⚾ 볼 차감 시작');
      newInventory = newInventory.map(item => 
        (item.itemId === ballUsed.id || item.name === ballUsed.name)
          ? { ...item, count: Math.max(0, item.count - 1) }
          : item
      );
      console.log('⚾ 볼 차감 후 인벤토리:', newInventory);
    }
    
    const allLootItems = [...loot.items, ...loot.ingredients, ...loot.berries];
    console.log('📦 추가할 아이템들:', allLootItems);
    
    allLootItems.forEach(lootItem => {
      console.log('🔍 처리 중인 아이템:', lootItem);
      
      const existingIndex = newInventory.findIndex(i => 
        i.itemId === lootItem.id || i.name === lootItem.name
      );
      
      console.log('📍 기존 아이템 인덱스:', existingIndex);
      
      if (existingIndex !== -1) {
        newInventory[existingIndex] = {
          ...newInventory[existingIndex],
          count: newInventory[existingIndex].count + lootItem.count
        };
        console.log('✅ 기존 아이템 개수 증가:', newInventory[existingIndex]);
      } else {
        const itemData = allItems.find(i => i.id === lootItem.id);
        console.log('🔎 allItems에서 찾은 아이템:', itemData);
        
        if (itemData) {
          const newItem = {
            itemId: lootItem.id,
            name: lootItem.name,
            count: lootItem.count,
            imageUrl: itemData.spriteUrl || itemData.imageUrl,
            category: itemData.category
          };
          newInventory.push(newItem);
          console.log('✅ 새 아이템 추가:', newItem);
        } else {
          console.log('❌ allItems에서 아이템을 찾을 수 없음:', lootItem.id);
        }
      }
    });
    
    console.log('🎒 최종 인벤토리:', newInventory);
    console.log('📊 인벤토리 길이:', newInventory.length);
    
    updateCurrentUser({ 
      money: newMoney, 
      inventory: newInventory 
    });
    
    console.log('✅ updateCurrentUser 호출 완료');
  };

  // 리전 보상 설정 업데이트
  const updateRegionLootConfig = (regionId, lootConfig) => {
    if (!currentUser?.isAdmin) return;
    
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { ...region, lootConfig } 
        : region
    ));
    
    alert('보상 설정이 저장되었습니다!');
  };

  // ⭐ 포획 성공 (지역별 레벨 범위 적용)
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
    
    // ⭐ 지역별 레벨 범위
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
    
    updateCurrentUser({
      caughtPokemon: updatedCaughtPokemon
    });

    // ⭐ 도감에 포획 정보 업데이트
    const pokemonNumber = pokemonTemplate.number;
    setSharedPokedexData(prev => {
      const entry = prev[pokemonNumber] || {};
      
      // 첫 포획인 경우
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

  // ⭐ 관리자용 도감 지역 수동 업데이트
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

  // createCustomItem 래핑
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
    learnMove: movesHook.learnMove,
    forgetMove: movesHook.forgetMove,
    replaceMove: movesHook.replaceMove,
    giveMoveToPokemon: movesHook.learnMove,
    getAvailableMovesForLevel: movesHook.getAvailableMovesForLevel,
    getAllLearnableMoves: movesHook.getAllLearnableMoves,
    handlePurchase,
    applyLoot,
    updateRegionLootConfig,
    updatePokedexRegions  // ⭐ 추가
  };
}