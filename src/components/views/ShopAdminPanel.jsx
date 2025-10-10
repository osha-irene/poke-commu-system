import React, { useState } from 'react';
import { Plus, Trash2, Star, Calendar } from 'lucide-react';

export default function ShopAdminPanel({ 
  shopData = {},
  allItems = [],
  onUpdateShop 
}) {
  const [selectedDay, setSelectedDay] = useState('monday');
  const [editMode, setEditMode] = useState('daily'); // 'daily' | 'permanent' | 'rare'
  const [selectedItem, setSelectedItem] = useState(null);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(99);
  const [searchQuery, setSearchQuery] = useState('');
  
  const days = [
    { id: 'monday', name: '월요일' },
    { id: 'tuesday', name: '화요일' },
    { id: 'wednesday', name: '수요일' },
    { id: 'thursday', name: '목요일' },
    { id: 'friday', name: '금요일' },
    { id: 'saturday', name: '토요일' },
    { id: 'sunday', name: '일요일' }
  ];
  
  // 아이템 검색
  const filteredItems = allItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.nameEn?.toLowerCase().includes(query) ||
      item.id.toString().includes(query)
    );
  }).slice(0, 30);
  
  // 현재 편집 중인 목록
  const getCurrentList = () => {
    if (editMode === 'daily') {
      return shopData.dailyItems?.[selectedDay] || [];
    } else if (editMode === 'permanent') {
      return shopData.permanentItems || [];
    }
    return [];
  };
  
  // 아이템 추가
  const handleAddItem = () => {
    if (!selectedItem) {
      alert('아이템을 선택해주세요!');
      return;
    }
    
    const newItem = {
      itemId: selectedItem.id,
      price: price || selectedItem.cost || 100,
      stock: stock
    };
    
    let updatedShopData = { ...shopData };
    
    if (editMode === 'daily') {
      const currentItems = updatedShopData.dailyItems?.[selectedDay] || [];
      // 중복 체크
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.dailyItems = {
        ...updatedShopData.dailyItems,
        [selectedDay]: [...currentItems, newItem]
      };
    } else if (editMode === 'permanent') {
      const currentItems = updatedShopData.permanentItems || [];
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.permanentItems = [...currentItems, newItem];
    } else if (editMode === 'rare') {
      updatedShopData.rareDailyItem = {
        itemId: newItem.itemId,
        price: newItem.price,
        lastRefresh: new Date().toISOString().split('T')[0]
      };
    }
    
    onUpdateShop(updatedShopData);
    setSelectedItem(null);
    setPrice(0);
    setStock(99);
  };
  
  // 아이템 제거
  const handleRemoveItem = (itemId) => {
    let updatedShopData = { ...shopData };
    
    if (editMode === 'daily') {
      updatedShopData.dailyItems = {
        ...updatedShopData.dailyItems,
        [selectedDay]: (updatedShopData.dailyItems?.[selectedDay] || []).filter(i => i.itemId !== itemId)
      };
    } else if (editMode === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).filter(i => i.itemId !== itemId);
    }
    
    onUpdateShop(updatedShopData);
  };
  
  // 가격/재고 수정
  const handleUpdateItem = (itemId, field, value) => {
    let updatedShopData = { ...shopData };
    
    if (editMode === 'daily') {
      updatedShopData.dailyItems = {
        ...updatedShopData.dailyItems,
        [selectedDay]: (updatedShopData.dailyItems?.[selectedDay] || []).map(i => 
          i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
        )
      };
    } else if (editMode === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
      );
    }
    
    onUpdateShop(updatedShopData);
  };
  
  // 희귀 아이템 랜덤 설정
  const handleRandomRareItem = () => {
    const rareItems = allItems.filter(item => 
      item.category?.includes('vitamin') || 
      item.category?.includes('evolution') ||
      item.cost > 2000
    );
    
    if (rareItems.length === 0) {
      alert('희귀 아이템이 없습니다!');
      return;
    }
    
    const randomItem = rareItems[Math.floor(Math.random() * rareItems.length)];
    const randomPrice = Math.floor((randomItem.cost || 1000) * (0.8 + Math.random() * 0.4)); // ±20% 랜덤
    
    let updatedShopData = { ...shopData };
    updatedShopData.rareDailyItem = {
      itemId: randomItem.id,
      price: randomPrice,
      lastRefresh: new Date().toISOString().split('T')[0]
    };
    
    onUpdateShop(updatedShopData);
    alert(`${randomItem.name}이(가) 오늘의 희귀템으로 설정되었습니다!`);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🏪 상점 관리</h3>
      
      {/* 편집 모드 선택 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setEditMode('daily')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            editMode === 'daily'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Calendar size={18} />
          요일별 상품
        </button>
        <button
          onClick={() => setEditMode('permanent')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
            editMode === 'permanent'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          상시 판매
        </button>
        <button
          onClick={() => setEditMode('rare')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            editMode === 'rare'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Star size={18} />
          희귀템
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 현재 목록 */}
        <div>
          {editMode === 'daily' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">요일 선택</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {days.map(day => (
                  <option key={day.id} value={day.id}>{day.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <h4 className="font-semibold mb-3">
            {editMode === 'daily' ? `${days.find(d => d.id === selectedDay)?.name} 상품` : 
             editMode === 'permanent' ? '상시 판매 아이템' : '오늘의 희귀템'}
          </h4>
          
          {editMode === 'rare' ? (
            <div>
              {shopData.rareDailyItem?.itemId ? (
                (() => {
                  const item = allItems.find(i => i.id === shopData.rareDailyItem.itemId);
                  return item ? (
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <img 
                          src={item.spriteUrl} 
                          alt={item.name}
                          className="w-16 h-16"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-lg">{item.name}</div>
                          <div className="text-sm text-purple-600 font-bold">₽{shopData.rareDailyItem.price.toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('희귀템을 제거하시겠습니까?')) {
                              let updatedShopData = { ...shopData };
                              updatedShopData.rareDailyItem = { itemId: null, price: 0, lastRefresh: null };
                              onUpdateShop(updatedShopData);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="text-center py-8 text-gray-400">
                  희귀템이 설정되지 않았습니다
                </div>
              )}
              
              <button
                onClick={handleRandomRareItem}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
              >
                <Star size={18} />
                랜덤 희귀템 설정
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getCurrentList().length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  등록된 상품이 없습니다
                </div>
              ) : (
                getCurrentList().map(shopItem => {
                  const item = allItems.find(i => i.id === shopItem.itemId);
                  if (!item) return null;
                  
                  return (
                    <div key={shopItem.itemId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <img 
                          src={item.spriteUrl} 
                          alt={item.name}
                          className="w-12 h-12"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="flex-1">
                          <div className="font-bold">{item.name}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(shopItem.itemId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">가격</label>
                          <input
                            type="number"
                            value={shopItem.price}
                            onChange={(e) => handleUpdateItem(shopItem.itemId, 'price', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">재고</label>
                          <input
                            type="number"
                            value={shopItem.stock}
                            onChange={(e) => handleUpdateItem(shopItem.itemId, 'stock', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 오른쪽: 아이템 추가 */}
        {editMode !== 'rare' && (
          <div>
            <h4 className="font-semibold mb-3">아이템 추가</h4>
            
            {/* 검색 */}
            <input
              type="text"
              placeholder="아이템 이름 또는 ID로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:border-indigo-500 focus:outline-none"
            />
            
            {/* 아이템 선택 */}
            <div className="border border-gray-300 rounded-lg h-64 overflow-y-auto mb-3">
              {searchQuery === '' ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  아이템을 검색하세요
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  검색 결과가 없습니다
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setPrice(item.cost || 100);
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-indigo-100 border-2 border-indigo-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <img 
                        src={item.spriteUrl} 
                        alt={item.name}
                        className="w-10 h-10"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">기본가: ₽{item.cost || 100}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* 선택된 아이템 설정 */}
            {selectedItem && (
              <div className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-300 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={selectedItem.spriteUrl} 
                    alt={selectedItem.name}
                    className="w-16 h-16"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-lg">{selectedItem.name}</div>
                    <div className="text-sm text-gray-600">{selectedItem.effect?.replace(/\n/g, ' ')}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">판매 가격</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">재고 (99=무제한)</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleAddItem}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  추가하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}