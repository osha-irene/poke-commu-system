// src/hooks/admin/useAdminMembers.js
// 회원 관리 전용 훅

import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { ref, set, update, get, runTransaction } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, database, storage, functions } from '../../firebase';
import { POKEBALL_LIST } from '../../styles/theme';
import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getAbilityEnglishName, getAbilityKoreanName } from '../../utils/abilityUtils';
import { normalizePokemonGender } from '../../utils/pokemonGender';
import { DEFAULT_IVS, generateRandomIVs, normalizeIVs } from '../../utils/pokemonIndividualValues';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';
import { withWurmpleEvolutionId } from '../../utils/wurmpleEvolution';
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
  const currentMember = currentUser?.id ? members?.[currentUser.id] : null;
  const hasAdminPermission = Boolean(currentUser?.isAdmin || currentUser?.isSuperAdmin || currentMember?.isAdmin || currentMember?.isSuperAdmin);
  const hasSuperAdminPermission = Boolean(currentUser?.isSuperAdmin || currentMember?.isSuperAdmin);

  // 관리자가 다른 회원의 데이터를 고칠 때는 로컬 members 스냅샷(오래됐을 수 있음)이 아니라
  // 항상 Firebase의 최신 값을 기준으로 계산한다 - 그래야 그 사이 본인이 직접 플레이해서
  // 바뀐 값(돈/산책/포켓몬 등)을 관리자 액션이 통째로 덮어써서 날리는 일이 없다.
  const fetchFreshMember = async (memberId) => {
    const snapshot = await get(ref(database, `members/${memberId}`));
    return snapshot.exists() ? { ...snapshot.val(), id: memberId } : null;
  };

  // memberSummary/memberParty 동기화는 여기서 직접 하지 않는다 - functions/index.js의
  // syncMemberViewData가 members/{memberId} 밑에 뭐가 바뀌든(이 훅의 쓰기 포함) 자동으로
  // 감지해서 실제로 반영값이 바뀐 경우에만 갱신한다. 여기서 또 호출하면 매 액션마다
  // 서버 트리거와 중복으로 두 번씩 쓰게 된다.

  const isEmptyPokemonSlot = (pokemon) => (
    pokemon === null || pokemon === undefined || pokemon === 'null'
  );

  // Firebase는 null이 섞인 배열을 숫자 키 객체로 돌려줄 수 있어 배열로 복원한다
  const normalizeToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      const keys = Object.keys(value).map(Number).filter(Number.isFinite);
      if (keys.length === 0) return [];
      const maxIndex = Math.max(...keys);
      return Array.from({ length: maxIndex + 1 }, (_, i) => value[i] ?? null);
    }
    return [];
  };

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
        ballImageUrl: egg?.ballImageUrl || 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png'
      };
    }

    const ball = parentBalls[Math.floor(Math.random() * parentBalls.length)];
    return {
      caughtWithBall: ball.caughtWithBall || '몬스터볼',
      ballImageUrl: ball.ballImageUrl || 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png'
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

    return withWurmpleEvolutionId({
      uniqueId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pokemonId: pokemonTemplate.id,
      name: getPokemonDisplayParts(pokemonTemplate).name || pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      regionalForm: pokemonTemplate.regionalForm || null,
      formVariant: pokemonTemplate.formVariant || null,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      ...getBaseStatPatch(pokemonTemplate),
      level: 1,
      caughtLevel: 1, // 알에서 부화한 순간의 레벨을 고정 저장
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
      ability: (() => {
        const abilitiesEn = pokemonTemplate.abilitiesEn || [];
        if (!abilitiesEn.length) return '없음';
        const selectedAbilityEn = abilitiesEn[Math.floor(Math.random() * abilitiesEn.length)];
        return getAbilityKoreanName(selectedAbilityEn) || selectedAbilityEn;
      })(),
      ivs: { ...DEFAULT_IVS },
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      imageUrl: pokemonTemplate.imageUrl,
      iconUrl: (() => { const orig = pokemonTemplate.originalNumber; const n = (orig === 710 || orig === 711) ? orig : pokemonTemplate.number; return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })(),
      spriteUrl: pokemonTemplate.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonTemplate.number}.png`,
      isFromEgg: true,
      hatchedAt: new Date().toISOString(),
      parents: {
        parent1: egg.parent1Name || null,
        parent2: egg.parent2Name || null,
        trainer1: egg.parent1TrainerName || null,
        trainer2: egg.parent2TrainerName || null,
      },
      sizeRank: (() => {
        const ranks = ['XXXS','XXS','XS','S','M','M','M','L','XL','XXL','XXXL'];
        return ranks[Math.floor(Math.random() * ranks.length)];
      })(),
      ...(inheritedNature ? { nature: inheritedNature } : {}),
      favoriteFlavor: inheritedFlavor || ['매운맛','신맛','단맛','쓴맛','짠맛'][Math.floor(Math.random() * 5)]
    });
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

    const existingTrainerIds = new Set(
      Object.values(members || {})
        .map(member => String(member?.trainerId || '').trim())
        .filter(Boolean)
    );
    const generateTrainerId = () => {
      for (let i = 0; i < 100; i += 1) {
        const candidate = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        if (!existingTrainerIds.has(candidate)) return candidate;
      }
      return String(Date.now()).slice(-6);
    };

    const finalTrainerId = generateTrainerId();
    
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
        { itemId: pokeBall?.id || 4, name: '몬스터볼', count: 15, imageUrl: pokeBall?.spriteUrl || 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png' },
      ];
    };

    const newMember = {
      loginId,
      password: isTemporaryPassword ? '0000' : null,
      name: memberName,
      trainerId: finalTrainerId,
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
    if (!hasSuperAdminPermission) {
      console.error('❌ 슈퍼 관리자 권한 필요');
      alert('슈퍼 관리자 권한이 필요합니다.');
      return false;
    }
    
    const member = members[memberId];
    if (!member) return false;
    
    const nextIsAdmin = !member.isAdmin;
    const updatedMember = {
      ...member,
      isAdmin: nextIsAdmin
    };
    
    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { isAdmin: nextIsAdmin });
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));

      if (memberId === currentUser?.id) {
        updateCurrentUser({ isAdmin: nextIsAdmin });
      }
      
      console.log('✅ 관리자 권한 토글:', member.name, updatedMember.isAdmin);
      return true;
    } catch (error) {
      console.error('❌ 권한 업데이트 실패:', error);
      alert(`관리자 권한 업데이트에 실패했습니다.\n${error.message || error}`);
      return false;
    }
  };

  // ========== 아이템 관리 권한 토글 ==========
  const toggleItemManagement = async (memberId) => {
    if (!hasAdminPermission) {
      console.error('❌ 관리자 권한 필요');
      alert('관리자 권한이 필요합니다.');
      return false;
    }
    
    const member = members[memberId];
    if (!member) return false;
    
    const nextCanManageItems = !member.canManageItems;
    const updatedMember = {
      ...member,
      canManageItems: nextCanManageItems
    };
    
    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { canManageItems: nextCanManageItems });
      
      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));

      if (memberId === currentUser?.id) {
        updateCurrentUser({ canManageItems: nextCanManageItems });
      }
      
      console.log('✅ 아이템 관리 권한 토글:', member.name, updatedMember.canManageItems);
      return true;
    } catch (error) {
      console.error('❌ 권한 업데이트 실패:', error);
      alert(`아이템 관리 권한 업데이트에 실패했습니다.\n${error.message || error}`);
      return false;
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

    const fieldUpdates = {
      dailyWalks: member.maxDailyWalks,
      lastSafariBallRewardDate: null
    };

    try {
      const memberRef = ref(database, `members/${memberId}`);
      // 산책 횟수/보상일자 2개 필드만 건드린다 - 예전엔 로컬 스냅샷 전체를 set()으로
      // 덮어써서, 그 사이 본인이 바꾼 다른 필드(돈/포켓몬 등)가 통째로 사라질 수 있었다.
      await update(memberRef, fieldUpdates);

      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], ...fieldUpdates }
      }));

      alert(`${member.name}님의 산책 횟수가 초기화되었습니다!`);
    } catch (error) {
      console.error('❌ 산책 횟수 초기화 실패:', error);
      alert('산책 횟수 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 전체 산책 횟수 초기화 ==========
  const resetAllWalkCounts = async () => {
    if (!currentUser?.isAdmin) return;

    try {
      const updates = {};
      for (const [id, member] of Object.entries(members)) {
        const fieldUpdates = {
          dailyWalks: member.maxDailyWalks,
          lastSafariBallRewardDate: null
        };

        // 위와 같은 이유로 필드 2개만 update() - 전체를 set()으로 덮어쓰지 않는다.
        const memberRef = ref(database, `members/${id}`);
        await update(memberRef, fieldUpdates);

        updates[id] = { ...member, ...fieldUpdates };
      }

      setMembers(prev => {
        const next = { ...prev };
        Object.entries(updates).forEach(([id, member]) => {
          next[id] = { ...next[id], ...member };
        });
        return next;
      });
      alert('모든 회원의 산책 횟수가 초기화되었습니다!');
    } catch (error) {
      console.error('❌ 전체 산책 횟수 초기화 실패:', error);
      alert('전체 산책 횟수 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 윽우지 부리 이스터에그 전체 리셋 ==========
  // cramorantBeakClaimed는 boolean 플래그(누적값 아님)라 다른 재화 필드처럼 트랜잭션이
  // 필요하진 않지만, resetAllWalkCounts와 같은 이유로 바뀐 필드만 update()로 건드린다.
  const resetAllCramorantBeak = async () => {
    if (!currentUser?.isAdmin) return;

    try {
      const updates = {};
      for (const [id, member] of Object.entries(members)) {
        if (!member?.cramorantBeakClaimed) continue;
        await update(ref(database, `members/${id}`), { cramorantBeakClaimed: false });
        updates[id] = { cramorantBeakClaimed: false };
      }

      setMembers(prev => {
        const next = { ...prev };
        Object.entries(updates).forEach(([id, fieldUpdates]) => {
          next[id] = { ...next[id], ...fieldUpdates };
        });
        return next;
      });

      if (updates[currentUser?.id]) {
        updateCurrentUser({ cramorantBeakClaimed: false });
      }

      alert(`${Object.keys(updates).length}명의 윽우지 부리 이스터에그를 리셋했습니다!`);
    } catch (error) {
      console.error('❌ 윽우지 부리 리셋 실패:', error);
      alert('윽우지 부리 리셋 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 파트너 포켓몬 레벨 일괄 조정 (선택 회원 대상) ==========
  const bulkAdjustPartnerLevel = async (memberIds, delta) => {
    if (!currentUser?.isAdmin) return;

    const numericDelta = Number(delta);
    if (!Number.isFinite(numericDelta) || numericDelta === 0) {
      alert('조정할 레벨 값을 입력해주세요.');
      return;
    }

    const targetIds = (memberIds || []).filter(id => members[id]?.partnerPokemon);
    if (targetIds.length === 0) {
      alert('선택한 회원 중 파트너 포켓몬을 보유한 회원이 없습니다.');
      return;
    }

    try {
      const updates = {};
      for (const id of targetIds) {
        // 레벨도 여러 액션에서 동시에 바뀔 수 있는 값이라, 클로저 스냅샷 기준
        // "기존값 + 변화량"이 아니라 항상 Firebase 최신 값을 다시 읽어서 계산한다.
        const freshMember = await fetchFreshMember(id) || members[id];
        const currentLevel = freshMember.partnerPokemon?.level || 1;
        const newLevel = Math.max(1, Math.min(100, currentLevel + numericDelta));
        const updatedPartner = { ...freshMember.partnerPokemon, level: newLevel };

        await update(ref(database, `members/${id}/partnerPokemon`), { level: newLevel });

        updates[id] = { ...freshMember, partnerPokemon: updatedPartner };
      }

      setMembers(prev => ({ ...prev, ...updates }));

      const selfUpdate = updates[currentUser?.id];
      if (selfUpdate) {
        updateCurrentUser({ partnerPokemon: selfUpdate.partnerPokemon });
      }

      const sign = numericDelta > 0 ? '+' : '';
      alert(`${targetIds.length}명의 파트너 포켓몬 레벨을 ${sign}${numericDelta} 조정했습니다!`);
    } catch (error) {
      console.error('❌ 파트너 포켓몬 레벨 일괄 조정 실패:', error);
      alert('레벨 조정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 보유 포켓몬 전체 친밀도 일괄 증가 (선택 회원 대상) ==========
  const bulkIncreaseFriendship = async (memberIds, amount) => {
    if (!currentUser?.isAdmin) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert('증가시킬 친밀도 값을 입력해주세요.');
      return;
    }

    const targetIds = (memberIds || []).filter(id => members[id]);
    if (targetIds.length === 0) {
      alert('선택한 회원이 없습니다.');
      return;
    }

    try {
      const updates = {};
      let affectedPokemonCount = 0;
      let alreadyMaxCount = 0;
      let changedCount = 0;

      const increaseOne = (p) => {
        if (!p) return p;
        affectedPokemonCount += 1;
        const before = p.friendship || 0;
        const after = Math.min(255, before + numericAmount);
        if (before >= 255) alreadyMaxCount += 1;
        else if (after !== before) changedCount += 1;
        return { ...p, friendship: after };
      };

      for (const id of targetIds) {
        // 항상 Firebase의 최신 값을 기준으로 다시 읽어서 계산 — 로컬 캐시가 서버와
        // 어긋나 있어도(예: 방금 다른 곳에서 변경된 직후) 증가가 누락되지 않게 한다.
        const memberSnapshot = await get(ref(database, `members/${id}`));
        const latestMember = memberSnapshot.exists() ? memberSnapshot.val() : members[id];
        const latestCaught = normalizeToArray(latestMember?.caughtPokemon);

        const updatedCaught = latestCaught.map(increaseOne);
        const updatedPartner = latestMember?.partnerPokemon
          ? increaseOne(latestMember.partnerPokemon)
          : latestMember?.partnerPokemon;

        const fieldUpdates = { caughtPokemon: updatedCaught };
        if (updatedPartner) fieldUpdates.partnerPokemon = updatedPartner;

        const cleanUpdates = JSON.parse(
          JSON.stringify(fieldUpdates, (key, value) => (value === undefined ? null : value))
        );
        await update(ref(database, `members/${id}`), cleanUpdates);

        const afterMember = { ...members[id], ...latestMember, id, caughtPokemon: updatedCaught, ...(updatedPartner ? { partnerPokemon: updatedPartner } : {}) };
        updates[id] = afterMember;
      }

      setMembers(prev => ({ ...prev, ...updates }));

      const selfUpdate = updates[currentUser?.id];
      if (selfUpdate) {
        updateCurrentUser({
          caughtPokemon: selfUpdate.caughtPokemon,
          ...(selfUpdate.partnerPokemon ? { partnerPokemon: selfUpdate.partnerPokemon } : {})
        });
      }

      const maxNote = alreadyMaxCount > 0 ? `\n(이미 친밀도 255(최대)라 변화 없는 포켓몬 ${alreadyMaxCount}마리 포함)` : '';
      alert(`${targetIds.length}명의 보유 포켓몬(총 ${affectedPokemonCount}마리 중 ${changedCount}마리 실제 증가) 친밀도를 ${numericAmount} 증가시켰습니다!${maxNote}`);
    } catch (error) {
      console.error('❌ 친밀도 일괄 증가 실패:', error);
      alert('친밀도 증가 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // ========== 돈 일괄 지급 (선택 회원 대상) ==========
  const bulkGiveMoney = async (memberIds, amount) => {
    if (!currentUser?.isAdmin) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert('지급할 금액을 입력해주세요.');
      return;
    }

    const targetIds = (memberIds || []).filter(id => members[id]);
    if (targetIds.length === 0) {
      alert('선택한 회원이 없습니다.');
      return;
    }

    // 소지금은 여러 화면/액션에서 동시에 바뀔 수 있는 누적값이라, 클로저 스냅샷 기준
    // "기존값 + 변화량"이 아니라 항상 Firebase의 최신 값을 기준으로 트랜잭션으로 더한다.
    let successCount = 0;
    const failedNames = [];

    for (const id of targetIds) {
      const moneyRef = ref(database, `members/${id}/money`);
      const result = await runTransaction(moneyRef, (currentMoney) => (
        (Number(currentMoney) || 0) + numericAmount
      ));

      if (result.committed) {
        successCount += 1;
        const newMoney = result.snapshot.val();
        setMembers(prev => (
          prev[id] ? { ...prev, [id]: { ...prev[id], money: newMoney } } : prev
        ));
        if (id === currentUser?.id) {
          updateCurrentUser({ money: newMoney });
        }
      } else {
        failedNames.push(members[id]?.name || id);
      }
    }

    if (failedNames.length > 0) {
      alert(`${successCount}명에게 ${numericAmount}원을 지급했습니다.\n실패: ${failedNames.join(', ')}`);
    } else {
      alert(`${successCount}명에게 ${numericAmount}원씩 지급했습니다!`);
    }
  };

  // ========== 산책(탐험) 횟수 일괄 지급 (선택 회원 대상) ==========
  const bulkAddWalks = async (memberIds, amount) => {
    if (!currentUser?.isAdmin) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      alert('지급할 산책 횟수를 입력해주세요.');
      return;
    }

    const targetIds = (memberIds || []).filter(id => members[id]);
    if (targetIds.length === 0) {
      alert('선택한 회원이 없습니다.');
      return;
    }

    // dailyWalks도 여러 화면/액션에서 동시에 바뀔 수 있는 누적값이라, 클로저 스냅샷 기준
    // "기존값 + 변화량"이 아니라 항상 Firebase의 최신 값을 기준으로 트랜잭션으로 더한다.
    let successCount = 0;
    const failedNames = [];

    for (const id of targetIds) {
      const walksRef = ref(database, `members/${id}/dailyWalks`);
      const result = await runTransaction(walksRef, (currentWalks) => (
        Math.max(0, (Number(currentWalks) || 0) + numericAmount)
      ));

      if (result.committed) {
        successCount += 1;
        const newWalks = result.snapshot.val();
        setMembers(prev => (
          prev[id] ? { ...prev, [id]: { ...prev[id], dailyWalks: newWalks } } : prev
        ));
        if (id === currentUser?.id) {
          updateCurrentUser({ dailyWalks: newWalks });
        }
      } else {
        failedNames.push(members[id]?.name || id);
      }
    }

    const sign = numericAmount > 0 ? '+' : '';
    if (failedNames.length > 0) {
      alert(`${successCount}명에게 산책 횟수 ${sign}${numericAmount}를 지급했습니다.\n실패: ${failedNames.join(', ')}`);
    } else {
      alert(`${successCount}명에게 산책 횟수 ${sign}${numericAmount}를 지급했습니다!`);
    }
  };

  // ========== 칭호 일괄 부여 (선택 회원 대상) ==========
  const bulkGrantTitle = async (memberIds, titleId) => {
    if (!currentUser?.isAdmin) return;
    if (!titleId) {
      alert('부여할 칭호를 선택해주세요.');
      return;
    }

    const targetIds = (memberIds || []).filter(id => members[id]);
    if (targetIds.length === 0) {
      alert('선택한 회원이 없습니다.');
      return;
    }

    let grantedCount = 0;
    let alreadyHadCount = 0;

    for (const id of targetIds) {
      const assigned = Array.isArray(members[id]?.assignedTitles) ? members[id].assignedTitles : [];
      if (assigned.includes(titleId)) {
        alreadyHadCount += 1;
        continue;
      }
      await grantMemberTitle(id, titleId);
      grantedCount += 1;
    }

    const alreadyNote = alreadyHadCount > 0 ? `\n(이미 보유 중이라 제외된 회원 ${alreadyHadCount}명 포함)` : '';
    alert(`${grantedCount}명에게 칭호를 부여했습니다!${alreadyNote}`);
  };

  // ========== 포켓몬 지급 ==========
  const givePokemonToMember = async (memberId, pokemonTemplate, options = {}) => {
    if (!currentUser?.isAdmin) return;

    // 로컬 스냅샷이 아니라 최신 값을 기준으로 계산 - 그래야 그 사이 본인이 직접 잡거나
    // 파티를 바꾼 내역을 관리자의 지급 액션이 덮어써서 날리지 않는다.
    const member = await fetchFreshMember(memberId);
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
      caughtLocation = null,
    } = options;

    // 파트너가 아닌 경우에만 포획 제한 체크
    if (!isPartner) {
      const nonPartnerCount = member.caughtPokemon.filter(p => p && !p.isPartner).length;
      const maxNonPartnerPokemon = (Number(systemSettings.maxNonPartnerPokemon) || 18) + (Number(member.bonusPokemonSlots) || 0);
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
      (ballInfo ? `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/${ballInfo.nameEn}.png` : 
      'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png');
      
    const spriteUrl = isShiny && pokemonTemplate.shinySprite
      ? pokemonTemplate.shinySprite
      : pokemonTemplate.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonTemplate.number}.png`;

    const iconUrl = isShiny && pokemonTemplate.shinySprite
      ? pokemonTemplate.shinySprite
      : (() => { const orig = pokemonTemplate.originalNumber; const n = (orig === 710 || orig === 711) ? orig : pokemonTemplate.number; return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })();

    // 기본값 설정
    const finalGender = normalizePokemonGender(gender, pokemonTemplate);
    
    const finalAbility = ability || (pokemonTemplate.abilitiesEn && pokemonTemplate.abilitiesEn.length > 0 ?
      (getAbilityKoreanName(pokemonTemplate.abilitiesEn[0]) || pokemonTemplate.abilitiesEn[0]) : '없음');
    const finalAbilityEn = getAbilityEnglishName(finalAbility) || pokemonTemplate.abilitiesEn?.[0] || null;
    const isHiddenAbility = Boolean(pokemonTemplate.hiddenAbilityEn && finalAbilityEn === pokemonTemplate.hiddenAbilityEn);
    
    const baseHeight = pokemonTemplate.height || 10;
    const baseWeight = pokemonTemplate.weight || 100;
    
    const finalHeight = height || (baseHeight * (heightVariation / 100));
    const finalWeight = weight || (baseWeight * (weightVariation / 100));

    const newPokemon = withWurmpleEvolutionId({
      uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // 만난 장소를 직접 입력한 경우, "특별한 만남"이 아니라 실제 그 장소에서 만난 것으로 기록한다.
      isAdminGiven: !caughtLocation,
      caughtLocation: caughtLocation || null,
      favoriteFlavor,
      pokemonId: pokemonTemplate.id,
      name: getPokemonDisplayParts(pokemonTemplate).name || pokemonTemplate.name,
      nameEn: pokemonTemplate.nameEn,
      nickname,
      number: pokemonTemplate.number,
      originalNumber: pokemonTemplate.originalNumber || pokemonTemplate.number,
      regionalForm: pokemonTemplate.regionalForm || null,
      formVariant: pokemonTemplate.formVariant || null,
      type: pokemonTemplate.type,
      type2: pokemonTemplate.type2 || null,
      ...getBaseStatPatch(pokemonTemplate),
      level,
      caughtLevel: level, // 지급받은 순간의 레벨을 고정 저장
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
      isHiddenAbility,
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
    });

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

    // Firebase 저장 - caughtPokemon(+ 바뀐 경우 partnerPokemon)만 update()로 건드린다.
    // 예전엔 로컬 스냅샷 전체를 set()으로 덮어써서, 그 사이 본인이 바꾼 다른 필드(돈/산책
    // 횟수/인벤토리 등)가 통째로 사라질 수 있었다.
    try {
      const fieldUpdates = { caughtPokemon: updatedPokemonList };
      if (newPartnerPokemon !== undefined && newPartnerPokemon !== null) {
        fieldUpdates.partnerPokemon = newPartnerPokemon;
      }

      const cleanUpdates = JSON.parse(
        JSON.stringify(fieldUpdates, (key, value) =>
          value === undefined ? null : value
        )
      );

      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, cleanUpdates);

      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], ...fieldUpdates }
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

    // 로컬 스냅샷이 아니라 최신 값을 기준으로 계산 - 두 회원 모두 그 사이 직접 플레이해서
    // 바뀐 내역이 있을 수 있으니 이전 액션이 그걸 덮어쓰지 않게 한다.
    const [fromMember, toMember] = await Promise.all([
      fetchFreshMember(fromMemberId),
      fetchFreshMember(toMemberId)
    ]);

    if (!fromMember || !toMember) {
      alert('멤버 정보를 찾을 수 없습니다.');
      return false;
    }

    const transferEgg = Boolean(transferTarget.transferEgg);
    const pokemonUniqueId = transferTarget.pokemonUniqueId;

    try {
      let updatedFromMember = { ...fromMember };
      let updatedToMember = { ...toMember };
      let fromFieldUpdates = {};
      let toFieldUpdates = {};
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

        fromFieldUpdates = { egg: null };
        toFieldUpdates = { egg: movedEgg };
        updatedFromMember = { ...fromMember, ...fromFieldUpdates };
        updatedToMember = { ...toMember, ...toFieldUpdates };
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
        const maxNonPartnerPokemon = (Number(systemSettings.maxNonPartnerPokemon) || 18) + (Number(toMember.bonusPokemonSlots) || 0);
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

        fromFieldUpdates = { caughtPokemon: updatedSourcePokemon };
        toFieldUpdates = { caughtPokemon: placement.caughtPokemon };
        updatedFromMember = { ...fromMember, ...fromFieldUpdates };
        updatedToMember = { ...toMember, ...toFieldUpdates };
        transferredName = movedPokemon.nickname || movedPokemon.name || '포켓몬';
      }

      // 바뀐 필드만 update()로 건드린다 - 두 회원 모두 로컬 스냅샷 전체를 set()으로
      // 덮어쓰면 그 사이 각자 직접 플레이해서 바뀐 다른 필드가 사라질 수 있었다.
      const cleanForUpdate = (fieldUpdates) => JSON.parse(JSON.stringify(fieldUpdates, (key, value) => (
        value === undefined ? null : value
      )));

      await update(ref(database, `members/${fromMemberId}`), cleanForUpdate(fromFieldUpdates));
      await update(ref(database, `members/${toMemberId}`), cleanForUpdate(toFieldUpdates));

      setMembers(prev => ({
        ...prev,
        [fromMemberId]: { ...prev[fromMemberId], ...fromFieldUpdates },
        [toMemberId]: { ...prev[toMemberId], ...toFieldUpdates }
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

    // 로컬 스냅샷이 아니라 최신 값을 기준으로 계산한다.
    const member = await fetchFreshMember(memberId);
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

    const fieldUpdates = {
      caughtPokemon: updatedPokemon,
      partnerPokemon: updatedPartnerPokemon
    };

    try {
      const cleanUpdates = JSON.parse(
        JSON.stringify(fieldUpdates, (key, value) => value === undefined ? null : value)
      );
      const memberRef = ref(database, `members/${memberId}`);
      // caughtPokemon/partnerPokemon 2개 필드만 update() - 예전엔 set()으로 전체를
      // 덮어써서 그 사이 바뀐 다른 필드(돈/산책 등)가 사라질 수 있었다.
      await update(memberRef, cleanUpdates);

      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], ...fieldUpdates }
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
    
    // 로컬 스냅샷이 아니라 최신 값을 기준으로 계산한다.
    const member = await fetchFreshMember(memberId);
    if (!member) {
      console.error('멤버를 찾을 수 없습니다:', memberId);
      return;
    }

    console.log('포켓몬 수정 시작:', { memberId, pokemonUniqueId, updates });

    const safeValue = (newValue, oldValue) => {
      return newValue !== undefined ? newValue : oldValue;
    };

    let updatedPokemon = (member.caughtPokemon || []).map(p => {
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
          isPartner: safeValue(updates.isPartner, p.isPartner || false),
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
          alcremieFlavor: safeValue(updates.alcremieFlavor, p.alcremieFlavor),
          alcremieShape: safeValue(updates.alcremieShape, p.alcremieShape),
          // NPC 엔트리 전용: 오리진/비욘드 분류 (미지정이면 null - 기존처럼 구분 없이 노출)
          entryGroup: safeValue(updates.entryGroup, p.entryGroup || null),
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

    const wasPartner = member.partnerPokemon?.uniqueId === pokemonUniqueId;

    const mergedPartnerPokemon = wasPartner
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

    // 파트너 체크를 해제한 경우: partnerPokemon 필드에 그대로 남아있으면(내부 isPartner만
    // false로 바뀔 뿐) getPartner()가 여전히 이 필드를 파트너로 읽어버려서 "파트너 없음"
    // 설정이 반영되지 않는다. 필드를 비우고, 포켓몬 자체는 잃지 않도록 엔트리/박스로
    // 되돌려준다(기존 파트너 교체 시의 강등 로직과 동일한 방식).
    const isUnsettingPartner = wasPartner && updates.isPartner === false;

    const updatedPartnerPokemon = isUnsettingPartner ? null : mergedPartnerPokemon;

    if (isUnsettingPartner) {
      const demoted = { ...mergedPartnerPokemon, isPartner: false };
      const party = updatedPokemon.slice(0, 6);
      const box = updatedPokemon.slice(6);
      const emptySlotIndex = party.findIndex(p => !p);
      updatedPokemon = emptySlotIndex !== -1
        ? (() => { party[emptySlotIndex] = demoted; return [...party, ...box]; })()
        : [...party, ...box, demoted];
    }

    const fieldUpdates = {
      caughtPokemon: updatedPokemon,
      partnerPokemon: updatedPartnerPokemon
    };

    try {
      const cleanUpdates = JSON.parse(
        JSON.stringify(fieldUpdates, (key, value) =>
          value === undefined ? null : value
        )
      );

      const memberRef = ref(database, `members/${memberId}`);
      // caughtPokemon/partnerPokemon 2개 필드만 update() - set() 전체 덮어쓰기였을 때는
      // 그 사이 바뀐 다른 필드(돈/산책 등)가 사라질 수 있었다.
      await update(memberRef, cleanUpdates);

      console.log('Firebase 저장 완료');

      setMembers(prev => {
        const newMembers = {
          ...prev,
          [memberId]: { ...prev[memberId], ...fieldUpdates }
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

    // 로컬 스냅샷이 아니라 최신 값을 기준으로 계산한다.
    const member = await fetchFreshMember(memberId);
    if (!member?.egg) {
      alert('부화할 알이 없습니다.');
      return false;
    }

    try {
      const hatchedPokemon = createPokemonFromEgg(member.egg);
      const placement = addPokemonToAvailableSlot(member.caughtPokemon || [], hatchedPokemon);
      const fieldUpdates = {
        caughtPokemon: placement.caughtPokemon,
        egg: null
      };

      // caughtPokemon/egg 2개 필드만 update() - set() 전체 덮어쓰기였을 때는 그 사이
      // 바뀐 다른 필드(돈/산책 등)가 사라질 수 있었다.
      await update(ref(database, `members/${memberId}`), JSON.parse(JSON.stringify(fieldUpdates, (key, value) => (
        value === undefined ? null : value
      ))));

      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], ...fieldUpdates }
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

  // ========== 회원 탐험 횟수 업데이트 ==========
  const updateMemberWalkCount = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;
    const nextWalkCount = Math.max(0, Number(amount) || 0);

    const updatedMember = {
      ...member,
      dailyWalks: nextWalkCount
    };

    // 자기 자신의 탐험 횟수를 수정할 때는 updateCurrentUser를 통해 currentUser 상태도 동기화
    if (memberId === currentUser.id) {
      await updateCurrentUser({ dailyWalks: nextWalkCount });
      return;
    }

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { dailyWalks: nextWalkCount });

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 탐험 횟수 업데이트 실패:', error);
    }
  };

  // ========== 회원 최대 탐험 횟수 업데이트 ==========
  const updateMemberMaxWalkCount = async (memberId, amount) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;
    const nextMaxWalkCount = Math.max(1, Number(amount) || 1);

    const updatedMember = {
      ...member,
      maxDailyWalks: nextMaxWalkCount
    };

    // 자기 자신의 최대 탐험 횟수를 수정할 때는 updateCurrentUser를 통해 currentUser 상태도 동기화
    if (memberId === currentUser.id) {
      await updateCurrentUser({ maxDailyWalks: nextMaxWalkCount });
      return;
    }

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { maxDailyWalks: nextMaxWalkCount });

      setMembers(prev => ({
        ...prev,
        [memberId]: updatedMember
      }));
    } catch (error) {
      console.error('❌ 최대 탐험 횟수 업데이트 실패:', error);
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
    // assignedTitles도 여러 액션에서 동시에 바뀔 수 있는 배열이라, 클로저 스냅샷이 아니라
    // 최신 값을 다시 읽어서 append한다.
    const member = await fetchFreshMember(memberId) || members[memberId];
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
    const member = await fetchFreshMember(memberId) || members[memberId];
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

  // ========== 비밀번호 강제 재설정 (본인 인증 없이) ==========
  const resetMemberPassword = async (memberId, newPassword) => {
    if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin) return false;

    const member = members[memberId];
    if (!member) {
      alert('대상 회원을 찾을 수 없습니다.');
      return false;
    }

    try {
      const call = httpsCallable(functions, 'adminResetPassword');
      await call({ targetUid: memberId, newPassword });

      const isTemporaryPassword = newPassword === '0000';
      setMembers(prev => ({
        ...prev,
        [memberId]: {
          ...prev[memberId],
          password: isTemporaryPassword ? '0000' : null,
          forcePasswordChange: isTemporaryPassword,
        }
      }));

      alert(`${member.name}님의 비밀번호를 재설정했습니다.`);
      return true;
    } catch (error) {
      console.error('❌ 비밀번호 재설정 실패:', error);
      const detailMessage = error?.details?.message || error?.details?.code || error?.message;
      alert(detailMessage && detailMessage !== 'internal'
        ? detailMessage
        : '비밀번호 재설정 중 오류가 발생했습니다. Firebase Auth 계정 연결 상태를 확인해주세요.');
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
    const fieldUpdates = { isNPC: !member.isNPC };
    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, fieldUpdates);
      setMembers(prev => ({ ...prev, [memberId]: { ...prev[memberId], ...fieldUpdates } }));
    } catch (error) {
      console.error('❌ NPC 토글 실패:', error);
    }
  };

  // ========== 멤버 숨기기 토글 ==========
  const toggleMemberHidden = async (memberId) => {
    if (!currentUser?.isAdmin) return;

    const member = members[memberId];
    if (!member) return;

    const nextHidden = !member.hidden;
    const updatedMember = { ...member, hidden: nextHidden };

    try {
      const memberRef = ref(database, `members/${memberId}`);
      await update(memberRef, { hidden: nextHidden });

      setMembers(prev => ({ ...prev, [memberId]: updatedMember }));
      if (currentUser?.id === memberId) {
        updateCurrentUser?.({ hidden: nextHidden });
      }
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
      ...(settings.npcShowPartyDetails !== undefined ? { npcShowPartyDetails: !!settings.npcShowPartyDetails } : {}),
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

  const updateMemberTrainerId = async (memberId, trainerId) => {
    if (!currentUser?.isAdmin) return false;

    const member = members[memberId];
    if (!member) return false;

    const nextTrainerId = String(trainerId || '').trim();
    if (!nextTrainerId) {
      alert('트레이너 ID를 입력해주세요.');
      return false;
    }

    const duplicateMember = Object.entries(members || {}).find(([id, data]) => (
      id !== memberId && String(data?.trainerId || '').trim() === nextTrainerId
    ));
    if (duplicateMember) {
      alert('이미 사용 중인 트레이너 ID입니다.');
      return false;
    }

    try {
      await update(ref(database, `members/${memberId}`), { trainerId: nextTrainerId });
      setMembers(prev => ({
        ...prev,
        [memberId]: { ...prev[memberId], trainerId: nextTrainerId }
      }));
      if (currentUser?.id === memberId) {
        updateCurrentUser({ trainerId: nextTrainerId });
      }
      return true;
    } catch (error) {
      console.error('트레이너 ID 업데이트 실패:', error);
      alert(`트레이너 ID 업데이트에 실패했습니다.\n${error.message || error}`);
      return false;
    }
  };

  return {
    addMember,
    toggleAdminStatus,
    toggleItemManagement,
    toggleMemberHidden,
    toggleMemberNPC,
    updateMemberNpcSettings,
    updateMemberTrainerId,
    updateMaxDailyWalks,
    resetMemberWalkCount,
    resetAllWalkCounts,
    resetAllCramorantBeak,
    bulkAdjustPartnerLevel,
    bulkIncreaseFriendship,
    bulkGiveMoney,
    bulkAddWalks,
    bulkGrantTitle,
    givePokemonToMember,
    transferMemberPokemon,
    deleteMemberPokemon,
    hatchMemberEgg,
    editMemberPokemon,
    addPokemonToSelf,
    updateMemberMoney,
    updateMemberTrainerExp,
    updateMemberWalkCount,
    updateMemberMaxWalkCount,
    updateMemberTitle,
    grantMemberTitle,
    revokeMemberTitle,
    deleteMember,
    resetMemberPassword,
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
