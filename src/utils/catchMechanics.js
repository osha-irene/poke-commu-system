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
 *   - isWaterside: boolean (현재 물가/수상 장소인지)
 *   - turnCount: number (조우 후 경과 턴 수, 1부터 시작)
 *   - activePartyPokemon: object|null (전투 중인 내 포켓몬, 레벨볼/러브러브볼용)
 *   - hasCaughtBefore: boolean (리피트볼용)
 * @returns {number} 최종 배율
 */
export function calculateBallMultiplier(item, pokemon, context = {}) {
  const name = item.name || '';
  const nameEn = item.nameEn || '';
  const {
    isNight = false,
    isCave = false,
    isWaterside = false,
    turnCount = 1,
    activePartyPokemon = null,
    hasCaughtBefore = false,
  } = context;

  const pokemonTypes = getPokemonTypes(pokemon);

  if (name.includes('마스터')) {
    return 255;
  }

  if (nameEn === 'beast-ball' || name.includes('울트라볼')) {
    return isUltraBeast(pokemon) ? 5.0 : 0.1;
  }

  if (name.includes('하이퍼')) {
    return 2.0;
  }

  if (name.includes('슈퍼') || name.includes('수퍼') || name.includes('그레이트')) {
    return 1.5;
  }

  if (name.includes('사파리')) {
    return 1.0;
  }

  // 루어볼: 최신작 기준, 물 위/물 속 장소에서 4배.
  if (name.includes('루어')) {
    return isWaterside ? 4.0 : 1.0;
  }

  if (name.includes('넷트')) {
    return hasType(pokemonTypes, ['물', 'water', '벌레', 'bug']) ? 3.5 : 1.0;
  }

  if (name.includes('다이브')) {
    return isWaterside ? 3.5 : 1.0;
  }

  if (name.includes('네스트')) {
    const level = Number(pokemon.level) || 30;
    return level < 30 ? Math.max((41 - level) / 10, 1.0) : 1.0;
  }

  if (name.includes('리피트')) {
    return hasCaughtBefore ? 3.5 : 1.0;
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

  // 드림볼: 잠든 포켓몬에게 4배. 현재 상태이상 데이터가 없으면 기본 1배.
  if (name.includes('드림')) {
    return isSleeping(pokemon) ? 4.0 : 1.0;
  }

  // 문볼: 달의돌로 진화하는 포켓몬에게만 4배
  if (name.includes('문')) {
    const baseNumber = pokemon.originalNumber || pokemon.number;
    return getMoonStoneFromNumbers().has(baseNumber) ? 4.0 : 1.0;
  }

  // 러브러브볼: 같은 종족이면서 성별이 다를 때 8배
  if (name.includes('러브러브')) {
    if (
      activePartyPokemon &&
      activePartyPokemon.gender &&
      pokemon.gender &&
      activePartyPokemon.gender !== pokemon.gender &&
      getSpeciesKey(activePartyPokemon) === getSpeciesKey(pokemon)
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

export function calculateCaptureChance(item, pokemon, context = {}) {
  if (isGuaranteedBall(item)) {
    return 1.0;
  }

  const maxHp = Math.max(Number(context.maxHp ?? pokemon.maxHp ?? pokemon.hpMax) || 100, 1);
  const currentHp = clamp(Number(context.currentHp ?? pokemon.currentHp ?? pokemon.hp) || maxHp, 1, maxHp);
  const statusBonus = getStatusBonus(context.status ?? pokemon.status);
  const ballBonus = calculateBallMultiplier(item, pokemon, context);
  const rate = getBallModifiedCatchRate(item, pokemon, normalizeCatchRate(context.catchRate ?? pokemon.catchRate));
  const hpFactor = Math.max(3 * maxHp - 2 * currentHp, 1);
  const modifiedCatchRate = Math.floor((hpFactor * rate * ballBonus * statusBonus) / (3 * maxHp));

  if (modifiedCatchRate >= 255) {
    return 1.0;
  }

  if (modifiedCatchRate <= 0) {
    return 0;
  }

  const shakeProbability = 65536 / Math.pow(255 / modifiedCatchRate, 0.1875);
  return clamp(Math.pow(shakeProbability / 65536, 4), 0, 1);
}

function getBallModifiedCatchRate(item, pokemon, catchRate) {
  const name = item.name || '';
  if (!name.includes('헤비')) {
    return catchRate;
  }

  const weightKg = Number(pokemon.weightKg) || (Number(pokemon.weight) ? Number(pokemon.weight) / 10 : 0);
  let modifiedRate = catchRate;

  if (weightKg < 100) {
    modifiedRate -= 20;
  } else if (weightKg >= 200 && weightKg < 300) {
    modifiedRate += 20;
  } else if (weightKg >= 300) {
    modifiedRate += 30;
  }

  return Math.max(modifiedRate, 1);
}

function normalizeCatchRate(catchRate) {
  const numericRate = Number(catchRate);
  if (!Number.isFinite(numericRate)) {
    return 51;
  }

  if (numericRate > 0 && numericRate <= 1) {
    return Math.round(numericRate * 255);
  }

  return clamp(Math.round(numericRate), 1, 255);
}

function getStatusBonus(status) {
  const normalizedStatus = String(status || '').toLowerCase();
  if (['sleep', 'asleep', 'freeze', 'frozen', '잠듦', '얼음'].some((value) => normalizedStatus.includes(value))) {
    return 2.5;
  }
  if (['paralysis', 'paralyzed', 'poison', 'burn', '마비', '독', '화상'].some((value) => normalizedStatus.includes(value))) {
    return 1.5;
  }
  return 1.0;
}

function isSleeping(pokemon) {
  const status = String(pokemon.status || '').toLowerCase();
  return getStatusBonus(status) === 2.5 && ['sleep', 'asleep', '잠듦'].some((value) => status.includes(value));
}

function isGuaranteedBall(item) {
  const name = item.name || '';
  return name.includes('마스터') || name.includes('파크');
}

function isUltraBeast(pokemon) {
  const number = Number(pokemon.originalNumber || pokemon.number);
  const ultraBeastNumbers = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
  return ultraBeastNumbers.has(number) || (pokemon.abilities || []).includes('beast-boost');
}

function getPokemonTypes(pokemon) {
  return [pokemon.type, pokemon.type2, ...(pokemon.types || [])]
    .filter(Boolean)
    .flatMap((type) => String(type).toLowerCase().split('/'))
    .map((type) => type.trim());
}

function hasType(pokemonTypes, targetTypes) {
  return pokemonTypes.some((type) => targetTypes.some((targetType) => type.includes(targetType)));
}

function getSpeciesKey(pokemon) {
  return String(pokemon.originalNumber || pokemon.number || pokemon.species || pokemon.nameEn || pokemon.name || '');
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
