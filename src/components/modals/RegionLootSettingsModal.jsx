import React, { useState } from 'react';
import { Coins, Package, Apple, TreePine, X } from 'lucide-react';

// 탐험 보상 설정 모달
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

  // 카테고리별 아이템 필터링
  const items = allItems.filter(i => 
    i.category === 'misc' || 
    i.category === 'ball' || 
    i.category === 'medicine' ||
    i.category === 'vitamin'
  );
  
  const ingredients = allItems.filter(i => 
    i.category === 'ingredient' || 
    i.isIngredient === true
  );
  
  const berries = allItems.filter(i => 
    i.category === 'berry'
  );

  const toggleItem = (poolName, itemId) => {
    const current = lootConfig[poolName] || [];
    
    if (current.includes(itemId)) {
      setLootConfig({
        ...lootConfig,
        [poolName]: current.filter(id => id !== itemId)
      });
    } else {
      setLootConfig({
        ...lootConfig,
        [poolName]: [...current, itemId]
      });
    }
  };

  const handleSave = () => {
    onSave(region.id, lootConfig);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{region.name} - 탐험 보상 설정</h3>
            <p className="text-indigo-100 mt-1 text-sm">포켓몬 인카운터 시 함께 획득할 보상을 설정하세요</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 💰 골드 설정 */}
          <div className="bg-yellow-50 rounded-lg p-5 border-2 border-yellow-200">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="text-yellow-600" size={24} />
              <h4 className="font-bold text-gray-800 text-lg">💰 골드 획득 범위</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최소 금액</label>
                <input
                  type="number"
                  value={lootConfig.money.min}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    money: { ...lootConfig.money, min: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-yellow-500 focus:outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최대 금액</label>
                <input
                  type="number"
                  value={lootConfig.money.max}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    money: { ...lootConfig.money, max: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-yellow-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* 📦 일반 아이템 설정 */}
          <div className="bg-blue-50 rounded-lg p-5 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Package className="text-blue-600" size={24} />
              <h4 className="font-bold text-gray-800 text-lg">📦 아이템 획득</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최소 개수</label>
                <input
                  type="number"
                  value={lootConfig.itemCount.min}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    itemCount: { ...lootConfig.itemCount, min: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-blue-500 focus:outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최대 개수</label>
                <input
                  type="number"
                  value={lootConfig.itemCount.max}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    itemCount: { ...lootConfig.itemCount, max: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-blue-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="text-sm font-bold text-gray-700 mb-3">획득 가능 아이템 선택</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto bg-white rounded-lg p-3 border-2 border-blue-100">
              {items.length > 0 ? (
                items.map(item => (
                  <label 
                    key={item.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      (lootConfig.itemPool || []).includes(item.id)
                        ? 'bg-blue-100 border-blue-400 font-semibold'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(lootConfig.itemPool || []).includes(item.id)}
                      onChange={() => toggleItem('itemPool', item.id)}
                      className="w-5 h-5 accent-blue-600"
                    />
                    <span className="text-sm truncate">{item.name}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-full text-center py-4 text-gray-400">
                  아이템이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 🍎 식재료 설정 */}
          <div className="bg-green-50 rounded-lg p-5 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <Apple className="text-green-600" size={24} />
              <h4 className="font-bold text-gray-800 text-lg">🍎 식재료 획득</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최소 개수</label>
                <input
                  type="number"
                  value={lootConfig.ingredientCount.min}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    ingredientCount: { ...lootConfig.ingredientCount, min: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-green-500 focus:outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최대 개수</label>
                <input
                  type="number"
                  value={lootConfig.ingredientCount.max}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    ingredientCount: { ...lootConfig.ingredientCount, max: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-green-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="text-sm font-bold text-gray-700 mb-3">획득 가능 식재료 선택</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto bg-white rounded-lg p-3 border-2 border-green-100">
              {ingredients.length > 0 ? (
                ingredients.map(item => (
                  <label 
                    key={item.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      (lootConfig.ingredientPool || []).includes(item.id)
                        ? 'bg-green-100 border-green-400 font-semibold'
                        : 'bg-gray-50 border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(lootConfig.ingredientPool || []).includes(item.id)}
                      onChange={() => toggleItem('ingredientPool', item.id)}
                      className="w-5 h-5 accent-green-600"
                    />
                    <span className="text-sm truncate">{item.name}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-full text-center py-4 text-gray-400">
                  식재료가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 🌳 나무열매 설정 */}
          <div className="bg-pink-50 rounded-lg p-5 border-2 border-pink-200">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="text-pink-600" size={24} />
              <h4 className="font-bold text-gray-800 text-lg">🌳 나무열매 획득</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최소 개수</label>
                <input
                  type="number"
                  value={lootConfig.berryCount.min}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    berryCount: { ...lootConfig.berryCount, min: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-pink-500 focus:outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">최대 개수</label>
                <input
                  type="number"
                  value={lootConfig.berryCount.max}
                  onChange={(e) => setLootConfig({
                    ...lootConfig,
                    berryCount: { ...lootConfig.berryCount, max: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:border-pink-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="text-sm font-bold text-gray-700 mb-3">획득 가능 나무열매 선택</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto bg-white rounded-lg p-3 border-2 border-pink-100">
              {berries.length > 0 ? (
                berries.map(item => (
                  <label 
                    key={item.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      (lootConfig.berryPool || []).includes(item.id)
                        ? 'bg-pink-100 border-pink-400 font-semibold'
                        : 'bg-gray-50 border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(lootConfig.berryPool || []).includes(item.id)}
                      onChange={() => toggleItem('berryPool', item.id)}
                      className="w-5 h-5 accent-pink-600"
                    />
                    <span className="text-sm truncate">{item.name}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-full text-center py-4 text-gray-400">
                  나무열매가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-bold text-lg hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
          >
            💾 저장
          </button>
        </div>
      </div>
    </div>
  );
}