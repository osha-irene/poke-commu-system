// data/itemEffects.json을 import
import itemEffectsConfig from '../data/itemEffects.json';

/**
 * 아이템의 효과를 파싱합니다
 * @param {Object} item - 아이템 객체 (item.json 형식)
 * @returns {Object|null} - 효과 객체 또는 null
 */
export function getItemEffect(item) {
  if (!item || !item.name) return null;

  // ✅ 1. 커스텀 아이템의 경우 onUse에 효과가 저장되어 있음 (최우선)
  if (item.onUse && item.onUse.effect) {
    console.log('✅ 커스텀 아이템 효과 발견:', item.name, item.onUse.effect);
    return item.onUse.effect;
  }

  const lowerName = item.name.toLowerCase();
  const lowerNameEn = item.nameEn?.toLowerCase() || '';
  
  // 2. 공식 아이템 매칭
  const { officialItems } = itemEffectsConfig;
  
  // 모든 카테고리 검색
  for (const category of Object.values(officialItems)) {
    for (const itemDef of category) {
      // 이름 매칭
      for (const name of itemDef.names) {
        if (lowerName.includes(name.toLowerCase()) || 
            lowerNameEn.includes(name.toLowerCase())) {
          return itemDef.effect;
        }
      }
    }
  }

  // 3. 카테고리 기반 매칭 (vitamins)
  if (item.category === 'vitamins') {
    const vitaminMap = {
      'carbos': { type: 'effort', stat: 'speed', amount: 10 },
      'calcium': { type: 'effort', stat: 'specialAttack', amount: 10 },
      'protein': { type: 'effort', stat: 'attack', amount: 10 },
      'iron': { type: 'effort', stat: 'defense', amount: 10 },
      'zinc': { type: 'effort', stat: 'specialDefense', amount: 10 },
      'hp-up': { type: 'effort', stat: 'hp', amount: 10 },
    };

    for (const [key, effect] of Object.entries(vitaminMap)) {
      if (lowerNameEn.includes(key)) {
        return effect;
      }
    }
  }

  return null;
}

/**
 * 효과 타입 정보를 가져옵니다
 */
export function getEffectTypeInfo(effectType) {
  return itemEffectsConfig.effectTypes[effectType] || null;
}

/**
 * 스탯 정보를 가져옵니다
 */
export function getStatInfo(effectType, stat) {
  const typeInfo = itemEffectsConfig.effectTypes[effectType];
  if (!typeInfo || !typeInfo.stats) return null;
  return typeInfo.stats[stat] || null;
}

/**
 * 스탯 한글명을 가져옵니다
 */
export function getStatNameKo(effectType, stat) {
  if (effectType === 'friendship') return '친밀도';
  if (effectType === 'levelup') return '레벨';
  
  const statInfo = getStatInfo(effectType, stat);
  return statInfo?.name || stat;
}

/**
 * 최대값을 가져옵니다
 */
export function getMaxValue(effectType) {
  const typeInfo = itemEffectsConfig.effectTypes[effectType];
  return typeInfo?.maxValue || 100;
}

/**
 * 모든 사용 가능한 효과 목록을 가져옵니다 (커스텀 아이템 생성용)
 */
export function getAllAvailableEffects() {
  const effects = [];
  
  // 노력치 효과
  const effortType = itemEffectsConfig.effectTypes.effort;
  for (const [statKey, statInfo] of Object.entries(effortType.stats)) {
    effects.push({
      id: `effort_${statKey}_10`,
      label: `${statInfo.name} 노력치 +10`,
      effect: { type: 'effort', stat: statKey, amount: 10 },
      category: '노력치'
    });
    effects.push({
      id: `effort_${statKey}_1`,
      label: `${statInfo.name} 노력치 +1`,
      effect: { type: 'effort', stat: statKey, amount: 1 },
      category: '노력치'
    });
  }

  // 컨디션 효과
  const conditionType = itemEffectsConfig.effectTypes.condition;
  for (const [statKey, statInfo] of Object.entries(conditionType.stats)) {
    effects.push({
      id: `condition_${statKey}_10`,
      label: `${statInfo.name} +10`,
      effect: { type: 'condition', stat: statKey, amount: 10 },
      category: '컨디션'
    });
  }
  
  effects.push({
    id: 'condition_all_10',
    label: '모든 컨디션 +10 (선택형)',
    effect: { type: 'condition', stat: 'all', amount: 10 },
    category: '컨디션'
  });

  // 친밀도 효과
  effects.push({
    id: 'friendship_10',
    label: '친밀도 +10',
    effect: { type: 'friendship', amount: 10 },
    category: '친밀도'
  });
  effects.push({
    id: 'friendship_50',
    label: '친밀도 +50',
    effect: { type: 'friendship', amount: 50 },
    category: '친밀도'
  });

  // 레벨업
  effects.push({
    id: 'levelup_1',
    label: '레벨업 +1 (이상한사탕)',
    effect: { type: 'levelup', amount: 1 },
    category: '특수'
  });

  return effects;
}

/**
 * 현재 포켓몬의 수치를 가져옵니다
 */
export function getCurrentValue(pokemon, effect) {
  if (!effect) return 0;
  
  if (effect.type === 'effort') {
    return pokemon.effort?.[effect.stat] || 0;
  } else if (effect.type === 'condition') {
    return pokemon.condition?.[effect.stat] || 0;
  } else if (effect.type === 'friendship') {
    return pokemon.friendship || 0;
  } else if (effect.type === 'levelup') {
    return pokemon.level || 1;
  }
  
  return 0;
}

/**
 * 효과 적용 후 수치를 계산합니다
 */
export function calculateAfterValue(currentValue, effect, quantity, maxValue) {
  if (!effect || !effect.amount) {
    return currentValue;
  }
  
  const increase = effect.amount * quantity;
  return Math.min(maxValue, currentValue + increase);
}