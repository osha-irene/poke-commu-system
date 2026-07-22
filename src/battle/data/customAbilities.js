// 배틀 엔진(@pkmn/sim)에 런타임으로 주입하는 커스텀 특성 정의.
// Showdown 특성 이벤트 훅 포맷을 그대로 따르며, useAdvancedBattle.js의
// registerCustomBattleData()에서 Dex.data.Abilities에 등록된다.

export const customAbilities = {
  // 적토성산 (메가토오 전용)
  // 받은 공격 횟수(pokemon.timesAttacked)만큼 다음 독타입 기술의 위력이
  // 30씩 증가(최대 300). 필드에서 교체되어 볼로 돌아가면 초기화된다.
  toxicbuildup: {
    name: 'Toxic Buildup',
    shortDesc: 'This Pokemon\'s next Poison-type move gets +30 power for each hit '
      + 'it has taken (max +300). Resets when this Pokemon switches out.',
    onBasePower(basePower, pokemon, target, move) {
      if (move.type !== 'Poison') return;
      const boost = Math.min(300, pokemon.timesAttacked * 30);
      if (boost) return basePower + boost;
    },
    // 공격을 받을 때마다 누적된 위력 보너스를 배틀 로그에 표시한다.
    // 이 훅은 엔진이 target.timesAttacked를 증가시키기 "전"에 실행되므로 +1로 보정한다.
    onDamagingHit(damage, target, source, move) {
      const boost = Math.min(300, (target.timesAttacked + 1) * 30);
      this.add('-activate', target, 'ability: Toxic Buildup', `[power] ${boost}`);
    },
    onSwitchOut(pokemon) {
      pokemon.timesAttacked = 0;
    },
    flags: {},
    rating: 3.5,
    num: 9001,
  },
};

export default customAbilities;
