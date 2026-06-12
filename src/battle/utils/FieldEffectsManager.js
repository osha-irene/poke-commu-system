import showdownIntegration from './ShowdownIntegration';

/**
 * 필드 효과 (날씨, 지형, 사이드 상태) 관리 클래스
 */
class FieldEffectsManager {
  constructor() {
    // 날씨 효과 정의
    this.weatherEffects = {
      'Sun': {
        name: '쾌청',
        nameEn: 'Sun',
        duration: 5,
        boostedTypes: ['Fire'],
        weakenedTypes: ['Water'],
        modifiedMoves: {
          'Thunder': { accuracy: 50 },
          'Hurricane': { accuracy: 50 },
        },
        abilities: {
          'Chlorophyll': { stat: 'spe', multiplier: 2 },
          'Flower Gift': { stat: 'atk', multiplier: 1.5 },
          'Solar Power': { stat: 'spa', multiplier: 1.5, damage: 1/8 },
          'Leaf Guard': { preventStatus: true },
          'Harvest': { berryRestore: 0.5 },
        },
      },
      'Rain': {
        name: '비',
        nameEn: 'Rain',
        duration: 5,
        boostedTypes: ['Water'],
        weakenedTypes: ['Fire'],
        guaranteedMoves: ['Thunder', 'Hurricane'],
        modifiedMoves: {
          'Solar Beam': { power: 0.5 },
          'Solar Blade': { power: 0.5 },
        },
        abilities: {
          'Swift Swim': { stat: 'spe', multiplier: 2 },
          'Rain Dish': { healing: 1/16 },
          'Hydration': { statusCure: true },
          'Dry Skin': { healing: 1/8 },
        },
      },
      'Sand': {
        name: '모래바람',
        nameEn: 'Sandstorm',
        duration: 5,
        immuneTypes: ['Rock', 'Ground', 'Steel'],
        residualDamage: 1/16,
        statBoosts: {
          'Rock': { stat: 'spd', multiplier: 1.5 },
        },
        abilities: {
          'Sand Rush': { stat: 'spe', multiplier: 2 },
          'Sand Force': { types: ['Rock', 'Ground', 'Steel'], multiplier: 1.3 },
          'Sand Veil': { evasion: 1.25 },
        },
      },
      'Hail': {
        name: '설경',
        nameEn: 'Hail',
        duration: 5,
        immuneTypes: ['Ice'],
        residualDamage: 1/16,
        modifiedMoves: {
          'Blizzard': { accuracy: 100 },
        },
        abilities: {
          'Snow Cloak': { evasion: 1.25 },
          'Ice Body': { healing: 1/16 },
          'Slush Rush': { stat: 'spe', multiplier: 2 },
        },
      },
      'Snow': {
        name: '설경',
        nameEn: 'Snow',
        duration: 5,
        statBoosts: {
          'Ice': { stat: 'def', multiplier: 1.5 },
        },
        modifiedMoves: {
          'Blizzard': { accuracy: 100 },
        },
        abilities: {
          'Snow Cloak': { evasion: 1.25 },
          'Slush Rush': { stat: 'spe', multiplier: 2 },
        },
      },
    };

    // 지형 효과 정의
    this.terrainEffects = {
      'Electric': {
        name: '일렉트릭필드',
        nameEn: 'Electric Terrain',
        duration: 5,
        boostedTypes: ['Electric'],
        powerMultiplier: 1.3,
        preventStatus: ['Sleep'],
        abilities: {
          'Electric Surge': { setter: true },
          'Surge Surfer': { stat: 'spe', multiplier: 2 },
        },
      },
      'Grassy': {
        name: '그래스필드',
        nameEn: 'Grassy Terrain',
        duration: 5,
        boostedTypes: ['Grass'],
        powerMultiplier: 1.3,
        weakenedMoves: ['Earthquake', 'Magnitude', 'Bulldoze'],
        weakenMultiplier: 0.5,
        healing: 1/16,
        abilities: {
          'Grassy Surge': { setter: true },
        },
      },
      'Misty': {
        name: '미스트필드',
        nameEn: 'Misty Terrain',
        duration: 5,
        weakenedTypes: ['Dragon'],
        dragonMultiplier: 0.5,
        preventStatus: ['all'],
        abilities: {
          'Misty Surge': { setter: true },
        },
      },
      'Psychic': {
        name: '사이코필드',
        nameEn: 'Psychic Terrain',
        duration: 5,
        boostedTypes: ['Psychic'],
        powerMultiplier: 1.3,
        preventPriority: true,
        abilities: {
          'Psychic Surge': { setter: true },
        },
      },
    };

    // 사이드 상태 정의
    this.sideConditions = {
      'Reflect': { 
        name: '리플렉터',
        nameEn: 'Reflect',
        duration: 5, 
        reduceDamage: 'physical',
        multiplier: 0.5,
      },
      'Light Screen': { 
        name: '빛의장막',
        nameEn: 'Light Screen',
        duration: 5, 
        reduceDamage: 'special',
        multiplier: 0.5,
      },
      'Aurora Veil': { 
        name: '오로라베일',
        nameEn: 'Aurora Veil',
        duration: 5, 
        reduceDamage: 'both',
        multiplier: 0.5,
        requireWeather: ['Hail', 'Snow'],
      },
      'Tailwind': { 
        name: '순풍',
        nameEn: 'Tailwind',
        duration: 4, 
        boostSpeed: 2,
      },
      'Stealth Rock': { 
        name: '스텔스록',
        nameEn: 'Stealth Rock',
        permanent: true, 
        entryHazard: true,
      },
      'Spikes': { 
        name: '압정',
        nameEn: 'Spikes',
        permanent: true, 
        entryHazard: true, 
        maxLayers: 3,
      },
      'Toxic Spikes': { 
        name: '독압정',
        nameEn: 'Toxic Spikes',
        permanent: true, 
        entryHazard: true, 
        maxLayers: 2,
      },
      'Sticky Web': { 
        name: '끈적끈적네트',
        nameEn: 'Sticky Web',
        permanent: true, 
        entryHazard: true,
      },
    };
  }

  /**
   * 날씨가 기술에 미치는 영향 계산
   */
  applyWeatherToMove(moveName, attacker, defender, weather) {
    if (!weather) return { multiplier: 1 };

    const weatherData = this.weatherEffects[weather];
    if (!weatherData) return { multiplier: 1 };

    const moveData = showdownIntegration.getMove(moveName);
    if (!moveData) return { multiplier: 1 };

    let multiplier = 1;
    let accuracy = null;

    // 타입별 위력 변화
    if (weatherData.boostedTypes?.includes(moveData.type)) {
      multiplier *= 1.5;
    }
    if (weatherData.weakenedTypes?.includes(moveData.type)) {
      multiplier *= 0.5;
    }

    // 특정 기술 필중
    if (weatherData.guaranteedMoves?.includes(moveData.nameEn)) {
      accuracy = 100;
    }

    // 특정 기술 명중률/위력 변경
    const modifiedMove = weatherData.modifiedMoves?.[moveData.nameEn];
    if (modifiedMove) {
      if (modifiedMove.accuracy !== undefined) {
        accuracy = modifiedMove.accuracy;
      }
      if (modifiedMove.power !== undefined) {
        multiplier *= modifiedMove.power;
      }
    }

    return { multiplier, accuracy };
  }

  /**
   * 지형이 기술에 미치는 영향 계산
   */
  applyTerrainToMove(moveName, attacker, terrain) {
    if (!terrain) return { multiplier: 1, blocked: false };

    const terrainData = this.terrainEffects[terrain];
    if (!terrainData) return { multiplier: 1, blocked: false };

    const moveData = showdownIntegration.getMove(moveName);
    if (!moveData) return { multiplier: 1, blocked: false };

    let multiplier = 1;

    // 지면에 닿아있는지 확인
    const isGrounded = this._isGrounded(attacker);

    if (isGrounded) {
      // 타입별 위력 증가
      if (terrainData.boostedTypes?.includes(moveData.type)) {
        multiplier *= terrainData.powerMultiplier || 1.3;
      }

      // 약화되는 기술
      if (terrainData.weakenedMoves?.includes(moveData.nameEn)) {
        multiplier *= terrainData.weakenMultiplier || 0.5;
      }

      // 드래곤 타입 약화 (미스트필드)
      if (terrain === 'Misty' && moveData.type === 'Dragon') {
        multiplier *= terrainData.dragonMultiplier || 0.5;
      }
    }

    // 선공기 방어 (사이코필드)
    if (terrain === 'Psychic' && moveData.priority > 0 && this._isGrounded(attacker)) {
      return { multiplier: 0, blocked: true };
    }

    return { multiplier, blocked: false };
  }

  /**
   * 사이드 상태가 데미지에 미치는 영향
   */
  applySideConditionsToMove(damage, moveCategory, sideConditions) {
    if (!sideConditions || sideConditions.length === 0) return damage;

    let multiplier = 1;

    sideConditions.forEach(condition => {
      const conditionData = this.sideConditions[condition];
      if (!conditionData) return;

      if (conditionData.reduceDamage === 'physical' && moveCategory === 'Physical') {
        multiplier *= conditionData.multiplier;
      }
      else if (conditionData.reduceDamage === 'special' && moveCategory === 'Special') {
        multiplier *= conditionData.multiplier;
      }
      else if (conditionData.reduceDamage === 'both') {
        multiplier *= conditionData.multiplier;
      }
    });

    return damage * multiplier;
  }

  /**
   * 입장 해저드 데미지 계산
   */
  calculateEntryHazardDamage(pokemon, sideConditions) {
    if (!sideConditions || sideConditions.length === 0) {
      return { damage: 0 };
    }

    let damage = 0;
    const maxHP = pokemon.maxHP || pokemon.stats?.hp || 100;
    const effects = {};

    // 스텔스록
    if (sideConditions.includes('Stealth Rock')) {
      const rockEffectiveness = showdownIntegration.getTypeEffectiveness('Rock', pokemon.types);
      damage += maxHP * (rockEffectiveness / 8);
      effects.stealthRock = true;
    }

    // 압정
    const spikesLayers = sideConditions.filter(c => c === 'Spikes').length;
    if (spikesLayers > 0 && this._isGrounded(pokemon)) {
      damage += maxHP * (spikesLayers / 8);
      effects.spikesLayers = spikesLayers;
    }

    // 독압정
    const toxicSpikesLayers = sideConditions.filter(c => c === 'Toxic Spikes').length;
    if (toxicSpikesLayers > 0 && this._isGrounded(pokemon)) {
      // 독 타입은 흡수
      if (pokemon.types.includes('Poison')) {
        effects.absorbed = true;
        return { damage: 0, effects };
      }
      // 아니면 상태이상
      effects.status = toxicSpikesLayers === 1 ? 'Poison' : 'Badly Poison';
    }

    // 끈적끈적네트
    if (sideConditions.includes('Sticky Web') && this._isGrounded(pokemon)) {
      effects.speedDrop = true;
    }

    return { damage, effects };
  }

  /**
   * 날씨 데미지 계산 (턴 종료 시)
   */
  calculateWeatherDamage(pokemon, weather) {
    if (!weather) return 0;

    const weatherData = this.weatherEffects[weather];
    if (!weatherData || !weatherData.residualDamage) return 0;

    // 면역 체크
    const hasImmunity = this._hasWeatherImmunity(pokemon, weather, weatherData);
    if (hasImmunity) return 0;

    const maxHP = pokemon.maxHP || pokemon.stats?.hp || 100;
    return maxHP * weatherData.residualDamage;
  }

  /**
   * 지형 힐 계산 (턴 종료 시)
   */
  calculateTerrainHealing(pokemon, terrain) {
    if (!terrain || terrain !== 'Grassy') return 0;

    if (!this._isGrounded(pokemon)) return 0;

    const maxHP = pokemon.maxHP || pokemon.stats?.hp || 100;
    return maxHP * (1/16);
  }

  /**
   * 특성에 의한 날씨 효과 적용
   */
  applyWeatherAbility(pokemon, weather, stat) {
    if (!weather || !pokemon.ability) return 1;

    const weatherData = this.weatherEffects[weather];
    if (!weatherData) return 1;

    const abilityEffect = weatherData.abilities?.[pokemon.ability];
    if (!abilityEffect) return 1;

    if (abilityEffect.stat === stat) {
      return abilityEffect.multiplier || 1;
    }

    return 1;
  }

  /**
   * 포켓몬이 지면에 닿아있는지 확인
   */
  _isGrounded(pokemon) {
    if (!pokemon) return true;

    // 비행 타입이면 떠있음
    if (pokemon.types?.includes('Flying')) return false;

    // 특성 체크
    if (pokemon.ability === 'Levitate') return false;

    // 도구 체크
    if (pokemon.item === 'Air Balloon') return false;

    return true;
  }

  /**
   * 날씨 데미지 면역 체크
   */
  _hasWeatherImmunity(pokemon, weather, weatherData) {
    // 타입 면역
    if (weatherData.immuneTypes) {
      const hasImmuneType = pokemon.types?.some(type => 
        weatherData.immuneTypes.includes(type)
      );
      if (hasImmuneType) return true;
    }

    // 특성 면역
    const immuneAbilities = {
      'Sand': ['Sand Veil', 'Sand Rush', 'Sand Force', 'Overcoat', 'Magic Guard'],
      'Hail': ['Snow Cloak', 'Ice Body', 'Overcoat', 'Magic Guard'],
    };

    if (immuneAbilities[weather]?.includes(pokemon.ability)) {
      return true;
    }

    // 도구 면역
    if (pokemon.item === 'Safety Goggles') return true;

    return false;
  }

  /**
   * 필드 상태 전체 정보 가져오기
   */
  getFieldState(field) {
    return {
      weather: field.weather,
      terrain: field.terrain,
      weatherTurns: field.weatherTurns || 0,
      terrainTurns: field.terrainTurns || 0,
      p1SideConditions: field.p1SideConditions || [],
      p2SideConditions: field.p2SideConditions || [],
    };
  }

  /**
   * 필드 상태 초기화
   */
  createInitialField() {
    return {
      weather: null,
      terrain: null,
      weatherTurns: 0,
      terrainTurns: 0,
      p1SideConditions: [],
      p2SideConditions: [],
      isMagicRoom: false,
      isWonderRoom: false,
      isGravity: false,
    };
  }
}

const fieldEffectsManager = new FieldEffectsManager();

export default fieldEffectsManager;
