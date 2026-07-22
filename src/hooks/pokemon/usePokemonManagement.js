// src/hooks/pokemon/usePokemonManagement.js - 포켓몬 관리 훅

import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { getPokemonLearnset } from '../../utils/pokemonLearnsets';
import { getRequiredExpForLevel } from '../../utils/experience';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import itemsData from '../../data/items.json';

const getItemList = (items) => {
  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.items)) return items.items;
  if (Array.isArray(itemsData)) return itemsData;
  return itemsData.items || [];
};

const usePokemonManagement = (
  currentUser,
  updateCurrentUser,
  updateOwnedPokemonByUniqueId,
  allPokemonMaster,
  setSharedPokedexData,
  sharedPokedexData,
  pokemonLearnsets,
  allMoves,
  checkEvolutionOnLevelUp,
  updateInventory,
  updateCaughtPokemon
) => {
  // ⭐ 리전폼은 표시용 name이 원종과 동일하게 저장된다(getPokemonDisplayParts가
  // "(가라르의 모습)" 같은 접미사를 떼어내기 때문). 예전에는 number/nameEn/name을 단순 OR로
  // find()했는데, allPokemonMaster에서 원종이 리전폼보다 배열 앞쪽에 있어서 name만 일치해도
  // 원종 템플릿이 먼저 매칭되어버렸다 — 그 결과 갈라르 파오리가 레벨업할 때 원종 파오리의
  // 기술 배움표(에어커터 등)를 참조하는 회귀가 있었다. formVariant/nameEn/number처럼 더 구체적인
  // 필드에 높은 가중치를 주는 스코어링 방식(관리자 패널의 getPokemonTemplate과 동일)으로 교체.
  const normalizeKey = (value) => String(value || '').toLowerCase();

  const getPokemonTemplate = (pokemon) => {
    if (!pokemon) return null;
    const pokemonFormVariant = normalizeKey(pokemon.formVariant);
    const pokemonNameEn = normalizeKey(pokemon.nameEn);
    const pokemonRegionalForm = normalizeKey(pokemon.regionalForm);
    const pokemonNumber = Number(pokemon.number);
    const pokemonOriginalNumber = Number(pokemon.originalNumber || pokemon.number);
    const pokemonId = Number(pokemon.pokemonId || pokemon.id);

    const candidates = (allPokemonMaster || [])
      .map(template => {
        const templateFormVariant = normalizeKey(template.formVariant);
        const templateNameEn = normalizeKey(template.nameEn);
        const templateRegionalForm = normalizeKey(template.regionalForm);
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

    return candidates[0]?.template || null;
  };

  const withPokemonTemplateData = (pokemon) => {
    const template = getPokemonTemplate(pokemon);
    return template ? { ...pokemon, ...template } : pokemon;
  };

  const getPokemonFormCandidates = (pokemon) => {
    const currentTemplate = getPokemonTemplate(pokemon);
    const baseNumber = currentTemplate?.originalNumber || pokemon?.originalNumber || currentTemplate?.number || pokemon?.number;
    const baseSpeciesEn = currentTemplate?.baseSpeciesEn || pokemon?.baseSpeciesEn || currentTemplate?.nameEn || pokemon?.nameEn;
    const numericBaseNumber = Number(baseNumber);
    const currentNumber = Number(currentTemplate?.number || pokemon?.number);

    return (allPokemonMaster || [])
      .filter((template) => {
        if (!template || template.isMega) return false;

        const templateNumber = Number(template.number);
        const templateOriginalNumber = Number(template.originalNumber || template.number);
        const sameNumber = Number.isFinite(numericBaseNumber) && (
          templateNumber === numericBaseNumber ||
          templateOriginalNumber === numericBaseNumber ||
          templateNumber === currentNumber ||
          templateOriginalNumber === currentNumber
        );
        const sameBaseSpecies = baseSpeciesEn && (
          template.baseSpeciesEn === baseSpeciesEn ||
          template.nameEn === baseSpeciesEn ||
          template.species === baseSpeciesEn
        );
        const isFormLike = Boolean(
          template.formVariant ||
          template.regionalForm ||
          template.isRegionalForm ||
          template.baseSpeciesEn ||
          template.displayNumber ||
          templateOriginalNumber !== templateNumber
        );

        return (sameNumber || sameBaseSpecies) && (isFormLike || templateNumber === numericBaseNumber);
      })
      .filter((template, index, list) => (
        index === list.findIndex(item => (
          (item.id || item.nameEn || item.name) === (template.id || template.nameEn || template.name)
        ))
      ))
      .sort((a, b) => String(a.displayNumber || a.number).localeCompare(String(b.displayNumber || b.number)));
  };

  const applyTemplateToOwnedPokemon = (pokemon, template) => ({
    ...pokemon,
    pokemonId: template.id || pokemon.pokemonId,
    number: template.number,
    originalNumber: template.originalNumber || template.number,
    displayNumber: template.displayNumber || pokemon.displayNumber,
    name: template.name || pokemon.name,
    nameEn: template.nameEn || pokemon.nameEn,
    species: template.species || template.nameEn || pokemon.species,
    type: template.type || pokemon.type,
    type2: template.type2 || null,
    abilities: template.abilities || pokemon.abilities,
    abilitiesEn: template.abilitiesEn || pokemon.abilitiesEn,
    ability: pokemon.ability || template.abilities?.[0],
    abilityEn: pokemon.abilityEn || getAbilityEnglishName(pokemon.ability) || template.abilitiesEn?.[0],
    hiddenAbility: template.hiddenAbility ?? pokemon.hiddenAbility,
    hiddenAbilityEn: template.hiddenAbilityEn ?? pokemon.hiddenAbilityEn,
    baseHp: template.baseHp ?? pokemon.baseHp,
    baseAttack: template.baseAttack ?? pokemon.baseAttack,
    baseDefense: template.baseDefense ?? pokemon.baseDefense,
    baseSpAttack: template.baseSpAttack ?? pokemon.baseSpAttack,
    baseSpDefense: template.baseSpDefense ?? pokemon.baseSpDefense,
    baseSpeed: template.baseSpeed ?? pokemon.baseSpeed,
    imageUrl: template.imageUrl || pokemon.imageUrl,
    spriteUrl: template.spriteUrl || template.imageUrl || pokemon.spriteUrl,
    iconUrl: template.iconUrl || pokemon.iconUrl,
    shinySprite: template.shinySprite || pokemon.shinySprite,
    isRegionalForm: Boolean(template.isRegionalForm),
    regionalForm: template.regionalForm || null,
    formVariant: template.formVariant || null,
    baseSpecies: template.baseSpecies || pokemon.baseSpecies,
    baseSpeciesEn: template.baseSpeciesEn || pokemon.baseSpeciesEn,
  });

  const isEmptyPokemonSlot = (pokemon) => (
    pokemon === null || pokemon === undefined || pokemon === 'null'
  );

  const compactPartySlots = (party = []) => {
    const occupiedSlots = party.filter(pokemon => !isEmptyPokemonSlot(pokemon));
    while (occupiedSlots.length < 6) {
      occupiedSlots.push(null);
    }
    return occupiedSlots.slice(0, 6);
  };

  // 파티로 이동
  // ⭐ 클로저에 갇힌 currentUser.caughtPokemon으로 인덱스를 계산해 배열 전체를 덮어쓰면, 그 사이
  // 다른 곳(포획 등)에서 바뀐 배열을 되돌리거나 엉뚱한 자리에 쓰게 될 수 있다. 항상 Firebase의
  // 최신 배열을 기준으로 트랜잭션으로 반영한다.
  const movePokemonToParty = async (uniqueId) => {
    if (!currentUser) return;

    let failReason = null; // 'not-found' | 'party-full' | null

    const result = await updateCaughtPokemon((currentCaught) => {
      failReason = null;
      const pokemonIndex = currentCaught.findIndex(p => p && p.uniqueId === uniqueId);
      if (pokemonIndex === -1) {
        failReason = 'not-found';
        return currentCaught;
      }
      if (pokemonIndex < 6) {
        return currentCaught; // 이미 파티에 있음 - 조용히 무시 (기존 동작)
      }

      const party = compactPartySlots(currentCaught.slice(0, 6));
      const box = currentCaught.slice(6);

      const emptySlotIndex = party.findIndex(isEmptyPokemonSlot);
      if (emptySlotIndex === -1) {
        failReason = 'party-full';
        return currentCaught;
      }

      const boxIndex = pokemonIndex - 6;
      const pokemon = box[boxIndex];

      party[emptySlotIndex] = pokemon;
      box.splice(boxIndex, 1);
      return [...party, ...box];
    });

    if (!result.committed) {
      alert('포켓몬 이동 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (failReason === 'not-found') {
      alert('포켓몬을 찾을 수 없습니다!');
    } else if (failReason === 'party-full') {
      alert('파티가 가득찼습니다!');
    }
  };

  // 박스로 이동
  const movePokemonToBox = async (uniqueId) => {
    if (!currentUser) return;

    let failReason = null; // 'not-found' | 'partner' | null

    const result = await updateCaughtPokemon((currentCaught) => {
      failReason = null;
      const pokemonIndex = currentCaught.findIndex(p => p && p.uniqueId === uniqueId);
      if (pokemonIndex === -1) {
        failReason = 'not-found';
        return currentCaught;
      }
      if (pokemonIndex >= 6) {
        return currentCaught; // 이미 박스에 있음 - 조용히 무시 (기존 동작)
      }

      const pokemon = currentCaught[pokemonIndex];
      if (pokemon.isPartner) {
        failReason = 'partner';
        return currentCaught;
      }

      const next = [...currentCaught];
      next[pokemonIndex] = null;

      const party = compactPartySlots(next.slice(0, 6));
      const box = next.slice(6);
      return [...party, ...box, pokemon];
    });

    if (!result.committed) {
      alert('포켓몬 이동 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (failReason === 'not-found') {
      alert('포켓몬을 찾을 수 없습니다!');
    } else if (failReason === 'partner') {
      alert('파트너 포켓몬은 박스로 이동할 수 없습니다!');
    }
  };

  // 방생
  const releasePokemon = async (uniqueId) => {
    if (!currentUser) return;

    if (currentUser.partnerPokemon && currentUser.partnerPokemon.uniqueId === uniqueId) {
      alert('파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }

    let releasedPokemon = null;

    const result = await updateCaughtPokemon((currentCaught) => {
      releasedPokemon = null;
      const pokemonIndex = currentCaught.findIndex(p => p && p.uniqueId === uniqueId);
      if (pokemonIndex === -1) return currentCaught; // 대상을 못 찾음 - 변경 없이 그대로 둠 (기존 동작)

      const pokemon = currentCaught[pokemonIndex];
      releasedPokemon = pokemon;

      if (pokemonIndex < 6) {
        const next = [...currentCaught];
        next[pokemonIndex] = null;
        const party = compactPartySlots(next.slice(0, 6));
        const box = next.slice(6);
        return [...party, ...box];
      }

      const next = [...currentCaught];
      next.splice(pokemonIndex, 1);
      return next;
    });

    if (!result.committed) {
      alert('방생 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (releasedPokemon) {
      alert((releasedPokemon.nickname || releasedPokemon.name) + '을(를) 방생했습니다.');
    }
  };

  // 파트너 설정
  // ⭐ caughtPokemon 배열을 손대는 부분은 클로저 스냅샷 대신 트랜잭션으로 Firebase 최신 배열
  // 위에서 재구성한다. partnerPokemon 필드는 caughtPokemon과 별개 경로라 이 트랜잭션 대상이
  // 아니며, 커밋 성공 후 별도로 기록한다(그 사이 partnerPokemon만 따로 바뀌는 경우는 없음).
  const setPartnerPokemon = async (uniqueId) => {
    if (!currentUser) return;

    if (uniqueId === null) {
      if (!currentUser.partnerPokemon) {
        alert('설정된 파트너 포켓몬이 없습니다.');
        return;
      }

      const unsetPartner = { ...currentUser.partnerPokemon, isPartner: false };

      const result = await updateCaughtPokemon((currentCaught) => {
        const party = compactPartySlots(currentCaught.slice(0, 6));
        const box = currentCaught.slice(6);
        const emptySlotIndex = party.findIndex(isEmptyPokemonSlot);

        if (emptySlotIndex !== -1) {
          const newParty = [...party];
          newParty[emptySlotIndex] = unsetPartner;
          return [...newParty, ...box];
        }
        return [...party, ...box, unsetPartner];
      });

      if (!result.committed) {
        alert('파트너 해제 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      await updateCurrentUser({ partnerPokemon: null });
      alert('파트너 설정이 해제되었습니다.');
      return;
    }

    let foundPokemon = null;

    const result = await updateCaughtPokemon((currentCaught) => {
      foundPokemon = null;
      const index = currentCaught.findIndex(p => p && p.uniqueId === uniqueId);
      if (index === -1) return currentCaught;

      foundPokemon = currentCaught[index];

      const withoutTarget = currentCaught.filter((p, i) => i !== index);
      let party = compactPartySlots(withoutTarget.slice(0, 6));
      let box = withoutTarget.slice(6);

      if (currentUser.partnerPokemon) {
        const oldPartner = { ...currentUser.partnerPokemon, isPartner: false };
        const emptySlotIndex = party.findIndex(isEmptyPokemonSlot);
        if (emptySlotIndex !== -1) {
          party = [...party];
          party[emptySlotIndex] = oldPartner;
        } else {
          box = [...box, oldPartner];
        }
      }

      return [...party, ...box];
    });

    if (!result.committed) {
      alert('파트너 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (!foundPokemon) {
      alert('포켓몬을 찾을 수 없습니다!');
      return;
    }

    await updateCurrentUser({ partnerPokemon: { ...foundPokemon, isPartner: true } });
    alert('파트너 포켓몬으로 설정되었습니다.');
  };

  // 이상한사탕 (레벨업 + 진화 체크 포함)
  const useRareCandy = async (uniqueId, onLevelUp, expAmount = 0) => {
    if (!currentUser) return false;

    let pokemon;
    if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
      pokemon = currentUser.partnerPokemon;
    } else {
      pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    }

    if (!pokemon) return false;

    let maxAllowedLevel = Infinity;

    try {
      const levelRestrictionRef = ref(database, 'gameData/levelRestriction');
      const snapshot = await get(levelRestrictionRef);

      if (snapshot.exists()) {
        const restriction = snapshot.val();

        if (restriction.enabled) {
          const { maxLevel } = restriction;
          maxAllowedLevel = Number(maxLevel) || Infinity;

          if ((Number(pokemon.level) || 1) >= maxAllowedLevel) {
            alert(`레벨 제한으로 인해 더 이상 레벨업할 수 없습니다!\n현재 최대 레벨: ${maxLevel}`);
            return false;
          }
        }
      }
    } catch (error) {
      console.error('레벨 제한 확인 실패:', error);
    }

    const oldLevel = Number(pokemon.level) || 1;

    // 기존 누적 exp + 이번에 배분할 exp 합산
    let currentLevel = oldLevel;
    let accExp = (Number(pokemon.exp) || 0) + (Number(expAmount) || 0);
    const learnedLevels = [];

    if (Number(expAmount) > 0) {
      while (currentLevel < maxAllowedLevel) {
        const required = getRequiredExpForLevel(currentLevel);
        if (required === null || accExp < required) break;
        accExp -= required;
        currentLevel++;
        learnedLevels.push(currentLevel);
      }
    } else {
      // expAmount 없이 호출된 경우 (이상한사탕 단독) — 기존 +1 동작
      currentLevel = Math.min(oldLevel + 1, maxAllowedLevel);
      learnedLevels.push(currentLevel);
      accExp = 0;
    }

    const newLevel = currentLevel;
    if (newLevel === oldLevel && accExp === (Number(pokemon.exp) || 0)) return false;

    const isPartnerPokemon = currentUser.partnerPokemon?.uniqueId === uniqueId;

    // ⭐ 클로저/한 번의 get() 스냅샷이 아니라 트랜잭션으로 Firebase의 최신 데이터 위에 레벨/exp만
    // 패치한다 (moveUsage 등 다른 곳에서 직접 기록된 필드도 자연히 보존됨). 이상한사탕을 여러
    // 포켓몬에게 빠르게 연달아 먹일 때 앞선 변경이 사라지는 문제를 막기 위함.
    const result = await updateOwnedPokemonByUniqueId(uniqueId, (latestPokemon) => ({
      ...latestPokemon,
      level: newLevel,
      exp: accExp
    }));

    if (!result.committed) {
      alert('레벨업 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }

    // trainerExp에서 배분한 만큼만 차감
    const newTrainerExp = Math.max(0, (Number(currentUser.trainerExp) || 0) - (Number(expAmount) || 0));
    updateCurrentUser({ trainerExp: newTrainerExp });

    if (newLevel > oldLevel) {
      const levelMsg = newLevel > oldLevel + 1
        ? `Lv.${oldLevel} → Lv.${newLevel} (${newLevel - oldLevel}레벨 상승!)`
        : `Lv.${oldLevel} → Lv.${newLevel}`;
      alert(`${pokemon.nickname || pokemon.name}의 레벨이 올랐다!\n${levelMsg}`);
    }

    setTimeout(async () => {
      try {
        const memberRef = ref(database, `members/${currentUser.id}`);
        const snapshot = await get(memberRef);

        if (snapshot.exists()) {
          const latestUser = snapshot.val();
          const rawCaught = latestUser.caughtPokemon;
          let latestCaught;
          if (Array.isArray(rawCaught)) {
            latestCaught = rawCaught;
          } else if (rawCaught && typeof rawCaught === 'object') {
            const maxIdx = Math.max(...Object.keys(rawCaught).map(Number));
            latestCaught = Array.from({ length: maxIdx + 1 }, (_, i) => rawCaught[i] ?? null);
          } else {
            latestCaught = [];
          }
          const latestPokemon = isPartnerPokemon
            ? latestUser.partnerPokemon
            : latestCaught.find(p => p && p.uniqueId === uniqueId);

          if (latestPokemon && checkEvolutionOnLevelUp) {
            const shouldShowEvolutionModal = checkEvolutionOnLevelUp(latestPokemon);

            if (shouldShowEvolutionModal) {
              console.log('진화 모달 표시 중, 기술 배우기는 건너뜀');
              return;
            }
          }
        }
      } catch (error) {
        console.error('Firebase 조회 실패:', error);
      }

      if (onLevelUp && pokemonLearnsets && allMoves) {
        const learnset = getPokemonLearnset(pokemonLearnsets, withPokemonTemplateData(pokemon));
        if (learnset?.levelUpMoves) {
          const newMoves = learnset.levelUpMoves
            .filter(entry => learnedLevels.includes(entry.level))
            .map(entry => allMoves.find(move => move.id === entry.moveId))
            .filter(Boolean);

          if (newMoves.length > 0) {
            onLevelUp(uniqueId, newLevel, newMoves);
          }
        }
      }
    }, 100);

    return true;
  };
  // ⭐ 클로저 스냅샷으로 caughtPokemon 전체를 덮어쓰지 않고, uniqueId로 최신 데이터를 다시 찾아
  // patch하는 updateOwnedPokemonByUniqueId(파트너/일반 포켓몬 모두 처리)로 통일한다.
  const changePokemonForm = async (uniqueId, formId) => {
    if (!currentUser) return false;

    const targetTemplate = (allPokemonMaster || []).find(template => (
      template.id === formId ||
      template.nameEn === formId ||
      template.name === formId
    ));

    if (!targetTemplate) {
      alert('변경할 폼 데이터를 찾을 수 없습니다.');
      return false;
    }

    let found = false;
    const result = await updateOwnedPokemonByUniqueId(uniqueId, (latestPokemon) => {
      found = true;
      return applyTemplateToOwnedPokemon(latestPokemon, targetTemplate);
    });

    if (!result.committed) {
      alert('폼 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }

    if (!found) {
      alert('포켓몬을 찾을 수 없습니다.');
      return false;
    }

    alert((targetTemplate.name || targetTemplate.nameEn) + '으로 변경되었습니다.');
    return true;
  };

  // 닉네임 변경
  // ⭐ 예전에는 클로저의 stale index로 `caughtPokemon/{index}/nickname` 경로를 직접 썼는데,
  // 그 사이 실제 서버 배열이 달라져 있으면(예: 포획이 거의 동시에 일어남) 엉뚱한 자리에
  // {nickname}만 있는 반쪽짜리 레코드를 만들어버렸다(엔트리페이지 크래시의 원인). uniqueId로
  // 최신 데이터에서 다시 찾아 patch하는 updateOwnedPokemonByUniqueId로 통일한다.
  const updatePokemonNickname = async (uniqueId, nickname) => {
    if (!currentUser?.id) return false;

    const normalizedNickname = String(nickname || '').trim();
    let found = false;

    const result = await updateOwnedPokemonByUniqueId(uniqueId, (latestPokemon) => {
      found = true;
      return { ...latestPokemon, nickname: normalizedNickname };
    });

    if (!result.committed) {
      alert('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }

    if (!found) {
      alert('닉네임을 변경할 포켓몬을 찾을 수 없습니다.');
      return false;
    }

    return true;
  };

  const updatePokemonMemo = async (uniqueId, memo) => {
    if (!currentUser) return;
    await updateOwnedPokemonByUniqueId(uniqueId, (latestPokemon) => ({
      ...latestPokemon,
      memo,
    }));
  };

  // 아이템 지급
  const giveItemToPokemon = async (pokemonUniqueId, itemName, allItems) => {
    if (!currentUser || !currentUser.inventory || !currentUser.caughtPokemon) {
      alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
      return false;
    }

    // 빠른 UX 피드백용 사전 체크 (실제 검증은 트랜잭션 내부에서 최신 값 기준으로 다시 수행됨)
    const preCheckItem = currentUser.inventory.find(i => i.name === itemName);
    if (!preCheckItem) {
      alert('해당 아이템이 없습니다!');
      return false;
    }
    if (preCheckItem.count <= 0) {
      alert('아이템이 소진되었습니다!');
      return false;
    }

    const isPartnerPokemon = currentUser.partnerPokemon?.uniqueId === pokemonUniqueId;
    const pokemon = isPartnerPokemon
      ? currentUser.partnerPokemon
      : currentUser.caughtPokemon.find(p => p && p.uniqueId === pokemonUniqueId);
    if (!pokemon) {
      alert('포켓몬을 찾을 수 없습니다!');
      return false;
    }

    if (pokemon.heldItem) {
      if (!window.confirm((pokemon.nickname || pokemon.name) + '이(가) 이미 ' + pokemon.heldItem + '을(를) 들고 있습니다. 교체하시겠습니까?')) {
        return false;
      }
    }

    const result = await updateInventory((inventory) => {
      const itemIndex = inventory.findIndex(i => i.name === itemName);
      if (itemIndex === -1 || inventory[itemIndex].count <= 0) {
        return; // 트랜잭션 중단 (아이템이 그 사이 소진됨)
      }
      const item = inventory[itemIndex];

      let next = inventory
        .map((it, idx) => (idx === itemIndex ? { ...it, count: it.count - 1 } : it))
        .filter(it => it.count > 0);

      if (pokemon.heldItem) {
        const existingIndex = next.findIndex(i => i.name === pokemon.heldItem);
        next = existingIndex !== -1
          ? next.map((it, idx) => (idx === existingIndex ? { ...it, count: it.count + 1 } : it))
          : [...next, { name: pokemon.heldItem, count: 1, imageUrl: item.imageUrl }];
      }

      return next;
    });

    if (!result.committed) {
      alert('아이템 수량이 변경되었습니다. 다시 시도해주세요.');
      return false;
    }

    // ⭐ 클로저 스냅샷으로 caughtPokemon/partnerPokemon 전체를 덮어쓰지 않고, 트랜잭션으로
    // Firebase의 최신 포켓몬 데이터 위에 heldItem만 patch한다 (안 그러면 그 사이 다른 곳에서
    // 바뀐 포켓몬 데이터가 통째로 날아가고, 새로고침하면 방금 지니게 한 아이템도 사라진다).
    const pokemonResult = await updateOwnedPokemonByUniqueId(pokemonUniqueId, (latestPokemon) => ({
      ...latestPokemon,
      heldItem: itemName
    }));

    if (!pokemonResult.committed) {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
      return false;
    }
    alert((pokemon.nickname || pokemon.name) + '에게 ' + itemName + '을(를) 주었습니다.');
    return true;
  };

  // 아이템 뺏기
  const takeItemFromPokemon = async (pokemonUniqueId, allItems) => {
    if (!currentUser || !currentUser.caughtPokemon) {
      alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
      return;
    }

    const isPartnerPokemon = currentUser.partnerPokemon?.uniqueId === pokemonUniqueId;
    const pokemon = isPartnerPokemon
      ? currentUser.partnerPokemon
      : currentUser.caughtPokemon.find(p => p && p.uniqueId === pokemonUniqueId);
    if (!pokemon) return;

    if (!pokemon.heldItem) {
      alert('이 포켓몬은 아이템을 들고 있지 않습니다!');
      return;
    }

    const itemName = pokemon.heldItem;
    const itemList = getItemList(allItems);

    const result = await updateInventory((inventory) => {
      const itemIndex = inventory.findIndex(i => i.name === itemName);
      if (itemIndex !== -1) {
        return inventory.map((it, idx) => (
          idx === itemIndex ? { ...it, count: it.count + 1 } : it
        ));
      }
      const itemData = itemList.find(i => i.name === itemName || i.nameEn === itemName || i.id === itemName);
      return [...inventory, { name: itemName, count: 1, imageUrl: itemData?.spriteUrl || '/default-item.png' }];
    });

    if (!result.committed) {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    // ⭐ 지급 로직과 동일한 이유로, 클로저 스냅샷으로 통째로 덮어쓰지 않고 트랜잭션으로
    // heldItem만 patch한다.
    const pokemonResult = await updateOwnedPokemonByUniqueId(pokemonUniqueId, (latestPokemon) => ({
      ...latestPokemon,
      heldItem: null
    }));

    if (!pokemonResult.committed) {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }
    alert((pokemon.nickname || pokemon.name) + '에게서 ' + itemName + '을(를) 뺐습니다!');
  };

  // 파티 순서 변경
  // ⭐ 박스는 클로저 스냅샷이 아니라 트랜잭션의 최신 값을 쓴다(그 사이 포획 등으로 박스가
  // 바뀌었으면 되돌리지 않도록). reorderedParty로 넘어온 포켓몬 데이터도 드래그 시점의
  // 스냅샷일 수 있으므로, 순서(uniqueId)만 취하고 실제 데이터는 최신 파티에서 다시 찾는다.
  const reorderPartyPokemon = async (reorderedParty) => {
    if (!currentUser) return;

    const orderedIds = reorderedParty.map(p => p?.uniqueId).filter(Boolean);

    await updateCaughtPokemon((currentCaught) => {
      const currentParty = currentCaught.slice(0, 6);
      const box = currentCaught.slice(6);

      const byId = new Map(currentParty.filter(Boolean).map(p => [p.uniqueId, p]));
      const newParty = orderedIds.map(id => byId.get(id)).filter(Boolean);

      // 넘어온 순서에 없는(그 사이 다른 곳에서 파티에 추가/제거된) 포켓몬은 뒤에 그대로 유지
      currentParty.forEach(p => {
        if (p && !orderedIds.includes(p.uniqueId)) newParty.push(p);
      });

      while (newParty.length < 6) newParty.push(null);

      return [...newParty.slice(0, 6), ...box];
    });
  };

  // 노력치 증가
  // ⭐ 클로저 스냅샷의 effort로 "남은 한도"를 계산하면, 그 사이 다른 곳에서 바뀐 노력치가
  // 통째로 덮어써질 수 있다. updateOwnedPokemonByUniqueId로 항상 최신 effort 기준으로 계산한다.
  const increaseEffort = async (uniqueId, stat, amount) => {
    if (!currentUser) return;

    let actualIncrease = null; // null: 포켓몬을 못 찾음, 0 이하: 더 늘릴 수 없음

    const result = await updateOwnedPokemonByUniqueId(uniqueId, (latestPokemon) => {
      const currentEffort = latestPokemon.effort || {
        hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
      };

      const totalEV = Object.values(currentEffort).reduce((sum, v) => sum + v, 0);
      const remaining = 510 - totalEV;
      const maxForStat = 252 - (currentEffort[stat] || 0);
      actualIncrease = Math.min(amount, remaining, maxForStat);

      if (actualIncrease <= 0) return latestPokemon;

      return {
        ...latestPokemon,
        effort: {
          ...currentEffort,
          [stat]: (currentEffort[stat] || 0) + actualIncrease
        }
      };
    });

    if (!result.committed) {
      alert('노력치 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (actualIncrease !== null && actualIncrease <= 0) {
      alert('더 이상 노력치를 늘릴 수 없습니다!');
    }
  };

  return {
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    setPartnerPokemon,
    useRareCandy,
    updatePokemonNickname,
    updatePokemonMemo,
    getPokemonFormCandidates,
    changePokemonForm,
    giveItemToPokemon,
    takeItemFromPokemon,
    reorderPartyPokemon,
    increaseEffort
  };
};

export default usePokemonManagement;
