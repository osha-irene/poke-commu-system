/**
 * 날씨 / 필드(터레인) / 트릭룸 / 사이드 컨디션(순풍·리플렉터·빛의장막·오로라베일·신비의부적·하얀안개)
 * 처리 모음. 데미지 배율 자체(비 → 물기술 1.5배, 리플렉터 → 물리 0.5배, 급소 시 장막 무시 등)는
 * @smogon/calc에 fieldState로 넘겨 계산하고, 여기서는 "설치 / 지속시간 / 만료 / 턴종료 틱"만 다룬다.
 *
 * 미구현(레이드 계산기 범위 밖): 중력·매직룸·원더룸, 스텔스록 등 설치기(교체가 없음),
 * 방어·니들가드·광범위가드류, 안개제거/고속스핀, 라이트클레이/터레인확장기 지속시간 연장.
 */

export const WEATHER_DURATION = 5;
export const TERRAIN_DURATION = 5;
export const TRICK_ROOM_DURATION = 5;

// @smogon/calc가 이해하는 날씨 문자열로 정규화
const WEATHER_FROM_MOVE = {
  raindance: 'Rain',
  sunnyday: 'Sun',
  sandstorm: 'Sand',
  snowscape: 'Snow',
  chillyreception: 'Snow',
  hail: 'Hail',
};
const TERRAIN_FROM_MOVE = {
  electricterrain: 'Electric',
  grassyterrain: 'Grassy',
  mistyterrain: 'Misty',
  psychicterrain: 'Psychic',
};

export const WEATHER_LABELS = {
  Rain: { name: '비', set: '비가 내리기 시작했다!', end: '비가 그쳤다!' },
  Sun: { name: '쨍쨍햇살', set: '햇살이 강해졌다!', end: '햇살이 원래대로 돌아왔다!' },
  Sand: { name: '모래바람', set: '모래바람이 불기 시작했다!', end: '모래바람이 가라앉았다!' },
  Snow: { name: '설경', set: '눈이 내리기 시작했다!', end: '눈이 그쳤다!' },
  Hail: { name: '싸라기눈', set: '싸라기눈이 내리기 시작했다!', end: '싸라기눈이 그쳤다!' },
};
// 모래바람/싸라기눈 턴종료 피해를 받지 않는 타입
const WEATHER_CHIP_IMMUNE = { Sand: ['Rock', 'Ground', 'Steel'], Hail: ['Ice'] };

export const TERRAIN_LABELS = {
  Electric: { name: '일렉트릭필드', set: '발밑에 전기가 흐르기 시작했다!', end: '일렉트릭필드가 사라졌다!' },
  Grassy: { name: '그래스필드', set: '발밑에 풀이 무성해졌다!', end: '그래스필드가 사라졌다!' },
  Misty: { name: '미스트필드', set: '발밑에 안개가 자욱이 꼈다!', end: '미스트필드가 사라졌다!' },
  Psychic: { name: '사이코필드', set: '발밑이 이상해졌다!', end: '사이코필드가 사라졌다!' },
};

// 사이드 컨디션: 시전한 "진영"(보스 또는 참가자 조)에만 적용된다
export const SIDE_CONDITIONS = {
  tailwind: { name: '순풍', turns: 4, set: '순풍이 불기 시작했다!', end: '순풍이 멈췄다!' },
  reflect: { name: '리플렉터', turns: 5, set: '반사벽이 생겨났다!', end: '반사벽이 사라졌다!' },
  lightscreen: { name: '빛의장막', turns: 5, set: '빛의장막이 생겨났다!', end: '빛의장막이 사라졌다!' },
  auroraveil: { name: '오로라베일', turns: 5, set: '오로라베일이 생겨났다!', end: '오로라베일이 사라졌다!' },
  safeguard: { name: '신비의부적', turns: 5, set: '신비의 부적에 둘러싸였다!', end: '신비의 부적의 효과가 사라졌다!' },
  mist: { name: '하얀안개', turns: 5, set: '하얀 안개에 둘러싸였다!', end: '하얀 안개가 걷혔다!' },
};

const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '');

export function emptyField() {
  return { weather: '', weatherTurns: 0, terrain: '', terrainTurns: 0, trickRoomTurns: 0, gravityTurns: 0 };
}
export function emptySideConditions() {
  return { boss: {}, teams: {} };
}
export function getField(state) {
  return state.field || emptyField();
}
export function getSideConditions(state) {
  return state.sideConditions || emptySideConditions();
}

/** entity가 속한 진영 키: 보스는 'boss', 참가자는 조 이름(조 미배정은 '') */
export function sideKeyOf(entity) {
  return entity && entity.isParticipant ? entity.team || '' : 'boss';
}

/** entity 진영에 걸려 있는 사이드 컨디션 버킷(없으면 빈 객체) */
export function sideBucketOf(state, entity) {
  const sc = getSideConditions(state);
  const key = sideKeyOf(entity);
  return (key === 'boss' ? sc.boss : sc.teams[key]) || {};
}

export function isTrickRoom(state) {
  return getField(state).trickRoomTurns > 0;
}
export function hasTailwind(state, entity) {
  return (sideBucketOf(state, entity).tailwind || 0) > 0;
}

/**
 * 변화기술(moveData)이 설치하는 날씨/필드/트릭룸/사이드컨디션을 판별해 표준형으로 돌려준다.
 * 아무것도 설치하지 않으면 null.
 */
export function detectFieldEffect(moveData) {
  if (!moveData) return null;
  const fx = {};
  const w = WEATHER_FROM_MOVE[norm(moveData.weather)];
  if (w) fx.weather = w;
  const t = TERRAIN_FROM_MOVE[norm(moveData.terrain)];
  if (t) fx.terrain = t;
  if (norm(moveData.pseudoWeather) === 'trickroom') fx.trickRoom = true;
  if (norm(moveData.pseudoWeather) === 'gravity') fx.gravity = true;
  if (moveData.sideCondition && SIDE_CONDITIONS[moveData.sideCondition]) fx.sideCondition = moveData.sideCondition;
  return Object.keys(fx).length ? fx : null;
}

export function isFieldMove(moveData) {
  return detectFieldEffect(moveData) != null;
}

/**
 * detectFieldEffect 결과(fx)를 field/sideConditions에 반영한 새 객체와 로그 줄들을 돌려준다.
 * actor는 사이드 컨디션을 어느 진영에 걸지 결정하는 데 쓴다. 이미 걸려 있으면 "실패".
 */
export function applyFieldEffect(field, sideConditions, fx, actor, durationBonus) {
  if (!fx) return { field, sideConditions, lines: [] };
  const bonus = (kind) => (durationBonus ? durationBonus(actor, kind) : null);
  const lines = [];
  const nextField = { ...field };
  const nextSide = { boss: { ...sideConditions.boss }, teams: { ...sideConditions.teams } };

  if (fx.weather) {
    nextField.weather = fx.weather;
    nextField.weatherTurns = bonus('weather') || WEATHER_DURATION;
    lines.push(WEATHER_LABELS[fx.weather].set);
  }
  if (fx.terrain) {
    nextField.terrain = fx.terrain;
    nextField.terrainTurns = bonus('terrain') || TERRAIN_DURATION;
    lines.push(TERRAIN_LABELS[fx.terrain].set);
  }
  if (fx.trickRoom) {
    if (nextField.trickRoomTurns > 0) {
      nextField.trickRoomTurns = 0;
      lines.push('묘한 공간이 원래대로 돌아왔다!');
    } else {
      nextField.trickRoomTurns = TRICK_ROOM_DURATION;
      lines.push('묘한 공간이 만들어졌다!');
    }
  }
  if (fx.gravity) {
    nextField.gravityTurns = 5;
    lines.push('중력이 강해졌다!');
  }
  if (fx.sideCondition) {
    const key = sideKeyOf(actor);
    const bucket = key === 'boss' ? { ...nextSide.boss } : { ...(nextSide.teams[key] || {}) };
    if ((bucket[fx.sideCondition] || 0) > 0) {
      lines.push('하지만 실패했다!');
    } else {
      const scBonus = ['reflect', 'lightscreen', 'auroraveil'].includes(fx.sideCondition) ? bonus('screen') : null;
      bucket[fx.sideCondition] = scBonus || SIDE_CONDITIONS[fx.sideCondition].turns;
      lines.push(SIDE_CONDITIONS[fx.sideCondition].set);
    }
    if (key === 'boss') nextSide.boss = bucket;
    else nextSide.teams = { ...nextSide.teams, [key]: bucket };
  }

  return { field: nextField, sideConditions: nextSide, lines };
}

export function isGravity(state) {
  return getField(state).gravityTurns > 0;
}

/** attacker/defender 관점에서 @smogon/calc에 넘길 fieldState + 상태 차단 플래그를 만든다 */
export function buildFieldOptions(state, attacker, defender) {
  const field = getField(state);
  const aSide = sideBucketOf(state, attacker);
  const dSide = sideBucketOf(state, defender);
  return {
    weather: field.weather || undefined,
    terrain: field.terrain || undefined,
    attackerTailwind: (aSide.tailwind || 0) > 0,
    defenderReflect: (dSide.reflect || 0) > 0,
    defenderLightScreen: (dSide.lightscreen || 0) > 0,
    defenderAuroraVeil: (dSide.auroraveil || 0) > 0,
    defenderSafeguard: (dSide.safeguard || 0) > 0,
    defenderMist: (dSide.mist || 0) > 0,
  };
}

/** 모래바람/싸라기눈 턴종료 피해 (레이드 배수 전 원래 최대체력 기준) */
export function weatherChipTick(entity, weather) {
  if (!entity || entity.fainted || !weather) return { entity, lines: [] };
  if (weather !== 'Sand' && weather !== 'Hail') return { entity, lines: [] };
  const immune = WEATHER_CHIP_IMMUNE[weather] || [];
  if ((entity.types || []).some((t) => immune.includes(t))) return { entity, lines: [] };
  const dmg = Math.max(1, Math.floor((entity.formulaMaxHP || entity.maxHP) / 16));
  const currentHP = Math.max(0, entity.currentHP - dmg);
  const fainted = currentHP <= 0;
  const lines = [
    `${entity.nickname}은(는) ${WEATHER_LABELS[weather].name}에 휘말렸다! (-${dmg})${fainted ? ` — ${entity.nickname} 기절` : ''}`,
  ];
  return { entity: { ...entity, currentHP, fainted }, lines };
}

/** 그래스필드 턴종료 회복 (회복봉인이면 스킵) */
export function grassyHealTick(entity, terrain) {
  if (!entity || entity.fainted || terrain !== 'Grassy') return { entity, lines: [] };
  if (entity.healBlockTurns > 0 || entity.currentHP >= entity.maxHP) return { entity, lines: [] };
  const heal = Math.max(1, Math.floor((entity.formulaMaxHP || entity.maxHP) / 16));
  const currentHP = Math.min(entity.maxHP, entity.currentHP + heal);
  return {
    entity: { ...entity, currentHP },
    lines: [`${entity.nickname}은(는) 그래스필드의 효과로 체력을 회복했다! (+${currentHP - entity.currentHP})`],
  };
}

/** 라운드 전환 시 날씨/필드/트릭룸/사이드컨디션 지속시간을 1씩 줄이고 만료 로그를 만든다 */
export function tickFieldDurations(field, sideConditions) {
  const nextField = { ...field };
  const lines = [];

  if (nextField.weatherTurns > 0) {
    nextField.weatherTurns -= 1;
    if (nextField.weatherTurns === 0) {
      if (WEATHER_LABELS[nextField.weather]) lines.push(WEATHER_LABELS[nextField.weather].end);
      nextField.weather = '';
    }
  }
  if (nextField.terrainTurns > 0) {
    nextField.terrainTurns -= 1;
    if (nextField.terrainTurns === 0) {
      if (TERRAIN_LABELS[nextField.terrain]) lines.push(TERRAIN_LABELS[nextField.terrain].end);
      nextField.terrain = '';
    }
  }
  if (nextField.trickRoomTurns > 0) {
    nextField.trickRoomTurns -= 1;
    if (nextField.trickRoomTurns === 0) lines.push('묘한 공간이 원래대로 돌아왔다.');
  }
  if (nextField.gravityTurns > 0) {
    nextField.gravityTurns -= 1;
    if (nextField.gravityTurns === 0) lines.push('중력이 원래대로 돌아왔다.');
  }

  const tickBucket = (bucket, who) => {
    const next = { ...bucket };
    Object.keys(next).forEach((cond) => {
      if (next[cond] > 0) {
        next[cond] -= 1;
        if (next[cond] === 0) {
          delete next[cond];
          lines.push(`${who} 진영의 ${SIDE_CONDITIONS[cond]?.end || `${cond} 효과가 사라졌다!`}`);
        }
      }
    });
    return next;
  };

  const nextSide = {
    boss: tickBucket(sideConditions.boss, '보스'),
    teams: Object.fromEntries(
      Object.entries(sideConditions.teams).map(([key, bucket]) => [
        key,
        tickBucket(bucket, key ? `${key}조` : '참가자'),
      ])
    ),
  };

  return { field: nextField, sideConditions: nextSide, lines };
}

/** UI 표시용: 현재 걸려 있는 필드/사이드 효과를 [{text}] 배열로 */
export function describeActiveConditions(state) {
  const field = getField(state);
  const sc = getSideConditions(state);
  const out = [];
  if (field.weather) out.push({ text: `${WEATHER_LABELS[field.weather].name} ${field.weatherTurns}T` });
  if (field.terrain) out.push({ text: `${TERRAIN_LABELS[field.terrain].name} ${field.terrainTurns}T` });
  if (field.trickRoomTurns > 0) out.push({ text: `트릭룸 ${field.trickRoomTurns}T` });
  if (field.gravityTurns > 0) out.push({ text: `중력 ${field.gravityTurns}T` });
  const dumpBucket = (bucket, who) =>
    Object.entries(bucket).forEach(([cond, turns]) => {
      if (turns > 0) out.push({ text: `${who} ${SIDE_CONDITIONS[cond]?.name || cond} ${turns}T` });
    });
  dumpBucket(sc.boss, '보스');
  Object.entries(sc.teams).forEach(([key, bucket]) => dumpBucket(bucket, key ? `${key}조` : '참가자'));
  return out;
}
