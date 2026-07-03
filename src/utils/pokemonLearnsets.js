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
