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

export const findPokemonTemplate = (pokemon, allPokemonMaster = []) => {
  if (!pokemon) return null;
  const key = String(getPokemonTemplateKey(pokemon) || '').toLowerCase();
  const number = Number(pokemon.number);
  const originalNumber = Number(pokemon.originalNumber);
  const pokemonId = Number(pokemon.pokemonId || pokemon.id);

  return (allPokemonMaster || []).find(template => {
    const templateKeys = [
      template.formVariant,
      template.nameEn,
      template.species,
      template.id,
      template.number
    ].map(value => String(value || '').toLowerCase());
    return (
      (key && templateKeys.includes(key)) ||
      (Number.isFinite(pokemonId) && Number(template.id) === pokemonId) ||
      (Number.isFinite(number) && Number(template.number) === number) ||
      (Number.isFinite(originalNumber) && Number(template.originalNumber) === originalNumber && template.nameEn === pokemon.nameEn)
    );
  }) || null;
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
