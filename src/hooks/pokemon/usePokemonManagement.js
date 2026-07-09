// src/hooks/pokemon/usePokemonManagement.js - 포켓몬 관리 훅

import { ref, get, update } from 'firebase/database';
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
  allPokemonMaster, 
  setSharedPokedexData, 
  sharedPokedexData,
  pokemonLearnsets,
  allMoves,
  checkEvolutionOnLevelUp
) => {
  const getPokemonTemplate = (pokemon) => {
    if (!pokemon) return null;
    return (allPokemonMaster || []).find(template =>
      template.number === pokemon.number ||
      template.id === pokemon.pokemonId ||
      template.nameEn === pokemon.nameEn ||
      template.name === pokemon.name
    ) || null;
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
    abilityEn: getAbilityEnglishName(pokemon.ability) || pokemon.abilityEn || template.abilitiesEn?.[0],
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
  const movePokemonToParty = (uniqueId) => {
    console.log('movePokemonToParty 호출:', uniqueId);
    
    if (!currentUser) {
      console.error('currentUser가 없습니다!');
      return;
    }
    
    console.log('현재 잡은 포켓몬:', currentUser.caughtPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    console.log('pokemon index:', pokemonIndex);
    
    if (pokemonIndex === -1) { 
      console.error('포켓몬을 찾을 수 없습니다!');
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (pokemonIndex < 6) {
      console.log('이미 파티에 있습니다');
      return; 
    }
    
    const party = compactPartySlots(currentUser.caughtPokemon.slice(0, 6));
    const box = currentUser.caughtPokemon.slice(6);
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (isEmptyPokemonSlot(party[i])) { 
        emptySlotIndex = i; 
        break; 
      }
    }
    
    console.log('empty slot index:', emptySlotIndex);
    
    if (emptySlotIndex === -1) {
      console.error('파티가 가득찼습니다!');
      alert('파티가 가득찼습니다!'); 
      return; 
    }
    
    const boxIndex = pokemonIndex - 6;
    const pokemon = box[boxIndex];
    
    party[emptySlotIndex] = pokemon;
    box.splice(boxIndex, 1);
    const finalPokemon = [...party, ...box];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
  };

  // 박스로 이동
  const movePokemonToBox = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (pokemonIndex >= 6) { 
      return; 
    }
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    
    if (pokemon.isPartner) {
      alert('파트너 포켓몬은 박스로 이동할 수 없습니다!');
      return;
    }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    newCaughtPokemon[pokemonIndex] = null;
    
    const party = newCaughtPokemon.slice(0, 6);
    const box = newCaughtPokemon.slice(6);
    const compactedParty = compactPartySlots(party);
    const updatedBox = [...box, pokemon];
    const finalPokemon = [...compactedParty, ...updatedBox];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
  };

  // 방생
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;

    if (currentUser.partnerPokemon && currentUser.partnerPokemon.uniqueId === uniqueId) {
      alert('파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    if (!pokemon) return;
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    
    if (pokemonIndex < 6) {
      newCaughtPokemon[pokemonIndex] = null;
      const party = newCaughtPokemon.slice(0, 6);
      const box = newCaughtPokemon.slice(6);
      const compactedParty = compactPartySlots(party);
      const finalPokemon = [...compactedParty, ...box];
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      newCaughtPokemon.splice(pokemonIndex, 1);
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    }
    
    alert((pokemon.nickname || pokemon.name) + '을(를) 방생했습니다.');
  };

  // 파트너 설정
  const setPartnerPokemon = (uniqueId) => {
    if (!currentUser) return;
    
    if (uniqueId === null) {
      if (!currentUser.partnerPokemon) {
        alert('설정된 파트너 포켓몬이 없습니다.');
        return;
      }
      
      const unsetPartner = { ...currentUser.partnerPokemon, isPartner: false };
      const party = currentUser.caughtPokemon.slice(0, 6);
      const box = currentUser.caughtPokemon.slice(6);
      
      let emptySlotIndex = -1;
      for (let i = 0; i < 6; i++) {
        if (isEmptyPokemonSlot(party[i])) {
          emptySlotIndex = i;
          break;
        }
      }
      
      let finalCaughtPokemon;
      if (emptySlotIndex !== -1) {
        party[emptySlotIndex] = unsetPartner;
        finalCaughtPokemon = [...party, ...box];
      } else {
        finalCaughtPokemon = [...party, ...box, unsetPartner];
      }
      
      updateCurrentUser({ 
        partnerPokemon: null,
        caughtPokemon: finalCaughtPokemon
      });
      
      alert('파트너 설정이 해제되었습니다.');
      return;
    }
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) {
      alert('포켓몬을 찾을 수 없습니다!');
      return;
    }
    
    const newPartnerPokemon = { ...pokemon, isPartner: true };
    const newCaughtPokemon = currentUser.caughtPokemon.filter(p => p && p.uniqueId !== uniqueId);
    
    let finalCaughtPokemon = newCaughtPokemon;
    
    if (currentUser.partnerPokemon) {
      const oldPartner = { ...currentUser.partnerPokemon, isPartner: false };
      const party = finalCaughtPokemon.slice(0, 6);
      const box = finalCaughtPokemon.slice(6);
      
      let emptySlotIndex = -1;
      for (let i = 0; i < 6; i++) {
        if (isEmptyPokemonSlot(party[i])) {
          emptySlotIndex = i;
          break;
        }
      }
      
      if (emptySlotIndex !== -1) {
        party[emptySlotIndex] = oldPartner;
        finalCaughtPokemon = [...party, ...box];
      } else {
        finalCaughtPokemon = [...party, ...box, oldPartner];
      }
    }
    
    updateCurrentUser({ 
      partnerPokemon: newPartnerPokemon,
      caughtPokemon: finalCaughtPokemon
    });
    
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

    // Firebase에서 최신 caughtPokemon을 읽어 moveUsage 등 직접 기록된 필드를 보존
    let latestCaughtPokemon = currentUser.caughtPokemon;
    if (!isPartnerPokemon) {
      try {
        const caughtSnap = await get(ref(database, `members/${currentUser.id}/caughtPokemon`));
        if (caughtSnap.exists()) {
          const val = caughtSnap.val();
          if (Array.isArray(val)) {
            latestCaughtPokemon = val;
          } else if (val && typeof val === 'object') {
            const maxIdx = Math.max(...Object.keys(val).map(Number));
            latestCaughtPokemon = Array.from({ length: maxIdx + 1 }, (_, i) => val[i] ?? null);
          }
        }
      } catch (e) {
        console.warn('최신 caughtPokemon 로드 실패, 로컬 상태 사용:', e);
      }
    }

    // 최신 pokemon 데이터로 패치 (moveUsage 등 보존)
    const latestPokemon = isPartnerPokemon
      ? pokemon
      : (latestCaughtPokemon.find(p => p && p.uniqueId === uniqueId) || pokemon);
    const updatedPokemonPatch = { ...latestPokemon, level: newLevel, exp: accExp };

    // trainerExp에서 배분한 만큼만 차감
    const newTrainerExp = Math.max(0, (Number(currentUser.trainerExp) || 0) - (Number(expAmount) || 0));

    if (isPartnerPokemon) {
      updateCurrentUser({ partnerPokemon: updatedPokemonPatch, trainerExp: newTrainerExp });
    } else {
      const newCaughtPokemon = latestCaughtPokemon.map(p =>
        p && p.uniqueId === uniqueId ? updatedPokemonPatch : p
      );
      updateCurrentUser({ caughtPokemon: newCaughtPokemon, trainerExp: newTrainerExp });
    }

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
  const changePokemonForm = (uniqueId, formId) => {
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

    let changed = false;
    const updatePokemon = (pokemon) => {
      if (!pokemon || pokemon.uniqueId !== uniqueId) return pokemon;
      changed = true;
      return applyTemplateToOwnedPokemon(pokemon, targetTemplate);
    };

    const newCaughtPokemon = (currentUser.caughtPokemon || []).map(updatePokemon);
    const newPartnerPokemon = currentUser.partnerPokemon?.uniqueId === uniqueId
      ? updatePokemon(currentUser.partnerPokemon)
      : currentUser.partnerPokemon;

    if (!changed) {
      alert('포켓몬을 찾을 수 없습니다.');
      return false;
    }

    updateCurrentUser({
      caughtPokemon: newCaughtPokemon,
      partnerPokemon: newPartnerPokemon,
    });
    alert((targetTemplate.name || targetTemplate.nameEn) + '으로 변경되었습니다.');
    return true;
  };

  // 닉네임 변경
  const updatePokemonNickname = async (uniqueId, nickname) => {
    if (!currentUser?.id || !Array.isArray(currentUser.caughtPokemon)) return false;

    const pokemonIndex = currentUser.caughtPokemon.findIndex(
      pokemon => pokemon && String(pokemon.uniqueId) === String(uniqueId)
    );
    const isPartner = String(currentUser.partnerPokemon?.uniqueId) === String(uniqueId);

    if (pokemonIndex < 0 && !isPartner) {
      alert('닉네임을 변경할 포켓몬을 찾을 수 없습니다.');
      return false;
    }

    const normalizedNickname = String(nickname || '').trim();
    const newCaughtPokemon = pokemonIndex >= 0
      ? currentUser.caughtPokemon.map((pokemon, index) =>
          index === pokemonIndex ? { ...pokemon, nickname: normalizedNickname } : pokemon
        )
      : currentUser.caughtPokemon;
    const updatedPartnerPokemon = isPartner
      ? { ...currentUser.partnerPokemon, nickname: normalizedNickname }
      : currentUser.partnerPokemon;

    try {
      await updateCurrentUser({
        caughtPokemon: newCaughtPokemon,
        ...(isPartner ? { partnerPokemon: updatedPartnerPokemon } : {}),
      });

      const firebaseUpdates = {};
      if (pokemonIndex >= 0) {
        firebaseUpdates[`members/${currentUser.id}/caughtPokemon/${pokemonIndex}/nickname`] = normalizedNickname;
      }
      if (isPartner) {
        firebaseUpdates[`members/${currentUser.id}/partnerPokemon/nickname`] = normalizedNickname;
      }
      await update(ref(database), firebaseUpdates);
      return true;
    } catch (error) {
      console.error('포켓몬 닉네임 저장 실패:', error);
      alert('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
  };

  const updatePokemonMemo = (uniqueId, memo) => {
    if (!currentUser) return;
    const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
      p && p.uniqueId === uniqueId ? { ...p, memo } : p
    );
    const updates = { caughtPokemon: newCaughtPokemon };
    if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
      updates.partnerPokemon = { ...currentUser.partnerPokemon, memo };
    }
    updateCurrentUser(updates);
  };

  // 아이템 지급
  const giveItemToPokemon = (pokemonUniqueId, itemName, allItems) => {
    if (!currentUser || !currentUser.inventory || !currentUser.caughtPokemon) {
      alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
      return false;
    }

    const itemIndex = currentUser.inventory.findIndex(i => i.name === itemName);
    if (itemIndex === -1) {
      alert('해당 아이템이 없습니다!');
      return false;
    }

    const item = currentUser.inventory[itemIndex];
    if (item.count <= 0) {
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

      const existingItemIndex = currentUser.inventory.findIndex(i => i.name === pokemon.heldItem);
      if (existingItemIndex !== -1) {
        currentUser.inventory[existingItemIndex].count++;
      } else {
        currentUser.inventory.push({ name: pokemon.heldItem, count: 1, imageUrl: item.imageUrl });
      }
    }

    const newInventory = [...currentUser.inventory];
    newInventory[itemIndex] = { ...item, count: item.count - 1 };
    if (newInventory[itemIndex].count <= 0) {
      newInventory.splice(itemIndex, 1);
    }

    if (isPartnerPokemon) {
      updateCurrentUser({ inventory: newInventory, partnerPokemon: { ...pokemon, heldItem: itemName } });
    } else {
      const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
        p && p.uniqueId === pokemonUniqueId ? { ...p, heldItem: itemName } : p
      );
      updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    }
    alert((pokemon.nickname || pokemon.name) + '에게 ' + itemName + '을(를) 주었습니다.');
    return true;
  };

  // 아이템 뺏기
  const takeItemFromPokemon = (pokemonUniqueId, allItems) => {
    if (!currentUser || !currentUser.caughtPokemon || !currentUser.inventory) {
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
    const itemIndex = currentUser.inventory.findIndex(i => i.name === itemName);

    const itemList = getItemList(allItems);
    const newInventory = [...currentUser.inventory];
    if (itemIndex !== -1) {
      newInventory[itemIndex] = { ...newInventory[itemIndex], count: newInventory[itemIndex].count + 1 };
    } else {
      const itemData = itemList.find(i => i.name === itemName || i.nameEn === itemName || i.id === itemName);
      newInventory.push({ name: itemName, count: 1, imageUrl: itemData?.spriteUrl || '/default-item.png' });
    }

    if (isPartnerPokemon) {
      updateCurrentUser({ inventory: newInventory, partnerPokemon: { ...pokemon, heldItem: null } });
    } else {
      const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
        p && p.uniqueId === pokemonUniqueId ? { ...p, heldItem: null } : p
      );
      updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    }
    alert((pokemon.nickname || pokemon.name) + '에게서 ' + itemName + '을(를) 뺐습니다!');
  };

  // 파티 순서 변경
  const reorderPartyPokemon = (reorderedParty) => {
    if (!currentUser) return;
    
    const box = currentUser.caughtPokemon.slice(6);
    const partyWithNulls = [...reorderedParty];
    while (partyWithNulls.length < 6) {
      partyWithNulls.push(null);
    }
    
    const finalPokemon = [...partyWithNulls.slice(0, 6), ...box];
    updateCurrentUser({ caughtPokemon: finalPokemon });
  };

  // 노력치 증가
  const increaseEffort = (uniqueId, stat, amount) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    const currentEffort = pokemon.effort || {
      hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0
    };
    
    const totalEV = Object.values(currentEffort).reduce((sum, v) => sum + v, 0);
    const remaining = 510 - totalEV;
    const maxForStat = 252 - (currentEffort[stat] || 0);
    const actualIncrease = Math.min(amount, remaining, maxForStat);
    
    if (actualIncrease <= 0) {
      alert('더 이상 노력치를 늘릴 수 없습니다!');
      return;
    }
    
    const newEffort = {
      ...currentEffort,
      [stat]: (currentEffort[stat] || 0) + actualIncrease
    };
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
      p && p.uniqueId === uniqueId ? { ...p, effort: newEffort } : p
    );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
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
