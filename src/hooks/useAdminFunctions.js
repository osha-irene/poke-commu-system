// src/hooks/useAdminFunctions.js - Firebase 버전 (완전 수정)

import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';

export const useAdminFunctions = (
  currentUser, 
  members, 
  setMembers, 
  updateCurrentUser, 
  setRegions,
  setGamePokedex,
  allPokemonMaster,
  allPokemon
) => {

  // 회원 관리
  const addMember = async (id, password, name, allItems) => {
    if (!currentUser?.isAdmin) return false;
    if (members[id]) return false;
    
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
        { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
        { itemId: greatBall?.id || 3, name: '슈퍼볼', count: 5, imageUrl: greatBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
        { itemId: ultraBall?.id || 2, name: '하이퍼볼', count: 2, imageUrl: ultraBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
        { itemId: rareCandy?.id || 50, name: '이상한사탕', count: 3, imageUrl: rareCandy?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png' }
      ];
    };

    const newMember = {
      password: password,
      name: name,
      email: `${id}@pokemon.com`,
      isAdmin: false,
      isSuperAdmin: false,
      canManageItems: false,
      dailyWalks: 10,
      maxDailyWalks: 10,
      money: 10000,
      accessibleRegions: [],
      caughtPokemon: [],
      inventory: getInitialInventory()
    };
    
    // 🔥 Firebase에 직접 저장
    try {
      const memberRef = ref(database, `members/${id}`);
      await set(memberRef, newMember);
      
      // State 업데이트
      setMembers(prev => ({
        ...prev,
        [id]: { ...newMember, id }
      }));
      
      console.log('✅ 새 회원 추가:', name);
      return true;
    } catch (error) {
      console.error('❌ 회원 추가 실패:', error);
      return false;
    }
  };

  const toggleAdminStatus = async (memberId) => {
    if (!currentUser?.isSuperAdmin) {
      console.error('❌ 슈퍼 관리자 권한 필요');
      return;
    }
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      isAdmin: !member.isAdmin
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      // State 업데이트
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      console.log('✅ 관리자 권한 토글:', member.name, updatedMember.isAdmin);
    } catch (error) {
      console.error('❌ 권한 업데이트 실패:', error);
    }
  };

  const toggleItemManagement = async (memberId) => {
    if (!currentUser?.isAdmin) {
      console.error('❌ 관리자 권한 필요');
      return;
    }
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      canManageItems: !member.canManageItems
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      // State 업데이트
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      console.log('✅ 아이템 관리 권한 토글:', member.name, updatedMember.canManageItems);
    } catch (error) {
      console.error('❌ 권한 업데이트 실패:', error);
    }
  };

  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax, dailyWalks: newMax });
  };

  const resetMemberWalkCount = async (memberId) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      dailyWalks: member.maxDailyWalks
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      alert(`${member.name}님의 산책 횟수가 초기화되었습니다!`);
    } catch (error) {
      console.error('❌ 산책 횟수 초기화 실패:', error);
    }
  };

  const resetAllWalkCounts = async () => {
    if (!currentUser?.isAdmin) return;
    
    try {
      const updates = {};
      for (const [id, member] of Object.entries(members)) {
        const updatedMember = {
          ...member,
          dailyWalks: member.maxDailyWalks
        };
        
        const { id: _, ...dataToSave } = updatedMember;
        const memberRef = ref(database, `members/${id}`);
        await set(memberRef, dataToSave);
        
        updates[id] = updatedMember;
      }
      
      setMembers(updates);
      alert('모든 회원의 산책 횟수가 초기화되었습니다!');
    } catch (error) {
      console.error('❌ 전체 산책 횟수 초기화 실패:', error);
    }
  };

  const givePokemonToMember = async (memberId, pokemon) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      caughtPokemon: [...member.caughtPokemon, pokemon]
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      console.log('✅ 포켓몬 지급:', pokemon.name, '→', member.name);
    } catch (error) {
      console.error('❌ 포켓몬 지급 실패:', error);
    }
  };

  const addPokemonToSelf = (pokemon) => {
    console.log('🐾 addPokemonToSelf 호출');
    console.log('🐾 currentUser:', currentUser?.name);
    console.log('🐾 canManageItems:', currentUser?.canManageItems);
    
    if (!currentUser?.canManageItems) {
      console.error('❌ 아이템 관리 권한 없음');
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
    updateCurrentUser({ 
      caughtPokemon: [...currentUser.caughtPokemon, pokemon] 
    });
  };

  const addItemToSelf = (item, count) => {
    console.log('🎁 ========== addItemToSelf 시작 ==========');
    console.log('🎁 currentUser:', currentUser?.name);
    console.log('🎁 isAdmin:', currentUser?.isAdmin);
    console.log('🎁 isSuperAdmin:', currentUser?.isSuperAdmin);
    console.log('🎁 canManageItems:', currentUser?.canManageItems);
    console.log('🎁 아이템:', item.name, '×', count);
    console.log('🎁 현재 인벤토리:', currentUser?.inventory?.length, '개');
    
    if (!currentUser) {
      console.error('❌ currentUser가 없음!');
      alert('사용자 정보를 불러올 수 없습니다!');
      return;
    }
    
    if (!(currentUser.isSuperAdmin || currentUser.canManageItems)) {
      console.error('❌ 아이템 관리 권한 없음!');
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
    const existingItem = currentUser.inventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
    console.log('🔍 기존 아이템:', existingItem);
    
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
            nameEn: item.nameEn,
            count: count,
            imageUrl: item.spriteUrl || item.imageUrl,
            category: item.category,
            effect: item.effect,
            cost: item.cost,
            sellPrice: item.sellPrice,
            canSell: item.canSell ?? true,
            isCustom: item.isCustom || false
          }
        ];
    
    console.log('🎁 새 인벤토리 개수:', newInventory.length);
    console.log('🎁 새 아이템 목록:', newInventory.map(i => `${i.name} x${i.count}`));
    console.log('🎁 updateCurrentUser 호출 직전');
    
    updateCurrentUser({ inventory: newInventory });
    
    console.log('🎁 updateCurrentUser 호출 완료');
    console.log('🎁 ========== addItemToSelf 끝 ==========');
    
    alert(`${item.name} ${count}개를 추가했습니다!`);
  };

  const giveItemToMember = async (memberId, item, count) => {
    console.log('🎁 giveItemToMember 호출');
    console.log('🎁 대상:', memberId);
    console.log('🎁 아이템:', item.name, '×', count);
    
    if (!currentUser?.isAdmin) {
      console.error('❌ 관리자 권한 없음');
      return;
    }
    
    const member = members[memberId];
    if (!member) {
      console.error('❌ 회원을 찾을 수 없음:', memberId);
      return;
    }
    
    const existingItem = member.inventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
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
            nameEn: item.nameEn,
            count: count,
            imageUrl: item.spriteUrl || item.imageUrl,
            category: item.category,
            effect: item.effect,
            cost: item.cost,
            sellPrice: item.sellPrice,
            canSell: item.canSell ?? true,
            isCustom: item.isCustom || false
          }
        ];

    const updatedMember = {
      ...member,
      inventory: newInventory
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      console.log('✅ 아이템 지급 완료:', item.name, '→', member.name);
      alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
    } catch (error) {
      console.error('❌ 아이템 지급 실패:', error);
      alert('아이템 지급 중 오류가 발생했습니다!');
    }
  };
  
  // 관리자 기능: 커스텀 아이템 생성
  const createCustomItem = async (itemData) => {
    if (!currentUser?.isAdmin) return false;
    
    const newItem = {
      ...itemData,
      id: `custom_${Date.now()}`,
      isCustom: true,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      pocket: itemData.pocket || itemData.category || 'misc',
    };
    
    // 🔥 Firebase의 customItems에 추가
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      const customItems = snapshot.exists() ? snapshot.val() : [];
      
      customItems.push(newItem);
      await set(customItemsRef, customItems);
      
      alert(`커스텀 아이템 "${itemData.name}"이 생성되었습니다!`);
      return true;
    } catch (error) {
      console.error('❌ 커스텀 아이템 생성 실패:', error);
      return false;
    }
  };

  // 포켓몬 편집
  const editMemberPokemon = async (memberId, pokemonUniqueId, updates) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const updatedPokemon = member.caughtPokemon.map(p => {
      if (p && p.uniqueId === pokemonUniqueId) {
        return {
          ...p,
          level: updates.level !== undefined ? updates.level : p.level,
          friendship: updates.friendship !== undefined ? updates.friendship : p.friendship,
          nickname: updates.nickname !== undefined ? updates.nickname : p.nickname,
          spriteUrl: updates.spriteUrl !== undefined ? updates.spriteUrl : p.spriteUrl,
          ballImage: updates.ballImage !== undefined ? updates.ballImage : p.ballImage
        };
      }
      return p;
    });

    const updatedMember = {
      ...member,
      caughtPokemon: updatedPokemon
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 포켓몬 편집 실패:', error);
    }
  };

  // 지역/도감 관리
  const updateRegionPokemon = (regionId, pokemonIds, pokemonRates, encounterRate, minLevel, maxLevel) => {
    if (!currentUser?.isAdmin) return;
    
    setRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { 
            ...region, 
            pokemons: pokemonIds, 
            pokemonRates: pokemonRates,
            encounterRate: encounterRate !== undefined ? encounterRate : (region.encounterRate || 80),
            minLevel: minLevel || 5,
            maxLevel: maxLevel || 20
          } 
        : region
    ));
  };

  const updateGamePokedex = (selectedPokemonNumbers) => {
    if (!currentUser?.isAdmin) return;
    
    const newPokedex = selectedPokemonNumbers
      .map(num => allPokemonMaster.find(p => p.number === num))
      .filter(Boolean)
      .sort((a, b) => a.number - b.number)
      .map((p, index) => ({ ...p, originalNumber: p.number, newNumber: index + 1 }));
    
    setGamePokedex(newPokedex);
    
    const validPokemonNumbers = new Set(selectedPokemonNumbers);
    
    setRegions(prev => prev.map(region => ({
      ...region,
      pokemons: region.pokemons.filter(pokemonId => {
        const pokemon = allPokemon.find(p => p.id === pokemonId);
        if (pokemon) return validPokemonNumbers.has(pokemon.number);
        return validPokemonNumbers.has(pokemonId);
      })
    })));
    
    alert('✅ 게임 도감이 업데이트되었습니다!\n도감에서 제거된 포켓몬만 구역에서 삭제되었습니다.');
  };

  // 회원 머니 업데이트
  const updateMemberMoney = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      money: Math.max(0, amount)
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 금액 업데이트 실패:', error);
    }
  };

  // 회원 지역 접근 권한 업데이트
  const updateMemberRegionAccess = async (memberId, regionIds) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      accessibleRegions: regionIds
    };
    
    // 🔥 Firebase 저장
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 지역 권한 업데이트 실패:', error);
    }
  };

  // 데이터 초기화
  const resetGameData = async () => {
    if (!currentUser?.isSuperAdmin) return;
    const confirmed = window.confirm('⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!');
    if (confirmed) {
      // 🔥 Firebase 데이터 삭제
      try {
        await set(ref(database), null);
        localStorage.clear();
        window.location.reload();
      } catch (error) {
        console.error('데이터 초기화 실패:', error);
        // 폴백: localStorage만 삭제
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return {
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
    createCustomItem,
    updateRegionPokemon,
    updateGamePokedex,
    resetGameData,
    editMemberPokemon,
    updateMemberMoney,
    updateMemberRegionAccess
  };
};