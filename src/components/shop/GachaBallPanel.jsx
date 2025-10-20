// ============================================
// src/components/shop/GachaBallPanel.jsx 로 저장
// ============================================

import React, { useState, useMemo } from 'react';
import { CircleDot, Trash2, Search, Package, X } from 'lucide-react';
import { getItemIcon } from '../../utils/itemUtils';

export default function GachaBallPanel({ 
  shopData, 
  allItems, 
  onUpdateShop 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const isGachaEnabled = shopData.gachaBall?.enabled || false;

  const filteredGachaBalls = useMemo(() => {
    let filtered = allItems.filter(item => {
      const category = item.category?.toLowerCase() || '';
      const categoryName = item.categoryData?.name?.toLowerCase() || '';
      
      return category === 'apricorn-balls' || categoryName === '몬스터볼';
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query) ||
        item.effect?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allItems, searchQuery]);

  const handleToggleGacha = async () => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    updatedShopData.gachaBall.enabled = !isGachaEnabled;
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('규토리볼 노출 상태 변경 실패:', error);
    }
  };

  const handleAddGachaBall = async (item) => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    if (updatedShopData.gachaBall.balls.some(b => b.itemId === item.id)) {
      updatedShopData.gachaBall.balls = updatedShopData.gachaBall.balls.filter(
        b => b.itemId !== item.id
      );
      
      try {
        await onUpdateShop(updatedShopData);
      } catch (error) {
        console.error('규토리볼 제거 실패:', error);
      }
      return;
    }
    
    if (updatedShopData.gachaBall.balls.length >= 2) {
      alert('최대 2개까지만 선택할 수 있습니다!');
      return;
    }
    
    updatedShopData.gachaBall.balls.push({ itemId: item.id });
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('규토리볼 추가 실패:', error);
    }
  };

  const handleRemoveGachaBall = async (itemId) => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    updatedShopData.gachaBall.balls = updatedShopData.gachaBall.balls.filter(
      b => b.itemId !== itemId
    );
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('규토리볼 제거 실패:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CircleDot className="text-orange-600" size={24} />
            규토리볼 관리
          </h3>
          <p className="text-sm text-gray-600 mt-1">상점에서 판매할 몬스터볼 2종을 선택합니다</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-2 gap-6 h-full">
          <div className="flex flex-col border-2 border-gray-200 rounded-xl overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50 flex-shrink-0">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} />
                몬스터볼 선택
              </h4>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="몬스터볼 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="text-sm text-gray-600">
                {filteredGachaBalls.length}개의 몬스터볼 • 최대 2개 선택 가능
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {filteredGachaBalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <CircleDot size={64} className="mb-4 text-gray-300" />
                  <p className="text-lg font-semibold">몬스터볼을 찾을 수 없습니다</p>
                  <p className="text-sm mt-2">검색어를 확인해주세요</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredGachaBalls.map(item => {
                    const isSelected = (shopData.gachaBall?.balls || []).some(b => b.itemId === item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAddGachaBall(item)}
                        className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1 z-10">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <div className="aspect-square bg-gray-50 p-3 flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                            />
                          ) : (
                            <CircleDot size={32} className="text-gray-300" />
                          )}
                        </div>
                        <div className="p-2 bg-white border-t border-gray-200">
                          <div className={`text-xs font-semibold text-center truncate ${
                            isSelected ? 'text-orange-700' : 'text-gray-800 group-hover:text-orange-700'
                          }`}>
                            {item.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-800">상점 노출</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGachaEnabled}
                    onChange={handleToggleGacha}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </div>

            <div className="border-2 border-orange-500 rounded-2xl bg-white overflow-hidden flex flex-col flex-1">
              <div className="bg-orange-50 p-4 border-b-2 border-orange-200 flex-shrink-0">
                <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <CircleDot size={20} />
                  규토리볼 설정
                </h4>
                <p className="text-xs text-gray-600 mt-1">선택한 볼 2종이 랜덤으로 나옵니다</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {(shopData.gachaBall?.balls || []).map((ballItem) => {
                    const item = allItems.find(i => i.id === ballItem.itemId);
                    if (!item) return null;
                    
                    return (
                      <div key={ballItem.itemId} className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-16 h-16 bg-white rounded flex items-center justify-center">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain"
                              style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg text-gray-800">{item.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{item.effect || item.description}</div>
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
                <div className="p-4 border-t-2 border-orange-200 bg-orange-50 flex-shrink-0">
                  <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                    <p className="font-bold text-green-800">규토리볼 설정 완료!</p>
                    <p className="text-sm text-green-700 mt-1">상점 노출 스위치를 켜면 판매가 시작됩니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}