import React from 'react';

const STYLES = {
  card: "rounded-lg p-3 text-center border transition-all cursor-move",
  selected: "bg-indigo-100 border-indigo-400 shadow-md scale-105",
  unselected: "bg-gray-50 border-gray-200 hover:shadow-md hover:border-indigo-300"
};

export default function BoxPokemon({ pokemon, isSelected, onDragStart, onClick }) {
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
      <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
    </div>
  );
}