// src/hooks/useMoves.js

export const useMoves = (currentUser, updateCurrentUser, movesData) => {
  
  // 기술 배우기
  const learnMove = (pokemonUniqueId, move) => {
    if (!currentUser) return false;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(
      p => p && p.uniqueId === pokemonUniqueId
    );
    
    if (pokemonIndex === -1) return false;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    const currentMoves = pokemon.moves || [];
    
    // 이미 배운 기술인지 확인
    if (currentMoves.some(m => m.moveId === move.id)) {
      alert('이미 배운 기술입니다!');
      return false;
    }
    
    // 기술이 4개 미만이면 바로 추가
    if (currentMoves.length < 4) {
      const newMove = {
        moveId: move.id,
        name: move.name,
        nameEn: move.nameEn,
        type: move.type,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
        currentPp: move.pp,
        category: move.category,
        learnedAt: pokemon.level
      };
      
      const newCaughtPokemon = [...currentUser.caughtPokemon];
      newCaughtPokemon[pokemonIndex] = {
        ...pokemon,
        moves: [...currentMoves, newMove]
      };
      
      updateCurrentUser({ caughtPokemon: newCaughtPokemon });
      return true;
    }
    
    // 4개 꽉 찬 경우 - false 반환하고 UI에서 처리
    return 'full';
  };
  
  // 기술 삭제
  const forgetMove = (pokemonUniqueId, moveId) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(
      p => p && p.uniqueId === pokemonUniqueId
    );
    
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    const newMoves = (pokemon.moves || []).filter(m => m.moveId !== moveId);
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    newCaughtPokemon[pokemonIndex] = {
      ...pokemon,
      moves: newMoves
    };
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  };
  
  // 기술 교체 (4개 꽉 찼을 때)
  const replaceMove = (pokemonUniqueId, oldMoveId, newMove) => {
    if (!currentUser) return;
    
    const pokemonIndex = currentUser.caughtPokemon.findIndex(
      p => p && p.uniqueId === pokemonUniqueId
    );
    
    if (pokemonIndex === -1) return;
    
    const pokemon = currentUser.caughtPokemon[pokemonIndex];
    const currentMoves = pokemon.moves || [];
    
    const newMoveData = {
      moveId: newMove.id,
      name: newMove.name,
      nameEn: newMove.nameEn,
      type: newMove.type,
      power: newMove.power,
      accuracy: newMove.accuracy,
      pp: newMove.pp,
      currentPp: newMove.pp,
      category: newMove.category,
      learnedAt: pokemon.level
    };
    
    const updatedMoves = currentMoves.map(m => 
      m.moveId === oldMoveId ? newMoveData : m
    );
    
    const newCaughtPokemon = [...currentUser.caughtPokemon];
    newCaughtPokemon[pokemonIndex] = {
      ...pokemon,
      moves: updatedMoves
    };
    
    updateCurrentUser({ caughtPokemon: newCaughtPokemon });
  };
  
  // 레벨업 시 자동으로 배울 수 있는 기술 확인
  const getAvailableMovesForLevel = (pokemonNumber, level) => {
    if (!movesData?.pokemonLearnsets) return [];
    
    const learnset = movesData.pokemonLearnsets[pokemonNumber.toString()];
    if (!learnset) return [];
    
    return learnset.levelUpMoves
      .filter(lm => lm.level === level)
      .map(lm => movesData.moves.find(m => m.id === lm.moveId))
      .filter(Boolean);
  };
  
  // 포켓몬이 배울 수 있는 모든 기술 (현재 레벨 기준)
  const getAllLearnableMoves = (pokemonNumber, currentLevel) => {
    if (!movesData?.pokemonLearnsets) return [];
    
    const learnset = movesData.pokemonLearnsets[pokemonNumber.toString()];
    if (!learnset) return [];
    
    return learnset.levelUpMoves
      .filter(lm => lm.level <= currentLevel)
      .map(lm => ({
        ...movesData.moves.find(m => m.id === lm.moveId),
        learnLevel: lm.level
      }))
      .filter(Boolean);
  };
  
  return {
    learnMove,
    forgetMove,
    replaceMove,
    getAvailableMovesForLevel,
    getAllLearnableMoves
  };
};