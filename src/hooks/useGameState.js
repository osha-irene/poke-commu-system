import { useState, useEffect } from 'react';
import pokemonData from '../data/pokemon.json';
import itemsData from '../data/items.json';
import regionsData from '../data/regions.json';

export default function useGameState() {
  const [currentTab, setCurrentTab] = useState('map');
  const [encounterPokemon, setEncounterPokemon] = useState(null);
  
  // 로그인 상태 복원 (localStorage에서)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserId = localStorage.getItem('poke_currentUserId');
      if (!savedUserId) {
        return null; // 명시적으로 null 반환
      }
      
      const members = loadFromStorage('poke_members', {});
      const user = members[savedUserId];
      
      // 사용자가 없으면 localStorage 정리하고 null 반환
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
  const [allItems] = useState(itemsData.items);

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

  // 멤버 데이터 관리
  const [members, setMembers] = useState(() => {
    const saved = loadFromStorage('poke_members', null);
    if (saved) return saved;

    // 최초 실행 시 admin 계정 생성
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
        inventory: [
          { itemId: 1, name: '몬스터볼', count: 15, imageUrl: '/images/items/pokeball.png' },
          { itemId: 2, name: '슈퍼볼', count: 5, imageUrl: '/images/items/greatball.png' },
          { itemId: 3, name: '하이퍼볼', count: 2, imageUrl: '/images/items/ultraball.png' },
          { itemId: 4, name: '이상한사탕', count: 3, imageUrl: '/images/items/rare-candy.png' },
        ]
      }
    };
    saveToStorage('poke_members', initialMembers);
    return initialMembers;
  });

  // 구역 설정 (전체 공유)
  const [regions, setRegions] = useState(() => {
    const saved = loadFromStorage('poke_regions', null);
    if (saved) return saved;
    
    return regionsData.regions.map(region => ({
      ...region,
      pokemons: region.defaultPokemon
    }));
  });

  // members 변경 시 자동 저장 + currentUser 업데이트
  useEffect(() => {
    saveToStorage('poke_members', members);
    
    // 현재 로그인한 사용자 정보 동기화
    if (currentUser && currentUser.id) {
      const updatedUser = members[currentUser.id];
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [members, currentUser]);

  // regions 변경 시 자동 저장
  useEffect(() => {
    saveToStorage('poke_regions', regions);
  }, [regions]);

  // 매일 자정에 산책 횟수 리셋
  useEffect(() => {
    if (!currentUser) return;

    const checkAndResetWalks = () => {
      const lastReset = localStorage.getItem('poke_lastWalkReset');
      const today = new Date().toDateString();
      
      if (lastReset !== today) {
        setMembers(prev => {
          const updated = {};
          Object.keys(prev).forEach(id => {
            updated[id] = {
              ...prev[id],
              dailyWalks: prev[id].maxDailyWalks
            };
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

  // 로그인
  const handleLogin = (userId, password) => {
    const member = members[userId];
    if (member && member.password === password) {
      setCurrentUser(member);
      localStorage.setItem('poke_currentUserId', userId); // 로그인 상태 저장
      return true;
    }
    return false;
  };

  // 로그아웃
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('map');
    setEncounterPokemon(null);
    localStorage.removeItem('poke_currentUserId'); // 로그인 상태 제거
    
    // 강제 새로고침으로 완전히 초기화
    window.location.reload();
  };

  // 현재 사용자 업데이트
  const updateCurrentUser = (updates) => {
    if (!currentUser) return;
    
    setMembers(prev => ({
      ...prev,
      [currentUser.id]: {
        ...prev[currentUser.id],
        ...updates
      }
    }));
    
    setCurrentUser(prev => ({
      ...prev,
      ...updates
    }));
  };

  // 구역 클릭 (포켓몬 조우)
  const handleRegionClick = (region) => {
    if (!currentUser) return;
    
    if (currentUser.dailyWalks > 0) {
      const regionPokemonIds = region.pokemons;
      const availablePokemon = allPokemon.filter(p => regionPokemonIds.includes(p.id));
      
      if (availablePokemon.length > 0) {
        const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
        setEncounterPokemon(randomPokemon);
        
        updateCurrentUser({ dailyWalks: currentUser.dailyWalks - 1 });
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
    
    const pokemonTemplate = allPokemon.find(p => p.id === pokemon.id);
    
    const newPokemon = {
      uniqueId: Date.now(),
      pokemonId: pokemon.id,
      name: pokemon.name,
      number: pokemon.number,
      type: pokemon.type,
      level: Math.floor(Math.random() * 20) + 5,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      imageUrl: pokemon.imageUrl,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemon.number}.png`,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.number}.gif`
    };
    
    const updatedCaughtPokemon = [...currentUser.caughtPokemon, newPokemon];
    const updatedInventory = currentUser.inventory.map(item => 
      item.name === ballUsed.name 
        ? { ...item, count: Math.max(0, item.count - 1) }
        : item
    );
    
    updateCurrentUser({
      caughtPokemon: updatedCaughtPokemon,
      inventory: updatedInventory
    });
  };

  // 관리자 기능: 일일 산책 횟수 설정
  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax });
  };

  // 관리자 기능: 구역 포켓몬 설정
  const updateRegionPokemon = (regionId, pokemonIds) => {
    if (!currentUser?.isAdmin) return;
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { ...region, pokemons: pokemonIds }
        : region
    ));
  };

  // 관리자 기능: 멤버 추가
  const addMember = (id, password, name) => {
    if (!currentUser?.isAdmin) return false;
    
    if (members[id]) {
      return false; // 이미 존재하는 ID
    }
    
    setMembers(prev => ({
      ...prev,
      [id]: {
        id,
        password,
        name,
        isAdmin: false,
        isSuperAdmin: false,
        dailyWalks: 5,
        maxDailyWalks: 5,
        money: 5000,
        caughtPokemon: [],
        inventory: [
          { itemId: 1, name: '몬스터볼', count: 15, imageUrl: '/images/items/pokeball.png' },
          { itemId: 2, name: '슈퍼볼', count: 5, imageUrl: '/images/items/greatball.png' },
          { itemId: 3, name: '하이퍼볼', count: 2, imageUrl: '/images/items/ultraball.png' },
          { itemId: 4, name: '이상한사탕', count: 3, imageUrl: '/images/items/rare-candy.png' },
        ]
      }
    }));
    return true;
  };

  // 관리자 기능: 관리자 권한 부여/제거
  const toggleAdminStatus = (memberId) => {
    if (!currentUser?.isSuperAdmin) return;
    if (memberId === 'admin') return; // 최초 관리자는 변경 불가
    
    setMembers(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        isAdmin: !prev[memberId].isAdmin
      }
    }));
  };

  // 관리자 기능: 개별 멤버 산책 횟수 리셋
  const resetMemberWalkCount = (memberId) => {
    if (!currentUser?.isAdmin) return;
    
    setMembers(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        dailyWalks: prev[memberId].maxDailyWalks
      }
    }));
    
    if (currentUser.id === memberId) {
      setCurrentUser(prev => ({
        ...prev,
        dailyWalks: prev.maxDailyWalks
      }));
    }
  };

  // 관리자 기능: 전체 멤버 산책 횟수 리셋
  const resetAllWalkCounts = () => {
    if (!currentUser?.isAdmin) return;
    
    setMembers(prev => {
      const updated = {};
      Object.keys(prev).forEach(id => {
        updated[id] = {
          ...prev[id],
          dailyWalks: prev[id].maxDailyWalks
        };
      });
      return updated;
    });
    
    setCurrentUser(prev => ({
      ...prev,
      dailyWalks: prev.maxDailyWalks
    }));
  };

  // 게임 데이터 완전 초기화
  const resetGameData = () => {
    if (!currentUser?.isSuperAdmin) return;
    
    const confirmed = window.confirm(
      '⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n' +
      '이 작업은 되돌릴 수 없습니다!'
    );
    
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // 포켓몬 엔트리로 이동
  const movePokemonToParty = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) {
      alert('포켓몬을 찾을 수 없습니다!');
      return;
    }
    
    // 이미 엔트리에 있으면
    if (pokemonIndex < 6) {
      alert('이미 엔트리에 있습니다!');
      return;
    }
    
    // 빈 슬롯 찾기 (null인 위치)
    const emptySlotIndex = currentUser.caughtPokemon.slice(0, 6).findIndex(p => p === null);
    
    if (emptySlotIndex === -1) {
      alert('엔트리가 가득 찼습니다! (최대 6마리)');
      return;
    }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    
    // 엔트리 빈 슬롯에 포켓몬 배치
    newCaughtPokemon[emptySlotIndex] = pokemon;
    
    // 박스에서 제거 (splice 사용)
    newCaughtPokemon.splice(pokemonIndex, 1);
    
    // 직접 members 업데이트
    const updatedMembers = {
      ...members,
      [currentUser.id]: {
        ...members[currentUser.id],
        caughtPokemon: newCaughtPokemon
      }
    };
    
    setMembers(updatedMembers);
    setCurrentUser({
      ...currentUser,
      caughtPokemon: newCaughtPokemon
    });
    
    alert('엔트리로 이동했습니다!');
  };

  // 포켓몬 박스로 이동 (자동 정렬)
  const movePokemonToBox = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) {
      alert('포켓몬을 찾을 수 없습니다!');
      return;
    }
    
    // 이미 박스에 있으면
    if (pokemonIndex >= 6) {
      alert('이미 박스에 있습니다!');
      return;
    }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    
    // 엔트리 슬롯을 null로 변경
    newCaughtPokemon[pokemonIndex] = null;
    
    // 박스에 추가
    newCaughtPokemon.push(pokemon);
    
    // 엔트리 자동 정렬: null을 뒤로 보내기
    const party = newCaughtPokemon.slice(0, 6);
    const box = newCaughtPokemon.slice(6);
    
    const sortedParty = [
      ...party.filter(p => p !== null), // null 아닌 포켓몬들
      ...party.filter(p => p === null)   // null들을 뒤로
    ];
    
    const finalPokemon = [...sortedParty, ...box];
    
    // 직접 members 업데이트
    const updatedMembers = {
      ...members,
      [currentUser.id]: {
        ...members[currentUser.id],
        caughtPokemon: finalPokemon
      }
    };
    
    setMembers(updatedMembers);
    setCurrentUser({
      ...currentUser,
      caughtPokemon: finalPokemon
    });
    
    alert('박스로 이동했습니다!');
  };

  // 포켓몬 방생
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;
    
    const newCaughtPokemon = currentUser.caughtPokemon.filter(p => !p || p.uniqueId !== uniqueId);
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  };

  // 이상한사탕 사용
  const useRareCandy = (uniqueId) => {
    if (!currentUser) return;
    
    const candyItem = currentUser.inventory.find(item => item.name === '이상한사탕');
    if (!candyItem || candyItem.count <= 0) {
      alert('이상한사탕이 없습니다!');
      return;
    }
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId 
        ? { ...p, level: p.level + 1 }
        : p
    );
    
    const newInventory = currentUser.inventory.map(item =>
      item.name === '이상한사탕'
        ? { ...item, count: item.count - 1 }
        : item
    );
    
    updateCurrentUser({ 
      caughtPokemon: newCaughtPokemon,
      inventory: newInventory
    });
    
    alert('레벨이 1 올랐습니다!');
  };

  // 포켓몬 별명 변경
  const updatePokemonNickname = (uniqueId, nickname) => {
    if (!currentUser) return;
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId 
        ? { ...p, nickname: nickname }
        : p
    );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
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
    regions,
    allPokemon,
    allItems,
    members,
    handleLogin,
    handleLogout,
    handleRegionClick,
    handleCloseEncounter,
    handleCatchSuccess,
    updateMaxDailyWalks,
    updateRegionPokemon,
    addMember,
    toggleAdminStatus,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetGameData,
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    useRareCandy,
    updatePokemonNickname
  };
}