// src/hooks/pokemon/usePokemonManagement.js - 진화 체크 통합

import { ref, get } from 'firebase/database';
import { database } from '../../firebase';
import { getRequiredExpForLevel } from '../../utils/experience';
import { getPokemonLearnset } from '../../utils/pokemonLearnsets';
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

  // 엔트리 이동
  const movePokemonToParty = (uniqueId) => {
    console.log('🔥 movePokemonToParty 시작:', uniqueId);
    
    if (!currentUser) {
      console.error('❌ currentUser가 없습니다!');
      return;
    }
    
    console.log('📦 현재 전체 배열:', currentUser.caughtPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    console.log('🔍 포켓몬 인덱스:', pokemonIndex);
    
    if (pokemonIndex === -1) { 
      console.error('❌ 포켓몬을 찾을 수 없습니다!');
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (pokemonIndex < 6) {
      console.log('⚠️ 이미 엔트리에 있습니다');
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
    
    console.log('🎯 빈 슬롯 인덱스:', emptySlotIndex);
    
    if (emptySlotIndex === -1) {
      console.error('❌ 엔트리가 가득 찼습니다!');
      alert('엔트리가 가득 찼습니다!'); 
      return; 
    }
    
    const boxIndex = pokemonIndex - 6;
    const pokemon = box[boxIndex];
    
    party[emptySlotIndex] = pokemon;
    box.splice(boxIndex, 1);
    const finalPokemon = [...party, ...box];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
  };

  // 박스 이동
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
      alert('💖 파트너 포켓몬은 박스로 이동할 수 없습니다!');
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
      alert('💖 파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    if (!pokemon) return;
    
    if (!window.confirm(`정말 ${pokemon.nickname || pokemon.name}을(를) 방생하시겠습니까?\n되돌릴 수 없습니다!`)) {
      return;
    }
  
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
    
    alert(`${pokemon.nickname || pokemon.name}을(를) 방생했습니다.`);
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
    
    alert('💖 파트너 포켓몬으로 설정되었습니다!');
  };

  // 레벨업 (이상한사탕 + 진화 체크 통합)
  const useRareCandy = async (uniqueId, onLevelUp, expAmount = 0) => {
    if (!currentUser) return;
    
    let pokemon;
    if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
      pokemon = currentUser.partnerPokemon;
    } else {
      pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    }
    
    if (!pokemon) return;

    const requestedExp = Math.floor(Number(expAmount) || 0);
    const availableExp = Number(currentUser.trainerExp) || 0;

    if (requestedExp <= 0) {
      alert('배분할 경험치를 입력해주세요.');
      return;
    }

    if (requestedExp > availableExp) {
      alert(`경험치가 부족합니다!\n입력 경험치: ${requestedExp}\n보유 경험치: ${availableExp}`);
      return;
    }
    
    let maxAllowedLevel = Infinity;

    // 레벨 제한 확인
    try {
      const levelRestrictionRef = ref(database, 'gameData/levelRestriction');
      const snapshot = await get(levelRestrictionRef);
      
      if (snapshot.exists()) {
        const restriction = snapshot.val();
        
        if (restriction.enabled) {
          const { maxLevel } = restriction;
          maxAllowedLevel = Number(maxLevel) || Infinity;
          
          if (pokemon.level >= maxAllowedLevel) {
            alert(`⚠️ 레벨 제한으로 인해 더 이상 레벨업할 수 없습니다!\n현재 최대 레벨: ${maxLevel}`);
            return;
          }
        }
      }
    } catch (error) {
      console.error('레벨 제한 확인 실패:', error);
    }
    
    let newLevel = Number(pokemon.level) || 1;
    let pokemonExp = Number(pokemon.exp) || 0;
    let remainingAppliedExp = requestedExp;
    const learnedLevels = [];

    while (remainingAppliedExp > 0) {
      if (newLevel >= maxAllowedLevel) break;

      const requiredExp = getRequiredExpForLevel(newLevel);
      if (requiredExp === null) break;

      const expToNextLevel = requiredExp - pokemonExp;
      const appliedNow = Math.min(remainingAppliedExp, expToNextLevel);
      pokemonExp += appliedNow;
      remainingAppliedExp -= appliedNow;

      if (pokemonExp >= requiredExp) {
        newLevel += 1;
        pokemonExp = 0;
        learnedLevels.push(newLevel);
      }
    }

    const usedExp = requestedExp - remainingAppliedExp;
    if (usedExp <= 0) {
      alert('현재 레벨에서는 경험치를 더 배분할 수 없습니다.');
      return;
    }

    const nextTrainerExp = availableExp - usedExp;
    const levelChanged = newLevel > pokemon.level;
    
    // 파트너 포켓몬 업데이트
    if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
      const updatedPartner = { ...pokemon, level: newLevel, exp: pokemonExp };
      
      updateCurrentUser({ 
        partnerPokemon: updatedPartner,
        trainerExp: nextTrainerExp
      });
      
      alert(levelChanged
        ? `${pokemon.nickname || pokemon.name}의 레벨이 올랐다!\nLv.${pokemon.level} → Lv.${newLevel}\n사용 경험치: ${usedExp}\n남은 경험치: ${nextTrainerExp}`
        : `${pokemon.nickname || pokemon.name}에게 경험치 ${usedExp}을(를) 배분했습니다.\n남은 경험치: ${nextTrainerExp}`);
      
      // 진화 체크 및 기술 배우기
      setTimeout(async () => {
        try {
          const memberRef = ref(database, `members/${currentUser.id}`);
          const snapshot = await get(memberRef);
          
          if (snapshot.exists()) {
            const latestUser = snapshot.val();
            const updatedPokemon = latestUser.partnerPokemon;
            
            if (levelChanged && updatedPokemon && checkEvolutionOnLevelUp) {
              const shouldShowEvolutionModal = checkEvolutionOnLevelUp(updatedPokemon);
              
              if (shouldShowEvolutionModal) {
                console.log('✨ 진화 모달 표시됨! 기술 배우기는 건너뜀');
                return;
              }
            }
          }
        } catch (error) {
          console.error('Firebase 조회 실패:', error);
        }
        
      if (levelChanged && onLevelUp && pokemonLearnsets && allMoves) {
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
      
      return;
    }
    
    // 일반 포켓몬 업데이트
    const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
      p && p.uniqueId === uniqueId ? { ...p, level: newLevel, exp: pokemonExp } : p
    );
    
    updateCurrentUser({ 
      caughtPokemon: newCaughtPokemon, 
      trainerExp: nextTrainerExp
    });
    
    alert(levelChanged
      ? `${pokemon.nickname || pokemon.name}의 레벨이 올랐다!\nLv.${pokemon.level} → Lv.${newLevel}\n사용 경험치: ${usedExp}\n남은 경험치: ${nextTrainerExp}`
      : `${pokemon.nickname || pokemon.name}에게 경험치 ${usedExp}을(를) 배분했습니다.\n남은 경험치: ${nextTrainerExp}`);
    
    // 진화 체크 및 기술 배우기
    setTimeout(async () => {
      try {
        const memberRef = ref(database, `members/${currentUser.id}`);
        const snapshot = await get(memberRef);
        
        if (snapshot.exists()) {
          const latestUser = snapshot.val();
          const updatedPokemon = latestUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
          
          if (levelChanged && updatedPokemon && checkEvolutionOnLevelUp) {
            const shouldShowEvolutionModal = checkEvolutionOnLevelUp(updatedPokemon);
            
            if (shouldShowEvolutionModal) {
              console.log('✨ 진화 모달 표시됨! 기술 배우기는 건너뜀');
              return;
            }
          }
        }
      } catch (error) {
        console.error('Firebase 조회 실패:', error);
      }
      
      if (levelChanged && onLevelUp && pokemonLearnsets && allMoves) {
        const learnset = getPokemonLearnset(pokemonLearnsets, withPokemonTemplateData(pokemon));
        if (learnset && learnset.levelUpMoves) {
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
  };

  // 닉네임 변경
  const updatePokemonNickname = (uniqueId, nickname) => {
    if (!currentUser) return;
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, nickname } : p
    );
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  };

  // 아이템 주기
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
      alert('아이템이 부족합니다!'); 
      return false; 
    }
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === pokemonUniqueId);
    if (!pokemon) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return false; 
    }
    
    if (pokemon.heldItem) {
      if (!window.confirm(`${pokemon.nickname || pokemon.name}이(가) 이미 ${pokemon.heldItem}을(를) 들고 있습니다. 교체하시겠습니까?`)) {
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
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
      p && p.uniqueId === pokemonUniqueId ? { ...p, heldItem: itemName } : p
    );
    
    updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    alert(`${pokemon.nickname || pokemon.name}에게 ${itemName}을(를) 주었습니다!`);
    return true;
  };

  // 아이템 회수
  const takeItemFromPokemon = (pokemonUniqueId, allItems) => {
    if (!currentUser || !currentUser.caughtPokemon || !currentUser.inventory) {
      alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === pokemonUniqueId);
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
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p =>
      p && p.uniqueId === pokemonUniqueId ? { ...p, heldItem: null } : p
    );
    
    updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    alert(`${pokemon.nickname || pokemon.name}에게서 ${itemName}을(를) 회수했습니다!`);
  };

  // 엔트리 순서 변경
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
      alert('더 이상 노력치를 올릴 수 없습니다!');
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
    giveItemToPokemon,
    takeItemFromPokemon,
    reorderPartyPokemon,
    increaseEffort
  };
};

export default usePokemonManagement;
