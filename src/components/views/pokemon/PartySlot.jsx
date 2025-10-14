// src/components/views/pokemon/PartySlot.jsx
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

const STYLES = {
  empty: "flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-gray-400",
  filled: "flex items-center gap-4 rounded-lg p-3 border transition-all cursor-move",
  selected: "bg-indigo-100 border-indigo-400 shadow-md",
  unselected: "bg-indigo-50 border-indigo-200 hover:shadow-md hover:border-indigo-300"
};

export default function PartySlot({ 
  pokemon, 
  index, 
  isSelected, 
  onDragStart, 
  onDrop, 
  onClick, 
  gamePokedex, 
  allPokemonMaster, 
  allItems = [] 
}) {
  if (!pokemon) {
    return (
      <div className={STYLES.empty}>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
          {index + 1}
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded"></div>
        <div className="flex-1 text-sm">빈 슬롯</div>
      </div>
    );
  }

  // 게임 도감에서 이 포켓몬의 newNumber 찾기
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // 이미지 URL 결정 - 항상 로컬 이미지 사용
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);
  
  // 몬스터볼 데이터 찾기
  const pokeballData = pokemon.caughtWithBall 
    ? allItems?.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const ballName = pokemon.caughtWithBall?.toLowerCase();
        
        return itemName === ballName || 
               itemNameEn === ballName ||
               itemName?.includes(ballName) ||
               itemNameEn?.includes(ballName);
      })
    : null;
  
  // 고유 애니메이션 ID
  const animId = `pokemonSprite-${pokemon.uniqueId || index}`;

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()} 
      onDrop={onDrop}  
      onClick={onClick}
      className={`${STYLES.filled} ${isSelected ? STYLES.selected : STYLES.unselected}`}
    >
      <style>{`
        @keyframes ${animId} {
          0%, 49% { 
            background-position: left center; 
          }
          50%, 100% { 
            background-position: right center; 
          }
        }
      `}</style>
    
      {/* 몬스터볼 이미지 */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        {pokeballData ? (
          <div
            className="item-sprite"
            style={{
              width: '32px',
              height: '32px',
              backgroundImage: `url(${pokeballData.spriteUrl})`,
              backgroundSize: '110%',
              backgroundPosition: 'center'
            }}
          />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
        )}
      </div>
      
      {/* 로컬 스프라이트 이미지 - 선택된 포켓몬만 좌우 프레임 애니메이션 */}
      <div 
        className="pokemon-bg-sprite"
        style={{
          width: '32px',
          height: '32px',
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: '64px 32px',
          backgroundPosition: 'right center',
          animation: isSelected ? `${animId} 0.8s steps(1) infinite` : 'none'
        }}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">No.{displayNumber.toString().padStart(3, '0')}</span>
          <span className="font-bold text-lg">{pokemon.nickname || pokemon.name}</span>
          <div className="flex gap-1">
            <span 
              className="text-xs px-2 py-1 rounded font-bold shadow-sm"
              style={{ 
                backgroundColor: typeColors.bg,
                color: typeColors.text
              }}
            >
              {pokemon.type}
            </span>
            {pokemon.type2 && (
              <span 
                className="text-xs px-2 py-1 rounded font-bold shadow-sm"
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
        <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
      </div>
    </div>
  );
}