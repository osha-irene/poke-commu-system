import React, { useState } from 'react';
import { Coins, Package, Apple, TreePine, X } from 'lucide-react';

export default function RegionLootSettingsModal({ region, allItems, onClose, onSave }) {
  const [lootConfig, setLootConfig] = useState(region.lootConfig || {
    money: { min: 50, max: 200 },
    itemCount: { min: 0, max: 2 },
    itemPool: [],
    ingredientCount: { min: 0, max: 1 },
    ingredientPool: [],
    berryCount: { min: 0, max: 1 },
    berryPool: []
  });

  // 모든 아이템 통합
  const availableItems = allItems.filter(i => 
    i.category === 'misc' || 
    i.category === 'ball' || 
    i.category === 'medicine' || 
    i.category === 'vitamin' ||
    i.category === 'ingredient' ||
    i.category === 'berry' ||
    i.isIngredient === true
  );

  const toggleItem = (itemId, item) => {
    // 아이템 카테고리에 따라 적절한 풀에 추가
    let poolName = 'itemPool';
    if (item.category === 'berry') {
      poolName = 'berryPool';
    } else if (item.category === 'ingredient' || item.isIngredient) {
      poolName = 'ingredientPool';
    }

    const current = lootConfig[poolName] || [];
    setLootConfig({
      ...lootConfig,
      [poolName]: current.includes(itemId) 
        ? current.filter(id => id !== itemId)
        : [...current, itemId]
    });
  };

  const isItemSelected = (itemId, item) => {
    if (item.category === 'berry') {
      return (lootConfig.berryPool || []).includes(itemId);
    } else if (item.category === 'ingredient' || item.isIngredient) {
      return (lootConfig.ingredientPool || []).includes(itemId);
    }
    return (lootConfig.itemPool || []).includes(itemId);
  };

  const updateCount = (type, field, value) => {
    setLootConfig({
      ...lootConfig,
      [type]: { ...lootConfig[type], [field]: parseInt(value) || 0 }
    });
  };

  const handleSave = () => onSave(region.id, lootConfig);

  const totalSelected = (lootConfig.itemPool || []).length + 
                        (lootConfig.ingredientPool || []).length + 
                        (lootConfig.berryPool || []).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{region.name} - 탐험 보상 설정</h3>
            <p className="text-indigo-100 text-sm mt-1">포켓몬 인카운터 시 획득할 보상을 설정하세요</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 상단: 골드 + 개수 설정 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 골드 설정 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="text-gray-700" size={20} />
                <h4 className="font-bold text-gray-800">골드 획득 범위</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소 금액</label>
                  <input
                    type="number"
                    value={lootConfig.money.min}
                    onChange={(e) => updateCount('money', 'min', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최대 금액</label>
                  <input
                    type="number"
                    value={lootConfig.money.max}
                    onChange={(e) => updateCount('money', 'max', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 아이템 개수 설정 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Package className="text-gray-700" size={20} />
                <h4 className="font-bold text-gray-800">아이템 획득 개수</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
                  <input
                    type="number"
                    value={lootConfig.itemCount.min}
                    onChange={(e) => updateCount('itemCount', 'min', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
                  <input
                    type="number"
                    value={lootConfig.itemCount.max}
                    onChange={(e) => updateCount('itemCount', 'max', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 식재료 개수 설정 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Apple className="text-gray-700" size={20} />
                <h4 className="font-bold text-gray-800">식재료 획득 개수</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
                  <input
                    type="number"
                    value={lootConfig.ingredientCount.min}
                    onChange={(e) => updateCount('ingredientCount', 'min', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
                  <input
                    type="number"
                    value={lootConfig.ingredientCount.max}
                    onChange={(e) => updateCount('ingredientCount', 'max', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 나무열매 개수 설정 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <TreePine className="text-gray-700" size={20} />
                <h4 className="font-bold text-gray-800">나무열매 획득 개수</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
                  <input
                    type="number"
                    value={lootConfig.berryCount.min}
                    onChange={(e) => updateCount('berryCount', 'min', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
                  <input
                    type="number"
                    value={lootConfig.berryCount.max}
                    onChange={(e) => updateCount('berryCount', 'max', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 아이템 선택 영역 */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800">획득 가능 아이템 선택</h4>
              <span className="text-xs text-gray-500">
                {totalSelected}개 선택됨
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2">
              {availableItems.length > 0 ? (
                availableItems.map(item => {
                  const isSelected = isItemSelected(item.id, item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id, item)}
                      className={`relative bg-white rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-indigo-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {/* 선택 표시 */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                      
                      {/* 아이템 이미지 */}
                      <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {item.spriteUrl ? (
                          <img 
                            src={item.spriteUrl} 
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="text-gray-400" size={32} />
                        )}
                      </div>
                      
                      {/* 아이템 이름 */}
                      <div className="text-xs font-semibold text-gray-800 text-center truncate">
                        {item.name}
                      </div>
                      
                      {/* 카테고리 뱃지 */}
                      <div className="mt-1 text-center">
                        <span className="inline-block text-[10px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          {item.category === 'berry' ? '열매' : 
                           item.category === 'ingredient' || item.isIngredient ? '식재료' : 
                           item.category === 'medicine' ? '회복' :
                           item.category === 'vitamin' ? '영양' :
                           item.category === 'ball' ? '볼' : '기타'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-gray-400">
                  선택 가능한 아이템이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="border-t border-gray-200 p-4 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}