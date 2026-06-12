export const DEFAULT_IVS = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};

const clampIv = (value, fallback = 31) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(31, Math.max(0, Math.floor(number)));
};

export const generateRandomIVs = () => ({
  hp: Math.floor(Math.random() * 32),
  attack: Math.floor(Math.random() * 32),
  defense: Math.floor(Math.random() * 32),
  specialAttack: Math.floor(Math.random() * 32),
  specialDefense: Math.floor(Math.random() * 32),
  speed: Math.floor(Math.random() * 32),
});

export const normalizeIVs = (ivs, fallback = DEFAULT_IVS) => ({
  hp: clampIv(ivs?.hp, fallback.hp),
  attack: clampIv(ivs?.attack ?? ivs?.atk, fallback.attack),
  defense: clampIv(ivs?.defense ?? ivs?.def, fallback.defense),
  specialAttack: clampIv(ivs?.specialAttack ?? ivs?.spAttack ?? ivs?.spa, fallback.specialAttack),
  specialDefense: clampIv(ivs?.specialDefense ?? ivs?.spDefense ?? ivs?.spd, fallback.specialDefense),
  speed: clampIv(ivs?.speed ?? ivs?.spe, fallback.speed),
});

export const withNormalizedIVs = (pokemon, fallback = DEFAULT_IVS) => {
  if (!pokemon) return pokemon;
  return {
    ...pokemon,
    ivs: normalizeIVs(pokemon.ivs, fallback),
  };
};
