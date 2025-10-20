// src/hooks/useMoves.js

export const useMoves = (currentUser, updateCurrentUser, allMoves, pokemonLearnsets) => {
  
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
    
    // 이미 배운 기술인지 확인
    if (!oldMoveId && currentMoves.some(m => m.moveId === moveData.id)) {
      alert('이미 배운 기술입니다!');
      return false;
    }
    
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
        return 'full'; // 4개 꽉 찬 경우
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
    return learnMove(pokemonUniqueId, newMove, oldMoveId);
  };
  
  // 레벨업 시 자동으로 배울 수 있는 기술 확인
  const getAvailableMovesForLevel = (pokemonNumber, level) => {
    if (!pokemonLearnsets) return [];
    
    const learnset = pokemonLearnsets[pokemonNumber.toString()];
    if (!learnset) return [];
    
    return learnset.levelUpMoves
      ?.filter(lm => lm.level === level)
      .map(lm => {
        const move = allMoves.find(m => m.id === lm.moveId);
        return move;
      })
      .filter(Boolean) || [];
  };
  
  // 포켓몬이 배울 수 있는 모든 기술 (현재 레벨 기준)
  const getAllLearnableMoves = (pokemonNumber, currentLevel) => {
    if (!pokemonLearnsets) return [];
    
    const learnset = pokemonLearnsets[pokemonNumber.toString()];
    if (!learnset) return [];
    
    return learnset.levelUpMoves
      ?.filter(lm => lm.level <= currentLevel)
      .map(lm => {
        const move = allMoves.find(m => m.id === lm.moveId);
        return move ? { ...move, learnLevel: lm.level } : null;
      })
      .filter(Boolean) || [];
  };

  // 포획 시 시작 기술 가져오기
  const getStartingMoves = (pokemonNumber, currentLevel, movesData) => {
    if (!movesData?.pokemonLearnsets) return [];
    
    const learnset = movesData.pokemonLearnsets[pokemonNumber.toString()];
    if (!learnset) return [];
    
    // 현재 레벨 이하에서 배울 수 있는 기술 중 최신 4개
    const availableMoves = learnset.levelUpMoves
      .filter(lm => lm.level <= currentLevel)
      .sort((a, b) => b.level - a.level)
      .slice(0, 4);
    
    // ID와 개별 상태만 저장
    return availableMoves.map(lm => {
      // moves.json에서 PP 가져오기
      const moveData = movesData.moves.find(m => m.id === lm.moveId);
      
      return {
        moveId: lm.moveId,
        currentPp: moveData?.pp || 0,
        learnedAt: lm.level
      };
    });
  };
  
  return {
    learnMove,
    forgetMove,
    replaceMove,
    getAvailableMovesForLevel,
    getAllLearnableMoves,
    getStartingMoves
  };
};