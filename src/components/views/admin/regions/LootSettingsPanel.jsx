// src/components/views/admin/panels/LootSettingsPanel.jsx
import React, { useState, useMemo } from 'react';
import { Gift, Package, Coins, Apple, TreePine, Search, TrendingUp, Save } from 'lucide-react';
import { getItemPocket, getItemIcon, CATEGORIES, filterItemsByPocket } from '../../../../utils/itemUtils';

export default function LootSettingsPanel({ region, allItems, onUpdateRegionLootConfig }) {
  const getDefaultLootConfig = () => ({
    money: { min: 50, max: 200 },
    itemCount: { min: 0, max: 2 },
    ingredientCount: { min: 0, max: 1 },
    berryCount: { min: 0, max: 1 },
    itemPool: [],
    ingredientPool: [],
    berryPool: []
  });

  const [lootConfig, setLootConfig] = useState(region.lootConfig || getDefaultLootConfig());
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (itemCategory !== 'all') {
      items = filterItemsByPocket(items, itemCategory);
    }

    if (itemSearch) {
      const query = itemSearch.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query)
      );
    }

    const uniqueItems = Array.from(
      new Map(items.map(item => [item.id, item])).values()
    );

    return uniqueItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allItems, itemCategory, itemSearch]);

  const poolCounts = {
    normalItems: (lootConfig.itemPool || []).length,
    ingredients: (lootConfig.ingredientPool || []).length,
    berries: (lootConfig.berryPool || []).length
  };

  const toggleItem = (itemId, item) => {
    const pocket = getItemPocket(item);
    let poolName = 'itemPool';
    
    if (pocket === 'berries') {
      poolName = 'berryPool';
    } else if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
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
    const pocket = getItemPocket(item);
    
    if (pocket === 'berries') {
      return (lootConfig.berryPool || []).includes(itemId);
    } else if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
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

  const handleSave = async () => {
    await onUpdateRegionLootConfig(region.id, lootConfig);
    alert('✅ 탐험 보상이 저장되었습니다!');
  };

  return (
    <div className="bg-white rounded-lg border-2 border-green-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Gift size={24} />
          탐험 보상 설정
        </h4>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          총 {poolCounts.normalItems + poolCounts.ingredients + poolCounts.berries}개 선택됨
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package size={24} className="text-blue-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <div className="font-bold mb-1 flex items-center gap-2">
              <Gift size={16} />
              보상 구조
            </div>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <Coins size={12} className="text-yellow-600" />
                <strong>골드</strong>: 항상 지급
              </li>
              <li className="flex items-center gap-2">
                <Package size={12} className="text-blue-600" />
                <strong>아이템</strong>: 일반 아이템 
                <span className="text-blue-600 font-semibold">{poolCounts.normalItems}개 풀</span>
              </li>
              <li className="flex items-center gap-2">
                <Apple size={12} className="text-red-600" />
                <strong>식재료</strong>: 요리 재료 전용 
                <span className="text-red-600 font-semibold">{poolCounts.ingredients}개 풀</span>
              </li>
              <li className="flex items-center gap-2">
                <TreePine size={12} className="text-green-600" />
                <strong>나무열매</strong>: 베리 전용 
                <span className="text-green-600 font-semibold">{poolCounts.berries}개 풀</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="text-yellow-600" size={20} />
            <h4 className="font-bold text-gray-800">골드 (필수)</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.money.min}
                onChange={(e) => updateCount('money', 'min', e.target.value)}
                className="w-full border-2 border-yellow-300 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.money.max}
                onChange={(e) => updateCount('money', 'max', e.target.value)}
                className="w-full border-2 border-yellow-300 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
            <TrendingUp size={12} />
            {lootConfig.money.min}~{lootConfig.money.max}원 사이 랜덤 지급
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="text-blue-600" size={20} />
              <h4 className="font-bold text-gray-800">일반 아이템</h4>
            </div>
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Package size={10} />
              {poolCounts.normalItems}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.itemCount.min}
                onChange={(e) => updateCount('itemCount', 'min', e.target.value)}
                className="w-full border-2 border-blue-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.itemCount.max}
                onChange={(e) => updateCount('itemCount', 'max', e.target.value)}
                className="w-full border-2 border-blue-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.itemCount.min}~{lootConfig.itemCount.max}개 (베리/식재료 제외)
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Apple className="text-red-600" size={20} />
              <h4 className="font-bold text-gray-800">식재료</h4>
            </div>
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Apple size={10} />
              {poolCounts.ingredients}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.ingredientCount.min}
                onChange={(e) => updateCount('ingredientCount', 'min', e.target.value)}
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.ingredientCount.max}
                onChange={(e) => updateCount('ingredientCount', 'max', e.target.value)}
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.ingredientCount.min}~{lootConfig.ingredientCount.max}개 (별도 지급)
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TreePine className="text-green-600" size={20} />
              <h4 className="font-bold text-gray-800">나무열매</h4>
            </div>
            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <TreePine size={10} />
              {poolCounts.berries}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.berryCount.min}
                onChange={(e) => updateCount('berryCount', 'min', e.target.value)}
                className="w-full border-2 border-green-300 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.berryCount.max}
                onChange={(e) => updateCount('berryCount', 'max', e.target.value)}
                className="w-full border-2 border-green-300 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.berryCount.min}~{lootConfig.berryCount.max}개 (별도 지급)
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-800">획득 가능 아이템 선택</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
              <Package size={12} />
              일반 {poolCounts.normalItems}
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
              <Apple size={12} />
              식재료 {poolCounts.ingredients}
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
              <TreePine size={12} />
              베리 {poolCounts.berries}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="아이템 검색..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setItemCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  itemCategory === cat.id
                    ? cat.color + ' shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
          <Package size={14} />
          {filteredItems.length}개의 아이템
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              const isSelected = isItemSelected(item.id, item);
              const ItemIcon = getItemIcon(item);
              const pocket = getItemPocket(item);
              const isIngredient = item.cooking?.isIngredient || item.category?.includes('ingredient');
              const isBerry = pocket === 'berries';
              
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id, item)}
                  className={`flex flex-col border-2 rounded-xl transition-all group bg-white overflow-hidden relative ${
                    isSelected
                      ? 'border-green-500 shadow-lg'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}

                  <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center relative">
                    {item.spriteUrl ? (
                      <img 
                        src={item.spriteUrl} 
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ 
                          imageRendering: 'pixelated',
                          transform: isIngredient ? 'scale(1)' : 'scale(2)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: item.spriteUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                      <ItemIcon size={48} className="text-gray-300" />
                    </div>
                  </div>
                  
                  <div className="p-2 bg-white border-t border-gray-200">
                    <div className={`text-xs font-semibold text-center truncate ${
                      isSelected ? 'text-green-700' : 'text-gray-800 group-hover:text-green-700'
                    }`}>
                      {item.name}
                    </div>
                    
                    {isIngredient && (
                      <div className="text-[10px] text-center text-red-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <Apple size={10} />
                        식재료
                      </div>
                    )}
                    {isBerry && (
                      <div className="text-[10px] text-center text-green-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <TreePine size={10} />
                        베리
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Search size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        보상 저장
      </button>
    </div>
  );
}