// src/battle/data/customAbilities.js와 동일한 내용의 CommonJS 사본.
// functions/ 배포본은 저장소 루트의 src/를 포함하지 않으므로 이 파일을 직접 유지보수한다.
// (src 쪽을 고치면 이 파일도 함께 갱신할 것)

const customAbilities = {
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

  // 깜부기불 (메가부스터 전용)
  // 일격필살기 무효 + 대미지로 기절하는 상황이면(HP 잔량과 무관하게) HP 1로 버틴다.
  // Sturdy와 달리 풀피 조건이 없다.
  smolderingember: {
    name: 'Smoldering Ember',
    shortDesc: 'This Pokemon is unaffected by OHKO moves, and cannot be knocked out '
      + 'by a single hit regardless of its current HP.',
    onTryHit(target, source, move) {
      if (move.ohko) {
        this.add('-immune', target, '[from] ability: Smoldering Ember');
        return null;
      }
    },
    onDamage(damage, target, source, effect) {
      if (effect && effect.effectType === 'Move' && damage >= target.hp) {
        this.add('-ability', target, 'Smoldering Ember');
        return target.hp - 1;
      }
    },
    flags: {},
    rating: 3,
    num: 9002,
  },

  // 쾌속 (메가번치코 전용)
  // 매 턴 종료 시 스피드 1랭크 상승(가속과 동일). 상대가 이 포켓몬의 스피드를
  // 떨어뜨리는 것은 무효화된다.
  surgingspeed: {
    name: 'Surging Speed',
    shortDesc: "Raises this Pokemon's Speed by 1 stage at the end of each turn. "
      + "This Pokemon's Speed cannot be lowered by other Pokemon.",
    onResidualOrder: 27,
    onResidualSubOrder: 1,
    onResidual(pokemon) {
      if (pokemon.activeTurns) {
        this.boost({ spe: 1 });
      }
    },
    onBoost(boost, target, source, effect) {
      if (source && target !== source && boost.spe && boost.spe < 0) {
        delete boost.spe;
      }
    },
    flags: {},
    rating: 4,
    num: 9003,
  },

  // 천정부지 (메가저리더프 전용)
  // 땅타입 기술 면역(부유와 동일) + 공격으로 상대를 쓰러뜨리면 자신의 가장
  // 높은 능력치가 1랭크 상승(야수의힘과 동일한 방식).
  skyhigh: {
    name: 'Sky High',
    shortDesc: "This Pokemon is immune to Ground-type moves. Its highest stat is "
      + 'raised by 1 stage when it knocks out a target with a move.',
    onImmunity(type, pokemon) {
      if (type === 'Ground') return false;
    },
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === 'Move') {
        let statName = 'atk';
        let bestStat = 0;
        for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
          if (source.storedStats[stat] > bestStat) {
            statName = stat;
            bestStat = source.storedStats[stat];
          }
        }
        this.boost({ [statName]: length }, source);
      }
    },
    flags: {},
    rating: 3.5,
    num: 9004,
  },

  // 마왕 (메가오롱털 전용)
  // 변화기술의 우선도를 +1 한다. 짓궂은마음(Prankster)과 달리 pranksterBoosted
  // 플래그를 세우지 않으므로, 엔진의 악타입 무효화 판정이 걸리지 않는다.
  demonlord: {
    name: 'Demon Lord',
    shortDesc: "This Pokemon's status moves get +1 priority. Unlike Prankster, "
      + 'Dark-type targets are not immune to these moves.',
    onModifyPriority(priority, pokemon, target, move) {
      if (move?.category === 'Status') {
        return priority + 1;
      }
    },
    flags: {},
    rating: 4,
    num: 9005,
  },

  // 모래의지 (메가바랜드 전용)
  // 모래바람 대미지를 받지 않고(방진/모래숨기 계열과 동일한 훅), 모래바람
  // 상태일 때 스피드가 2배가 된다(모래헤치기와 동일).
  sandbound: {
    name: 'Sand Bound',
    shortDesc: 'This Pokemon takes no damage from Sandstorm, and its Speed is '
      + 'doubled while Sandstorm is active.',
    onImmunity(type, pokemon) {
      if (type === 'sandstorm') return false;
    },
    onModifySpe(spe, pokemon) {
      if (this.field.isWeather('sandstorm')) {
        return this.chainModify(2);
      }
    },
    flags: {},
    rating: 3,
    num: 9006,
  },

  // 화안금정 (메가초염몽 전용)
  // 급소율 +1랭크(천리안과 동일) + 급소 시 추가로 위력 1.2배.
  // 게임 기본 급소 배율(1.5배)과 곱해지면 총 1.8배가 된다.
  piercinggaze: {
    name: 'Piercing Gaze',
    shortDesc: "This Pokemon's critical hit ratio is raised by 1 stage, and its "
      + 'critical hits deal 1.2x more damage on top of the normal crit multiplier.',
    onModifyCritRatio(critRatio) {
      return critRatio + 1;
    },
    onBasePower(basePower, pokemon, target, move) {
      if (move.crit) {
        return this.chainModify(1.2);
      }
    },
    flags: {},
    rating: 3.5,
    num: 9007,
  },

  // 데이터베이스 (메가폴리곤Z 전용)
  // 같은 기술에 연속으로 피격당하면(직전에 맞은 기술과 이번에 맞은 기술이 동일)
  // 랜덤한 능력치 하나가 1랭크 상승한다. 필드에서 교체되면 기억이 초기화된다.
  database: {
    name: 'Database',
    shortDesc: 'When hit twice in a row by the same move, a random stat of this '
      + "Pokemon is raised by 1 stage. Resets when this Pokemon switches out.",
    onDamagingHit(damage, target, source, move) {
      const lastMoveId = this.effectState.lastMoveId;
      this.effectState.lastMoveId = move.id;
      if (lastMoveId && lastMoveId === move.id) {
        const stats = ['atk', 'def', 'spa', 'spd', 'spe'];
        const stat = stats[this.random(stats.length)];
        this.boost({ [stat]: 1 }, target, target);
      }
    },
    onSwitchOut() {
      this.effectState.lastMoveId = null;
    },
    flags: {},
    rating: 2.5,
    num: 9008,
  },

  // 적수성연 (메가누오 전용)
  // 매 턴 종료 시 자신과 (복식전에서의) 아군을 최대 HP의 1/16만큼 회복시킨다.
  flowingmercy: {
    name: 'Flowing Mercy',
    shortDesc: 'At the end of each turn, this Pokemon and its allies restore 1/16 '
      + 'of their max HP.',
    onResidualOrder: 6,
    onResidual(pokemon) {
      this.heal(pokemon.baseMaxhp / 16, pokemon);
      for (const ally of pokemon.side.active) {
        if (ally && ally !== pokemon && !ally.fainted) {
          this.heal(ally.baseMaxhp / 16, ally);
        }
      }
    },
    flags: {},
    rating: 3,
    num: 9009,
  },

  // 진혼성가 (메가라우드본 전용)
  // 불꽃 기술을 쓴 다음에 쓰는 고스트 기술, 고스트 기술을 쓴 다음에 쓰는
  // 불꽃 기술의 위력이 1.2배가 된다. 강화된 기술을 사용하면 효과는 사라진다.
  requiemhymn: {
    name: 'Requiem Hymn',
    shortDesc: "After using a Fire move, this Pokemon's next Ghost move deals "
      + '1.2x damage, and vice versa. The boost is consumed once used.',
    onBasePower(basePower, pokemon, target, move) {
      const lastType = this.effectState.lastType;
      if (
        (lastType === 'Fire' && move.type === 'Ghost')
        || (lastType === 'Ghost' && move.type === 'Fire')
      ) {
        this.effectState.lastType = null;
        return this.chainModify(1.2);
      }
    },
    onAfterMove(pokemon, target, move) {
      if (move.type === 'Fire' || move.type === 'Ghost') {
        this.effectState.lastType = move.type;
      }
    },
    flags: {},
    rating: 3.5,
    num: 9010,
  },

  // 애도공간 (메가치렁 전용)
  // 필드에 있는 동안, 어느 쪽이 사용하든 모든 고스트타입 기술의 위력이
  // 1.2배가 된다(페어리오라/악의오라와 동일한 필드 오라 방식).
  mourningfield: {
    name: 'Mourning Field',
    shortDesc: 'While this Pokemon is active, all Ghost-type moves used by any '
      + 'Pokemon on the field deal 1.2x damage.',
    onAnyBasePower(basePower, source, target, move) {
      if (move.type !== 'Ghost' || move.category === 'Status') return;
      return this.chainModify(1.2);
    },
    flags: {},
    rating: 3.5,
    num: 9011,
  },

  // ===== 아래부터는 팬 창작이 아니라 실제 「포켓몬 레전드 Z-A」/Pokémon Champions에
  // 공식으로 추가된 신규 특성이다. 효과는 Bulbapedia·Serebii·Kotaku 기사로 교차 확인한
  // 내용을 최대한 그대로 구현했지만, 실전 배틀에서 직접 검증하지는 못했다 — 특히
  // megasol과 piercingdrill은 엔진 내부 동작(차지턴 처리, 방어 기술 관통 순서)에
  // 크게 의존해서 오차가 있을 수 있다.

  // 메가솔 (메가메가니움 전용) — 항상 맑음 날씨인 것처럼 자신의 기술이 작동한다.
  megasol: {
    name: 'Mega Sol',
    shortDesc: "This Pokemon's moves behave as if Sunny Day were in effect, regardless of "
      + 'the actual weather (solar moves fire in one turn without power loss, Weather Ball '
      + 'becomes a 100 BP Fire move, Synthesis/Moonlight/Morning Sun heal 2/3 HP, Thunder '
      + 'and Hurricane drop to 50% accuracy).',
    onModifyMove(move, pokemon) {
      if (move.id === 'solarbeam' || move.id === 'solarblade') {
        if (move.flags?.charge) delete move.flags.charge;
        move.onBasePower = undefined;
      }
      if (move.id === 'weatherball') {
        move.type = 'Fire';
        move.basePower = 100;
      }
      if (move.id === 'thunder' || move.id === 'hurricane') {
        move.accuracy = 50;
      }
    },
    onSourceTryHeal(damage, target, source, effect) {
      if (source === target && effect && ['synthesis', 'moonlight', 'morningsun'].includes(effect.id)) {
        return Math.floor(target.baseMaxhp * 2 / 3);
      }
    },
    flags: {},
    rating: 4,
    num: 9012,
  },

  // 드래고나이즈 (메가장크로다일 전용) — 노말타입 기술이 드래곤타입이 되고 위력 1.2배.
  dragonize: {
    name: 'Dragonize',
    shortDesc: "This Pokemon's Normal-type moves become Dragon-type and get 1.2x power.",
    onModifyTypePriority: -1,
    onModifyType(move) {
      if (move.type === 'Normal') {
        move.type = 'Dragon';
        move.dragonizeBoosted = true;
      }
    },
    onBasePowerPriority: 8,
    onBasePower(basePower, pokemon, target, move) {
      if (move.dragonizeBoosted) {
        return this.chainModify(1.2);
      }
    },
    flags: {},
    rating: 4,
    num: 9013,
  },

  // 파이어메인 (메가화염레오 전용) — 불꽃타입 기술을 쓸 때 공격/특공이 1.5배.
  firemane: {
    name: 'Fire Mane',
    shortDesc: "This Pokemon's attacking stat is multiplied by 1.5 when using a Fire-type move.",
    onModifyAtkPriority: 5,
    onModifyAtk(atk, pokemon, target, move) {
      if (move.type === 'Fire') return this.chainModify(1.5);
    },
    onModifySpAPriority: 5,
    onModifySpA(spa, pokemon, target, move) {
      if (move.type === 'Fire') return this.chainModify(1.5);
    },
    flags: {},
    rating: 3.5,
    num: 9014,
  },

  // 스파이시스프레이 (메가스코빌런 전용) — 대미지를 주는 기술에 맞으면 상대를 화상 상태로.
  spicyspray: {
    name: 'Spicy Spray',
    shortDesc: 'When this Pokemon is hit by a damaging move, the attacker becomes burned '
      + '(even if this Pokemon faints from the hit).',
    onDamagingHit(damage, target, source, move) {
      if (source && source !== target) {
        source.trySetStatus('brn', target, this.effect);
      }
    },
    flags: {},
    rating: 3,
    num: 9015,
  },

  // 피어싱드릴 (메가몰드류 전용) — 접촉 기술로 상대의 대신맞기류 효과를 관통해
  // 1/4 위력으로 명중시킨다. (대신맞기 자체의 다른 효과는 그대로 발동)
  piercingdrill: {
    name: 'Piercing Drill',
    shortDesc: "This Pokemon's contact moves can hit through Protect-like moves for 1/4 "
      + 'damage; other effects of the protecting move still happen.',
    onTryHit(target, source, move) {
      if (move.flags?.contact && target.volatiles['protect']) {
        move.piercingDrillBoosted = true;
      }
    },
    onSourceModifyDamage(damage, source, target, move) {
      if (move.piercingDrillBoosted) return this.chainModify(0.25);
    },
    flags: {},
    rating: 3.5,
    num: 9016,
  },

  // 일리베이트 (메가저리더프(공식) 전용) — 땅타입 기술 면역 + 상대를 쓰러뜨리면
  // 자신의 가장 높은 능력치가 1랭크 상승. (우리 창작 특성 "천정부지"와 동일한 효과)
  eelevate: {
    name: 'Eelevate',
    shortDesc: 'This Pokemon is immune to Ground-type moves, Spikes, Toxic Spikes, and '
      + 'Sticky Web. Its highest stat is raised by 1 stage when it knocks out a target.',
    onImmunity(type, pokemon) {
      if (type === 'Ground') return false;
    },
    onSourceAfterFaint(length, target, source, effect) {
      if (effect && effect.effectType === 'Move') {
        let statName = 'atk';
        let bestStat = 0;
        for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
          if (source.storedStats[stat] > bestStat) {
            statName = stat;
            bestStat = source.storedStats[stat];
          }
        }
        this.boost({ [statName]: length }, source);
      }
    },
    flags: {},
    rating: 4,
    num: 9017,
  },

  // 탈 (Disguise) — 엔진 내장 특성 패치(신규 특성 아님).
  // @pkmn/sim에 내장된 탈 특성은 onDamage/onCriticalHit/onEffectiveness/onUpdate 네
  // 훅 전부가 target.species.id === 'mimikyu' | 'mimikyutotem'인지만 확인하도록
  // 하드코딩되어 있다. 커스텀 메가따라큐(species id: 'mimikyumega')는 이 목록에
  // 없어서 특성만 붙어있을 뿐 첫 대미지도 안 막고, 급소/상성 무효화도 안 되고, 폼이
  // 깨지는 1/8 대미지도 발동하지 않았다. 아래는 원본 로직을 그대로 복제하되
  // 'mimikyumega'를 인식 목록에 추가한 버전이다 — 일반 따라큐/따라큐(퇴마)는 원본과
  // 동일하게 동작하고 메가따라큐만 새로 정상 작동한다.
  // 메가따라큐 전용 "Busted" 폼(스탯/스프라이트)은 만들지 않았으므로, 메가폼이 깨질
  // 때는 폼체인지 대신 최대체력 1/8 대미지만 주고 이후로는 계속 무력화 상태로 남는다
  // (실전 결과는 원본과 동일: 스위치인당 1회용 방어, 깨진 뒤엔 재사용 불가).
  disguise: {
    name: 'Disguise',
    shortDesc: 'If this Pokemon is a Mimikyu (or Mega Mimikyu), the first hit it takes in '
      + 'battle deals 0 damage instead, and it takes 1/8 of its max HP damage.',
    onDamagePriority: 1,
    onDamage(damage, target, source, effect) {
      if (
        effect?.effectType === 'Move'
        && ['mimikyu', 'mimikyutotem', 'mimikyumega'].includes(target.species.id)
        && !this.effectState.busted
      ) {
        this.add('-activate', target, 'ability: Disguise');
        this.effectState.busted = true;
        return 0;
      }
    },
    onCriticalHit(target, source, move) {
      if (!target) return;
      if (!['mimikyu', 'mimikyutotem', 'mimikyumega'].includes(target.species.id)) return;
      const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub']
        && !(move.infiltrates && this.gen >= 6);
      if (hitSub) return;
      if (!target.runImmunity(move)) return;
      return false;
    },
    onEffectiveness(typeMod, target, type, move) {
      if (!target || move.category === 'Status') return;
      if (!['mimikyu', 'mimikyutotem', 'mimikyumega'].includes(target.species.id)) return;
      const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub']
        && !(move.infiltrates && this.gen >= 6);
      if (hitSub) return;
      if (!target.runImmunity(move)) return;
      return 0;
    },
    onUpdate(pokemon) {
      if (!this.effectState.busted) return;
      if (['mimikyu', 'mimikyutotem'].includes(pokemon.species.id)) {
        const speciesid = pokemon.species.id === 'mimikyutotem' ? 'Mimikyu-Busted-Totem' : 'Mimikyu-Busted';
        pokemon.formeChange(speciesid, this.effect, true);
        this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
      } else if (pokemon.species.id === 'mimikyumega' && !this.effectState.bustedDamageDealt) {
        this.effectState.bustedDamageDealt = true;
        this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.effect);
      }
    },
    flags: {
      failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
      breakable: 1, notransform: 1,
    },
    rating: 3.5,
    num: 209,
  },
};

module.exports = customAbilities;
