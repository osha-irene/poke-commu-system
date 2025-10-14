import React from 'react';
import { getTypeColor, COLORS } from '../../../styles/theme';

// 로컬 폴백 URL
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
  onDragEnd,
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

  // 타입 색상 (theme.js 사용)
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // 이미지 URL
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
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
        <div 
          className="text-xs font-bold truncate"
          style={{ color: COLORS.ui.text.primary }}
        >
          {pokemon.nickname || pokemon.name}
        </div>
        <div className="flex gap-1 mt-1 justify-center flex-wrap">
          <span 
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ 
              backgroundColor: typeColors.bg,
              color: typeColors.text
            }}
          >
            {pokemon.type}
          </span>
          {pokemon.type2 && type2Colors && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded font-bold"
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
      
      {/* 파트너 표시 */}
      {pokemon.isPartner && (
        <div className="absolute top-1 left-1 text-pink-500 text-lg z-10">
          💖
        </div>
      )}
    </div>
  );
}