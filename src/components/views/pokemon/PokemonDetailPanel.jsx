import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Heart, X, Edit2, Check } from 'lucide-react';

// 이미지 URL 생성 헬퍼
const getPokemonSpriteUrl = (number) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
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

export default function PokemonDetailPanel({ 
  pokemon, 
  hasRareCandy,
  rareCandyImage,
  isInParty,
  allItems = [],
  gamePokedex,
  items = [],        // ⭐ 추가
  onClose,
  onUseCandy,
  onMove,
  onRelease,
  onUpdateNickname,
  onGiveItem,        // ⭐ 추가
  onTakeItem         // ⭐ 추가
}) {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname || pokemon.name);
  
  // 게임 도감에서 이 포켓몬의 newNumber 찾기
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;
  const originalNumber = pokedexEntry?.originalNumber || pokemon.number;
  
  // 지니고 있는 도구 정보 찾기 (더 유연한 검색)
  const heldItemData = pokemon.heldItem 
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const heldItemName = pokemon.heldItem?.toLowerCase();
        
        return itemName === heldItemName || 
               itemNameEn === heldItemName ||
               itemName?.includes(heldItemName) ||
               itemNameEn?.includes(heldItemName);
      })
    : null;
  
  // 디버깅 로그
  if (pokemon.heldItem && !heldItemData) {
    console.log('=== 도구 찾기 실패 ===');
    console.log('찾으려는 도구:', pokemon.heldItem);
    console.log('전체 아이템 목록:', allItems.map(i => ({ name: i.name, nameEn: i.nameEn })));
    console.log('==================');
  }
  
  // pokemon이 변경될 때마다 nickname 동기화
  useEffect(() => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
  }, [pokemon.uniqueId, pokemon.nickname, pokemon.name]);
  
  const hpPercent = Math.max(0, (pokemon.hp / pokemon.maxHp) * 100);
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#777', text: '#FFF' };
  const type2Colors = pokemon.type2 ? (TYPE_COLORS[pokemon.type2] || { bg: '#777', text: '#FFF' }) : null;

  const handleSaveNickname = () => {
    if (nickname.trim()) {
      onUpdateNickname(pokemon.uniqueId, nickname.trim());
      setIsEditingNickname(false);
    }
  };

  const handleCancelEdit = () => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* 왼쪽 이미지 + 오른쪽 전체 정보 */}
      <div className="flex gap-6">
        {/* 포켓몬 이미지 (75% 크기 + 여백) */}
        <div className="flex-shrink-0">
          <div 
            className="w-36 h-36 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg"
            style={{
              backgroundImage: `url(${pokemon.spriteUrl || getPokemonSpriteUrl(originalNumber)})`,
              backgroundSize: '75%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* 오른쪽: 모든 정보 */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                No.{displayNumber.toString().padStart(3, '0')}
              </span>
    
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
                    backgroundColor: type2Colors.bg,
                    color: type2Colors.text
                  }}
                >
                  {pokemon.type2}
                </span>
              )}
              <span className="text-xs text-gray-500">{pokemon.name}</span>
            </div>
            
            {/* 별명 편집 */}
            {isEditingNickname ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="text-2xl font-bold border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveNickname()}
                />
                <button
                  onClick={handleSaveNickname}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{nickname}</h2>
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            
            <div className="text-lg text-gray-600">Lv. {pokemon.level}</div>
          </div>

          {/* HP 바 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">HP</span>
              <span className="text-sm text-gray-600">{pokemon.hp}/{pokemon.maxHp}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>

          {/* 지니고 있는 도구 + 친밀도 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
  <div className="flex items-center justify-between mb-2">
    <div className="text-xs text-gray-600">지니고 있는 도구</div>
    {pokemon.heldItem && (
      <button
        onClick={() => onTakeItem(pokemon.uniqueId)}
        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
      >
        회수
      </button>
    )}
  </div>
  
  {heldItemData ? (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-6 h-6 flex-shrink-0"
          style={{
            backgroundImage: `url(${heldItemData.spriteUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            imageRendering: 'pixelated'
          }}
        />
        <div className="text-sm font-bold text-blue-600 truncate">
          {heldItemData.name}
        </div>
      </div>
      <div className="text-xs text-gray-600 leading-tight">
        {heldItemData.effect || '효과 정보 없음'}
      </div>
    </div>
  ) : pokemon.heldItem ? (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-lg">🎒</div>
        <div className="text-sm font-bold text-blue-600 truncate">
          {pokemon.heldItem}
        </div>
      </div>
      <div className="text-xs text-gray-400 italic">
        정보 없음
      </div>
    </div>
  ) : (
    <div>
      <select
        onChange={(e) => {
          if (e.target.value) {
            onGiveItem(pokemon.uniqueId, e.target.value);
            e.target.value = '';
          }
        }}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
      >
        <option value="">아이템 선택...</option>
        {items.map((item, idx) => (
          <option key={idx} value={item.name}>
            {item.name} (×{item.count})
          </option>
        ))}
      </select>
    </div>
  )}
</div>

            <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
              <div className="flex items-center gap-1 mb-2">
                <Heart size={12} className="text-pink-500" />
                <span className="text-xs font-semibold text-gray-700">친밀도</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all" 
                  style={{ width: `${((pokemon.friendship || 0) / 255) * 100}%` }} 
                />
              </div>
              <div className="text-xs text-gray-600 text-right">
                {pokemon.friendship || 0}/255
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            <button
              onClick={onUseCandy}
              disabled={!hasRareCandy}
              className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                hasRareCandy
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              {rareCandyImage ? (
                <div 
                  className="w-5 h-5"
                  style={{
                    backgroundImage: `url(${rareCandyImage})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
              ) : (
                <span>🍬</span>
              )}
              <span>이상한사탕 사용</span>
            </button>
            <button
              onClick={onMove}
              className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2 border border-indigo-300"
            >
              {isInParty ? (
                <>
                  <ArrowDownCircle size={18} />
                  <span>박스로 이동</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle size={18} />
                  <span>엔트리로 이동</span>
                </>
              )}
            </button>

            <button
              onClick={onRelease}
              className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
            >
              <Trash2 size={18} />
              <span>포켓몬 방생</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}