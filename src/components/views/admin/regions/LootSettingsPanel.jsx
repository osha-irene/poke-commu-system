import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Package, Coins, Apple, TreePine, Search, TrendingUp, Save, Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getItemPocket, getItemIcon, CATEGORIES, filterItemsByPocket } from '../../../../utils/itemUtils';

const createDefaultLootConfig = () => ({
  money: { min: 50, max: 200 },
  itemCount: { min: 0, max: 2 },
  ingredientCount: { min: 0, max: 1 },
  berryCount: { min: 0, max: 1 },
  itemPool: [],
  ingredientPool: [],
  berryPool: []
});

const normalizeConfig = (config = {}) => {
  const source = config || {};
  const defaults = createDefaultLootConfig();
  return {
    ...defaults,
    ...source,
    money: { ...defaults.money, ...(source.money || {}) },
    itemCount: { ...defaults.itemCount, ...(source.itemCount || {}) },
    ingredientCount: { ...defaults.ingredientCount, ...(source.ingredientCount || {}) },
    berryCount: { ...defaults.berryCount, ...(source.berryCount || {}) },
    itemPool: Array.isArray(source.itemPool) ? source.itemPool : [],
    ingredientPool: Array.isArray(source.ingredientPool) ? source.ingredientPool : [],
    berryPool: Array.isArray(source.berryPool) ? source.berryPool : []
  };
};

const getPoolNameForItem = (item) => {
  const pocket = getItemPocket(item);
  if (pocket === 'berries') return 'berryPool';
  if (item.cooking?.isIngredient || item.category?.includes('ingredient')) return 'ingredientPool';
  return 'itemPool';
};

const clampRange = (range = {}, parentRange = null) => {
  const min = Math.max(0, parseInt(range.min, 10) || 0);
  const rawMax = Math.max(min, parseInt(range.max, 10) || 0);
  const parentMax = parentRange ? parseInt(parentRange.max, 10) || 0 : rawMax;
  const max = parentRange ? Math.min(rawMax, parentMax) : rawMax;
  return { min: Math.min(min, max), max };
};

const toneClasses = {
  yellow: {
    card: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-600',
    input: 'border-yellow-300 focus:border-yellow-500'
  },
  blue: {
    card: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-600',
    input: 'border-blue-300 focus:border-blue-500'
  },
  red: {
    card: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-600',
    input: 'border-red-300 focus:border-red-500'
  },
  green: {
    card: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    badge: 'bg-green-600',
    input: 'border-green-300 focus:border-green-500'
  }
};

export default function LootSettingsPanel({
  region,
  parentRegion = null,
  mode = 'place',
  allItems = [],
  onUpdateRegionLootConfig
}) {
  const isRegionMode = mode === 'region';
  const parentLootConfig = useMemo(
    () => normalizeConfig(parentRegion?.lootConfig),
    [parentRegion?.lootConfig]
  );
  const [lootConfig, setLootConfig] = useState(normalizeConfig(region.lootConfig));
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');
  const [showSelectedPool, setShowSelectedPool] = useState(false);

  useEffect(() => {
    setLootConfig(normalizeConfig(region.lootConfig));
  }, [region.id, region.lootConfig]);

  const poolCounts = {
    normalItems: (lootConfig.itemPool || []).length,
    ingredients: (lootConfig.ingredientPool || []).length,
    berries: (lootConfig.berryPool || []).length
  };

  const parentPoolCounts = {
    normalItems: (parentLootConfig.itemPool || []).length,
    ingredients: (parentLootConfig.ingredientPool || []).length,
    berries: (parentLootConfig.berryPool || []).length
  };

  const filteredItems = useMemo(() => {
    let items = Array.isArray(allItems) ? allItems : [];

    if (itemCategory !== 'all') {
      items = filterItemsByPocket(items, itemCategory);
    }

    if (itemSearch) {
      const query = itemSearch.toLowerCase();
      items = items.filter((item) => (
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query)
      ));
    }

    const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values());
    return uniqueItems
      .filter((item) => {
        if (isRegionMode) return true;
        const poolName = getPoolNameForItem(item);
        return (parentLootConfig[poolName] || []).includes(item.id);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allItems, itemCategory, itemSearch, isRegionMode, parentLootConfig]);

  const toggleItem = (itemId, item) => {
    const poolName = getPoolNameForItem(item);
    const current = lootConfig[poolName] || [];

    setLootConfig({
      ...lootConfig,
      [poolName]: current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    });
  };

  const isItemSelected = (itemId, item) => (
    (lootConfig[getPoolNameForItem(item)] || []).includes(itemId)
  );

  const updateRange = (type, field, value) => {
    const nextValue = parseInt(value, 10) || 0;
    setLootConfig({
      ...lootConfig,
      [type]: { ...lootConfig[type], [field]: nextValue }
    });
  };

  const sanitizeForSave = () => {
    if (isRegionMode) {
      return {
        ...lootConfig,
        money: clampRange(lootConfig.money),
        itemCount: clampRange(lootConfig.itemCount),
        ingredientCount: clampRange(lootConfig.ingredientCount),
        berryCount: clampRange(lootConfig.berryCount)
      };
    }

    return {
      ...lootConfig,
      money: clampRange(lootConfig.money, parentLootConfig.money),
      itemCount: clampRange(lootConfig.itemCount, parentLootConfig.itemCount),
      ingredientCount: clampRange(lootConfig.ingredientCount, parentLootConfig.ingredientCount),
      berryCount: clampRange(lootConfig.berryCount, parentLootConfig.berryCount),
      itemPool: (lootConfig.itemPool || []).filter((id) => parentLootConfig.itemPool.includes(id)),
      ingredientPool: (lootConfig.ingredientPool || []).filter((id) => parentLootConfig.ingredientPool.includes(id)),
      berryPool: (lootConfig.berryPool || []).filter((id) => parentLootConfig.berryPool.includes(id))
    };
  };

  const handleSave = async () => {
    const nextConfig = sanitizeForSave();
    await onUpdateRegionLootConfig(region.id, nextConfig);
    setLootConfig(nextConfig);
    alert(isRegionMode ? '지역 보상 기준이 저장되었습니다.' : '장소 보상 설정이 저장되었습니다.');
  };

  const rangeCards = [
    {
      key: 'money',
      label: '소지금',
      icon: Coins,
      tone: 'yellow',
      description: isRegionMode ? '지역에서 지급 가능한 최대 소지금 범위' : '장소에서 실제 지급할 소지금 범위'
    },
    {
      key: 'itemCount',
      pool: 'itemPool',
      label: '일반 아이템',
      icon: Package,
      tone: 'blue',
      description: isRegionMode ? '지역에서 나올 수 있는 일반 아이템 최대 개수' : '장소에서 실제 지급할 일반 아이템 개수'
    },
    {
      key: 'ingredientCount',
      pool: 'ingredientPool',
      label: '식재료',
      icon: Apple,
      tone: 'red',
      description: isRegionMode ? '지역에서 나올 수 있는 식재료 최대 개수' : '장소에서 실제 지급할 식재료 개수'
    },
    {
      key: 'berryCount',
      pool: 'berryPool',
      label: '나무열매',
      icon: TreePine,
      tone: 'green',
      description: isRegionMode ? '지역에서 나올 수 있는 나무열매 최대 개수' : '장소에서 실제 지급할 나무열매 개수'
    }
  ];

  return (
    <div className="bg-white rounded-lg border-2 border-green-200 p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Gift size={24} />
            {isRegionMode ? '지역 보상 기준 설정' : '장소별 보상 설정'}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {isRegionMode
              ? '이 지역 전체에서 사용할 보상 풀과 최대 지급 범위를 정합니다.'
              : '지역 보상 풀 안에서 이 장소의 실제 보상 범위와 아이템을 정합니다.'}
          </p>
        </div>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          총 {poolCounts.normalItems + poolCounts.ingredients + poolCounts.berries}개 선택됨
        </div>
      </div>

      {!isRegionMode && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          지역 기준 풀: 일반 {parentPoolCounts.normalItems}개 / 식재료 {parentPoolCounts.ingredients}개 / 나무열매 {parentPoolCounts.berries}개
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rangeCards.map((card) => {
          const Icon = card.icon;
          const count = card.pool ? (lootConfig[card.pool] || []).length : null;
          const parentRange = isRegionMode ? null : parentLootConfig[card.key];
          const classes = toneClasses[card.tone];

          return (
            <div key={card.key} className={`${classes.card} rounded-lg p-4 border-2`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={classes.icon} size={20} />
                  <h4 className="font-bold text-gray-800">{card.label}</h4>
                </div>
                {count !== null && (
                  <span className={`text-xs ${classes.badge} text-white px-2 py-1 rounded-full`}>
                    {count}개 풀
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
                  <input
                    type="number"
                    value={lootConfig[card.key]?.min || 0}
                    onChange={(event) => updateRange(card.key, 'min', event.target.value)}
                    className={`w-full border-2 ${classes.input} rounded px-3 py-2 text-sm focus:outline-none`}
                    min="0"
                    max={parentRange?.max}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
                  <input
                    type="number"
                    value={lootConfig[card.key]?.max || 0}
                    onChange={(event) => updateRange(card.key, 'max', event.target.value)}
                    className={`w-full border-2 ${classes.input} rounded px-3 py-2 text-sm focus:outline-none`}
                    min="0"
                    max={parentRange?.max}
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                <TrendingUp size={12} />
                {card.description}
                {!isRegionMode && parentRange && (
                  <span className="font-semibold"> 기준 최대 {parentRange.max}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택된 아이템풀 확인 */}
      {(poolCounts.normalItems + poolCounts.ingredients + poolCounts.berries) > 0 && (
        <div className="border-2 border-indigo-200 rounded-lg bg-indigo-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSelectedPool(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-100 transition-colors"
          >
            <span className="font-bold text-indigo-800 text-sm flex items-center gap-2">
              <Package size={16} />
              선택된 아이템풀 확인
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                {poolCounts.normalItems + poolCounts.ingredients + poolCounts.berries}개
              </span>
            </span>
            {showSelectedPool ? <ChevronUp size={16} className="text-indigo-600" /> : <ChevronDown size={16} className="text-indigo-600" />}
          </button>
          {showSelectedPool && (
            <div className="px-4 pb-4 space-y-3">
              {[
                { pool: 'itemPool', label: '일반 아이템', color: 'blue' },
                { pool: 'ingredientPool', label: '식재료', color: 'red' },
                { pool: 'berryPool', label: '나무열매', color: 'green' },
              ].map(({ pool, label, color }) => {
                const ids = lootConfig[pool] || [];
                if (ids.length === 0) return null;
                return (
                  <div key={pool}>
                    <div className={`text-xs font-bold text-${color}-700 mb-1`}>{label} ({ids.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {ids.map(id => {
                        const item = allItems.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            {item.spriteUrl && (
                              <img src={item.spriteUrl} alt={item.name} className="w-5 h-5 object-contain" style={{ imageRendering: 'pixelated' }} />
                            )}
                            <span className="text-xs text-gray-700">{item.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleItem(id, item)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-800">
            {isRegionMode ? '지역 보상 아이템 풀 선택' : '장소 보상 아이템 선택'}
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
              <Package size={12} /> 일반 {poolCounts.normalItems}
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
              <Apple size={12} /> 식재료 {poolCounts.ingredients}
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
              <TreePine size={12} /> 나무열매 {poolCounts.berries}
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
              onChange={(event) => setItemSearch(event.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => {
            const Icon = category.Icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setItemCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  itemCategory === category.id
                    ? category.color + ' shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{category.name}</span>
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
            filteredItems.map((item) => {
              const selected = isItemSelected(item.id, item);
              const ItemIcon = getItemIcon(item);
              const pocket = getItemPocket(item);
              const isIngredient = item.cooking?.isIngredient || item.category?.includes('ingredient');
              const isBerry = pocket === 'berries';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id, item)}
                  className={`flex flex-col border-2 rounded-xl transition-all group bg-white overflow-hidden relative ${
                    selected ? 'border-green-500 shadow-lg' : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center z-10">
                      <Check size={14} className="text-white" />
                    </div>
                  )}

                  <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center relative">
                    {item.spriteUrl ? (
                      <img
                        src={item.spriteUrl}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        style={{
                          imageRendering: isIngredient || isBerry ? 'auto' : 'pixelated',
                          transform: isIngredient || isBerry ? 'scale(1)' : 'scale(2)'
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                          event.currentTarget.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: item.spriteUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                      <ItemIcon size={48} className="text-gray-300" />
                    </div>
                  </div>

                  <div className="p-2 bg-white border-t border-gray-200">
                    <div className={`text-xs font-semibold text-center truncate ${selected ? 'text-green-700' : 'text-gray-800 group-hover:text-green-700'}`}>
                      {item.name}
                    </div>
                    {isIngredient && (
                      <div className="text-[10px] text-center text-red-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <Apple size={10} /> 식재료
                      </div>
                    )}
                    {isBerry && (
                      <div className="text-[10px] text-center text-green-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <TreePine size={10} /> 나무열매
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Search size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">
                {isRegionMode ? '검색 결과가 없습니다.' : '지역 보상 풀에 포함된 아이템이 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        보상 저장
      </button>
    </div>
  );
}
