// src/components/views/_mobile/MobileItemsView.jsx
import React, { useState } from 'react';
import { ChevronRight, X, Sparkles, ShoppingCart, Trash2, Search } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { getItemPocket, canUseItem, CATEGORIES, getItemIcon, getItemColor, filterItemsByPocket, POCKET_LABELS } from '../../../utils/itemUtils';

export default function MobileItemsView() {
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const getItemDetails = (item) => {
    if (!item || !item.name) {
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

    const pocket = getItemPocket(itemData || item);
    const category = item.category || itemData?.category || '';

    const description = itemData?.effect || 
                       itemData?.description || 
                       item.effect?.replace(/\n/g, ' ') || 
                       item.description || 
                       '유용한 아이템';

    const canUse = canUseItem(itemData || item);

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

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setActionMode('detail');
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
    const detailsA = getItemDetails(a);
    const detailsB = getItemDetails(b);
    const pocketA = detailsA?.pocket || 'misc';
    const pocketB = detailsB?.pocket || 'misc';
    
    if (pocketA !== pocketB) {
      return pocketA.localeCompare(pocketB);
    }
    
    return (a?.name || '').localeCompare(b?.name || '', 'ko');
  });

  return (
    <div className="pb-4">
      {/* 상단 정보 */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-3 mb-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-sm opacity-90">보유 금액</div>
            <div className="text-2xl font-bold">₩{(trainer.money || 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">총 아이템</div>
            <div className="text-2xl font-bold">{items.reduce((sum, item) => sum + item.count, 0)}개</div>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="아이템 검색..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 드롭다운 */}
      <div className="px-4 mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-3 text-base font-bold border-2 border-gray-300 rounded-lg bg-white focus:border-indigo-500 focus:outline-none appearance-none bg-no-repeat bg-right pr-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.5rem',
            backgroundPosition: 'right 0.75rem center'
          }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 아이템 리스트 */}
      <div className="px-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <p>{searchQuery ? '검색 결과가 없습니다' : '보유한 아이템이 없습니다'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item, i) => {
              const details = getItemDetails(item);
              const ItemIcon = getItemIcon(details.itemData || item);
              const itemColor = getItemColor(details.itemData || item);
              const pocketName = POCKET_LABELS[details.pocket] || '기타';
              
              return (
                <button
                  key={i}
                  onClick={() => handleItemClick(item)}
                  className="w-full bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all active:scale-98"
                >
                  <div className="flex items-center gap-4">
                    {/* 아이템 이미지 */}
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center p-2 relative">
                      {details.imageUrl ? (
                        <img 
                          src={details.imageUrl}
                          alt={details.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ display: details.imageUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                        <ItemIcon size={32} className="text-gray-300" />
                      </div>
                    </div>
                    
                    {/* 아이템 정보 */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-gray-800 truncate">{details.name}</div>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${itemColor}`}>
                          <ItemIcon size={12} />
                          {pocketName}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {details.description}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        {details.sellPrice > 0 && (
                          <div className="text-green-600 font-semibold">
                            판매 ₩{details.sellPrice.toLocaleString()}
                          </div>
                        )}
                        {details.canUse && (
                          <div className="text-purple-600 font-semibold">
                            ✨ 사용가능
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 개수 & 화살표 */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-2xl font-bold text-indigo-600">
                        {isSuperAdmin ? '∞' : `×${item.count}`}
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 아이템 상세/액션 모달 */}
      {selectedItem && actionMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
          {(() => {
            const details = getItemDetails(selectedItem);
            const ItemIcon = getItemIcon(details.itemData || selectedItem);
            const isDetail = actionMode === 'detail';
            const isUse = actionMode === 'use';
            const isSell = actionMode === 'sell';
            const isTrash = actionMode === 'trash';
            
            return (
              <>
                {/* 헤더 */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800">
                    {isDetail && '아이템 상세'}
                    {isUse && '포켓몬 선택'}
                    {isSell && '판매하기'}
                    {isTrash && '버리기'}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setActionMode(null);
                      setQuantity(1);
                      setSelectedPokemon(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={24} className="text-gray-600" />
                  </button>
                </div>

                {/* 내용 */}
                <div className="flex-1 overflow-y-auto bg-white p-4">
                  {isDetail && (
                    <>
                      {/* 아이템 정보 */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-24 h-24 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center justify-center p-3 relative">
                          {details.imageUrl ? (
                            <img 
                              src={details.imageUrl}
                              alt={details.name}
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: 'pixelated' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div style={{ display: details.imageUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                            <ItemIcon size={48} className="text-gray-300" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-800 mb-2">{details.name}</h4>
                          <div className="text-sm text-gray-600 mb-2">{details.description}</div>
                          <div className="text-3xl font-bold text-indigo-600">
                            보유: {isSuperAdmin ? '∞' : `${selectedItem.count}개`}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="space-y-2">
                        {details.canUse && (
                          <button
                            onClick={() => setActionMode('use')}
                            className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-purple-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                          >
                            <Sparkles size={20} />
                            사용하기
                          </button>
                        )}
                        {details.canSell && details.sellPrice > 0 && (
                          <button
                            onClick={() => {
                              setActionMode('sell');
                              setQuantity(1);
                            }}
                            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                          >
                            <ShoppingCart size={20} />
                            판매하기 (₩{details.sellPrice.toLocaleString()})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActionMode('trash');
                            setQuantity(1);
                          }}
                          className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={20} />
                          버리기
                        </button>
                      </div>
                    </>
                  )}

                  {isUse && (
                    <>
                      <p className="text-gray-700 mb-4 font-semibold">아이템을 사용할 포켓몬을 선택하세요</p>
                      
                      {caughtPokemon.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <div className="text-6xl mb-4">👾</div>
                          <p>보유한 포켓몬이 없습니다</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {caughtPokemon.filter(p => p !== null).map((pokemon) => (
                            <button
                              key={pokemon.uniqueId}
                              onClick={() => setSelectedPokemon(pokemon)}
                              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                selectedPokemon?.uniqueId === pokemon.uniqueId
                                  ? 'border-indigo-500 bg-indigo-50 scale-105'
                                  : 'border-gray-200 bg-white'
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
                              <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {(isSell || isTrash) && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {isSell ? '판매' : '버리기'} 개수
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.count}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
                        />
                        {isSell && details.sellPrice > 0 && (
                          <p className="text-lg text-green-600 font-bold mt-3">
                            총 판매 금액: ₩{(details.sellPrice * quantity).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 하단 버튼 */}
                {(isUse || isSell || isTrash) && (
                  <div className="bg-white border-t border-gray-200 p-4 flex gap-3">
                    <button
                      onClick={() => {
                        setActionMode('detail');
                        setQuantity(1);
                        setSelectedPokemon(null);
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-bold text-lg"
                    >
                      취소
                    </button>
                    <button
                      onClick={isUse ? handleUse : isSell ? handleSell : handleTrash}
                      disabled={isUse && !selectedPokemon}
                      className={`flex-1 py-4 rounded-lg font-bold text-lg transition-all ${
                        isUse
                          ? selectedPokemon
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isSell
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                      }`}
                    >
                      {isUse && '사용하기'}
                      {isSell && '판매하기'}
                      {isTrash && '버리기'}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}