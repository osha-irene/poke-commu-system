import React from 'react';
import { Heart, Egg } from 'lucide-react';
import { getTypeColor, POKEBALL_LIST } from '../../../styles/theme';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';

const getLocalIconUrl = (pokemon, allPokemonMaster) => {
  let englishName = pokemon.nameEn;
  
  if (!englishName && allPokemonMaster) {
    const template = allPokemonMaster.find(p => 
      p.number === pokemon.number || p.id === pokemon.pokemonId
    );
    englishName = template?.nameEn;
  }
  
  return getPokemonLocalIconUrl({
    ...pokemon,
    nameEn: englishName || pokemon.nameEn || pokemon.name || 'UNKNOWN',
  });
};

// ⭐ 볼 이미지 가져오기 헬퍼 함수 (디버깅 추가)
const getBallImageUrl = (pokemon, allItems = []) => {
  console.log('🔍 [PartySlot] 볼 이미지 찾기:', {
    ballImageUrl: pokemon.ballImageUrl,
    caughtWithBall: pokemon.caughtWithBall,
    allItemsCount: allItems.length
  });

  // ⭐ ballImageUrl을 신뢰하지 말고, 항상 caughtWithBall로 찾기
  
  // 1순위: allItems에서 찾기
  if (pokemon.caughtWithBall && typeof pokemon.caughtWithBall === 'string' && allItems.length > 0) {
    const pokeballData = allItems.find(item => {
      const itemName = item.name?.toLowerCase();
      const itemNameEn = item.nameEn?.toLowerCase();
      const ballName = pokemon.caughtWithBall.toLowerCase();
      
      return itemName === ballName || 
             itemNameEn === ballName ||
             itemName?.includes(ballName) ||
             itemNameEn?.includes(ballName);
    });
    
    if (pokeballData) {
      const url = pokeballData.spriteUrl || pokeballData.imageUrl;
      console.log('✅ [PartySlot] allItems에서 찾음:', url);
      return url;
    }
  }
  
  // 2순위: POKEBALL_LIST
  if (pokemon.caughtWithBall) {
    const ballInfo = POKEBALL_LIST.find(ball => 
      ball.name === pokemon.caughtWithBall || 
      ball.nameEn === pokemon.caughtWithBall.toLowerCase()
    );
    
    if (ballInfo) {
      const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballInfo.nameEn}.png`;
      console.log('✅ [PartySlot] POKEBALL_LIST에서 찾음:', url);
      return url;
    }
  }
  
  // 3순위: ballImageUrl (마지막 대안)
  if (pokemon.ballImageUrl) {
    console.log('⚠️ [PartySlot] ballImageUrl 사용 (대안):', pokemon.ballImageUrl);
    return pokemon.ballImageUrl;
  }
  
  // 기본값
  console.log('ℹ️ [PartySlot] 기본 몬스터볼 사용');
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
};

const STYLES = {
  empty: "flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300 text-gray-400",
  filled: "flex items-center gap-4 rounded-lg p-3 border transition-all cursor-move",
  selected: "border-lime-400 shadow-md",
  unselected: "border-transparent hover:shadow-md",
  partner: "bg-white/40 border-lime-300 shadow-sm",
  partnerEmpty: "bg-white/40 border-2 border-dashed border-lime-300",
  egg: "bg-white/40 border-lime-300 shadow-sm",
  eggEmpty: "bg-white/40 border-2 border-dashed border-lime-300"
};

// 파트너 포켓몬 슬롯
export function PartnerSlot({
  pokemon,
  onClick,
  gamePokedex,
  allPokemonMaster,
  allItems = [],
  mobile = false,
}) {
  const mobileCard = {
    display: 'flex', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: '12px 14px',
    background: 'transparent',
  };
  const mobileText = { color: 'rgba(225,248,185,0.92)' };
  const mobileMuted = { color: 'rgba(170,210,125,0.65)', fontSize: 12 };

  if (!pokemon) {
    if (mobile) {
      return (
        <div style={{ ...mobileCard, opacity: 0.7 }}>
          <Heart size={22} style={{ color: 'rgba(240,130,150,0.7)', flexShrink: 0 }} />
          <div>
            <div style={{ ...mobileText, fontWeight: 700, fontSize: 14 }}>파트너 포켓몬</div>
            <div style={mobileMuted}>파트너를 설정해주세요</div>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-4 rounded-lg p-4 ${STYLES.partnerEmpty}`}>
        <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center">
          <Heart size={24} className="text-pink-500" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-pink-700 flex items-center gap-2">
            <Heart size={16} />
            파트너 포켓몬
          </div>
          <div className="text-sm text-pink-600">파트너를 설정해주세요</div>
        </div>
      </div>
    );
  }

  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);
  const ballImage = getBallImageUrl(pokemon, allItems);  // ⭐ 함수 호출

  if (mobile) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 12, padding: '12px 14px',
          cursor: 'pointer',
        }}
      >
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `url(${ballImage})`,
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            borderRadius: '50%',
          }} />
        </div>
        <div style={{
          width: 48, height: 48, flexShrink: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: '96px 48px', backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat', imageRendering: 'pixelated',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Heart size={12} style={{ color: 'rgba(240,130,150,0.85)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(240,130,150,0.75)', fontWeight: 700 }}>파트너</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#5a7a40', fontWeight: 600 }}>No.{displayNumber.toString().padStart(3, '0')}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1a2e10' }}>{pokemon.nickname || pokemon.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, backgroundColor: typeColors.bg, color: typeColors.text }}>{pokemon.type}</span>
            {pokemon.type2 && type2Colors && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, backgroundColor: type2Colors.bg, color: type2Colors.text }}>{pokemon.type2}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#5a7a40', fontWeight: 600, marginTop: 2 }}>Lv.{pokemon.level}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 rounded-lg p-4 ${STYLES.partner} cursor-pointer hover:shadow-lg transition-all`}
    >

      <div
        className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'transparent' }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url(${ballImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>

      <div
        className="w-14 h-14 flex-shrink-0 flex items-center justify-center"
        style={{ padding: '4px' }}
      >
        <div
          className="pokemon-bg-sprite"
          style={{
            width: '40px',
            height: '40px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '80px 40px',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={14} className="text-pink-500" />
          <span className="text-xs text-pink-600 font-semibold">파트너 포켓몬</span>
        </div>
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
        <div className="text-sm" style={{ color: '#5a7a40', fontWeight: 600 }}>Lv.{pokemon.level}</div>
      </div>
    </div>
  );
}

// 알 슬롯
export function EggSlot({ 
  egg,
  onClick
}) {
  if (!egg) {
    return (
      <div className={`flex items-center gap-4 rounded-lg p-4 ${STYLES.eggEmpty}`}>
        <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
          <Egg size={24} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-amber-700 flex items-center gap-2">
            <Egg size={16} />
            포켓몬 알
          </div>
          <div className="text-sm text-amber-600">알이 없습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 rounded-lg p-4 ${STYLES.egg} cursor-pointer hover:shadow-lg transition-all`}
    >
      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
        <Egg size={32} className="text-amber-600" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Egg size={14} className="text-amber-600" />
          <span className="text-xs text-amber-700 font-semibold">포켓몬 알</span>
        </div>
        <div className="font-bold text-lg text-gray-800">{egg.name || '???의 알'}</div>
      </div>
    </div>
  );
}

// 기본 파티 슬롯

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
        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
          <img src="/pokeball.png" alt="" style={{ width: 24, height: 24, opacity: 1 }} />
        </div>
        <div className="flex-1 text-sm">빈 슬롯</div>
      </div>
    );
  }

  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;

  
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  const imageUrl = getLocalIconUrl(pokemon, allPokemonMaster);
  const ballImage = getBallImageUrl(pokemon, allItems);  // ⭐ 함수 호출

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${STYLES.filled} ${isSelected ? STYLES.selected : STYLES.unselected}`}
    >
      {/* ... 기존 style 태그 그대로 ... */}

      <div 
        className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'transparent' }}
      >
        <div
          className="w-full h-full pokemon-bg-sprite"
          style={{
            backgroundImage: `url(${ballImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
      <div 
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
        style={{ padding: '4px' }}
      >
        <div
          className="pokemon-bg-sprite"
          style={{
            width: '32px',
            height: '32px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: '64px 32px',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            WebkitImageRendering: '-webkit-crisp-edges',
            MozImageRendering: '-moz-crisp-edges',
            msInterpolationMode: 'nearest-neighbor'
          }}
        />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#5a7a40', fontWeight: 600 }}>No.{displayNumber.toString().padStart(3, '0')}</span>
          <span className="font-bold text-lg" style={{ color: '#1a2e10' }}>{pokemon.nickname || pokemon.name}</span>
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
        <div className="text-sm" style={{ color: '#5a7a40', fontWeight: 600 }}>Lv.{pokemon.level}</div>
      </div>
    </div>
  );
}
