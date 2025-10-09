// src/utils/pokemonImageUtils.js
// 새 파일을 만들어주세요!

/**
 * 포켓몬 이미지 URL 생성 유틸리티
 */

// 아이콘 URL 생성 (엔트리/박스용)
export const getPokemonIconUrl = (number) => {
  // 9세대 이상 (906번~)은 기본 이미지 사용
  if (number > 905) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
  }
  // 1-8세대는 generation-viii/icons 사용
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${number}.png`;
};

// 스프라이트 URL 생성 (상세 정보용)
export const getPokemonSpriteUrl = (number) => {
  // 5세대 도트 그래픽 (1-649번까지만 존재)
  if (number <= 649) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${number}.png`;
  }
  // 6세대 이상은 기본 이미지 사용
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
};

// 공식 아트워크 URL 생성 (도감/상세용)
export const getPokemonArtworkUrl = (number) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${number}.png`;
};