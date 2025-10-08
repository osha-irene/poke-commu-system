import React from 'react';

const STYLES = {
  empty: "flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-gray-400",
  filled: "flex items-center gap-4 rounded-lg p-3 border transition-all cursor-move",
  selected: "bg-indigo-100 border-indigo-400 shadow-md",
  unselected: "bg-indigo-50 border-indigo-200 hover:shadow-md hover:border-indigo-300"
};

export default function PartySlot({ pokemon, index, isSelected, onDragStart, onClick }) {
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

  const hpPercent = (pokemon.hp / pokemon.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`${STYLES.filled} ${isSelected ? STYLES.selected : STYLES.unselected}`}
    >
      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {index + 1}
      </div>
      
      <div 
        className="w-12 h-12 flex-shrink-0"
        style={{
          backgroundImage: `url(${pokemon.iconUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{pokemon.nickname || pokemon.name}</span>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded">No.{pokemon.number}</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">{pokemon.type}</span>
        </div>
        <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
      </div>
      
      <div className="flex-shrink-0 w-32">
        <div className="text-xs text-gray-600 mb-1">HP</div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
          <div className={`h-2 rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="text-xs text-gray-600">{pokemon.hp}/{pokemon.maxHp}</div>
      </div>
    </div>
  );
}