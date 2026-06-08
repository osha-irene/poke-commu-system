export const getPokemonLearnsetKeys = (pokemonOrNumber) => {
  if (pokemonOrNumber === null || pokemonOrNumber === undefined) return [];

  if (typeof pokemonOrNumber === 'number' || typeof pokemonOrNumber === 'string') {
    return [String(pokemonOrNumber)];
  }

  return [
    pokemonOrNumber.originalNumber,
    pokemonOrNumber.number,
    pokemonOrNumber.pokemonId
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(String);
};

export const getPokemonLearnset = (pokemonLearnsets = {}, pokemonOrNumber) => {
  const keys = getPokemonLearnsetKeys(pokemonOrNumber);
  const key = keys.find((candidate) => pokemonLearnsets[candidate]);
  return key ? pokemonLearnsets[key] : null;
};

export const getLearnsetTmMoves = (learnset = {}) => (
  learnset.tmMoves || learnset.machineMoves || []
);
