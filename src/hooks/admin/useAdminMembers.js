// src/hooks/admin/useAdminMembers.js
// 회원 관리 전용 훅

import { ref, set } from 'firebase/database';
import { database } from '../../firebase';
import { POKEBALL_LIST } from '../../styles/theme';
import { normalizePokemonGender } from '../../utils/pokemonGender';

export const useAdminMembers = (
  currentUser,
  members,
  setMembers,
  updateCurrentUser,
  allItems,
  allPokemonMaster
) => {
  
  // ========== 회원 추가 ==========
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
      trainerExp: 0,
      lastAttendanceDate: null,
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

  // ========== 관리자 권한 토글 ==========
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

  // ========== 아이템 관리 권한 토글 ==========
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

  // ========== 최대 산책 횟수 업데이트 ==========
  const updateMaxDailyWalks = (newMax) => {
    if (!currentUser?.isAdmin) return;
    updateCurrentUser({ maxDailyWalks: newMax, dailyWalks: newMax });
  };

  // ========== 회원 산책 횟수 초기화 ==========
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

  // ========== 전체 산책 횟수 초기화 ==========
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

  // ========== 포켓몬 지급 ==========
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

    const {
      level = 5,
      friendship = 0,
      heldItem = null,
      nickname = null,
      moves = [],
      isPartner = false,
      isShiny = false,
      caughtWithBall = '몬스터볼',
      customBallImage = null,
      gender = null,
      ability = null,
      height = null,
      weight = null,
      sizeRank = 'M',
      heightVariation = 100,
      weightVariation = 100,
      ivs = null,
      effort = null,
      condition = null,
    } = options;

    // 파트너가 아닌 경우에만 20마리 체크
    if (!isPartner) {
      const nonPartnerCount = member.caughtPokemon.filter(p => p && !p.isPartner).length;
      if (nonPartnerCount >= 20) {
        alert(`⚠️ ${member.name}님은 이미 파트너를 제외한 포켓몬이 20마리입니다!\n더 이상 포켓몬을 지급할 수 없습니다.`);
        return;
      }
    }

    // POKEBALL_LIST에서 볼 찾기
    const ballInfo = POKEBALL_LIST.find(ball => {
      const nameMatch = ball.name === caughtWithBall;
      const nameEnMatch = ball.nameEn === caughtWithBall.toLowerCase().replace(/\s/g, '-');
      const nameKoLower = ball.name.toLowerCase();
      const searchLower = caughtWithBall.toLowerCase();
      
      return nameMatch || nameEnMatch || nameKoLower === searchLower;
    });

    if (!ballInfo) {
      console.warn('⚠️ 볼을 찾을 수 없음:', caughtWithBall);
    }

    const ballImageUrl = customBallImage || 
      (ballInfo ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballInfo.nameEn}.png` : 
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png');
      
    const spriteUrl = isShiny && pokemonTemplate.shinySprite 
      ? pokemonTemplate.shinySprite 
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`;

    const iconUrl = isShiny && pokemonTemplate.shinySprite
      ? pokemonTemplate.shinySprite
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`;

    // 기본값 설정
    const finalGender = normalizePokemonGender(gender, pokemonTemplate);
    
    const finalAbility = ability || (pokemonTemplate.abilities && pokemonTemplate.abilities.length > 0 ? 
      pokemonTemplate.abilities[0] : '없음');
    
    const baseHeight = pokemonTemplate.height || 10;
    const baseWeight = pokemonTemplate.weight || 100;
    
    const finalHeight = height || (baseHeight * (heightVariation / 100));
    const finalWeight = weight || (baseWeight * (weightVariation / 100));

    const newPokemon = {
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      nickname,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      formVariant: pokemonTemplate.formVariant || null,
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
      isShiny,
      caughtWithBall,
      ballImageUrl,
      gender: finalGender,
      ability: finalAbility,
      isHiddenAbility: false,
      height: parseFloat(finalHeight.toFixed(1)),
      weight: parseFloat(finalWeight.toFixed(1)),
      sizeRank,
      heightVariation: parseFloat(heightVariation.toFixed(1)),
      weightVariation: parseFloat(weightVariation.toFixed(1)),
      ivs: ivs || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      condition: condition || { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: effort || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl,
      spriteUrl
    };

    let updatedPokemonList = [...member.caughtPokemon];
    let newPartnerPokemon = member.partnerPokemon;

    // 파트너로 지급하는 경우
    if (isPartner) {
      console.log('파트너 포켓몬으로 지급');
      
      // 기존 파트너가 있으면 엔트리로 돌려보내기
      if (member.partnerPokemon) {
        const oldPartner = { ...member.partnerPokemon, isPartner: false };
        
        if (updatedPokemonList.length === 0) {
          updatedPokemonList = [null, null, null, null, null, null];
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
          party[emptySlotIndex] = oldPartner;
          updatedPokemonList = [...party, ...box];
        } else {
          updatedPokemonList = [...party, ...box, oldPartner];
        }
        
        console.log('✅ 기존 파트너를 엔트리/박스로 이동');
      }
      
      newPartnerPokemon = newPokemon;
      
    } else {
      // 일반 포켓몬 지급 - 엔트리/박스로
      console.log('일반 포켓몬 지급');
      
      if (updatedPokemonList.length === 0) {
        updatedPokemonList = [null, null, null, null, null, null];
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
    }

    // Firebase 저장
    // givePokemonToMember 함수의 끝 부분 (Line 450-490)

    // Firebase 저장
    try {
      // 저장할 데이터 준비
      const memberDataToSave = { 
        ...member, 
        caughtPokemon: updatedPokemonList
      };

      // 파트너 포켓몬 처리 (undefined 방지)
      if (newPartnerPokemon !== undefined && newPartnerPokemon !== null) {
        memberDataToSave.partnerPokemon = newPartnerPokemon;
      } else if (member.partnerPokemon !== undefined) {
        // 기존 파트너 포켓몬 유지
        memberDataToSave.partnerPokemon = member.partnerPokemon;
      }
      // partnerPokemon이 없으면 필드 자체를 포함하지 않음

      // id 제거
      const { id, ...dataToSave } = memberDataToSave;
      
      // undefined 값을 null로 변환 (Firebase 안전성)
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, cleanData);
      
      setMembers(prev => ({
        ...prev,
        [memberId]: { 
          ...prev[memberId], 
          caughtPokemon: updatedPokemonList,
          ...(newPartnerPokemon !== undefined && newPartnerPokemon !== null 
            ? { partnerPokemon: newPartnerPokemon } 
            : {})
        }
      }));
        
      if (memberId === currentUser.id) {
        console.log('✅ 본인에게 지급 - updateCurrentUser 호출');
        const currentUserUpdate = { 
          caughtPokemon: updatedPokemonList
        };
        if (newPartnerPokemon !== undefined && newPartnerPokemon !== null) {
          currentUserUpdate.partnerPokemon = newPartnerPokemon;
        }
        updateCurrentUser(currentUserUpdate);
      }
      
      const partnerText = isPartner ? ' (파트너)' : '';
      const shinyText = isShiny ? ' 반짝이' : '';
      alert(`${member.name}에게${shinyText} ${newPokemon.nickname || newPokemon.name}${partnerText}을(를) 지급했습니다!`);
    } catch (error) {
      console.error('❌ 포켓몬 지급 실패:', error);
      alert('포켓몬 지급 중 오류가 발생했습니다: ' + error.message);
    }
  };  // ← 이 줄 추가! givePokemonToMember 함수 종료

 
  // ========== 포켓몬 삭제 ==========
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

  // ========== 포켓몬 편집 ==========
  const editMemberPokemon = async (memberId, pokemonUniqueId, updates) => {
    if (!currentUser?.isAdmin) {
      console.error('권한이 없습니다');
      return;
    }
    
    const member = members[memberId];
    if (!member) {
      console.error('멤버를 찾을 수 없습니다:', memberId);
      return;
    }

    console.log('포켓몬 수정 시작:', { memberId, pokemonUniqueId, updates });

    const safeValue = (newValue, oldValue) => {
      return newValue !== undefined ? newValue : oldValue;
    };

    const updatedPokemon = member.caughtPokemon.map(p => {
      if (p && p.uniqueId === pokemonUniqueId) {
        const pokemonTemplate = (allPokemonMaster || []).find(template =>
          template.number === p.number ||
          template.id === p.pokemonId ||
          template.nameEn === p.nameEn ||
          template.name === p.name
        ) || p;

        const currentCondition = p.condition || {
          elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0
        };
        
        const currentEffort = p.effort || {
          hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
        };

        return {
          ...p,
          nickname: safeValue(updates.nickname, p.nickname),
          level: updates.level !== undefined 
            ? Math.min(100, Math.max(1, updates.level)) 
            : p.level,
          friendship: safeValue(updates.friendship, p.friendship || 0),
          caughtWithBall: safeValue(updates.caughtWithBall, p.caughtWithBall),
          ballImageUrl: safeValue(updates.ballImage, p.ballImageUrl),
          gender: normalizePokemonGender(safeValue(updates.gender, p.gender), pokemonTemplate),
          sizeRank: safeValue(updates.sizeRank, p.sizeRank),
          heightVariation: updates.heightVariation !== undefined 
            ? parseFloat(updates.heightVariation) 
            : (p.heightVariation || 100),
          weightVariation: updates.weightVariation !== undefined 
            ? parseFloat(updates.weightVariation) 
            : (p.weightVariation || 100),
          
          ivs: updates.ivs !== undefined ? {
            hp: Math.min(31, Math.max(0, updates.ivs.hp ?? p.ivs?.hp ?? 0)),
            attack: Math.min(31, Math.max(0, updates.ivs.attack ?? p.ivs?.attack ?? 0)),
            defense: Math.min(31, Math.max(0, updates.ivs.defense ?? p.ivs?.defense ?? 0)),
            specialAttack: Math.min(31, Math.max(0, updates.ivs.specialAttack ?? p.ivs?.specialAttack ?? 0)),
            specialDefense: Math.min(31, Math.max(0, updates.ivs.specialDefense ?? p.ivs?.specialDefense ?? 0)),
            speed: Math.min(31, Math.max(0, updates.ivs.speed ?? p.ivs?.speed ?? 0))
          } : (p.ivs || {
            hp: 0, attack: 0, defense: 0, 
            specialAttack: 0, specialDefense: 0, speed: 0
          }),
          
          spriteUrl: safeValue(updates.spriteUrl, p.spriteUrl || p.sprite),
          iconUrl: safeValue(updates.iconUrl, p.iconUrl),
          isShiny: safeValue(updates.isShiny, p.isShiny || false),
          heldItem: safeValue(updates.heldItem, p.heldItem || null),
          moves: safeValue(updates.moves, p.moves || []),
          
          effort: updates.effort !== undefined ? {
            hp: updates.effort.hp ?? currentEffort.hp,
            attack: updates.effort.attack ?? currentEffort.attack,
            defense: updates.effort.defense ?? currentEffort.defense,
            specialAttack: updates.effort.specialAttack ?? currentEffort.specialAttack,
            specialDefense: updates.effort.specialDefense ?? currentEffort.specialDefense,
            speed: updates.effort.speed ?? currentEffort.speed
          } : currentEffort,
          
          condition: updates.condition !== undefined ? {
            elegance: updates.condition.elegance ?? currentCondition.elegance,
            beauty: updates.condition.beauty ?? currentCondition.beauty,
            cuteness: updates.condition.cuteness ?? currentCondition.cuteness,
            intelligence: updates.condition.intelligence ?? currentCondition.intelligence,
            strength: updates.condition.strength ?? currentCondition.strength
          } : currentCondition
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
      
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => 
          value === undefined ? null : value
        )
      );
      
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, cleanData);
      
      console.log('Firebase 저장 완료');
      
      setMembers(prev => {
        const newMembers = {
          ...prev,
          [memberId]: updatedMember
        };
        console.log('setMembers 호출:', newMembers[memberId].caughtPokemon.find(p => p?.uniqueId === pokemonUniqueId));
        return newMembers;
      });
      
      if (memberId === currentUser?.id) {
        console.log('본인 포켓몬 수정 - currentUser 업데이트');
        updateCurrentUser({ 
          caughtPokemon: updatedPokemon 
        });
      }
      
      console.log('포켓몬 편집 완료:', pokemonUniqueId);
      alert('포켓몬이 수정되었습니다!');
      
    } catch (error) {
      console.error('포켓몬 편집 실패:', error);
      alert('포켓몬 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 자신에게 포켓몬 추가 ==========
  const addPokemonToSelf = (pokemon) => {
    if (!currentUser?.canManageItems) {
      alert('아이템 관리 권한이 없습니다!');
      return;
    }
    
    updateCurrentUser({ 
      caughtPokemon: [...currentUser.caughtPokemon, pokemon] 
    });
  };

  // ========== 회원 금액 업데이트 ==========
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

  // ========== 회원 지역 접근 권한 업데이트 ==========
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

  // ========== 게임 데이터 리셋 ==========
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
    deleteMemberPokemon,
    editMemberPokemon,
    addPokemonToSelf,
    updateMemberMoney,
    updateMemberRegionAccess,
    resetGameData
  };
};
