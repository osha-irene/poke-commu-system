// src/hooks/useAdminFunctions.js - Firebase 버전 (완전 수정)

import { ref, get, set } from 'firebase/database';
import { database } from '../firebase';

export const useAdminFunctions = (
  currentUser, 
  members, 
  setMembers, 
  updateCurrentUser, 
  regions,
  setRegions,
  setGamePokedex,
  allPokemonMaster,
  allPokemon,
  allItems
) => {

  // 회원 관리
  const addMember = async (id, password, name) => {
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
    
    try {
      const memberRef = ref(database, `members/${id}`);
      await set(memberRef, newMember);
      
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
    
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
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
    
    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      
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

  // 포켓몬 지급
  const givePokemonToMember = async (memberId, pokemonTemplate, options = {}) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) { 
      alert('회원을 찾을 수 없습니다!'); 
      return; 
    }

    if (!member.caughtPokemon) {
      member.caughtPokemon = [];
    }

    const nonPartnerCount = member.caughtPokemon.filter(p => p && !p.isPartner).length;
    
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
	  isShiny = false,
      caughtWithBall = '몬스터볼',
    } = options;

    const ballItem = allItems?.find(item => 
      item.name === caughtWithBall || 
      item.nameEn?.toLowerCase().includes(caughtWithBall.toLowerCase())
    ) || {
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
    };
	
	const spriteUrl = isShiny && pokemonTemplate.shinySprite 
    ? pokemonTemplate.shinySprite 
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`;

  const iconUrl = isShiny && pokemonTemplate.shinySprite
    ? pokemonTemplate.shinySprite  // 이색 아이콘도 shinySprite 사용
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`;


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
		isShiny,  // ✨ 추가
		caughtWithBall,
		ballImageUrl: ballItem.spriteUrl,
		condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
		effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
		imageUrl: pokemonTemplate.imageUrl,
		iconUrl: iconUrl,  // ✨ 수정
		spriteUrl: spriteUrl  // ✨ 수정
	  };
	  
  let updatedPokemonList = [...member.caughtPokemon];
  
  if (updatedPokemonList.length === 0) {
    updatedPokemonList = [null, null, null, null, null, null];
  }
  
  if (isPartner) {
    updatedPokemonList = updatedPokemonList.map(p => 
      p && p.isPartner ? { ...p, isPartner: false } : p
    );
  }
  
  const party = updatedPokemonList.slice(0, 6);
  const box = updatedPokemonList.slice(6);
  
  let emptySlotIndex = -1;
  for (let i = 0; i < 6; i++) {
    if (!party[i] || party[i] === null) {
      emptySlotIndex = i;
      break;
    }
  }
  
  if (emptySlotIndex !== -1) {
    party[emptySlotIndex] = newPokemon;
    updatedPokemonList = [...party, ...box];
  } else {
    updatedPokemonList = [...party, ...box, newPokemon];
  }

  try {
    const { id, ...dataToSave } = { ...member, caughtPokemon: updatedPokemonList };
    const memberRef = ref(database, `members/${memberId}`);
    await set(memberRef, dataToSave);
    
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], caughtPokemon: updatedPokemonList }
    }));
    
    if (memberId === currentUser.id) {
      console.log('✅ 본인에게 지급 - updateCurrentUser 호출');
      updateCurrentUser({ caughtPokemon: updatedPokemonList });
    }
    
    const partnerText = isPartner ? ' (파트너 💖)' : '';
    const shinyText = isShiny ? ' ✨반짝이✨' : '';  // ✨ 추가
    alert(`${member.name}에게${shinyText} ${newPokemon.nickname || newPokemon.name}${partnerText}을(를) 지급했습니다!`);
  } catch (error) {
    console.error('❌ 포켓몬 지급 실패:', error);
    alert('포켓몬 지급 중 오류가 발생했습니다.');
  }
};



const deleteMemberPokemon = async (memberId, pokemonUniqueId) => {
  if (!currentUser?.isAdmin) return;
  
  const member = members[memberId];
  if (!member) return;
  
  const updatedPokemon = member.caughtPokemon.filter(
    p => p && p.uniqueId !== pokemonUniqueId
  );
  
  const updatedMember = {
    ...member,
    caughtPokemon: updatedPokemon
  };
  
  try {
    const { id, ...dataToSave } = updatedMember;
    const memberRef = ref(database, `members/${memberId}`);
    await set(memberRef, dataToSave);
    
    setMembers(prev => ({
      ...prev,
      [memberId]: updatedMember
    }));
    
    alert('포켓몬이 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 포켓몬 삭제 실패:', error);
  }
};



  const addPokemonToSelf = (pokemon) => {
    if (!currentUser?.canManageItems) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
    updateCurrentUser({ 
      caughtPokemon: [...currentUser.caughtPokemon, pokemon] 
    });
  };

  const addItemToSelf = (item, count) => {
    if (!currentUser) {
      alert('사용자 정보를 불러올 수 없습니다!');
      return;
    }
    
    if (!(currentUser.isSuperAdmin || currentUser.canManageItems)) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
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

  const giveItemToMember = async (memberId, item, count) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const currentInventory = member.inventory || [];
    
    const existingItem = currentInventory.find(i => 
      i.itemId === item.id || i.name === item.name
    );
    
    const newInventory = existingItem
      ? currentInventory.map(i => 
          (i.itemId === item.id || i.name === item.name)
            ? { ...i, count: i.count + count }
            : i
        )
      : [
          ...currentInventory,
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
    
    try {
      const { id, email, ...dataToSave } = updatedMember;
      
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, cleanData);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
      
      // ⭐ 본인에게 지급한 경우 currentUser도 업데이트
      if (memberId === currentUser?.id) {
        
        updateCurrentUser({ inventory: newInventory });
      }
      
      alert(`${member.name}님에게 ${item.name} ${count}개를 지급했습니다!`);
    } catch (error) {
     
      alert('아이템 지급 중 오류가 발생했습니다!');
    }
  };

  const createCustomItem = async (itemData) => {
    if (!currentUser?.isAdmin) {

      return false;
    }
    
    const newItem = {
      ...itemData,
      id: `custom_${Date.now()}`,
      isCustom: true,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      pocket: itemData.pocket || itemData.category || 'misc',
    };
    
    try {
      const customItemsRef = ref(database, 'gameData/customItems');
      const snapshot = await get(customItemsRef);
      
      const customItems = snapshot.exists() ? snapshot.val() : [];
      const itemsArray = Array.isArray(customItems) ? customItems : [];
      itemsArray.push(newItem);
      
      await set(customItemsRef, itemsArray);
      
      alert(`커스텀 아이템 "${itemData.name}"이 생성되었습니다!`);
      return true;
    } catch (error) {
      console.error('❌ 커스텀 아이템 생성 실패:', error);
      alert('커스텀 아이템 생성 중 오류가 발생했습니다!');
      return false;
    }
  };

 const editMemberPokemon = async (memberId, pokemonUniqueId, updates) => {
  if (!currentUser?.isAdmin) return;

  const member = members[memberId];
  if (!member) return;

  const updatedPokemon = member.caughtPokemon.map(p => {
    if (p && p.uniqueId === pokemonUniqueId) {
      return {
        ...p,
        // 기본 정보
        level: updates.level !== undefined ? updates.level : p.level,
        friendship: updates.friendship !== undefined ? updates.friendship : p.friendship,
        nickname: updates.nickname !== undefined ? updates.nickname : p.nickname,
        
        // 이미지 URL
        spriteUrl: updates.spriteUrl !== undefined ? updates.spriteUrl : p.spriteUrl,
        iconUrl: updates.iconUrl !== undefined ? updates.iconUrl : p.iconUrl,
        ballImage: updates.ballImage !== undefined ? updates.ballImage : p.ballImage,
        ballImageUrl: updates.ballImage !== undefined ? updates.ballImage : p.ballImageUrl,
        
        // 특수 속성
        isShiny: updates.isShiny !== undefined ? updates.isShiny : p.isShiny,
        heldItem: updates.heldItem !== undefined ? updates.heldItem : p.heldItem,
        
        // 기술
        moves: updates.moves !== undefined ? updates.moves : p.moves,
        
        // 노력치 (개별 필드 업데이트)
        effort: updates.effort !== undefined ? {
          ...p.effort,
          ...updates.effort
        } : p.effort,
        
        // 컨디션 (개별 필드 업데이트)
        condition: updates.condition !== undefined ? {
          ...p.condition,
          ...updates.condition
        } : p.condition,
      };
    }
    return p;
  });

  const updatedMember = {
    ...member,
    caughtPokemon: updatedPokemon
  };
  
  try {
    const { id, ...dataToSave } = updatedMember;
    const memberRef = ref(database, `members/${memberId}`);
    await set(memberRef, dataToSave);
    
    setMembers(prev => ({
      ...prev,
      [memberId]: updatedMember
    }));
    
    // 본인 수정 시 currentUser도 업데이트
    if (memberId === currentUser?.id) {
      updateCurrentUser({ caughtPokemon: updatedPokemon });
    }
    
    console.log('✅ 포켓몬 편집 완료:', pokemonUniqueId);
  } catch (error) {
    console.error('❌ 포켓몬 편집 실패:', error);
  }
};
  

// ========== 지역 추가 함수 ==========
const addRegion = async (newRegion) => {
  if (!currentUser?.isAdmin) return;
  
  // 1. 로컬 상태 업데이트
  setRegions(prev => [...prev, newRegion]);
  
  // 2. Firebase에 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    const updatedRegions = [...(currentConfig.regions || []), newRegion];
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    console.log('✅ 지역 추가 완료:', newRegion.id);
  } catch (error) {
    console.error('❌ 지역 추가 실패:', error);
  }
};

// ========== 지역 삭제 함수 ==========
const deleteRegion = async (regionId) => {
  if (!currentUser?.isAdmin) return;
  
  // 1. 로컬 상태 업데이트
  setRegions(prev => prev.filter(r => r.id !== regionId));
  
  // 2. Firebase에서 삭제
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    const updatedRegions = (currentConfig.regions || []).filter(r => r.id !== regionId);
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    console.log('✅ 지역 삭제 완료:', regionId);
  } catch (error) {
    console.error('❌ 지역 삭제 실패:', error);
  }
};

const updateRegionPokemon = async (regionId, updatedData) => {
  if (!currentUser?.isAdmin) return;
  
  const updateObj = {
    pokemons: Array.isArray(updatedData.pokemons) 
      ? updatedData.pokemons 
      : [],
    pokemonRates: updatedData.pokemonRates || {},
    encounterRate: updatedData.encounterRate !== undefined 
      ? updatedData.encounterRate 
      : 0.5,
    minLevel: updatedData.minLevel || 5,
    maxLevel: updatedData.maxLevel || 20,
    shinyRate: updatedData.shinyRate || 4096,
    groupId: updatedData.groupId !== undefined ? updatedData.groupId : null,
    groupName: updatedData.groupName !== undefined ? updatedData.groupName : null,
    areaName: updatedData.areaName !== undefined ? updatedData.areaName : null,
    groupVisible: updatedData.groupVisible !== undefined ? updatedData.groupVisible : true,
    isDefaultTown: updatedData.isDefaultTown !== undefined ? updatedData.isDefaultTown : false,  // ⭐ 추가
    name: updatedData.name || updatedData.name
  };
  
  // 로컬 state 업데이트
  setRegions(prev => prev.map(region => 
    region.id === regionId 
      ? { ...region, ...updateObj } 
      : region
  ));
  
  // Firebase에 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    const updatedRegions = (currentConfig.regions || []).map(r =>
      r.id === regionId ? { ...r, ...updateObj } : r
    );
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    console.log('✅ 지역 업데이트 완료:', regionId);
  } catch (error) {
    console.error('❌ 지역 업데이트 실패:', error);
  }
};

// 마을 생성 (수정 완료)
const createTown = async (townData) => {
  if (!currentUser?.isAdmin) return;
    
   
  // 안전한 배열 체크 추가
  let updatedRegions = Array.isArray(regions) ? [...regions] : [];
  
  // 기본 마을 설정 시 기존 기본 마을 해제
  if (townData.isDefaultTown) {
    updatedRegions = updatedRegions.map(r => 
      r.isDefaultTown ? { ...r, isDefaultTown: false } : r
    );
  }
  
  
  // 마을 메타데이터 지역 생성
  const townMetaRegion = {
    id: `town_meta_${townData.groupId}`,
    name: `[마을] ${townData.groupName}`,
    groupId: townData.groupId,
    groupName: townData.groupName,
    x: townData.x,
    y: townData.y,
    color: townData.color,
    isDefaultTown: townData.isDefaultTown,
    groupVisible: true,
    isTownMeta: true,
    pokemons: [],
    encounterRate: 0,
    minLevel: 1,
    maxLevel: 1,
    description: '마을 정보 (탐험 불가)'
  };
  
  // 로컬 state에 추가
  updatedRegions.push(townMetaRegion);
  setRegions(updatedRegions);
  
  // Firebase 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    // 마을 정보를 towns 배열에도 저장
    const townsRef = ref(database, 'gameData/towns');
    const townsSnapshot = await get(townsRef);
    const currentTowns = townsSnapshot.exists() ? townsSnapshot.val() : [];
    
    const newTowns = [...currentTowns, townData];
    await set(townsRef, newTowns);
    
    console.log('✅ 마을 생성 완료:', townData);
    alert(`마을 "${townData.groupName}"이(가) 생성되었습니다!\n\n이제 지역 관리에서 구역을 이 마을에 연결할 수 있습니다.`);
  } catch (error) {
    console.error('❌ 마을 생성 실패:', error);
    alert('마을 생성 중 오류가 발생했습니다.');
  }
};


// 마을 수정
// useAdminFunctions.js
const updateTown = async (groupId, townData) => {
  if (!currentUser?.isAdmin) return;
  
  let updatedRegions = Array.isArray(regions) ? [...regions] : [];
  
  // 해당 마을에 속한 모든 지역 업데이트
  updatedRegions = updatedRegions.map(region => {
    // 마을 메타데이터 업데이트
    if (region.groupId === groupId) {
      return {
        ...region,
        groupName: townData.groupName,
        x: townData.x,
        y: townData.y,
        color: townData.color,
        isDefaultTown: townData.isDefaultTown,
        groupVisible: townData.visible !== undefined ? townData.visible : region.groupVisible
      };
    }
    // 다른 마을의 기본 설정 해제
    if (townData.isDefaultTown && region.isDefaultTown && region.groupId !== groupId) {
      return { ...region, isDefaultTown: false };
    }
    return region;
  });
  
  setRegions(updatedRegions);
  
  // Firebase 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    console.log('✅ 마을 수정 완료:', groupId);
  } catch (error) {
    console.error('❌ 마을 수정 실패:', error);
  }
};

// 마을 삭제
const deleteTown = async (groupId) => {
  if (!currentUser?.isAdmin) return;
  
  // 해당 마을에 속한 모든 지역의 연결 해제
  const updatedRegions = regions.map(region => {
    if (region.groupId === groupId) {
      return {
        ...region,
        groupId: null,
        groupName: null,
        areaName: null,
        isDefaultTown: false
      };
    }
    return region;
  });
  
  setRegions(updatedRegions);
  
  // Firebase 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    await set(configRef, {
      ...currentConfig,
      regions: updatedRegions
    });
    
    console.log('✅ 마을 삭제 완료:', groupId);
    alert('마을이 삭제되었습니다!');
  } catch (error) {
    console.error('❌ 마을 삭제 실패:', error);
  }
};
const updateGamePokedex = async (selectedPokemonNumbers) => {
  if (!currentUser?.isAdmin) return;
  
  // 선택된 포켓몬으로 새 도감 생성 (마을 메타데이터 제외)
  const newPokedex = selectedPokemonNumbers
    .map(num => allPokemonMaster.find(p => p.number === num))
    .filter(Boolean)
    .filter(p => !p.isTownMeta && !p.groupId && p.name && p.number) // 포켓몬만 필터링
    .sort((a, b) => a.number - b.number)
    .map((p, index) => ({ 
      ...p, 
      originalNumber: p.number, 
      newNumber: index + 1 
    }));
  
  // 로컬 state 업데이트
  setGamePokedex(newPokedex);
  
  // 유효한 포켓몬 번호 Set
  const validPokemonNumbers = new Set(selectedPokemonNumbers);
  
  // 지역에서 도감에 없는 포켓몬 제거
  const updatedRegions = regions.map(region => ({
    ...region,
    pokemons: (region.pokemons || []).filter(pokemonId => {
      const pokemon = allPokemon.find(p => p.id === pokemonId);
      if (pokemon) return validPokemonNumbers.has(pokemon.number);
      return validPokemonNumbers.has(pokemonId);
    })
  }));
  
  setRegions(updatedRegions);
  
  // Firebase에 저장
  try {
    const configRef = ref(database, 'gameData/config');
    const snapshot = await get(configRef);
    const currentConfig = snapshot.val() || {};
    
    await set(configRef, {
      ...currentConfig,
      pokedex: newPokedex,
      regions: updatedRegions
    });
    
    console.log('✅ 게임 도감 업데이트 완료');
    alert('✅ 게임 도감이 업데이트되었습니다!\n도감에서 제거된 포켓몬은 구역에서도 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 도감 업데이트 실패:', error);
    alert('도감 업데이트 중 오류가 발생했습니다.');
  }
};

  const updateMemberMoney = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      money: Math.max(0, amount)
    };
    
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

  const updateMemberRegionAccess = async (memberId, regionIds) => {
    if (!currentUser?.isAdmin) return;
    
    const member = members[memberId];
    if (!member) return;
    
    const updatedMember = {
      ...member,
      accessibleRegions: regionIds
    };
    
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

  const resetGameData = async () => {
    if (!currentUser?.isSuperAdmin) return;
    
    const confirmed = window.confirm('⚠️ 모든 게임 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!');
    
    if (confirmed) {
      try {
        const pathsToDelete = ['members', 'gameData', 'community', 'users'];
        
        for (const path of pathsToDelete) {
          const pathRef = ref(database, path);
          await set(pathRef, null);
          console.log(`✅ ${path} 삭제 완료`);
        }
        
        localStorage.clear();
        await currentUser.auth?.signOut();
        
        alert('✅ 게임 데이터가 초기화되었습니다!');
        window.location.href = '/';
      } catch (error) {
        console.error('❌ 데이터 초기화 실패:', error);
        alert('⚠️ 리셋 실패: ' + error.message);
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
    deleteMemberPokemon, 
    updateMemberMoney,
    updateMemberRegionAccess,
    addRegion,
    deleteRegion,
    createTown,
    updateTown,
    deleteTown,
  };
};