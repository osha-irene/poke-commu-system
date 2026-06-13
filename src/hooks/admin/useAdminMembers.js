// src/hooks/admin/useAdminMembers.js
// 회원 관리 전용 훅

import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { ref, set, update } from 'firebase/database';
import { auth, database } from '../../firebase';
import { POKEBALL_LIST } from '../../styles/theme';
import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { normalizePokemonGender } from '../../utils/pokemonGender';
import { DEFAULT_IVS, generateRandomIVs, normalizeIVs } from '../../utils/pokemonIndividualValues';
import movesData from '../../data/moves.json';
import evolutionsData from '../../data/evolutions.json';

export const useAdminMembers = (
  currentUser,
  members,
  setMembers,
  updateCurrentUser,
  allItems,
  allPokemonMaster,
  systemSettings = {}
) => {
  const isEmptyPokemonSlot = (pokemon) => (
    pokemon === null || pokemon === undefined || pokemon === 'null'
  );

  const getSpeciesNumber = (pokemon) => Number(pokemon?.originalNumber || pokemon?.displayNumber || pokemon?.number);

  const findPokemonTemplateByNumber = (number, regionalForm = null) => {
    const numericNumber = Number(number);
    if (!Number.isFinite(numericNumber)) return null;

    if (regionalForm) {
      const regionalMatch = (allPokemonMaster || []).find(template =>
        Number(template.originalNumber || template.displayNumber || template.number) === numericNumber &&
        template.regionalForm === regionalForm
      );
      if (regionalMatch) return regionalMatch;
    }

    return (allPokemonMaster || []).find(template =>
      Number(template.number) === numericNumber &&
      !template.regionalForm
    ) || (allPokemonMaster || []).find(template =>
      Number(template.originalNumber || template.displayNumber || template.number) === numericNumber
    );
  };

  const normalizeTemplateKey = (value) => String(value || '').toLowerCase();

  const findPokemonTemplateForOwned = (pokemon) => {
    if (!pokemon) return null;
    const pokemonRegionalForm = normalizeTemplateKey(pokemon.regionalForm);
    const pokemonFormVariant = normalizeTemplateKey(pokemon.formVariant);
    const pokemonNameEn = normalizeTemplateKey(pokemon.nameEn);
    const pokemonNumber = Number(pokemon.number);
    const pokemonOriginalNumber = Number(pokemon.originalNumber || pokemon.number);
    const pokemonId = Number(pokemon.pokemonId || pokemon.id);

    const candidates = (allPokemonMaster || [])
      .map(template => {
        const templateRegionalForm = normalizeTemplateKey(template.regionalForm);
        const templateFormVariant = normalizeTemplateKey(template.formVariant);
        const templateNameEn = normalizeTemplateKey(template.nameEn);
        const templateNumber = Number(template.number);
        const templateOriginalNumber = Number(template.originalNumber || template.number);
        const templateId = Number(template.id);
        let score = 0;

        if (pokemonFormVariant && templateFormVariant === pokemonFormVariant) score += 100;
        if (pokemonNameEn && templateNameEn === pokemonNameEn) score += 90;
        if (pokemonId && templateId === pokemonId) score += 80;
        if (pokemonRegionalForm && templateRegionalForm === pokemonRegionalForm) score += 40;
        if (pokemonNumber && templateNumber === pokemonNumber) score += 20;
        if (pokemonOriginalNumber && templateOriginalNumber === pokemonOriginalNumber) score += 10;
        if (!pokemonRegionalForm && !templateRegionalForm && pokemonNumber && templateNumber === pokemonNumber) score += 30;
        if (template.name === pokemon.name) score += 5;

        return { template, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.template || pokemon;
  };

  const getBaseSpeciesNumber = (number) => {
    let baseNumber = Number(number);
    let changed = true;

    while (changed) {
      changed = false;
      let previousEvolution = null;
      for (const evolution of (evolutionsData.evolutions || [])) {
        if (Number(evolution.to) === baseNumber) {
          previousEvolution = evolution;
          break;
        }
      }
      if (previousEvolution) {
        baseNumber = Number(previousEvolution.from);
        changed = true;
      }
    }

    return baseNumber;
  };

  const getEggHatchTemplate = (egg) => {
    const motherRegionalForm = egg?.motherRegionalForm || egg?.regionalForm || null;
    const sourceNumber = Number(
      egg?.motherOriginalNumber ||
      egg?.originalNumber ||
      egg?.speciesOriginalNumber ||
      egg?.speciesNumber
    );
    const sourceTemplate = findPokemonTemplateByNumber(
      Number.isFinite(sourceNumber) ? sourceNumber : egg?.speciesNumber,
      motherRegionalForm
    ) || (allPokemonMaster || []).find(template =>
      Number(template.number) === Number(egg?.speciesNumber)
    );

    if (!sourceTemplate) return null;

    const baseNumber = getBaseSpeciesNumber(getSpeciesNumber(sourceTemplate));
    return findPokemonTemplateByNumber(baseNumber, sourceTemplate.regionalForm) ||
      findPokemonTemplateByNumber(baseNumber);
  };

  const getRandomParentBall = (egg) => {
    const parentBalls = [
      egg?.parent1Ball,
      egg?.parent2Ball,
      ...(Array.isArray(egg?.parentBalls) ? egg.parentBalls : [])
    ].filter(ball => ball?.caughtWithBall || ball?.ballImageUrl);

    if (!parentBalls.length) {
      return {
        caughtWithBall: egg?.caughtWithBall || '몬스터볼',
        ballImageUrl: egg?.ballImageUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
      };
    }

    const ball = parentBalls[Math.floor(Math.random() * parentBalls.length)];
    return {
      caughtWithBall: ball.caughtWithBall || '몬스터볼',
      ballImageUrl: ball.ballImageUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'
    };
  };

  const createPokemonFromEgg = (egg) => {
    const pokemonTemplate = getEggHatchTemplate(egg);

    if (!pokemonTemplate) {
      throw new Error('알에 해당하는 포켓몬 데이터를 찾을 수 없습니다.');
    }

    const inheritedBall = getRandomParentBall(egg);
    const learnset = movesData.pokemonLearnsets?.[pokemonTemplate.number] ||
      movesData.pokemonLearnsets?.[pokemonTemplate.originalNumber] ||
      [];
    const startingMoves = Array.isArray(learnset)
      ? learnset
          .filter(entry => Number(entry.level || 0) <= 1)
          .sort((a, b) => Number(b.level || 0) - Number(a.level || 0))
          .slice(0, 4)
          .map(entry => {
            const move = (movesData.moves || []).find(item => item.id === entry.moveId);
            return move ? {
              moveId: move.id,
              currentPp: move.pp,
              learnedAt: 1
            } : null;
          })
          .filter(Boolean)
      : [];

    return {
      uniqueId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      regionalForm: pokemonTemplate.regionalForm || null,
      formVariant: pokemonTemplate.formVariant || null,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      ...getBaseStatPatch(pokemonTemplate),
      level: 1,
      hp: pokemonTemplate.baseHp || pokemonTemplate.hp || 10,
      maxHp: pokemonTemplate.baseHp || pokemonTemplate.hp || 10,
      exp: 0,
      friendship: 120,
      heldItem: null,
      moves: startingMoves,
      caughtWithBall: inheritedBall.caughtWithBall,
      ballImageUrl: inheritedBall.ballImageUrl,
      isPartner: false,
      isShiny: Math.random() < 0.001,
      gender: Math.random() < 0.5 ? 'male' : 'female',
      ability: pokemonTemplate.abilities?.[0] || '없음',
      ivs: generateRandomIVs(),
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: pokemonTemplate.iconUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
      spriteUrl: pokemonTemplate.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`,
      isFromEgg: true,
      hatchedAt: new Date().toISOString(),
      parents: {
        parent1: egg.parent1Name || null,
        parent2: egg.parent2Name || null
      }
    };
  };

  const addPokemonToAvailableSlot = (caughtPokemon = [], pokemon) => {
    const nextPokemon = [...caughtPokemon];
    while (nextPokemon.length < 6) nextPokemon.push(null);

    const emptyPartyIndex = nextPokemon.slice(0, 6).findIndex(isEmptyPokemonSlot);
    if (emptyPartyIndex >= 0) {
      nextPokemon[emptyPartyIndex] = pokemon;
      return { caughtPokemon: nextPokemon, addedToParty: true };
    }

    nextPokemon.push(pokemon);
    return { caughtPokemon: nextPokemon, addedToParty: false };
  };
  
  // ========== 회원 추가 ==========
  const addMember = async (id, password, name) => {
    if (!currentUser?.isAdmin) return false;

    const loginId = String(id || '').trim();
    const memberPassword = String(password || '');
    const memberName = String(name || '').trim();
    const isTemporaryPassword = memberPassword === '0000';
    const authPassword = isTemporaryPassword ? '000000' : memberPassword;

    if (!loginId || !memberPassword || !memberName) return false;
    if (authPassword.length < 6) {
      alert('비밀번호는 6자 이상으로 입력해주세요. 임시 비밀번호는 0000을 사용할 수 있습니다.');
      return false;
    }

    const duplicateMember = members?.[loginId] || Object.values(members || {}).find(member => (
      member?.loginId === loginId || member?.email === `${loginId}@pokemon.com`
    ));
    if (duplicateMember) {
      alert('이미 사용 중인 아이디입니다.');
      return false;
    }
    
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
      loginId,
      password: isTemporaryPassword ? '0000' : null,
      name: memberName,
      email: `${loginId}@pokemon.com`,
      forcePasswordChange: isTemporaryPassword,
      isAdmin: false,
      isSuperAdmin: false,
      canManageItems: false,
      dailyWalks: 10,
      maxDailyWalks: 10,
      money: 10000,
      trainerExp: 0,
      lastAttendanceDate: null,
      caughtPokemon: [],
      inventory: getInitialInventory()
    };
    
    let secondaryApp = null;

    try {
      secondaryApp = initializeApp(auth.app.options, `admin-member-create-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newMember.email,
        authPassword
      );
      const uid = userCredential.user.uid;

      await signOut(secondaryAuth);

      const memberRef = ref(database, `members/${uid}`);
      await set(memberRef, newMember);
      
      setMembers(prev => ({
        ...prev,
        [uid]: { ...newMember, id: uid }
      }));
      
      console.log('✅ 새 회원 추가:', memberName, uid);
      return true;
    } catch (error) {
      console.error('❌ 회원 추가 실패:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('이미 사용 중인 아이디입니다.');
      } else if (error.code === 'auth/weak-password') {
        alert('비밀번호는 6자 이상으로 입력해주세요. 임시 비밀번호는 0000을 사용할 수 있습니다.');
      } else {
        alert(`회원 추가 중 오류가 발생했습니다.\n${error.message || error}`);
      }
      return false;
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (error) {
          console.warn('보조 Firebase 앱 정리 실패:', error);
        }
      }
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

    // 알로 지급
    if (options.asEgg && options.eggData) {
      const eggData = {
        ...options.eggData,
        id: `egg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        givenAt: new Date().toISOString(),
      };
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { egg: eggData });
      alert(`${member.name}님에게 ${pokemonTemplate.name} 알을 지급했습니다!`);
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

    // 파트너가 아닌 경우에만 포획 제한 체크
    if (!isPartner) {
      const nonPartnerCount = member.caughtPokemon.filter(p => p && !p.isPartner).length;
      const maxNonPartnerPokemon = Number(systemSettings.maxNonPartnerPokemon) || 18;
      if (nonPartnerCount >= maxNonPartnerPokemon) {
        alert(`⚠️ ${member.name}님은 이미 파트너를 제외한 포켓몬이 ${maxNonPartnerPokemon}마리입니다!\n더 이상 포켓몬을 지급할 수 없습니다.`);
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
    const finalAbilityEn = getAbilityEnglishName(finalAbility) || pokemonTemplate.abilitiesEn?.[0] || null;
    
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
      ...getBaseStatPatch(pokemonTemplate),
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
      abilityEn: finalAbilityEn,
      isHiddenAbility: false,
      height: parseFloat(finalHeight.toFixed(1)),
      weight: parseFloat(finalWeight.toFixed(1)),
      sizeRank,
      heightVariation: parseFloat(heightVariation.toFixed(1)),
      weightVariation: parseFloat(weightVariation.toFixed(1)),
      ivs: ivs ? normalizeIVs(ivs) : generateRandomIVs(),
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
  const transferMemberPokemon = async (fromMemberId, toMemberId, transferTarget = {}) => {
    if (!currentUser?.isAdmin) return false;

    if (!fromMemberId || !toMemberId || fromMemberId === toMemberId) {
      alert('서로 다른 멤버를 선택해주세요.');
      return false;
    }

    const fromMember = members[fromMemberId];
    const toMember = members[toMemberId];

    if (!fromMember || !toMember) {
      alert('멤버 정보를 찾을 수 없습니다.');
      return false;
    }

    const transferEgg = Boolean(transferTarget.transferEgg);
    const pokemonUniqueId = transferTarget.pokemonUniqueId;

    try {
      let updatedFromMember = { ...fromMember };
      let updatedToMember = { ...toMember };
      let transferredName = '';

      if (transferEgg) {
        if (!fromMember.egg) {
          alert('이전할 알이 없습니다.');
          return false;
        }
        if (toMember.egg) {
          alert(`${toMember.name}님은 이미 알을 보유하고 있습니다.`);
          return false;
        }

        const movedEgg = {
          ...fromMember.egg,
          transferredFrom: fromMember.name || fromMemberId,
          transferredAt: new Date().toISOString()
        };

        updatedFromMember = {
          ...fromMember,
          egg: null
        };
        updatedToMember = {
          ...toMember,
          egg: movedEgg
        };
        transferredName = `${movedEgg.species || movedEgg.name || '알'} 알`;
      } else {
        if (!pokemonUniqueId) {
          alert('이전할 포켓몬을 선택해주세요.');
          return false;
        }

        const sourcePokemon = (fromMember.caughtPokemon || []).find(
          pokemon => pokemon && pokemon.uniqueId === pokemonUniqueId
        );

        if (!sourcePokemon) {
          alert('이전할 포켓몬을 찾을 수 없습니다.');
          return false;
        }

        const targetNonPartnerCount = (toMember.caughtPokemon || []).filter(p => p && !p.isPartner).length;
        const maxNonPartnerPokemon = Number(systemSettings.maxNonPartnerPokemon) || 18;
        if (targetNonPartnerCount >= maxNonPartnerPokemon) {
          alert(`${toMember.name}님은 파트너를 제외한 포켓몬이 ${maxNonPartnerPokemon}마리입니다.\n더 이상 포켓몬을 받을 수 없습니다.`);
          return false;
        }

        const movedPokemon = {
          ...sourcePokemon,
          isPartner: false,
          transferredFrom: fromMember.name || fromMemberId,
          transferredAt: new Date().toISOString()
        };

        const updatedSourcePokemon = (fromMember.caughtPokemon || []).filter(
          pokemon => pokemon && pokemon.uniqueId !== pokemonUniqueId
        );
        const placement = addPokemonToAvailableSlot(toMember.caughtPokemon || [], movedPokemon);

        updatedFromMember = {
          ...fromMember,
          caughtPokemon: updatedSourcePokemon
        };
        updatedToMember = {
          ...toMember,
          caughtPokemon: placement.caughtPokemon
        };
        transferredName = movedPokemon.nickname || movedPokemon.name || '포켓몬';
      }

      const cleanForSave = (memberData) => {
        const { id, ...dataToSave } = memberData;
        return JSON.parse(JSON.stringify(dataToSave, (key, value) => (
          value === undefined ? null : value
        )));
      };

      await set(ref(database, `members/${fromMemberId}`), cleanForSave(updatedFromMember));
      await set(ref(database, `members/${toMemberId}`), cleanForSave(updatedToMember));

      setMembers(prev => ({
        ...prev,
        [fromMemberId]: updatedFromMember,
        [toMemberId]: updatedToMember
      }));

      if (fromMemberId === currentUser?.id) {
        updateCurrentUser({
          caughtPokemon: updatedFromMember.caughtPokemon,
          egg: updatedFromMember.egg ?? null
        });
      }

      if (toMemberId === currentUser?.id) {
        updateCurrentUser({
          caughtPokemon: updatedToMember.caughtPokemon,
          egg: updatedToMember.egg ?? null
        });
      }

      alert(`${fromMember.name}님의 ${transferredName}을(를) ${toMember.name}님에게 이전했습니다.`);
      return true;
    } catch (error) {
      console.error('포켓몬/알 이전 실패:', error);
      alert('포켓몬/알 이전 중 오류가 발생했습니다: ' + error.message);
      return false;
    }
  };

  const deleteMemberPokemon = async (memberId, pokemonUniqueId) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) {
      console.error('삭제 실패: 멤버를 찾을 수 없음', memberId);
      return;
    }
    if (!pokemonUniqueId) {
      console.error('삭제 실패: uniqueId 없음');
      return;
    }

    const updatedPokemon = (member.caughtPokemon || []).filter(
      p => p && String(p.uniqueId) !== String(pokemonUniqueId)
    );
    
    const updatedPartnerPokemon = member.partnerPokemon?.uniqueId === pokemonUniqueId
      ? null
      : member.partnerPokemon;

    const updatedMember = {
      ...member,
      caughtPokemon: updatedPokemon,
      partnerPokemon: updatedPartnerPokemon
    };
    
    try {
      const { id, ...dataToSave } = updatedMember;
      const cleanData = JSON.parse(
        JSON.stringify(dataToSave, (key, value) => value === undefined ? null : value)
      );
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, cleanData);

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));

      if (memberId === currentUser?.id) {
        updateCurrentUser({ caughtPokemon: updatedPokemon, partnerPokemon: updatedPartnerPokemon });
      }

      alert('포켓몬이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 포켓몬 삭제 실패:', error);
      alert('포켓몬 삭제 중 오류가 발생했습니다: ' + error.message);
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
        const pokemonTemplate = findPokemonTemplateForOwned(p);

        const currentCondition = p.condition || {
          elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0
        };
        
        const currentEffort = p.effort || {
          hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
        };

        return {
          ...p,
          pokemonId: safeValue(updates.pokemonId, p.pokemonId),
          number: safeValue(updates.number, p.number),
          originalNumber: safeValue(updates.originalNumber, p.originalNumber),
          displayNumber: safeValue(updates.displayNumber, p.displayNumber),
          name: safeValue(updates.name, p.name),
          nameEn: safeValue(updates.nameEn, p.nameEn),
          species: safeValue(updates.species, p.species),
          type: safeValue(updates.type, p.type),
          type2: safeValue(updates.type2, p.type2),
          nickname: safeValue(updates.nickname, p.nickname),
          level: updates.level !== undefined 
            ? Math.min(100, Math.max(1, updates.level)) 
            : p.level,
          friendship: safeValue(updates.friendship, p.friendship || 0),
          caughtWithBall: safeValue(updates.caughtWithBall, p.caughtWithBall),
          ballImageUrl: safeValue(updates.ballImage, p.ballImageUrl),
          gender: normalizePokemonGender(safeValue(updates.gender, p.gender), pokemonTemplate),
          ability: safeValue(updates.ability, p.ability),
          abilityEn: safeValue(updates.abilityEn, p.abilityEn),
          abilities: safeValue(updates.abilities, p.abilities),
          abilitiesEn: safeValue(updates.abilitiesEn, p.abilitiesEn),
          hiddenAbility: safeValue(updates.hiddenAbility, p.hiddenAbility),
          hiddenAbilityEn: safeValue(updates.hiddenAbilityEn, p.hiddenAbilityEn),
          isHiddenAbility: safeValue(updates.isHiddenAbility, p.isHiddenAbility || false),
          baseHp: safeValue(updates.baseHp, p.baseHp),
          baseAttack: safeValue(updates.baseAttack, p.baseAttack),
          baseDefense: safeValue(updates.baseDefense, p.baseDefense),
          baseSpAttack: safeValue(updates.baseSpAttack, p.baseSpAttack),
          baseSpDefense: safeValue(updates.baseSpDefense, p.baseSpDefense),
          baseSpeed: safeValue(updates.baseSpeed, p.baseSpeed),
          imageUrl: safeValue(updates.imageUrl, p.imageUrl),
          shinySprite: safeValue(updates.shinySprite, p.shinySprite),
          isRegionalForm: safeValue(updates.isRegionalForm, p.isRegionalForm || false),
          regionalForm: safeValue(updates.regionalForm, p.regionalForm),
          formVariant: safeValue(updates.formVariant, p.formVariant),
          baseSpecies: safeValue(updates.baseSpecies, p.baseSpecies),
          baseSpeciesEn: safeValue(updates.baseSpeciesEn, p.baseSpeciesEn),
          sizeRank: safeValue(updates.sizeRank, p.sizeRank),
          heightVariation: updates.heightVariation !== undefined 
            ? parseFloat(updates.heightVariation) 
            : (p.heightVariation || 100),
          weightVariation: updates.weightVariation !== undefined 
            ? parseFloat(updates.weightVariation) 
            : (p.weightVariation || 100),
          
          ivs: updates.ivs !== undefined
            ? normalizeIVs(updates.ivs, normalizeIVs(p.ivs, DEFAULT_IVS))
            : normalizeIVs(p.ivs, DEFAULT_IVS),
          
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

    const updatedPartnerPokemon = member.partnerPokemon?.uniqueId === pokemonUniqueId
      ? {
          ...member.partnerPokemon,
          ...updates,
          level: updates.level !== undefined
            ? Math.min(100, Math.max(1, updates.level))
            : member.partnerPokemon.level,
          friendship: safeValue(updates.friendship, member.partnerPokemon.friendship || 0),
          ballImageUrl: safeValue(updates.ballImage, member.partnerPokemon.ballImageUrl),
          gender: normalizePokemonGender(
            safeValue(updates.gender, member.partnerPokemon.gender),
            findPokemonTemplateForOwned(member.partnerPokemon)
          ),
          isHiddenAbility: safeValue(updates.isHiddenAbility, member.partnerPokemon.isHiddenAbility || false),
          heightVariation: updates.heightVariation !== undefined
            ? parseFloat(updates.heightVariation)
            : (member.partnerPokemon.heightVariation || 100),
          weightVariation: updates.weightVariation !== undefined
            ? parseFloat(updates.weightVariation)
            : (member.partnerPokemon.weightVariation || 100),
          ivs: updates.ivs !== undefined
            ? normalizeIVs(updates.ivs, normalizeIVs(member.partnerPokemon.ivs, DEFAULT_IVS))
            : normalizeIVs(member.partnerPokemon.ivs, DEFAULT_IVS),
          effort: updates.effort || member.partnerPokemon.effort || {
            hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
          },
          condition: updates.condition || member.partnerPokemon.condition || {
            elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0
          },
        }
      : member.partnerPokemon;

    const updatedMember = {
      ...member,
      caughtPokemon: updatedPokemon,
      partnerPokemon: updatedPartnerPokemon
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
          caughtPokemon: updatedPokemon,
          partnerPokemon: updatedPartnerPokemon
        });
      }
      
      console.log('포켓몬 편집 완료:', pokemonUniqueId);
      alert('포켓몬이 수정되었습니다!');
      
    } catch (error) {
      console.error('포켓몬 편집 실패:', error);
      alert('포켓몬 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const hatchMemberEgg = async (memberId) => {
    if (!currentUser?.isAdmin) return false;

    const member = members[memberId];
    if (!member?.egg) {
      alert('부화할 알이 없습니다.');
      return false;
    }

    try {
      const hatchedPokemon = createPokemonFromEgg(member.egg);
      const placement = addPokemonToAvailableSlot(member.caughtPokemon || [], hatchedPokemon);
      const updatedMember = {
        ...member,
        caughtPokemon: placement.caughtPokemon,
        egg: null
      };

      const { id, ...dataToSave } = updatedMember;
      await set(ref(database, `members/${memberId}`), JSON.parse(JSON.stringify(dataToSave)));

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));

      if (memberId === currentUser?.id) {
        updateCurrentUser({
          caughtPokemon: placement.caughtPokemon,
          egg: null
        });
      }

      alert(`${hatchedPokemon.nickname || hatchedPokemon.name}이(가) 부화했습니다.\n${placement.addedToParty ? '빈 엔트리 칸' : '박스'}에 추가되었습니다.`);
      return true;
    } catch (error) {
      console.error('알 부화 실패:', error);
      alert(`알 부화 중 오류가 발생했습니다: ${error.message}`);
      return false;
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

  // ========== 회원 삭제 ==========
  const deleteMember = async (memberId) => {
    if (!currentUser?.isSuperAdmin) return false;
    if (!memberId || memberId === currentUser.id) {
      alert('현재 로그인 중인 계정은 삭제할 수 없습니다.');
      return false;
    }

    const member = members[memberId];
    if (!member) {
      alert('삭제할 회원을 찾을 수 없습니다.');
      return false;
    }

    if (member.isSuperAdmin) {
      alert('슈퍼 관리자 계정은 삭제할 수 없습니다.');
      return false;
    }

    try {
      await set(ref(database, `members/${memberId}`), null);
      setMembers(prev => {
        const nextMembers = { ...prev };
        delete nextMembers[memberId];
        return nextMembers;
      });
      console.log('✅ 회원 삭제 완료:', memberId);
      return true;
    } catch (error) {
      console.error('❌ 회원 삭제 실패:', error);
      alert('회원 삭제 중 오류가 발생했습니다.');
      return false;
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
    transferMemberPokemon,
    deleteMemberPokemon,
    hatchMemberEgg,
    editMemberPokemon,
    addPokemonToSelf,
    updateMemberMoney,
    deleteMember,
    resetGameData
  };
};
