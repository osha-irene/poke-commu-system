import React, { useState } from 'react';
import { ShoppingCart, Clock, Star, Coins, Sparkles, Calendar, Package, Zap } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getItemPocket } from '../../utils/itemUtils';
import RandomBoxShop from './RandomBoxShop';

export default function ShopView() {
  const {
    currentUser: trainer,
    updateCurrentUser,
    allItems = [],
    shopData = {},
    handlePurchase: onPurchase
  } = useGame();

  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [filterType, setFilterType] = useState('all');
  
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesKo = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const todayName = dayNames[today.getDay()];
  const todayNameKo = dayNamesKo[today.getDay()];
  
  const getWeekKey = (date) => {
    const d = new Date(date);
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNum}`;
  };
  
  const currentWeek = getWeekKey(today);
  
  const getAllShopItems = () => {
    const items = [];
    
    if (shopData.rareDailyItem?.itemId) {
      items.push({
        ...shopData.rareDailyItem,
        type: 'rare'
      });
    }
    
    const dailyItems = shopData.dailyItems?.[todayName] || [];
    dailyItems.forEach(item => {
      items.push({
        ...item,
        type: 'daily'
      });
    });
    
    const permanentItems = shopData.permanentItems || [];
    permanentItems.forEach(item => {
      items.push({
        ...item,
        type: 'permanent'
      });
    });
    
    return items;
  };
  
  const filteredItems = () => {
    const items = getAllShopItems();
    const withoutRare = items.filter(item => item.type !== 'rare');
    if (filterType === 'all') return withoutRare;
    return withoutRare.filter(item => item.type === filterType);
  };
  
  const getItemDetails = (shopItem) => {
    const item = allItems.find(i => i.id === shopItem.itemId);
    return {
      ...item,
      ...shopItem,
      pocket: getItemPocket(item || shopItem)
    };
  };
  
  const getWeeklyPurchasedAmount = (itemId, dayName) => {
    const purchaseHistory = trainer?.weeklyPurchaseHistory || {};
    const weekData = purchaseHistory[currentWeek] || {};
    const dayData = weekData[dayName] || {};
    return dayData[itemId] || 0;
  };
  
  const handlePurchase = () => {
    if (!selectedItem) return;
    
    const totalPrice = selectedItem.price * quantity;
    
    if (trainer.money < totalPrice) {
      alert('돈이 부족합니다!');
      return;
    }
    
    if (selectedItem.type === 'rare') {
      const purchaseHistory = trainer?.purchaseHistory || {};
      const todayDate = new Date().toISOString().split('T')[0];
      const todayPurchases = purchaseHistory[todayDate] || {};
      const alreadyPurchased = (todayPurchases[selectedItem.itemId] || 0) >= 1;
      
      if (alreadyPurchased) {
        alert('희귀 아이템은 하루에 1개만 구매할 수 있습니다!');
        return;
      }
    }
    
    if (selectedItem.type === 'daily') {
      const weeklyPurchased = getWeeklyPurchasedAmount(selectedItem.itemId, todayName);
      const remainingStock = selectedItem.stock - weeklyPurchased;
      
      if (remainingStock < quantity) {
        alert(`이번 주 재고가 부족합니다! (남은 재고: ${remainingStock}개)`);
        return;
      }
    }
    
    if (selectedItem.type === 'permanent' && selectedItem.stock !== 99 && selectedItem.stock < quantity) {
      alert(`재고가 부족합니다! (남은 재고: ${selectedItem.stock}개)`);
      return;
    }
    
    const itemToSend = {
      ...selectedItem,
      cost: selectedItem.price,
      itemId: selectedItem.itemId,
      weekKey: selectedItem.type === 'daily' ? currentWeek : undefined,
      dayName: selectedItem.type === 'daily' ? todayName : undefined
    };
    
    onPurchase(itemToSend, quantity);
    setSelectedItem(null);
    setQuantity(1);
  };

  const buyRandomBox = (box, result) => {
    const newMoney = trainer.money - box.price;
    
    const existingItem = trainer.inventory.find(
      i => i.itemId === result.itemId || i.name === result.name
    );
    
    const itemData = allItems.find(i => i.id === result.itemId);
    
    const newInventory = existingItem
      ? trainer.inventory.map(i =>
          (i.itemId === result.itemId || i.name === result.name)
            ? { ...i, count: i.count + result.count }
            : i
        )
      : [
          ...trainer.inventory,
          {
            itemId: result.itemId,
            name: result.name,
            nameEn: itemData?.nameEn,
            count: result.count,
            imageUrl: itemData?.spriteUrl || itemData?.imageUrl,
            cost: itemData?.cost || 0,
            sellPrice: itemData?.sellPrice || 0,
            category: itemData?.category,
            pocket: itemData?.pocket
          }
        ];
    
    updateCurrentUser({
      money: newMoney,
      inventory: newInventory
    });
    
    console.log(`${box.name} 구매 완료! ${result.name} x${result.count} 획득`);
  };

  const renderItemCard = (shopItem) => {
    const item = getItemDetails(shopItem);
    if (!item) return null;
    
    const isSelected = selectedItem?.itemId === shopItem.itemId;
    
    let isSoldOut = false;
    let remainingStock = shopItem.stock;

    if (shopItem.type === 'daily' || shopItem.type === 'permanent') {
      isSoldOut = shopItem.stock !== 99 && shopItem.stock <= 0;
      remainingStock = shopItem.stock;
    }

    const typeStyles = {
      rare: {
        label: '오늘의 희귀',
        labelBg: 'bg-purple-600',
        border: 'border-purple-300',
        bg: 'bg-purple-50',
        icon: Star
      },
      daily: {
        label: `${todayNameKo} 한정`,
        labelBg: 'bg-blue-600',
        border: 'border-blue-300',
        bg: 'bg-blue-50',
        icon: Calendar
      },
      permanent: {
        label: '상시 판매',
        labelBg: 'bg-green-600',
        border: 'border-green-300',
        bg: 'bg-green-50',
        icon: Package
      }
    };
    
    const style = typeStyles[shopItem.type];
    const Icon = style.icon;
    
    return (
      <button
        key={`${shopItem.itemId}-${shopItem.type}`}
        onClick={() => {
          if (isSoldOut) return;
          setSelectedItem({
            ...item,
            type: shopItem.type
          });
          setQuantity(1);
        }}
        disabled={isSoldOut}
        className={`relative border-2 rounded-lg overflow-hidden transition-all ${
          isSoldOut 
            ? 'opacity-50 cursor-not-allowed grayscale border-gray-300 bg-gray-100'
            : isSelected
              ? 'border-yellow-400 shadow-lg scale-105 bg-white'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-102 bg-white'
        }`}
      >
        {isSoldOut && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg transform rotate-12 shadow-xl">
              {shopItem.type === 'daily' ? '이번 주 품절' : '품절'}
            </div>
          </div>
        )}
        
        <div className={`absolute -top-0 left-4 ${style.labelBg} text-white text-xs px-3 py-1 font-bold flex items-center gap-1 rounded-b-lg shadow-md z-10`}>
          <Icon size={12} />
          {style.label}
        </div>
        
        <div className="p-4 pt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-20 h-20 flex items-center justify-center bg-white rounded-lg">
              <img 
                src={item.spriteUrl} 
                alt={item.name}
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated', transform: 'scale(1.8)' }}
              />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg text-gray-800">{item.name}</div>
              <div className="text-sm text-gray-600 line-clamp-2">{item.effect?.replace(/\n/g, ' ')}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t-2 border-white">
            <div className="flex items-center gap-1 text-yellow-600 font-bold text-xl">
              <Coins size={20} />
              ₽{shopItem.price.toLocaleString()}
            </div>
            <div className={`text-sm font-semibold ${
              isSoldOut ? 'text-red-600' : 'text-gray-600'
            }`}>
              {shopItem.stock === 99 
                ? '무제한' 
                : isSoldOut 
                  ? (shopItem.type === 'daily' ? '이번 주 품절' : '품절')
                  : shopItem.type === 'daily'
                    ? `이번 주 ${remainingStock}/${shopItem.stock}개`
                    : `${shopItem.stock}개`
              }
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* 오늘의 희귀 아이템 */}
      {shopData.rareDailyItem?.itemId && (
        <div className="relative border-2 border-purple-300 bg-purple-50 rounded-lg overflow-hidden shadow-lg">
          <div className="absolute -top-0 left-4 bg-purple-600 text-white text-sm px-4 py-1.5 font-bold flex items-center gap-2 rounded-b-lg shadow-md z-10">
            <Star size={14} />
            오늘의 희귀
          </div>
          
          <div className="p-4 pt-10">
            {(() => {
              const item = getItemDetails(shopData.rareDailyItem);
              if (!item) return null;
              
              const isSelected = selectedItem?.itemId === shopData.rareDailyItem.itemId;
              
              const purchaseHistory = trainer?.purchaseHistory || {};
              const todayDate = new Date().toISOString().split('T')[0];
              const todayPurchases = purchaseHistory[todayDate] || {};
              const alreadyPurchased = (todayPurchases[shopData.rareDailyItem.itemId] || 0) >= 1;
              const isSoldOut = alreadyPurchased;
              
              return (
                <button
                  onClick={() => {
                    if (isSoldOut) return;
                    setSelectedItem({
                      ...item,
                      type: 'rare',
                      price: shopData.rareDailyItem.price,
                      stock: shopData.rareDailyItem.stock || 1
                    });
                    setQuantity(1);
                  }}
                  disabled={isSoldOut}
                  className={`w-full transition-all border-2 rounded-lg p-4 relative ${
                    isSoldOut
                      ? 'opacity-50 cursor-not-allowed grayscale border-gray-300 bg-gray-100'
                      : isSelected 
                        ? 'ring-4 ring-yellow-400 scale-105 border-white bg-white' 
                        : 'hover:shadow-md hover:scale-102 border-white bg-white'
                  }`}
                >
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20 rounded-lg">
                      <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg transform rotate-12 shadow-xl">
                        구매완료
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-20 h-20 flex items-center justify-center flex-shrink-0 bg-purple-50 rounded-lg">
                      <img 
                        src={item.spriteUrl} 
                        alt={item.name}
                        className="max-w-full max-h-full"
                        style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg text-gray-800 mb-1">{item.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-3">{item.effect?.replace(/\n/g, ' ')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t-2 border-purple-100">
                    <div className="flex items-center gap-1 text-yellow-600 font-bold text-xl">
                      <Coins size={20} />
                      ₽{shopData.rareDailyItem.price.toLocaleString()}
                    </div>
                    <div className={`text-sm font-semibold ${
                      isSoldOut ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {isSoldOut ? '구매완료' : '1인 1개'}
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* 랜덤박스 섹션 */}
      <RandomBoxShop 
        shopData={shopData}
        currentUser={trainer}
        allItems={allItems}
        onBuyRandomBox={buyRandomBox}
        selectedItem={selectedItem}
        onSelectBox={(box) => setSelectedItem(box)}
      />

      {/* 상점 메인 */}
      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg">
        <div className="border-b-2 border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              전체 상품
            </button>
            <button
              onClick={() => setFilterType('daily')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                filterType === 'daily'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Calendar size={18} />
              {todayNameKo} 한정
            </button>
            <button
              onClick={() => setFilterType('permanent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                filterType === 'permanent'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Package size={18} />
              상시 판매
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredItems().length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">판매 중인 상품이 없습니다</p>
              <p className="text-sm mt-2">나중에 다시 확인해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredItems().map(item => renderItemCard(item))}
            </div>
          )}
        </div>
      </div>

      {/* 구매 패널 */}
      {selectedItem && selectedItem.type !== 'randombox' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-indigo-600 shadow-2xl p-6 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-lg">
                <img 
                  src={selectedItem.spriteUrl} 
                  alt={selectedItem.name}
                  className="max-w-full max-h-full"
                  style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                />
              </div>
              
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