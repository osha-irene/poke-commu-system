import useMediaQuery from '../../hooks/useMediaQuery';
import MobileItemsView from './_mobile/MobileItemsView';
import { getItemPocket, canUseItem, CATEGORIES } from '../../utils/itemUtils';
import { Package, Circle, Heart, Dumbbell, Apple, Disc, Backpack, Sparkles, Sword, Key, Search, X,Trash2, ShoppingCart } from 'lucide-react'; 
import React, { useState } from 'react';


import { useGame } from '../../contexts/GameContext';

function DesktopItemsView() {
  const {
    items = [],
    allItems = [],
    caughtPokemon = [],
    sellItem: onSellItem,
    useItemOnPokemon: onUseItem,
    currentUser: trainer,
  } = useGame();
  
  const isSuperAdmin = trainer?.isSuperAdmin || false;
  const onTrashItem = null;
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('category');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  // items.json에서 상세 정보 가져오기 (완전 수정)
  const getItemDetails = (item) => {
  if (!item || !item.name) {
    console.warn('⚠️ Invalid item:', item);
    return {
      name: '알 수 없는 아이템',
      description: '아이템 정보가 없습니다',
      imageUrl: '/images/items/default.png',
      cost: 0,
      sellPrice: 0,
      pocket: 'misc',
      category: 'misc',
      canSell: true,
      canUse: false
    };
  }

  let itemData = null;
  if (item.itemId) {
    itemData = allItems.find(i => i.id === item.itemId);
  }
  
  if (!itemData) {
    itemData = allItems.find(i => 
      i.name === item.name || 
      i.nameEn === item.name ||
      i.id === item.name
    );
  }

  // ✅ 이 줄만 수정!
  const pocket = getItemPocket(itemData) || getItemPocket(item) || 'misc';
  
  const category = item.category || itemData?.category || '';

  const description = itemData?.effect || 
                     itemData?.description || 
                     item.effect?.replace(/\n/g, ' ') || 
                     item.description || 
                     '유용한 아이템';

  const canUse = item.canUse !== undefined ? item.canUse : canUseItem(itemData || item);

  return {
    name: item.name,
    description: description,
    imageUrl: item.imageUrl || itemData?.spriteUrl || itemData?.imageUrl || '/images/items/default.png',
    cost: itemData?.cost ?? item.cost ?? 0,
    sellPrice: itemData?.sellPrice ?? item.sellPrice ?? 0,
    pocket: pocket,
    category: category,
    canSell: item.canSell !== undefined ? item.canSell : (itemData?.canSell ?? true),
    canUse: canUse,
    specialEffect: item.specialEffect || itemData?.specialEffect || null,
    ivBoost: item.ivBoost || itemData?.ivBoost,
    evBoost: item.evBoost || itemData?.evBoost,
    friendshipBoost: item.friendshipBoost || itemData?.friendshipBoost,
    conditionBoost: item.conditionBoost || itemData?.conditionBoost,
    itemData: itemData
  };
};

const getPocketColor = (pocket) => {
  const colors = {
    'pokeballs': 'bg-red-50 border-red-200',
    'medicine': 'bg-green-50 border-green-200',
    'vitamins': 'bg-purple-50 border-purple-200',
    'berries': 'bg-pink-50 border-pink-200',
    'machines': 'bg-blue-50 border-blue-200',
    'held-items': 'bg-orange-50 border-orange-200',
    'evolution': 'bg-yellow-50 border-yellow-200',
    'battle-items': 'bg-red-50 border-red-200',
    'key-items': 'bg-indigo-50 border-indigo-200'
  };
  return colors[pocket] || 'bg-gray-50 border-gray-200';
};

const getPocketBadge = (pocket) => {
  const badges = {
    'pokeballs': { text: '포획', color: 'bg-red-100 text-red-700' },
    'medicine': { text: '회복', color: 'bg-green-100 text-green-700' },
    'vitamins': { text: '영양', color: 'bg-purple-100 text-purple-700' },
    'berries': { text: '나무열매', color: 'bg-pink-100 text-pink-700' },
    'machines': { text: '기술머신', color: 'bg-blue-100 text-blue-700' },
    'held-items': { text: '도구', color: 'bg-orange-100 text-orange-700' },
    'evolution': { text: '진화', color: 'bg-yellow-100 text-yellow-700' },
    'battle-items': { text: '배틀', color: 'bg-red-100 text-red-700' },
    'key-items': { text: '중요', color: 'bg-indigo-100 text-indigo-700' }
  };
  return badges[pocket] || { text: '기타', color: 'bg-gray-100 text-gray-700' };
};


  const categoryIcons = {
  'all': Package,
  'pokeballs': Circle,
  'medicine': Heart,
  'vitamins': Dumbbell,
  'berries': Apple,
  'machines': Disc,
  'held-items': Backpack,
  'evolution': Sparkles,
  'battle-items': Sword,
  'key-items': Key,
  'misc': Package
};

const categories = CATEGORIES.map(cat => {
  const colorMap = {
    'all': 'bg-gray-100 text-gray-700',
    'pokeballs': 'bg-red-100 text-red-700',
    'medicine': 'bg-green-100 text-green-700',
    'vitamins': 'bg-purple-100 text-purple-700',
    'berries': 'bg-pink-100 text-pink-700',
    'machines': 'bg-blue-100 text-blue-700',
    'held-items': 'bg-orange-100 text-orange-700',
    'evolution': 'bg-yellow-100 text-yellow-700',
    'battle-items': 'bg-red-100 text-red-700',
    'key-items': 'bg-indigo-100 text-indigo-700',
    'misc': 'bg-gray-100 text-gray-700'
  };
  
  return {
    ...cat,
    Icon: categoryIcons[cat.id] || Package,
    color: colorMap[cat.id] || 'bg-gray-100 text-gray-700'
  };
});

  const handleItemClick = (item) => {
    const details = getItemDetails(item);
    
    if (!details.canUse) {
      alert('이 아이템은 사용할 수 없습니다.');
      return;
    }
    
    setSelectedItem(item);
    setActionMode('use');
    setQuantity(1);
  };

  const handleUse = () => {
    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    if (onUseItem && selectedItem) {
      onUseItem(selectedItem, selectedPokemon);
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
      setSelectedPokemon(null);
    } else {
      alert('아이템 사용 기능이 연결되지 않았습니다.');
    }
  };

  const handleSell = () => {
    if (!selectedItem || quantity < 1) return;
    
    const details = getItemDetails(selectedItem);
    if (!details.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return;
    }
    
    if (quantity > selectedItem.count) {
      alert('보유 수량보다 많이 판매할 수 없습니다!');
      return;
    }
    
    if (onSellItem) {
      onSellItem(selectedItem, quantity);
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
    }
  };

  const handleTrash = () => {
    if (!selectedItem || quantity < 1) return;
    
    if (quantity > selectedItem.count) {
      alert('보유 수량보다 많이 버릴 수 없습니다!');
      return;
    }
    
    if (window.confirm(`${selectedItem.name} ${quantity}개를 버리시겠습니까?`)) {
      if (onTrashItem) {
        onTrashItem(selectedItem, quantity);
      } else if (onSellItem) {
        const trashItem = { ...selectedItem, _isTrash: true };
        onSellItem(trashItem, quantity);
      }
      
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
    }
  };

  let filteredItems = items.filter(item => {
    if (selectedCategory !== 'all') {
      const details = getItemDetails(item);
      if (details.pocket !== selectedCategory) {
        return false;
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query);
    }
    
    return true;
  });

  filteredItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'category') {
      const detailsA = getItemDetails(a);
      const detailsB = getItemDetails(b);
      const pocketA = detailsA?.pocket || 'misc';
      const pocketB = detailsB?.pocket || 'misc';
      
      if (pocketA !== pocketB) {
        return pocketA.localeCompare(pocketB);
      }
      
      return (a?.name || '').localeCompare(b?.name || '', 'ko');
    } else {
      return (a?.name || '').localeCompare(b?.name || '', 'ko');
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">보유 아이템</h3>
            {isSuperAdmin && (
              <p className="text-sm text-yellow-600 font-semibold mt-1">
                ⭐ 슈퍼 관리자: 아이템 무한 사용 가능
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold text-yellow-700">💰 보유 금액: </span>
              <span className="text-lg font-bold text-yellow-600">{(trainer.money || 0).toLocaleString()}원</span>
            </div>
            <div className="text-sm text-gray-500">
              총 {items.reduce((sum, item) => sum + item.count, 0)}개
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="아이템 검색..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="category">카테고리순</option>
            <option value="name">ㄱㄴㄷ순</option>
          </select>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? cat.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? '검색 결과가 없습니다' : '보유한 아이템이 없습니다'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item, i) => {
              const details = getItemDetails(item);
              const pocketColor = getPocketColor(details.pocket);
              const badge = getPocketBadge(details.pocket);
              
              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full h-32 flex items-start gap-4 rounded-lg p-4 border-2 transition-all text-left ${pocketColor} ${
                      details.canUse ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'
                    }`}
                  >
                    <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-base text-gray-800 truncate">{details.name}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {details.description}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {details.cost > 0 && (
                            <div className="text-xs text-gray-500">
                              💰 {details.cost.toLocaleString()}원
                            </div>
                          )}
                          {details.canSell && details.sellPrice > 0 && (
                            <div className="text-xs text-green-600 font-semibold">
                              💵 {details.sellPrice.toLocaleString()}원
                            </div>
                          )}
                        </div>
                        
                        <div className="text-2xl font-bold text-indigo-600">
                          {isSuperAdmin ? '∞' : `×${item.count}`}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  <div className="absolute top-2 right-2 flex gap-1">
                    {details.canSell && details.sellPrice > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setActionMode('sell');
                          setQuantity(1);
                        }}
                        className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        title="판매"
                      >
                        <ShoppingCart size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setActionMode('trash');
                        setQuantity(1);
                      }}
                      className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      title="버리기"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem && actionMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedItem(null);
            setActionMode(null);
            setQuantity(1);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const details = getItemDetails(selectedItem);
              const isSelling = actionMode === 'sell';
              const isUsing = actionMode === 'use';
              
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{details.name}</h3>
                      <p className="text-sm text-gray-600">보유: {selectedItem.count}개</p>
                    </div>
                  </div>

                  {isUsing ? (
                    <>
                      <p className="text-gray-700 mb-3">아이템을 사용할 포켓몬을 선택하세요</p>
                      
                      <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-3">
                        {caughtPokemon.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            보유한 포켓몬이 없습니다
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {caughtPokemon.filter(p => p !== null).map((pokemon) => (
                              <button
                                key={pokemon.uniqueId}
                                onClick={() => setSelectedPokemon(pokemon)}
                                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                  selectedPokemon?.uniqueId === pokemon.uniqueId
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                                }`}
                              >
                                <img
                                  src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                                  alt={pokemon.name}
                                  className="w-16 h-16 mb-1"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                                <div className="text-xs font-bold text-gray-800 truncate w-full text-center">
                                  {pokemon.nickname || pokemon.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Lv.{pokemon.level}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(null);
                            setActionMode(null);
                            setSelectedPokemon(null);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleUse}
                          disabled={!selectedPokemon}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                            selectedPokemon
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles size={18} />
                          사용하기
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {isSelling ? '판매' : '버리기'} 개수
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.count}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                        />
                        {isSelling && details.sellPrice > 0 && (
                          <p className="text-sm text-green-600 font-semibold mt-2">
                            총 판매 금액: {(details.sellPrice * quantity).toLocaleString()}원
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(null);
                            setActionMode(null);
                            setQuantity(1);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={isSelling ? handleSell : handleTrash}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                            isSelling 
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isSelling ? '판매하기' : '버리기'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemsView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return isMobile ? <MobileItemsView /> : <DesktopItemsView />;
}