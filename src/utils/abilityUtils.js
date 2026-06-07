// src/utils/abilityUtils.js
// 특성 관련 유틸리티 함수들

import abilitiesData from '../data/abilities.json';

/**
 * 특성 데이터 캐시 (한글 이름으로 인덱싱)
 */
const abilitiesByKoreanName = {};
const abilitiesByEnglishName = {};
const abilitiesById = {};

// 초기화 시 인덱싱
if (abilitiesData?.abilities) {
  abilitiesData.abilities.forEach(ability => {
    if (ability.name) {
      abilitiesByKoreanName[ability.name.toLowerCase()] = ability;
    }
    if (ability.nameEn) {
      abilitiesByEnglishName[ability.nameEn.toLowerCase()] = ability;
    }
    if (ability.id) {
      abilitiesById[ability.id] = ability;
    }
  });
}

/**
 * 특성 이름(한글 또는 영문)으로 특성 데이터 조회
 * @param {string} abilityName - 특성 이름 (한글 또는 영문)
 * @returns {Object|null} 특성 데이터
 */
export function getAbilityByName(abilityName) {
  if (!abilityName) return null;
  
  const normalizedName = abilityName.toLowerCase().trim();
  
  // 한글 이름으로 검색
  if (abilitiesByKoreanName[normalizedName]) {
    return abilitiesByKoreanName[normalizedName];
  }
  
  // 영문 이름으로 검색
  if (abilitiesByEnglishName[normalizedName]) {
    return abilitiesByEnglishName[normalizedName];
  }
  
  // 부분 매칭 시도
  const koreanMatch = Object.keys(abilitiesByKoreanName).find(key => 
    key.includes(normalizedName) || normalizedName.includes(key)
  );
  if (koreanMatch) {
    return abilitiesByKoreanName[koreanMatch];
  }
  
  const englishMatch = Object.keys(abilitiesByEnglishName).find(key => 
    key.includes(normalizedName) || normalizedName.includes(key)
  );
  if (englishMatch) {
    return abilitiesByEnglishName[englishMatch];
  }
  
  return null;
}

/**
 * 특성 ID로 특성 데이터 조회
 * @param {number} abilityId - 특성 ID
 * @returns {Object|null} 특성 데이터
 */
export function getAbilityById(abilityId) {
  return abilitiesById[abilityId] || null;
}

/**
 * 특성 설명 가져오기 (짧은 버전, 한글 우선)
 * @param {string} abilityName - 특성 이름
 * @param {boolean} preferKorean - 한글 설명 우선 (기본값: true)
 * @returns {string} 특성 설명
 */
export function getAbilityShortEffect(abilityName, preferKorean = true) {
  const ability = getAbilityByName(abilityName);
  if (!ability) return '';
  
  if (preferKorean) {
    return ability.shortEffectKo || ability.flavorTextKo || ability.shortEffect || '';
  }
  return ability.shortEffect || '';
}

/**
 * 특성 설명 가져오기 (전체 버전, 한글 우선)
 * @param {string} abilityName - 특성 이름
 * @param {boolean} preferKorean - 한글 설명 우선 (기본값: true)
 * @returns {string} 특성 설명
 */
export function getAbilityEffect(abilityName, preferKorean = true) {
  const ability = getAbilityByName(abilityName);
  if (!ability) return '';
  
  if (preferKorean) {
    return ability.effectKo || ability.flavorTextKo || ability.effect || ability.shortEffect || '';
  }
  return ability.effect || ability.shortEffect || '';
}

/**
 * 한글 특성 이름을 영문으로 변환
 * @param {string} koreanName - 한글 특성 이름
 * @returns {string|null} 영문 특성 이름
 */
export function getAbilityEnglishName(koreanName) {
  const ability = getAbilityByName(koreanName);
  return ability?.nameEn || null;
}

/**
 * 영문 특성 이름을 한글로 변환
 * @param {string} englishName - 영문 특성 이름
 * @returns {string|null} 한글 특성 이름
 */
export function getAbilityKoreanName(englishName) {
  const ability = getAbilityByName(englishName);
  return ability?.name || null;
}

/**
 * 특성 한글 설명을 PokeAPI에서 가져오기 (런타임)
 * @param {number} abilityId - 특성 ID
 * @returns {Promise<Object|null>} 한글 설명 데이터
 */
export async function fetchAbilityKoreanDescription(abilityId) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityId}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // 한글 flavor_text 찾기 (최신 버전 우선)
    const koreanFlavorTexts = data.flavor_text_entries
      .filter(entry => entry.language.name === 'ko')
      .sort((a, b) => {
        const versionOrder = [
          'sword-shield', 'ultra-sun-ultra-moon', 'sun-moon',
          'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2',
          'black-white', 'heartgold-soulsilver', 'platinum',
          'diamond-pearl', 'ruby-sapphire', 'emerald'
        ];
        const aIndex = versionOrder.indexOf(a.version_group.name);
        const bIndex = versionOrder.indexOf(b.version_group.name);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    
    // 한글 effect 찾기
    const koreanEffect = data.effect_entries.find(
      entry => entry.language.name === 'ko'
    );
    
    return {
      flavorText: koreanFlavorTexts[0]?.flavor_text?.replace(/\n/g, ' ') || null,
      effectKo: koreanEffect?.effect?.replace(/\n/g, ' ') || null,
      shortEffectKo: koreanEffect?.short_effect?.replace(/\n/g, ' ') || null
    };
  } catch (error) {
    console.error(`Error fetching ability ${abilityId}:`, error);
    return null;
  }
}

/**
 * 특성 설명 가져오기 (한글 없으면 API에서 가져옴)
 * @param {string} abilityName - 특성 이름
 * @returns {Promise<string>} 한글 특성 설명
 */
export async function getAbilityDescriptionWithFallback(abilityName) {
  const ability = getAbilityByName(abilityName);
  if (!ability) return '';
  
  // 이미 한글 설명이 있으면 반환
  if (ability.effectKo || ability.flavorTextKo || ability.shortEffectKo) {
    return ability.effectKo || ability.flavorTextKo || ability.shortEffectKo;
  }
  
  // API에서 가져오기
  const koreanData = await fetchAbilityKoreanDescription(ability.id);
  if (koreanData) {
    return koreanData.effectKo || koreanData.flavorText || koreanData.shortEffectKo || ability.effect || '';
  }
  
  return ability.effect || ability.shortEffect || '';
}

/**
 * 특성이 배틀에서 어떤 효과를 가지는지 분류
 * @param {string} abilityName - 특성 이름
 * @returns {Object} 효과 분류
 */
export function classifyAbilityEffect(abilityName) {
  const ability = getAbilityByName(abilityName);
  if (!ability) return { type: 'unknown', effects: [] };
  
  const effect = (ability.effect || ability.shortEffect || '').toLowerCase();
  const effects = [];
  
  // 날씨 관련
  if (effect.includes('rain') || effect.includes('비')) {
    effects.push('weather_rain');
  }
  if (effect.includes('sunlight') || effect.includes('sunny') || effect.includes('햇살')) {
    effects.push('weather_sun');
  }
  if (effect.includes('sandstorm') || effect.includes('모래')) {
    effects.push('weather_sand');
  }
  if (effect.includes('hail') || effect.includes('snow') || effect.includes('눈')) {
    effects.push('weather_hail');
  }
  
  // 스탯 관련
  if (effect.includes('attack') || effect.includes('공격')) {
    effects.push('stat_attack');
  }
  if (effect.includes('defense') || effect.includes('방어')) {
    effects.push('stat_defense');
  }
  if (effect.includes('speed') || effect.includes('스피드')) {
    effects.push('stat_speed');
  }
  if (effect.includes('special') || effect.includes('특공') || effect.includes('특방')) {
    effects.push('stat_special');
  }
  
  // 상태이상 관련
  if (effect.includes('poison') || effect.includes('독')) {
    effects.push('status_poison');
  }
  if (effect.includes('burn') || effect.includes('화상')) {
    effects.push('status_burn');
  }
  if (effect.includes('paralyze') || effect.includes('마비')) {
    effects.push('status_paralysis');
  }
  if (effect.includes('sleep') || effect.includes('잠')) {
    effects.push('status_sleep');
  }
  if (effect.includes('freeze') || effect.includes('frozen') || effect.includes('얼')) {
    effects.push('status_freeze');
  }
  
  // 면역 관련
  if (effect.includes('immune') || effect.includes('면역') || effect.includes('무효')) {
    effects.push('immunity');
  }
  
  // 타입 변환
  if (effect.includes('type change') || effect.includes('타입') || effect.includes('변환')) {
    effects.push('type_change');
  }
  
  // 접촉 관련
  if (effect.includes('contact') || effect.includes('접촉')) {
    effects.push('contact');
  }
  
  // 회복 관련
  if (effect.includes('heal') || effect.includes('recover') || effect.includes('회복')) {
    effects.push('healing');
  }
  
  // 데미지 관련
  if (effect.includes('damage') || effect.includes('데미지') || effect.includes('위력')) {
    effects.push('damage');
  }
  
  return {
    type: effects.length > 0 ? effects[0] : 'other',
    effects
  };
}

/**
 * 포켓몬의 특성 정보 가져오기 (숨겨진 특성 포함)
 * @param {Object} pokemonData - allPokemon에서의 포켓몬 데이터
 * @returns {Object} 특성 정보
 */
export function getPokemonAbilities(pokemonData) {
  if (!pokemonData) return { abilities: [], hiddenAbility: null };
  
  const abilities = [];
  
  // 일반 특성
  if (pokemonData.abilities && Array.isArray(pokemonData.abilities)) {
    pokemonData.abilities.forEach(abilityName => {
      const abilityData = getAbilityByName(abilityName);
      abilities.push({
        name: abilityName,
        nameEn: abilityData?.nameEn || null,
        shortEffect: abilityData?.shortEffect || '',
        shortEffectKo: abilityData?.shortEffectKo || abilityData?.flavorTextKo || '',
        effect: abilityData?.effect || '',
        effectKo: abilityData?.effectKo || '',
        isHidden: false
      });
    });
  }
  
  // 숨겨진 특성
  let hiddenAbility = null;
  if (pokemonData.hiddenAbility) {
    const hiddenData = getAbilityByName(pokemonData.hiddenAbility);
    hiddenAbility = {
      name: pokemonData.hiddenAbility,
      nameEn: hiddenData?.nameEn || pokemonData.hiddenAbilityEn || null,
      shortEffect: hiddenData?.shortEffect || '',
      shortEffectKo: hiddenData?.shortEffectKo || hiddenData?.flavorTextKo || '',
      effect: hiddenData?.effect || '',
      effectKo: hiddenData?.effectKo || '',
      isHidden: true
    };
  }
  
  return {
    abilities,
    hiddenAbility
  };
}

/**
 * @smogon/calc용 특성 이름 변환
 * 한글 특성 이름을 @smogon/calc에서 인식하는 영문 형식으로 변환
 * @param {string} abilityName - 특성 이름 (한글 또는 영문)
 * @returns {string} @smogon/calc용 영문 특성 이름
 */
export function toCalcAbilityName(abilityName) {
  if (!abilityName) return '';
  
  const ability = getAbilityByName(abilityName);
  if (ability?.nameEn) {
    // @smogon/calc 형식으로 변환 (예: "speed-boost" -> "Speed Boost")
    return ability.nameEn
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // 이미 영문인 경우 그대로 반환
  return abilityName;
}

/**
 * 전체 특성 목록 반환
 * @returns {Array} 전체 특성 배열
 */
export function getAllAbilities() {
  return abilitiesData?.abilities || [];
}

/**
 * 세대별 특성 필터링
 * @param {string} generation - 세대 (예: "generation-iii")
 * @returns {Array} 해당 세대의 특성 배열
 */
export function getAbilitiesByGeneration(generation) {
  if (!generation) return getAllAbilities();
  
  return (abilitiesData?.abilities || []).filter(
    ability => ability.generation === generation
  );
}

export default {
  getAbilityByName,
  getAbilityById,
  getAbilityShortEffect,
  getAbilityEffect,
  getAbilityEnglishName,
  getAbilityKoreanName,
  fetchAbilityKoreanDescription,
  getAbilityDescriptionWithFallback,
  classifyAbilityEffect,
  getPokemonAbilities,
  toCalcAbilityName,
  getAllAbilities,
  getAbilitiesByGeneration
};
