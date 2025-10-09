import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import allPokemonData from '../data/allPokemon.json';
import itemsData from '../data/items.json';
import regionsData from '../data/regions.json';

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
  const [firstCatchPokemon, setFirstCatchPokemon] = useState(null); // 첫 포획 모달용
  
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
  const [allItems] = useState(itemsData.items);

  // 멤버 데이터 관리
  const [members, setMembers] = useState(() => {
    const saved = loadFromStorage('poke_members', null);
    
    // 아이템 찾기 헬퍼
    const findItem = (searchTerms) => {
      return allItems.find(i => 
        searchTerms.some(term => {
          const nameEn = i.nameEn?.toLowerCase().replace(/[éê]/g, 'e');
          const searchTerm = term.toLowerCase().replace(/[éê]/g, 'e');
          return nameEn?.includes(searchTerm) || i.name?.includes(term);
        })
      );
    };

    // 기존 데이터 마이그레이션: 아이템 이미지 URL 업데이트
    if (saved) {
      const updated = {};
      Object.keys(saved).forEach(userId => {
        const member = saved[userId];
        const updatedInventory = member.inventory?.map(item => {
          // 이미 올바른 URL이면 그대로 반환
          if (item.imageUrl?.includes('raw.githubusercontent.com')) {
            return item;
          }

          // items.json에서 찾아서 URL 업데이트
          let itemData = null;
          if (item.name === '몬스터볼') itemData = findItem(['poke ball', 'pokeball']);
          else if (item.name === '슈퍼볼') itemData = findItem(['great ball', 'super ball']);
          else if (item.name === '하이퍼볼') itemData = findItem(['ultra ball', 'hyper ball']);
          else if (item.name === '이상한사탕') itemData = findItem(['rare candy']);

          return {
            ...item,
            imageUrl: itemData?.spriteUrl || item.imageUrl
          };
        }) || member.inventory;

        updated[userId] = { ...member, inventory: updatedInventory };
      });
      
      saveToStorage('poke_members', updated);
      return updated;
    }

    // 초기 인벤토리 생성 (items.json 기반)
    const getInitialInventory = () => {
      // 아이템 찾기 헬퍼 함수 (특수문자 처리)
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
        { 
          itemId: pokeBall?.id || 4,
          name: '몬스터볼', 
          count: 15, 
          imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
        },
        { 
          itemId: greatBall?.id || 3,
          name: '슈퍼볼', 
          count: 5, 
          imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png'
        },
        { 
          itemId: ultraBall?.id || 2,
          name: '하이퍼볼', 
          count: 2, 
          imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png'
        },
        { 
          itemId: rareCandy?.id || 50,
          name: '이상한사탕', 
          count: 3, 
          imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png'
        },
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
    
    return allPokemonMaster
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
        const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
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

  // 포켓몬 포획 성공
  const handleCatchSuccess = (pokemon, ballUsed) => {
    if (!currentUser) return;
    
    const pokemonTemplate = allPokemonMaster.find(p => 
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
      number: pokemonTemplate.number,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      level: Math.floor(Math.random() * 20) + 5,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${pokemonTemplate.number}.png`
    };
    
    const updatedCaughtPokemon = [...currentUser.caughtPokemon, newPokemon];
    
    // 슈퍼 관리자는 아이템 소모 안함
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

    // 첫 포획 체크
    const isFirstCatch = !sharedPokedexData[pokemonTemplate.number];
    if (isFirstCatch) {
      setFirstCatchPokemon(pokemonTemplate);
    }
  };

  // 첫 포획 메모 저장
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

  // 첫 포획 메모 건너뛰기
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

  // 관리자 기능들
  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax });
  };

  const updateRegionPokemon = (regionId, pokemonIds) => {
    if (!currentUser?.isAdmin) return;
    setRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, pokemons: pokemonIds } : region
    ));
  };

  const addMember = (id, password, name) => {
    if (!currentUser?.isAdmin) return false;
    if (members[id]) return false;
    
    // 초기 인벤토리 생성 함수
    const getInitialInventory = () => {
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
        { 
          itemId: pokeBall?.id || 4,
          name: '몬스터볼', 
          count: 15, 
          imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
        },
        { 
          itemId: greatBall?.id || 3,
          name: '슈퍼볼', 
          count: 5, 
          imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png'
        },
        { 
          itemId: ultraBall?.id || 2,
          name: '하이퍼볼', 
          count: 2, 
          imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png'
        },
        { 
          itemId: rareCandy?.id || 50,
          name: '이상한사탕', 
          count: 3, 
          imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png'
        },
      ];
    };
    
    setMembers(prev => ({
      ...prev,
      [id]: {
        id, password, name,
        isAdmin: false,
        isSuperAdmin: false,
        dailyWalks: 5,
        maxDailyWalks: 5,
        money: 5000,
        caughtPokemon: [],
        inventory: getInitialInventory()
      }
    }));
    return true;
  };

  const toggleAdminStatus = (memberId) => {
    if (!currentUser?.isSuperAdmin || memberId === 'admin') return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], isAdmin: !prev[memberId].isAdmin }
    }));
  };

  const resetMemberWalkCount = (memberId) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], dailyWalks: prev[memberId].maxDailyWalks }
    }));
    if (currentUser.id === memberId) {
      setCurrentUser(prev => ({ ...prev, dailyWalks: prev.maxDailyWalks }));
    }
  };

  const resetAllWalkCounts = () => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => {
      const updated = {};
      Object.keys(prev).forEach(id => {
        updated[id] = { ...prev[id], dailyWalks: prev[id].maxDailyWalks };
      });
      return updated;
    });
    setCurrentUser(prev => ({ ...prev, dailyWalks: prev.maxDailyWalks }));
  };

  const resetGameData = () => {
    if (!currentUser?.isSuperAdmin) return;
    const confirmed = window.confirm('⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!');
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
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
      // 엔트리에서 방생: null로 만들고 정렬
      newCaughtPokemon[pokemonIndex] = null;
      
      // 엔트리와 박스 분리
      const party = newCaughtPokemon.slice(0, 6);
      const box = newCaughtPokemon.slice(6);
      
      // 엔트리 정렬: null이 아닌 포켓몬을 앞으로
      const sortedParty = [
        ...party.filter(p => p !== null),
        ...party.filter(p => p === null)
      ];
      
      // 최종 배열
      const finalPokemon = [...sortedParty, ...box];
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      // 박스에서 방생: 그냥 삭제
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
    
    // 슈퍼 관리자는 아이템 소모 안함
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
    if (!currentUser?.isAdmin) return;
    
    const newPokedex = selectedPokemonNumbers
      .map(num => allPokemonMaster.find(p => p.number === num))
      .filter(Boolean)
      .sort((a, b) => a.number - b.number)
      .map((p, index) => ({
        ...p,
        originalNumber: p.number,
        newNumber: index + 1
      }));
    
    setGamePokedex(newPokedex);
    
    const validPokemonIds = new Set(
      selectedPokemonNumbers
        .map(num => allPokemon.find(p => p.number === num)?.id)
        .filter(Boolean)
    );
    
    setRegions(prev => prev.map(region => ({
      ...region,
      pokemons: region.pokemons.filter(pokemonId => validPokemonIds.has(pokemonId))
    })));
    
    alert('✅ 게임 도감이 업데이트되었습니다!\n구역에서 제거된 포켓몬도 자동 삭제되었습니다.');
  };

  // 관리자 기능: 자신에게 아이템 추가
  const addItemToSelf = (item, count) => {
    if (!currentUser?.isAdmin) return;
    if (!(currentUser.isSuperAdmin || currentUser.canManageItems)) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }

    const existingItem = currentUser.inventory.find(i => i.itemId === item.id || i.name === item.name);
    
    const newInventory = existingItem
      ? currentUser.inventory.map(i => 
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...currentUser.inventory,
          {
            itemId: item.id,
            name: item.name,
            count: count,
            imageUrl: item.spriteUrl
          }
        ];

    updateCurrentUser({ inventory: newInventory });
    alert(`${item.name} ${count}개를 추가했습니다!`);
  };

  // 관리자 기능: 회원에게 아이템 지급
  const giveItemToMember = (memberId, item, count) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const existingItem = member.inventory.find(i => i.itemId === item.id || i.name === item.name);
    
    const newInventory = existingItem
      ? member.inventory.map(i => 
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...member.inventory,
          {
            itemId: item.id,
            name: item.name,
            count: count,
            imageUrl: item.spriteUrl
          }
        ];

    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], inventory: newInventory }
    }));

    alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
  };

  // 슈퍼 관리자 기능: 일반 관리자 아이템 관리 권한 토글
  const toggleItemManagement = (memberId) => {
    if (!currentUser?.isSuperAdmin) return;

    setMembers(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        canManageItems: !prev[memberId].canManageItems
      }
    }));
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
    handleLogin, handleLogout,
    handleRegionClick, handleCloseEncounter, handleCatchSuccess,
    saveFirstCatchMemo, skipFirstCatchMemo,
    updateMaxDailyWalks, updateRegionPokemon,
    addMember, toggleAdminStatus,
    resetMemberWalkCount, resetAllWalkCounts, resetGameData,
    movePokemonToParty, movePokemonToBox, releasePokemon,
    useRareCandy, updatePokemonNickname,
    updatePokedexMemo, updateGamePokedex,
    addItemToSelf, giveItemToMember, toggleItemManagement
  };
}