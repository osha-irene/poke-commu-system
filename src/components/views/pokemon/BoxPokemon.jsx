import React, { useState } from 'react';

// 이미지 URL 생성 헬퍼
const getPokemonIconUrl = (number) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
};

// 로컬 폴백 URL (영문 대문자 이름)
const getLocalIconUrl = (pokemon, allPokemonMaster) => {
  // nameEn 필드가 없으면 allPokemonMaster에서 찾기
  let englishName = pokemon.nameEn;
  
  if (!englishName && allPokemonMaster) {
    const template = allPokemonMaster.find(p => 
      p.number === pokemon.number || p.id === pokemon.pokemonId
    );
    englishName = template?.nameEn;
  }
  
  // 여전히 없으면 한글 이름 사용
  englishName = englishName || pokemon.name || 'UNKNOWN';
  
  const fileName = englishName.toUpperCase();
  // 현재 URL에 /poke-commu-system이 포함되어 있으면 해당 경로 사용
  const basePath = window.location.pathname.includes('/poke-commu-system') ? '/poke-commu-system' : '';
  return `${basePath}/img/icons/${fileName}.png`;
};

// 타입별 색상
const TYPE_COLORS = {
  '노말': { bg: '#A8A878', text: '#FFF' },
  '불꽃': { bg: '#F08030', text: '#FFF' },
  '물': { bg: '#6890F0', text: '#FFF' },
  '전기': { bg: '#F8D030', text: '#FFF' },
  '풀': { bg: '#78C850', text: '#FFF' },
  '얼음': { bg: '#98D8D8', text: '#FFF' },
  '격투': { bg: '#C03028', text: '#FFF' },
  '독': { bg: '#A040A0', text: '#FFF' },
  '땅': { bg: '#E0C068', text: '#FFF' },
  '비행': { bg: '#A890F0', text: '#FFF' },
  '에스퍼': { bg: '#F85888', text: '#FFF' },
  '벌레': { bg: '#A8B820', text: '#FFF' },
  '바위': { bg: '#B8A038', text: '#FFF' },
  '고스트': { bg: '#705898', text: '#FFF' },
  '드래곤': { bg: '#7038F8', text: '#FFF' },
  '악': { bg: '#705848', text: '#FFF' },
  '강철': { bg: '#B8B8D0', text: '#FFF' },
  '페어리': { bg: '#EE99AC', text: '#FFF' }
};

export default function BoxPokemon({ pokemon, isSelected, onDragStart, onClick, gamePokedex, allPokemonMaster }) {
  
  if (!pokemon) return null;

  // 게임 도감에서 이 포켓몬의 newNumber 찾기
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };
  
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
      <div className="aspect-square flex items-center justify-center" style={{ padding: '8px' }}>
        <div 
          style={{
            width: '64px',
            height: '64px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '128px 64px',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
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
                backgroundColor: (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }).bg,
                color: (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }).text
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