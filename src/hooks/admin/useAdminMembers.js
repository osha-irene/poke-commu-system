// src/hooks/admin/useAdminMembers.js
// 회원 관리 전용 훅

import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { ref, set, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, database, storage } from '../../firebase';
import { POKEBALL_LIST } from '../../styles/theme';
import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { normalizePokemonGender } from '../../utils/pokemonGender';
import { DEFAULT_IVS, generateRandomIVs, normalizeIVs } from '../../utils/pokemonIndividualValues';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';
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
      {};
    const allMovesArr = movesData.moves || [];

    // 아이템 판별
    const EVERSTONE = ['변함없는돌', 'everstone'];
    const DESTINY_KNOT = ['빨간실', 'destiny-knot'];
    const MIRROR_HERB = ['흉내허브', 'mirror-herb'];
    const LIGHT_BALL = ['전기구슬', 'light-ball'];
    const matchItem = (item, list) => item && list.some(id => String(item).toLowerCase() === id.toLowerCase());

    const parentHeldItems = egg.parentHeldItems || [null, null];
    const everstoneIndex = parentHeldItems.findIndex(i => matchItem(i, EVERSTONE));
    const hasDestinyKnot = parentHeldItems.some(i => matchItem(i, DESTINY_KNOT));
    const mirrorHerbHolder = parentHeldItems.findIndex(i => matchItem(i, MIRROR_HERB));

    // 변함없는돌: 좋아하는 맛 / 성격 유전
    const inheritedFlavor = everstoneIndex >= 0
      ? (everstoneIndex === 0 ? egg.parent1FavoriteFlavor : egg.parent2FavoriteFlavor) || null
      : null;
    const inheritedNature = everstoneIndex >= 0
      ? (everstoneIndex === 0 ? egg.parent1Nature : egg.parent2Nature) || null
      : null;

    // 빨간실: 친밀도 보너스
    const startingFriendship = hasDestinyKnot ? 150 : 120;

    // 흉내허브: 상대 부모의 레벨업+TM 레퍼토리까지 유전기 후보 확장
    const getExpandedParentMoves = (baseMoves) => {
      if (mirrorHerbHolder === -1) return baseMoves;
      const partnerNumber = mirrorHerbHolder === 0 ? egg.parent2Number : egg.parent1Number;
      if (!partnerNumber) return baseMoves;
      const partnerLearnset = movesData.pokemonLearnsets?.[partnerNumber] || {};
      const partnerLevelIds = (partnerLearnset.levelUpMoves || []).map(e => e.moveId);
      const partnerTmIds = partnerLearnset.tmMoves || [];
      const existingIds = new Set(baseMoves.map(m => m.moveId));
      const extra = [...partnerLevelIds, ...partnerTmIds]
        .filter(moveId => !existingIds.has(moveId))
        .map(moveId => {
          const move = allMovesArr.find(m => m.id === moveId);
          return move ? { moveId: move.id, currentPp: move.pp, learnedAt: 1 } : null;
        })
        .filter(Boolean);
      return [...baseMoves, ...extra];
    };

    const levelUpMoves = learnset.levelUpMoves || (Array.isArray(learnset) ? learnset : []);
    const startingMoves = levelUpMoves
      .filter(entry => Number(entry.level || 0) <= 1)
      .sort((a, b) => Number(b.level || 0) - Number(a.level || 0))
      .slice(0, 4)
      .map(entry => {
        const move = allMovesArr.find(item => item.id === entry.moveId);
        return move ? { moveId: move.id, currentPp: move.pp, learnedAt: 1 } : null;
      })
      .filter(Boolean);

    const expandedParentMoves = getExpandedParentMoves(egg.parentMoves || []);
    const babyEggMoveIds = new Set(learnset.eggMoves || []);
    const parentMoveIds = new Set(expandedParentMoves.map(m => m.moveId).filter(Boolean));
    const inheritedEggMoves = [...babyEggMoveIds]
      .filter(moveId => parentMoveIds.has(moveId))
      .map(moveId => {
        const move = allMovesArr.find(item => item.id === moveId);
        return move ? { moveId: move.id, currentPp: move.pp, learnedAt: 1 } : null;
      })
      .filter(Boolean);

    const usedIds = new Set(inheritedEggMoves.map(m => m.moveId));
    let finalMoves = [
      ...inheritedEggMoves,
      ...startingMoves.filter(m => !usedIds.has(m.moveId))
    ].slice(0, 4);

    // 전기구슬: 피츄(172) 부화 시 볼트태클 추가
    if (pokemonTemplate.number === 172 && parentHeldItems.some(i => matchItem(i, LIGHT_BALL))) {
      const voltTackle = allMovesArr.find(m => m.id === 'volt-tackle');
      if (voltTackle && !finalMoves.find(m => m.moveId === 'volt-tackle')) {
        finalMoves = [{ moveId: voltTackle.id, currentPp: voltTackle.pp, learnedAt: 1 }, ...finalMoves].slice(0, 4);
      }
    }

    return {
      uniqueId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: getPokemonDisplayParts(pokemonTemplate).name || pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.originalNumber || pokemonTemplate.number,
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
      friendship: startingFriendship,
      heldItem: null,
      moves: (egg.moves && egg.moves.length > 0) ? egg.moves : finalMoves,
      caughtWithBall: inheritedBall.caughtWithBall,
      ballImageUrl: inheritedBall.ballImageUrl,
      isPartner: false,
      isShiny: Math.random() < 0.001,
      gender: Math.random() < 0.5 ? 'male' : 'female',
      ability: pokemonTemplate.abilities?.[0] || '없음',
      ivs: { ...DEFAULT_IVS },
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: (() => { const orig = pokemonTemplate.originalNumber; const n = (orig === 710 || orig === 711) ? orig : pokemonTemplate.number; return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })(),
      spriteUrl: pokemonTemplate.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`,
      isFromEgg: true,
      hatchedAt: new Date().toISOString(),
      parents: {
        parent1: egg.parent1Name || null,
        parent2: egg.parent2Name || null,
        trainer1: egg.parent1TrainerName || null,
        trainer2: egg.parent2TrainerName || null,
      },
      sizeRank: (() => {
        const ranks = ['XXXS','XXS','XS','M','M','M','M','XL','XXL','XXXL'];
        return ranks[Math.floor(Math.random() * ranks.length)];
      })(),
      ...(inheritedNature ? { nature: inheritedNature } : {}),
      favoriteFlavor: inheritedFlavor || ['매운맛','신맛','단맛','쓴맛','짠맛'][Math.floor(Math.random() * 5)]
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

      return [
        { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
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
      money: 3000,
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

    // 알로 지급 — egg 필드에 별도 저장, 포켓몬 수 제한 무관
    if (options.asEgg && options.eggData) {
      try {
        const rawEggData = {
          ...options.eggData,
          id: `egg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          givenAt: new Date().toISOString(),
        };
        // Firebase는 undefined 값을 거부하므로 제거
        const eggData = Object.fromEntries(
          Object.entries(rawEggData).filter(([, v]) => v !== undefined)
        );
        const memberRef = ref(database, `members/${memberId}`);
        await update(memberRef, { egg: eggData });
        setMembers(prev => ({
          ...prev,
          [memberId]: { ...prev[memberId], egg: eggData }
        }));
        if (memberId === currentUser?.id) {
          updateCurrentUser({ egg: eggData });
        }
        alert(`${member.name}님에게 ${pokemonTemplate?.name || '포켓몬'} 알을 지급했습니다!`);
      } catch (error) {
        console.error('❌ 알 지급 실패:', error);
        alert(`알 지급 실패: ${error.message}`);
      }
      return;
    }

    if (!member.caughtPokemon) {
      member.caughtPokemon = [];
    }

    const FLAVORS = ['매운맛', '신맛', '단맛', '쓴맛', '짠맛'];

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
      favoriteFlavor = FLAVORS[Math.floor(Math.random() * FLAVORS.length)],
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
      : pokemonTemplate.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`;

    const iconUrl = isShiny && pokemonTemplate.shinySprite
      ? pokemonTemplate.shinySprite
      : (() => { const orig = pokemonTemplate.originalNumber; const n = (orig === 710 || orig === 711) ? orig : pokemonTemplate.number; return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })();

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
      isAdminGiven: true,
      favoriteFlavor,
      pokemonId: pokemonTemplate.id,
      name: getPokemonDisplayParts(pokemonTemplate).name || pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      nickname,
      number: pokemonTemplate.originalNumber || pokemonTemplate.number,
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

    const updatedPokemon = (member.caughtPokemon || []).map(p => {
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
          spriteSize: safeValue(updates.spriteSize, p.spriteSize || null),
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

  // ========== 회원 경험치 업데이트 ==========
  const updateMemberTrainerExp = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;
    const nextTrainerExp = Math.max(0, Number(amount) || 0);

    const updatedMember = {
      ...member,
      trainerExp: nextTrainerExp
    };

    // 자기 자신의 경험치를 수정할 때는 currentUser 상태도 함께 동기화
    if (memberId === currentUser.id) {
      await updateCurrentUser({ trainerExp: nextTrainerExp });
      return;
    }

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { trainerExp: nextTrainerExp });

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 경험치 업데이트 실패:', error);
    }
  };

  // ========== 회원 금액 업데이트 ==========
  const updateMemberMoney = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;
    const nextMoney = Math.max(0, Number(amount) || 0);

    const updatedMember = {
      ...member,
      money: nextMoney
    };

    // 자기 자신의 금액을 수정할 때는 updateCurrentUser를 통해 currentUser 상태도 동기화
    if (memberId === currentUser.id) {
      await updateCurrentUser({ money: nextMoney });
      return;
    }

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { money: nextMoney });

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 금액 업데이트 실패:', error);
    }
  };

  // ========== 칭호 업데이트 ==========
  const updateMemberTitle = async (memberId, titleId) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const updatedMember = { ...member, title: titleId === 'none' ? null : titleId };

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { title: updatedMember.title ?? null });

      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));

      if (memberId === currentUser?.id) {
        updateCurrentUser({ title: updatedMember.title ?? null });
      }
    } catch (error) {
      console.error('❌ 칭호 업데이트 실패:', error);
      alert('칭호 업데이트 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 칭호 부여 ==========
  const grantMemberTitle = async (memberId, titleId) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;

    const assigned = Array.isArray(member.assignedTitles) ? member.assignedTitles : [];
    if (assigned.includes(titleId)) return;

    const newAssigned = [...assigned, titleId];
    try {
      await update(ref(database, `members/${memberId}`), { assignedTitles: newAssigned });
      setMembers(prev => ({ ...prev, [memberId]: { ...prev[memberId], assignedTitles: newAssigned } }));
      if (memberId === currentUser?.id) updateCurrentUser({ assignedTitles: newAssigned });
    } catch (error) {
      console.error('❌ 칭호 부여 실패:', error);
      alert('칭호 부여 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 칭호 회수 ==========
  const revokeMemberTitle = async (memberId, titleId) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;

    const assigned = Array.isArray(member.assignedTitles) ? member.assignedTitles : [];
    const newAssigned = assigned.filter(id => id !== titleId);
    const newTitle = member.title === titleId ? null : (member.title ?? null);

    try {
      await update(ref(database, `members/${memberId}`), { assignedTitles: newAssigned, title: newTitle });
      setMembers(prev => ({ ...prev, [memberId]: { ...prev[memberId], assignedTitles: newAssigned, title: newTitle } }));
      if (memberId === currentUser?.id) updateCurrentUser({ assignedTitles: newAssigned, title: newTitle });
    } catch (error) {
      console.error('❌ 칭호 회수 실패:', error);
      alert('칭호 회수 중 오류가 발생했습니다: ' + error.message);
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

  // ========== NPC 토글 ==========
  const toggleMemberNPC = async (memberId) => {
    if (!currentUser?.isAdmin) return;
    const member = members[memberId];
    if (!member) return;
    const updatedMember = { ...member, isNPC: !member.isNPC };
    try {
      const { id, ...raw } = updatedMember;
      const dataToSave = JSON.parse(JSON.stringify(raw, (_, v) => v === undefined ? null : v));
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);
      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));
    } catch (error) {
      console.error('❌ NPC 토글 실패:', error);
    }
  };

  // ========== 멤버 숨기기 토글 ==========
  const toggleMemberHidden = async (memberId) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const updatedMember = { ...member, hidden: !member.hidden };

    try {
      const { id, ...dataToSave } = updatedMember;
      const memberRef = ref(database, `members/${memberId}`);
      await set(memberRef, dataToSave);

      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));
      console.log('✅ 멤버 숨김 토글:', member.name, updatedMember.hidden);
    } catch (error) {
      console.error('❌ 멤버 숨김 처리 실패:', error);
    }
  };

  const updateMemberNpcSettings = async (memberId, settings = {}) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const npcOrder = Number(settings.npcOrder);
    const nextSettings = {
      ...(settings.npcOrder !== undefined
        ? { npcOrder: Number.isFinite(npcOrder) && npcOrder > 0 ? npcOrder : null }
        : {}),
      ...(settings.npcPrivate !== undefined ? { npcPrivate: !!settings.npcPrivate } : {}),
    };
    const updatedMember = { ...member, ...nextSettings };

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, nextSettings);
      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));

      if (currentUser?.id === memberId) {
        updateCurrentUser(nextSettings);
      }
    } catch (error) {
      console.error('NPC settings update failed:', error);
    }
  };

  return {
    addMember,
    toggleAdminStatus,
    toggleItemManagement,
    toggleMemberHidden,
    toggleMemberNPC,
    updateMemberNpcSettings,
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
    updateMemberTrainerExp,
    updateMemberTitle,
    grantMemberTitle,
    revokeMemberTitle,
    deleteMember,
    resetGameData,
    uploadMemberImage,
    deleteMemberImage,
  };

  async function uploadMemberImage(memberId, file, type) {
    // type: 'face' | 'body'
    if (!memberId || !file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `members/${memberId}/${type}.${ext}`;
    const sRef = storageRef(storage, path);
    try {
      await uploadBytes(sRef, file, { contentType: file.type });
      const url = await getDownloadURL(sRef);
      const field = type === 'face' ? 'profileImage' : 'profileImageFull';
      const updates = { [field]: url };

      // 두상 업로드 시 썸네일(300×300) 추가 저장
      if (type === 'face') {
        try {
          const isPng = file.type === 'image/png';
          const thumbMime = isPng ? 'image/png' : 'image/jpeg';
          const thumbExt = isPng ? 'png' : 'jpg';
          const thumbBlob = await resizeImage(file, 200, null, thumbMime);
          const thumbPath = `members/${memberId}/face_thumb.${thumbExt}`;
          const thumbRef = storageRef(storage, thumbPath);
          await uploadBytes(thumbRef, thumbBlob, { contentType: thumbMime });
          updates.profileImageThumb = await getDownloadURL(thumbRef);
        } catch (thumbErr) {
          console.warn('썸네일 생성 실패(무시):', thumbErr);
        }
      }

      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, updates);
      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], ...updates }
      }));
      if (memberId === currentUser?.id) {
        updateCurrentUser(updates);
      }
      return url;
    } catch (error) {
      console.error('❌ 이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다: ' + error.message);
      return null;
    }
  }

  function resizeImage(file, maxW, maxH, mime = 'image/jpeg') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = maxH == null
          ? Math.min(maxW / img.width, 1)
          : Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (mime !== 'image/png') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob 실패')), mime, 0.9);
      };
      img.onerror = reject;
      img.src = objectUrl;
    });
  }

  async function deleteMemberImage(memberId, type) {
    if (!memberId) return;
    const field = type === 'face' ? 'profileImage' : 'profileImageFull';
    const member = members[memberId];
    const url = member?.[field];
    if (url) {
      try {
        const sRef = storageRef(storage, url);
        await deleteObject(sRef).catch(() => {});
      } catch {}
    }
    const updates = { [field]: null };
    if (type === 'face') {
      const thumbUrl = member?.profileImageThumb;
      if (thumbUrl) {
        try {
          await deleteObject(storageRef(storage, thumbUrl)).catch(() => {});
        } catch {}
      }
      updates.profileImageThumb = null;
    }
    const memberRef = ref(database, `members/${memberId}`);
    await update(memberRef, updates);
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], ...updates }
    }));
  }
};
