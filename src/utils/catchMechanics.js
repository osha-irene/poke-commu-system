import evolutions from '../data/evolutions.json';

// 달의돌(moon-stone)로 진화하는 포켓몬의 number(from) 목록 (지연 초기화)
let moonStoneFromNumbers = null;

function getMoonStoneFromNumbers() {
  if (moonStoneFromNumbers === null) {
    moonStoneFromNumbers = new Set(
      (evolutions.evolutions || [])
        .filter((evo) => evo.condition?.type === 'item' && evo.condition?.item === 'moon-stone')
        .map((evo) => evo.from)
    );
  }
  return moonStoneFromNumbers;
}

/**
 * 포켓몬 포획 시 볼별 보정 배율을 계산합니다.
 *
 * @param {object} item - 인벤토리 아이템 (name 필요)
 * @param {object} pokemon - 야생 포켓몬 데이터
 * @param {object} context - 보정에 필요한 부가 정보
 *   - isNight: boolean (현재 시간이 밤인지)
 *   - isCave: boolean (현재 동굴/어두운 장소인지)
 *   - turnCount: number (조우 후 경과 턴 수, 1부터 시작)
 *   - activePartyPokemon: object|null (전투 중인 내 포켓몬, 레벨볼/러브볼용)
 * @returns {number} 최종 배율
 */
export function calculateBallMultiplier(item, pokemon, context = {}) {
  const name = item.name;
  const {
    isNight = false,
    isCave = false,
    turnCount = 1,
    activePartyPokemon = null,
  } = context;

  const pokemonType = pokemon.type?.toLowerCase() || '';
  const pokemonTypes = pokemonType.split('/').map((t) => t.trim());

  if (name.includes('마스터')) {
    return 255;
  }

  if (name.includes('하이퍼') || name.includes('울트라')) {
    return 2.0;
  }

  if (name.includes('슈퍼') || name.includes('수퍼') || name.includes('그레이트')) {
    return 1.5;
  }

  if (name.includes('넷트')) {
    const isWaterOrBug = pokemonTypes.some(
      (t) => t.includes('물') || t.includes('water') || t.includes('벌레') || t.includes('bug')
    );
    return isWaterOrBug ? 3.5 : 1.0;
  }

  if (name.includes('다이브')) {
    const isWater = pokemonTypes.some((t) => t.includes('물') || t.includes('water'));
    return isWater ? 3.5 : 1.0;
  }

  // 퀵볼: 조우 직후 첫 턴에만 5배
  if (name.includes('퀵')) {
    return turnCount <= 1 ? 5.0 : 1.0;
  }

  // 타이머볼: 턴이 지날수록 보정값 증가, 최대 4배
  if (name.includes('타이머')) {
    const bonus = (1229 / 4096) * Math.min(turnCount - 1, 10);
    return Math.min(1.0 + bonus, 4.0);
  }

  // 다크볼/더스크볼: 야간 또는 동굴 내부일 때 3배
  if (name.includes('다크')) {
    return isNight || isCave ? 3.0 : 1.0;
  }

// 문볼: 달의돌로 진화하는 포켓몬에게만 4배
  if (name.includes('문')) {
    const baseNumber = pokemon.originalNumber || pokemon.number;
    return getMoonStoneFromNumbers().has(baseNumber) ? 4.0 : 1.0;
  }

// 러브러브볼: 내 파티 포켓몬과 성별이 다를 때 8배 (종족 무관)
  if (name.includes('러브러브')) {
    if (
      activePartyPokemon &&
      activePartyPokemon.gender &&
      pokemon.gender &&
      activePartyPokemon.gender !== pokemon.gender
    ) {
      return 8.0;
    }
    return 1.0;
  }
  
  // 레벨볼: 내 포켓몬과 상대 포켓몬의 레벨 비율로 단계 적용
  if (name.includes('레벨')) {
    const myLevel = activePartyPokemon?.level;
    const targetLevel = pokemon.level;
    if (!myLevel || !targetLevel) return 1.0;

    const ratio = myLevel / targetLevel;
    if (ratio >= 4) return 8.0;
    if (ratio >= 2) return 4.0;
    if (ratio > 1) return 2.0;
    return 1.0;
  }

  // 스피드볼: 대상 스피드 종족값이 100 이상일 때만 4배
  if (name.includes('스피드')) {
    const baseSpeed = pokemon.baseSpeed || pokemon.stats?.speed || 0;
    return baseSpeed >= 100 ? 4.0 : 1.0;
  }

  return 1.0;
}