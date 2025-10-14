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
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (pokemon.inParty) { 
      alert('이미 엔트리에 있습니다!'); 
      return; 
    }
    
    // 엔트리 포켓몬 수 확인 (파트너 제외)
    const partyCount = currentUser.caughtPokemon.filter(p => p && !p.isPartner && p.inParty).length;
    
    if (partyCount >= 6) { 
      alert('엔트리가 가득 찼습니다! (최대 6마리)'); 
      return; 
    }
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, inParty: true } : p
    );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    alert('엔트리로 이동했습니다!');
  };

  // 박스 이동
  const movePokemonToBox = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) { 
      alert('포켓몬을 찾을 수 없습니다!'); 
      return; 
    }
    
    if (!pokemon.inParty) { 
      alert('이미 박스에 있습니다!'); 
      return; 
    }
    
    // 파트너 포켓몬은 박스로 이동 불가
    if (pokemon.isPartner) {
      alert('💖 파트너 포켓몬은 박스로 이동할 수 없습니다!');
      return;
    }
    
    const newCaughtPokemon = currentUser.caughtPokemon.map(p => 
      p && p.uniqueId === uniqueId ? { ...p, inParty: false } : p
    );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
    alert('박스로 이동했습니다!');
  };

  // 방생
  const releasePokemon = (uniqueId) => {
    if (!currentUser) return;
    
    const pokemon = currentUser.caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    if (pokemon.isPartner) {
      alert('💖 파트너 포켓몬은 방생할 수 없습니다!');
      return;
    }

    const newCaughtPokemon = currentUser.caughtPokemon.filter(p => 
      !p || p.uniqueId !== uniqueId
    );
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
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
        return { ...p, isPartner, inParty: isPartner ? true : p.inParty };
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
    
    console.log('🎯 배울 수 있는 기술:', newMoves);
    
    // 콜백 실행
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