// src/hooks/usePokemonManagement.js

export const usePokemonManagement = (
  currentUser, 
  updateCurrentUser, 
  allPokemonMaster, 
  setSharedPokedexData, 
  sharedPokedexData,
  pokemonLearnsets,  // ⭐ 추가
  allMoves           // ⭐ 추가
) => {

  // 포켓몬 잡기
  const handleCatchSuccess = (pokemon, ballUsed, setFirstCatchPokemon, movesData, allPokemonMaster) => {
  if (!currentUser) return;
  
  const nonPartnerCount = currentUser.caughtPokemon.filter(p => p && !p.isPartner).length;
  if (nonPartnerCount >= 20) {
    alert('⚠️ 파트너를 제외한 포켓몬이 20마리입니다!\n더 이상 포켓몬을 잡을 수 없습니다.');
    return;
  }
  
  const pokemonTemplate = allPokemonMaster.find(p => 
    p.number === (pokemon.number || pokemon.originalNumber)
  );
  
  if (!pokemonTemplate) {
    alert('포켓몬 정보를 찾을 수 없습니다!');
    return;
  }
  
  const level = Math.floor(Math.random() * 20) + 5; // ⭐ level 변수 선언
  
  const newPokemon = {
    uniqueId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pokemonId: pokemonTemplate.id,
    name: pokemonTemplate.name,
    nameEn: pokemonTemplate.nameEn,
    number: pokemonTemplate.number,
    type: pokemonTemplate.type,
    type2: pokemonTemplate.type2 || null,
    level: level,
    hp: pokemonTemplate.baseHp,
    maxHp: pokemonTemplate.baseHp,
    exp: 0,
    friendship: 0,
    heldItem: null,
    moves: getStartingMoves(pokemonTemplate.number, level, movesData), // ⭐ movesData 전달
    caughtWithBall: ballUsed.name,
    isPartner: false,
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 },
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    imageUrl: pokemonTemplate.imageUrl,
    iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemonTemplate.number}.png`,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonTemplate.number}.png`
  };
    
    const updatedCaughtPokemon = [...currentUser.caughtPokemon, newPokemon];
    
    const updatedInventory = currentUser.isSuperAdmin 
      ? currentUser.inventory
      : currentUser.inventory.map(item => 
          (item.itemId === ballUsed.id || item.name === ballUsed.name)
            ? { ...item, count: Math.max(0, item.count - 1) }
            : item
        );
    
    updateCurrentUser({
      caughtPokemon: updatedCaughtPokemon,
      inventory: updatedInventory
    });

    const isFirstCatch = !sharedPokedexData[pokemonTemplate.number];
    if (isFirstCatch) {
      setFirstCatchPokemon(pokemonTemplate);
    }
  };

  // 엔트리 이동
  const movePokemonToParty = (uniqueId) => {
    if (!currentUser) return;
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === uniqueId);
    if (pokemonIndex === -1) { alert('포켓몬을 찾을 수 없습니다!'); return; }
    if (pokemonIndex < 6) { alert('이미 엔트리에 있습니다!'); return; }
    
    let emptySlotIndex = -1;
    for (let i = 0; i < 6; i++) {
      if (currentUser.caughtPokemon[i] === null) { emptySlotIndex = i; break; }
    }
    if (emptySlotIndex === -1) { alert('엔트리가 가득 찼습니다!'); return; }
    
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
    if (pokemonIndex === -1) { alert('포켓몬을 찾을 수 없습니다!'); return; }
    if (pokemonIndex >= 6) { alert('이미 박스에 있습니다!'); return; }
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    const pokemon = newCaughtPokemon[pokemonIndex];
    newCaughtPokemon[pokemonIndex] = null;
    newCaughtPokemon.push(pokemon);
    
    const party = newCaughtPokemon.slice(0, 6);
    const box = newCaughtPokemon.slice(6);
    const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
    const finalPokemon = [...sortedParty, ...box];
    
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
      const sortedParty = [...party.filter(p => p !== null), ...party.filter(p => p === null)];
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
// ⭐ 이렇게 되어있어야 함
const useRareCandy = (uniqueId, onLevelUp) => {  // onLevelUp 파라미터
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
  
  // ⭐ 배울 수 있는 기술 확인
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
  
  if (newMoves.length > 0 && onLevelUp) {
    console.log('✅ 모달 띄우기!');
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

  // 기본 습득 기술
// ⭐ 포획 시 시작 기술 가져오기
const getStartingMoves = (pokemonNumber, currentLevel, movesData) => {
  if (!movesData?.pokemonLearnsets) return [];
  
  const learnset = movesData.pokemonLearnsets[pokemonNumber.toString()];
  if (!learnset) return [];
  
  // 현재 레벨 이하에서 배울 수 있는 기술 중 최신 4개
  const availableMoves = learnset.levelUpMoves
    .filter(lm => lm.level <= currentLevel)
    .sort((a, b) => b.level - a.level)
    .slice(0, 4);
  
  // ⭐ ID와 개별 상태만 저장
  return availableMoves.map(lm => {
    // moves.json에서 PP 가져오기
    const moveData = movesData.moves.find(m => m.id === lm.moveId);
    
    return {
      moveId: lm.moveId,                          // ID만
      currentPp: moveData?.pp || 0,               // 현재 PP (초기값)
      learnedAt: lm.level                         // 배운 레벨
    };
  });
};

  // 아이템 주기/회수
  const giveItemToPokemon = (pokemonUniqueId, itemName, allItems) => {
    if (!currentUser) return;
    
    const itemIndex = currentUser.inventory.findIndex(i => i.name === itemName);
    if (itemIndex === -1) { alert('해당 아이템이 없습니다!'); return false; }
    
    const item = currentUser.inventory[itemIndex];
    if (item.count <= 0) { alert('아이템이 부족합니다!'); return false; }
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === pokemonUniqueId);
    if (pokemonIndex === -1) { alert('포켓몬을 찾을 수 없습니다!'); return false; }
    
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
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(p => p && p.uniqueId === pokemonUniqueId);
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    if (!pokemon.heldItem) { alert('이 포켓몬은 아이템을 들고 있지 않습니다!'); return; }
    
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

  // 기술 배우기/교체
const learnMove = (pokemonUniqueId, moveData, oldMoveId = null) => {
  if (!currentUser) return false;
  
  console.log('🎓 === learnMove 함수 실행 ===');
  console.log('🎓 pokemonUniqueId:', pokemonUniqueId);
  console.log('🎓 moveData:', moveData);
  console.log('🎓 oldMoveId:', oldMoveId);
  
  const pokemonIndex = currentUser.caughtPokemon.findIndex(
    p => p && p.uniqueId === pokemonUniqueId
  );
  
  if (pokemonIndex === -1) {
    alert('포켓몬을 찾을 수 없습니다!');
    return false;
  }
  
  const pokemon = currentUser.caughtPokemon[pokemonIndex];
  const currentMoves = pokemon.moves || [];
  
  console.log('🎓 현재 기술:', currentMoves);
  
  let newMoves;
  
  if (oldMoveId) {
    // 기술 교체
    console.log('🎓 기술 교체 모드');
    newMoves = currentMoves.map(move => 
      move.moveId === oldMoveId 
        ? {
            moveId: moveData.id,
            currentPp: moveData.pp,
            learnedAt: pokemon.level
          }
        : move
    );
  } else {
    // 기술 추가 (빈 슬롯에)
    console.log('🎓 기술 추가 모드');
    if (currentMoves.length >= 4) {
      alert('기술이 가득 찼습니다!');
      return false;
    }
    
    newMoves = [
      ...currentMoves,
      {
        moveId: moveData.id,
        currentPp: moveData.pp,
        learnedAt: pokemon.level
      }
    ];
  }
  
  console.log('🎓 새로운 기술 배열:', newMoves);
  
  const newCaughtPokemon = [...currentUser.caughtPokemon];
  newCaughtPokemon[pokemonIndex] = {
    ...pokemon,
    moves: newMoves
  };
  
  updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  
  const moveName = moveData.name || '새 기술';
  alert(`${pokemon.nickname || pokemon.name}이(가) ${moveName}을(를) 배웠습니다!`);
  
  return true;
};

// return 문에 추가:
return {
  handleCatchSuccess,
  movePokemonToParty,
  movePokemonToBox,
  releasePokemon,
  setPartnerPokemon,
  useRareCandy,
  updatePokemonNickname,
  giveItemToPokemon,
  takeItemFromPokemon,
  getStartingMoves,
  learnMove,
  pokemonLearnsets,
  allMoves
};
};