import React from 'react';

const STYLES = {
  empty: "flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-gray-400",
  filled: "flex items-center gap-4 rounded-lg p-3 border transition-all cursor-move",
  selected: "bg-indigo-100 border-indigo-400 shadow-md",
  unselected: "bg-indigo-50 border-indigo-200 hover:shadow-md hover:border-indigo-300"
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

  // 디버깅 로그
  if (index === 0) {
    console.log('=== PartySlot 포켓몬 데이터 ===');
    console.log('포켓몬:', pokemon);
    console.log('type:', pokemon.type);
    console.log('type2:', pokemon.type2);
    console.log('============================');
  }

  const hpPercent = (pokemon.hp / pokemon.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };

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
                  backgroundColor: (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }).bg,
                  color: (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }).text
                }}
              >
                {pokemon.type2}
              </span>
            )}
          </div>
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