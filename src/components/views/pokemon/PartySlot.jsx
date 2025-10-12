import React from 'react';

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

export default function PartySlot({ pokemon, index, isSelected, onDragStart, onDrop, onClick, gamePokedex, allPokemonMaster }) {
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

  const hpPercent = (pokemon.hp / pokemon.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };
  
  // 이미지 URL 결정 - 항상 로컬 이미지 사용
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
	  onDragOver={(e) => e.preventDefault()} 
      onDrop={onDrop}  
      onClick={onClick}
      className={`${STYLES.filled} ${isSelected ? STYLES.selected : STYLES.unselected}`}
    >
    
      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
        {index + 1}
      </div>
      
      {/* 로컬 스프라이트 이미지 - 오른쪽 64x64 영역을 50% 축소하여 표시 */}
      <div 
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
        style={{
          padding: '8px'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '64px 32px', // 128x64를 50%로 축소
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        />
      </div>
      
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