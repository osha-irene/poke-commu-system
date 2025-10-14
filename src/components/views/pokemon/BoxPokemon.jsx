// src/components/views/pokemon/BoxPokemon.jsx
import React from 'react';
import { getTypeColor } from '../../../styles/theme';

// 로컬 폴백 URL (영문 대문자 이름)
const getLocalIconUrl = (pokemon, allPokemonMaster) => {
  let englishName = pokemon.nameEn;
  
  if (!englishName && allPokemonMaster) {
    const template = allPokemonMaster.find(p => 
      p.number === pokemon.number || p.id === pokemon.pokemonId
    );
    englishName = template?.nameEn;
  }
  
  englishName = englishName || pokemon.name || 'UNKNOWN';
  
  const fileName = englishName.toUpperCase();
  const basePath = window.location.pathname.includes('/poke-commu-system') ? '/poke-commu-system' : '';
  return `${basePath}/img/icons/${fileName}.png`;
};

export default function BoxPokemon({ 
  pokemon, 
  isSelected, 
  onDragStart, 
  onClick, 
  gamePokedex, 
  allPokemonMaster 
}) {
  
  if (!pokemon) return null;

  // 게임 도감에서 이 포켓몬의 newNumber 찾기
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // 이미지 URL 결정 - 항상 로컬 이미지 사용
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`relative cursor-pointer transition-all rounded-lg border-2 ${
        isSelected 
          ? 'bg-indigo-100 border-indigo-400 shadow-lg scale-105' 
          : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      {/* 레벨 배지 */}
      <div className="absolute top-1 right-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">
        Lv.{pokemon.level}
      </div>
      
      {/* 포켓몬 이미지 - 로컬 스프라이트의 오른쪽 64x64만 표시 */}
      <div className="aspect-square flex items-center justify-center p-2">
        <div 
          className="pokemon-bg-sprite"
          style={{
            width: '64px',
            height: '64px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '128px 64px',
            backgroundPosition: 'right center'
          }}
        />
      </div>
      
      {/* 정보 영역 */}
      <div className="bg-gray-50 p-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-1">
          No.{displayNumber.toString().padStart(3, '0')}
        </div>
        <div className="font-bold text-sm text-gray-800 truncate mb-1">
          {pokemon.nickname || pokemon.name}
        </div>
        
        {/* 타입 배지 */}
        <div className="flex gap-1">
          <span 
            className="text-xs px-2 py-0.5 rounded font-bold flex-1 text-center"
            style={{ 
              backgroundColor: typeColors.bg,
              color: typeColors.text
            }}
          >
            {pokemon.type}
          </span>
          {pokemon.type2 && (
            <span 
              className="text-xs px-2 py-0.5 rounded font-bold flex-1 text-center"
              style={{ 
                backgroundColor: type2Colors.bg,
                color: type2Colors.text
              }}
            >
              {pokemon.type2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}