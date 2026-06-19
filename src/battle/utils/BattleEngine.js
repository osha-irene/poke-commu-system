import showdownIntegration from './ShowdownIntegration';
import fieldEffectsManager from './FieldEffectsManager';
import statusManager from './StatusManager';
import { translateWeatherName } from './battleTranslations';

/**
 * 완전한 포켓몬 배틀 엔진
 * 쇼다운의 모든 계산식과 데이터를 활용
 */
class BattleEngine {
  constructor() {
    this.battleLog = [];
  }

  /**
   * 배틀 로그 추가
   */
  log(message, type = 'info') {
    const logEntry = {
      message,
      type,
      timestamp: Date.now(),
    };
    this.battleLog.push(logEntry);
    console.log(`[BattleEngine] ${message}`);
    return logEntry;
  }

  /**
   * 배틀 로그 초기화
   */
  clearLog() {
    this.battleLog = [];
  }

  /**
   * 배틀 로그 가져오기
   */
  getLog() {
    return [...this.battleLog];
  }

  /**
   * 턴 시작 처리
   */
  processTurnStart(pokemon, fieldState) {
    const effects = [];

    // 날씨 데미지
    const weatherDamage = fieldEffectsManager.calculateWeatherDamage(pokemon, fieldState.weather);
    if (weatherDamage > 0) {
      effects.push({
        type: 'weather_damage',
        damage: weatherDamage,
        message: `${pokemon.nickname || pokemon.name}은(는) ${fieldState.weather} 데미지를 받았다!`,
      });
    }

    // 지형 힐
    const terrainHealing = fieldEffectsManager.calculateTerrainHealing(pokemon, fieldState.terrain);
    if (terrainHealing > 0) {
      effects.push({
        type: 'terrain_healing',
        healing: terrainHealing,
        message: `${pokemon.nickname || pokemon.name}의 HP가 회복되었다!`,
      });
    }

    // 상태이상 데미지
    const statusDamage = statusManager.calculateStatusDamage(pokemon, fieldState.turn);
    if (statusDamage.damage > 0) {
      effects.push({
        type: 'status_damage',
        damage: statusDamage.damage,
        effects: statusDamage.effects,
        message: `${pokemon.nickname || pokemon.name}은(는) ${statusDamage.effects.join(', ')}!`,
      });
    }

    return effects;
  }

  /**
   * 기술 사용 가능 여부 확인
   */
  canUseMove(pokemon, move, fieldState) {
    // 상태이상 체크
    const statusCheck = statusManager.canUseMove(pokemon, move);
    if (!statusCheck.canUse) {
      this.log(`${pokemon.nickname || pokemon.name}: ${statusCheck.reason}`, 'status');
      return statusCheck;
    }

    // PP 체크
    if (move.currentPP <= 0) {
      this.log(`${move.name}의 PP가 부족합니다!`, 'error');
      return { canUse: false, reason: 'PP가 부족합니다!' };
    }

    return { canUse: true };
  }

  getEntryWeatherEffect(pokemon) {
    const weatherSetters = {
      'Drizzle': { weather: 'Rain', message: '비가 내리기 시작했다!' },
      'Drought': { weather: 'Sun', message: '햇살이 강해졌다!' },
      'Sand Stream': { weather: 'Sand', message: '모래바람이 불기 시작했다!' },
      'Snow Warning': { weather: 'Snow', message: '눈이 내리기 시작했다!' },
    };

    return weatherSetters[pokemon.ability] || null;
  }

  processEntryAbility(pokemon, fieldState) {
    const weatherEffect = this.getEntryWeatherEffect(pokemon);
    if (!weatherEffect || fieldState.weather === weatherEffect.weather) return null;

    fieldState.weather = weatherEffect.weather;
    fieldState.weatherTurns = 5;

    const message = `${pokemon.nickname || pokemon.name}의 ${pokemon.ability}! ${weatherEffect.message}`;
    this.log(message, 'weather');
    return { ...weatherEffect, message };
  }

  normalizeVolatileStatus(status) {
    const statusMap = {
      disable: 'Disable',
      confusion: 'Confusion',
      flinch: 'Flinch',
      attract: 'Infatuation',
      leechseed: 'Leech Seed',
      encore: 'Encore',
      taunt: 'Taunt',
      torment: 'Torment',
      yawn: 'Yawn',
      substitute: 'Substitute',
      protect: 'Protect',
    };

    const key = String(status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return statusMap[key] || status;
  }

  /**
   * 명중 판정
   */
  checkAccuracy(attacker, defender, move, fieldState) {
    // 필중 기술
    if (!move.accuracy || move.accuracy === true) {
      this.log('필중 기술!', 'calculation');
      return true;
    }
    
    const accuracy = statusManager.calculateAccuracy(attacker, defender, move, fieldState);
    const roll = Math.random() * 100;
    
    // roll이 accuracy보다 작으면 명중
    const hit = roll < accuracy;
    
    this.log(
      `명중 판정: ${accuracy.toFixed(1)}% (기준) vs ${roll.toFixed(1)} (주사위) = ${hit ? '✅ 명중' : '❌ 빗나감'}`,
      'calculation'
    );
    
    return hit;
  }

  /**
   * 크리티컬 판정
   */
  checkCritical(attacker, move) {
    const critChance = statusManager.calculateCriticalChance(attacker, move);
    const roll = Math.random();
    
    const isCrit = roll < critChance;
    
    if (isCrit) {
      this.log(`급소에 맞았다!`, 'critical');
    }
    
    return isCrit;
  }

  /**
   * 완전한 데미지 계산
   */
  calculateDamage(attacker, defender, moveName, fieldState = {}, options = {}) {
    // 기본 데미지 계산 (쇼다운 계산기 사용)
    const baseResult = showdownIntegration.calculateDamage(
      attacker,
      defender,
      moveName,
      fieldState,
      options
    );

    if (baseResult.error) {
      this.log(`데미지 계산 오류: ${baseResult.error}`, 'error');
      return baseResult;
    }

    const damageRolls = Array.isArray(baseResult.damage) ? baseResult.damage : [baseResult.damage];
    const rollIndex = options.skipRandom
      ? Math.floor(damageRolls.length / 2)
      : Math.floor(Math.random() * damageRolls.length);
    let finalDamage = Number(damageRolls[rollIndex] || 0);

    const moveData = baseResult.moveData;
    const effects = [];

    // 날씨 효과
    const weatherEffect = fieldEffectsManager.applyWeatherToMove(
      moveName,
      attacker,
      defender,
      fieldState.weather
    );
    if (weatherEffect.multiplier !== 1) {
      finalDamage *= weatherEffect.multiplier;
      effects.push(`날씨 효과: ×${weatherEffect.multiplier}`);
    }

    // 지형 효과
    const terrainEffect = fieldEffectsManager.applyTerrainToMove(
      moveName,
      attacker,
      fieldState.terrain
    );
    if (terrainEffect.blocked) {
      this.log(`${moveData.nameKo}은(는) 지형에 의해 막혔다!`, 'blocked');
      return {
        ...baseResult,
        damage: 0,
        blocked: true,
        message: `${moveData.nameKo}은(는) 차단되었다!`,
      };
    }
    if (terrainEffect.multiplier !== 1) {
      finalDamage *= terrainEffect.multiplier;
      effects.push(`지형 효과: ×${terrainEffect.multiplier}`);
    }

    // 사이드 상태 (리플렉터, 빛의장막 등)
    const sideConditions = fieldState.defenderSideConditions || [];
    const sideModifiedDamage = fieldEffectsManager.applySideConditionsToMove(
      finalDamage,
      moveData.category,
      sideConditions
    );
    if (sideModifiedDamage !== finalDamage) {
      finalDamage = sideModifiedDamage;
      effects.push(`사이드 효과`);
    }

    const isCritical = Boolean(options.isCritical || options.isCrit);
    if (isCritical) effects.push(`급소!`);

    finalDamage = Math.floor(finalDamage);

    this.log(
      `${attacker.nickname || attacker.name}의 ${moveData.nameKo} → ${defender.nickname || defender.name}에게 ${finalDamage} 데미지!`,
      'damage'
    );

    return {
      ...baseResult,
      damage: finalDamage,
      originalDamage: baseResult.damage,
      effects,
      isCritical,
      moveData,
    };
  }

  /**
   * 기술 사용 처리
   */
  executeMove(attacker, defender, moveName, fieldState = {}) {
    const moveData = showdownIntegration.getMove(moveName);
    if (!moveData) {
      this.log(`기술을 찾을 수 없음: ${moveName}`, 'error');
      return {
        success: false,
        error: '기술을 찾을 수 없습니다.',
      };
    }

    // 기술 사용 가능 여부 확인
    const canUse = this.canUseMove(attacker, moveData, fieldState);
    if (!canUse.canUse) {
      return {
        success: false,
        reason: canUse.reason,
        selfDamage: canUse.selfDamage,
      };
    }

    this.log(
      `${attacker.nickname || attacker.name}의 ${moveData.nameKo}!`,
      'move'
    );

    // 명중 판정
    if (!this.checkAccuracy(attacker, defender, moveData, fieldState)) {
      this.log(`${moveData.nameKo}은(는) 빗나갔다!`, 'miss');
      return {
        success: false,
        missed: true,
        message: `${moveData.nameKo}은(는) 빗나갔다!`,
      };
    }

    let result = {
      success: true,
      moveName: moveData.nameKo,
      moveData,
      effects: [],
    };

    // 데미지 기술
    if (moveData.category !== 'Status' && moveData.basePower > 0) {
      const isCritical = this.checkCritical(attacker, moveData);
      const damageResult = this.calculateDamage(
        attacker,
        defender,
        moveName,
        fieldState,
        { isCritical, isCrit: isCritical }
      );

      result.damage = damageResult.damage;
      result.effects = Array.isArray(damageResult.effects) ? [...damageResult.effects] : [];
      result.isCritical = damageResult.isCritical;

      // 반동 데미지
      if (moveData.recoil) {
        const recoilDamage = Math.floor(damageResult.damage * Math.abs(moveData.recoil[0] / moveData.recoil[1]));
        result.recoilDamage = recoilDamage;
        this.log(`${attacker.nickname || attacker.name}은(는) 반동 데미지 ${recoilDamage}를 받았다!`, 'recoil');
      }

      // 흡수
      if (moveData.drain) {
        const drainAmount = Math.floor(damageResult.damage * Math.abs(moveData.drain[0] / moveData.drain[1]));
        result.drainAmount = drainAmount;
        this.log(`${attacker.nickname || attacker.name}은(는) HP를 ${drainAmount} 흡수했다!`, 'drain');
      }
    }

    // 상태이상 부여
    if (moveData.status) {
      if (statusManager.canApplyMajorStatus(defender, moveData.status)) {
        result.statusInflicted = moveData.status;
        const statusName = statusManager.getStatusName(moveData.status);
        this.log(`${defender.nickname || defender.name}은(는) ${statusName} 상태가 되었다!`, 'status');
      }
    }

    if (moveData.volatileStatus) {
      const volatileStatus = this.normalizeVolatileStatus(moveData.volatileStatus);
      if (statusManager.canApplyVolatileStatus(defender, volatileStatus)) {
        result.volatileStatusInflicted = volatileStatus;

        if (volatileStatus === 'Disable') {
          if (!defender.lastMove) {
            this.log('하지만 실패했다!', 'fail');
            return {
              success: false,
              failed: true,
              message: '하지만 실패했다!',
            };
          }

          result.disabledMove = defender.lastMove;
          result.disableTurns = statusManager.volatileStatus.Disable?.duration || 4;
          this.log(`${defender.nickname || defender.name}의 ${defender.lastMove}이(가) 봉인됐다!`, 'status');
        } else {
          const statusName = statusManager.getStatusName(volatileStatus, true);
          this.log(`${defender.nickname || defender.name}은(는) ${statusName} 상태가 되었다!`, 'status');
        }
      }
    }

    // 능력 변화
    if (moveData.boosts) {
      result.boosts = moveData.boosts;
      const boostMessages = Object.entries(moveData.boosts)
        .filter(([stat, value]) => value !== 0)
        .map(([stat, value]) => {
          const statNames = {
            atk: '공격',
            def: '방어',
            spa: '특공',
            spd: '특방',
            spe: '스피드',
            accuracy: '명중률',
            evasion: '회피율',
          };
          const direction = value > 0 ? '올랐다' : '떨어졌다';
          return `${statNames[stat]}이(가) ${Math.abs(value)}단계 ${direction}`;
        });
      boostMessages.forEach(msg => this.log(msg, 'boost'));
    }

    // 날씨/지형 변경
    if (moveData.weather) {
      result.weather = moveData.weather;
      const weatherMsg = moveData.weather === 'none'
        ? '날씨가 원래대로 돌아왔다!'
        : `${translateWeatherName(moveData.weather)} 날씨가 시작됐다!`;
      this.log(weatherMsg, 'weather');
    }
    if (moveData.terrain) {
      result.terrain = moveData.terrain;
      this.log(`필드가 ${moveData.terrain}(으)로 바뀌었다!`, 'terrain');
    }

    attacker.lastMove = moveData.id;

    return result;
  }

  /**
   * 턴 종료 처리
   */
  processTurnEnd(pokemon, fieldState) {
    const effects = this.processTurnStart(pokemon, fieldState);
    
    let totalDamage = 0;
    let totalHealing = 0;

    if (pokemon.disableTurns > 0) {
      pokemon.disableTurns -= 1;
      if (pokemon.disableTurns <= 0) {
        pokemon.volatileStatus = (pokemon.volatileStatus || []).filter(status => status !== 'Disable');
        pokemon.disabledMove = null;
        effects.push({
          type: 'volatile_end',
          message: `${pokemon.nickname || pokemon.name}의 사슬묶기가 풀렸다.`,
        });
      }
    }

    effects.forEach(effect => {
      if (effect.damage) totalDamage += effect.damage;
      if (effect.healing) totalHealing += effect.healing;
    });

    return {
      damage: totalDamage,
      healing: totalHealing,
      effects,
    };
  }

  /**
   * 입장 시 처리
   */
  processEntry(pokemon, sideConditions) {
    const hazardResult = fieldEffectsManager.calculateEntryHazardDamage(
      pokemon,
      sideConditions
    );

    if (hazardResult.damage > 0) {
      this.log(
        `${pokemon.nickname || pokemon.name}은(는) 해저드 데미지 ${hazardResult.damage}를 받았다!`,
        'hazard'
      );
    }

    if (hazardResult.effects?.status) {
      this.log(
        `${pokemon.nickname || pokemon.name}은(는) ${hazardResult.effects.status} 상태가 되었다!`,
        'status'
      );
    }

    if (hazardResult.effects?.speedDrop) {
      this.log(
        `${pokemon.nickname || pokemon.name}의 스피드가 떨어졌다!`,
        'boost'
      );
    }

    return hazardResult;
  }

  /**
   * 스피드 비교
   */
  compareSpeed(pokemon1, pokemon2, fieldState = {}) {
    // @smogon/calc Pokemon 객체에서 실제 스피드 계산
    let speed1 = this.getActualSpeed(pokemon1);
    let speed2 = this.getActualSpeed(pokemon2);

    // 능력 변화
    if (pokemon1.boosts?.spe) {
      speed1 = statusManager.applyStatBoosts(speed1, pokemon1.boosts, 'spe');
    }
    if (pokemon2.boosts?.spe) {
      speed2 = statusManager.applyStatBoosts(speed2, pokemon2.boosts, 'spe');
    }

    // 상태이상
    speed1 *= statusManager.getSpeedMultiplier(pokemon1);
    speed2 *= statusManager.getSpeedMultiplier(pokemon2);

    // 날씨/지형 특성
    const weather = fieldState.weather;
    if (weather) {
      speed1 *= fieldEffectsManager.applyWeatherAbility(pokemon1, weather, 'spe');
      speed2 *= fieldEffectsManager.applyWeatherAbility(pokemon2, weather, 'spe');
    }

    // 순풍
    if (fieldState.p1SideConditions?.includes('Tailwind')) {
      speed1 *= 2;
    }
    if (fieldState.p2SideConditions?.includes('Tailwind')) {
      speed2 *= 2;
    }

    this.log(
      `스피드 비교: ${pokemon1.nickname || pokemon1.name}(${Math.floor(speed1)}) vs ${pokemon2.nickname || pokemon2.name}(${Math.floor(speed2)})`,
      'calculation'
    );

    return speed1 > speed2 ? 1 : speed1 < speed2 ? -1 : 0;
  }

  /**
   * 포켓몬의 실제 스피드 계산 (종족값 + 개체값 + 노력치 + 성격)
   */
  getActualSpeed(pokemon) {
    try {
      // @smogon/calc Pokemon 객체 생성해서 실수치 가져오기
      const calcPokemon = showdownIntegration.createCalcPokemon(pokemon);
      return calcPokemon.rawStats.spe || 100;
    } catch (error) {
      console.warn('[BattleEngine] 스피드 계산 실패, 간이 계산 사용');
      
      // 폴백: 레벨 50 간이 계산식
      // 종족값 찾기
      let baseSpeed = 100;
      if (pokemon.baseStats?.spe) {
        baseSpeed = pokemon.baseStats.spe;
      } else {
        // PokeAPI 데이터에서 종족값 가져오기 시도
        const speciesData = showdownIntegration.getSpecies(pokemon.species || pokemon.name);
        if (speciesData?.baseStats?.spe) {
          baseSpeed = speciesData.baseStats.spe;
        }
      }
      
      const iv = pokemon.ivs?.spe ?? 31;
      const ev = pokemon.evs?.spe || 0;
      const level = pokemon.level || 50;
      
      // 실수치 = (종족값 * 2 + 개체값 + 노력치/4) * 레벨/100 + 5
      const stat = Math.floor((baseSpeed * 2 + iv + Math.floor(ev / 4)) * level / 100 + 5);

      return stat;
    }
  }

  /**
   * 배틀 초기 상태 생성
   */
  createInitialBattleState(players) {
    return {
      turn: 0,
      players: players.map(player => ({
        team: player.team || [],
        active: player.active || null,
        sideConditions: [],
      })),
      field: fieldEffectsManager.createInitialField(),
      log: [],
    };
  }
}

const battleEngine = new BattleEngine();

export default battleEngine;
