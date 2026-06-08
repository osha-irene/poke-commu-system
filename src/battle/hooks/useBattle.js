import { useState, useCallback } from 'react';
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import { translateMoveName } from '../utils/move-translations';
import {
  getBoostMessages,
  getStatusMessages
} from '../utils/battle-messages';

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

  const calculateDamage = useCallback((attacker, defender, moveData, field) => {
    try {
      const gen = Generations.get(generation);
      
      const attackerPokemon = new Pokemon(gen, attacker.pokemon.name, {
        level: attacker.pokemon.level,
        ability: attacker.pokemon.ability,
        item: attacker.pokemon.item,
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: attacker.pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: attacker.boosts,
        status: attacker.status
      });

      const defenderPokemon = new Pokemon(gen, defender.pokemon.name, {
        level: defender.pokemon.level,
        ability: defender.pokemon.ability,
        item: defender.pokemon.item,
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: defender.pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: defender.boosts,
        status: defender.status,
        curHP: defender.currentHP
      });

      const move = new Move(gen, moveData.name);
      
      const fieldObj = new Field({
        weather: field.weather,
        terrain: field.terrain,
        attackerSide: {},
        defenderSide: {
          isReflect: field.isReflect,
          isLightScreen: field.isLightScreen
        }
      });

      const result = calculate(gen, attackerPokemon, defenderPokemon, move, fieldObj);
      
      // 디버그 로그
      console.log('🔍 기술:', moveData.name);
      console.log('🔍 공격 전 boosts:', attacker.boosts);
      console.log('🔍 공격 후 result.attacker.boosts:', result.attacker.boosts);
      console.log('🔍 방어 후 result.defender.boosts:', result.defender.boosts);
      
      return result;
    } catch (error) {
      console.error('❌ 데미지 계산 실패:', error);
      
      return {
        damage: [0],
        desc: () => ({ effectiveness: '' }),
        attacker: { boosts: attacker.boosts, status: attacker.status },
        defender: { boosts: defender.boosts, status: defender.status }
      };
    }
  }, [generation]);

  const useMove = useCallback((attackerSide, moveIndex) => {
    setBattleState(prev => {
      const isPlayer1 = attackerSide === 'player1';
      const attacker = prev[attackerSide];

      if (prev.winner) return prev;
      if (!attacker.pokemon.moves[moveIndex]) return prev;

      const attackerMoveData = attacker.pokemon.moves[moveIndex];
      
      const player1Speed = prev.player1.pokemon.stats.speed;
      const player2Speed = prev.player2.pokemon.stats.speed;
      const player1First = player1Speed >= player2Speed;

      let newLog = [...prev.log];
      let newPlayer1HP = prev.player1.currentHP;
      let newPlayer2HP = prev.player2.currentHP;
      let newPlayer1Boosts = { ...prev.player1.boosts };
      let newPlayer2Boosts = { ...prev.player2.boosts };
      let newPlayer1Status = prev.player1.status;
      let newPlayer2Status = prev.player2.status;
      let winner = null;

      const turn = prev.turn + 1;

      if (isPlayer1 && player1First) {
        const result1 = calculateDamage(prev.player1, prev.player2, attackerMoveData, prev.field);
        const damage1 = Array.isArray(result1.damage) ? Math.floor(result1.damage[0]) : Math.floor(result1.damage);
        newPlayer2HP = Math.max(0, newPlayer2HP - damage1);

        newLog.push({
          turn,
          message: `${prev.player1.pokemon.name}이(가) ${translateMoveName(attackerMoveData.name)}을(를) 사용했다!`
        });

        if (damage1 > 0 && result1.desc().effectiveness) {
          newLog.push({ turn, message: result1.desc().effectiveness });
        }

        console.log('📝 능력 변화 체크');
        console.log('  이전:', prev.player1.boosts);
        console.log('  이후:', result1.attacker.boosts);
        
        const p1BoostMsgs = getBoostMessages(prev.player1.pokemon.name, prev.player1.boosts, result1.attacker.boosts);
        console.log('  메시지:', p1BoostMsgs);
        
        p1BoostMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p1StatusMsgs = getStatusMessages(prev.player1.pokemon.name, prev.player1.status, result1.attacker.status);
        p1StatusMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p2BoostMsgs = getBoostMessages(prev.player2.pokemon.name, prev.player2.boosts, result1.defender.boosts);
        p2BoostMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p2StatusMsgs = getStatusMessages(prev.player2.pokemon.name, prev.player2.status, result1.defender.status);
        p2StatusMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        newPlayer1Boosts = result1.attacker.boosts;
        newPlayer2Boosts = result1.defender.boosts;
        newPlayer1Status = result1.attacker.status;
        newPlayer2Status = result1.defender.status;

        if (newPlayer2HP > 0) {
          const aiMove = Math.floor(Math.random() * prev.player2.pokemon.moves.length);
          const defenderMoveData = prev.player2.pokemon.moves[aiMove];
          
          const result2 = calculateDamage(
            { ...prev.player2, boosts: newPlayer2Boosts, status: newPlayer2Status, currentHP: newPlayer2HP },
            { ...prev.player1, boosts: newPlayer1Boosts, status: newPlayer1Status, currentHP: newPlayer1HP },
            defenderMoveData,
            prev.field
          );
          
          const damage2 = Array.isArray(result2.damage) ? Math.floor(result2.damage[0]) : Math.floor(result2.damage);
          newPlayer1HP = Math.max(0, newPlayer1HP - damage2);

          newLog.push({
            turn,
            message: `${prev.player2.pokemon.name}이(가) ${translateMoveName(defenderMoveData.name)}을(를) 사용했다!`
          });

          if (damage2 > 0 && result2.desc().effectiveness) {
            newLog.push({ turn, message: result2.desc().effectiveness });
          }

          const p2BoostMsgs2 = getBoostMessages(prev.player2.pokemon.name, newPlayer2Boosts, result2.attacker.boosts);
          p2BoostMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p2StatusMsgs2 = getStatusMessages(prev.player2.pokemon.name, newPlayer2Status, result2.attacker.status);
          p2StatusMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p1BoostMsgs2 = getBoostMessages(prev.player1.pokemon.name, newPlayer1Boosts, result2.defender.boosts);
          p1BoostMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p1StatusMsgs2 = getStatusMessages(prev.player1.pokemon.name, newPlayer1Status, result2.defender.status);
          p1StatusMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          newPlayer2Boosts = result2.attacker.boosts;
          newPlayer1Boosts = result2.defender.boosts;
          newPlayer2Status = result2.attacker.status;
          newPlayer1Status = result2.defender.status;
        }
      } else {
        const aiMove = Math.floor(Math.random() * prev.player2.pokemon.moves.length);
        const defenderMoveData = prev.player2.pokemon.moves[aiMove];
        const result2 = calculateDamage(prev.player2, prev.player1, defenderMoveData, prev.field);
        const damage2 = Array.isArray(result2.damage) ? Math.floor(result2.damage[0]) : Math.floor(result2.damage);
        newPlayer1HP = Math.max(0, newPlayer1HP - damage2);

        newLog.push({
          turn,
          message: `${prev.player2.pokemon.name}이(가) ${translateMoveName(defenderMoveData.name)}을(를) 사용했다!`
        });

        if (damage2 > 0 && result2.desc().effectiveness) {
          newLog.push({ turn, message: result2.desc().effectiveness });
        }

        const p2BoostMsgs = getBoostMessages(prev.player2.pokemon.name, prev.player2.boosts, result2.attacker.boosts);
        p2BoostMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p2StatusMsgs = getStatusMessages(prev.player2.pokemon.name, prev.player2.status, result2.attacker.status);
        p2StatusMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p1BoostMsgs = getBoostMessages(prev.player1.pokemon.name, prev.player1.boosts, result2.defender.boosts);
        p1BoostMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        const p1StatusMsgs = getStatusMessages(prev.player1.pokemon.name, prev.player1.status, result2.defender.status);
        p1StatusMsgs.forEach(msg => newLog.push({ turn, message: msg }));

        newPlayer2Boosts = result2.attacker.boosts;
        newPlayer1Boosts = result2.defender.boosts;
        newPlayer2Status = result2.attacker.status;
        newPlayer1Status = result2.defender.status;

        if (newPlayer1HP > 0) {
          const result1 = calculateDamage(
            { ...prev.player1, boosts: newPlayer1Boosts, status: newPlayer1Status, currentHP: newPlayer1HP },
            { ...prev.player2, boosts: newPlayer2Boosts, status: newPlayer2Status, currentHP: newPlayer2HP },
            attackerMoveData,
            prev.field
          );
          
          const damage1 = Array.isArray(result1.damage) ? Math.floor(result1.damage[0]) : Math.floor(result1.damage);
          newPlayer2HP = Math.max(0, newPlayer2HP - damage1);

          newLog.push({
            turn,
            message: `${prev.player1.pokemon.name}이(가) ${translateMoveName(attackerMoveData.name)}을(를) 사용했다!`
          });

          if (damage1 > 0 && result1.desc().effectiveness) {
            newLog.push({ turn, message: result1.desc().effectiveness });
          }

          const p1BoostMsgs2 = getBoostMessages(prev.player1.pokemon.name, newPlayer1Boosts, result1.attacker.boosts);
          p1BoostMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p1StatusMsgs2 = getStatusMessages(prev.player1.pokemon.name, newPlayer1Status, result1.attacker.status);
          p1StatusMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p2BoostMsgs2 = getBoostMessages(prev.player2.pokemon.name, newPlayer2Boosts, result1.defender.boosts);
          p2BoostMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          const p2StatusMsgs2 = getStatusMessages(prev.player2.pokemon.name, newPlayer2Status, result1.defender.status);
          p2StatusMsgs2.forEach(msg => newLog.push({ turn, message: msg }));

          newPlayer1Boosts = result1.attacker.boosts;
          newPlayer2Boosts = result1.defender.boosts;
          newPlayer1Status = result1.attacker.status;
          newPlayer2Status = result1.defender.status;
        }
      }

      if (newPlayer1HP === 0) {
        winner = 'player2';
        newLog.push({ turn, message: `${prev.player1.pokemon.name}은(는) 쓰러졌다!` });
      } else if (newPlayer2HP === 0) {
        winner = 'player1';
        newLog.push({ turn, message: `${prev.player2.pokemon.name}은(는) 쓰러졌다!` });
      }

      return {
        ...prev,
        turn,
        player1: { 
          ...prev.player1, 
          currentHP: newPlayer1HP,
          boosts: newPlayer1Boosts,
          status: newPlayer1Status
        },
        player2: { 
          ...prev.player2, 
          currentHP: newPlayer2HP,
          boosts: newPlayer2Boosts,
          status: newPlayer2Status
        },
        log: newLog,
        winner
      };
    });
  }, [calculateDamage]);

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

  return {
    battleState,
    useMove,
    resetBattle
  };
}