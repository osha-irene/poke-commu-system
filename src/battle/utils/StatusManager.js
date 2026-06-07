/**
 * 상태이상 및 능력 변화 관리 클래스
 */
class StatusManager {
  constructor() {
    // 주요 상태이상 정의
    this.majorStatus = {
      'Burn': {
        name: '화상',
        nameEn: 'Burn',
        damagePerTurn: 1/16,
        attackMultiplier: 0.5,
        immuneTypes: ['Fire'],
        immuneAbilities: ['Water Veil', 'Water Bubble'],
      },
      'Freeze': {
        name: '얼음',
        nameEn: 'Freeze',
        skipsTurn: true,
        thawChance: 0.2,
        thawOnFireMove: true,
        immuneTypes: ['Ice'],
        immuneAbilities: ['Magma Armor'],
      },
      'Paralysis': {
        name: '마비',
        nameEn: 'Paralysis',
        speedMultiplier: 0.5,
        fullParalysisChance: 0.25,
        immuneTypes: ['Electric'],
        immuneAbilities: ['Limber'],
      },
      'Poison': {
        name: '독',
        nameEn: 'Poison',
        damagePerTurn: 1/8,
        immuneTypes: ['Poison', 'Steel'],
        immuneAbilities: ['Immunity'],
      },
      'Badly Poison': {
        name: '맹독',
        nameEn: 'Badly Poison',
        damagePerTurn: null, // 턴마다 증가
        immuneTypes: ['Poison', 'Steel'],
        immuneAbilities: ['Immunity'],
      },
      'Sleep': {
        name: '잠듦',
        nameEn: 'Sleep',
        skipsTurn: true,
        minTurns: 1,
        maxTurns: 3,
        immuneAbilities: ['Insomnia', 'Vital Spirit'],
      },
    };

    // 휘발성 상태 (배틀 중에만 유지)
    this.volatileStatus = {
      'Confusion': {
        name: '혼란',
        nameEn: 'Confusion',
        duration: { min: 1, max: 4 },
        selfDamageChance: 0.33,
        selfDamagePower: 40,
      },
      'Flinch': {
        name: '풀죽음',
        nameEn: 'Flinch',
        skipsTurn: true,
        duration: 1,
      },
      'Infatuation': {
        name: '헤롱헤롱',
        nameEn: 'Infatuation',
        immobilizeChance: 0.5,
        requiresOppositeGender: true,
      },
      'Leech Seed': {
        name: '씨뿌리기',
        nameEn: 'Leech Seed',
        drainPerTurn: 1/8,
        immuneTypes: ['Grass'],
      },
      'Curse': {
        name: '저주',
        nameEn: 'Curse',
        damagePerTurn: 1/4,
      },
      'Nightmare': {
        name: '악몽',
        nameEn: 'Nightmare',
        damagePerTurn: 1/4,
        requiresStatus: 'Sleep',
      },
      'Encore': {
        name: '앵콜',
        nameEn: 'Encore',
        duration: 3,
        forcesMove: true,
      },
      'Taunt': {
        name: '도발',
        nameEn: 'Taunt',
        duration: 3,
        blocksStatus: true,
      },
      'Torment': {
        name: '트집',
        nameEn: 'Torment',
        blocksConsecutiveMoves: true,
      },
      'Disable': {
        name: '사슬묶기',
        nameEn: 'Disable',
        duration: 4,
        blocksLastMove: true,
      },
      'Yawn': {
        name: '하품',
        nameEn: 'Yawn',
        turnsUntilSleep: 1,
      },
      'Substitute': {
        name: '대타출동',
        nameEn: 'Substitute',
        hpCost: 0.25,
        blocksStatus: true,
        blocksDamage: true,
      },
      'Protect': {
        name: '방어',
        nameEn: 'Protect',
        blocksAttacks: true,
        duration: 1,
        successRate: 1,
        consecutiveFailureMultiplier: 0.33,
      },
    };

    // 능력 변화 스테이지
    this.statStages = {
      '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
      '0': 1,
      '+1': 3/2, '+2': 4/2, '+3': 5/2, '+4': 6/2, '+5': 7/2, '+6': 8/2,
    };
  }

  /**
   * 주요 상태이상 적용 가능 여부 확인
   */
  canApplyMajorStatus(pokemon, status) {
    // 이미 상태이상이 있으면 불가
    if (pokemon.status && pokemon.status !== '') return false;

    const statusData = this.majorStatus[status];
    if (!statusData) return true;

    // 타입 면역
    if (statusData.immuneTypes) {
      const hasImmuneType = pokemon.types?.some(type => 
        statusData.immuneTypes.includes(type)
      );
      if (hasImmuneType) return false;
    }

    // 특성 면역
    if (statusData.immuneAbilities?.includes(pokemon.ability)) {
      return false;
    }

    // 세이프가드
    if (pokemon.volatileStatus?.includes('Safeguard')) {
      return false;
    }

    return true;
  }

  /**
   * 휘발성 상태 적용 가능 여부 확인
   */
  canApplyVolatileStatus(pokemon, status) {
    const statusData = this.volatileStatus[status];
    if (!statusData) return true;

    // 타입 면역
    if (statusData.immuneTypes) {
      const hasImmuneType = pokemon.types?.some(type => 
        statusData.immuneTypes.includes(type)
      );
      if (hasImmuneType) return false;
    }

    // 대타출동 체크
    if (pokemon.volatileStatus?.includes('Substitute') && 
        statusData.blockedBySubstitute !== false) {
      return false;
    }

    // 특정 조건 체크
    if (status === 'Nightmare' && pokemon.status !== 'Sleep') {
      return false;
    }

    return true;
  }

  /**
   * 상태이상 데미지 계산 (턴 종료 시)
   */
  calculateStatusDamage(pokemon, turn = 1) {
    const maxHP = pokemon.maxHP || pokemon.stats?.hp || 100;
    let damage = 0;
    const effects = [];

    // 주요 상태이상
    if (pokemon.status) {
      const statusData = this.majorStatus[pokemon.status];
      
      if (statusData?.damagePerTurn) {
        if (pokemon.status === 'Badly Poison') {
          // 맹독은 턴마다 증가
          damage += maxHP * (turn / 16);
          effects.push(`${statusData.name} 데미지 (턴 ${turn})`);
        } else {
          damage += maxHP * statusData.damagePerTurn;
          effects.push(`${statusData.name} 데미지`);
        }
      }
    }

    // 휘발성 상태이상
    if (pokemon.volatileStatus) {
      pokemon.volatileStatus.forEach(status => {
        const statusData = this.volatileStatus[status];
        
        if (statusData?.damagePerTurn) {
          damage += maxHP * statusData.damagePerTurn;
          effects.push(`${statusData.name} 데미지`);
        }
        
        if (statusData?.drainPerTurn) {
          damage += maxHP * statusData.drainPerTurn;
          effects.push(`${statusData.name} 흡수`);
        }
      });
    }

    return { damage, effects };
  }

  /**
   * 상태이상이 공격력에 미치는 영향
   */
  getAttackMultiplier(pokemon, moveCategory) {
    if (pokemon.status === 'Burn' && moveCategory === 'Physical') {
      // 근성 특성은 화상 패널티 무시
      if (pokemon.ability === 'Guts') return 1;
      return 0.5;
    }
    return 1;
  }

  /**
   * 상태이상이 스피드에 미치는 영향
   */
  getSpeedMultiplier(pokemon) {
    if (pokemon.status === 'Paralysis') {
      // 쾌속 특성은 마비 패널티 무시
      if (pokemon.ability === 'Quick Feet') return 1;
      return 0.5;
    }
    return 1;
  }

  /**
   * 기술 사용 가능 여부 확인
   */
  canUseMove(pokemon, move) {
    // 잠듦
    if (pokemon.status === 'Sleep') {
      const sleepTurns = pokemon.sleepTurns || 0;
      const statusData = this.majorStatus['Sleep'];
      if (sleepTurns < (statusData.minTurns || 1)) {
        return { canUse: false, reason: '잠들어 있다!' };
      }
      // 잠꼬대 등 특수 기술은 사용 가능
      if (move.sleepUsable) {
        return { canUse: true };
      }
      return { canUse: false, reason: '잠들어 있다!' };
    }

    // 얼음
    if (pokemon.status === 'Freeze') {
      // 불꽃 기술은 해동
      if (move.type === 'Fire') {
        return { canUse: true, thaws: true };
      }
      return { canUse: false, reason: '얼어붙어 있다!' };
    }

    // 마비 (25% 확률로 못 움직임)
    if (pokemon.status === 'Paralysis') {
      const fullParalysisChance = this.majorStatus['Paralysis'].fullParalysisChance;
      if (Math.random() < fullParalysisChance) {
        return { canUse: false, reason: '마비로 움직일 수 없다!' };
      }
    }

    // 풀죽음
    if (pokemon.volatileStatus?.includes('Flinch')) {
      return { canUse: false, reason: '풀이 죽어 움직일 수 없다!' };
    }

    // 혼란
    if (pokemon.volatileStatus?.includes('Confusion')) {
      const confusionData = this.volatileStatus['Confusion'];
      if (Math.random() < confusionData.selfDamageChance) {
        return { 
          canUse: false, 
          reason: '혼란에 빠져 자신을 공격했다!',
          selfDamage: true,
        };
      }
    }

    // 헤롱헤롱
    if (pokemon.volatileStatus?.includes('Infatuation')) {
      const infatuationData = this.volatileStatus['Infatuation'];
      if (Math.random() < infatuationData.immobilizeChance) {
        return { canUse: false, reason: '헤롱헤롱 상태로 움직일 수 없다!' };
      }
    }

    // 도발 (상태 기술 불가)
    if (pokemon.volatileStatus?.includes('Taunt') && move.category === 'Status') {
      return { canUse: false, reason: '도발 상태라 상태 기술을 사용할 수 없다!' };
    }

    // 앵콜 (마지막 기술만 사용 가능)
    if (pokemon.volatileStatus?.includes('Encore') && pokemon.lastMove !== move.id) {
      return { canUse: false, reason: '앵콜 상태라 다른 기술을 사용할 수 없다!' };
    }

    // 사슬묶기 (특정 기술 사용 불가)
    if (pokemon.volatileStatus?.includes('Disable') && pokemon.disabledMove === move.id) {
      return { canUse: false, reason: '사슬묶기로 이 기술을 사용할 수 없다!' };
    }

    return { canUse: true };
  }

  /**
   * 능력 변화 스테이지를 배수로 변환
   */
  getStatMultiplier(stage) {
    if (stage < -6) stage = -6;
    if (stage > 6) stage = 6;
    
    return this.statStages[stage.toString()] || 1;
  }

  /**
   * 능력 변화 적용
   */
  applyStatBoosts(baseStat, boosts, stat) {
    if (!boosts || boosts[stat] === undefined || boosts[stat] === 0) {
      return baseStat;
    }

    const multiplier = this.getStatMultiplier(boosts[stat]);
    return Math.floor(baseStat * multiplier);
  }

  /**
   * 크리티컬 확률 계산
   */
  calculateCriticalChance(pokemon, move) {
    let critStage = move.critRatio || 0;

    // 특성 효과
    if (pokemon.ability === 'Super Luck') critStage += 1;
    if (pokemon.ability === 'Sniper' && critStage > 0) critStage += 1;

    // 도구 효과
    if (pokemon.item === 'Scope Lens') critStage += 1;
    if (pokemon.item === 'Razor Claw') critStage += 1;

    // 급소 상태
    if (pokemon.volatileStatus?.includes('Focus Energy')) critStage += 2;

    const critChances = [1/24, 1/8, 1/2, 1/1, 1/1];
    return critChances[Math.min(critStage, 4)];
  }

  /**
   * 명중률 계산
   */
  calculateAccuracy(attacker, defender, move, fieldState = {}) {
    // 필중 기술
    if (move.accuracy === true || move.accuracy === 0) return 100;

    let accuracy = move.accuracy || 100;
    
    // 명중률/회피율 랭크 보정
    const accuracyStage = (attacker.boosts?.accuracy || 0) - (defender.boosts?.evasion || 0);
    const stageMultiplier = accuracyStage >= 0 ?
      (3 + accuracyStage) / 3 :
      3 / (3 - accuracyStage);

    accuracy *= stageMultiplier;

    // 특성 효과
    if (attacker.ability === 'Compound Eyes') accuracy *= 1.3;
    if (attacker.ability === 'Hustle' && move.category === 'Physical') accuracy *= 0.8;
    if (attacker.ability === 'No Guard' || defender.ability === 'No Guard') return 100;
    if (defender.ability === 'Wonder Skin' && move.category === 'Status') accuracy *= 0.5;
    if (defender.ability === 'Tangled Feet' && defender.volatileStatus?.includes('Confusion')) {
      accuracy *= 0.5;
    }

    // 날씨 효과
    if (fieldState.weather === 'Sand' && defender.ability === 'Sand Veil') {
      accuracy *= 0.8;
    }
    if ((fieldState.weather === 'Hail' || fieldState.weather === 'Snow') && 
        defender.ability === 'Snow Cloak') {
      accuracy *= 0.8;
    }

    // 도구 효과
    if (attacker.item === 'Wide Lens') accuracy *= 1.1;
    if (attacker.item === 'Zoom Lens' && attacker.movedAfter) accuracy *= 1.2;
    if (defender.item === 'Bright Powder' || defender.item === 'Lax Incense') {
      accuracy *= 0.9;
    }

    return Math.min(100, Math.max(0, accuracy));
  }

  /**
   * 상태이상 한글 이름 가져오기
   */
  getStatusName(status, isVolatile = false) {
    const statusList = isVolatile ? this.volatileStatus : this.majorStatus;
    return statusList[status]?.name || status;
  }

  /**
   * 상태이상 초기화
   */
  createInitialStatus() {
    return {
      status: null,
      statusTurns: 0,
      sleepTurns: 0,
      volatileStatus: [],
      boosts: {
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
        accuracy: 0,
        evasion: 0,
      },
    };
  }
}

const statusManager = new StatusManager();

export default statusManager;
