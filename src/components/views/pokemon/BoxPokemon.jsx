import React from 'react';
import { getTypeColor, COLORS } from '../../../styles/theme';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';
import { getPokemonDisplayParts } from '../../../utils/pokemonDisplayName';

const getBaseName = (pokemon) => getPokemonDisplayParts(pokemon).name;

// 濡쒖뺄 ?대갚 URL
const getLocalIconUrl = (pokemon, allPokemonMaster) => {
  let englishName = pokemon.nameEn;

  if (!englishName && allPokemonMaster) {
    const regionalForm = String(pokemon.regionalForm || '').toLowerCase();
    const originalNumber = Number(pokemon.originalNumber || pokemon.number);
    const template =
      allPokemonMaster.find(p => p.id === pokemon.pokemonId) ||
      allPokemonMaster.find(p => (
        regionalForm &&
        String(p.regionalForm || '').toLowerCase() === regionalForm &&
        Number(p.originalNumber || p.number) === originalNumber
      )) ||
      allPokemonMaster.find(p => p.number === pokemon.number);
    englishName = template?.nameEn;
  }

  const localUrl = getPokemonLocalIconUrl({
    ...pokemon,
    nameEn: englishName || pokemon.nameEn || pokemon.name || 'UNKNOWN',
  });
  if (localUrl) return localUrl;

  const orig = pokemon.originalNumber;
  if (orig === 710 || orig === 711) {
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${orig}.png`;
  }
  if (pokemon.iconUrl) return pokemon.iconUrl;
  if (pokemon.number) return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${pokemon.number}.png`;
  return '';
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

  // 寃뚯엫 ?꾧컧?먯꽌 ???ъ폆紐ъ쓽 newNumber 李얘린
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.originalNumber || pokemon.number;

  // ????됱긽 (theme.js ?ъ슜)
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // ?대?吏 URL
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
      {/* ?덈꺼 諛곗? */}
      <div className="absolute top-1 right-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">
        Lv.{pokemon.level}
      </div>
      
      {/* ?ъ폆紐??대?吏 - 濡쒖뺄 ?ㅽ봽?쇱씠?몄쓽 ?쇱そ 64x64留??쒖떆 */}
      <div className="aspect-square flex items-center justify-center p-2">
        <div
          className="pokemon-bg-sprite"
          style={{
            width: '64px',
            height: '64px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '128px 64px',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>
      
      {/* ?뺣낫 ?곸뿭 */}
      <div className="bg-gray-50 p-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">No.{displayNumber.toString().padStart(3, '0')}</span>
          <div className="flex gap-0.5 flex-shrink-0">
            <span
              className="text-xs px-1 py-0.5 rounded font-bold"
              style={{ backgroundColor: typeColors.bg, color: typeColors.text }}
            >
              {pokemon.type}
            </span>
            {pokemon.type2 && type2Colors && (
              <span
                className="text-xs px-1 py-0.5 rounded font-bold"
                style={{ backgroundColor: type2Colors.bg, color: type2Colors.text }}
              >
                {pokemon.type2}
              </span>
            )}
          </div>
        </div>
        <div
          className="text-base font-bold truncate"
          style={{ color: COLORS.ui.text.primary }}
        >
          {pokemon.nickname || getBaseName(pokemon)}
        </div>
      </div>
      
      {/* ?뚰듃???쒖떆 */}
      {pokemon.isPartner && (
        <div className="absolute top-1 left-1 text-pink-500 text-lg z-10">
          ?뮇
        </div>
      )}
    </div>
  );
}
