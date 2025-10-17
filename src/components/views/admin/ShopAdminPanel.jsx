import React, { useState } from 'react';
import { Plus, Trash2, Star, Calendar, Search, Package, X, Store, CircleDot } from 'lucide-react';

export default function ShopAdminPanel({ 
  shopData = {},
  allItems = [],
  onUpdateShop 
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showRarePanel, setShowRarePanel] = useState(false);
  const [showGachaPanel, setShowGachaPanel] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(99);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemType, setItemType] = useState('daily');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [filterDay, setFilterDay] = useState('all');
  const [itemCategory, setItemCategory] = useState('all');
  
  const days = [
    { id: 'monday', name: '월요일' },
    { id: 'tuesday', name: '화요일' },
    { id: 'wednesday', name: '수요일' },
    { id: 'thursday', name: '목요일' },
    { id: 'friday', name: '금요일' },
    { id: 'saturday', name: '토요일' },
    { id: 'sunday', name: '일요일' }
  ];

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'berries', name: '나무열매' },
    { id: 'medicine', name: '회복' },
    { id: 'vitamins', name: '영양' },
    { id: 'evolution', name: '진화' },
    { id: 'battle', name: '배틀' }
  ];
  
  const filteredItems = allItems.filter(item => {
    const pocket = item.categoryData?.pocket || item.pocket || 'misc';
    
    if (itemCategory !== 'all' && pocket !== itemCategory) {
      return false;
    }
    
    if (!searchQuery) return itemCategory !== 'all';
    
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.nameEn?.toLowerCase().includes(query) ||
      item.id.toString().includes(query)
    );
  }).slice(0, 30);
  
  const getAllShopItems = () => {
    const items = [];
    
    Object.entries(shopData.dailyItems || {}).forEach(([day, dayItems]) => {
      dayItems.forEach(item => {
        items.push({ ...item, type: 'daily', day });
      });
    });
    
    (shopData.permanentItems || []).forEach(item => {
      items.push({ ...item, type: 'permanent' });
    });
    
    if (shopData.rareDailyItem?.itemId) {
      items.push({ 
        ...shopData.rareDailyItem, 
        type: 'rare',
        stock: 1 
      });
    }
    
    return items;
  };
  
  const getFilteredShopItems = () => {
    const items = getAllShopItems();
    
    console.log('🔍 전체 상점 아이템:', items);
    console.log('🔍 현재 필터:', filterDay);
    
    let filtered = items;
    if (filterDay !== 'all') {
      filtered = items.filter(item => {
        if (item.type === 'daily') return item.day === filterDay;
        return item.type === 'permanent' || item.type === 'rare';
      });
    }
    
    const sorted = filtered.sort((a, b) => {
      const typeOrder = { rare: 0, daily: 1, permanent: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
    
    console.log('🔍 필터링 후 아이템:', sorted);
    
    return sorted;
  };
  
  // ⭐ async로 변경
  const handleAddItem = async () => {
    console.log('🎯 handleAddItem 시작');
    console.log('📦 현재 shopData:', shopData);
    console.log('🎨 선택된 아이템:', selectedItem);
    console.log('📌 아이템 타입:', itemType);
    console.log('📅 선택된 요일:', selectedDay);
    
    if (!selectedItem) {
      alert('아이템을 선택해주세요!');
      return;
    }
    
    const newItem = {
      itemId: selectedItem.id,
      price: price || selectedItem.cost || 100,
      stock: stock
    };
    
    console.log('✨ 추가할 아이템:', newItem);
    
    // 깊은 복사
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    console.log('📋 복사된 shopData:', updatedShopData);
    
    if (itemType === 'daily') {
      if (!selectedDay) {
        alert('요일을 선택해주세요!');
        return;
      }
      
      // dailyItems 초기화
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
        console.log('🔧 dailyItems 초기화');
      }
      
      const currentItems = updatedShopData.dailyItems[selectedDay] || [];
      console.log(`📅 ${selectedDay}의 현재 아이템:`, currentItems);
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.dailyItems[selectedDay] = [...currentItems, newItem];
      console.log('✅ 업데이트된 dailyItems:', updatedShopData.dailyItems);
      
    } else if (itemType === 'permanent') {
      const currentItems = updatedShopData.permanentItems || [];
      console.log('📦 현재 영구 아이템:', currentItems);
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.permanentItems = [...currentItems, newItem];
      console.log('✅ 업데이트된 permanentItems:', updatedShopData.permanentItems);
    }
    
    console.log('💾 Firebase에 저장할 데이터:', updatedShopData);
    
    try {
      console.log('🚀 onUpdateShop 호출 시작');
      await onUpdateShop(updatedShopData);
      console.log('✅ onUpdateShop 완료');
      
      // 초기화
      setSelectedItem(null);
      setPrice(0);
      setStock(99);
      setShowAddPanel(false);
      setSearchQuery('');
      setItemCategory('all');
      
      alert('아이템이 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('❌ 아이템 추가 실패:', error);
      alert('아이템 추가 중 오류가 발생했습니다: ' + error.message);
    }
  };
  
  // ⭐ async로 변경
  const handleRemoveItem = async (itemId, type, day) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).filter(i => i.itemId !== itemId);
      
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).filter(i => i.itemId !== itemId);
      
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = { itemId: null, price: 0, lastRefresh: null };
    }
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 아이템 제거 완료');
    } catch (error) {
      console.error('❌ 아이템 제거 실패:', error);
    }
  };
  
  // ⭐ async로 변경
  const handleUpdateItem = async (itemId, type, day, field, value) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
      );
      
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
      );
      
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = {
        ...updatedShopData.rareDailyItem,
        [field]: parseInt(value) || 0
      };
    }
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('❌ 아이템 수정 실패:', error);
    }
  };

  // ⭐ async로 변경
  const handleAddToRarePool = async (item, priceValue) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    const rarePool = updatedShopData.rareItemPool || [];
    
    if (rarePool.some(i => i.itemId === item.id)) {
      alert('이미 희귀 아이템 풀에 추가된 아이템입니다!');
      return;
    }
    
    updatedShopData.rareItemPool = [...rarePool, { itemId: item.id, price: priceValue }];
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 희귀템 풀에 추가 완료');
    } catch (error) {
      console.error('❌ 희귀템 풀 추가 실패:', error);
    }
  };
  
  // ⭐ async로 변경
  const handleRemoveFromRarePool = async (itemId) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.rareItemPool = (updatedShopData.rareItemPool || []).filter(i => i.itemId !== itemId);
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 희귀템 풀에서 제거 완료');
    } catch (error) {
      console.error('❌ 희귀템 풀 제거 실패:', error);
    }
  };
  
  // ⭐ async로 변경
  const handleUpdateRarePoolPrice = async (itemId, priceValue) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.rareItemPool = (updatedShopData.rareItemPool || []).map(i => 
      i.itemId === itemId ? { ...i, price: parseInt(priceValue) || 0 } : i
    );
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('❌ 희귀템 가격 수정 실패:', error);
    }
  };
  
  // ⭐ async로 변경
  const handleRandomRareItem = async () => {
  const rarePool = shopData.rareItemPool || [];
  if (rarePool.length === 0) {
    alert('희귀 아이템 풀이 비어있습니다!');
    return;
  }
  
  const randomItem = rarePool[Math.floor(Math.random() * rarePool.length)];
  let updatedShopData = JSON.parse(JSON.stringify(shopData));
  
  // ⭐ stock 필드 추가
  updatedShopData.rareDailyItem = {
    itemId: randomItem.itemId,
    price: randomItem.price,
    stock: 1,  // 희귀 아이템은 항상 재고 1개로 설정
    lastRefresh: new Date().toISOString().split('T')[0]
  };
  
  try {
    await onUpdateShop(updatedShopData);
    const item = allItems.find(i => i.id === randomItem.itemId);
    alert(`${item?.name || '아이템'}이(가) 오늘의 희귀템으로 설정되었습니다!`);
  } catch (error) {
    console.error('❌ 희귀템 설정 실패:', error);
  }
};
  // ⭐ async로 변경
  const handleToggleGacha = async (enabled) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    updatedShopData.gachaBall.enabled = enabled;
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 규토리볼 노출 상태 변경:', enabled);
    } catch (error) {
      console.error('❌ 규토리볼 노출 상태 변경 실패:', error);
    }
  };

  // ⭐ async로 변경
  const handleAddGachaBall = async (item) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    // gachaBall 객체 초기화
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    // balls 배열 초기화
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    if (updatedShopData.gachaBall.balls.length >= 2) {
      alert('최대 2개까지만 선택할 수 있습니다!');
      return;
    }
    
    if (updatedShopData.gachaBall.balls.some(b => b.itemId === item.id)) {
      alert('이미 추가된 볼입니다!');
      return;
    }
    
    updatedShopData.gachaBall.balls.push({ itemId: item.id });
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 규토리볼 추가 완료');
    } catch (error) {
      console.error('❌ 규토리볼 추가 실패:', error);
    }
  };

  // ⭐ async로 변경
  const handleRemoveGachaBall = async (itemId) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    // gachaBall 객체 초기화
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    // balls 배열 초기화
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    updatedShopData.gachaBall.balls = updatedShopData.gachaBall.balls.filter(b => b.itemId !== itemId);
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('✅ 규토리볼 제거 완료');
    } catch (error) {
      console.error('❌ 규토리볼 제거 실패:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Store size={24} />
          상점 관리
        </h3>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterDay('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                filterDay === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {days.map(day => (
              <button
                key={day.id}
                onClick={() => setFilterDay(day.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  filterDay === day.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day.name}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('🔄 현재 shopData:', shopData);
                alert(`상점 데이터 확인:\n요일별: ${Object.values(shopData.dailyItems || {}).reduce((sum, items) => sum + items.length, 0)}개\n상시: ${(shopData.permanentItems || []).length}개`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              🔍 데이터 확인
            </button>
            <button
              onClick={() => setShowRarePanel(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              <Star size={18} />
              희귀템
            </button>
            
            <button
              onClick={() => setShowGachaPanel(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <CircleDot size={18} />
              규토리볼
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          <button
            onClick={() => setShowAddPanel(true)}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2"
          >
            <Plus size={48} className="text-indigo-600" />
            <span className="text-sm font-bold text-indigo-600">새 상품 추가</span>
          </button>

          {getFilteredShopItems().map((shopItem, index) => {
            const item = allItems.find(i => i.id === shopItem.itemId);
            if (!item) return null;
            
            const typeStyles = {
              daily: { 
                border: 'border-blue-300',
                bg: 'bg-blue-50',
                labelBg: 'bg-blue-100',
                labelText: 'text-blue-700'
              },
              permanent: { 
                border: 'border-green-300',
                bg: 'bg-green-50',
                labelBg: 'bg-green-100',
                labelText: 'text-green-700'
              },
              rare: { 
                border: 'border-purple-300',
                bg: 'bg-purple-50',
                labelBg: 'bg-purple-100',
                labelText: 'text-purple-700'
              }
            };
            const style = typeStyles[shopItem.type];
            
            return (
              <div 
                key={`${shopItem.type}-${shopItem.itemId}-${index}`} 
                className={`border-2 ${style.border} rounded-xl ${style.bg} flex flex-col relative group`}
              >
                <div className="absolute top-2 left-2 z-10">
                  <span className={`text-xs px-2 py-1 rounded ${style.labelBg} ${style.labelText} font-semibold`}>
                    {shopItem.type === 'daily' ? days.find(d => d.id === shopItem.day)?.name :
                     shopItem.type === 'permanent' ? '상시' : '오늘의 희귀'}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveItem(shopItem.itemId, shopItem.type, shopItem.day)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="상품 삭제"
                >
                  <Trash2 size={16} />
                </button>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center justify-center mb-3 h-24">
                    <img 
                      src={item.spriteUrl} 
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                    />
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="font-bold text-sm text-gray-800 text-center">{item.name}</div>
                    
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 whitespace-nowrap">가격</span>
                        <input
                          type="number"
                          value={shopItem.price}
                          onChange={(e) => handleUpdateItem(shopItem.itemId, shopItem.type, shopItem.day, 'price', e.target.value)}
                          className="w-14 border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
                        />
                      </div>
                      {shopItem.type !== 'rare' && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600 whitespace-nowrap">재고</span>
                          <input
                            type="number"
                            value={shopItem.stock}
                            onChange={(e) => handleUpdateItem(shopItem.itemId, shopItem.type, shopItem.day, 'stock', e.target.value)}
                            className="w-14 border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[700px] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">상품 추가</h3>
              <button
                onClick={() => {
                  setShowAddPanel(false);
                  setSelectedItem(null);
                  setSearchQuery('');
                  setItemCategory('all');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 p-6 h-full">
                <div className="flex flex-col overflow-hidden">
                  <div className="space-y-4 mb-4 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="아이템 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setItemCategory(cat.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            itemCategory === cat.id
                              ? 'bg-indigo-600 text-white shadow-lg scale-105'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4">
                      {searchQuery === '' && itemCategory === 'all' ? (
                        <div className="col-span-4 text-center py-16 text-gray-400">
                          <Search size={64} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">카테고리를 선택하거나 검색해주세요</p>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="col-span-4 text-center py-16 text-gray-400">
                          <Search size={64} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">검색 결과가 없습니다</p>
                        </div>
                      ) : (
                        filteredItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedItem(item);
                              setPrice(item.cost || 100);
                            }}
                            className={`flex flex-col border-2 rounded-xl hover:shadow-lg transition-all group bg-white overflow-hidden ${
                              selectedItem?.id === item.id
                                ? 'border-indigo-500 shadow-lg'
                                : 'border-gray-200 hover:border-indigo-400'
                            }`}
                          >
                            <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                              <img 
                                src={item.spriteUrl || item.imageUrl} 
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                              />
                            </div>
                            
                            <div className="p-2 bg-white border-t border-gray-200">
                              <div className={`text-xs font-semibold text-center truncate ${
                                selectedItem?.id === item.id ? 'text-indigo-700' : 'text-gray-800 group-hover:text-indigo-700'
                              }`}>
                                {item.name}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-indigo-500 rounded-2xl bg-white overflow-hidden flex flex-col h-full flex-shrink-0">
                  {selectedItem ? (
                    <>
                      <div className="bg-indigo-50 p-6 border-b-2 border-indigo-200">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border-2 border-indigo-200">
                            <img 
                              src={selectedItem.spriteUrl || selectedItem.imageUrl}
                              alt={selectedItem.name}
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-xl text-gray-800">{selectedItem.name}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {selectedItem.effect || '포켓몬에게 사용하는 아이템'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex border-b border-gray-200">
                        <button
                          onClick={() => setItemType('daily')}
                          className={`flex-1 py-3 font-bold text-sm transition-colors ${
                            itemType === 'daily'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          요일별
                        </button>
                        <button
                          onClick={() => setItemType('permanent')}
                          className={`flex-1 py-3 font-bold text-sm transition-colors ${
                            itemType === 'permanent'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          상시
                        </button>
                      </div>

                      <div className="p-6 space-y-4">
                        {itemType === 'daily' && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">요일 선택</label>
                            <select
                              value={selectedDay}
                              onChange={(e) => setSelectedDay(e.target.value)}
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
                            >
                              {days.map(day => (
                                <option key={day.id} value={day.id}>{day.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">판매 가격</label>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
                            placeholder="80"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">재고 (99=무제한)</label>
                          <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold focus:border-indigo-500 focus:outline-none"
                            placeholder="99"
                          />
                        </div>

                        <button
                          onClick={handleAddItem}
                          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={20} />
                          추가하기
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Package size={64} className="mx-auto mb-3 text-gray-300" />
                      <p>왼쪽에서 아이템을 선택하세요</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRarePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[700px] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Star className="text-purple-600" size={24} />
                  희귀 아이템 관리
                </h3>
                <p className="text-sm text-gray-600 mt-1">매일 랜덤으로 표시될 희귀 아이템 풀을 관리합니다</p>
              </div>
              <button
                onClick={() => {
                  setShowRarePanel(false);
                  setSelectedItem(null);
                  setSearchQuery('');
                  setItemCategory('all');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 p-6 h-full">
                <div className="flex flex-col overflow-hidden">
                  <div className="space-y-4 mb-4 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="아이템 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setItemCategory(cat.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            itemCategory === cat.id
                              ? 'bg-purple-600 text-white shadow-lg scale-105'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4">
                      {searchQuery === '' && itemCategory === 'all' ? (
                        <div className="col-span-4 text-center py-16 text-gray-400">
                          <Search size={64} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">카테고리를 선택하거나 검색해주세요</p>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="col-span-4 text-center py-16 text-gray-400">
                          <Search size={64} className="mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">검색 결과가 없습니다</p>
                        </div>
                      ) : (
                        filteredItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedItem(item);
                              setPrice(item.cost || 100);
                            }}
                            className={`flex flex-col border-2 rounded-xl hover:shadow-lg transition-all group bg-white overflow-hidden ${
                              selectedItem?.id === item.id
                                ? 'border-purple-500 shadow-lg'
                                : 'border-gray-200 hover:border-purple-400'
                            }`}
                          >
                            <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                              <img 
                                src={item.spriteUrl || item.imageUrl} 
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                              />
                            </div>
                            
                            <div className="p-2 bg-white border-t border-gray-200">
                              <div className={`text-xs font-semibold text-center truncate ${
                                selectedItem?.id === item.id ? 'text-purple-700' : 'text-gray-800 group-hover:text-purple-700'
                              }`}>
                                {item.name}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-purple-500 rounded-2xl bg-white overflow-hidden flex flex-col h-full flex-shrink-0">
                  <div className="bg-purple-50 p-4 border-b-2 border-purple-200">
                    <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <Package size={20} />
                      희귀 아이템 풀 ({(shopData.rareItemPool || []).length}개)
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">매일 이 중에서 랜덤으로 1개가 표시됩니다</p>
                  </div>

                  {selectedItem && (
                    <div className="p-4 bg-purple-50 border-b-2 border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border-2 border-purple-200">
                          <img 
                            src={selectedItem.spriteUrl || selectedItem.imageUrl}
                            alt={selectedItem.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: 'pixelated', transform: 'scale(1.5)' }}
                          />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-sm text-gray-800">{selectedItem.name}</h5>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {selectedItem.effect || '포켓몬에게 사용하는 아이템'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                          className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 font-semibold focus:border-purple-500 focus:outline-none"
                          placeholder="가격"
                        />
                        <button
                          onClick={() => {
                            handleAddToRarePool(selectedItem, price);
                            setSelectedItem(null);
                          }}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                          <Plus size={18} />
                          풀에 추가
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4">
                    {(shopData.rareItemPool || []).length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Star size={64} className="mx-auto mb-3 text-gray-300" />
                        <p>희귀 아이템 풀이 비어있습니다</p>
                        <p className="text-sm mt-1">왼쪽에서 아이템을 선택해주세요</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(shopData.rareItemPool || []).map((rareItem) => {
                          const item = allItems.find(i => i.id === rareItem.itemId);
                          if (!item) return null;
                          
                          return (
                            <div key={rareItem.itemId} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 flex items-center gap-3">
                              <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                                <img 
                                  src={item.spriteUrl}
                                  alt={item.name}
                                  className="max-w-full max-h-full object-contain"
                                  style={{ imageRendering: 'pixelated', transform: 'scale(1.5)' }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-sm text-gray-800">{item.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    value={rareItem.price}
                                    onChange={(e) => handleUpdateRarePoolPrice(rareItem.itemId, e.target.value)}
                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:border-purple-500 focus:outline-none bg-white"
                                  />
                                  <span className="text-xs text-gray-600">원</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFromRarePool(rareItem.itemId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t-2 border-purple-200 bg-purple-50">
                    <button
                      onClick={handleRandomRareItem}
                      disabled={(shopData.rareItemPool || []).length === 0}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Star size={20} />
                      오늘의 희귀템 랜덤 설정
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGachaPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[700px] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <CircleDot className="text-orange-600" size={24} />
                  규토리볼 관리
                </h3>
                <p className="text-sm text-gray-600 mt-1">상점에서 판매할 몬스터볼 2종을 선택합니다</p>
              </div>
              <button
                onClick={() => {
                  setShowGachaPanel(false);
                  setSelectedItem(null);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 p-6 h-full">
                <div className="flex flex-col overflow-hidden">
                  <div className="space-y-4 mb-4 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="몬스터볼 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-4">
                      {allItems
                        .filter(item => {
                          const pocket = item.categoryData?.pocket || item.pocket || 'misc';
                          if (pocket !== 'pokeballs') return false;
                          if (!searchQuery) return true;
                          const query = searchQuery.toLowerCase();
                          return item.name.toLowerCase().includes(query);
                        })
                        .slice(0, 30)
                        .map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleAddGachaBall(item)}
                            className="flex flex-col border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-lg transition-all group bg-white overflow-hidden"
                          >
                            <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center">
                              <img 
                                src={item.spriteUrl || item.imageUrl} 
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                              />
                            </div>
                            
                            <div className="p-2 bg-white border-t border-gray-200">
                              <div className="text-xs font-semibold text-center truncate text-gray-800 group-hover:text-orange-700">
                                {item.name}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-orange-500 rounded-2xl bg-white overflow-hidden flex flex-col h-full flex-shrink-0">
                  <div className="bg-orange-50 p-4 border-b-2 border-orange-200">
                    <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <CircleDot size={20} />
                      규토리볼 설정
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">선택한 볼 2종이 랜덤으로 나옵니다</p>
                  </div>

                  <div className="p-4 bg-orange-50 border-b-2 border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-800">상점 노출</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shopData.gachaBall?.enabled || false}
                          onChange={(e) => handleToggleGacha(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                      {(shopData.gachaBall?.balls || []).map((ballItem) => {
                        const item = allItems.find(i => i.id === ballItem.itemId);
                        if (!item) return null;
                        
                        return (
                          <div key={ballItem.itemId} className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-16 h-16 bg-white rounded flex items-center justify-center">
                              <img 
                                src={item.spriteUrl}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-lg text-gray-800">{item.name}</div>
                              <div className="text-sm text-gray-600 mt-1">{item.effect}</div>
                            </div>
                            <button
                              onClick={() => handleRemoveGachaBall(ballItem.itemId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        );
                      })}
                      
                      {(shopData.gachaBall?.balls || []).length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          <CircleDot size={64} className="mx-auto mb-3 text-gray-300" />
                          <p>선택된 볼이 없습니다</p>
                          <p className="text-sm mt-1">왼쪽에서 몬스터볼을 선택해주세요</p>
                        </div>
                      )}
                      
                      {(shopData.gachaBall?.balls || []).length === 1 && (
                        <div className="text-center py-8 text-orange-600 bg-orange-50 rounded-lg border-2 border-dashed border-orange-300">
                          <p className="font-semibold">1개 더 선택해주세요!</p>
                          <p className="text-sm mt-1">총 2개의 볼이 필요합니다</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(shopData.gachaBall?.balls || []).length === 2 && (
                    <div className="p-4 border-t-2 border-orange-200 bg-orange-50">
                      <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                        <p className="font-bold text-green-800">✓ 규토리볼 설정 완료!</p>
                        <p className="text-sm text-green-700 mt-1">상점 노출 스위치를 켜면 판매가 시작됩니다</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}