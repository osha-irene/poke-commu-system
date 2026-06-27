// src/components/pokemon/PokemonPreviewInfo.jsx
import React from 'react';
import { shouldShowGenderIcon } from '../../../utils/pokemonGender';
import { getAbilityKoreanName } from '../../../utils/abilityUtils';

/**
 * 야생 포켓몬의 정보를 한 줄로 표시하는 컴포넌트
 * 
 * @param {Object} pokemon - 포켓몬 객체 (isShiny, level, ability, gender 포함)
 */
export default function PokemonPreviewInfo({ pokemon }) {
  if (!pokemon) return null;

  const getGenderIcon = (gender) => {
    if (gender === 'male') return '♂';
    if (gender === 'female') return '♀';
    return null;
  };

  return (
    <>
      {/* 타입 표시 */}
      <span className="text-gray-600">{pokemon.type} 타입</span>
      
      {/* 구분선 */}
      <span className="text-gray-400 mx-1">|</span>
      
      {/* 레벨 */}
      <span className="text-amber-600 font-semibold">
        Lv.{pokemon.level || '?'}
      </span>
      
      {/* 구분선 */}
      <span className="text-gray-400 mx-1">|</span>
      
      {/* 특성 */}
      <span className="text-purple-600 font-semibold">{getAbilityKoreanName(pokemon.ability) || pokemon.ability || '???'}</span>
      
      {shouldShowGenderIcon(pokemon.gender) && (
        <>
          {/* 구분선 */}
          <span className="text-gray-400 mx-1">|</span>

          {/* 성별 */}
          <span className={`font-bold ${
            pokemon.gender === 'male'
              ? 'text-blue-600'
              : 'text-pink-600'
          }`}>
            {getGenderIcon(pokemon.gender)}
          </span>
        </>
      )}
      
      {/* 이로치 표시 */}
      {pokemon.isShiny && (
        <>
          <span className="text-gray-400 mx-1">|</span>
          <span style={{ fontWeight: 800, color: '#c084fc' }}>
            ★ 색이 다른 포켓몬
          </span>
        </>
      )}
    </>
  );
}
