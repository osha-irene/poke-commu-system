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
  const otherTotal = Object.entries(currentEffort).reduce((sum, [key, value]) => (
    key === effortField ? sum : sum + Number(value || 0)
  ), 0);

  // 스탯 상한(252)뿐 아니라 전체 총합 상한(510)도 함께 고려해서, +10 같은 고정
  // 증가량을 다 못 채우더라도 남은 자리만큼만 부분 적용한다 — 안 그러면 총합이
  // 504(남은 자리 6)일 때 +10짜리 영양제가 정확히 안 맞아떨어진다는 이유로
  // 아예 사용 자체가 막혀버린다.
  const newValue = change > 0
    ? Math.max(0, Math.min(252, currentValue + change, 510 - otherTotal))
    : Math.max(0, Math.min(252, currentValue + change));

  // 변화가 없는 경우 (이미 최대/최소값, 혹은 총합이 이미 510)
  if (currentValue === newValue) {
    const statNameKo = getStatNameKo(stat);
    if (change > 0) {
      const atTotalCap = otherTotal + currentValue >= 510;
      return {
        success: false,
        message: atTotalCap
          ? '노력치 총합이 이미 최대치(510)입니다.'
          : `${statNameKo}의 노력치가 이미 최대값(252)입니다.`
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
  const changedAmount = Math.abs(newValue - currentValue);
  const changeMessage = change > 0
    ? `${statNameKo} 기초포인트 ${changedAmount}이 상승하였다!`
    : `${statNameKo} 기초포인트 ${changedAmount}이 감소하였다!`;
  
  return { 
    success: true, 
    message: `${pokemon.nickname || pokemon.name}의 ${changeMessage}` 
  };
};
