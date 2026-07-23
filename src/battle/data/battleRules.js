// 배틀 특수룰(포맷 변형) 정의.
// buildFormat(baseFormat)은 기본 포맷 객체를 받아 규칙이 반영된 새 포맷 객체를 반환한다.
// @pkmn/sim의 Battle 엔진은 format 객체에 onXxx 훅을 얹으면 이벤트 발생 시 자동으로 호출해주므로
// (sim/battle.js의 findBattleEventHandlers 참고), 새 룰을 추가하려면 이 배열에 항목만 추가하면 된다.

export const DEFAULT_BATTLE_RULE_ID = 'standard';

export const BATTLE_RULES = [
  {
    id: 'standard',
    name: '기본 배틀',
    description: '일반적인 타입 상성 그대로, 한쪽당 1마리씩 진행합니다.',
    activeCount: 1,
    buildFormat: (baseFormat) => baseFormat,
  },
  {
    id: 'inverse',
    name: '거꾸로 배틀',
    description: '타입 상성이 반전됩니다. 약점은 저항으로, 저항과 무효(타입 무효 포함)는 약점으로 바뀝니다.',
    activeCount: 1,
    // Pokemon Showdown 공식 "Inverse Mod" 룰셋(data/rulesets.ts의 inversemod)의
    // onNegateImmunity / onEffectiveness 로직을 그대로 이식.
    buildFormat: (baseFormat) => ({
      ...baseFormat,
      name: `${baseFormat.name} (거꾸로 배틀)`,
      onNegateImmunity: false,
      onEffectivenessPriority: 1,
      onEffectiveness(typeMod, target, type, move) {
        // 프리즈드라이의 물 타입 효과는 거꾸로배틀에서도 반전되지 않는다.
        if (move && move.id === 'freezedry' && type === 'Water') return;
        // 원래 무효였던 타입 조합은 약점(2배)으로 취급한다.
        if (move && !this.dex.getImmunity(move, type)) return 1;
        if (typeMod) return -typeMod;
      },
    }),
  },
  {
    id: 'doubles',
    name: '더블 배틀',
    description: '양쪽 모두 포켓몬 2마리가 동시에 필드에 나와 싸웁니다. 기술마다 대상을 직접 지정합니다.',
    activeCount: 2,
    // @pkmn/sim에 내장된 더블배틀 포맷(gameType: 'doubles')을 그대로 사용.
    baseFormatId: 'gen9doublescustomgame',
    buildFormat: (baseFormat) => baseFormat,
  },
];

export const getBattleRule = (ruleId) =>
  BATTLE_RULES.find(rule => rule.id === ruleId) || BATTLE_RULES.find(rule => rule.id === DEFAULT_BATTLE_RULE_ID);
