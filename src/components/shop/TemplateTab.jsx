// ============================================
// src/components/shop/TemplateTab.jsx 로 저장
// ============================================

import React, { useState } from 'react';
import { RefreshCw, Save, Package, Calendar, Plus, Trash2 } from 'lucide-react';
import { DAYS } from '../../utils/shopConstants';
import ItemSelectorModal from '../modals/ItemSelectorModal';

export default function TemplateTab({ 
  shopData, 
  allItems, 
  onUpdateShop 
}) {
  const [editMode, setEditMode] = useState(false);
  const [tempTemplate, setTempTemplate] = useState(null);
  const [itemSelectorDay, setItemSelectorDay] = useState(null);

  const startEdit = () => {
    setTempTemplate(JSON.parse(JSON.stringify(shopData.initialDailyItems || {})));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setTempTemplate(null);
    setEditMode(false);
  };

  const saveTemplate = async () => {
    try {
      const updatedShopData = {
        ...shopData,
        initialDailyItems: tempTemplate
      };
      await onUpdateShop(updatedShopData);
      alert('요일별 아이템이 저장되었습니다!\n다음 주 월요일부터 이 재고로 리셋됩니다.');
      setEditMode(false);
      setTempTemplate(null);
    } catch (error) {
      console.error('요일별 아이템 저장 실패:', error);
      alert('요일별 아이템 저장 중 오류가 발생했습니다.');
    }
  };

  const updateTemplateItem = (day, itemId, field, value) => {
    const updated = { ...tempTemplate };
    const nextValue = field === 'isPersistent' ? Boolean(value) : parseInt(value) || 0;
    updated[day] = (updated[day] || []).map(item => 
      item.itemId === itemId ? { ...item, [field]: nextValue } : item
    );
    setTempTemplate(updated);
  };

  const removeTemplateItem = (day, itemId) => {
    const updated = { ...tempTemplate };
    updated[day] = (updated[day] || []).filter(item => item.itemId !== itemId);
    setTempTemplate(updated);
  };

  const addTemplateItem = (day, itemId, price, stock) => {
    const updated = { ...tempTemplate };
    if (!updated[day]) updated[day] = [];
    
    if (updated[day].some(item => item.itemId === itemId)) {
      alert('이미 추가된 아이템입니다!');
      return;
    }
    
    updated[day].push({ itemId, price, stock, isPersistent: true });
    setTempTemplate(updated);
  };

  const closeItemSelector = () => {
    setItemSelectorDay(null);
  };

  const handleSelectItem = (item) => {
    if (!itemSelectorDay || !item) {
      closeItemSelector();
      return;
    }

    const defaultPrice = Number(item.price ?? item.buyPrice ?? item.cost ?? 100) || 100;
    addTemplateItem(itemSelectorDay, item.id, defaultPrice, 10);
    closeItemSelector();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-lime-300 bg-white/55 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-green-950">
              <RefreshCw size={28} className="text-lime-700" />
              요일별 아이템 관리
            </h3>
            <p className="text-green-800">
              매주 월요일 00:00에 요일별 아이템 재고가 자동 리셋됩니다
            </p>
          </div>
          <div className="flex gap-2">
            {!editMode ? (
              <button
                onClick={startEdit}
                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <Package size={20} />
                편집하기
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveTemplate}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Save size={20} />
                  저장
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {editMode && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-gray-800 mb-1">편집 모드</div>
              <div className="text-sm text-gray-600">
                여기서 수정한 내용은 다음 주 월요일부터 적용됩니다.<br/>
                현재 진행 중인 이번 주 재고에는 영향을 주지 않습니다.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {DAYS.map((day) => {
          const displayData = editMode ? tempTemplate : (shopData.initialDailyItems || {});
          const dayItems = displayData[day.id] || [];
          
          return (
            <div key={day.id} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
              <div className="bg-blue-50 border-b-2 border-blue-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-blue-600" />
                  <h4 className="font-bold text-lg text-gray-800">{day.name}</h4>
                  <span className="text-sm text-gray-600">
                    ({dayItems.length}개 아이템)
                  </span>
                </div>
                
                {editMode && (
                  <button
                    onClick={() => setItemSelectorDay(day.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    아이템 추가
                  </button>
                )}
              </div>

              <div className="p-4">
                {dayItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>등록된 아이템이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayItems.map((item) => {
                      const itemData = allItems.find(i => i.id === item.itemId);
                      
                      return (
                        <div
                          key={item.itemId}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="w-16 h-16 flex items-center justify-center bg-white rounded-lg border border-gray-300">
                            <img
                              src={itemData?.spriteUrl || itemData?.imageUrl}
                              alt={itemData?.name || item.itemId}
                              className="max-w-full max-h-full"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="font-bold text-gray-800">
                              {itemData?.name || item.itemId}
                            </div>
                            <div className="text-sm text-gray-600">
                              {itemData?.effect || itemData?.description || '설명 없음'}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                checked={!item.isPersistent}
                                onChange={(e) => updateTemplateItem(
                                  day.id,
                                  item.itemId,
                                  'isPersistent',
                                  !e.target.checked
                                )}
                                disabled={!editMode}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              이번주만 판매
                            </label>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600 whitespace-nowrap">가격</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateTemplateItem(day.id, item.itemId, 'price', e.target.value)}
                                disabled={!editMode}
                                className={`w-20 border ${editMode ? 'border-gray-300' : 'border-transparent'} rounded px-2 py-1 text-sm text-center focus:border-indigo-500 focus:outline-none bg-white`}
                              />
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600 whitespace-nowrap">재고</span>
                              <input
                                type="number"
                                value={item.stock}
                                onChange={(e) => updateTemplateItem(day.id, item.itemId, 'stock', e.target.value)}
                                disabled={!editMode}
                                className={`w-16 border ${editMode ? 'border-gray-300' : 'border-transparent'} rounded px-2 py-1 text-sm text-center focus:border-indigo-500 focus:outline-none bg-white`}
                              />
                            </div>

                            {editMode && (
                              <button
                                onClick={() => removeTemplateItem(day.id, item.itemId)}
                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ItemSelectorModal
        show={Boolean(itemSelectorDay)}
        onClose={closeItemSelector}
        onSelect={handleSelectItem}
        items={allItems}
        title="요일별 아이템에 추가할 아이템 선택"
      />
    </div>
  );
}
