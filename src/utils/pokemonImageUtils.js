// src/utils/pokemonImageUtils.js
// 새 파일을 만들어주세요!

/**
 * 포켓몬 이미지 URL 생성 유틸리티
 */

import { getAlcremieImage } from './alcremieFlavors';

// 아이콘 URL 생성 (엔트리/박스용)
export const getPokemonIconUrl = (number) => {
  // 9세대 이상 (906번~)은 기본 이미지 사용
  if (number > 905) {
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${number}.png`;
  }
  // 1-8세대는 generation-viii/icons 사용
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${number}.png`;
};

// 스프라이트 URL 생성 (상세 정보용)
export const getPokemonSpriteUrl = (number) => {
  // 5세대 도트 그래픽 (1-649번까지만 존재)
  if (number <= 649) {
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-v/black-white/${number}.png`;
  }
  // 6세대 이상은 기본 이미지 사용
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${number}.png`;
};

// 공식 아트워크 URL 생성 (도감/상세용)
export const getPokemonArtworkUrl = (number) => {
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${number}.png`;
};

const FEMALE_SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/female';
const FEMALE_SHINY_SPRITE_BASE = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/female';

/**
 * 성별을 고려한 스프라이트 URL 반환
 * hasGenderDiff: true인 포켓몬만 female URL 적용, 없으면 기본 spriteUrl로 fallback
 * @param {Object} pokemon - 보유 포켓몬 객체 (gender, isShiny 포함)
 * @param {Object} pokemonData - allPokemon.json 항목 (hasGenderDiff, spriteUrl, number 포함)
 */
export const getGenderedSpriteUrl = (pokemon, pokemonData) => {
  if (!pokemonData) return null;

  const isFemale = pokemon?.gender === 'female';
  const hasGenderDiff = pokemonData.hasGenderDiff === true;
  const number = pokemonData.number;

  if (isFemale && hasGenderDiff) {
    if (pokemon.isShiny && pokemonData.femaleShinyUrl) return pokemonData.femaleShinyUrl;
    if (pokemonData.femaleSpriteUrl) return pokemonData.femaleSpriteUrl;
    if (number) {
      return pokemon.isShiny
        ? `${FEMALE_SHINY_SPRITE_BASE}/${number}.png`
        : `${FEMALE_SPRITE_BASE}/${number}.png`;
    }
  }

  // female이 아니거나 gender diff 없으면 null 반환 → 호출부에서 fallback 처리
  return null;
};

export const getOwnedPokemonSpriteUrl = (pokemon, pokemonData = pokemon) => {
  if (!pokemon) return '';

  // 마휘핑: 진화 시 고른 맛(alcremieFlavor)이 있으면 번호 기반 API 이미지 대신 그 맛 이미지를 쓴다
  if (pokemon.alcremieFlavor) {
    const flavorImage = getAlcremieImage(pokemon.alcremieFlavor, pokemon.alcremieShape);
    if (flavorImage) return flavorImage;
  }

  const genderedSprite = getGenderedSpriteUrl(pokemon, pokemonData);
  if (genderedSprite) return genderedSprite;

  const number = pokemon.number || pokemon.dexId || pokemon.pokemonId || pokemon.id || pokemon.originalNumber;

  if (pokemon.isShiny) {
    if (pokemon.shinySprite) return pokemon.shinySprite;
    if (pokemon.shinySpriteUrl) return pokemon.shinySpriteUrl;

    if (number) return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${number}.png`;
  }

  if (number) return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${number}.png`;
  if (pokemon.spriteUrl) return pokemon.spriteUrl;
  if (pokemon.sprite) return pokemon.sprite;
  if (pokemon.imageUrl) return pokemon.imageUrl;

  return '';
};
