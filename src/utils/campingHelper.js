import campingData from '../data/camping.json';

/**
 * 알 그룹 확인
 */
export function checkEggGroupMatch(pokemon1, pokemon2, allPokemonMaster) {
  if (!pokemon1 || !pokemon2) return { match: false, groups: [] };
  
  const findData = (pokemon) =>
    allPokemonMaster.find(p =>
      p.number === pokemon.number ||
      p.number === pokemon.originalNumber ||
      p.originalNumber === pokemon.number
    );
  const p1Data = findData(pokemon1);
  const p2Data = findData(pokemon2);
  
  if (!p1Data || !p2Data) return { match: false, groups: [] };
  if (!p1Data.eggGroups || !p2Data.eggGroups) return { match: false, groups: [] };
  
  const matchedGroups = p1Data.eggGroups.filter(group => 
    p2Data.eggGroups.includes(group)
  );
  
  return {
    match: matchedGroups.length > 0,
    groups: matchedGroups,
    pokemon1: p1Data,
    pokemon2: p2Data
  };
}

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

  // 모든 엔트리 포켓몬 조합 수집
  const validMatches = [];

  for (const p1 of member1Pokemon.filter(p => p)) {
    for (const p2 of member2Pokemon.filter(p => p)) {
      const matchResult = checkEggGroupMatch(p1, p2, allPokemonMaster);

      if (matchResult.match) {
        const p1Gender = String(p1.gender || '').toLowerCase();
        const p2Gender = String(p2.gender || '').toLowerCase();

        // 수컷+암컷 조합만 유효 (어미=암컷, 아비=수컷)
        let mother = null, father = null;
        if (p1Gender === 'female' && p2Gender === 'male') {
          mother = p1; father = p2;
        } else if (p1Gender === 'male' && p2Gender === 'female') {
          mother = p2; father = p1;
        } else {
          continue; // 둘 다 암컷/수컷/무성별이면 스킵
        }

        const hasHighFriendship =
          (p1.friendship >= campingData.campingConfig.minFriendshipForBonus) ||
          (p2.friendship >= campingData.campingConfig.minFriendshipForBonus);

        const eggChance = hasHighFriendship
          ? campingData.campingConfig.eggChanceWithFriendship
          : campingData.campingConfig.eggChanceBase;

        validMatches.push({ pokemon1: mother, pokemon2: father, matchResult, eggChance, hasHighFriendship });
      }
    }
  }

  if (validMatches.length === 0) {
    return { canGet: false, reason: '알 그룹이 일치하는 포켓몬이 없습니다' };
  }

  // 랜덤으로 하나 선택
  const bestMatch = validMatches[Math.floor(Math.random() * validMatches.length)];

  const success = Math.random() < bestMatch.eggChance;
  
  return { 
    canGet: success, 
    reason: success ? '알 획득 성공!' : '알을 얻지 못했습니다',
    chance: bestMatch.eggChance,
    parents: {
      pokemon1: bestMatch.pokemon1,
      pokemon2: bestMatch.pokemon2,
      eggGroups: bestMatch.matchResult.groups
    }
  };
}

/**
 * 알 생성
 */
export function createEgg(parent1, parent2, allPokemonMaster, trainer1Name, trainer2Name) {
  // canGetEgg에서 parent1=어미, parent2=아비로 정리해서 전달
  const mother = parent1;
  const motherData = allPokemonMaster.find(p => p.number === mother.number);
  
  if (!motherData) {
    console.error('어미 포켓몬 데이터를 찾을 수 없습니다');
    return null;
  }

  // 알 그룹에 따른 부화 걸음 수
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
      {
        caughtWithBall: parent1.caughtWithBall || '몬스터볼',
        ballImageUrl: parent1.ballImageUrl || null
      },
      {
        caughtWithBall: parent2.caughtWithBall || '몬스터볼',
        ballImageUrl: parent2.ballImageUrl || null
      }
    ],
    eggGroups: motherData.eggGroups,
    hatchSteps: hatchSteps,
    stepsRemaining: hatchSteps,
    hatchProgress: 0,
    receivedDate: new Date().toISOString(),
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/egg.png'
  };
}

/**
 * 알 부화 진행
 */
export function updateEggProgress(egg, steps) {
  const newStepsRemaining = Math.max(0, egg.stepsRemaining - steps);
  const progress = Math.min(100, ((egg.hatchSteps - newStepsRemaining) / egg.hatchSteps) * 100);
  
  return {
    ...egg,
    stepsRemaining: newStepsRemaining,
    hatchProgress: Math.round(progress),
    isReadyToHatch: newStepsRemaining === 0
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

  // 기본 기술 설정 (레벨 1 기준)
  const getStartingMoves = (pokemonNumber, level, movesData) => {
    const learnset = movesData.pokemonLearnsets?.[pokemonNumber];
    if (!learnset) return [];

    return learnset
      .filter(entry => entry.level <= level)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4)
      .map(entry => {
        const moveData = allMoves.find(m => m.id === entry.moveId);
        return moveData ? {
          id: moveData.id,
          name: moveData.name,
          type: moveData.type,
          category: moveData.category,
          power: moveData.power,
          accuracy: moveData.accuracy,
          pp: moveData.pp,
          maxPp: moveData.pp
        } : null;
      })
      .filter(m => m !== null);
  };

  const hatchedPokemon = {
    uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pokemonId: pokemonData.id,
    name: pokemonData.name,
    nameEn: pokemonData.nameEn,
    number: pokemonData.number,
    type: pokemonData.type,
    type2: pokemonData.type2 || null,
    level: 1,
    hp: pokemonData.baseHp,
    maxHp: pokemonData.baseHp,
    exp: 0,
    friendship: 120,
    heldItem: null,
    moves: getStartingMoves(pokemonData.number, 1, movesData),
    caughtWithBall: '알',
    ballImageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/egg.png',
    isPartner: false,
    isShiny: Math.random() < 0.001,
    gender: Math.random() < 0.5 ? 'male' : 'female',
    height: pokemonData.height || 10,
    weight: pokemonData.weight || 100,
    sizeRank: (() => {
      const ranks = ['XXXS','XXS','XS','M','M','M','M','XL','XXL','XXXL'];
      return ranks[Math.floor(Math.random() * ranks.length)];
    })(),
    ability: pokemonData.abilities?.[0] || '없음',
    isHiddenAbility: false,
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    imageUrl: pokemonData.imageUrl,
    iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonData.number}.png`,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.number}.png`,
    isFromEgg: true,
    parents: {
      parent1: egg.parent1Name,
      parent2: egg.parent2Name,
      trainer1: egg.parent1TrainerName || null,
      trainer2: egg.parent2TrainerName || null,
    }
  };

  return hatchedPokemon;
}

/**
 * 요리 성공률 계산
 */
export function calculateCookingSuccess(stage, isDuo) {
  const stageData = campingData.cookingStages[stage - 1];
  if (!stageData) return 0;
  
  let successRate = stageData.successRate;
  
  if (isDuo) {
    successRate += campingData.campingConfig.duoSuccessBonus;
  }
  
  return Math.min(1.0, successRate);
}

/**
 * 요리 결과 생성
 */
export function generateCookingResult(stage, isDuo) {
  const stageData = campingData.cookingStages[stage - 1];
  const successRate = calculateCookingSuccess(stage, isDuo);
  const success = Math.random() < successRate;
  
  return {
    success,
    stage,
    stageData,
    successRate: Math.round(successRate * 100),
    isDuo
  };
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
      const item = allItems.find(i => i.id === bonusItem.itemId);
      return item || null;
    }
  }
  
  return null;
}

/**
 * 캠핑 가능 여부 체크
 */
export function canCampToday(lastCampingDate) {
  if (!lastCampingDate) return true;
  
  const today = new Date();
  const lastDate = new Date(lastCampingDate);
  
  const diffTime = today - lastDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 7;
}

/**
 * 오늘이 캠핑 가능한 요일인지 확인
 */
export function isCampingDay() {
  const today = new Date();
  const dayName = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][today.getDay()];
  
  return campingData.campingConfig.allowedDays.includes(dayName);
}

/**
 * 다음 캠핑 가능 날짜 계산
 */
export function getNextCampingDate(lastCampingDate) {
  if (!lastCampingDate) {
    return new Date();
  }
  
  const nextDate = new Date(lastCampingDate);
  nextDate.setDate(nextDate.getDate() + 7);
  
  return nextDate;
}

/**
 * 엔트리 포켓몬의 친밀도 상승
 */
export function applyFriendshipBonus(entryPokemon, friendshipBonus) {
  return entryPokemon.map(pokemon => {
    if (!pokemon) return null;
    
    const adjustedBonus = Math.max(0, Math.floor(friendshipBonus * (pokemon.friendshipGainMultiplier || 1)));
    const newFriendship = Math.min(255, (pokemon.friendship || 0) + adjustedBonus);
    
    return {
      ...pokemon,
      friendship: newFriendship
    };
  });
}

/**
 * 캐릭터 경험치 증가
 */
export function applyCharacterExp(currentExp, expBonus) {
  return (currentExp || 0) + expBonus;
}

/**
 * 캠핑 세션 데이터 생성
 */
export function createCampingSession(memberId, memberName, entryPokemon, partnerId = null, partnerName = null) {
  return {
    id: `camping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    memberId,
    memberName,
    partnerId: partnerId || '',
    partnerName: partnerName || '',
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
