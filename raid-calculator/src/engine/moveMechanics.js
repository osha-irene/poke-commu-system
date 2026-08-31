/**
 * 기술 자체의 특수 메커니즘: 모으기/재충전, 방어류, 대타출동, 고정 데미지·일격기, 카운터,
 * 조건부 위력, 첫 턴 한정, 지연기(미래예지/희망사항), 랭크 조작기, 파티 상태이상 치유 등.
 *
 * @smogon/calc가 처리하는 것(위력·상성·급소·STAB·날씨/필드 배율 등)은 여기서 다루지 않는다.
 */
const idOf = (m) => (m && m.id ? String(m.id).toLowerCase().replace(/[^a-z0-9]/g, '') : '');

// ── 모으기(2턴) 기술 ────────────────────────────────
export function isChargeMove(moveData) {
  return !!(moveData && moveData.flags && moveData.flags.charge);
}
// 모으는 턴에 자기 랭크가 오르는 모으기 기술
const CHARGE_TURN_BOOST = {
  skullbash: { def: 1 },
  skyattack: {},
  meteorbeam: { spa: 1 },
  electroshot: { spa: 1 },
};
export function chargeTurnBoost(moveData) {
  return CHARGE_TURN_BOOST[idOf(moveData)] || null;
}
export function chargeTurnLine(entity, moveData) {
  const id = idOf(moveData);
  if (id === 'solarbeam' || id === 'solarblade') return `${entity.nickname}은(는) 빛을 흡수했다!`;
  if (id === 'fly' || id === 'bounce') return `${entity.nickname}은(는) 하늘 높이 날아올랐다!`;
  if (id === 'dig') return `${entity.nickname}은(는) 땅속으로 파고들었다!`;
  if (id === 'dive') return `${entity.nickname}은(는) 물속으로 잠수했다!`;
  if (id === 'phantomforce' || id === 'shadowforce') return `${entity.nickname}은(는) 모습을 감췄다!`;
  if (id === 'meteorbeam' || id === 'electroshot') return `${entity.nickname}은(는) 힘을 모으기 시작했다!`;
  return `${entity.nickname}은(는) 힘을 모으고 있다!`;
}
/** 이번엔 모으지 않고 바로 발동하는가 (파워허브 소지 / 솔라빔류 땡볕) */
export function chargeSkipped(moveData, entity, weather) {
  const id = idOf(moveData);
  if ((id === 'solarbeam' || id === 'solarblade') && weather === 'Sun') return 'weather';
  if (idOf({ id: entity.item }) === 'powerherb' || String(entity.item || '').replace(/\s/g, '') === 'powerherb') return 'item';
  return null;
}

// ── 재충전 기술 ─────────────────────────────────────
export function causesRecharge(moveData) {
  return !!(
    moveData &&
    ((moveData.flags && moveData.flags.recharge) || (moveData.self && moveData.self.volatileStatus === 'mustrecharge'))
  );
}

// ── 방어류 ──────────────────────────────────────────
// 단순 방어(모든 공격 1턴 막기). 접촉 시 부가효과가 있는 것은 CONTACT_PUNISH에 따로.
export const PROTECT_MOVES = new Set([
  'protect',
  'detect',
  'kingsshield',
  'spikyshield',
  'banefulbunker',
  'obstruct',
  'silktrap',
  'burningbulwark',
  'maxguard',
]);
export const ENDURE_MOVE = 'endure';
export const WIDE_GUARD_MOVE = 'wideguard';
export const QUICK_GUARD_MOVE = 'quickguard';
export function isProtectMove(moveData) {
  return PROTECT_MOVES.has(idOf(moveData)) || idOf(moveData) === ENDURE_MOVE;
}
/** 방어를 뚫는 기술 (page: breaksProtect / feint 등) */
export function breaksProtect(moveData) {
  return !!(moveData && (moveData.breaksProtect || idOf(moveData) === 'feint'));
}
/**
 * 접촉으로 방어를 건드린 공격자에게 가는 역효과.
 * { chip: 분수, status, boosts } 중 하나 이상.
 */
export function protectContactPunish(protectType, attacker) {
  switch (protectType) {
    case 'kingsshield':
      return { boosts: { atk: -1 }, line: `${attacker.nickname}의 공격이 떨어졌다!` };
    case 'spikyshield':
    case 'banefulbunker': // 독은 아래 status
      return protectType === 'spikyshield'
        ? { chip: 1 / 8, line: `${attacker.nickname}은(는) 가시에 찔렸다!` }
        : { status: 'psn', line: `${attacker.nickname}은(는) 독에 당했다!` };
    case 'burningbulwark':
      return { status: 'brn', line: `${attacker.nickname}은(는) 화상을 입었다!` };
    case 'obstruct':
      return { boosts: { def: -2 }, line: `${attacker.nickname}의 방어가 크게 떨어졌다!` };
    case 'silktrap':
      return { boosts: { spe: -1 }, line: `${attacker.nickname}의 스피드가 떨어졌다!` };
    default:
      return null;
  }
}

// ── 고정 데미지 / 일격기 ────────────────────────────
/** 고정 데미지량. 없으면 null. attacker/defender는 현재 상태. */
export function fixedDamage(moveData, attacker, defender) {
  const id = idOf(moveData);
  switch (id) {
    case 'seismictoss':
    case 'nightshade':
      return attacker.level || 50;
    case 'dragonrage':
      return 40;
    case 'sonicboom':
      return 20;
    case 'superfang':
    case 'naturesmadness':
    case 'ruination':
              return Math.max(1, Math.floor(defender.currentHP / 2));
    case 'guardianofalola':
      return Math.max(1, Math.floor((defender.currentHP * 3) / 4));
    case 'endeavor':
      return Math.max(0, defender.currentHP - attacker.currentHP);
    case 'finalgambit':
      return attacker.currentHP;
    default:
      return null;
  }
}
export function isOHKO(moveData) {
  return !!(moveData && moveData.ohko);
}
/** 일격기 명중률: 30 + (시전 레벨 - 대상 레벨). 대상 레벨이 더 높으면 실패. */
export function ohkoAccuracy(attacker, defender) {
  if ((defender.level || 50) > (attacker.level || 50)) return 0;
  return 30 + ((attacker.level || 50) - (defender.level || 50));
}

// ── 카운터류 ────────────────────────────────────────
export const COUNTER_MOVES = {
  counter: 'physical', // 받은 물리 데미지 2배 반사
  mirrorcoat: 'special', // 받은 특수 데미지 2배 반사
  metalburst: 'any', // 마지막에 받은 데미지 1.5배
  comeuppance: 'any',
};
export function counterKind(moveData) {
  return COUNTER_MOVES[idOf(moveData)] || null;
}

// ── 조건부 위력 배수 ────────────────────────────────
/**
 * 데미지 확정 후 곱할 배수. opts: { defenderActed, attackerFirst, defenderDamagedThisRound }
 */
export function conditionalPowerMult(moveData, attacker, defender, opts = {}) {
  const id = idOf(moveData);
  const st = attacker.status;
  switch (id) {
    case 'facade':
      return st === 'brn' || st === 'psn' || st === 'tox' || st === 'par' ? 2 : 1;
    case 'hex':
    case 'infernalparade':
    case 'barbbarrage':
      return defender.status ? 2 : 1;
    case 'brine':
      return defender.currentHP * 2 <= defender.maxHP ? 2 : 1;
    case 'venoshock':
    case 'wakeupslap': // 자는 상대 2배 + 깨움 (깨우기는 아래 별도)
      return id === 'venoshock'
        ? defender.status === 'psn' || defender.status === 'tox'
          ? 2
          : 1
        : defender.status === 'slp'
        ? 2
        : 1;
    case 'boltbeak':
    case 'fishiousrend':
      return opts.attackerFirst ? 2 : 1;
    case 'payback':
      return opts.defenderActed ? 2 : 1;
    case 'assurance':
      return opts.defenderDamagedThisRound ? 2 : 1;
    case 'avalanche':
    case 'revenge':
      return opts.attackerDamagedThisRound ? 2 : 1;
    case 'stompingtantrum':
      return attacker.lastMoveFailed ? 2 : 1;
    case 'retaliate':
      return opts.allyFaintedLastRound ? 2 : 1;
    default:
      return 1;
  }
}

// ── 첫 턴 한정 ──────────────────────────────────────
export function isFirstTurnOnly(moveData) {
  return ['fakeout', 'firstimpression', 'matblock'].includes(idOf(moveData));
}

// ── 지연기 ──────────────────────────────────────────
export function isFutureMove(moveData) {
  return !!(moveData && moveData.flags && moveData.flags.futuremove);
}
export function isWishMove(moveData) {
  return idOf(moveData) === 'wish';
}

// ── 랭크 조작 / 상태 치유 기술 ──────────────────────
export function isHaze(moveData) {
  return idOf(moveData) === 'haze';
}
export function isPartyCure(moveData) {
  return ['aromatherapy', 'healbell'].includes(idOf(moveData));
}
export function isReflectableStatus(moveData) {
  return !!(moveData && !moveData.basePower && moveData.flags && moveData.flags.reflectable);
}
export const RANK_MANIP = {
  clearsmog: 'reset-target', // 데미지 + 대상 랭크 초기화
  topsyturvy: 'invert-target',
  psychup: 'copy-target',
  spectralthief: 'steal-target', // 데미지 + 대상 플러스 랭크 훔침
  strengthsap: 'sap-atk', // 대상 공격 -1, 그 공격 수치만큼 회복
};
export function rankManip(moveData) {
  return RANK_MANIP[idOf(moveData)] || null;
}

// ── 타입 상실 기술 ─────────────────────────────────
export function typeLoss(moveData) {
  const id = idOf(moveData);
  if (id === 'burnup') return 'Fire';
  if (id === 'doubleshock') return 'Electric';
  return null;
}

// ── 접지시키는 기술 (땅 기술이 비행에 명중) ─────────
export function groundsTarget(moveData) {
  return ['thousandarrows', 'smackdown'].includes(idOf(moveData));
}

export { idOf as moveId };
