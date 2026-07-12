import campingData from '../data/camping.json';
import { DEFAULT_IVS } from './pokemonIndividualValues';
import { getPokemonDisplayParts } from './pokemonDisplayName';
import { getAbilityKoreanName } from './abilityUtils';

/**
 * 알 획득 가능 여부 체크 (2인 캠핑 전용)
 */
export function canGetEgg(member1Pokemon, member2Pokemon, allPokemonMaster) {
  if (!member1Pokemon || member1Pokemon.length === 0) {
    return { canGet: false, reason: '회원1의 포켓몬이 없습니다' };
  }
  if (!member2Pokemon || member2Pokemon.length === 0) {
    return { canGet: false, reason: '회원2의 포켓몬이 없습니다' };
  }

  const findData = (pokemon) =>
    allPokemonMaster.find(p =>
      p.number === pokemon.number ||
      p.number === pokemon.originalNumber ||
      p.originalNumber === pokemon.number
    );

  const validMatches = [];

  for (const p1 of member1Pokemon.filter(p => p)) {
    for (const p2 of member2Pokemon.filter(p => p)) {
      const p1Data = findData(p1);
      const p2Data = findData(p2);
      if (!p1Data?.eggGroups || !p2Data?.eggGroups) continue;

      const matchedGroups = p1Data.eggGroups.filter(g => p2Data.eggGroups.includes(g));
      if (!matchedGroups.length) continue;

      const p1Gender = String(p1.gender || '').toLowerCase();
      const p2Gender = String(p2.gender || '').toLowerCase();

      let mother = null, father = null;
      if (p1Gender === 'female' && p2Gender === 'male') {
        mother = p1; father = p2;
      } else if (p1Gender === 'male' && p2Gender === 'female') {
        mother = p2; father = p1;
      } else {
        continue;
      }

      const hasHighFriendship =
        (p1.friendship >= campingData.campingConfig.minFriendshipForBonus) ||
        (p2.friendship >= campingData.campingConfig.minFriendshipForBonus);

      const eggChance = hasHighFriendship
        ? campingData.campingConfig.eggChanceWithFriendship
        : campingData.campingConfig.eggChanceBase;

      validMatches.push({ pokemon1: mother, pokemon2: father, matchedGroups, eggChance });
    }
  }

  if (validMatches.length === 0) {
    return { canGet: false, reason: '알 그룹이 일치하는 포켓몬이 없습니다' };
  }

  const bestMatch = validMatches[Math.floor(Math.random() * validMatches.length)];
  const success = Math.random() < bestMatch.eggChance;

  return {
    canGet: success,
    reason: success ? '알 획득 성공!' : '알을 얻지 못했습니다',
    chance: bestMatch.eggChance,
    parents: {
      pokemon1: bestMatch.pokemon1,
      pokemon2: bestMatch.pokemon2,
      eggGroups: bestMatch.matchedGroups
    }
  };
}

/**
 * 알 생성
 */
export function createEgg(parent1, parent2, allPokemonMaster, trainer1Name, trainer2Name) {
  const mother = parent1;
  const motherData = allPokemonMaster.find(p => p.number === mother.number);

  if (!motherData) {
    console.error('어미 포켓몬 데이터를 찾을 수 없습니다');
    return null;
  }

  const eggGroup = motherData.eggGroups?.[0] || 'field';
  const hatchSteps = campingData.campingConfig.eggHatchStepsByGroup[eggGroup] || 5000;

  return {
    eggId: `egg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    species: motherData.name,
    speciesNumber: motherData.number,
    speciesOriginalNumber: motherData.originalNumber || motherData.displayNumber || motherData.number,
    motherSpeciesNumber: motherData.number,
    motherOriginalNumber: motherData.originalNumber || motherData.displayNumber || motherData.number,
    motherRegionalForm: motherData.regionalForm || null,
    motherFormVariant: motherData.formVariant || null,
    parent1Name: parent1.name || parent1.nickname,
    parent2Name: parent2.name || parent2.nickname,
    parent1TrainerName: trainer1Name || null,
    parent2TrainerName: trainer2Name || null,
    parent1Ball: {
      caughtWithBall: parent1.caughtWithBall || '몬스터볼',
      ballImageUrl: parent1.ballImageUrl || null
    },
    parent2Ball: {
      caughtWithBall: parent2.caughtWithBall || '몬스터볼',
      ballImageUrl: parent2.ballImageUrl || null
    },
    parentBalls: [
      { caughtWithBall: parent1.caughtWithBall || '몬스터볼', ballImageUrl: parent1.ballImageUrl || null },
      { caughtWithBall: parent2.caughtWithBall || '몬스터볼', ballImageUrl: parent2.ballImageUrl || null }
    ],
    eggGroups: motherData.eggGroups,
    hatchSteps,
    stepsRemaining: hatchSteps,
    hatchProgress: 0,
    receivedDate: new Date().toISOString(),
    imageUrl: 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/egg.png',
    parentMoves: [...(parent1.moves || []), ...(parent2.moves || [])].filter(Boolean),
    parentHeldItems: [parent1.heldItem || null, parent2.heldItem || null],
    parent1Number: parent1.number || null,
    parent2Number: parent2.number || null,
    parent1FavoriteFlavor: parent1.favoriteFlavor || null,
    parent2FavoriteFlavor: parent2.favoriteFlavor || null,
    parent1Nature: parent1.nature || null,
    parent2Nature: parent2.nature || null,
  };
}

/**
 * 알에서 포켓몬 부화
 */
export function hatchEgg(egg, allPokemonMaster, allMoves, movesData) {
  const pokemonData = allPokemonMaster.find(p => p.number === egg.speciesNumber);

  if (!pokemonData) {
    console.error('포켓몬 데이터를 찾을 수 없습니다');
    return null;
  }

  const EVERSTONE = ['변함없는돌', 'everstone'];
  const DESTINY_KNOT = ['빨간실', 'destiny-knot'];
  const MIRROR_HERB = ['흉내허브', 'mirror-herb'];
  const LIGHT_BALL = ['전기구슬', 'light-ball'];
  const matchItem = (item, list) => item && list.some(id => String(item).toLowerCase() === id.toLowerCase());

  const parentHeldItems = egg.parentHeldItems || [null, null];
  const everstoneIndex = parentHeldItems.findIndex(i => matchItem(i, EVERSTONE));
  const hasDestinyKnot = parentHeldItems.some(i => matchItem(i, DESTINY_KNOT));
  const mirrorHerbHolder = parentHeldItems.findIndex(i => matchItem(i, MIRROR_HERB));

  const inheritedFlavor = everstoneIndex >= 0
    ? (everstoneIndex === 0 ? egg.parent1FavoriteFlavor : egg.parent2FavoriteFlavor) || null
    : null;
  const inheritedNature = everstoneIndex >= 0
    ? (everstoneIndex === 0 ? egg.parent1Nature : egg.parent2Nature) || null
    : null;

  const startingFriendship = hasDestinyKnot ? 150 : 120;

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
        const move = allMoves.find(m => m.id === moveId);
        return move ? { moveId: move.id, currentPp: move.pp, learnedAt: 1 } : null;
      })
      .filter(Boolean);
    return [...baseMoves, ...extra];
  };

  const getStartingMoves = (pokemonNumber) => {
    const learnset = movesData.pokemonLearnsets?.[pokemonNumber];
    if (!learnset) return [];
    const levelUpMoves = learnset.levelUpMoves || (Array.isArray(learnset) ? learnset : []);
    return levelUpMoves
      .filter(entry => Number(entry.level || 0) <= 1)
      .sort((a, b) => Number(b.level || 0) - Number(a.level || 0))
      .slice(0, 4)
      .map(entry => {
        const moveData = allMoves.find(m => m.id === entry.moveId);
        return moveData ? { moveId: moveData.id, currentPp: moveData.pp, learnedAt: 1 } : null;
      })
      .filter(Boolean);
  };

  const getInheritedEggMoves = (pokemonNumber, parentMoves) => {
    const learnset = movesData.pokemonLearnsets?.[pokemonNumber];
    if (!learnset) return [];
    const babyEggMoveIds = new Set(learnset.eggMoves || []);
    if (babyEggMoveIds.size === 0) return [];
    const parentMoveIds = new Set((parentMoves || []).map(m => m.moveId).filter(Boolean));
    return [...babyEggMoveIds]
      .filter(moveId => parentMoveIds.has(moveId))
      .map(moveId => {
        const moveData = allMoves.find(m => m.id === moveId);
        return moveData ? { moveId: moveData.id, currentPp: moveData.pp, learnedAt: 1 } : null;
      })
      .filter(Boolean);
  };

  const expandedParentMoves = getExpandedParentMoves(egg.parentMoves || []);
  const inherited = getInheritedEggMoves(pokemonData.number, expandedParentMoves);
  const starting = getStartingMoves(pokemonData.number);
  const usedIds = new Set(inherited.map(m => m.moveId));
  let moves = [...inherited, ...starting.filter(m => !usedIds.has(m.moveId))].slice(0, 4);

  if (pokemonData.number === 172 && parentHeldItems.some(i => matchItem(i, LIGHT_BALL))) {
    const voltTackle = allMoves.find(m => m.id === 'volt-tackle');
    if (voltTackle && !moves.find(m => m.moveId === 'volt-tackle')) {
      moves = [{ moveId: voltTackle.id, currentPp: voltTackle.pp, learnedAt: 1 }, ...moves].slice(0, 4);
    }
  }

  return {
    uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pokemonId: pokemonData.id,
    name: getPokemonDisplayParts(pokemonData).name || pokemonData.name,
    nameEn: pokemonData.nameEn,
    number: pokemonData.number,
    type: pokemonData.type,
    type2: pokemonData.type2 || null,
    level: 1,
    caughtLevel: 1, // 알에서 부화한 순간의 레벨을 고정 저장
    hp: pokemonData.baseHp,
    maxHp: pokemonData.baseHp,
    exp: 0,
    friendship: startingFriendship,
    ivs: { ...DEFAULT_IVS },
    ...(inheritedNature ? { nature: inheritedNature } : {}),
    ...(inheritedFlavor ? { favoriteFlavor: inheritedFlavor } : {}),
    heldItem: null,
    moves,
    caughtWithBall: '알',
    ballImageUrl: 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/egg.png',
    isPartner: false,
    isShiny: Math.random() < 0.001,
    gender: Math.random() < 0.5 ? 'male' : 'female',
    height: pokemonData.height || 10,
    weight: pokemonData.weight || 100,
    sizeRank: (() => {
      const ranks = ['XXXS', 'XXS', 'XS', 'S', 'M', 'M', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      return ranks[Math.floor(Math.random() * ranks.length)];
    })(),
    ability: (() => {
      const abilitiesEn = pokemonData.abilitiesEn || [];
      if (!abilitiesEn.length) return '없음';
      const selectedAbilityEn = abilitiesEn[Math.floor(Math.random() * abilitiesEn.length)];
      return getAbilityKoreanName(selectedAbilityEn) || selectedAbilityEn;
    })(),
    isHiddenAbility: false,
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    imageUrl: pokemonData.imageUrl,
    iconUrl: (() => { const orig = pokemonData.originalNumber; const n = (orig === 710 || orig === 711) ? orig : pokemonData.number; return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })(),
    spriteUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonData.number}.png`,
    isFromEgg: true,
    parents: {
      parent1: egg.parent1Name,
      parent2: egg.parent2Name,
      trainer1: egg.parent1TrainerName || null,
      trainer2: egg.parent2TrainerName || null,
    }
  };
}

/**
 * 요리 결과 생성
 */
export function generateCookingResult(stage, isDuo) {
  const stageData = campingData.cookingStages[stage - 1];
  if (!stageData) return null;
  const successRate = Math.min(1.0, stageData.successRate + (isDuo ? campingData.campingConfig.duoSuccessBonus : 0));
  const success = Math.random() < successRate;
  return { success, stage, stageData, successRate: Math.round(successRate * 100), isDuo };
}

/**
 * 보너스 아이템 추첨
 */
export function rollBonusItem(allItems) {
  const totalWeight = campingData.bonusItems.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * totalWeight;
  let currentWeight = 0;
  for (const bonusItem of campingData.bonusItems) {
    currentWeight += bonusItem.weight;
    if (roll <= currentWeight) {
      return allItems.find(i => i.id === bonusItem.itemId) || null;
    }
  }
  return null;
}

/**
 * 캠핑 가능 여부 체크
 */
export function canCampToday(lastCampingDate) {
  if (!lastCampingDate) return true;
  const diffTime = new Date() - new Date(lastCampingDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) >= 7;
}

/**
 * 오늘이 캠핑 가능한 요일인지 확인
 */
export function isCampingDay() {
  const dayName = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][new Date().getDay()];
  return campingData.campingConfig.allowedDays.includes(dayName);
}

/**
 * 다음 캠핑 가능 날짜 계산
 */
export function getNextCampingDate(lastCampingDate) {
  if (!lastCampingDate) return new Date();
  const nextDate = new Date(lastCampingDate);
  nextDate.setDate(nextDate.getDate() + 7);
  return nextDate;
}

/**
 * 캠핑 세션 데이터 생성
 */
export function createCampingSession(memberId, memberName, entryPokemon, partnerId = null, partnerName = null, dishChoice = null) {
  return {
    id: `camping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    memberId,
    memberName,
    partnerId: partnerId || '',
    partnerName: partnerName || '',
    campingDishType: dishChoice?.type || '',
    campingDishLabel: dishChoice?.label || '',
    campingDish: dishChoice || null,
    entryPokemon: entryPokemon
      .filter(p => p !== null && p !== undefined)
      .map(p => ({
        number: p.number || 0,
        name: p.name || '알 수 없음',
        pokemonId: p.id || p.uniqueId || `${p.number}_${Date.now()}`
      })),
    isDuo: !!partnerId,
    status: 'pending',
    currentStage: 0,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };
}
