import React, { useState, useMemo } from 'react';
import { Coins, Package, Apple, TreePine, X, Search } from 'lucide-react';
import { getItemPocket, getItemIcon, CATEGORIES, filterItemsByPocket } from '../../utils/itemUtils';

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

  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');

  // 아이템 필터링 (itemUtils 사용)
  const filteredItems = useMemo(() => {
    let items = filterItemsByPocket(allItems, itemCategory);

    // 검색어 필터링
    if (itemSearch) {
      const query = itemSearch.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query)
      );
    }

    // 중복 제거
    const uniqueItems = Array.from(
      new Map(items.map(item => [item.id, item])).values()
    );

    return uniqueItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allItems, itemCategory, itemSearch]);

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

  const handleSave = () => onSave(region.id, lootConfig);

  const totalSelected = (lootConfig.itemPool || []).length + 
                        (lootConfig.ingredientPool || []).length + 
                        (lootConfig.berryPool || []).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소 금액</label>
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

            {/* 검색창 */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="아이템 검색..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.Icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setItemCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
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

            {/* 필터링된 아이템 개수 */}
            <div className="text-sm text-gray-600 mb-3">
              {filteredItems.length}개의 아이템
            </div>
            
            {/* 아이템 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isSelected = isItemSelected(item.id, item);
                  const ItemIcon = getItemIcon(item);
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id, item)}
                      className={`flex flex-col border-2 rounded-xl transition-all group bg-white overflow-hidden ${
                        isSelected
                          ? 'border-indigo-500 shadow-lg'
                          : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      {/* 선택 표시 */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center z-10">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}

                      {/* 아이템 이미지 */}
                      <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center relative">
                        {item.spriteUrl ? (
                          <img 
                            src={item.spriteUrl} 
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                            style={{ 
                              imageRendering: 'pixelated',
                              transform: item.cooking?.isIngredient ? 'scale(1)' : 'scale(2)'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div style={{ display: item.spriteUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                          <ItemIcon size={48} className="text-gray-300" />
                        </div>
                      </div>
                      
                      {/* 아이템 정보 */}
                      <div className="p-2 bg-white border-t border-gray-200">
                        <div className={`text-xs font-semibold text-center truncate ${
                          isSelected ? 'text-indigo-700' : 'text-gray-800 group-hover:text-indigo-700'
                        }`}>
                          {item.name}
                        </div>
                        
                        {/* 카테고리 표시 */}
                        {(item.cooking?.isIngredient || item.category?.includes('ingredient')) && (
                          <div className="text-[10px] text-center text-indigo-600 mt-0.5">
                            식재료
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