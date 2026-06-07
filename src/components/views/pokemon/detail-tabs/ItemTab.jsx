// src/components/views/pokemon/detail-tabs/ItemTab.jsx
// 아이템/도구 탭

import React from 'react';
import { Package, ArrowDownToLine, AlertTriangle } from 'lucide-react';

export default function ItemTab({
  pokemon,
  allItems,
  items,
  onGiveItem,
  onTakeItem,
  onUseItemOnPokemon
}) {
  // 지니고 있는 아이템 데이터
  const heldItemData = pokemon.heldItem 
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const heldItemName = pokemon.heldItem?.toLowerCase();
        return itemName === heldItemName || 
               itemNameEn === heldItemName ||
               itemName?.includes(heldItemName) ||
               itemNameEn?.includes(heldItemName);
      })
    : null;

  // 사용 가능한 아이템 필터링 (포켓몬에게 사용할 수 있는 것들)
  const usableItems = items?.filter(item => {
    const category = item.category?.toLowerCase() || '';
    return category.includes('healing') || 
           category.includes('medicine') ||
           category.includes('vitamins') ||
           category.includes('stat-boosts') ||
           item.name?.includes('사탕') ||
           item.name?.includes('회복');
  }) || [];

  return (
    <div className="space-y-4">
      {/* 지니고 있는 도구 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">지니고 있는 도구</h3>
          </div>
          {pokemon.heldItem && (
            <button
              onClick={() => onTakeItem(pokemon.uniqueId)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              <ArrowDownToLine size={12} />
              회수
            </button>
          )}
        </div>
        
        {heldItemData ? (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-start gap-3">
              <div 
                className="item-sprite flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundImage: `url(${heldItemData.spriteUrl})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-700 mb-1">
                  {heldItemData.name}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  {heldItemData.effect || '효과 정보 없음'}
                </div>
              </div>
            </div>
          </div>
        ) : pokemon.heldItem ? (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-gray-400" />
              <div>
                <div className="text-sm font-bold text-blue-600">{pokemon.heldItem}</div>
                <div className="text-xs text-gray-400 italic">상세 정보 없음</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onGiveItem(pokemon.uniqueId, e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">아이템 선택...</option>
              {items.map((item, idx) => (
                <option key={idx} value={item.name}>
                  {item.name} (x{item.count})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">
              지니고 있는 도구가 없습니다. 아이템을 선택해 지니게 해주세요.
            </p>
          </div>
        )}
      </div>
      
      {/* 아이템 사용 */}
      {usableItems.length > 0 && onUseItemOnPokemon && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-green-600" />
            <h3 className="text-sm font-semibold text-gray-700">아이템 사용</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {usableItems.slice(0, 6).map((item, idx) => (
              <button
                key={idx}
                onClick={() => onUseItemOnPokemon(pokemon.uniqueId, item.name)}
                className="flex items-center gap-2 p-2 bg-white rounded-lg border border-green-100 hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                {item.spriteUrl && (
                  <div 
                    className="item-sprite flex-shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundImage: `url(${item.spriteUrl})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-700 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">x{item.count}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 변함없는돌 경고 */}
      {pokemon.heldItem?.toLowerCase() === 'everstone' || 
       pokemon.heldItem?.toLowerCase() === '변함없는돌' ? (
        <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-gray-500" />
            <div>
              <div className="text-sm font-bold text-gray-700">변함없는돌 착용 중</div>
              <div className="text-xs text-gray-500">이 포켓몬은 진화하지 않습니다</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
