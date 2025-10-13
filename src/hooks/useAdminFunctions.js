// src/hooks/useAdminFunctions.js

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
  const addMember = (id, password, name, allItems) => {
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
        inventory: getInitialInventory(),
        accessibleRegions: []
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

  const toggleItemManagement = (memberId) => {
    if (!currentUser?.isSuperAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], canManageItems: !prev[memberId].canManageItems }
    }));
  };

  // 소지금액 관리
  const updateMemberMoney = (memberId, amount) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], money: Math.max(0, amount) }
    }));
  };

  // 리전 접근 권한 관리
  const updateMemberRegionAccess = (memberId, regionIds) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { 
        ...prev[memberId], 
        accessibleRegions: regionIds
      }
    }));
  };

  // 탐험 횟수 관리
  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax });
  };

  const resetMemberWalkCount = (memberId) => {
    if (!currentUser?.isAdmin) return;
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], dailyWalks: prev[memberId].maxDailyWalks }
    }));
    if (currentUser.id === memberId) {
      updateCurrentUser({ dailyWalks: currentUser.maxDailyWalks });
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
    updateCurrentUser({ dailyWalks: currentUser.maxDailyWalks });
  };

  // 포켓몬 지급
  const givePokemonToMember = (memberId, pokemonTemplate, options = {}) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) { alert('회원을 찾을 수 없습니다!'); return; }

     // 파트너를 제외한 포켓몬 수 계산
  const nonPartnerCount = member.caughtPokemon.filter(p => p && !p.isPartner).length;
  
  // 파트너 제외 20마리 제한 (options.isPartner가 true면 예외)
  if (!options.isPartner && nonPartnerCount >= 20) {
    alert(`⚠️ ${member.name}님은 이미 파트너를 제외한 포켓몬이 20마리입니다!\n더 이상 포켓몬을 지급할 수 없습니다.`);
    return;
  }

    const {
      level = 5,
      friendship = 0,
      heldItem = null,
      nickname = null,
      moves = [],
      isPartner = false,
	  caughtWithBall= '몬스터볼'
    } = options;

    const newPokemon = {
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      nickname,
      number: pokemonTemplate.number,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      level,
      hp: pokemonTemplate.baseHp,
      maxHp: pokemonTemplate.baseHp,
      exp: 0,
      friendship,
      heldItem,
      moves,
      isPartner,
	  caughtWithBall,
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
    };

    let updatedPokemonList = [...member.caughtPokemon];
    if (isPartner) {
      updatedPokemonList = updatedPokemonList.map(p => 
        p && p.isPartner ? { ...p, isPartner: false } : p
      );
    }
    updatedPokemonList.push(newPokemon);

    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], caughtPokemon: updatedPokemonList }
    }));

    const partnerText = isPartner ? ' (파트너 💖)' : '';
  };

  const addPokemonToSelf = (pokemonTemplate, options = {}) => {
    if (!currentUser?.isAdmin) return;
    givePokemonToMember(currentUser.id, pokemonTemplate, options);
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
  const createCustomItem = (itemData) => {
    if (!currentUser?.isAdmin) return false;
    
    const customItems = loadFromStorage('poke_customItems', []);
    const newItem = {
      ...itemData,
      id: `custom_${Date.now()}`,
      isCustom: true,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };
    
    customItems.push(newItem);
    saveToStorage('poke_customItems', customItems);
    
    alert(`커스텀 아이템 "${itemData.name}"이 생성되었습니다!`);
    return true;
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
          minLevel: minLevel || 5,      // ⭐ 추가
          maxLevel: maxLevel || 20      // ⭐ 추가
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

  // 데이터 초기화
  const resetGameData = () => {
    if (!currentUser?.isSuperAdmin) return;
    const confirmed = window.confirm('⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!');
    if (confirmed) {
      localStorage.clear();
      window.location.reload();
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