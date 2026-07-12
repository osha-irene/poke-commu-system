// src/hooks/game/useIndividualValues.js
// 포켓몬 개체값 생성 (성별, 크기, 특성)

import { generatePokemonGender } from '../../utils/pokemonGender';
import { generateRandomIVs } from '../../utils/pokemonIndividualValues';
import { getAbilityKoreanName } from '../../utils/abilityUtils';

export const useIndividualValues = () => {
  // 성별 생성
  const generateGender = (pokemonData) => {
    return generatePokemonGender(pokemonData);
  };

  // 크기 생성 (7단계: XXXS ~ XXXL)
  const generateSize = (pokemonData) => {
    const baseHeight = pokemonData.height || 10;
    const baseWeight = pokemonData.weight || 100;
    
    // ±30% 범위에서 랜덤
    const heightVariation = 0.7 + Math.random() * 0.6; // 0.7 ~ 1.3
    const weightVariation = 0.7 + Math.random() * 0.6;
    
    const height = (baseHeight * heightVariation).toFixed(1);
    const weight = (baseWeight * weightVariation).toFixed(1);
    
    // 평균값 계산
    const avgVariation = (heightVariation + weightVariation) / 2;
    
    // 7단계 크기 등급
    let sizeRank;
    if (avgVariation < 0.75) {
      sizeRank = 'XXXS';      // 극소 (0.7~0.75) - 매우 희귀
    } else if (avgVariation < 0.85) {
      sizeRank = 'XXS';       // 최소 (0.75~0.85) - 희귀
    } else if (avgVariation < 0.95) {
      sizeRank = 'XS';        // 소형 (0.85~0.95)
    } else if (avgVariation < 1.0) {
      sizeRank = 'S';
    } else if (avgVariation <= 1.05) {
      sizeRank = 'M';         // 보통 (0.95~1.05) - 가장 흔함
    } else if (avgVariation <= 1.1) {
      sizeRank = 'L';
    } else if (avgVariation <= 1.15) {
      sizeRank = 'XL';        // 대형 (1.05~1.15)
    } else if (avgVariation <= 1.25) {
      sizeRank = 'XXL';       // 최대 (1.15~1.25) - 희귀
    } else {
      sizeRank = 'XXXL';      // 극대 (1.25~1.3) - 매우 희귀
    }
    
    return {
      height: parseFloat(height),
      weight: parseFloat(weight),
      sizeRank,
      heightVariation: (heightVariation * 100).toFixed(1),
      weightVariation: (weightVariation * 100).toFixed(1)
    };
  };

  // 특성 생성
  // ⚠️ 포켓몬 마스터 데이터(allPokemon.json)에는 한글 특성 목록(abilities)이 없고
  // 영문 특성(abilitiesEn/hiddenAbilityEn)만 있다. 예전엔 존재하지 않는 pokemonData.abilities를
  // 읽어서 항상 기본값 ['없음']으로 빠졌었다 (그래서 조우 화면에 특성이 "없음"으로 뜸).
  const generateAbility = (pokemonData, isHiddenAllowed = false) => {
    const abilitiesEn = pokemonData.abilitiesEn || [];

    // 숨겨진 특성 획득 가능 여부 (레이드, 특별 이벤트 등)
    if (isHiddenAllowed && pokemonData.hiddenAbilityEn && Math.random() < 0.05) {
      return getAbilityKoreanName(pokemonData.hiddenAbilityEn) || pokemonData.hiddenAbilityEn;  // 5% 확률로 숨특
    }

    if (!abilitiesEn.length) return '없음';

    // 일반 특성 중 랜덤 선택
    const selectedAbilityEn = abilitiesEn[Math.floor(Math.random() * abilitiesEn.length)];
    return getAbilityKoreanName(selectedAbilityEn) || selectedAbilityEn;
  };

  return {
    generateGender,
    generateSize,
    generateAbility,
    generateIVs: generateRandomIVs
  };
};

export default useIndividualValues;
