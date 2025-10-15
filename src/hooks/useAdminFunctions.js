// src/hooks/useAdminFunctions.js - Firebase 버전 (localStorage 제거)

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

  const toggleAdminStatus = (memberId) => {
    if (!currentUser?.isSuperAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], isAdmin: !prev[memberId].isAdmin }
    }));
  };

  const toggleItemManagement = (memberId) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], canManageItems: !prev[memberId].canManageItems }
    }));
  };

  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax, dailyWalks: newMax });
  };

  const resetMemberWalkCount = (memberId) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], dailyWalks: prev[memberId].maxDailyWalks }
    }));
    
    alert(`${member.name}님의 산책 횟수가 초기화되었습니다!`);
  };

  const resetAllWalkCounts = async () => {
    if (!currentUser?.isAdmin) return;
    
    const updates = {};
    Object.keys(members).forEach(id => {
      updates[id] = { ...members[id], dailyWalks: members[id].maxDailyWalks };
    });
    
    setMembers(updates);
    alert('모든 회원의 산책 횟수가 초기화되었습니다!');
  };

  const givePokemonToMember = (memberId, pokemon) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    
    setMembers(prev => ({
      ...prev,
      [memberId]: { 
        ...prev[memberId], 
        caughtPokemon: [...prev[memberId].caughtPokemon, pokemon] 
      }
    }));
  };

  const addPokemonToSelf = (pokemon) => {
    if (!currentUser?.canManageItems) return;
    updateCurrentUser({ caughtPokemon: [...currentUser.caughtPokemon, pokemon] });
  };

  const addItemToSelf = (item, count) => {
    if (!currentUser?.canManageItems) return;
    
    const existingItem = currentUser.inventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
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
    
    updateCurrentUser({ inventory: newInventory });
    alert(`${item.name} ${count}개를 추가했습니다!`);
  };

  const giveItemToMember = (memberId, item, count) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    
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

    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], inventory: newInventory }
    }));

    alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
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
  const editMemberPokemon = (memberId, pokemonUniqueId, updates) => {
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

    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], caughtPokemon: updatedPokemon }
    }));
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
  const updateMemberMoney = (memberId, amount) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], money: amount }
    }));
  };

  // 회원 지역 접근 권한 업데이트
  const updateMemberRegionAccess = (memberId, regionIds) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], accessibleRegions: regionIds }
    }));
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