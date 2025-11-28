/**
 * moves.json을 import해서 번역 맵 생성
 */
import movesData from '../../data/moves.json';

// id → name 맵 생성
const MOVE_TRANSLATIONS = {};

if (movesData && movesData.moves) {
  movesData.moves.forEach(move => {
    MOVE_TRANSLATIONS[move.id] = move.name;
  });
}

/**
 * 기술명을 한글로 변환
 */
export function translateMoveName(moveId) {
  return MOVE_TRANSLATIONS[moveId] || moveId;
}

export default MOVE_TRANSLATIONS;