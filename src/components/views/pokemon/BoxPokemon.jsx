import React from 'react';
import { getTypeColor, COLORS } from '../../../styles/theme';

// ë¡œì»¬ ?´ë°± URL
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

  // ê²Œì„ ?„ê°?ì„œ ???¬ì¼“ëª¬ì˜ newNumber ì°¾ê¸°
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  // ?€???‰ìƒ (theme.js ?¬ìš©)
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // ?´ë?ì§€ URL
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
      {/* ?ˆë²¨ ë°°ì? */}
      <div className="absolute top-1 right-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">
        Lv.{pokemon.level}
      </div>
      
      {/* ?¬ì¼“ëª??´ë?ì§€ - ë¡œì»¬ ?¤í”„?¼ì´?¸ì˜ ?¼ìª½ 64x64ë§??œì‹œ */}
      <div className="aspect-square flex items-center justify-center p-2">
        <div 
          className="pokemon-bg-sprite"
          style={{
            width: '64px',
            height: '64px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '128px 64px',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
      
      {/* ?•ë³´ ?ì—­ */}
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
      
      {/* ?ŒíŠ¸???œì‹œ */}
      {pokemon.isPartner && (
        <div className="absolute top-1 left-1 text-pink-500 text-lg z-10">
          ?’–
        </div>
      )}
    </div>
  );
}
