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
    
    console.log('📦 전체 포켓몬 수:', currentUser.caughtPokemon.length);
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    console.log('📍 포켓몬 인덱스:', pokemonIndex);
    
    if (pokemonIndex === -1) { 
      console.error('❌ 포켓몬을 찾을 수 없습니다!');
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    // ⭐ 이미 엔트리에 있으면 조용히 리턴
    if (pokemonIndex < 6) {
      console.log('⚠️ 이미 엔트리에 있습니다 (index:', pokemonIndex, ')');
      return; 
    }
    
    // 빈 슬롯 찾기
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (currentUser.caughtPokemon[i] === null) { 
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
    
    // 포켓몬을 빈 슬롯으로 이동
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    
    console.log('🎯 이동할 포켓몬:', pokemon.name);
    
    newCaughtPokemon[emptySlotIndex] = pokemon;
    newCaughtPokemon.splice(pokemonIndex, 1);
    
    console.log('✅ 업데이트 전 엔트리:', newCaughtPokemon.slice(0, 6).map(p => p?.name || 'null'));
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    
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
    
    // ⭐ 이미 박스에 있으면 조용히 리턴
    if (pokemonIndex >= 6) { 
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
  };

  // 방생 (⭐ 박스 포켓몬 자동 승격 방지)
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    if (!pokemon) return;
    
    if (pokemon.isPartner) {
      alert('💖 파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }

    const newCaughtPokemon = [...currentUser.caughtPokemon];
    
    // ⭐ 엔트리 포켓몬(0-5)을 방생하는 경우
    if (pokemonIndex < 6) {
      // 해당 슬롯을 null로 변경하고, 엔트리만 정렬
      newCaughtPokemon[pokemonIndex] = null;
      
      const party = newCaughtPokemon.slice(0, 6);
      const box = newCaughtPokemon.slice(6);
      
      // 엔트리만 정렬: null이 아닌 것들을 앞으로
      const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
      
      // 박스는 그대로 유지!
      const finalPokemon = [...sortedParty, ...box];
      
      updateCurrentUser({ caughtPokemon: finalPokemon });
    } else {
      // ⭐ 박스 포켓몬(6~)을 방생하는 경우: 그냥 제거
      newCaughtPokemon.splice(pokemonIndex, 1);
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    }
    
    alert(`${pokemon.nickname || pokemon.name}을(를) 방생했습니다.`);
  };

  // 파트너 설정
  const setPartnerPokemon = (uniqueId, isPartner) => {
    if (!currentUser) return;
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => {
      if (!p) return p;
      
      // 다른 포켓몬의 파트너 해제
      if (isPartner && p.isPartner && p.uniqueId !== uniqueId) {
        return { ...p, isPartner: false };
      }
      
      // 선택한 포켓몬 파트너 설정/해제
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
    
    // 레벨업
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, level: newLevel } : p
    );
    
    const newInventory = currentUser.isSuperAdmin
      ? currentUser.inventory
      : currentUser.inventory.map(item =>
          item.name === '이상한사탕' ? { ...item, count: item.count - 1 } : item
        ).filter(item => item.count > 0);
    
    updateCurrentUser({ 
      caughtPokemon: newCaughtPokemon, 
      inventory: newInventory 
    });
    
    // 배울 수 있는 기술 확인
    const learnset = pokemonLearnsets[pokemon.number.toString()];
    
    const newMoves = learnset?.levelUpMoves
      ?.filter(lm => lm.level === newLevel)
      .map(lm => {
        const move = allMoves.find(m => m.id === lm.moveId);
        return move;
      })
      .filter(Boolean) || [];
    
    // 콜백 실행
    if (onLevelUp) {
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