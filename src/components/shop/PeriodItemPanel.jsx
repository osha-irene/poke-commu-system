// ============================================
// src/components/shop/PeriodItemPanel.jsx 로 저장
// ============================================

import React, { useState, useMemo, useEffect } from 'react';
import { CalendarClock, Trash2, Search } from 'lucide-react';
import { CATEGORIES, getItemIcon, filterItemsByPocket } from '../../utils/itemUtils';

export default function PeriodItemPanel({
  shopData,
  allItems,
  onUpdateShop
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [isPeriodEnabled, setIsPeriodEnabled] = useState(false);

  useEffect(() => {
    setIsPeriodEnabled(shopData.periodItemConfig?.enabled || false);
  }, [shopData]);

  const filteredItems = useMemo(() => {
    let filtered = allItems;

    if (category !== 'all') {
      filtered = filterItemsByPocket(filtered, category);
    }

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
  }, [allItems, category, searchQuery]);

  const handleTogglePeriodEnabled = async () => {
    const newValue = !isPeriodEnabled;
    setIsPeriodEnabled(newValue);

    const updatedShopData = JSON.parse(JSON.stringify(shopData));

    if (!updatedShopData.periodItemConfig) {
      updatedShopData.periodItemConfig = { enabled: newValue };
    } else {
      updatedShopData.periodItemConfig.enabled = newValue;
    }

    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('기간한정 아이템 노출 상태 변경 실패:', error);
      setIsPeriodEnabled(!newValue);
    }
  };

  const handleQuickAddToPeriodPool = async (item) => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    const periodPool = updatedShopData.periodItemPool || [];

    if (periodPool.some(i => i.itemId === item.id)) {
      updatedShopData.periodItemPool = periodPool.filter(i => i.itemId !== item.id);
      if (updatedShopData.periodItem?.itemId === item.id) {
        updatedShopData.periodItem = null;
      }

      try {
        await onUpdateShop(updatedShopData);
      } catch (error) {
        console.error('기간한정 아이템 제거 실패:', error);
        alert('기간한정 아이템 제거 중 오류가 발생했습니다.');
      }
      return;
    }

    const defaultPrice = item.cost || 100;
    updatedShopData.periodItemPool = [...periodPool, { itemId: item.id, price: defaultPrice, stock: 10 }];

    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('기간한정 아이템 추가 실패:', error);
      alert('기간한정 아이템 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdatePeriodPoolField = async (itemId, field, value) => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.periodItemPool = (updatedShopData.periodItemPool || []).map(i =>
      i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
    );

    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('기간한정 아이템 수정 실패:', error);
    }
  };

  const handleRemoveFromPeriodPool = async (itemId) => {
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.periodItemPool = (updatedShopData.periodItemPool || []).filter(
      i => i.itemId !== itemId
    );
    if (updatedShopData.periodItem?.itemId === itemId) {
      updatedShopData.periodItem = null;
    }

    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('기간한정 아이템 제거 실패:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarClock className="text-cyan-600" size={24} />
            기간한정 아이템 관리
          </h3>
          <p className="text-sm text-gray-600 mt-1">매주 랜덤으로 선택되어 한 주 동안 판매될 기간한정 아이템을 관리합니다</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-2 gap-6 h-full">
          <div className="flex flex-col border-2 border-gray-200 rounded-xl overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200 space-y-4 bg-gray-50 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="아이템 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(cat => {
                  const IconComponent = cat.Icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                        category === cat.id
                          ? cat.color + ' shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent size={16} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-sm text-gray-600">
                {filteredItems.length}개의 아이템
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="grid grid-cols-4 gap-3">
                {filteredItems.map(item => {
                  const ItemIcon = getItemIcon(item);
                  const isInPool = (shopData.periodItemPool || []).some(pi => pi.itemId === item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleQuickAddToPeriodPool(item)}
                      className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                        isInPool
                          ? 'border-cyan-500 bg-cyan-50 shadow-md'
                          : 'border-gray-200 hover:border-cyan-300 hover:shadow-md'
                      }`}
                    >
                      {isInPool && (
                        <div className="absolute top-1 right-1 bg-cyan-500 text-white rounded-full p-1 z-10">
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
                          <ItemIcon size={32} className="text-gray-300" />
                        )}
                      </div>
                      <div className="p-2 bg-white border-t border-gray-200">
                        <div className={`text-xs font-semibold text-center truncate ${
                          isInPool ? 'text-cyan-700' : 'text-gray-800 group-hover:text-cyan-700'
                        }`}>
                          {item.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col border-2 border-cyan-200 rounded-xl overflow-hidden h-full">
            <div className="bg-cyan-50 p-4 border-b-2 border-cyan-200 flex-shrink-0 space-y-3">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock size={20} className="text-cyan-600" />
                기간한정 아이템 후보 ({(shopData.periodItemPool || []).length}개)
              </h4>

              <div className="bg-white rounded-lg p-3 border-2 border-cyan-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800">상점 노출</span>
                  <button
                    onClick={handleTogglePeriodEnabled}
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      isPeriodEnabled ? 'bg-cyan-600' : 'bg-gray-200'
                    }`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                        isPeriodEnabled ? 'translate-x-full' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </button>
                </div>
              </div>

              {shopData.periodItem?.itemId && (
                <div className="bg-white rounded-lg p-3 border-2 border-cyan-200 text-xs text-gray-600">
                  이번 주 선택된 아이템: <span className="font-bold text-cyan-700">
                    {allItems.find(i => i.id === shopData.periodItem.itemId)?.name || '알 수 없음'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(shopData.periodItemPool || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <CalendarClock size={64} className="mb-4 text-gray-300" />
                  <p className="text-lg font-semibold">등록된 기간한정 아이템이 없습니다</p>
                  <p className="text-sm mt-2">왼쪽에서 아이템을 선택해주세요</p>
                </div>
              ) : (
                (shopData.periodItemPool || []).map((periodPoolItem) => {
                  const item = allItems.find(i => i.id === periodPoolItem.itemId);
                  if (!item) return null;

                  return (
                    <div key={periodPoolItem.itemId} className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded flex items-center justify-center flex-shrink-0">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm truncate">{item.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            value={periodPoolItem.price}
                            onChange={(e) => handleUpdatePeriodPoolField(periodPoolItem.itemId, 'price', e.target.value)}
                            className="w-20 border border-cyan-300 rounded px-2 py-1 text-xs text-center focus:border-cyan-500 focus:outline-none bg-white"
                            placeholder="가격"
                          />
                          <input
                            type="number"
                            value={periodPoolItem.stock}
                            onChange={(e) => handleUpdatePeriodPoolField(periodPoolItem.itemId, 'stock', e.target.value)}
                            className="w-16 border border-cyan-300 rounded px-2 py-1 text-xs text-center focus:border-cyan-500 focus:outline-none bg-white"
                            placeholder="재고"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromPeriodPool(periodPoolItem.itemId)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
