import React, { useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';

export default function ItemsView({ items = [], allItems = [], isSuperAdmin = false, onSellItem, onTrashItem, trainer = {} }) {
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellCount, setSellCount] = useState(1);
  const [actionMode, setActionMode] = useState(null); // 'sell' | 'trash'

  // items.json에서 상세 정보 가져오기
  const getItemDetails = (item) => {
    const itemData = allItems.find(i => 
      i.id === item.itemId || 
      i.name === item.name || 
      i.nameEn?.toLowerCase().includes(item.name.toLowerCase())
    );
    
    return {
      name: item.name,
      description: itemData?.effect?.replace(/\n/g, ' ') || '유용한 아이템',
      imageUrl: item.imageUrl || itemData?.spriteUrl || '/images/items/default.png',
      cost: itemData?.cost || 0,
      sellPrice: itemData?.sellPrice || 0,
      category: itemData?.category || 'misc',
      canSell: itemData?.canSell ?? true
    };
  };

  // 카테고리 정의
  const categories = [
    { id: 'all', name: '전체', icon: '📦', color: 'bg-gray-100 text-gray-700' },
    { id: 'ball', name: '포획', icon: '⚾', color: 'bg-red-100 text-red-700' },
    { id: 'medicine', name: '회복', icon: '💊', color: 'bg-green-100 text-green-700' },
    { id: 'vitamin', name: '영양', icon: '💪', color: 'bg-purple-100 text-purple-700' },
    { id: 'berry', name: '나무열매', icon: '🍇', color: 'bg-pink-100 text-pink-700' },
    { id: 'battle', name: '배틀', icon: '⚔️', color: 'bg-orange-100 text-orange-700' },
    { id: 'key', name: '중요', icon: '🔑', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'misc', name: '기타', icon: '✨', color: 'bg-blue-100 text-blue-700' }
  ];

  // 카테고리별 색상
  const getCategoryColor = (category) => {
    if (category?.includes('ball')) return 'bg-red-50 border-red-200';
    if (category?.includes('medicine')) return 'bg-green-50 border-green-200';
    if (category?.includes('vitamin')) return 'bg-purple-50 border-purple-200';
    if (category?.includes('berry')) return 'bg-pink-50 border-pink-200';
    if (category?.includes('battle')) return 'bg-orange-50 border-orange-200';
    if (category?.includes('key')) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getCategoryBadge = (category) => {
    if (category?.includes('ball')) return { text: '포획', color: 'bg-red-100 text-red-700' };
    if (category?.includes('medicine')) return { text: '회복', color: 'bg-green-100 text-green-700' };
    if (category?.includes('vitamin')) return { text: '영양', color: 'bg-purple-100 text-purple-700' };
    if (category?.includes('berry')) return { text: '나무열매', color: 'bg-pink-100 text-pink-700' };
    if (category?.includes('battle')) return { text: '배틀', color: 'bg-orange-100 text-orange-700' };
    if (category?.includes('key')) return { text: '중요', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '기타', color: 'bg-gray-100 text-gray-700' };
  };

  // 카테고리별 필터링
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true;
    const details = getItemDetails(item);
    return details.category?.includes(selectedCategory);
  });

  // 판매 처리
  const handleSell = () => {
    if (!selectedItem || sellCount < 1) return;
    
    const details = getItemDetails(selectedItem);
    if (!details.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return;
    }
    
    if (sellCount > selectedItem.count) {
      alert('보유 수량보다 많이 판매할 수 없습니다!');
      return;
    }
    
    onSellItem(selectedItem, sellCount);
    setSelectedItem(null);
    setActionMode(null);
    setSellCount(1);
  };

  // 버리기 처리 (돈을 받지 않음)
  const handleTrash = () => {
    if (!selectedItem || sellCount < 1) return;
    
    if (sellCount > selectedItem.count) {
      alert('보유 수량보다 많이 버릴 수 없습니다!');
      return;
    }
    
    if (window.confirm(`${selectedItem.name} ${sellCount}개를 버리시겠습니까?`)) {
      // onTrashItem이 있으면 사용, 없으면 onSellItem에 특별한 플래그 전달
      if (onTrashItem) {
        onTrashItem(selectedItem, sellCount);
      } else {
        // sellPrice를 0으로 강제 설정한 임시 아이템 생성
        const trashItem = {
          ...selectedItem,
          _isTrash: true  // 버리기 플래그
        };
        onSellItem(trashItem, sellCount);
      }
      
      setSelectedItem(null);
      setActionMode(null);
      setSellCount(1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
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
              <span className="text-lg font-bold text-yellow-600">₽{(trainer.money || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-500">
              총 {items.reduce((sum, item) => sum + item.count, 0)}개
            </div>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? cat.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
        
        <div className="space-y-3">
          {filteredItems.map((item, i) => {
            const details = getItemDetails(item);
            const categoryColor = getCategoryColor(details.category);
            const badge = getCategoryBadge(details.category);
            
            return (
              <div 
                key={i} 
                className={`flex items-center justify-between rounded-lg p-5 border hover:shadow-md transition-all ${categoryColor}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* 아이템 이미지 */}
                  <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-center">
                    <img 
                      src={details.imageUrl}
                      alt={details.name}
                      className="w-15 h-15"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold text-lg text-gray-800">{details.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">{details.description}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {details.cost > 0 && (
                        <div className="text-xs text-gray-500">
                          💰 가격: ₽{details.cost.toLocaleString()}
                        </div>
                      )}
                      {details.canSell && details.sellPrice > 0 && (
                        <div className="text-xs text-green-600 font-semibold">
                          💵 판매가: ₽{details.sellPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-indigo-600">
                    {isSuperAdmin ? '∞' : `×${item.count}`}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {details.canSell && details.sellPrice > 0 && (
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setActionMode('sell');
                          setSellCount(1);
                        }}
                        className="text-gray-400 hover:text-green-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="판매"
                      >
                        <ShoppingCart size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setActionMode('trash');
                        setSellCount(1);
                      }}
                      className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="버리기"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🎒</div>
              <p>{selectedCategory === 'all' ? '보유한 아이템이 없습니다' : '해당 카테고리의 아이템이 없습니다'}</p>
            </div>
          )}
        </div>
      </div>

      {/* 판매/버리기 모달 */}
      {selectedItem && actionMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedItem(null);
            setActionMode(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const details = getItemDetails(selectedItem);
              const isSelling = actionMode === 'sell';
              
              return (
                <>
                  <h3 className="text-xl font-bold mb-4">
                    {isSelling ? '아이템 판매' : '아이템 버리기'}
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <img 
                      src={details.imageUrl} 
                      alt={details.name}
                      className="w-16 h-16"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{details.name}</h4>
                      <p className="text-sm text-gray-600">{details.description}</p>
                      <p className="text-sm text-gray-500 mt-1">보유: {selectedItem.count}개</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {isSelling ? '판매 수량' : '버릴 수량'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.count}
                      value={sellCount}
                      onChange={(e) => setSellCount(Math.max(1, Math.min(selectedItem.count, parseInt(e.target.value) || 1)))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center text-lg font-bold focus:border-green-500 focus:outline-none"
                    />
                  </div>

                  {isSelling ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-gray-700">총 판매 금액:</span>
                        <span className="text-green-600">₽{(details.sellPrice * sellCount).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-600 text-center">
                        ⚠️ 버린 아이템은 복구할 수 없습니다!
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setActionMode(null);
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
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
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}