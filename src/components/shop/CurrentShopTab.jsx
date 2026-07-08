// ============================================
// src/components/shop/CurrentShopTab.jsx 로 저장
// ============================================

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Store, Save, CheckCircle } from 'lucide-react';
import { DAYS, TYPE_STYLES } from '../../utils/shopConstants';
import { getFilteredShopItems } from '../../utils/shopHelpers';

export default function CurrentShopTab({ 
  shopData, 
  allItems, 
  onUpdateShop, 
  onOpenAddModal 
}) {
  const [filterDay, setFilterDay] = useState('all');
  const [draftShopData, setDraftShopData] = useState(() => JSON.parse(JSON.stringify(shopData || {})));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftShopData(JSON.parse(JSON.stringify(shopData || {})));
    }
  }, [shopData, hasUnsavedChanges]);

  // 디버그 로그
  useEffect(() => {
    console.log('===== CurrentShopTab 디버그 =====');
    console.log('draftShopData:', draftShopData);
    console.log('draftShopData.rareItemConfig:', draftShopData.rareItemConfig);
    console.log('draftShopData.rareItemConfig?.enabled:', draftShopData.rareItemConfig?.enabled);
    console.log('draftShopData.rareDailyItem:', draftShopData.rareDailyItem);
    console.log('draftShopData.rareDailyItem?.itemId:', draftShopData.rareDailyItem?.itemId);
    console.log('draftShopData.gachaBall:', draftShopData.gachaBall);
    console.log('draftShopData.gachaBall?.enabled:', draftShopData.gachaBall?.enabled);
    console.log('draftShopData.gachaBall?.balls:', draftShopData.gachaBall?.balls);
    
    const allShopItems = getFilteredShopItems(draftShopData, filterDay);
    console.log('getFilteredShopItems 결과:', allShopItems);
    console.log('희귀템 포함 여부:', allShopItems.some(item => item.type === 'rare'));
    console.log('===========================');
  }, [draftShopData, filterDay]);

  const markDirty = (nextShopData) => {
    setDraftShopData(nextShopData);
    setHasUnsavedChanges(true);
    setSaveStatus('');
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    try {
      setIsSaving(true);
      await onUpdateShop(draftShopData);
      setHasUnsavedChanges(false);
      setSaveStatus('저장 완료');
    } catch (error) {
      console.error('상점 변경사항 저장 실패:', error);
      setSaveStatus('저장 실패');
      alert('상점 변경사항 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = (itemId, type, day) => {
    const updatedShopData = JSON.parse(JSON.stringify(draftShopData));
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) updatedShopData.dailyItems = {};
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).filter(
        i => i.itemId !== itemId
      );
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).filter(
        i => i.itemId !== itemId
      );
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = { itemId: null, price: 0, lastRefresh: null };
    } else if (type === 'period') {
      updatedShopData.periodItem = { itemId: null, price: 0, stock: 0, lastRefresh: null };
    }

    markDirty(updatedShopData);
  };

  const handleUpdateItem = (itemId, type, day, field, value) => {
    const updatedShopData = JSON.parse(JSON.stringify(draftShopData));
    const nextValue = field === 'isPersistent' ? Boolean(value) : parseInt(value) || 0;
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) updatedShopData.dailyItems = {};
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: nextValue } : i
      );
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: nextValue } : i
      );
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = {
        ...updatedShopData.rareDailyItem,
        [field]: nextValue
      };
    } else if (type === 'period') {
      updatedShopData.periodItem = {
        ...updatedShopData.periodItem,
        [field]: nextValue
      };
    }

    markDirty(updatedShopData);
  };

  const filteredItems = getFilteredShopItems(draftShopData, filterDay);
  
  console.log('렌더링 시점 - filteredItems:', filteredItems);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Store size={24} />
          현재 상점 상품
        </h3>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm font-semibold text-amber-700">저장되지 않은 변경사항</span>
          )}
          {!hasUnsavedChanges && saveStatus === '저장 완료' && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
              <CheckCircle size={16} />
              저장 완료
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges || isSaving}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              hasUnsavedChanges && !isSaving
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={16} />
            {isSaving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>
      
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
          {DAYS.map(day => (
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
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        <button
          onClick={onOpenAddModal}
          className="aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2"
        >
          <Plus size={48} className="text-indigo-600" />
          <span className="text-sm font-bold text-indigo-600">새 상품 추가</span>
        </button>

        {filteredItems.length === 0 && (
          <div className="col-span-4 text-center py-8 text-gray-400">
            <p>표시할 상품이 없습니다</p>
            <p className="text-sm mt-2">콘솔을 확인해주세요</p>
          </div>
        )}

        {filteredItems.map((shopItem, index) => {
          const item = allItems.find(i => i.id === shopItem.itemId);
          
          console.log(`아이템 렌더링 [${index}]:`, {
            shopItem,
            foundItem: item,
            type: shopItem.type
          });
          
          if (!item) {
            console.warn(`아이템을 찾을 수 없음: ${shopItem.itemId}`);
            return null;
          }
          
          const style = TYPE_STYLES[shopItem.type];
          
          return (
            <div 
              key={`${shopItem.type}-${shopItem.itemId}-${index}`} 
              className={`border-2 ${style.border} rounded-xl ${style.bg} flex flex-col relative group`}
            >
              <div className="absolute top-2 left-2 z-10">
                <span className={`text-xs px-2 py-1 rounded ${style.labelBg} ${style.labelText} font-semibold`}>
                  {shopItem.type === 'daily'
                    ? DAYS.find(d => d.id === shopItem.day)?.name
                    : shopItem.type === 'permanent'
                      ? '상시'
                      : shopItem.type === 'period'
                        ? '기간한정'
                        : '한정'}
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
                    src={item.spriteUrl || item.imageUrl}                      
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                  />
                </div>
                
                <div className="space-y-2 flex-1">
                  <div className="font-bold text-sm text-gray-800 text-center">
                    {item.name}
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-gray-600 whitespace-nowrap">가격</span>
                      <input
                        type="number"
                        value={shopItem.price}
                        onChange={(e) => handleUpdateItem(
                          shopItem.itemId,
                          shopItem.type,
                          shopItem.day,
                          'price',
                          e.target.value
                        )}
                        className="w-full border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
                      />
                    </div>
                    {shopItem.type !== 'rare' && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-gray-600 whitespace-nowrap">재고</span>
                        <input
                          type="number"
                          value={shopItem.stock}
                          onChange={(e) => handleUpdateItem(
                            shopItem.itemId,
                            shopItem.type,
                            shopItem.day,
                            'stock',
                            e.target.value
                          )}
                          className="w-full border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
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
  );
}
