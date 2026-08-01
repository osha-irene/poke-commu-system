// src/hooks/useMoves.js

import { getPokemonLearnset } from '../../utils/pokemonLearnsets';

export const useMoves = (currentUser, updateCurrentUser, updateOwnedPokemonByUniqueId, allMoves, pokemonLearnsets) => {

  // 기술 배우기/교체
  // ⭐ 클로저에 갇힌 caughtPokemon/partnerPokemon 스냅샷을 기준으로 통째로 덮어쓰면, 기술을
  // 연달아 여러 개 가르칠 때(또는 다른 포켓몬에게 동시에) 나중 호출이 앞선 변경을 지운 배열로
  // 되돌려버릴 수 있다. 항상 Firebase의 최신 데이터를 기준으로 트랜잭션으로 병합한다.
  const learnMove = async (pokemonUniqueId, moveData, oldMoveId = null) => {
    if (!currentUser) return false;

    console.log('🎓 === learnMove 함수 실행 ===');
    console.log('🎓 pokemonUniqueId:', pokemonUniqueId);
    console.log('🎓 moveData:', moveData);
    console.log('🎓 oldMoveId:', oldMoveId);

    let outcome = null;
    let pokemonLabel = '포켓몬';

    const result = await updateOwnedPokemonByUniqueId(pokemonUniqueId, (pokemon) => {
      pokemonLabel = pokemon.nickname || pokemon.name || pokemonLabel;
      const currentMoves = pokemon.moves || [];

      if (!oldMoveId && currentMoves.some(m => m.moveId === moveData.id)) {
        outcome = 'already-known';
        return undefined; // 트랜잭션 중단
      }

      let newMoves;
      if (oldMoveId) {
        newMoves = currentMoves.map(move =>
          move.moveId === oldMoveId
            ? { moveId: moveData.id, currentPp: moveData.pp, learnedAt: pokemon.level }
            : move
        );
      } else {
        if (currentMoves.length >= 4) {
          outcome = 'full';
          return undefined; // 트랜잭션 중단
        }
        newMoves = [
          ...currentMoves,
          { moveId: moveData.id, currentPp: moveData.pp, learnedAt: pokemon.level }
        ];
      }

      // ⭐ 기술머신/하트비늘 등으로 한 번 배운 적 있는 기술은 이 포켓몬에게 영구히 기억해둔다.
      // 나중에 기술을 잊어도(forgetMove는 moves에서만 지움) unlockedMoveIds는 그대로 남아서,
      // MoveSelectModal이 레벨 제한 모드에서도 재습득 후보로 다시 보여줄 수 있다 - 기술머신/
      // 하트비늘을 또 사지 않아도 되게 하기 위함.
      const unlockedMoveIds = [...new Set([...(pokemon.unlockedMoveIds || []), moveData.id])];

      outcome = 'learned';
      return { ...pokemon, moves: newMoves, unlockedMoveIds };
    });

    if (outcome === 'already-known') {
      alert('이미 배운 기술입니다!');
      return false;
    }

    if (outcome === 'full') {
      alert('기술이 가득 찼습니다!');
      return 'full';
    }

    if (!result.committed || outcome !== 'learned') {
      alert('포켓몬을 찾을 수 없습니다!');
      return false;
    }

    const moveName = moveData.name || '새 기술';
    alert(`${pokemonLabel}이(가) ${moveName}을(를) 배웠습니다!`);

    return true;
  };

  // 기술 삭제
  const forgetMove = async (pokemonUniqueId, moveId) => {
    if (!currentUser) return;

    await updateOwnedPokemonByUniqueId(pokemonUniqueId, (pokemon) => ({
      ...pokemon,
      moves: (pokemon.moves || []).filter(m => m.moveId !== moveId)
    }));
  };
  
  // 기술 교체 (4개 꽉 찼을 때)
  const replaceMove = (pokemonUniqueId, oldMoveId, newMove) => {
    return learnMove(pokemonUniqueId, newMove, oldMoveId);
  };
  
  // 레벨업 시 자동으로 배울 수 있는 기술 확인
  const getAvailableMovesForLevel = (pokemonNumber, level) => {
    if (!pokemonLearnsets) return [];
    
    const learnset = getPokemonLearnset(pokemonLearnsets, pokemonNumber);
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
    
    const learnset = getPokemonLearnset(pokemonLearnsets, pokemonNumber);
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
    
    const learnset = getPokemonLearnset(movesData.pokemonLearnsets, pokemonNumber);
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
