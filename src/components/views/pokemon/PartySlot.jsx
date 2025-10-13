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

export default function PartySlot({ pokemon, index, isSelected, onDragStart, onDrop, onClick, gamePokedex, allPokemonMaster, allItems = [] }) {
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

  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };
  
  // 이미지 URL 결정 - 항상 로컬 이미지 사용
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);
  
  // 몬스터볼 데이터 찾기 (DetailPanel과 동일한 방식)
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
  
  // 디버깅 - 항상 출력
  console.log('🔍 PartySlot 볼 찾기:', {
    pokemonName: pokemon.name,
    caughtWithBall: pokemon.caughtWithBall,
    pokeballData: pokeballData ? '✅ 찾음' : '❌ 못찾음',
    ballName: pokeballData?.name
  });
  
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
            style={{
              width: '32px',
              height: '32px',
              backgroundImage: `url(${pokeballData.spriteUrl})`,
              backgroundSize: '110%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full" />
        )}
      </div>
      
      {/* 로컬 스프라이트 이미지 - 선택된 포켓몬만 좌우 프레임 애니메이션 */}
      <div 
        className="w-9 h-9 flex-shrink-0"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: '64px 32px',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
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
    </div>
  );
}