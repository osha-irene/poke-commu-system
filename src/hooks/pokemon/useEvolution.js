import { useState } from 'react';
import evolutionsData from '../../data/evolutions.json';
import movesDataRaw from '../../data/moves.json';
import { getBaseStatPatch } from '../../utils/pokemonBaseStats';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';
import {
  getWurmpleEvolutionTarget,
  isWurmple,
  withWurmpleEvolutionId
} from '../../utils/wurmpleEvolution';
import { getAlcremieImage, getAlcremieShapeForItem } from '../../utils/alcremieFlavors';
import { getAbilityKoreanName } from '../../utils/abilityUtils';

const allMovesData = Array.isArray(movesDataRaw) ? movesDataRaw : movesDataRaw.moves || [];

const getBaseName = (pokemon) => getPokemonDisplayParts(pokemon).name;

export const useEvolution = (currentUser, updateCurrentUser, allPokemonMaster) => {
  const [evolutionModal, setEvolutionModal] = useState(null);
  // 마빌크 → 마휘핑: 어떤 맛(크림)으로 진화할지 고르는 중일 때 {pokemon, evolution, shapeId}
  const [alcremieFlavorPending, setAlcremieFlavorPending] = useState(null);

  const toPokemonNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const getPokemonNumberCandidates = (pokemon = {}) => {
    const currentNumber = toPokemonNumber(pokemon.number);
    const pokemonId = toPokemonNumber(pokemon.pokemonId || pokemon.id);
    const originalNumber = toPokemonNumber(pokemon.originalNumber);
    const isRegionalOrForm = Boolean(pokemon.regionalForm || pokemon.formVariant);

    if (isRegionalOrForm) {
      const formNumbers = [currentNumber, pokemonId]
        .filter((number) => number !== null && number !== originalNumber);
      if (formNumbers.length > 0) {
        return formNumbers.filter((number, index, numbers) => numbers.indexOf(number) === index);
      }

      return [currentNumber, pokemonId]
        .filter((number, index, numbers) => number !== null && numbers.indexOf(number) === index);
    }

    if (currentNumber !== null) return [currentNumber];

    return [pokemon.originalNumber, pokemonId]
      .map(toPokemonNumber)
      .filter((number, index, numbers) => number !== null && numbers.indexOf(number) === index);
  };

  const findEvolutionForPokemon = (pokemon, predicate = () => true) => {
    const candidates = getPokemonNumberCandidates(pokemon);
    return evolutionsData.evolutions.find((evo) =>
      candidates.includes(toPokemonNumber(evo.from)) && predicate(evo)
    );
  };

  const findAllEvolutionsForPokemon = (pokemon) => {
    const candidates = getPokemonNumberCandidates(pokemon);
    const wurmpleTarget = getWurmpleEvolutionTarget(pokemon);
    const seenTargets = new Set();
    return evolutionsData.evolutions
      .filter((evo) => candidates.includes(toPokemonNumber(evo.from)))
      .filter((evo) => wurmpleTarget === null || toPokemonNumber(evo.to) === wurmpleTarget)
      .filter((evo) => {
        const key = `${evo.to}-${evo.toName || ''}`;
        if (seenTargets.has(key)) return false;
        seenTargets.add(key);
        return true;
      });
  };

  const findPokemonTemplateByNumber = (number) => {
    const targetNumber = toPokemonNumber(number);
    return (
      allPokemonMaster.find((pokemon) => toPokemonNumber(pokemon.number) === targetNumber) ||
      allPokemonMaster.find((pokemon) => toPokemonNumber(pokemon.id) === targetNumber) ||
      allPokemonMaster.find((pokemon) => !pokemon.regionalForm && toPokemonNumber(pokemon.originalNumber) === targetNumber) ||
      allPokemonMaster.find((pokemon) => toPokemonNumber(pokemon.originalNumber) === targetNumber)
    );
  };

  const ensureStoredWurmpleEvolutionId = (pokemon) => {
    if (!isWurmple(pokemon)) return pokemon;
    const preparedPokemon = withWurmpleEvolutionId(pokemon);

    if (preparedPokemon.wurmpleEvolutionId === pokemon.wurmpleEvolutionId) {
      return preparedPokemon;
    }

    const updatedCaught = (currentUser.caughtPokemon || []).map(p =>
      p?.uniqueId === pokemon.uniqueId ? preparedPokemon : p
    );
    const updates = { caughtPokemon: updatedCaught };

    if (currentUser.partnerPokemon?.uniqueId === pokemon.uniqueId) {
      updates.partnerPokemon = {
        ...currentUser.partnerPokemon,
        wurmpleEvolutionId: preparedPokemon.wurmpleEvolutionId
      };
    }

    updateCurrentUser(updates);
    return preparedPokemon;
  };

  // 레벨업이 필요한 조건 타입 (아이템/교환 진화는 즉시 적용)
  const LEVEL_UP_REQUIRED_CONDITIONS = new Set(['friendship', 'moveUsage']);
  const isLevelUpRequiredCondition = (condition) =>
    LEVEL_UP_REQUIRED_CONDITIONS.has(condition?.type) ||
    condition?.minBeauty !== undefined ||
    (!condition?.type && condition?.knownMove);

 // 단일 진화 조건 충족 여부 확인 (내부 헬퍼)
  const checkSingleEvolutionCondition = (pokemon, evolution, { onLevelUp = false } = {}) => {
    const { condition } = evolution;

    // 레벨업 필요 조건: 레벨업 시 또는 이미 레벨업으로 조건 충족된 경우만 허용
    if (isLevelUpRequiredCondition(condition) && !onLevelUp && !pokemon.evolutionReady) return false;

    if (condition.type === 'level') {
      if (pokemon.level < condition.level) return false;

      if (condition.ability) {
        const hasAbility = pokemon.ability === condition.ability || pokemon.abilityEn === condition.ability;
        console.log('💡 특성 조건:', condition.ability, '보유:', pokemon.ability, '충족:', hasAbility);
        if (!hasAbility) return false;
      }

      if (condition.timeOfDay) {
        const hour = (new Date().getUTCHours() + 9) % 24;
        const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
        console.log('⏰ 시간 조건:', currentTime, '필요:', condition.timeOfDay);
        if (currentTime !== condition.timeOfDay) return false;
      }

      if (condition.partyType) {
        const hasType = currentUser.caughtPokemon
          .slice(0, 6)
          .some(p => p && (p.type === condition.partyType || p.type2 === condition.partyType));
        if (!hasType) return false;
      }

      if (condition.knownMove) {
        const hasMove = pokemon.moves?.some(
          m => m.moveId === condition.knownMove || m.name?.toLowerCase() === condition.knownMove
        );
        if (!hasMove) return false;
      }

      return true;
    }

    if (condition.type === 'friendship') {
      if ((pokemon.friendship || 0) < condition.friendship) return false;

      if (condition.timeOfDay) {
        const hour = (new Date().getUTCHours() + 9) % 24;
        const currentTime = hour >= 6 && hour < 18 ? 'day' : 'night';
        if (currentTime !== condition.timeOfDay) return false;
      }

      if (condition.knownMoveType) {
        const targetType = condition.knownMoveType.toLowerCase();
        const hasFairyMove = pokemon.moves?.some(m => {
          const moveId = m.moveId || m.id || '';
          const moveData = allMovesData.find(md => md.id === moveId);
          const moveType = (moveData?.type || m.type || m.moveType || '').toLowerCase();
          return moveType === targetType;
        });
        if (!hasFairyMove) return false;
      }

      return true;
    }

    if (condition.type === 'battleCrit') {
      return (pokemon.lastBattleCritCount || 0) >= (condition.count || 1);
    }

    if (condition.minBeauty !== undefined) {
      return (pokemon.condition?.beauty || 0) >= condition.minBeauty;
    }

    if (condition.type === 'moveUsage') {
      const moveId = (condition.move || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const used = pokemon.moveUsage?.[moveId] || 0;
      return used >= (condition.count || 1);
    }

    // type 없이 knownMove만 있는 경우 (예: 꼬지지→미스터마임, 꼬지지→나무킹)
    // 레벨업 시 해당 기술을 알고 있으면 진화
    if (!condition.type && condition.knownMove) {
      const hasMove = pokemon.moves?.some(
        m => m.moveId === condition.knownMove || m.name?.toLowerCase() === condition.knownMove
      );
      return !!hasMove;
    }

    return false;
  };

 // 진화 가능 여부 확인 (onLevelUp: 레벨업 시 호출 여부)
  const checkEvolution = (pokemon, { onLevelUp = false } = {}) => {
    console.log('🔍 checkEvolution 호출:', pokemon.name, pokemon.number, 'Lv.', pokemon.level);

    if (!pokemon) {
      console.log('❌ pokemon이 없음');
      return null;
    }

    // 해당 포켓몬의 모든 진화 경로 찾기 (특성 조건이 있는 것이 우선 배치됨)
    const evolutions = findAllEvolutionsForPokemon(pokemon);

    console.log('📋 찾은 진화 경로 수:', evolutions.length);

    if (evolutions.length === 0) {
      console.log('❌ 진화 정보 없음 (이 포켓몬은 진화하지 않거나 최종 진화형)');
      return null;
    }

    for (const evolution of evolutions) {
      console.log('📝 진화 조건 체크:', evolution.toName, evolution.condition);
      if (checkSingleEvolutionCondition(pokemon, evolution, { onLevelUp })) {
        console.log('🎉 모든 조건 충족! 진화 가능!', evolution.toName);
        return evolution;
      }
    }

    // 아이템 진화는 별도 함수에서 처리
    // 교환 진화는 나중에 구현

    console.log('❌ 최종: 진화 조건 미충족');
    return null;
  };

  // 레벨업 시 진화 체크
  const checkEvolutionOnLevelUp = (pokemon) => {
    console.log('🔍 진화 체크 시작:', pokemon.name, 'Lv.', pokemon.level);
    
    // 변함없는돌을 지니고 있으면 진화 체크 안함
    if (pokemon.heldItem === 'everstone' || pokemon.heldItem === '변함없는돌') {
      console.log('🪨 변함없는돌 착용 중 - 진화 불가');
      return false;
    }
    
    // 이미 진화를 거부한 적이 있으면 자동 모달 띄우지 않음
    if (pokemon.evolutionCancelled) {
      console.log('❌ 이전에 진화를 취소함 - 자동 모달 안띄움');
      return false;
    }
    
    const preparedPokemon = ensureStoredWurmpleEvolutionId(pokemon);
    const evolution = checkEvolution(preparedPokemon, { onLevelUp: true });
    console.log('🎯 진화 정보:', evolution);
    
    if (evolution) {
      console.log('✨ 진화 가능! 모달 띄우기');

      const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);

      if (!evolvedPokemonData) {
        console.log('❌ 진화할 포켓몬 데이터 없음');
        return false;
      }

      // 레벨업으로 조건 충족됨을 기록 → 이후 수동 진화 허용
      if (!pokemon.evolutionReady) {
        const updatedCaught = (currentUser.caughtPokemon || []).map(p =>
          p?.uniqueId === preparedPokemon.uniqueId ? { ...p, ...preparedPokemon, evolutionReady: true } : p
        );
        updateCurrentUser({ caughtPokemon: updatedCaught });
      }

      setEvolutionModal({
        show: true,
        pokemon: { ...preparedPokemon, evolutionReady: true },
        evolution: evolution,
        fromPokemon: preparedPokemon,
        toPokemon: evolvedPokemonData,
        isItemEvolution: false
      });
      return true;
    }
    
    console.log('❌ 진화 조건 미충족');
    return false;
  };

  // 아이템으로 진화
  const evolveWithItem = (pokemon, itemName) => {
    console.log('🔥 evolveWithItem 호출');
    console.log('🔥 pokemon.number:', pokemon.number);
    console.log('🔥 itemName:', itemName);
    
    // 아이템 이름 정규화 (공백, 하이픈 제거, 소문자, 한글 제거)
    const normalizeItemName = (name) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/[\s-_]/g, '')  // 공백, 하이픈, 언더스코어 제거
        .replace(/stone/g, '')    // 'stone' 제거
        .replace(/의돌/g, '')     // '의돌' 제거
        .replace(/[가-힣]/g, ''); // 모든 한글 제거
    };
    
    const normalizedItemName = normalizeItemName(itemName);
    console.log('🔥 normalizedItemName:', normalizedItemName);
    
    const isLinkingCord = normalizedItemName === 'linkingcord' || normalizedItemName === 'linkedcord';
    const isPartner = Boolean(pokemon?.isPartner);
    const evolution = findEvolutionForPokemon(pokemon, (evo) => {
      // 일반 아이템 진화 (누구나)
      if (evo.condition.type === 'item') {
        const evolItem = normalizeItemName(evo.condition.item || '');
        return evolItem === normalizedItemName;
      }
      // 교환 진화는 파트너만 아이템으로 대체 가능
      if (!isPartner) return false;
      if (isLinkingCord) return evo.condition.type === 'trade' && !evo.condition.heldItem;
      if (evo.condition.type === 'trade' && evo.condition.heldItem) {
        const evolItem = normalizeItemName(evo.condition.heldItem || '');
        return evolItem === normalizedItemName;
      }
      return false;
    });
    
    console.log('🔥 찾은 진화:', evolution);
    
    if (!evolution) {
      alert('❌ 이 아이템으로는 진화할 수 없습니다!');
      return false;
    }
    
    // ⭐ 변경: 바로 진화하지 않고 모달 표시
    const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);
    
    if (!evolvedPokemonData) {
      alert('진화할 포켓몬 데이터를 찾을 수 없습니다!');
      return false;
    }
    
    // 마빌크 → 마휘핑: 일반 진화 모달 대신 맛(크림) 선택 모달을 띄운다
    if (evolvedPokemonData.nameEn === 'alcremie') {
      console.log('🍰 마휘핑 맛 선택 모달 표시:', pokemon.name);
      setAlcremieFlavorPending({
        pokemon,
        evolution,
        shapeId: getAlcremieShapeForItem(itemName)
      });
      return true;
    }

    console.log('✨ 진화 모달 표시:', pokemon.name, '→', evolvedPokemonData.name);

    // 진화 모달 표시 (실제 진화는 acceptEvolution에서)
    setEvolutionModal({
      show: true,
      pokemon: pokemon,
      evolution: evolution,
      fromPokemon: pokemon,
      toPokemon: evolvedPokemonData,
      isItemEvolution: true
    });

    return true;
  };

  // 진화형에서도 기존 특성을 그대로 쓸 수 있는지 확인하고, 아예 없어졌다면
  // (숨겨진 특성이었다면 진화형의 숨겨진 특성으로, 아니면 진화형의 일반 특성 중) 랜덤으로 새로 배정한다.
  const resolveEvolvedAbility = (pokemon, evolvedTemplate) => {
    const wasHidden = Boolean(pokemon.isHiddenAbility);
    const abilitiesEn = evolvedTemplate.abilitiesEn || [];
    const hiddenAbilityEn = evolvedTemplate.hiddenAbilityEn || null;
    const currentAbilityEn = pokemon.abilityEn;

    const stillHasAbility = wasHidden
      ? Boolean(currentAbilityEn) && currentAbilityEn === hiddenAbilityEn
      : Boolean(currentAbilityEn) && abilitiesEn.includes(currentAbilityEn);

    if (stillHasAbility) {
      return { ability: pokemon.ability, abilityEn: currentAbilityEn, isHiddenAbility: wasHidden };
    }

    if (wasHidden && hiddenAbilityEn) {
      return {
        ability: getAbilityKoreanName(hiddenAbilityEn) || hiddenAbilityEn,
        abilityEn: hiddenAbilityEn,
        isHiddenAbility: true,
      };
    }

    if (abilitiesEn.length > 0) {
      const randomAbilityEn = abilitiesEn[Math.floor(Math.random() * abilitiesEn.length)];
      return {
        ability: getAbilityKoreanName(randomAbilityEn) || randomAbilityEn,
        abilityEn: randomAbilityEn,
        isHiddenAbility: false,
      };
    }

    // 진화형에 특성 정보 자체가 없으면 기존 값 유지
    return { ability: pokemon.ability, abilityEn: currentAbilityEn, isHiddenAbility: wasHidden };
  };

  // 진화 실행 (imageOverrides: 마휘핑 맛처럼 진화 결과 이미지를 직접 지정해야 할 때 사용)
  const performEvolution = (pokemon, evolution, imageOverrides = {}) => {
    const evolvedTemplate = findPokemonTemplateByNumber(evolution.to);

    if (!evolvedTemplate) {
      alert('❌ 진화 정보를 찾을 수 없습니다!');
      return false;
    }

    const evolvePokemonObject = (p) => ({
      ...p,
      number: evolvedTemplate.number,
      originalNumber: evolvedTemplate.originalNumber || evolvedTemplate.number,
      pokemonId: evolvedTemplate.number,
      name: getBaseName(evolvedTemplate),
      nameEn: evolvedTemplate.nameEn,
      species: evolvedTemplate.species || evolvedTemplate.nameEn,
      regionalForm: evolvedTemplate.regionalForm || null,
      formVariant: evolvedTemplate.formVariant || null,
      isRegionalForm: Boolean(evolvedTemplate.isRegionalForm),
      baseSpecies: evolvedTemplate.baseSpecies || null,
      baseSpeciesEn: evolvedTemplate.baseSpeciesEn || null,
      type: evolvedTemplate.type,
      type2: evolvedTemplate.type2 || null,
      abilitiesEn: evolvedTemplate.abilitiesEn || p.abilitiesEn,
      hiddenAbilityEn: evolvedTemplate.hiddenAbilityEn ?? p.hiddenAbilityEn,
      ...resolveEvolvedAbility(p, evolvedTemplate),
      ...getBaseStatPatch(evolvedTemplate),
      imageUrl: evolvedTemplate.imageUrl,
      iconUrl: (() => { const orig = evolvedTemplate.originalNumber; const n = (orig === 710 || orig === 711) ? orig : evolvedTemplate.number; return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${n}.png`; })(),
      spriteUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${evolvedTemplate.number}.png`,
      // 닉네임이 종족명이면 제거, 커스텀 닉네임은 유지
      nickname: (p.nickname && p.nickname !== getBaseName(p) && p.nickname !== p.name && p.nickname !== p.nameEn) ? p.nickname : null,
      evolutionCancelled: false,
      ...imageOverrides
    });

    const updatedPokemon = currentUser.caughtPokemon.map(p => (
      p && p.uniqueId === pokemon.uniqueId ? evolvePokemonObject(p) : p
    ));

    // 파트너 포켓몬은 caughtPokemon 배열이 아니라 별도 필드에 저장되므로 따로 갱신해야 한다.
    // (안 그러면 파트너로 지정된 포켓몬은 진화 조건을 통과하고 알림까지 떠도 실제로는 진화하지 않음)
    const updates = { caughtPokemon: updatedPokemon };
    if (currentUser.partnerPokemon?.uniqueId === pokemon.uniqueId) {
      updates.partnerPokemon = evolvePokemonObject(currentUser.partnerPokemon);
    }

    const evolvedAt = Date.now();
    const evolutionHistoryEntry = {
      id: `evolution_${pokemon.uniqueId || evolvedAt}_${evolvedAt}`,
      pokemonId: pokemon.uniqueId || null,
      fromName: pokemon.nickname || getBaseName(pokemon),
      toName: getBaseName(evolvedTemplate),
      toNameEn: evolvedTemplate.nameEn,
      toNumber: evolvedTemplate.number,
      imageUrl: evolvedTemplate.imageUrl,
      evolvedAt
    };

    updateCurrentUser({
      ...updates,
      evolutionHistory: [
        evolutionHistoryEntry,
        ...((currentUser.evolutionHistory || []).filter(Boolean))
      ].slice(0, 10)
    });
    return true;
  };

  // 진화 수락
  const acceptEvolution = () => {
    if (!evolutionModal || !evolutionModal.pokemon || !evolutionModal.evolution) {
      console.log('❌ 진화 모달 정보 없음');
      return;
    }

    const { pokemon, evolution } = evolutionModal;
    const success = performEvolution(pokemon, evolution);

    if (success) {
      const evolvedTemplate = findPokemonTemplateByNumber(evolution.to);
      alert(`🎉 축하합니다!\n${pokemon.nickname || pokemon.name}이(가) ${evolvedTemplate.name}(으)로 진화했습니다!`);
    }

    setEvolutionModal(null);
  };
  
// 수동 진화 (포켓몬 상세에서 진화 버튼 클릭)
const manualEvolve = (pokemon) => {
  console.log('🎯 manualEvolve 호출:', pokemon.name, 'Lv.', pokemon.level);
  
  // 변함없는돌을 지니고 있으면 진화 불가
  if (pokemon.heldItem === 'everstone' || pokemon.heldItem === '변함없는돌') {
    alert('변함없는돌을 지니고 있어 진화할 수 없습니다!');
    return false;
  }
  
  const preparedPokemon = ensureStoredWurmpleEvolutionId(pokemon);
  const evolution = checkEvolution(preparedPokemon);
  console.log('🎯 진화 정보:', evolution);
  
  if (!evolution) {
    alert('아직 진화 조건을 충족하지 못했습니다!');
    return false;
  }
  
  // 모달 표시 (실제 진화는 acceptEvolution에서)
  const evolvedPokemonData = findPokemonTemplateByNumber(evolution.to);
  
  if (!evolvedPokemonData) {
    alert('진화할 포켓몬 데이터를 찾을 수 없습니다!');
    return false;
  }
  
  console.log('✨ 진화 모달 표시:', pokemon.name, '→', evolvedPokemonData.name);
  
  setEvolutionModal({
    show: true,
    pokemon: preparedPokemon,
    evolution: evolution,
    fromPokemon: preparedPokemon,
    toPokemon: evolvedPokemonData,
    isItemEvolution: false
  });
  
  return true;
};

  // 진화 거부
  const cancelEvolution = () => {
    if (!evolutionModal || !evolutionModal.pokemon) {
      setEvolutionModal(null);
      return;
    }
    
    const { pokemon, isItemEvolution } = evolutionModal;
    
    // 아이템 진화는 거부 플래그 저장하지 않음 (아이템을 다시 사용하면 다시 진화 가능)
    if (!isItemEvolution) {
      // 레벨업 진화만 거부 플래그 저장
      const updatedPokemon = currentUser.caughtPokemon.map(p => {
        if (p && p.uniqueId === pokemon.uniqueId) {
          return {
            ...p,
            evolutionCancelled: true
          };
        }
        return p;
      });
      
      updateCurrentUser({ caughtPokemon: updatedPokemon });
      alert(`${pokemon.nickname || pokemon.name}의 진화를 취소했습니다.\n포켓몬 상세 화면에서 언제든지 진화시킬 수 있습니다.`);
    } else {
      alert(`${pokemon.nickname || pokemon.name}의 진화를 취소했습니다.`);
    }
    
    setEvolutionModal(null);
  };

  // 마휘핑 맛 선택 완료 → 선택한 맛의 이미지로 바로 진화
  const chooseAlcremieFlavor = (flavor) => {
    if (!alcremieFlavorPending || !flavor) return false;
    const { pokemon, evolution, shapeId } = alcremieFlavorPending;
    const image = getAlcremieImage(flavor.id, shapeId);

    const success = performEvolution(pokemon, evolution, image ? {
      imageUrl: image,
      spriteUrl: image,
      iconUrl: image,
      alcremieFlavor: flavor.id,
      alcremieShape: shapeId
    } : { alcremieFlavor: flavor.id, alcremieShape: shapeId });

    if (success) {
      alert(`🎉 축하합니다!\n${pokemon.nickname || pokemon.name}이(가) ${flavor.label}(으)로 진화했습니다!`);
    }

    setAlcremieFlavorPending(null);
    return success;
  };

  const cancelAlcremieFlavor = () => {
    if (alcremieFlavorPending?.pokemon) {
      const p = alcremieFlavorPending.pokemon;
      alert(`${p.nickname || p.name}의 진화를 취소했습니다.`);
    }
    setAlcremieFlavorPending(null);
  };

  // 진화 가능한 모든 포켓몬 찾기
  const getAllEvolvablePokemon = () => {
    if (!currentUser) return [];

    return currentUser.caughtPokemon
      .filter(p => p !== null)
      .map(pokemon => ({
        pokemon,
        evolution: checkEvolution(pokemon)
      }))
      .filter(item => item.evolution !== null);
  };

  return {
    evolutionModal,
    checkEvolution,
    checkEvolutionOnLevelUp,
    evolveWithItem,
    acceptEvolution,
    cancelEvolution,
    manualEvolve,
    getAllEvolvablePokemon,
    alcremieFlavorPending,
    chooseAlcremieFlavor,
    cancelAlcremieFlavor
  };
};
