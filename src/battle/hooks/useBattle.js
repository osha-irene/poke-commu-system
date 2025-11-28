import { useState, useCallback } from 'react';
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

/**
 * 배틀 상태 관리 훅
 * @smogon/calc을 활용한 실시간 배틀 시뮬레이션
 */
export function useBattle(player1Pokemon, player2Pokemon, generation = 9) {
  const [battleState, setBattleState] = useState({
    turn: 0,
    player1: {
      pokemon: player1Pokemon,
      currentHP: player1Pokemon.stats.hp,
      status: null,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    player2: {
      pokemon: player2Pokemon,
      currentHP: player2Pokemon.stats.hp,
      status: null,
      boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    field: {
      weather: null,
      terrain: null,
      isReflect: false,
      isLightScreen: false
    },
    log: [],
    winner: null
  });

  /**
   * 데미지 계산 실행
   */
  const calculateDamage = useCallback((attacker, defender, moveData) => {
    const gen = Generations.get(generation);
    
    const attackerPokemon = new Pokemon(gen, attacker.pokemon.name, {
      level: attacker.pokemon.level,
      ability: attacker.pokemon.ability,
      item: attacker.pokemon.item,
      nature: attacker.pokemon.nature,
      ivs: attacker.pokemon.ivs,
      evs: attacker.pokemon.evs,
      boosts: attacker.boosts,
      status: attacker.status
    });

    const defenderPokemon = new Pokemon(gen, defender.pokemon.name, {
      level: defender.pokemon.level,
      ability: defender.pokemon.ability,
      item: defender.pokemon.item,
      nature: defender.pokemon.nature,
      ivs: defender.pokemon.ivs,
      evs: defender.pokemon.evs,
      boosts: defender.boosts,
      status: defender.status,
      curHP: defender.currentHP,
      maxHP: defender.pokemon.stats.hp
    });

    const move = new Move(gen, moveData.name);
    
    const field = new Field({
      weather: battleState.field.weather,
      terrain: battleState.field.terrain,
      attackerSide: {},
      defenderSide: {
        isReflect: battleState.field.isReflect,
        isLightScreen: battleState.field.isLightScreen
      }
    });

    const result = calculate(gen, attackerPokemon, defenderPokemon, move, field);
    
    return result;
  }, [generation, battleState.field]);

  /**
   * 기술 사용 - 스피드 기반 턴 순서
   */
  const useMove = useCallback((attackerSide, moveIndex) => {
    setBattleState(prev => {
      const isPlayer1 = attackerSide === 'player1';
      const attacker = prev[attackerSide];
      const defenderSide = isPlayer1 ? 'player2' : 'player1';
      const defender = prev[defenderSide];

      if (prev.winner) return prev;
      if (!attacker.pokemon.moves[moveIndex]) return prev;

      const attackerMoveData = attacker.pokemon.moves[moveIndex];
      
      // 스피드 비교로 선공 결정
      const player1Speed = prev.player1.pokemon.stats.speed;
      const player2Speed = prev.player2.pokemon.stats.speed;
      const player1First = player1Speed >= player2Speed;

      let newLog = [...prev.log];
      let newPlayer1HP = prev.player1.currentHP;
      let newPlayer2HP = prev.player2.currentHP;
      let winner = null;

      // 턴 진행: 빠른 쪽이 먼저 공격
      if (isPlayer1 && player1First) {
        // Player 1이 선공
        const result1 = calculateDamage(prev.player1, prev.player2, attackerMoveData);
        const damage1 = getDamageValue(result1.damage);
        newPlayer2HP = Math.max(0, newPlayer2HP - damage1);

        newLog.push({
          turn: prev.turn + 1,
          attacker: 'player1',
          move: attackerMoveData.name,
          damage: damage1,
          effectiveness: result1.desc().effectiveness,
          message: `${prev.player1.pokemon.name}이(가) ${attackerMoveData.name}을(를) 사용했다!`
        });

        if (result1.desc().effectiveness) {
          newLog.push({ turn: prev.turn + 1, message: result1.desc().effectiveness });
        }

        // Player 2가 쓰러지지 않았으면 반격
        if (newPlayer2HP > 0) {
          const aiMove = Math.floor(Math.random() * prev.player2.pokemon.moves.length);
          const defenderMoveData = prev.player2.pokemon.moves[aiMove];
          const result2 = calculateDamage(prev.player2, prev.player1, defenderMoveData);
          const damage2 = getDamageValue(result2.damage);
          newPlayer1HP = Math.max(0, newPlayer1HP - damage2);

          newLog.push({
            turn: prev.turn + 1,
            attacker: 'player2',
            move: defenderMoveData.name,
            damage: damage2,
            effectiveness: result2.desc().effectiveness,
            message: `${prev.player2.pokemon.name}이(가) ${defenderMoveData.name}을(를) 사용했다!`
          });

          if (result2.desc().effectiveness) {
            newLog.push({ turn: prev.turn + 1, message: result2.desc().effectiveness });
          }
        }
      } else {
        // Player 2가 선공
        const aiMove = Math.floor(Math.random() * prev.player2.pokemon.moves.length);
        const defenderMoveData = prev.player2.pokemon.moves[aiMove];
        const result2 = calculateDamage(prev.player2, prev.player1, defenderMoveData);
        const damage2 = getDamageValue(result2.damage);
        newPlayer1HP = Math.max(0, newPlayer1HP - damage2);

        newLog.push({
          turn: prev.turn + 1,
          attacker: 'player2',
          move: defenderMoveData.name,
          damage: damage2,
          effectiveness: result2.desc().effectiveness,
          message: `${prev.player2.pokemon.name}이(가) ${defenderMoveData.name}을(를) 사용했다!`
        });

        if (result2.desc().effectiveness) {
          newLog.push({ turn: prev.turn + 1, message: result2.desc().effectiveness });
        }

        // Player 1이 쓰러지지 않았으면 공격
        if (newPlayer1HP > 0) {
          const result1 = calculateDamage(prev.player1, prev.player2, attackerMoveData);
          const damage1 = getDamageValue(result1.damage);
          newPlayer2HP = Math.max(0, newPlayer2HP - damage1);

          newLog.push({
            turn: prev.turn + 1,
            attacker: 'player1',
            move: attackerMoveData.name,
            damage: damage1,
            effectiveness: result1.desc().effectiveness,
            message: `${prev.player1.pokemon.name}이(가) ${attackerMoveData.name}을(를) 사용했다!`
          });

          if (result1.desc().effectiveness) {
            newLog.push({ turn: prev.turn + 1, message: result1.desc().effectiveness });
          }
        }
      }

      // 승패 판정
      if (newPlayer1HP === 0) {
        winner = 'player2';
        newLog.push({ turn: prev.turn + 1, message: `${prev.player1.pokemon.name}은(는) 쓰러졌다!` });
      } else if (newPlayer2HP === 0) {
        winner = 'player1';
        newLog.push({ turn: prev.turn + 1, message: `${prev.player2.pokemon.name}은(는) 쓰러졌다!` });
      }

      return {
        ...prev,
        turn: prev.turn + 1,
        player1: { ...prev.player1, currentHP: newPlayer1HP },
        player2: { ...prev.player2, currentHP: newPlayer2HP },
        log: newLog,
        winner
      };
    });
  }, [calculateDamage]);

  // 데미지 배열에서 실제 값 추출
  const getDamageValue = (damage) => {
    if (Array.isArray(damage)) {
      return damage[Math.floor(damage.length / 2)];
    }
    return typeof damage === 'number' ? damage : 0;
  };

  /**
   * 배틀 초기화
   */
  const resetBattle = useCallback(() => {
    setBattleState({
      turn: 0,
      player1: {
        pokemon: player1Pokemon,
        currentHP: player1Pokemon.stats.hp,
        status: null,
        boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      },
      player2: {
        pokemon: player2Pokemon,
        currentHP: player2Pokemon.stats.hp,
        status: null,
        boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      },
      field: {
        weather: null,
        terrain: null,
        isReflect: false,
        isLightScreen: false
      },
      log: [],
      winner: null
    });
  }, [player1Pokemon, player2Pokemon]);

  /**
   * 날씨 설정
   */
  const setWeather = useCallback((weather) => {
    setBattleState(prev => ({
      ...prev,
      field: { ...prev.field, weather },
      log: [...prev.log, { turn: prev.turn, message: `날씨가 ${weather}(으)로 변했다!` }]
    }));
  }, []);

  /**
   * 지형 설정
   */
  const setTerrain = useCallback((terrain) => {
    setBattleState(prev => ({
      ...prev,
      field: { ...prev.field, terrain },
      log: [...prev.log, { turn: prev.turn, message: `필드가 ${terrain}(으)로 변했다!` }]
    }));
  }, []);

  return {
    battleState,
    useMove,
    resetBattle,
    setWeather,
    setTerrain
  };
}