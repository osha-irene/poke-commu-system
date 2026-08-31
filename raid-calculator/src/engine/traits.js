/**
 * 특성(Ability) / 도구(Item)의 "데미지 배율 외" 효과 처리.
 * 데미지 배율(근성·의욕·테크니션·순수한힘·단단한발톱 등)은 @smogon/calc가 attacker.ability/item으로
 * 이미 처리하므로 여기서는 다루지 않는다. 여기서 다루는 것:
 *  - 상태이상/풀죽음/혼란/헤롱헤롱 면역
 *  - 턴 순서 우선도 보정 (짓궂은마음·질풍날개·트라이어지·그래스슬라이더·선제공격의발톱·스터스탯 등)
 *  - 턴 종료 지속 회복/피해 (먹다남은음식·검은해감·포이즌힐·아이스바디·비받이·건조피부·화염구슬 등)
 *  - 1 남기고 버티기 (옹골참·기합의띠·기합의머리띠)
 *  - 연속기 실타수 (스킬링크·구애의주사위)
 *
 * 레이드 규칙상 참가자는 특성·도구가 없으므로 실질적으로 보스에게만 적용된다.
 */
import showdownIntegration from '../lib/showdownIntegration.js';
import { getField } from './fieldConditions.js';

const idCache = new Map();
function resolveId(kind, raw) {
  if (!raw) return '';
  const key = `${kind}:${raw}`;
  if (idCache.has(key)) return idCache.get(key);
  const resolved =
    kind === 'ability'
      ? showdownIntegration.getAbility(raw)?.id || String(raw).toLowerCase().replace(/[^a-z0-9]/g, '')
      : showdownIntegration.getItem(raw)?.id || String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
  idCache.set(key, resolved);
  return resolved;
}
export function abilityId(entity) {
  return entity ? resolveId('ability', entity.ability) : '';
}
export function itemId(entity) {
  return entity ? resolveId('item', entity.item) : '';
}

const isType = (entity, t) => (entity.types || []).includes(t);
const atFullHP = (entity) => entity.currentHP >= entity.maxHP;

// ── 면역 ──────────────────────────────────────────────
const ALL_STATUS_IMMUNE = new Set(['comatose', 'purifyingsalt']);
const STATUS_IMMUNE = {
  slp: new Set(['insomnia', 'vitalspirit', 'sweetveil']),
  par: new Set(['limber']),
  psn: new Set(['immunity', 'pastelveil']),
  tox: new Set(['immunity', 'pastelveil']),
  brn: new Set(['waterveil', 'waterbubble', 'thermalexchange']),
  frz: new Set(['magmaarmor']),
};

/** entity가 특성으로 status 획득을 막는가 (sun에서만 막는 리프가드 포함) */
export function abilityBlocksStatus(entity, status, state) {
  const a = abilityId(entity);
  if (!a) return false;
  if (ALL_STATUS_IMMUNE.has(a)) return true;
  if (a === 'leafguard' && state && getField(state).weather === 'Sun') return true;
  if (a === 'flowergift') return false;
  return (STATUS_IMMUNE[status] || new Set()).has(a);
}
export function abilityBlocksFlinch(entity) {
  return abilityId(entity) === 'innerfocus';
}
export function abilityBlocksConfusion(entity) {
  return abilityId(entity) === 'owntempo';
}
export function abilityBlocksAttract(entity) {
  return ['oblivious', 'aromaveil'].includes(abilityId(entity));
}
export function abilityBlocksTaunt(entity) {
  return ['oblivious', 'aromaveil'].includes(abilityId(entity));
}

// ── 턴 순서 우선도 보정 ───────────────────────────────
/**
 * 특성/도구/필드에 따른 우선도 가산치. moveData가 없으면(응원 등) 0.
 * 짓궂은마음: 변화기 +1 / 질풍날개: 비행 기술 + 풀피 시 +1 / 트라이어지: 회복 플래그 기술 +3 /
 * 그래스슬라이더: 그래스필드에서 +1
 */
export function priorityBonus(entity, moveData, state) {
  if (!entity || !moveData) return 0;
  const a = abilityId(entity);
  let bonus = 0;
  if (a === 'prankster' && moveData.category === 'Status') bonus += 1;
  if (a === 'galewings' && moveData.type === 'Flying' && atFullHP(entity)) bonus += 1;
  if (a === 'triage' && moveData.flags && moveData.flags.heal) bonus += 3;
  if (moveData.id === 'grassyglide' && state && getField(state).terrain === 'Grassy') bonus += 1;
  return bonus;
}

/** 같은 우선도 안에서 "무조건 마지막" (스터스탯 특성 / 느림보꼬리·이상한사탕 도구) */
export function movesLast(entity) {
  return abilityId(entity) === 'stall' || ['laggingtail', 'fullincense'].includes(itemId(entity));
}
/** 같은 우선도 안에서 확률적으로 "먼저" (선제공격의발톱 20% / 재빠른발톱 30%) */
export function firstChance(entity) {
  if (itemId(entity) === 'quickclaw') return 0.2;
  if (abilityId(entity) === 'quickdraw') return 0.3;
  return 0;
}

// ── 연속기 실타수 ────────────────────────────────────
/** [min,max] 범위 연속기의 실제 타수. 스킬링크/구애의주사위면 최대. 그 외 2:1/3 3:1/3 4:1/6 5:1/6 */
export function multiHitCount(moveData, entity) {
  const mh = moveData && moveData.multihit;
  if (!Array.isArray(mh)) return null; // 고정 타수거나 연속기 아님 → 호출부에서 기존 처리
  const [min, max] = mh;
  if (min === max) return min;
  if (abilityId(entity) === 'skilllink' || itemId(entity) === 'loadeddice') return max;
  if (min === 2 && max === 5) {
    return [2, 2, 3, 3, 4, 5][Math.floor(Math.random() * 6)];
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ── 턴 종료 지속 회복/피해 ───────────────────────────
/** 라운드 종료 시 특성/도구/변화상태에 의한 HP 증감. formulaMaxHP 기준(레이드 배수 전). */
export function residualHpChange(entity, state) {
  if (!entity || entity.fainted) return { delta: 0, lines: [] };
  const base = entity.formulaMaxHP || entity.maxHP;
  const a = abilityId(entity);
  const it = itemId(entity);
  const weather = getField(state).weather;
  const lines = [];
  let delta = 0;

  // 변화상태
  if (entity.aquaRing) {
    delta += Math.floor(base / 16);
    lines.push(`${entity.nickname}은(는) 아쿠아링으로 체력을 회복했다!`);
  }
  if (entity.ingrain) {
    delta += Math.floor(base / 16);
    lines.push(`${entity.nickname}은(는) 뿌리로 체력을 흡수했다!`);
  }

  // 특성
  if ((a === 'poisonheal') && (entity.status === 'psn' || entity.status === 'tox')) {
    delta += Math.floor(base / 8);
    lines.push(`${entity.nickname}은(는) 포이즌힐로 체력을 회복했다!`);
  } else if (a === 'raindish' && weather === 'Rain') {
    delta += Math.floor(base / 16);
    lines.push(`${entity.nickname}은(는) 비받이로 체력을 회복했다!`);
  } else if (a === 'icebody' && (weather === 'Hail' || weather === 'Snow')) {
    delta += Math.floor(base / 16);
    lines.push(`${entity.nickname}은(는) 아이스바디로 체력을 회복했다!`);
  } else if (a === 'dryskin') {
    if (weather === 'Rain') {
      delta += Math.floor(base / 8);
      lines.push(`${entity.nickname}은(는) 건조피부로 체력을 회복했다!`);
    } else if (weather === 'Sun') {
      delta -= Math.floor(base / 8);
      lines.push(`${entity.nickname}은(는) 건조피부로 체력이 줄었다!`);
    }
  } else if (a === 'solarpower' && weather === 'Sun') {
    delta -= Math.floor(base / 8);
    lines.push(`${entity.nickname}은(는) 태양의힘으로 체력이 줄었다!`);
  }

  // 도구
  if (it === 'leftovers') {
    delta += Math.floor(base / 16);
    lines.push(`${entity.nickname}은(는) 먹다남은음식으로 체력을 회복했다!`);
  } else if (it === 'blacksludge') {
    if (isType(entity, 'Poison')) {
      delta += Math.floor(base / 16);
      lines.push(`${entity.nickname}은(는) 검은해감으로 체력을 회복했다!`);
    } else {
      delta -= Math.floor(base / 8);
      lines.push(`${entity.nickname}은(는) 검은해감으로 체력이 줄었다!`);
    }
  } else if (it === 'stickybarb') {
    delta -= Math.floor(base / 8);
    lines.push(`${entity.nickname}은(는) 끈적끈적바늘로 체력이 줄었다!`);
  }

  return { delta, lines };
}

/** 라운드 종료 시 화염구슬/맹독구슬 자기 상태이상 부여 (아직 무상태일 때만) */
export function residualSelfStatus(entity) {
  if (!entity || entity.fainted || entity.status) return null;
  const it = itemId(entity);
  if (it === 'flameorb') return { status: 'brn', line: `${entity.nickname}은(는) 화염구슬로 화상을 입었다!` };
  if (it === 'toxicorb') return { status: 'tox', line: `${entity.nickname}은(는) 맹독구슬로 맹독 상태가 되었다!` };
  return null;
}

/** 포이즌힐이면 독/맹독 잔여 데미지를 받지 않는다 (회복은 residualHpChange에서) */
export function immuneToStatusDamage(entity) {
  return abilityId(entity) === 'poisonheal' && (entity.status === 'psn' || entity.status === 'tox');
}

// ── 등장 시 특성 (보스) ─────────────────────────────
const ENTRY_WEATHER = {
  drought: 'Sun',
  orichalcumpulse: 'Sun',
  drizzle: 'Rain',
  sandstream: 'Sand',
  snowwarning: 'Snow',
};
const ENTRY_TERRAIN = {
  electricsurge: 'Electric',
  hadronengine: 'Electric',
  grassysurge: 'Grassy',
  mistysurge: 'Misty',
  psychicsurge: 'Psychic',
};
/** 전투 시작 시 보스 특성이 까는 날씨/필드 { weather?, terrain? } */
export function entryFieldFromAbility(entity) {
  const a = abilityId(entity);
  const out = {};
  if (ENTRY_WEATHER[a]) out.weather = ENTRY_WEATHER[a];
  if (ENTRY_TERRAIN[a]) out.terrain = ENTRY_TERRAIN[a];
  return out;
}
export function hasIntimidate(entity) {
  return abilityId(entity) === 'intimidate';
}
/** 능력치 저하를 막는 특성 (위협·울음소리 등에 방어) */
export function abilityBlocksStatDrop(entity) {
  return ['clearbody', 'whitesmoke', 'fullmetalbody', 'hypercutter', 'keeneye', 'bigpecks', 'illuminate'].includes(
    abilityId(entity)
  );
}

// ── 1 남기고 버티기 ─────────────────────────────────
/**
 * 이번 타격으로 쓰러질 참가/보스가 옹골참/기합의띠/기합의머리띠로 1 남기고 버티는가.
 * fromFull=풀피에서 맞았는지(옹골참·기합의띠 조건). 반환: {survive, line, consumesItem}
 */
export function checkEndure(entity, incomingDamage, fromFull) {
  if (!entity || entity.currentHP <= 0) return { survive: false };
  if (incomingDamage < entity.currentHP) return { survive: false };
  const a = abilityId(entity);
  const it = itemId(entity);
  if (entity.enduringThisRound) {
    return { survive: true, line: `${entity.nickname}은(는) 버텼다!` };
  }
  if (a === 'sturdy' && fromFull) {
    return { survive: true, line: `${entity.nickname}은(는) 옹골참으로 버텼다!` };
  }
  if (it === 'focussash' && fromFull) {
    return { survive: true, line: `${entity.nickname}은(는) 기합의띠로 버텼다!`, consumesItem: true };
  }
  if (it === 'focusband' && Math.random() < 0.1) {
    return { survive: true, line: `${entity.nickname}은(는) 기합의머리띠로 버텼다!` };
  }
  return { survive: false };
}

// ── 몰드브레이커 / 서린포스 / 매직미러 등 ───────────
export function ignoresAbilities(entity) {
  return ['moldbreaker', 'teravolt', 'turboblaze', 'myceliummight'].includes(abilityId(entity));
}
export function hasSereneGrace(entity) {
  return abilityId(entity) === 'serenegrace';
}
export function hasMagicBounce(entity) {
  return abilityId(entity) === 'magicbounce';
}
export function hasSpeedBoost(entity) {
  return abilityId(entity) === 'speedboost';
}
/** 급소 확률 랭크 가산 (대운·초점렌즈·예리한손톱 등) */
export function critStageBonus(entity) {
  let b = 0;
  if (abilityId(entity) === 'superluck') b += 1;
  if (['scopelens', 'razorclaw'].includes(itemId(entity))) b += 1;
  return b;
}
/** 접촉 무효화 (긴손아귀 특성 / 방어패드·펀치글러브 도구) */
export function noContact(entity, moveData) {
  if (abilityId(entity) === 'longreach') return true;
  const it = itemId(entity);
  if (it === 'protectivepads') return true;
  if (it === 'punchingglove' && moveData && moveData.flags && moveData.flags.punch) return true;
  return false;
}

// ── 피격 시 방어 측 특성/도구 반응 ──────────────────
const CONTACT_STATUS_ABILITY = {
  static: { status: 'par', chance: 30, label: '정전기' },
  flamebody: { status: 'brn', chance: 30, label: '불꽃몸' },
  poisonpoint: { status: 'psn', chance: 30, label: '독가시' },
  cutecharm: { attract: true, chance: 30, label: '매혹의바디' },
};
/**
 * 방어 측이 (대개 접촉) 공격을 맞았을 때의 반응.
 * 반환: { attackerPatch, defenderPatch, lines } — attackerPatch는 공격자에게, defenderPatch는 방어자에게 병합.
 * ignoreAbility=true(몰드브레이커)면 방어 특성 반응은 건너뛴다(도구는 유효).
 */
export function onHitReactions(defender, attacker, moveData, dmgDealt, isContact, koed, superEffective, ignoreAbility) {
  const lines = [];
  let attackerPatch = null;
  let defenderPatch = null;
  const a = ignoreAbility ? '' : abilityId(defender);
  const dIt = itemId(defender);
  const base = defender.formulaMaxHP || defender.maxHP;

  const addAtk = (patch) => (attackerPatch = { ...(attackerPatch || {}), ...patch });
  const addDef = (patch) => (defenderPatch = { ...(defenderPatch || {}), ...patch });

  if (dmgDealt > 0 && isContact && !koed) {
    // 접촉 상태이상 유발 특성
    const cs = CONTACT_STATUS_ABILITY[a];
    if (cs && Math.random() * 100 < cs.chance && !attacker.status) {
      if (cs.attract) {
        if (attacker.gender && defender.gender && attacker.gender !== defender.gender) {
          addAtk({ attractActive: true });
          lines.push(`${attacker.nickname}은(는) ${cs.label}으로 헤롱헤롱해졌다!`);
        }
      } else {
        addAtk({ status: cs.status });
        lines.push(`${attacker.nickname}은(는) ${cs.label}으로 ${cs.status === 'par' ? '마비' : cs.status === 'brn' ? '화상' : '독'} 상태가 되었다!`);
      }
    }
    if (a === 'effectspore' && !attacker.status && Math.random() < 0.3) {
      const st = ['psn', 'par', 'slp'][Math.floor(Math.random() * 3)];
      addAtk({ status: st, ...(st === 'slp' ? { sleepTurns: 1 + Math.floor(Math.random() * 3) } : {}) });
      lines.push(`${attacker.nickname}은(는) 포자에 당했다!`);
    }
    // 접촉 반동 특성 / 까칠한바위 도구
    if (a === 'roughskin' || a === 'ironbarbs') {
      const chip = Math.max(1, Math.floor(base / 8));
      addAtk({ _chip: (attackerPatch && attackerPatch._chip ? attackerPatch._chip : 0) + chip });
      lines.push(`${attacker.nickname}은(는) ${a === 'roughskin' ? '까칠한피부' : '철가시'}에 상처를 입었다!`);
    }
    if (a === 'gooey' || a === 'tanglinghair') {
      addAtk({ boosts: { ...(attackerPatch?.boosts || {}), spe: -1 } });
      lines.push(`${attacker.nickname}의 스피드가 떨어졌다!`);
    }
    if (dIt === 'rockyhelmet') {
      const chip = Math.max(1, Math.floor((attacker.formulaMaxHP || attacker.maxHP) / 6));
      addAtk({ _chip: (attackerPatch && attackerPatch._chip ? attackerPatch._chip : 0) + chip });
      lines.push(`${attacker.nickname}은(는) 까칠한바위에 상처를 입었다!`);
    }
  }

  // 피격 시 자기 랭크 변화 특성 (접촉 무관)
  if (dmgDealt > 0 && !koed) {
    if (a === 'stamina') {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), def: 1 } });
      lines.push(`${defender.nickname}의 지구력으로 방어가 올랐다!`);
    } else if (a === 'weakarmor' && moveData.category === 'Physical') {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), def: -1, spe: 2 } });
      lines.push(`${defender.nickname}의 무른껍질이 발동했다!`);
    } else if (a === 'justified' && moveData.type === 'Dark') {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), atk: 1 } });
      lines.push(`${defender.nickname}의 정의의마음으로 공격이 올랐다!`);
    } else if (a === 'rattled' && ['Bug', 'Dark', 'Ghost'].includes(moveData.type)) {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), spe: 1 } });
      lines.push(`${defender.nickname}의 겁쟁이로 스피드가 올랐다!`);
    } else if ((a === 'steamengine') && ['Fire', 'Water'].includes(moveData.type)) {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), spe: 6 } });
      lines.push(`${defender.nickname}의 증기기관으로 스피드가 크게 올랐다!`);
    } else if (a === 'watercompaction' && moveData.type === 'Water') {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), def: 2 } });
      lines.push(`${defender.nickname}의 수압으로 방어가 크게 올랐다!`);
    } else if (a === 'thermalexchange' && moveData.type === 'Fire') {
      addDef({ boosts: { ...(defenderPatch?.boosts || {}), atk: 1 } });
      lines.push(`${defender.nickname}의 열교환으로 공격이 올랐다!`);
    }
  }

  // 급소를 맞으면 노여움의포켓몬 공격 최대
  if (dmgDealt > 0 && a === 'angerpoint' && moveData._wasCrit) {
    addDef({ boosts: { ...(defenderPatch?.boosts || {}), atk: 6 } });
    lines.push(`${defender.nickname}의 분노가 폭발했다!`);
  }

  // 약점보험(도구): 효과굉장 피격 시 공/특공 +2
  if (dmgDealt > 0 && superEffective && dIt === 'weaknesspolicy' && !koed) {
    addDef({ boosts: { ...(defenderPatch?.boosts || {}), atk: 2, spa: 2 }, item: '' });
    lines.push(`${defender.nickname}의 약점보험이 발동했다!`);
  }

  return { attackerPatch, defenderPatch, lines };
}

/** 상대를 쓰러뜨렸을 때 발동하는 공격자 특성 (자기과신·아라리·전율의포효 등) */
export function onKOBoost(attacker) {
  const a = abilityId(attacker);
  if (a === 'moxie' || a === 'chillingneigh' || a === 'asoneglastrier') return { boosts: { atk: 1 }, label: '자기과신' };
  if (a === 'grimneigh' || a === 'asonespectrier') return { boosts: { spa: 1 }, label: '검은외침' };
  if (a === 'beastboost') {
    // 가장 높은 스탯 +1 (근사: 종족값 기준)
    const bs = attacker.baseStats || {};
    const best = ['atk', 'spa', 'def', 'spd', 'spe'].reduce((m, k) => ((bs[k] || 0) > (bs[m] || 0) ? k : m), 'atk');
    return { boosts: { [best]: 1 }, label: '비스트부스트' };
  }
  if (a === 'battlebond') return { boosts: { atk: 1, spa: 1, spe: 1 }, label: '유대변화' };
  return null;
}

/** HP 절반 밑으로 떨어뜨린 공격을 맞았을 때 (참기·앤가슴 등) */
export function onBelowHalf(defender, prevHP) {
  const a = abilityId(defender);
  const half = (defender.maxHP || 1) / 2;
  if (prevHP > half && defender.currentHP <= half && defender.currentHP > 0) {
    if (a === 'berserk') return { boosts: { spa: 1 }, label: '벌서크' };
    if (a === 'angershell') return { boosts: { atk: 1, spa: 1, spe: 1, def: -1, spd: -1 }, label: '분노의껍질' };
  }
  return null;
}

/** 라운드 종료 시 특성으로 스탯이 오르는가 (가속·무사시) */
export function endOfRoundBoost(entity) {
  if (hasSpeedBoost(entity)) return { boosts: { spe: 1 }, label: '가속' };
  return null;
}

/** 킹스록/예리한이빨: 원래 풀죽음 부가효과가 없는 공격에 10% 풀죽음 추가 */
export function itemAddsFlinch(entity, moveData) {
  return (
    ['kingsrock', 'razorfang'].includes(itemId(entity)) &&
    moveData &&
    moveData.basePower &&
    !(moveData.secondary && moveData.secondary.volatileStatus === 'flinch')
  );
}
/** 조가비방울: 입힌 데미지의 1/8 회복 */
export function hasShellBell(entity) {
  return itemId(entity) === 'shellbell';
}
/** 만능구근: 흡수 회복량 +30% */
export function drainBonus(entity) {
  return itemId(entity) === 'bigroot' ? 1.3 : 1;
}
/** 커버클로: 조이기 지속시간 고정 7 */
export function gripClawTurns(entity) {
  return itemId(entity) === 'gripclaw';
}
/** 방어 측 부가효과 무효 (방진 특성 / 반짝가루망토 도구) */
export function blocksSecondary(entity) {
  return abilityId(entity) === 'shielddust' || itemId(entity) === 'covertcloak';
}
export function blocksSecondaryLabel(entity) {
  return abilityId(entity) === 'shielddust' ? '방진' : '반짝가루망토';
}
/** 능력 저하를 막는 특성/도구 (상대발 한정) */
export function blocksStatDrop(entity) {
  return (
    ['clearbody', 'whitesmoke', 'fullmetalbody', 'hypercutter', 'keeneye', 'bigpecks', 'illuminate'].includes(
      abilityId(entity)
    ) || itemId(entity) === 'clearamulet'
  );
}
export function hasContrary(entity) {
  return abilityId(entity) === 'contrary';
}
export function hasSimple(entity) {
  return abilityId(entity) === 'simple';
}
/** 상대에게 스탯이 깎였을 때 역상승하는 특성 (오기=공격, 승기=특공) */
export function onStatDropRetaliate(entity) {
  const a = abilityId(entity);
  if (a === 'defiant') return { atk: 2 };
  if (a === 'competitive') return { spa: 2 };
  return null;
}
/** 라이트클레이=장막 8턴, 날씨돌=날씨 8턴, 터레인확장기=필드 8턴 */
export function fieldDurationBonus(entity, kind) {
  const it = itemId(entity);
  if (kind === 'screen' && it === 'lightclay') return 8;
  if (kind === 'terrain' && it === 'terrainextender') return 8;
  if (kind === 'weather') {
    if (it === 'damprock' || it === 'heatrock' || it === 'smoothrock' || it === 'icyrock') return 8;
  }
  return null;
}
