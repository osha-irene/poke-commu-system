import { getAbilityEnglishName } from './abilityUtils';
import { DEFAULT_IVS, withNormalizedIVs } from './pokemonIndividualValues';
import { fillMissingBaseStats, findPokemonTemplate } from './pokemonBaseStats';

export const normalizePokemonArray = (value) => {
  if (!value) return [null, null, null, null, null, null];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const numericKeys = Object.keys(value).map(Number).filter(Number.isFinite);
    if (numericKeys.length === 0) return [null, null, null, null, null, null];
    const maxIndex = Math.max(...numericKeys);
    return Array.from({ length: Math.max(6, maxIndex + 1) }, (_, i) => value[i] ?? null);
  }
  return value;
};

// members/{id}/caughtPokemon 원본은 오래된 항목에 nameEn/abilityEn/기본 스탯이 비어있을 수
// 있어서 항상 이 정규화를 거쳐야 렌더링(기술 조회, 스프라이트 등)이 정상 동작한다.
// useMembers.js의 전체회원 정규화와 동일한 로직 - 다른 회원 상세를 온디맨드로 조회하는
// useMemberCaughtPokemon 훅에서도 같은 결과가 나오도록 여기로 뽑아 공유한다.
export const normalizeCaughtPokemonArray = (rawCaughtPokemon, allPokemonData = []) => (
  normalizePokemonArray(rawCaughtPokemon).map((pokemon) => {
    if (!pokemon) return pokemon;

    const template = findPokemonTemplate(pokemon, allPokemonData);
    if (!template) return withNormalizedIVs(pokemon, DEFAULT_IVS);

    return withNormalizedIVs(fillMissingBaseStats({
      ...pokemon,
      nameEn: pokemon.nameEn || template.nameEn,
      abilityEn: pokemon.abilityEn || getAbilityEnglishName(pokemon.ability) || template.abilitiesEn?.[0] || null
    }, template), DEFAULT_IVS);
  })
);
