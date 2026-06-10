// src/components/views/pokemon/detail-tabs/InfoTab.jsx
// 기본 정보 탭 (레벨, 타입, 크기, 특성)

import React from 'react';
import { Ruler, Star, Sparkles, Heart, Edit2, Check, X } from 'lucide-react';
import AbilityTooltip from '../AbilityTooltip';
import { getTypeColor, POKEBALL_LIST } from '../../../../styles/theme';

// 헬퍼 함수들
const getGenderIcon = (gender) => {
  if (gender === 'male') return '\u2642';
  if (gender === 'female') return '\u2640';
  return null;
};

const getGenderColor = (gender) => {
  if (gender === 'male') return 'text-blue-600';
  if (gender === 'female') return 'text-pink-600';
  return 'text-gray-400';
};

const getSizeColor = (rank) => {
  const colors = {
    'XXXS': 'text-purple-700 font-extrabold',
    'XXS': 'text-purple-600 font-bold',
    'XS': 'text-blue-600',
    'M': 'text-gray-600',
    'XL': 'text-orange-600',
    'XXL': 'text-red-600 font-bold',
    'XXXL': 'text-red-700 font-extrabold'
  };
  return colors[rank] || 'text-gray-600';
};

const getSizeRarity = (rank) => {
  const rarities = {
    'XXXS': { icon: Sparkles, text: '극희귀', color: 'text-purple-600' },
    'XXXL': { icon: Sparkles, text: '극희귀', color: 'text-purple-600' },
    'XXS': { icon: Star, text: '희귀', color: 'text-yellow-600' },
    'XXL': { icon: Star, text: '희귀', color: 'text-yellow-600' },
    'XS': { icon: null, text: '레어', color: 'text-blue-600' },
    'XL': { icon: null, text: '레어', color: 'text-orange-600' }
  };
  return rarities[rank] || { icon: null, text: '일반', color: 'text-gray-500' };
};

export default function InfoTab({
  pokemon,
  gamePokedex,
  allItems,
  isEditingNickname,
  nickname,
  setNickname,
  setIsEditingNickname,
  onSaveNickname,
  onCancelEdit,
  isPartner
}) {
  // 타입 색상
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;
  
  // 도감 번호
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;
  
  // 포켓볼 이미지
  const getBallImage = () => {
    if (pokemon.caughtWithBall && allItems?.length > 0) {
      const pokeballItem = allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const ballName = pokemon.caughtWithBall.toLowerCase();
        return itemName === ballName || 
               itemNameEn === ballName ||
               itemName?.includes(ballName) ||
               itemNameEn?.includes(ballName);
      });
      if (pokeballItem) {
        return pokeballItem.spriteUrl || pokeballItem.imageUrl;
      }
    }
    
    if (pokemon.caughtWithBall) {
      const ballInfo = POKEBALL_LIST.find(ball => 
        ball.name === pokemon.caughtWithBall || 
        ball.nameEn === pokemon.caughtWithBall.toLowerCase()
      );
      if (ballInfo) {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballInfo.nameEn}.png`;
      }
    }
    
    if (pokemon.ballImageUrl) {
      return pokemon.ballImageUrl;
    }
    
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  };
  
  const ballImage = getBallImage();
  const rarity = getSizeRarity(pokemon.sizeRank);
  const RarityIcon = rarity.icon;

  return (
    <div className="space-y-4">
      {/* 기본 정보 헤더 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-gray-200 px-2 py-1 rounded font-semibold">
          No.{displayNumber.toString().padStart(3, '0')}
        </span>
        <span 
          className="text-xs px-2 py-1 rounded font-bold shadow-sm"
          style={{ backgroundColor: typeColors.bg, color: typeColors.text }}
        >
          {pokemon.type}
        </span>
        {pokemon.type2 && (
          <span 
            className="text-xs px-2 py-1 rounded font-bold shadow-sm"
            style={{ backgroundColor: type2Colors.bg, color: type2Colors.text }}
          >
            {pokemon.type2}
          </span>
        )}
        <span className="text-xs text-gray-500">{pokemon.name}</span>
      </div>
      
      {/* 닉네임 & 레벨 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        {isEditingNickname ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              className="text-xl font-bold border-b-2 border-indigo-500 focus:outline-none bg-transparent"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && onSaveNickname()}
            />
            <button onClick={onSaveNickname} className="text-green-600 hover:text-green-700">
              <Check size={18} />
            </button>
            <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            {ballImage && (
              <div 
                className="item-sprite"
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundImage: `url(${ballImage})`,
                  backgroundSize: '110%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}
            <h3 className="text-xl font-bold text-gray-800">{nickname}</h3>
            
            {(pokemon.gender === 'male' || pokemon.gender === 'female') && (
              <span className={`text-xl font-bold ${getGenderColor(pokemon.gender)}`}>
                {getGenderIcon(pokemon.gender)}
              </span>
            )}
            
            {pokemon.isShiny && (
              <Sparkles className="text-yellow-500 animate-pulse" size={18} />
            )}
            
            {isPartner && (
              <span className="bg-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <Heart size={10} fill="currentColor" />
                파트너
              </span>
            )}
            
            <button 
              onClick={() => setIsEditingNickname(true)} 
              className="text-gray-400 hover:text-gray-600 ml-1"
            >
              <Edit2 size={14} />
            </button>
          </div>
        )}
        
        <div className="text-lg text-indigo-600 font-semibold">Lv. {pokemon.level}</div>
      </div>
      
      {/* 크기 & 특성 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 크기 정보 */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-1 mb-2">
            <Ruler size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">크기</span>
          </div>
          
          {pokemon.sizeRank ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${getSizeColor(pokemon.sizeRank)}`}>
                  {pokemon.sizeRank}
                </span>
                <span className={`text-xs flex items-center gap-1 ${rarity.color}`}>
                  {RarityIcon && <RarityIcon size={10} />}
                  {rarity.text}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400">크기 정보 없음</div>
          )}
        </div>
        
        {/* 특성 정보 */}
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-1 mb-2">
            <Star size={14} className="text-purple-500" />
            <span className="text-xs font-semibold text-gray-700">특성</span>
          </div>
          
          {pokemon.ability ? (
            <AbilityTooltip 
              abilityName={pokemon.ability} 
              isHidden={pokemon.isHiddenAbility}
              size="md"
              showIcon={true}
              fetchKorean={true}
            />
          ) : (
            <div className="text-sm text-gray-400">특성 정보 없음</div>
          )}
        </div>
      </div>
      
      {/* 친밀도 */}
      <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
        <div className="flex items-center gap-1 mb-2">
          <Heart size={14} className="text-pink-500" />
          <span className="text-xs font-semibold text-gray-700">친밀도</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div 
            className="bg-gradient-to-r from-pink-400 to-pink-600 h-2.5 rounded-full transition-all" 
            style={{ width: `${((pokemon.friendship || 0) / 255) * 100}%` }} 
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>{pokemon.friendship || 0} / 255</span>
          <span>{Math.round(((pokemon.friendship || 0) / 255) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
