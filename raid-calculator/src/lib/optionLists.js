import allPokemonData from '../data/allPokemon.json';
import movesData from '../data/moves.json';
import abilitiesData from '../data/abilities.json';
import { isMoveBanned } from '../engine/bannedMoves.js';

export const speciesOptions = allPokemonData.map((p) => p.name).filter(Boolean);
export const moveOptions = movesData.moves.map((m) => m.name).filter(Boolean);
export const abilityOptions = abilitiesData.abilities.map((a) => a.name).filter(Boolean);

// 참가자(파트너 포켓몬)는 규칙 V장 1항에 따라 일부 기술을 사용할 수 없음. 보스는 제한 없음.
export const participantMoveOptions = movesData.moves
  .filter((m) => !isMoveBanned(m.id))
  .map((m) => m.name)
  .filter(Boolean);

export const bannedMoveNameSet = new Set(
  movesData.moves.filter((m) => isMoveBanned(m.id)).map((m) => m.name)
);
