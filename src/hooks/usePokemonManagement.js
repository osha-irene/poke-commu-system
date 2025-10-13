// src/hooks/usePokemonManagement.js

const usePokemonManagement = (
  currentUser, 
  updateCurrentUser, 
  allPokemonMaster, 
  setSharedPokedexData, 
  sharedPokedexData,
  pokemonLearnsets,
  allMoves,
  checkEvolutionOnLevelUp  // ⭐ 진화 체크 함수 추가
) => {

  // 엔트리 이동
  const movePokemonToParty = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    if (pokemonIndex < 6) { 
      alert('이미 엔트리에 있습니다!'); 
      return; 
    }
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (currentUser.caughtPokemon[i] === null) { 
        emptySlotIndex = i; 
        break; 
      }
    }
    if (emptySlotIndex === -1) { 
      alert('엔트리가 가득 찼습니다!'); 
      return; 
    }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    newCaughtPokemon[emptySlotIndex] = pokemon;
    newCaughtPokemon.splice(pokemonIndex, 1);
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    alert('엔트리로 이동했습니다!');
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
      alert('이미 박스에 있습니다!'); 
      return; 
    }
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    
    // 파트너 포켓몬은 박스로 이동 불가
    if (pokemon.isPartner) {
      alert('💖 파트너 포켓몬은 박스로 이동할 수 없습니다!');
      return;
    }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    
    // 엔트리에서 해당 포켓몬을 null로 변경
    newCaughtPokemon[pokemonIndex] = null;
    
    // 엔트리(0-5)와 박스(6~) 분리
    const party = newCaughtPokemon.slice(0, 6);
    const box = newCaughtPokemon.slice(6);
    
    // 엔트리를 정렬: null이 아닌 것들을 앞으로, null을 뒤로
    const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
    
    // 박스 끝에 포켓몬 추가
    const updatedBox = [...box, pokemon];
    
    // 최종 배열 생성
    const finalPokemon = [...sortedParty, ...updatedBox];
    
    updateCurrentUser({ caughtPokemon: finalPokemon });
    alert('박스로 이동했습니다!');
  };

  // 방생
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    if (pokemon.isPartner) {
      alert('💖 파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }

    const newCaughtPokemon = [...currentUser.caughtPokemon];
    
    if (pokemonIndex < 6) {
      newCaughtPokemon[pokemonIndex] = null;
      const party = newCaughtPokemon.slice(0, 6);
      const box = newCaughtPokemon.slice(6);
      const sortedParty = [
        ...party.filter(p => p !== null),
        ...party.filter(p => p === null)
      ];
      const finalPokemon = [...sortedParty, ...box];
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      newCaughtPokemon.splice(pokemonIndex, 1);
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    }
  };

  // 파트너 설정
  const setPartnerPokemon = (uniqueId, isPartner) => {
    if (!currentUser) return;
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => {
      if (!p) return p;
      if (isPartner && p.isPartner && p.uniqueId !== uniqueId) {
        return { ...p, isPartner: false };
      }
      if (p.uniqueId === uniqueId) {
        return { ...p, isPartner };
      }
      return p;
    });
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    
    if (isPartner) {
      alert('💖 파트너 포켓몬으로 설정되었습니다!');
    } else {
      alert('파트너 설정이 해제되었습니다.');
    }
  };

  // 레벨업
  const useRareCandy = (uniqueId, onLevelUp) => {
    if (!currentUser) return;
    const candyItem = currentUser.inventory.find(item => item.name === '이상한사탕');
    if (!candyItem || candyItem.count <= 0) { 
      alert('이상한사탕이 없습니다!'); 
      return; 
    }
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    const newLevel = pokemon.level + 1;
    
    console.log('🎯 레벨업:', newLevel);
    console.log('🎯 포켓몬 번호:', pokemon.number);
    
    // 레벨업
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, level: newLevel } : p
    );
    
    const newInventory = currentUser.isSuperAdmin
      ? currentUser.inventory
      : currentUser.inventory.map(item =>
          item.name === '이상한사탕' ? { ...item, count: item.count - 1 } : item
        );
    
    updateCurrentUser({ 
      caughtPokemon: newCaughtPokemon, 
      inventory: newInventory 
    });
    
    // 배울 수 있는 기술 확인
    console.log('🎯 pokemonLearnsets:', pokemonLearnsets);
    const learnset = pokemonLearnsets[pokemon.number.toString()];
    console.log('🎯 learnset:', learnset);
    
    const newMoves = learnset?.levelUpMoves
      ?.filter(lm => lm.level === newLevel)
      .map(lm => {
        console.log('🎯 찾는 moveId:', lm.moveId);
        const move = allMoves.find(m => m.id === lm.moveId);
        console.log('🎯 찾은 move:', move);
        return move;
      })
      .filter(Boolean) || [];
    
    console.log('🎯 배울 수 있는 기술:', newMoves);
    
    // ⭐ 기술이 있든 없든 항상 콜백 실행 (진화 체크를 위해)
    if (onLevelUp) {
      console.log('✅ 레벨업 콜백 실행 (기술:', newMoves.length, '개)');
      onLevelUp(uniqueId, newLevel, newMoves);
    } else {
      alert(`레벨이 ${newLevel}로 올랐습니다!`);
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

  // 아이템 주기/회수
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
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === pokemonUniqueId);
    if (pokemonIndex === -1) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return false; 
    }
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    
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
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    newCaughtPokemon[pokemonIndex] = { ...pokemon, heldItem: itemName };
    
    updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    alert(`${pokemon.nickname || pokemon.name}에게 ${itemName}을(를) 주었습니다!`);
    return true;
  };

  const takeItemFromPokemon = (pokemonUniqueId, allItems) => {
    if (!currentUser || !currentUser.caughtPokemon || !currentUser.inventory) {
  
      alert('오류가 발생했습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === pokemonUniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
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
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    newCaughtPokemon[pokemonIndex] = { ...pokemon, heldItem: null };
    
    updateCurrentUser({ inventory: newInventory, caughtPokemon: newCaughtPokemon });
    alert(`${pokemon.nickname || pokemon.name}에게서 ${itemName}을(를) 회수했습니다!`);
  };

return {
  movePokemonToParty,
  movePokemonToBox,
  releasePokemon,
  setPartnerPokemon,
  useRareCandy,
  updatePokemonNickname,
  giveItemToPokemon,
  takeItemFromPokemon
};

};

export default usePokemonManagement;