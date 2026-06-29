// src/components/modals/ItemSelectorModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { 
  CATEGORIES, 
  getItemPocket, 
  getItemIcon, 
  filterItemsByPocket 
} from '../../utils/itemUtils';
import { getItemEffectBadges } from '../../utils/itemEffectBadges';

/**
 * 재사용 가능한 아이템 선택 모달
 * 
 * @param {boolean} show - 모달 표시 여부
 * @param {function} onClose - 모달 닫기 콜백
 * @param {function} onSelect - 아이템 선택 콜백 (단일 선택)
 * @param {function} onMultiSelect - 여러 아이템 선택 콜백 (다중 선택)
 * @param {array} items - 선택 가능한 아이템 목록
 * @param {array} selectedItems - 이미 선택된 아이템 ID 배열 (다중 선택용)
 * @param {boolean} multiSelect - 다중 선택 모드 여부
 * @param {string} title - 모달 제목
 * @param {function} filterFn - 커스텀 필터 함수 (item => boolean)
 * @param {boolean} showCategory - 카테고리 탭 표시 여부 (기본: true)
 * @param {array} pockets - 표시할 포켓 ID 배열 (예: ['berries', 'medicine', 'vitamins'])
 */
export default function ItemSelectorModal({
  show,
  onClose,
  onSelect,
  onMultiSelect,
  items = [],
  selectedItems = [],
  multiSelect = false,
  title = '아이템 선택',
  filterFn = null,
  showCategory = true,
  pockets = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [localSelectedItems, setLocalSelectedItems] = useState(selectedItems);

  // 표시할 카테고리 필터링
  const displayCategories = useMemo(() => {
    if (!pockets) return CATEGORIES;
    
    // 'all' 카테고리는 항상 포함
    const allCategory = CATEGORIES.find(c => c.id === 'all');
    const filteredCategories = CATEGORIES.filter(c => pockets.includes(c.id));
    
    return allCategory ? [allCategory, ...filteredCategories] : filteredCategories;
  }, [pockets]);

  // 아이템 필터링
  const filteredItems = useMemo(() => {
    let filtered = items;

    // pockets가 지정되어 있으면 해당 포켓의 아이템만 필터링
    if (pockets && pockets.length > 0) {
      filtered = filtered.filter(item => {
        const itemPocket = getItemPocket(item);
        return pockets.includes(itemPocket);
      });
    }

    // 커스텀 필터 적용
    if (filterFn) {
      filtered = filtered.filter(filterFn);
    }

    // 카테고리 필터 (itemUtils의 filterItemsByPocket 사용)
    if (category !== 'all') {
      filtered = filterItemsByPocket(filtered, category);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, category, searchQuery, filterFn, pockets]);

  // 단일 선택
  const handleSingleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    if (onClose) {
      onClose();
    }
  };

  // 다중 선택 토글
  const handleMultiToggle = (itemId) => {
    setLocalSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // 다중 선택 완료
  const handleMultiConfirm = () => {
    if (onMultiSelect) {
      onMultiSelect(localSelectedItems);
    }
    if (onClose) {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[85vh] min-h-0 flex flex-col">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-3xl font-bold text-gray-800">
            {title}
            {multiSelect && (
              <span className="ml-2 text-base text-gray-500">
                ({localSelectedItems.length}개 선택됨)
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* 검색 및 필터 */}
        <div className="shrink-0 p-6 border-b border-gray-200 space-y-4">
          {/* 검색바 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="아이템 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 카테고리 필터 */}
          {showCategory && (
            <div className="item-selector-category-scroll flex max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-2">
              {displayCategories.map(cat => {
                const IconComponent = cat.Icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                      category === cat.id
                        ? cat.color + ' shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <IconComponent size={18} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 결과 개수 */}
          <div className="text-base text-gray-600">
            {filteredItems.length}개의 아이템
          </div>
        </div>

        {/* 아이템 그리드 */}
        <div className="item-selector-list-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredItems.map(item => {
                const ItemIcon = getItemIcon(item);
                const effectBadges = getItemEffectBadges(item);
                const imageUrl = item.spriteUrl || item.imageUrl;
                const isSelected = multiSelect 
                  ? localSelectedItems.includes(item.id)
                  : false;

                return (
                  <button
                    key={item.id}
                    onClick={() => multiSelect ? handleMultiToggle(item.id) : handleSingleSelect(item)}
                    className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    {/* 체크마크 (다중 선택 모드) */}
                    {multiSelect && isSelected && (
                      <div className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-1 z-10">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {/* 아이템 이미지 */}
                    <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className={item.isCustom ? 'custom-item-image-64' : 'max-w-full max-h-full object-contain'}
                          style={{ imageRendering: 'pixelated', transform: item.isCustom ? 'none' : 'scale(2)' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ display: imageUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                        <ItemIcon size={48} className="text-gray-300" />
                      </div>
                    </div>

                    {/* 아이템 이름 */}
                    <div className="p-2 bg-white border-t border-gray-200">
                      <div className={`text-sm font-semibold text-center truncate ${
                        isSelected ? 'text-indigo-700' : 'text-gray-800 group-hover:text-indigo-700'
                      }`}>
                        {item.name}
                      </div>
                      {effectBadges.length > 0 && (
                        <div className="mt-1 flex flex-wrap justify-center gap-1">
                          {effectBadges.map((badge, index) => (
                            <span
                              key={index}
                              title={badge.title || badge.label}
                              className={`item-effect-pill item-effect-pill--${badge.tone || 'default'}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* 추가 정보 표시 (선택적) */}
                      {item.cooking?.isIngredient && (
                        <div className="text-[10px] text-center text-indigo-600 mt-0.5">
                          식재료
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search size={64} className="mb-4 text-gray-300" />
              <p className="text-xl font-semibold">검색 결과가 없습니다</p>
              <p className="text-base mt-2">다른 검색어나 카테고리를 시도해보세요</p>
            </div>
          )}
        </div>

        {/* 푸터 (다중 선택 모드일 때만) */}
        {multiSelect && (
          <div className="border-t border-gray-200 p-4 flex gap-3 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleMultiConfirm}
              className="flex-1 border-2 border-lime-300 bg-white/55 text-green-950 py-3 rounded-lg font-semibold hover:bg-lime-100/70 transition-all"
            >
              선택 완료
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

