import evItemsData from '../data/evItems.json';

// 아이템이 EV 아이템인지 확인
export const isEVItem = (itemName) => {
  const normalizedName = itemName?.toLowerCase().replace(/\s+/g, '-');
  return !!evItemsData.ev_items[normalizedName];
};

// EV 아이템 정보 가져오기
export const getEVItemEffect = (itemName) => {
  const normalizedName = itemName?.toLowerCase().replace(/\s+/g, '-');
  return evItemsData.ev_items[normalizedName]?.ev_effect;
};

// 스탯 이름 한글 변환
const statNames = {
  'hp': 'HP',
  'attack': '공격',
  'defense': '방어',
  'special-attack': '특수공격',
  'special-defense': '특수방어',
  'speed': '스피드'
};

// 스탯 이름 매핑 (API 형식 → effort 필드 형식)
const statFieldMapping = {
  'hp': 'hp',
  'attack': 'attack',
  'defense': 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  'speed': 'speed'
};

export const getStatNameKo = (statEn) => statNames[statEn] || statEn;

// 포켓몬에게 EV 아이템 사용
export const applyEVItem = (pokemon, itemName, updatePokemon) => {
  const evEffect = getEVItemEffect(itemName);
  
  if (!evEffect) {
    return { success: false, message: 'EV 효과가 없는 아이템입니다.' };
  }
  
  const { stat, change } = evEffect;
  const effortField = statFieldMapping[stat]; // 'special-attack' → 'specialAttack'
  
  // 현재 EV 값 가져오기 (effort 필드 사용)
  const currentEffort = pokemon.effort || {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0
  };
  
  const currentValue = currentEffort[effortField] || 0;
  const newValue = Math.max(0, Math.min(252, currentValue + change));
  
  // EV 합계 체크 (최대 510)
  const totalEVs = Object.entries(currentEffort).reduce((sum, [key, value]) => {
    return sum + (key === effortField ? newValue : (value || 0));
  }, 0);
  
  if (totalEVs > 510) {
    return { 
      success: false, 
      message: `노력치 총합이 510을 초과할 수 없습니다. (현재: ${totalEVs})` 
    };
  }
  
  // 변화가 없는 경우 (이미 최대/최소값)
  if (currentValue === newValue) {
    const statNameKo = getStatNameKo(stat);
    if (change > 0) {
      return { 
        success: false, 
        message: `${statNameKo}의 노력치가 이미 최대값(252)입니다.` 
      };
    } else {
      return { 
        success: false, 
        message: `${statNameKo}의 노력치가 이미 최소값(0)입니다.` 
      };
    }
  }
  
  // EV 업데이트 (effort 필드 업데이트)
  const updatedEffort = {
    ...currentEffort,
    [effortField]: newValue
  };
  
  updatePokemon({ ...pokemon, effort: updatedEffort });
  
  const statNameKo = getStatNameKo(stat);
  const changeText = change > 0 ? `+${change}` : change;
  
  return { 
    success: true, 
    message: `${pokemon.nickname || pokemon.name}의 ${statNameKo} 노력치가 ${changeText} 변경되었습니다! (${currentValue} → ${newValue})` 
  };
};