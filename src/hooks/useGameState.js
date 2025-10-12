import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import customItemsData from '../data/customItems.json';
import regionsData from '../data/regions.json';
import { useAdminFunctions } from './useAdminFunctions';

// LocalStorage 헬퍼 함수
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

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null);
  
  // 로그인 상태 복원
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserId = localStorage.getItem('poke_currentUserId');
      if (!savedUserId) return null;
      
      const members = loadFromStorage('poke_members', {});
      const user = members[savedUserId];
      
      if (!user) {
        localStorage.removeItem('poke_currentUserId');
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('로그인 상태 복원 실패:', error);
      localStorage.removeItem('poke_currentUserId');
      return null;
    }
  });

  // 마스터 데이터
  const [allPokemon] = useState(pokemonData.pokemon);
  const [allPokemonMaster] = useState(allPokemonData.pokemon);
  
  // 아이템 데이터 - 기본 + 커스텀 합치기
  const [allItems, setAllItems] = useState(() => {
    const baseItems = itemsData.items;
    const customItems = loadFromStorage('poke_customItems', customItemsData.items || []);
    return [...baseItems, ...customItems];
  });

  // 멤버 데이터 관리
  const [members, setMembers] = useState(() => {
    const saved = loadFromStorage('poke_members', null);
    
    if (saved) {
      const updated = {};
      Object.keys(saved).forEach(userId => {
        const member = saved[userId];
        
        const updatedCaughtPokemon = member.caughtPokemon?.map(pokemon => {
          if (!pokemon) return pokemon;
          if (pokemon.nameEn) return pokemon;
          
          const template = allPokemonData.pokemon.find(p => 
            p.number === pokemon.number || p.id === pokemon.pokemonId
          );
          
          if (template && template.nameEn) {
            return { ...pokemon, nameEn: template.nameEn };
          }
          
          return pokemon;
        }) || member.caughtPokemon;
        
        updated[userId] = { ...member, caughtPokemon: updatedCaughtPokemon };
      });
      
      saveToStorage('poke_members', updated);
      return updated;
    }

    const findItem = (searchTerms) => {
      return itemsData.items.find(i => 
        searchTerms.some(term => {
          const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
          const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
          return nameEn?.includes(searchTerm) || i.name?.includes(term);
        })
      );
    };

    const getInitialInventory = () => {
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
        inventory: getInitialInventory()
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
      .map((p, index) => ({
        ...p,
        originalNumber: p.number,
        newNumber: index + 1
      }));
  });

  // 전체 공유 도감 데이터
  const [sharedPokedexData, setSharedPokedexData] = useState(() => 
    loadFromStorage('poke_sharedPokedex', {})
  );

  // 자동 저장
  useEffect(() => {
    saveToStorage('poke_members', members);
    if (currentUser && currentUser.id) {
      const updatedUser = members[currentUser.id];
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [members]);

  useEffect(() => { saveToStorage('poke_regions', regions); }, [regions]);
  useEffect(() => { saveToStorage('poke_gamePokedex', gamePokedex); }, [gamePokedex]);
  useEffect(() => { saveToStorage('poke_sharedPokedex', sharedPokedexData); }, [sharedPokedexData]);

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
  }, [currentUser]);

  // 로그인/로그아웃
  const handleLogin = (userId, password) => {
    const member = members[userId];
    if (member && member.password === password) {
      setCurrentUser(member);
      localStorage.setItem('poke_currentUserId', userId);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('map');
    setEncounterPokemon(null);
    localStorage.removeItem('poke_currentUserId');
    window.location.reload();
  };

  const updateCurrentUser = (updates) => {
    if (!currentUser) return;
    setMembers(prev => ({
      ...prev,
      [currentUser.id]: { ...prev[currentUser.id], ...updates }
    }));
    setCurrentUser(prev => ({ ...prev, ...updates }));
  };

  // 구역 클릭
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
      alert('오늘의 산책 횟수를 모두 사용했습니다!');
    }
  };

  const handleCloseEncounter = () => {
    setEncounterPokemon(null);
  };

  const handleCatchSuccess = (pokemon, ballUsed) => {
    if (!currentUser) return;
    
    const pokemonTemplate = allPokemonData.pokemon.find(p => 
      p.number === (pokemon.number || pokemon.originalNumber)
    );
    
    if (!pokemonTemplate) {
      console.error('포켓몬 템플릿을 찾을 수 없습니다:', pokemon);
      alert('포켓몬 정보를 찾을 수 없습니다!');
      return;
    }
    
    const newPokemon = {
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      level: Math.floor(Math.random() * 20) + 5,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      friendship: 0,
      heldItem: null,
      moves: [],
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
    };
    
    const updatedCaughtPokemon = [...currentUser.caughtPokemon, newPokemon];
    
    const updatedInventory = currentUser.isSuperAdmin 
      ? currentUser.inventory
      : currentUser.inventory.map(item => 
          item.name === ballUsed.name 
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

  // 관리자 기능들을 useAdminFunctions에서 가져오기
  const adminFunctions = useAdminFunctions(
    currentUser,
    members,
    setMembers,
    updateCurrentUser,
    setRegions,
    setGamePokedex,
    allPokemonData.pokemon,
    pokemonData.pokemon,
    
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
    resetGameData
  } = adminFunctions;

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

  // 아이템 판매
  const sellItem = (item, count) => {
    if (!currentUser) return false;
    
    const inventoryItem = currentUser.inventory.find(i => 
      i.itemId === item.itemId || i.name === item.name
    );
    
    if (!inventoryItem || inventoryItem.count < count) {
      alert('판매할 아이템이 부족합니다!');
      return false;
    }
    
    const itemData = allItems.find(i => 
      i.id === item.itemId || i.name === item.name
    );
    
    if (!itemData || !itemData.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return false;
    }
    
    const sellPrice = itemData.sellPrice || Math.floor((itemData.cost || 0) * 0.5);
    const totalPrice = sellPrice * count;
    
    const newInventory = currentUser.inventory
      .map(i => 
        (i.itemId === item.itemId || i.name === item.name)
          ? { ...i, count: i.count - count }
          : i
      )
      .filter(i => i.count > 0);
    
    updateCurrentUser({ 
      inventory: newInventory,
      money: (currentUser.money || 0) + totalPrice
    });
    
    alert(`${item.name} ${count}개를 ₽${totalPrice.toLocaleString()}에 판매했습니다!`);
    return true;
  };

  // 상점 데이터 관리
const [shopData, setShopData] = useState(() => 
  loadFromStorage('poke_shopData', {
    items: [],
    refreshInterval: 86400000, // 24시간 (밀리초)
    lastRefresh: Date.now()
  })
);

useEffect(() => { 
  saveToStorage('poke_shopData', shopData); 
}, [shopData]);

const updateShopData = (newShopData) => {
  setShopData(newShopData);
};

  // 포켓몬 관리
  const movePokemonToParty = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) { alert('포켓몬을 찾을 수 없습니다!'); return; }
    if (pokemonIndex < 6) { alert('이미 엔트리에 있습니다!'); return; }
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (currentUser.caughtPokemon[i] === null) { emptySlotIndex = i; break; }
    }
    if (emptySlotIndex === -1) { alert('엔트리가 가득 찼습니다!'); return; }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    newCaughtPokemon[emptySlotIndex] = pokemon;
    newCaughtPokemon.splice(pokemonIndex, 1);
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    alert('엔트리로 이동했습니다!');
  };

  const movePokemonToBox = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) { alert('포켓몬을 찾을 수 없습니다!'); return; }
    if (pokemonIndex >= 6) { alert('이미 박스에 있습니다!'); return; }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    newCaughtPokemon[pokemonIndex] = null;
    newCaughtPokemon.push(pokemon);
    
    const party = newCaughtPokemon.slice(0, 6);
    const box = newCaughtPokemon.slice(6);
    const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
    const finalPokemon = [...sortedParty, ...box];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
    alert('박스로 이동했습니다!');
  };

  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) return;
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    
    if (pokemonIndex < 6) {
      newCaughtPokemon[pokemonIndex] = null;
      const party = newCaughtPokemon.slice(0, 6);
      const box = newCaughtPokemon.slice(6);
      const sortedParty = [
        ...party.filter(p => p !== null),
        ...party.filter(p => p === null)
      ];
      const finalPokemon = [...sortedParty, ...box];
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      newCaughtPokemon.splice(pokemonIndex, 1);
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    }
  };

  const useRareCandy = (uniqueId) => {
    if (!currentUser) return;
    const candyItem = currentUser.inventory.find(item => item.name === '이상한사탕');
    if (!candyItem || candyItem.count <= 0) { alert('이상한사탕이 없습니다!'); return; }
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, level: p.level + 1 } : p
    );
    
    const newInventory = currentUser.isSuperAdmin
      ? currentUser.inventory
      : currentUser.inventory.map(item =>
          item.name === '이상한사탕' ? { ...item, count: item.count - 1 } : item
        );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon, inventory: newInventory });
    alert('레벨이 1 올랐습니다!');
  };

  const updatePokemonNickname = (uniqueId, nickname) => {
    if (!currentUser) return;
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, nickname: nickname } : p
    );
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  };

  const updatePokedexMemo = (pokemonNumber, memo) => {
    const entry = sharedPokedexData[pokemonNumber];
    if (!entry || entry.firstCatcher !== currentUser.name) {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
      return;
    }
    setSharedPokedexData(prev => ({
      ...prev,
      [pokemonNumber]: { ...prev[pokemonNumber], memo: memo }
    }));
  };

  const updateGamePokedex = (selectedPokemonNumbers) => {
    return adminUpdateGamePokedex(selectedPokemonNumbers);
  };

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
    editMemberPokemon,
    updateShopData,
    handleLogin, handleLogout,
    handleRegionClick, handleCloseEncounter, handleCatchSuccess,
    saveFirstCatchMemo, skipFirstCatchMemo,
    updateMaxDailyWalks, updateRegionPokemon,
    addMember, toggleAdminStatus,
    resetMemberWalkCount, resetAllWalkCounts, resetGameData,
    movePokemonToParty, movePokemonToBox, releasePokemon,
    useRareCandy, updatePokemonNickname,
    updatePokedexMemo, updateGamePokedex,
    addItemToSelf, giveItemToMember, toggleItemManagement,
    givePokemonToMember, addPokemonToSelf,
    sellItem, createCustomItem
  };
}