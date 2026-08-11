export const BASE_STAT_FIELDS = [
  'baseHp',
  'baseAttack',
  'baseDefense',
  'baseSpAttack',
  'baseSpDefense',
  'baseSpeed'
];

export const getPokemonTemplateKey = (pokemon = {}) => (
  pokemon.formVariant ||
  pokemon.nameEn ||
  pokemon.species ||
  pokemon.pokemonId ||
  pokemon.id ||
  pokemon.number
);

// ⚠️ 예전에는 formVariant/nameEn/species/id/number 중 "아무거나 하나"만 일치해도 바로 그 템플릿을
// 반환(.find)했다. 진화 처리가 여러 필드(nameEn/number/pokemonId 등)를 한 번에 갱신하는 게 원칙이지만,
// 예전 진화 로직이나 데이터 이관 과정에서 필드 하나만 옛 종족값으로 남아있는 개체가 생기면
// (예: 슈륙챙이→왕구리로 진화했는데 nameEn만 "poliwhirl"로 남고 number/pokemonId는 186으로 갱신된 경우),
// 슈륙챙이 템플릿이 배열에서 왕구리보다 먼저 나온다는 이유만으로 잘못 매칭되어 특성패치 등에서
// 슈륙챙이의 숨겨진 특성(스위프트스윔)이 왕구리의 숨겨진 특성(잔비) 대신 나오는 문제가 있었다.
// 이제는 신호(키/pokemonId/number/originalNumber) 중 몇 개가 일치하는지 점수로 매겨, 가장 많은
// 신호가 일치하는(=필드가 서로 어긋나지 않는) 템플릿을 고른다. 데이터가 정상이면 결과는 동일하고,
// 필드 하나가 stale한 경우에만 나머지 신호들이 다수결로 올바른 템플릿을 고르게 된다.
export const findPokemonTemplate = (pokemon, allPokemonMaster = []) => {
  if (!pokemon) return null;
  const key = String(getPokemonTemplateKey(pokemon) || '').toLowerCase();
  const number = Number(pokemon.number);
  const originalNumber = Number(pokemon.originalNumber);
  const pokemonId = Number(pokemon.pokemonId || pokemon.id);

  let bestTemplate = null;
  let bestScore = 0;

  (allPokemonMaster || []).forEach(template => {
    const templateKeys = [
      template.formVariant,
      template.nameEn,
      template.species,
      template.id,
      template.number
    ].map(value => String(value || '').toLowerCase());

    let score = 0;
    if (key && templateKeys.includes(key)) score += 1;
    if (Number.isFinite(pokemonId) && Number(template.id) === pokemonId) score += 1;
    if (Number.isFinite(number) && Number(template.number) === number) score += 1;
    if (Number.isFinite(originalNumber) && Number(template.originalNumber) === originalNumber && template.nameEn === pokemon.nameEn) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  });

  return bestTemplate;
};

export const getBaseStatPatch = (template = {}) => ({
  baseHp: template.baseHp,
  baseAttack: template.baseAttack,
  baseDefense: template.baseDefense,
  baseSpAttack: template.baseSpAttack,
  baseSpDefense: template.baseSpDefense,
  baseSpeed: template.baseSpeed
});

export const withBaseStats = (pokemon, template) => {
  if (!pokemon || !template) return pokemon;
  const patch = getBaseStatPatch(template);
  return {
    ...pokemon,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined && value !== null)
    )
  };
};

export const fillMissingBaseStats = (pokemon, template) => {
  if (!pokemon || !template) return pokemon;
  const nextPokemon = { ...pokemon };
  BASE_STAT_FIELDS.forEach(field => {
    if (nextPokemon[field] === undefined || nextPokemon[field] === null) {
      nextPokemon[field] = template[field];
    }
  });
  return nextPokemon;
};
