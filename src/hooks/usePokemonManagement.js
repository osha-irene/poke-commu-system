// src/hooks/usePokemonManagement.js

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

  // 엔트리 이동
  const movePokemonToParty = (uniqueId) => {
    console.log('🔥 movePokemonToParty 시작:', uniqueId);
    
    if (!currentUser) {
      console.error('❌ currentUser가 없습니다!');
      return;
    }
    
    console.log('📦 현재 전체 배열:', currentUser.caughtPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    console.log('📍 포켓몬 인덱스:', pokemonIndex);
    
    if (pokemonIndex === -1) { 
      console.error('❌ 포켓몬을 찾을 수 없습니다!');
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (pokemonIndex < 6) {
      console.log('⚠️ 이미 엔트리에 있습니다');
      return; 
    }
    
    const party = currentUser.caughtPokemon.slice(0, 6);
    const box = currentUser.caughtPokemon.slice(6);
    
    console.log('📋 분리된 엔트리:', party.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    console.log('📋 분리된 박스:', box.map((p, i) => `[${i}] ${p?.name}`));
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (party[i] === null) { 
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
    
    console.log('🎯 이동할 포켓몬:', pokemon.name, '(박스 내 인덱스:', boxIndex, ')');
    
    party[emptySlotIndex] = pokemon;
    box.splice(boxIndex, 1);
    const finalPokemon = [...party, ...box];
    
    console.log('✅ 최종 엔트리:', party.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    console.log('✅ 최종 박스:', box.map((p, i) => `[${i + 6}] ${p?.name}`));
    console.log('✅ 최종 전체 배열 길이:', finalPokemon.length);
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
    
    console.log('✅ movePokemonToParty 완료!');
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
    const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
    const updatedBox = [...box, pokemon];
    const finalPokemon = [...sortedParty, ...updatedBox];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
  };

  // 방생
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;

    // 파트너 포켓몬 체크
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
      const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
      const finalPokemon = [...sortedParty, ...box];
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      newCaughtPokemon.splice(pokemonIndex, 1);
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    }
    
    alert(`${pokemon.nickname || pokemon.name}을(를) 방생했습니다.`);
  };

  // 파트너 설정
  const setPartnerPokemon = (uniqueId, isPartner) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) {
      alert('포켓몬을 찾을 수 없습니다!');
      return;
    }
    
    if (isPartner) {
      const newPartnerPokemon = { ...pokemon, isPartner: true };
      const newCaughtPokemon = currentUser.caughtPokemon.filter(p => p && p.uniqueId !== uniqueId);
      
      let finalCaughtPokemon = newCaughtPokemon;
      if (currentUser.partnerPokemon) {
        const oldPartner = { ...currentUser.partnerPokemon, isPartner: false };
        const party = finalCaughtPokemon.slice(0, 6);
        const box = finalCaughtPokemon.slice(6);
        
        let emptySlotIndex = -1;
        for (let i = 0; i < 6; i++) {
          if (party[i] === null) {
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
      
    } else {
      if (!currentUser.partnerPokemon || currentUser.partnerPokemon.uniqueId !== uniqueId) {
        return;
      }
      
      const unsetPartner = { ...currentUser.partnerPokemon, isPartner: false };
      const party = currentUser.caughtPokemon.slice(0, 6);
      const box = currentUser.caughtPokemon.slice(6);
      
      let emptySlotIndex = -1;
      for (let i = 0; i < 6; i++) {
        if (party[i] === null) {
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
    }
  };

  // 레벨업// usePokemonManagement.js의 useRareCandy 함수를 이렇게 수정하세요

const useRareCandy = async (uniqueId, onLevelUp) => {
  if (!currentUser) return;
  
  const candyItem = currentUser.inventory.find(item => item.name === '이상한사탕');
  if (!candyItem || candyItem.count <= 0) { 
    alert('이상한사탕이 없습니다!'); 
    return; 
  }
  
  // 파트너 포켓몬 체크
  let pokemon;
  if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
    pokemon = currentUser.partnerPokemon;
  } else {
    pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
  }
  
  if (!pokemon) return;
  
  // ⭐ 레벨 제한 확인
  try {
    const { ref, get } = await import('firebase/database');
    const { database } = await import('../firebase');
    
    const levelRestrictionRef = ref(database, 'gameData/levelRestriction');
    const snapshot = await get(levelRestrictionRef);
    
    if (snapshot.exists()) {
      const restriction = snapshot.val();
      
      if (restriction.enabled) {
        const { maxLevel } = restriction;
        
        // 이미 최대 레벨이면 사용 불가
        if (pokemon.level >= maxLevel) {
          alert(`⚠️ 레벨 제한으로 인해 더 이상 레벨업할 수 없습니다!\n현재 최대 레벨: ${maxLevel}`);
          return;
        }
      }
    }
  } catch (error) {
    console.error('레벨 제한 확인 실패:', error);
  }
  
  const newLevel = pokemon.level + 1;
  
  // 파트너 포켓몬 업데이트
  if (currentUser.partnerPokemon?.uniqueId === uniqueId) {
    const updatedPartner = { ...pokemon, level: newLevel };
    
    const newInventory = currentUser.isSuperAdmin
      ? currentUser.inventory
      : currentUser.inventory.map(item =>
          item.name === '이상한사탕' 
            ? { ...item, count: item.count - 1 }
            : item
        ).filter(item => item.count > 0);
    
    updateCurrentUser({ 
      partnerPokemon: updatedPartner,
      inventory: newInventory 
    });
    
    alert(`${pokemon.nickname || pokemon.name}의 레벨이 올랐다!\nLv.${pokemon.level} → Lv.${newLevel}`);
    
    if (onLevelUp && pokemonLearnsets && allMoves) {
      const learnset = pokemonLearnsets[pokemon.number];
      if (learnset) {
        const newMoves = learnset
          .filter(entry => entry.level === newLevel)
          .map(entry => allMoves.find(move => move.id === entry.moveId))
          .filter(Boolean);
        
        if (newMoves.length > 0) {
          onLevelUp(uniqueId, newLevel, newMoves);
        }
      }
    }
    return;
  }
  
  // 일반 포켓몬 업데이트
  const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
    p && p.uniqueId === uniqueId ? { ...p, level: newLevel } : p
  );
  
  const newInventory = currentUser.isSuperAdmin
    ? currentUser.inventory
    : currentUser.inventory.map(item =>
        item.name === '이상한사탕' 
          ? { ...item, count: item.count - 1 }
          : item
      ).filter(item => item.count > 0);
  
  updateCurrentUser({ 
    caughtPokemon: newCaughtPokemon, 
    inventory: newInventory 
  });
  
  alert(`${pokemon.nickname || pokemon.name}의 레벨이 올랐다!\nLv.${pokemon.level} → Lv.${newLevel}`);
  
  if (onLevelUp && pokemonLearnsets && allMoves) {
    const learnset = pokemonLearnsets[pokemon.number.toString()];
    if (learnset && learnset.levelUpMoves) {
      const newMoves = learnset.levelUpMoves
        .filter(entry => entry.level === newLevel)
        .map(entry => allMoves.find(move => move.id === entry.moveId))
        .filter(Boolean);
      
      if (newMoves.length > 0) {
        onLevelUp(uniqueId, newLevel, newMoves);
      }
    }
  }
  
  // 진화 체크
  if (checkEvolutionOnLevelUp) {
    const evolutionResult = checkEvolutionOnLevelUp(
      newCaughtPokemon.find(p => p && p.uniqueId === uniqueId) || 
      (currentUser.partnerPokemon?.uniqueId === uniqueId ? currentUser.partnerPokemon : null)
    );
    
    if (evolutionResult) {
      console.log('레벨업 진화 가능:', evolutionResult);
    }
  }
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
      console.error('❌ currentUser 또는 데이터가 없습니다:', currentUser);
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
    
    const newInventory = [...currentUser.inventory];
    if (itemIndex !== -1) {
      newInventory[itemIndex] = { ...newInventory[itemIndex], count: newInventory[itemIndex].count + 1 };
    } else {
      const itemData = allItems.find(i => i.name === itemName);
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
    
    console.log('🔄 reorderPartyPokemon 호출');
    console.log('📦 새로운 엔트리 순서:', reorderedParty.map(p => p?.name || 'null'));
    
    const box = currentUser.caughtPokemon.slice(6);
    const partyWithNulls = [...reorderedParty];
    while (partyWithNulls.length < 6) {
      partyWithNulls.push(null);
    }
    
    const finalPokemon = [...partyWithNulls.slice(0, 6), ...box];
    console.log('✅ 최종 배열:', finalPokemon.map((p, i) => `[${i}] ${p?.name || 'null'}`));
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
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
    reorderPartyPokemon
  };
};

export default usePokemonManagement;