import React from 'react';
import { getTypeColor } from '../../../styles/theme';

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
  onDragEnd,
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

  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  const hpPercent = (pokemon.hp / pokemon.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  
  // theme.js의 getTypeColor 사용
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);

  // 몬스터볼 이미지 가져오기
  const pokeballData = pokemon.caughtWithBall 
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const ballName = pokemon.caughtWithBall?.toLowerCase();
        
        return itemName === ballName || 
               itemNameEn === ballName ||
               itemName?.includes(ballName) ||
               itemNameEn?.includes(ballName);
      })
    : null;

  const ballImage = pokeballData?.spriteUrl || pokeballData?.imageUrl;

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${STYLES.filled} ${isSelected ? STYLES.selected : STYLES.unselected}`}
    >
      {/* 몬스터볼 이미지 - 원형 꽉 차게 */}
      <div 
        className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{ 
          backgroundColor: ballImage ? 'transparent' : '#6366f1'
        }}
      >
        {ballImage ? (
          <div
            className="w-full h-full pokemon-bg-sprite"
            style={{
              backgroundImage: `url(${ballImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        ) : (
          <span className="font-bold text-sm text-white">
            {index + 1}
          </span>
        )}
      </div>
      
      {/* 포켓몬 아이콘 */}
      <div 
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
        style={{ padding: '8px' }}
      >
        <div
          className="pokemon-bg-sprite"
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '64px 32px',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
      
      {/* 포켓몬 정보 */}
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
            {pokemon.type2 && type2Colors && (
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