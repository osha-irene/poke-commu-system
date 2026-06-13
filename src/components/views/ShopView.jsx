import React, { useState } from 'react';
import { ShoppingCart, Star, Coins, Calendar, Package, CircleDot, X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { getItemPocket } from '../../utils/itemUtils';
import RandomBoxShop from './RandomBoxShop';
import useMediaQuery from '../../hooks/useMediaQuery';

const P = {
  bg:       'rgba(22,42,16,0.75)',
  card:     'rgba(255,255,255,0.10)',
  cardSel:  'rgba(255,255,255,0.18)',
  border:   'rgba(255,255,255,0.15)',
  borderSel:'rgba(185,240,90,0.7)',
  text:     'rgba(255,255,255,0.95)',
  muted:    'rgba(255,255,255,0.55)',
  accent:   'rgba(185,240,90,1)',
  accentBg: 'rgba(100,175,45,0.3)',
  price:    '#f0d060',
  tag:      'rgba(255,255,255,0.18)',
};

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
// ⭐ getItemDetails 함수를 먼저 선언
  const getItemDetails = (shopItem) => {
    const item = allItems.find(i => i.id === shopItem.itemId);
    return {
      ...item,
      ...shopItem,
      pocket: getItemPocket(item || shopItem)
    };
  };
  
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
  
  const handlePurchase = () => {
    if (!selectedItem) return;
    
    // 규토리볼 가챠 구매
    if (selectedItem.type === 'gachaball') {
      if (trainer.money < 200) {
        alert('돈이 부족합니다!');
        return;
      }

      const gachaBalls = selectedItem.gachaBalls;
      const randomBall = gachaBalls[Math.floor(Math.random() * gachaBalls.length)];
      const wonItem = allItems.find(i => i.id === randomBall.itemId);
      
      if (!wonItem) {
        alert('아이템을 찾을 수 없습니다!');
        return;
      }

      const existingItem = trainer.inventory.find(
        i => i.itemId === wonItem.id || i.name === wonItem.name
      );

      const newInventory = existingItem
        ? trainer.inventory.map(i =>
            (i.itemId === wonItem.id || i.name === wonItem.name)
              ? { ...i, count: i.count + quantity }
              : i
          )
        : [
            ...trainer.inventory,
            {
              itemId: wonItem.id,
              name: wonItem.name,
              nameEn: wonItem.nameEn,
              count: quantity,
              imageUrl: wonItem.spriteUrl || wonItem.imageUrl,
              cost: wonItem.cost || 0,
              sellPrice: wonItem.sellPrice || 0,
              category: wonItem.category,
              pocket: wonItem.pocket
            }
          ];

      updateCurrentUser({
        money: trainer.money - (200 * quantity),
        inventory: newInventory
      });

      alert(`규토리볼 ${quantity}회 뽑기 완료!\n${wonItem.name} ${quantity}개를 획득했습니다!`);
      setSelectedItem(null);
      setQuantity(1);
      return;
    }
    
    const totalPrice = selectedItem.price * quantity;
    
    if (trainer.money < totalPrice) {
      alert('돈이 부족합니다!');
      return;
    }
    
    const success = onPurchase(selectedItem, quantity);
    if (success) {
      setSelectedItem(null);
      setQuantity(1);
    }
  };

  const buyRandomBox = (box, result) => {
    if (!trainer) return false;
    
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
    
    alert(`${box.name}에서 ${result.name} x${result.count} 획득`);
    return true;
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
        label: '한정',
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
        
        <div className={`absolute top-0 left-0 ${style.labelBg} text-white text-xs px-3 py-1 font-bold flex items-center gap-1 rounded-br-lg z-10`}>
          <Icon size={12} />
          <span>{style.label}</span>
        </div>
        
        <div className={`${style.bg} p-4 pt-8`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 bg-white rounded-lg">
              <img 
                src={item.spriteUrl} 
                alt={item.name}
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
              />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-sm text-gray-800 mb-1">{item.name}</div>
              <div className="text-xs text-gray-600 line-clamp-2">{item.effect?.replace(/\n/g, ' ')}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
            <div className="flex items-center gap-1 text-yellow-600 font-bold">
              <Coins size={16} />
              {shopItem.price.toLocaleString()}원
            </div>
            <div className={`text-xs font-semibold ${
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

  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    const allShopItems = getAllShopItems();
    const displayItems = filterType === 'all' ? allShopItems : allShopItems.filter(i => i.type === filterType);

    const getRareItem = () => {
      if (!shopData.rareItemConfig?.enabled || !shopData.rareDailyItem?.itemId) return null;
      const item = getItemDetails(shopData.rareDailyItem);
      if (!item) return null;
      const purchaseHistory = trainer?.purchaseHistory || {};
      const todayDate = new Date().toISOString().split('T')[0];
      const alreadyPurchased = ((purchaseHistory[todayDate] || {})[shopData.rareDailyItem.itemId] || 0) >= 1;
      return { item, alreadyPurchased };
    };
    const rareData = getRareItem();

    const tabs = [
      { id: 'all',       label: '전체' },
      { id: 'daily',     label: `${todayNameKo} 한정` },
      { id: 'permanent', label: '상시' },
    ];

    return (
      <div style={{ paddingTop: 56, paddingBottom: 80, minHeight: '100%', color: P.text }}>

        {/* 보유 금액 */}
        <div style={{ margin: '0 12px 14px', padding: '12px 16px', background: 'rgba(30,58,22,0.97)', border: `1px solid rgba(160,220,90,0.5)`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 13, color: 'rgba(210,240,160,1)', fontWeight: 600 }}>보유 금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 20, fontWeight: 800, color: 'rgba(210,250,110,1)' }}>
            <Coins size={18} style={{ color: P.accent }} />
            {trainer.money?.toLocaleString() || 0}원
          </div>
        </div>

        {/* 한정 아이템 */}
        {rareData && (
          <div style={{ margin: '0 12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(200,150,240,0.85)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>한정 아이템</div>
            <button
              onClick={() => { if (!rareData.alreadyPurchased) { setSelectedItem({ ...rareData.item, type: 'rare', price: shopData.rareDailyItem.price, stock: 1 }); setQuantity(1); }}}
              disabled={rareData.alreadyPurchased}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(180,120,240,0.4)`,
                background: selectedItem?.itemId === shopData.rareDailyItem.itemId ? 'rgba(160,100,220,0.55)' : 'rgba(110,60,175,0.52)',
                cursor: rareData.alreadyPurchased ? 'not-allowed' : 'pointer',
                opacity: rareData.alreadyPurchased ? 0.5 : 1, textAlign: 'left',
              }}
            >
              <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.18)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={rareData.item.spriteUrl} alt={rareData.item.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: P.important }}>{rareData.item.name}</div>
                <div style={{ fontSize: 11, color: P.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rareData.item.effect?.replace(/\n/g, ' ')}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: P.price }}>{shopData.rareDailyItem.price?.toLocaleString()}원</div>
                <div style={{ fontSize: 10, color: rareData.alreadyPurchased ? 'rgba(220,80,80,0.9)' : P.muted }}>{rareData.alreadyPurchased ? '구매완료' : '1인 1개'}</div>
              </div>
            </button>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px', marginBottom: 12 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setFilterType(tab.id)} style={{
              flex: 1, padding: '7px 4px', borderRadius: 10, border: `1px solid ${filterType === tab.id ? P.accent : P.border}`,
              background: filterType === tab.id ? P.accentBg : 'transparent',
              color: filterType === tab.id ? P.accent : P.muted,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* 아이템 목록 */}
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayItems.filter(i => i.type !== 'rare').map(shopItem => {
            const item = getItemDetails(shopItem);
            if (!item) return null;
            const isSoldOut = shopItem.stock !== 99 && shopItem.stock <= 0;
            const isSelected = selectedItem?.itemId === shopItem.itemId;
            const typeColor = shopItem.type === 'daily' ? 'rgba(100,160,240,0.9)' : P.muted;
            return (
              <button
                key={`${shopItem.itemId}-${shopItem.type}`}
                onClick={() => { if (!isSoldOut) { setSelectedItem({ ...item, type: shopItem.type }); setQuantity(1); }}}
                disabled={isSoldOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 12,
                  border: `1px solid ${isSelected ? P.accent : P.border}`,
                  background: isSelected ? P.accentBg : P.card,
                  cursor: isSoldOut ? 'not-allowed' : 'pointer',
                  opacity: isSoldOut ? 0.45 : 1, textAlign: 'left',
                }}
              >
                <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={item.spriteUrl} alt={item.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: P.important }}>{item.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeColor, border: `1px solid ${typeColor}`, borderRadius: 4, padding: '1px 5px' }}>
                      {shopItem.type === 'daily' ? `${todayNameKo} 한정` : '상시'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: P.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.effect?.replace(/\n/g, ' ')}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P.price }}>{shopItem.price?.toLocaleString()}원</div>
                  <div style={{ fontSize: 10, color: P.muted }}>
                    {shopItem.stock === 99 ? '무제한' : isSoldOut ? '품절' : `${shopItem.stock}개`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 구매 바텀 시트 */}
        {selectedItem && selectedItem.type !== 'randombox' && (
          <div style={{
            position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 200,
            background: 'rgba(14,26,14,0.98)', backdropFilter: 'blur(12px)',
            borderTop: `1px solid ${P.border}`,
            padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={selectedItem.spriteUrl} alt={selectedItem.name} style={{ width: 36, height: 36, imageRendering: 'pixelated', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: P.important }}>{selectedItem.name}</div>
                <div style={{ fontSize: 13, color: P.price, fontWeight: 800 }}>
                  {(selectedItem.price * quantity).toLocaleString()}원
                  {quantity > 1 && <span style={{ fontSize: 11, color: P.muted, marginLeft: 4 }}>({selectedItem.price.toLocaleString()}원 × {quantity})</span>}
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: P.muted, padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, background: 'transparent', border: 'none', color: P.text, fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ width: 36, textAlign: 'center', fontSize: 15, fontWeight: 700, color: P.text }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(selectedItem.stock === 99 ? 999 : selectedItem.stock, q + 1))} style={{ width: 36, height: 36, background: 'transparent', border: 'none', color: P.text, fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
              <button onClick={handlePurchase} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: 'rgba(100,160,42,0.5)', color: P.accent,
                fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}>구매하기</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="rounded-lg border-2 border-lime-300 bg-white/55 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-green-950">
              <ShoppingCart size={32} className="text-lime-700" />
              포켓몬 상점
            </h1>
            <p className="text-green-800">필요한 아이템을 구매하세요!</p>
          </div>
          <div className="text-right text-green-950">
            <div className="text-sm text-green-700 mb-1">보유 금액</div>
            <div className="text-4xl font-bold flex items-center gap-2">
              <Coins size={32} className="text-lime-700" />
              {trainer.money?.toLocaleString() || 0}원
            </div>
          </div>
        </div>
      </div>

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
          {/* 상품 그리드 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 한정 아이템 */}
            {(filterType === 'all' || filterType === 'rare') && 
             shopData.rareItemConfig?.enabled && 
             shopData.rareDailyItem?.itemId && 
             (() => {
              const item = getItemDetails(shopData.rareDailyItem);
              if (!item) return null;
              
              const purchaseHistory = trainer?.purchaseHistory || {};
              const todayDate = new Date().toISOString().split('T')[0];
              const todayPurchases = purchaseHistory[todayDate] || {};
              const alreadyPurchased = (todayPurchases[shopData.rareDailyItem.itemId] || 0) >= 1;
              const isSoldOut = alreadyPurchased;
              const isSelected = selectedItem?.itemId === shopData.rareDailyItem.itemId;
              
              return (
                <button
                  key="rare-item"
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
                        품절
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-0 left-0 bg-purple-600 text-white text-xs px-3 py-1 font-bold flex items-center gap-1 rounded-br-lg z-10">
                    <Star size={12} />
                    <span>한정</span>
                  </div>
                  
                  <div className="bg-purple-50 p-4 pt-8">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 bg-white rounded-lg">
                        <img 
                          src={item.spriteUrl} 
                          alt={item.name}
                          className="max-w-full max-h-full"
                          style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-sm text-gray-800 mb-1">{item.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-2">{item.effect?.replace(/\n/g, ' ')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Coins size={16} />
                        {shopData.rareDailyItem.price.toLocaleString()}원
                      </div>
                      <div className={`text-xs font-semibold ${isSoldOut ? 'text-red-600' : 'text-gray-600'}`}>
                        {isSoldOut ? '구매완료' : '1인 1개'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* 규토리볼 가챠 (2칸 차지, 바깥 박스로 감싸기) */}
            {(filterType === 'all' || filterType === 'gacha') && (() => {
              const gachaEnabled = shopData.gachaBall?.enabled;
              const gachaBalls = shopData.gachaBall?.balls || [];
              const hasEnoughBalls = gachaBalls.length === 2;
              
              if (!gachaEnabled || !hasEnoughBalls) return null;
              
              const isSelected = selectedItem?.type === 'gachaball';
              
              return (
                <div
                  key="gacha-ball-wrapper"
                  className={`col-span-2 relative border-4 rounded-xl overflow-hidden transition-all ${
                    isSelected
                      ? 'border-yellow-400 shadow-xl'
                      : 'border-orange-300 hover:border-orange-400 hover:shadow-lg'
                  }`}
                >
                  <div className="absolute top-0 left-0 bg-orange-600 text-white text-xs px-3 py-1.5 font-bold flex items-center gap-1 rounded-br-lg z-10">
                    <CircleDot size={12} />
                    <span>규토리볼 가챠</span>
                  </div>
                  
                  <div className="bg-orange-50 p-3 pt-8">
                    <div className="grid grid-cols-2 gap-3">
                      {gachaBalls.map((ballItem) => {
                        const item = allItems.find(i => i.id === ballItem.itemId);
                        if (!item) return null;

                        return (
                          <button
                            key={ballItem.itemId}
                            onClick={() => {
                              setSelectedItem({
                                type: 'gachaball',
                                name: '규토리볼 가챠',
                                price: 200,
                                gachaBalls: gachaBalls,
                                description: '랜덤으로 몬스터볼 1개를 획득합니다'
                              });
                              setQuantity(1);
                            }}
                            className="relative border-2 rounded-lg overflow-hidden transition-all bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
                          >
                            <div className="bg-white p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="max-w-full max-h-full"
                                    style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                                  />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-bold text-sm text-gray-800 mb-1">{item.name}</div>
                                  <div className="text-xs text-gray-600 line-clamp-2">{item.effect || item.description}</div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-3 text-xs text-center py-2 bg-white rounded-lg border-2 border-orange-200 font-semibold text-orange-700">
                      💫 2개 중 랜덤으로 1개를 획득합니다
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between px-4 py-3 bg-white rounded-lg border-2 border-orange-200">
                      <div className="flex items-center gap-1 text-yellow-600 font-bold">
                        <Coins size={16} />
                        200원
                      </div>
                      <div className="text-xs font-semibold text-gray-600">
                        무제한
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 일반 아이템들 */}
            {filteredItems().map(item => renderItemCard(item))}
          </div>

          {filteredItems().length === 0 && 
           (!shopData.rareItemConfig?.enabled || !shopData.rareDailyItem?.itemId) && 
           (!shopData.gachaBall?.enabled || shopData.gachaBall?.balls?.length !== 2) && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingCart size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">판매 중인 상품이 없습니다</p>
              <p className="text-sm mt-2">나중에 다시 확인해보세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 구매 패널 */}
      {selectedItem && selectedItem.type !== 'randombox' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-indigo-600 shadow-2xl p-6 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              {selectedItem.type === 'gachaball' ? (
                <>
                  <div className="w-24 h-24 bg-orange-50 rounded-lg p-2 border-2 border-orange-200">
                    <div className="grid grid-cols-2 gap-1 h-full">
                      {selectedItem.gachaBalls.map((ballItem) => {
                        const item = allItems.find(i => i.id === ballItem.itemId);
                        if (!item) return null;
                        return (
                          <div key={ballItem.itemId} className="bg-white rounded flex items-center justify-center">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="max-w-full max-h-full"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                      <CircleDot size={24} className="text-orange-600" />
                      {selectedItem.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">{selectedItem.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-yellow-600 font-bold text-xl">
                        <Coins size={20} />
                        {selectedItem.price.toLocaleString()}원 × {quantity}
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        = {(selectedItem.price * quantity).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                        {selectedItem.price.toLocaleString()}원 × {quantity}
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        = {(selectedItem.price * quantity).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </>
              )}
              
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
                  {selectedItem.type === 'gachaball' ? '뽑기' : '구매하기'}
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
