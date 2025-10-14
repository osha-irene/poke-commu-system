import React, { useState } from 'react';
import { ShoppingCart, Clock, Star, Coins, Sparkles } from 'lucide-react';

export default function ShopView({ 
  trainer,
  allItems = [],
  shopData = {},
  onPurchase 
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  // 오늘 요일 구하기
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesKo = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const todayName = dayNames[today.getDay()];
  const todayNameKo = dayNamesKo[today.getDay()];
  
  // 오늘의 상품
  const dailyItems = shopData.dailyItems?.[todayName] || [];
  const permanentItems = shopData.permanentItems || [];
  const rareItem = shopData.rareDailyItem || null;
  
  // 아이템 상세 정보 가져오기
  const getItemDetails = (shopItem) => {
    const item = allItems.find(i => i.id === shopItem.itemId);
    return {
      ...item,
      ...shopItem
    };
  };
  
	// 구매 처리
	const handlePurchase = () => {
	  if (!selectedItem) return;
	  
	  const totalPrice = selectedItem.price * quantity;
	  
	  if (trainer.money < totalPrice) {
		alert('💰 돈이 부족합니다!');
		return;
	  }
	  
	  if (selectedItem.stock !== 99 && selectedItem.stock < quantity) {
		alert(`📦 재고가 부족합니다! (남은 재고: ${selectedItem.stock}개)`);
		return;
	  }
	  
	  // ✅ 수정: 전체 아이템 객체를 전달하되, cost 필드 추가
	  const itemToSend = {
		...selectedItem,
		cost: selectedItem.price  // ✅ price를 cost로 매핑
	  };
	  
	  onPurchase(itemToSend, quantity);
	  setSelectedItem(null);
	  setQuantity(1);
	};
  
  // 아이템 카드 렌더링
  const renderItemCard = (shopItem, isRare = false) => {
    const item = getItemDetails(shopItem);
    if (!item) return null;
    
    const isSelected = selectedItem?.itemId === shopItem.itemId;
    
    return (
      <button
        key={`${shopItem.itemId}-${isRare ? 'rare' : 'normal'}`}
        onClick={() => {
          setSelectedItem(item);
          setQuantity(1);
        }}
        className={`relative border-2 rounded-lg p-4 transition-all ${
          isSelected
            ? 'border-yellow-500 bg-yellow-50 shadow-lg scale-105'
            : isRare
            ? 'border-purple-400 bg-purple-50 hover:border-purple-500 hover:shadow-md'
            : 'border-gray-300 bg-white hover:border-indigo-400 hover:shadow-md'
        }`}
      >
        {isRare && (
          <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Star size={12} fill="white" />
            희귀
          </div>
        )}
        
        <div className="flex items-center gap-3 mb-2">
          <img 
            src={item.spriteUrl} 
            alt={item.name}
            className="w-16 h-16"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="flex-1 text-left">
            <div className="font-bold text-lg">{item.name}</div>
            <div className="text-sm text-gray-600 line-clamp-2">{item.effect?.replace(/\n/g, ' ')}</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 text-yellow-600 font-bold text-lg">
            <Coins size={18} />
            ₽{shopItem.price.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {shopItem.stock === 99 ? '재고 무제한' : `재고 ${shopItem.stock}개`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <ShoppingCart size={32} />
              포켓몬 상점
            </h1>
            <p className="text-indigo-100">필요한 아이템을 구매하세요!</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-indigo-200 mb-1">보유 금액</div>
            <div className="text-4xl font-bold flex items-center gap-2">
              <Coins size={32} />
              ₽{trainer.money?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘의 희귀 아이템 (맨 위에 강조) */}
      {rareItem && rareItem.itemId && (
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg border-2 border-purple-400 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-600 text-white p-3 rounded-full">
              <Star size={24} fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-purple-900">오늘의 희귀 아이템</h2>
                <Sparkles size={20} className="text-purple-600" />
              </div>
              <p className="text-sm text-purple-700">매일 자정 새로운 희귀 아이템으로 갱신됩니다!</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 max-w-md">
            {renderItemCard(rareItem, true)}
          </div>
        </div>
      )}

      {/* 오늘의 상품 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-indigo-200">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">오늘의 특별 상품</h2>
            <p className="text-sm text-gray-600">{todayNameKo} 한정 할인 아이템</p>
          </div>
        </div>
        
        {dailyItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">오늘은 특별 상품이 없습니다!</p>
            <p className="text-sm mt-2">내일 다시 확인해보세요 ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {dailyItems.map(item => renderItemCard(item))}
          </div>
        )}
      </div>

      {/* 상시 판매 아이템 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
          <div className="bg-gray-100 text-gray-600 p-2 rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">상시 판매</h2>
            <p className="text-sm text-gray-600">언제나 구매 가능한 기본 아이템</p>
          </div>
        </div>
        
        {permanentItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
            <p>상시 판매 아이템이 없습니다!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {permanentItems.map(item => renderItemCard(item))}
          </div>
        )}
      </div>

      {/* 구매 패널 (하단 고정) */}
      {selectedItem && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-indigo-600 shadow-2xl p-6 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              <img 
                src={selectedItem.spriteUrl} 
                alt={selectedItem.name}
                className="w-24 h-24"
                style={{ imageRendering: 'pixelated' }}
              />
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">{selectedItem.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{selectedItem.effect?.replace(/\n/g, ' ')}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-yellow-600 font-bold text-xl">
                    <Coins size={20} />
                    ₽{selectedItem.price.toLocaleString()} × {quantity}
                  </div>
                  <div className="text-2xl font-bold text-indigo-600">
                    = ₽{(selectedItem.price * quantity).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">수량</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.stock === 99 ? 999 : selectedItem.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 border-2 border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={handlePurchase}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 font-bold text-lg shadow-lg transition-all hover:scale-105"
                >
                  구매하기
                </button>
                
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-gray-200 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}