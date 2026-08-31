import { calculateStat, applyStatStage, NATURE_MODIFIERS } from './statCalculator.js';

// 이 프로젝트의 실제 저장 형식은 종족값/개체값/노력치 모두 hp,atk,def,spa,spd,spe 축약 키를 쓴다
// (statCalculator.calculateAllStats의 hp/attack/.../speed 풀네임 키와는 다르므로 여기서 맞춰 읽는다)
function effectiveSpeed(entity) {
  return calculateStat(entity.baseStats.spe, entity.ivs.spe, entity.evs.spe, entity.level);
}

// NATURE_MODIFIERS 각 행은 [atk, def, spa, spd, spe] 배율
const NATURE_SPEED_INDEX = 4;

/**
 * 우선도 일괄 처리에서 동점(같은 우선도) 판정에 쓰는 "실효 스피드".
 * buildTurnOrder의 표시용 raw 스피드와 달리 성격 보정 + 스피드 랭크 변화 + 마비(0.5배)를 반영한다.
 * (트릭룸/스피드 관련 특성·도구는 이 계산기 범위 밖이라 반영하지 않음)
 */
export function resolutionSpeed(entity) {
  if (!entity) return 0;
  const raw = calculateStat(entity.baseStats.spe, entity.ivs.spe, entity.evs.spe, entity.level);
  const natureRow = NATURE_MODIFIERS[String(entity.nature || 'hardy').toLowerCase()] || NATURE_MODIFIERS.hardy;
  let spe = Math.floor(raw * natureRow[NATURE_SPEED_INDEX]);
  spe = applyStatStage(spe, entity.boosts?.spe || 0);
  if (entity.status === 'par') spe = Math.floor(spe * 0.5);
  return Math.max(1, spe);
}

/**
 * 노력치·종족값으로 계산한 스피드 순으로 참가자(닉네임)와 보스(닉네임)를 한 줄로 나열한
 * 행동 순서를 만든다. 랭크 변화·마비 등 실시간 보정은 반영하지 않는다.
 */
export function buildTurnOrder(battle) {
  if (!battle) return [];

  const entries = battle.participants.filter(Boolean).map((p) => ({
    key: `p-${p.id}`,
    label: p.nickname,
    speed: effectiveSpeed(p),
    fainted: p.fainted,
    isBoss: false,
  }));

  entries.push({
    key: 'boss',
    label: battle.boss.nickname,
    speed: effectiveSpeed(battle.boss),
    fainted: battle.boss.fainted,
    isBoss: true,
  });

  return entries.sort((a, b) => b.speed - a.speed);
}
