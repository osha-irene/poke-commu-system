/**
 * 배틀 메시지 생성 유틸리티
 */

/**
 * 랭크 변화 메시지 생성
 */
export function getBoostMessages(pokemonName, oldBoosts, newBoosts) {
  const messages = [];
  const statNames = {
    atk: '공격',
    def: '방어',
    spa: '특수공격',
    spd: '특수방어',
    spe: '스피드'
  };

  for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
    const oldValue = oldBoosts[stat] || 0;
    const newValue = newBoosts[stat] || 0;
    const change = newValue - oldValue;

    if (change === 0) continue;

    const statName = statNames[stat];

    if (change >= 3) {
      messages.push(`${pokemonName}의 ${statName}이(가) 최대로 올랐다!`);
    } else if (change === 2) {
      messages.push(`${pokemonName}의 ${statName}이(가) 크게 올랐다!`);
    } else if (change === 1) {
      messages.push(`${pokemonName}의 ${statName}이(가) 올랐다!`);
    } else if (change <= -3) {
      messages.push(`${pokemonName}의 ${statName}이(가) 크게크게 떨어졌다!`);
    } else if (change === -2) {
      messages.push(`${pokemonName}의 ${statName}이(가) 크게 떨어졌다!`);
    } else if (change === -1) {
      messages.push(`${pokemonName}의 ${statName}이(가) 떨어졌다!`);
    }
  }

  return messages;
}

/**
 * 상태이상 변화 메시지 생성
 */
export function getStatusMessages(pokemonName, oldStatus, newStatus) {
  if (oldStatus === newStatus) return [];

  const statusNames = {
    par: '마비되었다',
    brn: '화상을 입었다',
    frz: '얼어버렸다',
    slp: '잠들어버렸다',
    psn: '독에 걸렸다',
    tox: '맹독 상태가 되었다'
  };

  if (!oldStatus && newStatus) {
    return [`${pokemonName}은(는) ${statusNames[newStatus]}!`];
  }

  if (oldStatus && !newStatus) {
    return [`${pokemonName}의 상태이상이 치유되었다!`];
  }

  return [];
}

/**
 * 날씨 변화 메시지 생성
 */
export function getWeatherMessages(oldWeather, newWeather) {
  if (oldWeather === newWeather) return [];

  const weatherNames = {
    sun: '날씨가 맑아졌다',
    'harsh-sunshine': '햇살이 아주 강해졌다',
    rain: '비가 내리기 시작했다',
    'heavy-rain': '강한 비가 내리기 시작했다',
    sand: '모래바람이 불기 시작했다',
    hail: '싸라기눈이 내리기 시작했다',
    snow: '눈이 내리기 시작했다',
    'strong-winds': '난기류가 발생했다'
  };

  if (!oldWeather && newWeather) {
    return [weatherNames[newWeather] || `날씨가 ${newWeather}(으)로 변했다!`];
  }

  if (oldWeather && !newWeather) {
    return ['날씨가 원래대로 돌아왔다!'];
  }

  if (oldWeather && newWeather) {
    return [weatherNames[newWeather] || `날씨가 ${newWeather}(으)로 변했다!`];
  }

  return [];
}

/**
 * 지형 변화 메시지 생성
 */
export function getTerrainMessages(oldTerrain, newTerrain) {
  if (oldTerrain === newTerrain) return [];

  const terrainNames = {
    'Electric': '일렉트릭필드가 펼쳐졌다',
    'Grassy': '그래스필드가 펼쳐졌다',
    'Misty': '미스트필드가 펼쳐졌다',
    'Psychic': '사이코필드가 펼쳐졌다'
  };

  if (!oldTerrain && newTerrain) {
    return [terrainNames[newTerrain] || `${newTerrain} 필드가 펼쳐졌다!`];
  }

  if (oldTerrain && !newTerrain) {
    return ['필드가 원래대로 돌아왔다!'];
  }

  if (oldTerrain && newTerrain) {
    return [terrainNames[newTerrain] || `${newTerrain} 필드가 펼쳐졌다!`];
  }

  return [];
}

/**
 * 필드 효과 메시지 생성
 */
export function getFieldEffectMessages(playerName, oldEffects, newEffects) {
  const messages = [];

  // Reflect
  if (!oldEffects.isReflect && newEffects.isReflect) {
    messages.push(`${playerName}은(는) 리플렉터를 쳤다!`);
  }
  if (oldEffects.isReflect && !newEffects.isReflect) {
    messages.push(`${playerName}의 리플렉터가 사라졌다!`);
  }

  // Light Screen
  if (!oldEffects.isLightScreen && newEffects.isLightScreen) {
    messages.push(`${playerName}은(는) 빛의장막을 쳤다!`);
  }
  if (oldEffects.isLightScreen && !newEffects.isLightScreen) {
    messages.push(`${playerName}의 빛의장막이 사라졌다!`);
  }

  return messages;
}

/**
 * HP 회복 메시지
 */
export function getHealMessage(pokemonName, healAmount, maxHP) {
  if (healAmount <= 0) return null;
  
  const percentage = Math.floor((healAmount / maxHP) * 100);
  
  if (percentage >= 50) {
    return `${pokemonName}은(는) 체력을 크게 회복했다!`;
  } else if (percentage >= 25) {
    return `${pokemonName}은(는) 체력을 회복했다!`;
  } else {
    return `${pokemonName}은(는) 조금 회복했다!`;
  }
}

/**
 * 급소 메시지
 */
export function getCriticalMessage() {
  return '급소에 맞았다!';
}

/**
 * 회피 메시지
 */
export function getMissMessage(pokemonName) {
  return `${pokemonName}의 공격은 빗나갔다!`;
}

/**
 * 반동 데미지 메시지
 */
export function getRecoilMessage(pokemonName, damage) {
  return `${pokemonName}은(는) 반동 데미지를 입었다! (${damage})`;
}