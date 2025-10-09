import React from 'react';

const STYLES = {
  card: "rounded-lg p-3 text-center border transition-all cursor-move",
  selected: "bg-indigo-100 border-indigo-400 shadow-md scale-105",
  unselected: "bg-gray-50 border-gray-200 hover:shadow-md hover:border-indigo-300"
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

export default function BoxPokemon({ pokemon, isSelected, onDragStart, onClick }) {
  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };
  const type2Colors = pokemon.type2 ? (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }) : null;

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`${STYLES.card} ${isSelected ? STYLES.selected : STYLES.unselected}`}
      title={`${pokemon.name} Lv.${pokemon.level}`}
    >
      <div 
        className="w-full h-16 mb-2"
        style={{
          backgroundImage: `url(${pokemon.iconUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      <div className="text-xs font-bold text-gray-700 truncate">{pokemon.nickname || pokemon.name}</div>
      <div className="mt-1 flex gap-1 justify-center">
        <span 
          className="text-xs px-2 py-0.5 rounded font-bold shadow-sm inline-block"
          style={{ 
            backgroundColor: typeColors.bg,
            color: typeColors.text
          }}
        >
          {pokemon.type}
        </span>
        {pokemon.type2 && (
          <span 
            className="text-xs px-2 py-0.5 rounded font-bold shadow-sm inline-block"
            style={{ 
              backgroundColor: type2Colors.bg,
              color: type2Colors.text
            }}
          >
            {pokemon.type2}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1">Lv.{pokemon.level}</div>
    </div>
  );
}