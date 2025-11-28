import React from 'react';
import { BattleArena } from './components/BattleArena';

/**
 * 배틀 테스트 컴포넌트
 * 이 파일을 src/ 폴더에 넣고 App.jsx에서 import해서 사용하세요
 */
export function BattleTest() {
  // 테스트용 포켓몬 데이터
  const charizard = {
    name: 'Charizard',
    level: 50,
    types: ['Fire', 'Flying'],
    ability: 'Blaze',
    item: 'Life Orb',
    nature: 'Modest',
    stats: { 
      hp: 153, 
      attack: 104, 
      defense: 98, 
      spAttack: 159, 
      spDefense: 105, 
      speed: 120 
    },
    ivs: { 
      hp: 31, 
      attack: 31, 
      defense: 31, 
      spAttack: 31, 
      spDefense: 31, 
      speed: 31 
    },
    evs: { 
      hp: 0, 
      attack: 0, 
      defense: 0, 
      spAttack: 252, 
      spDefense: 4, 
      speed: 252 
    },
    moves: [
      { name: 'Fire Blast' },
      { name: 'Air Slash' },
      { name: 'Solar Beam' },
      { name: 'Focus Blast' }
    ]
  };

  const blastoise = {
    name: 'Blastoise',
    level: 50,
    types: ['Water'],
    ability: 'Torrent',
    item: 'Leftovers',
    nature: 'Modest',
    stats: { 
      hp: 158, 
      attack: 103, 
      defense: 120, 
      spAttack: 105, 
      spDefense: 125, 
      speed: 98 
    },
    ivs: { 
      hp: 31, 
      attack: 31, 
      defense: 31, 
      spAttack: 31, 
      spDefense: 31, 
      speed: 31 
    },
    evs: { 
      hp: 252, 
      attack: 0, 
      defense: 0, 
      spAttack: 252, 
      spDefense: 4, 
      speed: 0 
    },
    moves: [
      { name: 'Hydro Pump' },
      { name: 'Ice Beam' },
      { name: 'Earthquake' },
      { name: 'Flash Cannon' }
    ]
  };

  return (
    <BattleArena 
      player1Pokemon={charizard} 
      player2Pokemon={blastoise} 
    />
  );
}

export default BattleTest;
