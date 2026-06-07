import { useState, useCallback, useRef, useEffect } from 'react';
import battleEngine from '../utils/BattleEngine';
import showdownIntegration from '../utils/ShowdownIntegration';
import fieldEffectsManager from '../utils/FieldEffectsManager';
import statusManager from '../utils/StatusManager';

/**
 * 완전한 포켓몬 배틀 Hook
 * - 1~6마리 자유 선택 가능
 * - 모든 쇼다운 계산식 적용
 * - 실시간 배틀 로그
 */
export function useAdvancedBattle(initialOptions = {}) {
  const {
    player1Team = [],
    player2Team = [],
    battleFormat = 'Singles', // Singles, Doubles, Multi
    generation = 9,
  } = initialOptions;

  // 배틀 상태
  const [battleState, setBattleState] = useState({
    // 기본 정보
    turn: 0,
    phase: 'team_selection', // team_selection, battle, finished
    winner: null,
    
    // 플레이어 정보
    player1: {
      team: player1Team,
      active: [], // 현재 필드의 포켓몬 (싱글: 1마리, 더블: 2마리)
      bench: [], // 대기 중인 포켓몬
      sideConditions: [],
      fainted: [],
    },
    player2: {
      team: player2Team,
      active: [],
      bench: [],
      sideConditions: [],
      fainted: [],
    },
    
    // 필드 상태
    field: fieldEffectsManager.createInitialField(),
    
    // UI 상태
    waitingForP1: false,
    waitingForP2: false,
    
    // 로그
    log: [],
  });

  const turnActionsRef = useRef({
    player1: null,
    player2: null,
  });

  /**
   * 배틀 시작
   */
  const startBattle = useCallback((p1ActiveIndices, p2ActiveIndices) => {
    console.log('[useAdvancedBattle] 배틀 시작', {
      p1ActiveIndices,
      p2ActiveIndices,
    });

    // 세대 설정
    showdownIntegration.setGeneration(generation);
    battleEngine.clearLog();

    setBattleState(prev => {
      // 기술 데이터 확장 함수
      const expandMoves = (pokemon) => {
        const moves = pokemon.moves || [];
        return moves.map(move => {
          const moveName = typeof move === 'string' ? move : (move.name || move.id);
          const moveData = showdownIntegration.getMoveData(moveName);
          
          return {
            name: moveName,
            id: moveName,
            type: moveData?.type || 'Normal',
            category: moveData?.category || 'Physical',
            basePower: moveData?.basePower || 0,
            accuracy: moveData?.accuracy ?? 100,
            pp: moveData?.pp || 10,
            currentPP: moveData?.pp || 10,
          };
        });
      };

      const p1Active = p1ActiveIndices.map(idx => {
        const pokemon = prev.player1.team[idx];
        return {
          ...pokemon,
          moves: expandMoves(pokemon),
          currentHP: pokemon.stats?.hp || pokemon.hp || pokemon.maxhp,
          maxHP: pokemon.stats?.hp || pokemon.hp || pokemon.maxhp,
          ...statusManager.createInitialStatus(),
        };
      });

      const p2Active = p2ActiveIndices.map(idx => {
        const pokemon = prev.player2.team[idx];
        return {
          ...pokemon,
          moves: expandMoves(pokemon),
          currentHP: pokemon.stats?.hp || pokemon.hp || pokemon.maxhp,
          maxHP: pokemon.stats?.hp || pokemon.hp || pokemon.maxhp,
          ...statusManager.createInitialStatus(),
        };
      });

      const p1Bench = prev.player1.team.filter((_, idx) => !p1ActiveIndices.includes(idx));
      const p2Bench = prev.player2.team.filter((_, idx) => !p2ActiveIndices.includes(idx));

      return {
        ...prev,
        phase: 'battle',
        turn: 1,
        player1: {
          ...prev.player1,
          active: p1Active,
          bench: p1Bench,
        },
        player2: {
          ...prev.player2,
          active: p2Active,
          bench: p2Bench,
        },
        waitingForP1: true,
        waitingForP2: true,
        log: [
          { message: '배틀 시작!', type: 'system' },
          { message: `${p1Active[0].nickname || p1Active[0].name} VS ${p2Active[0].nickname || p2Active[0].name}`, type: 'system' },
        ],
      };
    });
  }, [generation]);

  /**
   * 기술 선택
   */
  const selectMove = useCallback((player, activeIndex, moveIndex) => {
    console.log('[useAdvancedBattle] 기술 선택', { player, activeIndex, moveIndex });

    const pokemon = battleState[player].active[activeIndex];
    const move = pokemon.moves[moveIndex];

    if (!move) {
      console.error('기술을 찾을 수 없음');
      return;
    }

    // 액션 저장
    turnActionsRef.current[player] = {
      type: 'move',
      activeIndex,
      moveIndex,
      moveName: move.name || move.id,
      pokemon,
    };

    // 대기 상태 해제
    setBattleState(prev => ({
      ...prev,
      [`waitingFor${player === 'player1' ? 'P1' : 'P2'}`]: false,
    }));

    // 양쪽 모두 선택했으면 턴 실행
    if (turnActionsRef.current.player1 && turnActionsRef.current.player2) {
      setTimeout(() => executeTurn(), 100);
    }
  }, [battleState]);

  /**
   * 교체 선택
   */
  const selectSwitch = useCallback((player, activeIndex, benchIndex) => {
    console.log('[useAdvancedBattle] 교체 선택', { player, activeIndex, benchIndex });

    turnActionsRef.current[player] = {
      type: 'switch',
      activeIndex,
      benchIndex,
    };

    setBattleState(prev => ({
      ...prev,
      [`waitingFor${player === 'player1' ? 'P1' : 'P2'}`]: false,
    }));

    if (turnActionsRef.current.player1 && turnActionsRef.current.player2) {
      setTimeout(() => executeTurn(), 100);
    }
  }, []);

  /**
   * 턴 실행
   */
  const executeTurn = useCallback(() => {
    console.log('[useAdvancedBattle] 턴 실행');

    const p1Action = turnActionsRef.current.player1;
    const p2Action = turnActionsRef.current.player2;

    if (!p1Action || !p2Action) {
      console.error('액션이 없음');
      return;
    }

    setBattleState(prev => {
      const newState = { ...prev };
      const logs = [...prev.log];

      // 교체 먼저 처리
      const switches = [
        { player: 'player1', action: p1Action },
        { player: 'player2', action: p2Action },
      ].filter(s => s.action.type === 'switch');

      switches.forEach(({ player, action }) => {
        const playerData = newState[player];
        const switched = playerData.bench[action.benchIndex];
        const current = playerData.active[action.activeIndex];

        // 교체
        playerData.active[action.activeIndex] = switched;
        playerData.bench[action.benchIndex] = current;

        logs.push({
          message: `${player === 'player1' ? 'P1' : 'P2'}: ${switched.nickname || switched.name}(으)로 교체!`,
          type: 'switch',
        });

        // 입장 해저드
        const hazardResult = battleEngine.processEntry(
          switched,
          playerData.sideConditions
        );
        if (hazardResult.damage > 0) {
          switched.currentHP = Math.max(0, switched.currentHP - hazardResult.damage);
          logs.push({
            message: battleEngine.getLog().slice(-1)[0]?.message || '해저드 데미지',
            type: 'damage',
          });
        }
      });

      // 기술 사용 (스피드 순)
      const moves = [
        { player: 'player1', playerKey: 'player1', action: p1Action, pokemon: prev.player1.active[p1Action.activeIndex || 0] },
        { player: 'player2', playerKey: 'player2', action: p2Action, pokemon: prev.player2.active[p2Action.activeIndex || 0] },
      ].filter(m => m.action.type === 'move');

      // 스피드 비교
      moves.sort((a, b) => {
        const speedCompare = battleEngine.compareSpeed(a.pokemon, b.pokemon, prev.field);
        return -speedCompare; // 빠른 순으로
      });

      // 기술 실행
      moves.forEach(({ player, playerKey, action, pokemon }) => {
        const opponent = playerKey === 'player1' ? 'player2' : 'player1';
        const opponentPokemon = newState[opponent].active[0];

        if (!opponentPokemon || opponentPokemon.currentHP <= 0) {
          logs.push({
            message: `${pokemon.nickname || pokemon.name}의 공격 대상이 없습니다!`,
            type: 'error',
          });
          return;
        }

        const result = battleEngine.executeMove(
          pokemon,
          opponentPokemon,
          action.moveName,
          prev.field
        );

        // 로그 추가
        battleEngine.getLog().forEach(entry => {
          logs.push({
            message: entry.message,
            type: entry.type,
          });
        });
        battleEngine.clearLog();

        if (result.success && result.damage) {
          // 데미지 적용
          opponentPokemon.currentHP = Math.max(0, opponentPokemon.currentHP - result.damage);

          // 반동
          if (result.recoilDamage) {
            pokemon.currentHP = Math.max(0, pokemon.currentHP - result.recoilDamage);
          }

          // 흡수
          if (result.drainAmount) {
            pokemon.currentHP = Math.min(pokemon.maxHP, pokemon.currentHP + result.drainAmount);
          }

          // 상태이상
          if (result.statusInflicted) {
            opponentPokemon.status = result.statusInflicted;
          }

          // 능력 변화
          if (result.boosts) {
            Object.entries(result.boosts).forEach(([stat, value]) => {
              opponentPokemon.boosts[stat] = Math.max(-6, Math.min(6, 
                (opponentPokemon.boosts[stat] || 0) + value
              ));
            });
          }

          // 필드 변화
          if (result.weather) {
            newState.field.weather = result.weather;
            newState.field.weatherTurns = 5;
          }
          if (result.terrain) {
            newState.field.terrain = result.terrain;
            newState.field.terrainTurns = 5;
          }
        }
      });

      // 턴 종료 처리
      [...newState.player1.active, ...newState.player2.active].forEach(pokemon => {
        if (pokemon.currentHP > 0) {
          const turnEnd = battleEngine.processTurnEnd(pokemon, newState.field);
          
          if (turnEnd.damage > 0) {
            pokemon.currentHP = Math.max(0, pokemon.currentHP - turnEnd.damage);
            turnEnd.effects.forEach(effect => {
              logs.push({
                message: effect.message,
                type: 'status',
              });
            });
          }
          
          if (turnEnd.healing > 0) {
            pokemon.currentHP = Math.min(pokemon.maxHP, pokemon.currentHP + turnEnd.healing);
            turnEnd.effects.forEach(effect => {
              logs.push({
                message: effect.message,
                type: 'healing',
              });
            });
          }
        }
      });

      // 기절 체크
      let winner = null;
      
      newState.player1.active = newState.player1.active.filter(p => {
        if (p.currentHP <= 0) {
          newState.player1.fainted.push(p);
          logs.push({
            message: `${p.nickname || p.name}은(는) 쓰러졌다!`,
            type: 'faint',
          });
          return false;
        }
        return true;
      });

      newState.player2.active = newState.player2.active.filter(p => {
        if (p.currentHP <= 0) {
          newState.player2.fainted.push(p);
          logs.push({
            message: `${p.nickname || p.name}은(는) 쓰러졌다!`,
            type: 'faint',
          });
          return false;
        }
        return true;
      });

      // 승부 판정
      if (newState.player1.active.length === 0 && newState.player1.bench.length === 0) {
        winner = 'Player 2';
      } else if (newState.player2.active.length === 0 && newState.player2.bench.length === 0) {
        winner = 'Player 1';
      }

      if (winner) {
        logs.push({
          message: `${winner} 승리!`,
          type: 'winner',
        });
        newState.phase = 'finished';
        newState.winner = winner;
      } else {
        // 다음 턴
        newState.turn += 1;
        newState.waitingForP1 = true;
        newState.waitingForP2 = true;
      }

      // 액션 초기화
      turnActionsRef.current = {
        player1: null,
        player2: null,
      };

      return {
        ...newState,
        log: logs,
      };
    });
  }, []);

  /**
   * 배틀 리셋
   */
  const resetBattle = useCallback(() => {
    battleEngine.clearLog();
    turnActionsRef.current = {
      player1: null,
      player2: null,
    };

    setBattleState({
      turn: 0,
      phase: 'team_selection',
      winner: null,
      player1: {
        team: player1Team,
        active: [],
        bench: [],
        sideConditions: [],
        fainted: [],
      },
      player2: {
        team: player2Team,
        active: [],
        bench: [],
        sideConditions: [],
        fainted: [],
      },
      field: fieldEffectsManager.createInitialField(),
      waitingForP1: false,
      waitingForP2: false,
      log: [],
    });
  }, [player1Team, player2Team]);

  /**
   * 데미지 미리보기
   */
  const previewDamage = useCallback((attacker, defender, moveName) => {
    return showdownIntegration.calculateDamage(
      attacker,
      defender,
      moveName,
      battleState.field
    );
  }, [battleState.field]);

  /**
   * 여러 기술 데미지 비교
   */
  const compareMoveDamage = useCallback((attacker, defender, moveNames) => {
    return showdownIntegration.compareMoveDamage(
      attacker,
      defender,
      moveNames,
      battleState.field
    );
  }, [battleState.field]);

  return {
    battleState,
    startBattle,
    selectMove,
    selectSwitch,
    resetBattle,
    previewDamage,
    compareMoveDamage,
    
    // 유틸리티
    showdownIntegration,
    fieldEffectsManager,
    statusManager,
  };
}

export default useAdvancedBattle;