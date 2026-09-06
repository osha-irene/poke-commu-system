import evolutionsData from '../data/evolutions.json';

export const getPokemonLearnsetKeys = (pokemonOrNumber) => {
  if (pokemonOrNumber === null || pokemonOrNumber === undefined) return [];

  if (typeof pokemonOrNumber === 'number' || typeof pokemonOrNumber === 'string') {
    return [String(pokemonOrNumber)];
  }

  const keys = [];
  const addKey = (value) => {
    if (value === null || value === undefined || value === '') return;
    const key = String(value);
    if (!keys.includes(key)) keys.push(key);
  };

  // 암/수로 자력기가 갈리는 포켓몬(예: 냐오닉스 암컷의 미래예지)은
  // "<종족명>-female" / "<종족명>-male" 학습셋이 있으면 그것을 먼저 쓴다.
  // 해당 키의 데이터가 없으면 아래 일반 키(number/nameEn 등)로 자연스럽게 폴백된다.
  const gender = String(pokemonOrNumber.gender || '').toLowerCase();
  if (gender === 'female' || gender === 'male') {
    [pokemonOrNumber.formVariant, pokemonOrNumber.nameEn].forEach((value) => {
      if (!value) return;
      const base = String(value).replace(/-(male|female)$/i, '');
      addKey(`${base}-${gender}`);
    });
  }

  addKey(pokemonOrNumber.number);
  addKey(pokemonOrNumber.pokemonId);
  addKey(pokemonOrNumber.id);
  addKey(pokemonOrNumber.formVariant);
  addKey(pokemonOrNumber.nameEn);
  addKey(pokemonOrNumber.originalNumber);

  return keys;
};

export const getPokemonLearnset = (pokemonLearnsets = {}, pokemonOrNumber) => {
  const keys = getPokemonLearnsetKeys(pokemonOrNumber);
  const key = keys.find((candidate) => pokemonLearnsets[candidate]);
  return key ? pokemonLearnsets[key] : null;
};

export const getLearnsetTmMoves = (learnset = {}) => (
  learnset.tmMoves || learnset.machineMoves || []
);

export const getLearnsetEggMoves = (learnset = {}) => (
  learnset.eggMoves || []
);

const findPreEvolutionNumber = (number) => {
  const evolution = (evolutionsData.evolutions || []).find((e) => String(e.to) === String(number));
  return evolution ? evolution.from : null;
};

// 교배(알)로는 미진화체만 얻을 수 있어서, 학습셋 데이터에는 진화체의 eggMoves가 비어있는
// 경우가 많다(예: 페르시안-알로라 10108은 []이지만 나옹-알로라 10107은 알기술을 갖고 있음).
// 실제로는 진화해도 원래 알로 태어났을 때 배울 수 있었던 기술을 그대로 떠올릴 수 있어야
// 하므로, 자기 학습셋에 eggMoves가 없으면 진화 전 단계로 거슬러 올라가며 찾는다.
export const getInheritedEggMoves = (pokemonLearnsets = {}, pokemonOrNumber, visited = new Set()) => {
  const learnset = getPokemonLearnset(pokemonLearnsets, pokemonOrNumber);
  const ownEggMoves = getLearnsetEggMoves(learnset || {});
  if (ownEggMoves.length > 0) return ownEggMoves;

  const keys = getPokemonLearnsetKeys(pokemonOrNumber);
  const resolvedKey = keys.find((candidate) => pokemonLearnsets[candidate]);
  if (resolvedKey == null || visited.has(resolvedKey)) return [];
  visited.add(resolvedKey);

  const preEvoNumber = findPreEvolutionNumber(resolvedKey);
  if (preEvoNumber == null) return [];

  return getInheritedEggMoves(pokemonLearnsets, preEvoNumber, visited);
};
