const normalizeDisplayName = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '');

export const getOwnedPokemonDisplayParts = (pokemon = {}) => {
  const speciesName =
    pokemon.speciesName ||
    pokemon.speciesKo ||
    pokemon.originalName ||
    pokemon.baseSpecies ||
    pokemon.nameKo ||
    pokemon.name ||
    pokemon.species ||
    pokemon.nameEn ||
    '포켓몬';
  const nickname = String(pokemon.nickname || '').trim();
  const hasNickname = Boolean(
    nickname &&
    normalizeDisplayName(nickname) !== normalizeDisplayName(speciesName)
  );

  return {
    primary: hasNickname ? nickname : speciesName,
    species: speciesName,
    hasNickname,
  };
};

export const formatOwnedPokemonName = (pokemon = {}) => {
  const parts = getOwnedPokemonDisplayParts(pokemon);
  return parts.hasNickname ? `${parts.primary} (${parts.species})` : parts.primary;
};
