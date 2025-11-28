import React from 'react';
import { BattleArena } from './battle/components/BattleArena';

/**
 * 배틀 시스템 사용 예시 - 최소한의 설정
 */
export function BattleExample() {
  // 플레이어 1의 포켓몬
  const player1Pokemon = {
    name: 'Charizard',
    level: 50,
    types: ['Fire', 'Flying'],
    ability: 'Blaze',
    item: 'Life Orb',
    nature: 'Modest',
    stats: { hp: 153, attack: 104, defense: 98, spAttack: 159, spDefense: 105, speed: 120 },
    ivs: { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
    evs: { hp: 0, attack: 0, defense: 0, spAttack: 252, spDefense: 4, speed: 252 },
    moves: [
      { name: 'Fire Blast' },
      { name: 'Air Slash' },
      { name: 'Solar Beam' },
      { name: 'Focus Blast' }
    ]
  };

  // 플레이어 2의 포켓몬
  const player2Pokemon = {
    name: 'Blastoise',
    level: 50,
    types: ['Water'],
    ability: 'Torrent',
    item: 'Leftovers',
    nature: 'Modest',
    stats: { hp: 158, attack: 103, defense: 120, spAttack: 105, spDefense: 125, speed: 98 },
    ivs: { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
    evs: { hp: 252, attack: 0, defense: 0, spAttack: 252, spDefense: 4, speed: 0 },
    moves: [
      { name: 'Hydro Pump' },
      { name: 'Ice Beam' },
      { name: 'Earthquake' },
      { name: 'Flash Cannon' }
    ]
  };

  return <BattleArena player1Pokemon={player1Pokemon} player2Pokemon={player2Pokemon} />;
}

export default BattleExample;
