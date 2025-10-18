// src/hooks/useGameState.js - Firebase 완전 버전

import { useState, useEffect } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';
import movesData from '../data/moves.json';
import usePokemonManagement from './usePokemonManagement';
import recipesData from '../data/recipes.json';  
import { useEvolution } from './useEvolution';
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

  // ✅ 레시피 관리 - Firebase에서 로드
  const [recipes, setRecipes] = useState([]);
  const [discoveredRecipes, setDiscoveredRecipes] = useState({});

  // 🔥 Firebase에서 레시피 데이터 로드
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const recipesRef = ref(database, 'gameData/recipes');
        const snapshot = await get(recipesRef);
        
        if (snapshot.exists()) {
          setRecipes(snapshot.val());
        } else {
          // 초기 데이터 설정
          const allRecipes = [
            ...(recipesData.recipes || []),
            ...(recipesData.statBasedRecipes || [])
          ];
          await set(recipesRef, allRecipes);
          setRecipes(allRecipes);
        }
      } catch (error) {
        console.error('레시피 로드 실패:', error);
        // 폴백: JSON 파일 사용
        const allRecipes = [
          ...(recipesData.recipes || []),
          ...(recipesData.statBasedRecipes || [])
        ];
        setRecipes(allRecipes);
      }
    };

    const loadDiscoveredRecipes = async () => {
      try {
        const discoveredRef = ref(database, 'gameData/discoveredRecipes');
        const snapshot = await get(discoveredRef);
        
        if (snapshot.exists()) {
          setDiscoveredRecipes(snapshot.val());
        }
      } catch (error) {
        console.error('발견된 레시피 로드 실패:', error);
      }
    };

    loadRecipes();
    loadDiscoveredRecipes();
  }, []);

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

  const { members, setMembers, isLoading: isMembersLoading } = useMembers(allPokemonData.pokemon);

  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    isLoading: isAuthLoading
  } = useAuth(members, setMembers);

  const {
    shopData,
    updateShopData,
    sellItem,
    addDailyItem,
    removeDailyItem,
    toggleItemPersistent
  } = useShop(currentUser, updateCurrentUser, allItems);

  const movesHook = useMoves(currentUser, updateCurrentUser, allMoves, pokemonLearnsets);

  const evolutionHook = useEvolution(
    currentUser,
    updateCurrentUser,
    allPokemonMaster
  );

  const pokemonManagement = usePokemonManagement(
    currentUser,
    updateCurrentUser,
    allPokemonMaster,
    setSharedPokedexData,
    sharedPokedexData,
    pokemonLearnsets,
    allMoves,
    null,
    evolutionHook.checkEvolutionOnLevelUp 
  );

  const handleRareCandyWithEvolution = (uniqueId, onLevelUp) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    console.log('🎯 handleRareCandyWithEvolution 호출');
    
    pokemonManagement.useRareCandy(uniqueId, async (pokemonId, newLevel, newMoves) => {
      console.log('🎯 레벨업 콜백 실행, newLevel:', newLevel, 'newMoves:', newMoves);
      
      setTimeout(async () => {
        console.log('⏰ setTimeout 실행됨');
        
        // 🔥 Firebase에서 최신 데이터 가져오기
        try {
          const memberRef = ref(database, `members/${currentUser.id}`);
          const snapshot = await get(memberRef);
          
          if (snapshot.exists()) {
            const latestUser = snapshot.val();
            console.log('📦 Firebase에서 가져온 유저:', latestUser?.name);
            
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
        } catch (error) {
          console.error('Firebase 조회 실패:', error);
        }
        
        if (onLevelUp && newMoves.length > 0) {
          console.log('✅ 기술 배우기 모달 표시');
          onLevelUp(pokemonId, newLevel, newMoves);
        } else {
          console.log('ℹ️ 배울 기술 없음, 레벨업만 완료');
        }
      }, 100);
    });
  };

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

  

  // 🔥 매일 자정 산책 횟수 리셋 - Firebase 사용
  useEffect(() => {
    if (!currentUser) return;

    const checkAndResetWalks = async () => {
      try {
        const lastResetRef = ref(database, 'gameData/lastWalkReset');
        const snapshot = await get(lastResetRef);
        const lastReset = snapshot.exists() ? snapshot.val() : null;
        const today = new Date().toDateString();
        
        if (lastReset !== today) {
          // 모든 멤버의 산책 횟수 리셋
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

  const handleRegionClick = async (region) => {
    if (!currentUser) return;

    const accessibleRegions = currentUser.accessibleRegions || [];
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(region.id)) {
      alert('⛔ 이 구역에 접근할 수 없습니다!');
      return;
    }

    
    
          if (currentUser.dailyWalks > 0) {
      // ✅ encounterRate가 1 미만이면 이미 확률값 (0~1), 아니면 퍼센트 값 (0~100)
      let encounterRatePercent = region.encounterRate !== undefined ? region.encounterRate : 80;
      
      // ✅ 1보다 작으면 이미 소수점 확률이므로 100 곱하기
      if (encounterRatePercent < 1) {
        encounterRatePercent = encounterRatePercent * 100;  // 0.9 → 90
      }
      
      const encounterRate = encounterRatePercent / 100;  // 90 → 0.9
      
      console.log('🎲 조우 확률:', {
        원본값: region.encounterRate,
        설정값: encounterRatePercent + '%',
        실제확률: encounterRate,
        랜덤값: Math.random()
      });
      
      const randomEncounter = Math.random();
      
      updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });


      // ✅ 포켓몬 미조우 시
      if (randomEncounter >= encounterRate) {
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        const itemList = [
          ...loot.items.map(item => `${item.name} x${item.count}`),
          ...loot.ingredients.map(item => `${item.name} x${item.count}`),
          ...loot.berries.map(item => `${item.name} x${item.count}`)
        ];
        applyLoot(loot, null);
        const itemText = itemList.length > 0 ? `\n🎁 ${itemList.join(', ')}` : '';
        alert(`🌿 ${region.name}을(를) 탐험했지만 포켓몬을 발견하지 못했습니다!\n\n💰 ${loot.money}원을 획득했습니다!${itemText}`);
        return;
      }
      
      // ✅ 포켓몬 조우 시
      const regionPokemonIds = region.pokemons;

      // ✅ 전국도감 설정에 따라 검색 대상 변경
      const searchPokedex = region.allowNationalPokedex ? allPokemonMaster : gamePokedex;


      const availablePokemon = searchPokedex.filter(p => 
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
        
        // ✅ 랜덤 포켓몬 선택
        const randomPokemon = weightedPokemon[Math.floor(Math.random() * weightedPokemon.length)];
        
        // ✅ 이로치 판정
        const shinyRate = region.shinyRate || 4096;
        const isShiny = Math.random() < (1 / shinyRate);
        
        console.log('✨ 이로치 판정:', {
          pokemon: randomPokemon.name,
          shinyRate: shinyRate,
          probability: `1/${shinyRate}`,
          isShiny: isShiny
        });
        
        // ✅ pokemonNumber를 문자열로 변환
        const pokemonNumber = String(randomPokemon.originalNumber || randomPokemon.number);
        
        // ⭐ 조우 시: firstEncounter만 기록
        const isFirstEncounter = !sharedPokedexData[pokemonNumber];
        
        if (isFirstEncounter) {
          const newEntry = {
            firstEncounter: currentUser.name,
            encounteredAt: new Date().toISOString(),
            caughtBy: null,
            caughtAt: null,
            memo: null,
            regions: [region.name]
          };
          
          setSharedPokedexData(prev => ({
            ...prev,
            [pokemonNumber]: newEntry
          }));
          
          try {
            const pokedexRef = ref(database, `gameData/sharedPokedex/${pokemonNumber}`);
            await set(pokedexRef, newEntry);
            console.log('✅ 첫 조우 기록 완료:', pokemonNumber);
          } catch (error) {
            console.error('❌ 도감 데이터 저장 실패:', error);
          }
        } else {
          const entry = sharedPokedexData[pokemonNumber];
          const currentRegions = entry?.regions || [];
          
          if (!currentRegions.includes(region.name)) {
            const updatedEntry = {
              ...entry,
              regions: [...currentRegions, region.name]
            };
            
            setSharedPokedexData(prev => ({
              ...prev,
              [pokemonNumber]: updatedEntry
            }));
            
            try {
              const pokedexRef = ref(database, `gameData/sharedPokedex/${pokemonNumber}`);
              await set(pokedexRef, updatedEntry);
              console.log('✅ 지역 추가 완료:', pokemonNumber, region.name);
            } catch (error) {
              console.error('❌ 도감 데이터 저장 실패:', error);
            }
          }
        }
        
        // ✅ 여기서 loot 생성!
        const loot = generateLoot(region.lootConfig || getDefaultLootConfig(), allItems);
        
        setEncounterPokemon({
          ...randomPokemon,
          loot: loot,
          regionName: region.name,
          isFirstEncounter: isFirstEncounter,
          isShiny: isShiny
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

  const updateRegionLootConfig = async (regionId, lootConfig) => {
    if (!currentUser?.isAdmin) return;
    
    setRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, lootConfig } : region
    ));
    
    // 🔥 Firebase에 저장
    try {
      const regionRef = ref(database, `gameData/regions/${regionId}/lootConfig`);
      await set(regionRef, lootConfig);
      alert('보상 설정이 저장되었습니다!');
    } catch (error) {
      console.error('보상 설정 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCatchSuccess = async (pokemon, ballUsed) => {
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
    
    const ballItem = allItems.find(item => 
      item.name === ballUsed.name || 
      item.id === ballUsed.id
    );
    
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
      ballImageUrl: ballUsed.imageUrl || ballItem?.spriteUrl || ballItem?.imageUrl,
      isPartner: false,
       isShiny: pokemon.isShiny || false,
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { 
        hp: 0, 
        attack: 0, 
        defense: 0, 
        specialAttack: 0,
        specialDefense: 0,
        speed: 0 
      },
      imageUrl: pokemonTemplate.imageUrl,
  iconUrl: pokemon.isShiny 
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/shiny/${pokemonTemplate.number}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
  spriteUrl: pokemon.isShiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonTemplate.number}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
};

    const currentPokemon = [...currentUser.caughtPokemon];
    const party = currentPokemon.slice(0, 6);
    const box = currentPokemon.slice(6);
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (!party[i] || party[i] === null) {
        emptySlotIndex = i;
        break;
      }
    }
    
    let updatedCaughtPokemon;
    
    if (emptySlotIndex !== -1) {
      console.log('✅ 엔트리 빈 슬롯', emptySlotIndex, '에 포켓몬 추가');
      party[emptySlotIndex] = newPokemon;
      updatedCaughtPokemon = [...party, ...box];
    } else {
      console.log('📦 엔트리 가득참 - 박스에 포켓몬 추가');
      updatedCaughtPokemon = [...party, ...box, newPokemon];
    }
    
    console.log('🎉 포켓몬 잡기 완료! 최종 배열:', updatedCaughtPokemon.slice(0, 8).map((p, i) => `[${i}] ${p?.name || 'null'}`));
    
    updateCurrentUser({ caughtPokemon: updatedCaughtPokemon });

  // ⭐ 포획 시: firstCatcher 기록
  // ✅ pokemonNumber를 문자열로 변환
  const pokemonNumber = String(pokemonTemplate.number);
  const entry = sharedPokedexData[pokemonNumber] || {};
  
  if (!entry.firstCatcher) {
    setFirstCatchPokemon(pokemonTemplate);
    
    const updatedEntry = {
      ...entry,
      firstEncounter: entry.firstEncounter || currentUser.name,
      encounteredAt: entry.encounteredAt || new Date().toISOString(),
      firstCatcher: currentUser.name,
      caughtBy: currentUser.name,
      caughtAt: new Date().toISOString(),
      regions: entry.regions || [regionName]
    };
    
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: updatedEntry
    }));
      
     // 🔥 Firebase에 저장
    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${pokemonNumber}`);
      await set(pokedexRef, updatedEntry);
      console.log('✅ 첫 포획 기록 완료:', pokemonNumber);
    } catch (error) {
      console.error('❌ 도감 데이터 저장 실패:', error);
    }
  }
};

  
  const saveFirstCatchMemo = async (pokemonNumber, memo) => {
  // ✅ pokemonNumber를 문자열로 변환
  const numericKey = String(pokemonNumber);
  
  const updatedEntry = {
    ...sharedPokedexData[numericKey],
    memo: memo || null
  };
  
  setSharedPokedexData(prev => ({
    ...prev,
    [numericKey]: updatedEntry
  }));
  
  // 🔥 Firebase에 저장
  try {
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
    await set(pokedexRef, updatedEntry);
    console.log('✅ 메모 저장 완료:', numericKey);
  } catch (error) {
    console.error('❌ 메모 저장 실패:', error);
  }
  
  setFirstCatchPokemon(null);
};

const skipFirstCatchMemo = async (pokemonNumber) => {
  // ✅ pokemonNumber를 문자열로 변환하여 키로 사용
  const numericKey = String(pokemonNumber);
  
  const updatedEntry = {
    ...sharedPokedexData[numericKey],
    memo: null
  };
  
  setSharedPokedexData(prev => ({
    ...prev,
    [numericKey]: updatedEntry
  }));
  
  // 🔥 Firebase에 저장 - 반드시 문자열 키 사용
  try {
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
    await set(pokedexRef, updatedEntry);
    console.log('✅ 메모 건너뛰기 저장 완료:', numericKey);
  } catch (error) {
    console.error('❌ 메모 저장 실패:', error);
    console.error('문제가 된 pokemonNumber:', pokemonNumber, 'type:', typeof pokemonNumber);
  }
  
  setFirstCatchPokemon(null);
};

  const updatePokedexRegions = async (pokemonNumber, regions) => {
  if (!currentUser?.isAdmin) return;
  
  // ✅ pokemonNumber를 문자열로 변환
  const numericKey = String(pokemonNumber);
  
  const entry = sharedPokedexData[numericKey] || {};
  const updatedEntry = {
    ...entry,
    regions: regions,
    manuallyEdited: true
  };
  
  setSharedPokedexData(prev => ({
    ...prev,
    [numericKey]: updatedEntry
  }));
  
  // 🔥 Firebase에 저장
  try {
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
    await set(pokedexRef, updatedEntry);
    console.log('✅ 도감 지역 업데이트 완료:', numericKey);
  } catch (error) {
    console.error('❌ 도감 지역 업데이트 실패:', error);
  }
};const createCustomItem = async (itemData) => {
  console.log('🎯 useGameState createCustomItem 호출');
  
  const result = await adminCreateCustomItem(itemData);
  
  console.log('🎯 결과:', result);
  
  if (result) {
    console.log('🔄 allItems 업데이트 시작');
    
    // 🔥 Firebase에서 커스텀 아이템 다시 로드
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      const customItems = snapshot.exists() ? snapshot.val() : [];
      
      console.log('🔄 로드된 커스텀 아이템:', customItems.length, '개');
      
      const baseItems = itemsData.items;
      const updatedAllItems = [...baseItems, ...customItems];
      
      console.log('✅ 전체 아이템:', updatedAllItems.length, '개');
      
      setAllItems(updatedAllItems);
      
    } catch (error) {
      console.error('❌ 커스텀 아이템 로드 실패:', error);
    }
  }
  
  return result;
};

  const updateGamePokedex = (selectedPokemonNumbers) => {
    return adminUpdateGamePokedex(selectedPokemonNumbers);
  };

  const updatePokedexMemo = (pokemonNumber, memo) => {
    return gameDataUpdatePokedexMemo(pokemonNumber, memo, currentUser);
  };

// useGameState.js의 handlePurchase 함수 완전 교체본
// 기존 handlePurchase 함수를 통째로 이 코드로 교체하세요

const handlePurchase = async (item, quantity) => {
  if (!currentUser) return false;
  
  console.log('🛒 구매 시도 - 전체 아이템 정보:', item);
  
  let itemData;
  if (typeof item === 'string' || typeof item === 'number') {
    itemData = allItems.find(i => i.id === item);
    if (!itemData) {
      alert('아이템 정보를 찾을 수 없습니다!');
      return false;
    }
  } else {
    itemData = item;
  }
  
  const itemCost = itemData.cost ?? itemData.price ?? itemData.buyPrice ?? 0;
  const totalCost = itemCost * quantity;
  
  console.log('💰 최종 가격:', itemCost, '총액:', totalCost);
  
  if (totalCost <= 0) {
    console.error('❌ 가격이 0 이하입니다! 아이템 정보:', itemData);
    alert('아이템 가격 정보가 올바르지 않습니다!\n\n개발자 도구(F12) 콘솔을 확인해주세요.');
    return false;
  }
  
  if (currentUser.money < totalCost) {
    alert('돈이 부족합니다!');
    return false;
  }
  
  // ⭐ 재고 체크 추가
  const itemStock = itemData.stock ?? 99;
  if (itemStock !== 99 && itemStock < quantity) {
    alert(`재고가 부족합니다! (남은 재고: ${itemStock}개)`);
    return false;
  }
  
  // ⭐ 희귀 아이템의 경우 1인당 구매 이력 체크
  const itemType = itemData.type;
  const itemId = itemData.itemId ?? itemData.id;
  
  if (itemType === 'rare') {
    const purchaseHistory = currentUser.purchaseHistory || {};
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayPurchases = purchaseHistory[today] || {};
    
    const alreadyPurchased = todayPurchases[itemId] || 0;
    if (alreadyPurchased >= 1) {
      alert('오늘의 희귀 아이템은 1인당 1개만 구매할 수 있습니다!');
      return false;
    }
    
    // 구매하려는 수량이 1개를 초과하는지 체크
    if (quantity > 1) {
      alert('희귀 아이템은 한 번에 1개만 구매할 수 있습니다!');
      return false;
    }
  }
  
  // 인벤토리에 아이템 추가
  const existingItem = currentUser.inventory.find(
    i => i.itemId === itemData.id || i.name === itemData.name
  );
  
  const newInventory = existingItem
    ? currentUser.inventory.map(i =>
        (i.itemId === itemData.id || i.name === itemData.name)
          ? { ...i, count: i.count + quantity }
          : i
      )
    : [
        ...currentUser.inventory,
        {
          itemId: itemData.id,
          name: itemData.name,
          nameEn: itemData.nameEn,
          count: quantity,
          imageUrl: itemData.spriteUrl || itemData.imageUrl,
          cost: itemCost,
          sellPrice: itemData.sellPrice,
          category: itemData.category,
          pocket: itemData.pocket,
          effect: itemData.effect,
          friendshipBoost: itemData.friendshipBoost,
          ivBoost: itemData.ivBoost,
          evBoost: itemData.evBoost,
          conditionBoost: itemData.conditionBoost,
          specialEffect: itemData.specialEffect
        }
      ];
  
  const newMoney = currentUser.money - totalCost;
  
  // ⭐ 상점 재고 감소 처리
  try {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    let needShopUpdate = false;
  
    
    if (itemType === 'rare' && updatedShopData.rareDailyItem?.itemId === itemId) {
      // 희귀 아이템 구매 이력 추가
      const purchaseHistory = currentUser.purchaseHistory || {};
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPurchases = purchaseHistory[todayStr] || {};
      todayPurchases[itemId] = (todayPurchases[itemId] || 0) + quantity;
      purchaseHistory[todayStr] = todayPurchases;
      
      console.log('✅ 희귀 아이템 구매 이력 기록:', purchaseHistory);
      
      // ⭐ 희귀 아이템 재고도 감소시키기
      if (updatedShopData.rareDailyItem.stock !== 99) {
        updatedShopData.rareDailyItem = {
          ...updatedShopData.rareDailyItem,
          stock: Math.max(0, updatedShopData.rareDailyItem.stock - quantity)
        };
        needShopUpdate = true;
        console.log('📦 희귀 아이템 재고 감소:', updatedShopData.rareDailyItem);
      }
      
      // 유저 정보 업데이트 (구매 이력 포함)
      updateCurrentUser({
        inventory: newInventory,
        money: newMoney,
        purchaseHistory: purchaseHistory
      });
      
    } else if (itemType === 'daily') {
      // 요일별 아이템 재고 감소
      const dailyItems = updatedShopData.dailyItems?.[todayName] || [];
      updatedShopData.dailyItems[todayName] = dailyItems.map(i => 
        i.itemId === itemId && i.stock !== 99
          ? { ...i, stock: Math.max(0, i.stock - quantity) }
          : i
      );
      needShopUpdate = true;
      
      console.log('📦 요일별 아이템 재고 감소:', updatedShopData.dailyItems[todayName]);
	  
	  
      
    } else if (itemType === 'permanent') {
      // 상시 판매 아이템 재고 감소
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i =>
        i.itemId === itemId && i.stock !== 99
          ? { ...i, stock: Math.max(0, i.stock - quantity) }
          : i
      );
      needShopUpdate = true;
      
      console.log('📦 상시 아이템 재고 감소:', updatedShopData.permanentItems);
    }
    
    // 상점 데이터 업데이트
    if (needShopUpdate) {
      console.log('🔄 상점 데이터 Firebase 업데이트 시작');
      await updateShopData(updatedShopData);
      console.log('✅ 상점 데이터 업데이트 완료');
    }
    
    // 희귀 아이템이 아닌 경우에만 여기서 유저 정보 업데이트
    if (itemType !== 'rare') {
      updateCurrentUser({
        inventory: newInventory,
        money: newMoney
      });
    }
    
    console.log('✅ 구매 완료! 남은 금액:', newMoney);
    
    alert(`${itemData.name} ${quantity}개를 구매했습니다!`);
    return true;
    
  } catch (error) {
    console.error('❌ 재고 업데이트 실패:', error);
    alert('구매 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    return false;
  }
};
  

const useItemOnPokemon = (item, pokemon) => {
  if (!currentUser || !pokemon) return;
  
  const itemData = allItems.find(i => 
    i.id === item.itemId || i.name === item.name
  );
  
  const consumeItem = (item) => {
    if (currentUser.isSuperAdmin) return;
    
    const newInventory = currentUser.inventory
      .map(i => (i.itemId === item.itemId || i.name === item.name)
        ? { ...i, count: i.count - 1 }
        : i
      )
      .filter(i => i.count > 0);
    updateCurrentUser({ inventory: newInventory });
  };

  const updatePokemonInUser = (updatedPokemon) => {
    const updatedCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === updatedPokemon.uniqueId ? updatedPokemon : p
    );
    updateCurrentUser({ caughtPokemon: updatedCaughtPokemon });
  };
  
// ⭐ 기술머신(TM) 사용 로직
if (itemData?.isTM) {
  console.log('💿 기술머신 사용:', itemData);
  
  // ✅ 기술 데이터 가져오기 (여러 방법으로 시도)
  let moveData = allMoves.find(m => m.id === itemData.moveId);
  
  // moveId가 숫자인 경우 (technicalMachines.json의 오래된 형식)
  if (!moveData && typeof itemData.moveId === 'number') {
    console.log('⚠️ moveId가 숫자입니다. nameEn으로 찾습니다:', itemData.nameEn);
    moveData = allMoves.find(m => 
      m.id === itemData.nameEn || 
      m.nameEn === itemData.nameEn ||
      m.name === itemData.name
    );
  }
  
  // 여전히 못 찾았으면 이름으로 시도
  if (!moveData) {
    console.log('⚠️ ID로 못 찾음. 이름으로 재시도:', itemData.name, itemData.nameEn);
    moveData = allMoves.find(m => 
      m.name === itemData.name ||
      m.nameEn === itemData.nameEn
    );
  }
  
  if (!moveData) {
    console.error('❌ 기술을 찾을 수 없습니다:', {
      tmMoveId: itemData.moveId,
      tmName: itemData.name,
      tmNameEn: itemData.nameEn,
      allMovesSample: allMoves.slice(0, 5).map(m => ({ id: m.id, name: m.name }))
    });
    alert('기술 정보를 찾을 수 없습니다!');
    return;
  }
  
  console.log('✅ 기술 찾음:', moveData);
  
  // ✅ 포켓몬이 이 TM을 배울 수 있는지 확인
  const learnset = pokemonLearnsets[pokemon.number.toString()];
  
  if (!learnset) {
    console.warn('⚠️ 이 포켓몬의 학습 데이터가 없습니다:', pokemon.number);
    alert(`${pokemon.nickname || pokemon.name}의 기술 학습 정보를 찾을 수 없습니다!`);
    return;
  }
  
  // TM으로 배울 수 있는 기술인지 확인
  if (!learnset.tmMoves || !learnset.tmMoves.includes(moveData.id)) {
    console.log('❌ 배울 수 없는 TM:', {
      pokemon: pokemon.name,
      pokemonNumber: pokemon.number,
      move: moveData.name,
      moveId: moveData.id,
      tmMovesCount: learnset.tmMoves?.length || 0,
      tmMovesSample: learnset.tmMoves?.slice(0, 10)
    });
    alert(`${pokemon.nickname || pokemon.name}은(는) ${moveData.name}을(를) 배울 수 없습니다!`);
    return;
  }
  
  console.log('✅ 배울 수 있는 TM 확인됨!');
  
  // 현재 기술 확인
  const currentMoves = pokemon.moves || [];
  
  // 이미 배운 기술인지 확인
  if (currentMoves.some(m => m.moveId === moveData.id)) {
    alert(`${pokemon.nickname || pokemon.name}은(는) 이미 ${moveData.name}을(를) 알고 있습니다!`);
    return;
  }
  
  // 기술이 4개 미만이면 바로 배우기
  if (currentMoves.length < 4) {
    const success = movesHook.learnMove(pokemon.uniqueId, moveData);
    if (success) {
      consumeItem(item);
    }
    return;
  }
  
  // 기술이 4개 꽉 찼으면 교체 확인
  const moveNames = currentMoves.map((m, idx) => {
    const move = allMoves.find(mv => mv.id === m.moveId);
    return `${idx + 1}. ${move?.name || '???'}`;
  }).join('\n');
  
  const choice = window.prompt(
    `${pokemon.nickname || pokemon.name}의 기술이 가득 찼습니다!\n\n현재 기술:\n${moveNames}\n\n교체할 기술 번호를 입력하세요 (1-4)\n취소하려면 0을 입력하세요:`
  );
  
  if (choice === null || choice === '0') {
    return; // 취소
  }
  
  const choiceNum = parseInt(choice);
  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > 4) {
    alert('잘못된 입력입니다!');
    return;
  }
  
  const oldMoveId = currentMoves[choiceNum - 1].moveId;
  const success = movesHook.learnMove(pokemon.uniqueId, moveData, oldMoveId);
  
  if (success) {
    consumeItem(item);
  }
  return;
}


  // 기존 아이템 로직들...
  const updatedPokemon = { ...pokemon };
  let itemUsed = false;
  const effectMessages = [];

  if (item.friendshipBoost || itemData?.friendshipBoost) {
    const boost = item.friendshipBoost || itemData.friendshipBoost;
    updatedPokemon.friendship = Math.min(255, (pokemon.friendship || 0) + boost);
    effectMessages.push(`💖 친밀도: ${pokemon.friendship || 0} → ${updatedPokemon.friendship} (+${boost})`);
    itemUsed = true;
  }

  if (item.ivBoost || itemData?.ivBoost) {
    const boost = item.ivBoost || itemData.ivBoost;
    Object.keys(boost).forEach(stat => {
      if (updatedPokemon.ivs && updatedPokemon.ivs[stat] !== undefined) {
        const current = updatedPokemon.ivs[stat] || 0;
        const newValue = Math.min(31, current + boost[stat]);
        updatedPokemon.ivs[stat] = newValue;
        effectMessages.push(`🌟 ${stat}: ${current} → ${newValue} (+${boost[stat]})`);
        itemUsed = true;
      }
    });
  }

  if (item.evBoost || itemData?.evBoost) {
    const boost = item.evBoost || itemData.evBoost;
    const totalEV = Object.values(updatedPokemon.effortValues || {}).reduce((sum, v) => sum + v, 0);
    
    Object.keys(boost).forEach(stat => {
      if (updatedPokemon.effortValues && updatedPokemon.effortValues[stat] !== undefined) {
        const current = updatedPokemon.effortValues[stat] || 0;
        const remaining = 510 - totalEV;
        const actualBoost = Math.min(boost[stat], remaining, 252 - current);
        
        if (actualBoost > 0) {
          const newValue = current + actualBoost;
          updatedPokemon.effortValues[stat] = newValue;
          effectMessages.push(`⚡ ${stat}: ${current} → ${newValue} (+${actualBoost})`);
          itemUsed = true;
        }
      }
    });
  }

  if (item.conditionBoost || itemData?.conditionBoost) {
    const boost = item.conditionBoost || itemData.conditionBoost;
    const conditionMap = {
      'coolness': 'cool',
      'beauty': 'beauty',
      'cuteness': 'cute',
      'cleverness': 'clever',
      'toughness': 'tough'
    };
    
    Object.keys(boost).forEach(condKey => {
      const mappedKey = conditionMap[condKey] || condKey;
      if (updatedPokemon.condition && updatedPokemon.condition[mappedKey] !== undefined) {
        const current = updatedPokemon.condition[mappedKey] || 0;
        const newValue = Math.min(255, current + boost[condKey]);
        updatedPokemon.condition[mappedKey] = newValue;
        effectMessages.push(`✨ ${condKey}: ${current} → ${newValue} (+${boost[condKey]})`);
        itemUsed = true;
      }
    });
  }

  if (item.specialEffect || itemData?.specialEffect) {
    effectMessages.push(`⚡ ${item.specialEffect || itemData.specialEffect}`);
    itemUsed = true;
  }

  if (itemUsed) {
    updatePokemonInUser(updatedPokemon);
    const message = `${pokemon.nickname || pokemon.name}에게 ${item.name}을(를) 사용했습니다!\n\n${effectMessages.join('\n')}`;
    alert(message);
    consumeItem(item);
    return;
  }
  
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
  
  if (itemData?.name === '이상한사탕' || 
      itemData?.nameEn?.toLowerCase().includes('rare candy')) {
    handleRareCandyWithEvolution(pokemon.uniqueId);
    consumeItem(item);
    return;
  }
   
  if (itemData?.category?.includes('evolution')) {
    console.log('🪨 진화의 돌 사용:', itemData.name, itemData.nameEn);
    
    const success = evolutionHook.evolveWithItem(pokemon, itemData.nameEn || itemData.name);
    console.log('✅ 진화 체크 결과:', success);
    
    if (success) {
      consumeItem(item);
    } else {
      alert('이 포켓몬은 해당 아이템으로 진화할 수 없습니다.');
    }
    return;
  }
  
  alert(`${pokemon.nickname || pokemon.name}에게 ${item.name}을(를) 사용했습니다!`);
  consumeItem(item);
};
  
  // ✅ 레시피 관련 함수들
  const createRecipe = async (recipeData) => {
    if (!currentUser?.isAdmin) return false;
    
    const newRecipes = [...recipes, recipeData];
    setRecipes(newRecipes);
    
    // 🔥 Firebase에 저장
    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, newRecipes);
      alert(`✅ 레시피 "${recipeData.name}"이(가) 등록되었습니다!`);
      return true;
    } catch (error) {
      console.error('레시피 저장 실패:', error);
      alert('레시피 저장 중 오류가 발생했습니다.');
      return false;
    }
  };
  
  const deleteRecipe = (recipeId) => {
  setRecipes(prevRecipes => {
    const updatedRecipes = prevRecipes.filter(recipe => recipe.id !== recipeId);
    
    // Firebase에 저장
    if (currentUser?.id) {
      const recipesRef = ref(database, 'recipes');
      set(recipesRef, updatedRecipes);
    }
    
    return updatedRecipes;
  });
};

  const discoverRecipe = async (recipeId) => {
    if (!currentUser) return;
    
    const userDiscovered = discoveredRecipes[currentUser.id] || [];
    
    if (!userDiscovered.includes(recipeId)) {
      const updated = {
        ...discoveredRecipes,
        [currentUser.id]: [...userDiscovered, recipeId]
      };
      setDiscoveredRecipes(updated);
      
      // 🔥 Firebase에 저장
      try {
        const discoveredRef = ref(database, 'gameData/discoveredRecipes');
        await set(discoveredRef, updated);
      } catch (error) {
        console.error('발견된 레시피 저장 실패:', error);
      }
      
      return true;
    }
    return false;
  };

  const cookRecipe = (recipe, usedIngredients) => {
    if (!currentUser) return false;
    
    console.log('🍳 요리 시작:', recipe.name);
    console.log('📦 사용 재료:', usedIngredients);
    
    const hasAllIngredients = usedIngredients.every(ing => {
      const userItem = currentUser.inventory.find(i => i.name === ing.name);
      return userItem && userItem.count >= ing.count;
    });
    
    if (!hasAllIngredients) {
      alert('재료가 부족합니다!');
      return false;
    }
    
    let newInventory = [...currentUser.inventory];
    usedIngredients.forEach(ing => {
      newInventory = newInventory.map(item => 
        item.name === ing.name 
          ? { ...item, count: item.count - ing.count }
          : item
      ).filter(item => item.count > 0);
    });
    
    const resultItem = recipe.result;
    const existingResult = newInventory.find(i => i.name === resultItem.name);
    
    if (existingResult) {
      newInventory = newInventory.map(item =>
        item.name === resultItem.name
          ? { ...item, count: item.count + 1 }
          : item
      );
    } else {
      newInventory.push({
        itemId: `cooked_${Date.now()}`,
        name: resultItem.name,
        count: 1,
        imageUrl: resultItem.spriteUrl || '/images/items/default.png',
        pocket: resultItem.pocket,
        effect: resultItem.effect,
        friendshipBoost: resultItem.friendshipBoost || 0,
        conditionBoost: resultItem.conditionBoost || {},
        canSell: true,
        canUse: true,
        isCooked: true
      });
    }
    
    updateCurrentUser({ inventory: newInventory });
    
    const isNewRecipe = discoverRecipe(recipe.id);
    
    if (isNewRecipe) {
      alert(`🎉 새로운 레시피를 발견했습니다!\n\n"${recipe.name}"이(가) 레시피 도감에 등록되었습니다.`);
    } else {
      alert(`✅ ${resultItem.name}을(를) 만들었습니다!`);
    }
    
    return true;
  };

  const updateIngredientStats = (ingredientName, stats) => {
    console.log('재료 스탯 업데이트:', ingredientName, stats);
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
    reorderPartyPokemon: restPokemonManagement.reorderPartyPokemon,
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
    increaseEffort: pokemonManagement.increaseEffort,
    recipes,
    discoveredRecipes: discoveredRecipes[currentUser?.id] || [],  
    createRecipe,
	deleteRecipe,
    cookRecipe,
    discoverRecipe,
    updateIngredientStats,
    updateCurrentUser,
     isAuthLoading,
    addDailyItem, 
   removeDailyItem, 
    toggleItemPersistent,  
  };
}