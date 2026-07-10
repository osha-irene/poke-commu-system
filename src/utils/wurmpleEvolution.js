export const WURMPLE_NUMBER = 265;
export const SILCOON_NUMBER = 266;
export const CASCOON_NUMBER = 268;

export const WURMPLE_EVOLUTION_FIELD = 'wurmpleEvolutionId';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const isWurmple = (pokemon = {}) => (
  toNumber(pokemon.number) === WURMPLE_NUMBER ||
  toNumber(pokemon.originalNumber) === WURMPLE_NUMBER ||
  String(pokemon.nameEn || pokemon.species || '').toLowerCase() === 'wurmple'
);

export const generateWurmpleEvolutionId = () => Math.floor(Math.random() * 2);

export const normalizeWurmpleEvolutionId = (value) => {
  const number = toNumber(value);
  return number === 0 || number === 1 ? number : null;
};

export const withWurmpleEvolutionId = (pokemon = {}) => {
  if (!isWurmple(pokemon)) return pokemon;
  const existingId = normalizeWurmpleEvolutionId(pokemon[WURMPLE_EVOLUTION_FIELD]);
  return {
    ...pokemon,
    [WURMPLE_EVOLUTION_FIELD]: existingId ?? generateWurmpleEvolutionId()
  };
};

export const getWurmpleEvolutionTarget = (pokemon = {}) => {
  if (!isWurmple(pokemon)) return null;
  const evolutionId = normalizeWurmpleEvolutionId(pokemon[WURMPLE_EVOLUTION_FIELD]);
  if (evolutionId === null) return null;
  return evolutionId === 0 ? SILCOON_NUMBER : CASCOON_NUMBER;
};
