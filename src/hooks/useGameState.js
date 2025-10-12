// src/hooks/useGameState.js
import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import regionsData from '../data/regions.json';
import movesData from '../data/moves.json';

import { useAuth } from './useAuth';
import { usePokemonManagement } from './usePokemonManagement';
import { useAdminFunctions } from './useAdminFunctions';

// ===== Storage Helpers =====
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

// ===== Initial Inventory Generator =====
const getInitialInventory = (allItems) => {
  const findItem = (searchTerms) => {
    return allItems.find(i => 
      searchTerms.some(term => {
        const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
        const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
        return nameEn?.includes(searchTerm) || i.name?.includes(term);
      })
    );
  };

  const pokeBall = findItem(['poke ball', 'pokeball', '몬스터볼']);
  const greatBall = findItem(['great ball', 'super ball', '슈퍼볼', '수퍼볼']);
  const ultraBall = findItem(['ultra ball', 'hyper ball', '하이퍼볼']);
  const rareCandy = findItem(['rare candy', '이상한사탕']);

  return [
    { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
    { itemId: greatBall?.id || 3, name: '슈퍼볼', count: 5, imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
    { itemId: ultraBall?.id || 2, name: '하이퍼볼', count: 2, imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
    { itemId: rareCandy?.id || 50, name: '이상한사탕', count: 3, imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png' }
  ];
};

// ===== Main Hook =====
export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);
  
  // 마스터 데이터
  const [allPokemon] = useState(pokemonData.pokemon);
  const [allPokemonMaster] = useState(allPokemonData.pokemon);
  const [allItems] = useState(itemsData.items);
  const [allMoves] = useState(movesData.moves || []);                 
  const [pokemonLearnsets] = useState(movesData.pokemonLearnsets || {}); 

  // 멤버 데이터
  const [members, setMembers] = useState(() => {
  const saved = loadFromStorage('poke_members', null);
  
  // 기존 데이터 마이그레이션
  if (saved) {
    const updated = {};
    Object.keys(saved).forEach(userId => {
      const member = saved[userId];
      
      
      // ⭐ 포켓몬 데이터 마이그레이션 (nameEn + 기술 하이브리드)
      const updatedCaughtPokemon = member.caughtPokemon?.map(pokemon => {
        if (!pokemon) return pokemon;
        
        let updatedPokemon = { ...pokemon };
        
        // 1. nameEn 필드 추가
        if (!updatedPokemon.nameEn) {
          const template = allPokemonData.pokemon.find(p => 
            p.number === pokemon.number || p.id === pokemon.pokemonId
          );
          if (template?.nameEn) {
            updatedPokemon.nameEn = template.nameEn;
          }
        }
        
        // 2. 기술 데이터를 하이브리드 형식으로 변환
        if (updatedPokemon.moves && Array.isArray(updatedPokemon.moves)) {
          updatedPokemon.moves = updatedPokemon.moves.map(move => {
            if (!move) return move;
            
            // 이미 하이브리드 형식이면 그대로
            if (!move.name && move.moveId) return move;
            
            // 기존 형식 → 하이브리드 형식
            return {
              moveId: move.moveId || move.id,
              currentPp: move.currentPp !== undefined ? move.currentPp : move.pp,
              learnedAt: move.learnedAt
            };
          });
        }
        
        
        return updatedPokemon;
      }) || member.caughtPokemon;
      
      updated[userId] = { ...member, caughtPokemon: updatedCaughtPokemon };
    });
    
    saveToStorage('poke_members', updated);
    return updated;
  }

    // 초기 데이터
    const initialMembers = {
      admin: {
        id: 'admin',
        password: 'admin123',
        name: '관리자',
        isAdmin: true,
        isSuperAdmin: true,
        dailyWalks: 5,
        maxDailyWalks: 5,
        money: 5000,
        caughtPokemon: [],
        inventory: getInitialInventory(itemsData.items)
      }
    };
    saveToStorage('poke_members', initialMembers);
    return initialMembers;
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
    return allPokemonData.pokemon
      .filter(p => parseInt(p.generation) === 1)
      .map((p, index) => ({ ...p, originalNumber: p.number, newNumber: index + 1 }));
  });

  // 공유 도감 데이터
  const [sharedPokedexData, setSharedPokedexData] = useState(() => 
    loadFromStorage('poke_sharedPokedex', {})
  );

  // 상점 데이터
  const [shopData, setShopData] = useState(() => {
    const saved = loadFromStorage('poke_shop', null);
    if (saved) return saved;
    return {
      dailyItems: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
      permanentItems: [],
      rareDailyItem: { itemId: null, price: 0, lastRefresh: null }
    };
  });

  // ===== 인증 기능 =====
  const {
    currentUser,
    handleLogin,
    handleLogout,
    updateCurrentUser
  } = useAuth(members, setMembers);

  // ===== 포켓몬 관리 기능 =====
  const {
    handleCatchSuccess: catchPokemon,
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    setPartnerPokemon,
    useRareCandy,
    updatePokemonNickname,
    giveItemToPokemon,
    takeItemFromPokemon,
    learnMove
  } = usePokemonManagement(currentUser, updateCurrentUser, allPokemonMaster, setSharedPokedexData, sharedPokedexData, pokemonLearnsets, allMoves);

  // ===== 관리자 기능 =====
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
    updateRegionPokemon,
    updateGamePokedex,
    resetGameData
  } = useAdminFunctions(
    currentUser, 
    members, 
    setMembers, 
    updateCurrentUser, 
    setRegions,
    setGamePokedex,
    allPokemonMaster,
    allPokemon
  );

  // ===== Auto Save =====
  useEffect(() => { saveToStorage('poke_members', members); }, [members]);
  useEffect(() => { saveToStorage('poke_regions', regions); }, [regions]);
  useEffect(() => { saveToStorage('poke_gamePokedex', gamePokedex); }, [gamePokedex]);
  useEffect(() => { saveToStorage('poke_sharedPokedex', sharedPokedexData); }, [sharedPokedexData]);
  useEffect(() => { saveToStorage('poke_shop', shopData); }, [shopData]);

  // ===== Daily Walk Reset =====
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
  }, [currentUser]);

  // ===== Region Click Handler =====
  const handleRegionClick = (region) => {
    if (!currentUser) return;
    
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

  // Wrapper for handleCatchSuccess with firstCatch callback
  const handleCatchSuccess = (pokemon, ballUsed) => {
    catchPokemon(pokemon, ballUsed, setFirstCatchPokemon, movesData, allPokemonMaster); // ⭐ movesData 전달
};

  // ===== First Catch Memo =====
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

  // ===== Shop Functions =====
  const updateShopData = (newShopData) => {
    if (!currentUser?.isAdmin) return;
    setShopData(newShopData);
  };

  const handlePurchase = (itemId, quantity, totalPrice) => {
    if (!currentUser) return;
    
    if (currentUser.money < totalPrice) {
      alert('💰 돈이 부족합니다!');
      return;
    }
    
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
      alert('아이템을 찾을 수 없습니다!');
      return;
    }
    
    const existingItem = currentUser.inventory.find(i => i.itemId === itemId || i.name === item.name);
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i => 
          (i.itemId === itemId || i.name === item.name) ? { ...i, count: i.count + quantity } : i
        )
      : [...currentUser.inventory, { itemId: item.id, name: item.name, count: quantity, imageUrl: item.spriteUrl }];
    
    updateCurrentUser({ money: currentUser.money - totalPrice, inventory: newInventory });
    
    // 재고 감소
    const newShopData = { ...shopData };
    let updated = false;
    
    Object.keys(newShopData.dailyItems || {}).forEach(day => {
      newShopData.dailyItems[day] = newShopData.dailyItems[day].map(shopItem => {
        if (shopItem.itemId === itemId && shopItem.stock !== 99) {
          updated = true;
          return { ...shopItem, stock: Math.max(0, shopItem.stock - quantity) };
        }
        return shopItem;
      });
    });
    
    if (newShopData.permanentItems) {
      newShopData.permanentItems = newShopData.permanentItems.map(shopItem => {
        if (shopItem.itemId === itemId && shopItem.stock !== 99) {
          updated = true;
          return { ...shopItem, stock: Math.max(0, shopItem.stock - quantity) };
        }
        return shopItem;
      });
    }
    
    if (newShopData.rareDailyItem?.itemId === itemId && newShopData.rareDailyItem.stock !== 99) {
      updated = true;
      newShopData.rareDailyItem = {
        ...newShopData.rareDailyItem,
        stock: Math.max(0, (newShopData.rareDailyItem.stock || 99) - quantity)
      };
    }
    
    if (updated) setShopData(newShopData);
    alert(`✅ ${item.name} ${quantity}개를 구매했습니다!`);
  };

  // ===== Pokedex Memo Update =====
  const updatePokedexMemo = (pokemonNumber, memo) => {
    const entry = sharedPokedexData[pokemonNumber];
    if (!entry || entry.firstCatcher !== currentUser.name) {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
      return;
    }
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: { ...prev[pokemonNumber], memo }
    }));
  };

// useGameState.js에 추가할 함수들
// 기존 코드 아래에 추가하세요

// ===== 기술 관리 함수 =====

// 기술 잊기
const forgetMove = (pokemonUniqueId, moveId) => {
  if (!currentUser) return;
  
  const newCaughtPokemon = currentUser.caughtPokemon.map(p => {
    if (p && p.uniqueId === pokemonUniqueId) {
      return {
        ...p,
        moves: (p.moves || []).filter(m => m.moveId !== moveId)  // ⭐ moveId로 비교
      };
    }
    return p;
  });
  
  updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  alert('기술을 잊었습니다.');
};


// 기술 교체
const replaceMove = (pokemonUniqueId, newMoveData, oldMoveId) => {  // ⭐ 파라미터 순서 확인!
  if (!currentUser) return false;
  
  console.log('🎯 replaceMove 실행');
  console.log('🎯 pokemonUniqueId:', pokemonUniqueId);
  console.log('🎯 newMoveData:', newMoveData);
  console.log('🎯 oldMoveId:', oldMoveId);
  
  const pokemonIndex = currentUser.caughtPokemon.findIndex(
    p => p && p.uniqueId === pokemonUniqueId
  );
  
  if (pokemonIndex === -1) return false;
  
  const pokemon = currentUser.caughtPokemon[pokemonIndex];
  const currentMoves = pokemon.moves || [];
  
  // ⭐ 최소 정보만 저장
  const newMove = {
    moveId: newMoveData.id,
    currentPp: newMoveData.pp || 0,
    learnedAt: pokemon.level
  };
  
  const updatedMoves = currentMoves.map(m => 
    m.moveId === oldMoveId ? newMove : m
  );
  
  const newCaughtPokemon = [...currentUser.caughtPokemon];
  newCaughtPokemon[pokemonIndex] = {
    ...pokemon,
    moves: updatedMoves
  };
  
  updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  alert(`${pokemon.nickname || pokemon.name}이(가) ${newMoveData.name}을(를) 배웠습니다!`);
  return true;
};

// 레벨업 시 배울 수 있는 기술 확인 (movesData 필요)
const checkLevelUpMoves = (pokemon, movesData) => {
  if (!movesData?.pokemonLearnsets) return [];
  
  const learnset = movesData.pokemonLearnsets[pokemon.number.toString()];
  if (!learnset) return [];
  
  return learnset.levelUpMoves
    .filter(lm => lm.level === pokemon.level)
    .map(lm => movesData.moves.find(m => m.id === lm.moveId))
    .filter(Boolean);
};

// 관리자: 포켓몬에게 기술 직접 추가
const giveMoveToPokemon = (pokemonUniqueId, moveData) => {
  if (!currentUser?.isAdmin) {
    alert('관리자만 사용할 수 있습니다!');
    return false;
  }
  return learnMove(pokemonUniqueId, moveData);
};


  // ===== Return Values =====
  return {
    currentTab, setCurrentTab,
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
    setPartnerPokemon,
    
    // Auth
    handleLogin,
    handleLogout,
    
    // Game
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    saveFirstCatchMemo,
    skipFirstCatchMemo,
    
    // Pokemon
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    setPartnerPokemon,
    useRareCandy,
    updatePokemonNickname,
    giveItemToPokemon,
    takeItemFromPokemon,
    
    // Admin
    updateMaxDailyWalks,
    updateRegionPokemon,
    addMember,
    toggleAdminStatus,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetGameData,
    updatePokedexMemo,
    updateGamePokedex,
    addItemToSelf,
    giveItemToMember,
    toggleItemManagement,
    givePokemonToMember,
    addPokemonToSelf,
    
    // Shop
    handlePurchase,
    updateShopData,

      // Moves (기술 관리)
    forgetMove,
    learnMove,
    replaceMove,
    giveMoveToPokemon,
    checkLevelUpMoves,
    allMoves,
    pokemonLearnsets
  };
}