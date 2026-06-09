import React, { useState } from 'react';
import { Gift, Plus, Trash2, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import ItemSelectorModal from '../../modals/ItemSelectorModal';

export default function RandomBoxAdminPanel({ shopData, allItems, onUpdateShop }) {
  const [expandedBox, setExpandedBox] = useState(null);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  
  // ⭐ 안전한 데이터 초기화
  const getDefaultRandomBoxes = () => [
    { id: 1, name: '브론즈 박스', price: 1000, enabled: false, items: [] },
    { id: 2, name: '실버 박스', price: 3000, enabled: false, items: [] },
    { id: 3, name: '골드 박스', price: 5000, enabled: false, items: [] }
  ];

  // ⭐ shopData가 없거나 randomBoxes가 없으면 기본값 사용
  const randomBoxes = React.useMemo(() => {
    if (!shopData || !shopData.randomBoxes) {
      return getDefaultRandomBoxes();
    }
    
    // items가 없는 박스는 빈 배열로 초기화
    return shopData.randomBoxes.map(box => ({
      ...box,
      items: Array.isArray(box.items) ? box.items : []
    }));
  }, [shopData]);

  // ⭐ 로딩 상태 체크
  if (!shopData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader size={48} className="mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">랜덤박스 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  // ⭐ allItems가 없으면 경고
  if (!allItems || allItems.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800 font-semibold">⚠️ 아이템 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const handleToggleBox = (boxId) => {
    const updatedBoxes = randomBoxes.map(box => 
      box.id === boxId ? { ...box, enabled: !box.enabled } : box
    );
    
    onUpdateShop({ 
      ...shopData, 
      randomBoxes: updatedBoxes 
    });
  };

  const handleUpdateBox = (boxId, field, value) => {
    const updatedBoxes = randomBoxes.map(box => 
      box.id === boxId ? { ...box, [field]: value } : box
    );
    
    onUpdateShop({ 
      ...shopData, 
      randomBoxes: updatedBoxes 
    });
  };

  const handleAddItem = (boxId) => {
    setSelectedBoxId(boxId);
    setShowItemSelector(true);
  };

  const handleItemSelected = (selectedItems) => {
    console.log('선택된 아이템:', selectedItems);
    
    // 배열인지 단일 객체인지 확인
    const item = Array.isArray(selectedItems) ? selectedItems[0] : selectedItems;
    
    if (!item) {
      setShowItemSelector(false);
      setSelectedBoxId(null);
      return;
    }

    const updatedBoxes = randomBoxes.map(box => {
      if (box.id === selectedBoxId) {
        const currentItems = Array.isArray(box.items) ? box.items : [];
        
        // 중복 체크
        if (currentItems.some(i => i.itemId === item.id)) {
          alert('이미 추가된 아이템입니다!');
          return box;
        }
        
        return {
          ...box,
          items: [
            ...currentItems,
            {
              itemId: item.id,
              name: item.name,
              weight: 10,
              minCount: 1,
              maxCount: 1
            }
          ]
        };
      }
      return box;
    });

    onUpdateShop({ 
      ...shopData, 
      randomBoxes: updatedBoxes 
    });
    
    setShowItemSelector(false);
    setSelectedBoxId(null);
  };

  const handleRemoveItem = (boxId, itemId) => {
    if (!window.confirm('이 아이템을 삭제하시겠습니까?')) return;

    const updatedBoxes = randomBoxes.map(box => {
      if (box.id === boxId) {
        const currentItems = Array.isArray(box.items) ? box.items : [];
        return {
          ...box,
          items: currentItems.filter(item => item.itemId !== itemId)
        };
      }
      return box;
    });

    onUpdateShop({ 
      ...shopData, 
      randomBoxes: updatedBoxes 
    });
  };

  const handleUpdateItem = (boxId, itemId, field, value) => {
    const updatedBoxes = randomBoxes.map(box => {
      if (box.id === boxId) {
        const currentItems = Array.isArray(box.items) ? box.items : [];
        return {
          ...box,
          items: currentItems.map(item => 
            item.itemId === itemId 
              ? { ...item, [field]: parseInt(value) || 0 } 
              : item
          )
        };
      }
      return box;
    });

    onUpdateShop({ 
      ...shopData, 
      randomBoxes: updatedBoxes 
    });
  };

  const getTotalWeight = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (parseInt(item.weight) || 0), 0);
  };

  const getItemProbability = (weight, totalWeight) => {
    if (!weight || !totalWeight || totalWeight === 0) return '0.00';
    return ((parseFloat(weight) / parseFloat(totalWeight)) * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-lg border-2 border-lime-300 bg-white/55 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Gift size={32} className="text-lime-700" />
          <div>
            <h3 className="text-2xl font-bold text-green-950">랜덤박스 관리</h3>
            <p className="text-green-800 text-sm mt-1">
              각 랜덤박스의 상품 구성과 확률을 설정하세요
            </p>
          </div>
        </div>
      </div>

      {/* 랜덤박스 리스트 */}
      {randomBoxes.map((box) => {
        const boxItems = Array.isArray(box.items) ? box.items : [];
        const totalWeight = getTotalWeight(boxItems);
        const isExpanded = expandedBox === box.id;

        return (
          <div 
            key={box.id} 
            className={`rounded-lg border-2 bg-white/45 overflow-hidden transition-all ${
              box.enabled ? 'border-lime-300 shadow-sm' : 'border-gray-200 opacity-60'
            }`}
          >
            {/* 박스 헤더 */}
            <div className={`p-4 flex items-center justify-between border-b ${
              box.enabled ? 'border-lime-200 bg-white/40' : 'border-gray-200 bg-gray-50/70'
            }`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setExpandedBox(isExpanded ? null : box.id)}
                  className="p-2 hover:bg-lime-100/70 rounded-lg transition-colors"
                  aria-label={isExpanded ? '접기' : '펼치기'}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                <Gift size={28} className={box.enabled ? 'text-lime-700' : 'text-gray-400'} />
                
                <div>
                  <input
                    type="text"
                    value={box.name || ''}
                    onChange={(e) => handleUpdateBox(box.id, 'name', e.target.value)}
                    className="font-bold text-lg border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-2"
                    placeholder="박스 이름"
                  />
                  <div className="text-sm text-gray-600 mt-1">
                    {boxItems.length}개 아이템 • 총 가중치: {totalWeight}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <div className="text-xs text-gray-500 mb-1">가격</div>
                  <input
                    type="number"
                    min="0"
                    value={box.price || 0}
                    onChange={(e) => handleUpdateBox(box.id, 'price', parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1 border border-gray-300 rounded text-center font-bold text-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleToggleBox(box.id)}
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${
                    box.enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                >
                  {box.enabled ? '활성화' : '비활성화'}
                </button>
              </div>
            </div>

            {/* 아이템 리스트 (확장 시) */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-800">포함된 아이템</h4>
                  <button
                    onClick={() => handleAddItem(box.id)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                  >
                    <Plus size={18} />
                    아이템 추가
                  </button>
                </div>

                {boxItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Gift size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">아이템이 없습니다</p>
                    <p className="text-sm mt-1">위 버튼을 눌러 아이템을 추가하세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {boxItems.map((item) => {
                      const probability = getItemProbability(item.weight, totalWeight);
                      const itemData = allItems.find(i => i.id === item.itemId);

                      return (
                        <div 
                          key={`${box.id}-${item.itemId}`}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {/* 아이템 이미지 & 이름 */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <img 
                              src={itemData?.spriteUrl || itemData?.imageUrl || '/images/items/default.png'}
                              alt={item.name || '아이템'}
                              className="w-12 h-12 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.target.src = '/images/items/default.png';
                              }}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-gray-800 truncate">{item.name || '알 수 없는 아이템'}</div>
                              <div className="text-xs text-purple-600 font-semibold">
                                확률: {probability}%
                              </div>
                            </div>
                          </div>

                          {/* 설정 입력 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center">
                              <label className="text-xs text-gray-500 block mb-1">가중치</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={item.weight || 10}
                                onChange={(e) => handleUpdateItem(box.id, item.itemId, 'weight', e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <div className="text-center">
                              <label className="text-xs text-gray-500 block mb-1">최소</label>
                              <input
                                type="number"
                                min="1"
                                value={item.minCount || 1}
                                onChange={(e) => handleUpdateItem(box.id, item.itemId, 'minCount', e.target.value)}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <div className="text-center">
                              <label className="text-xs text-gray-500 block mb-1">최대</label>
                              <input
                                type="number"
                                min="1"
                                value={item.maxCount || 1}
                                onChange={(e) => handleUpdateItem(box.id, item.itemId, 'maxCount', e.target.value)}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <button
                              onClick={() => handleRemoveItem(box.id, item.itemId)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              aria-label="아이템 삭제"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 확률 요약 */}
                {boxItems.length > 0 && totalWeight > 0 && (
                  <div className="mt-4 p-4 bg-white/40 rounded-lg border-2 border-lime-200">
                    <div className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Gift size={16} className="text-lime-700" />
                      실시간 확률 분포
                    </div>
                    
                    {/* 통합 확률 바 */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden flex">
                        {boxItems.map((item, index) => {
                          const probability = parseFloat(getItemProbability(item.weight, totalWeight));
                          const colors = [
                            'bg-blue-500',
                            'bg-purple-500',
                            'bg-pink-500',
                            'bg-indigo-500',
                            'bg-violet-500',
                            'bg-fuchsia-500',
                            'bg-cyan-500',
                            'bg-teal-500'
                          ];
                          const color = colors[index % colors.length];
                          
                          return (
                            <div
                              key={`bar-${box.id}-${item.itemId}`}
                              className={`${color} flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:brightness-110 px-1`}
                              style={{ width: `${probability}%` }}
                              title={`${item.name}: ${probability.toFixed(2)}%`}
                            >
                              {probability >= 8 && (
                                <span className="truncate">{item.name}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* 아이템 목록 */}
                    <div className="grid grid-cols-2 gap-2">
                      {boxItems.map((item, index) => {
                        const probability = getItemProbability(item.weight, totalWeight);
                        const itemData = allItems.find(i => i.id === item.itemId);
                        const colors = [
                          'bg-blue-500',
                          'bg-purple-500',
                          'bg-pink-500',
                          'bg-indigo-500',
                          'bg-violet-500',
                          'bg-fuchsia-500',
                          'bg-cyan-500',
                          'bg-teal-500'
                        ];
                        const color = colors[index % colors.length];
                        
                        return (
                          <div 
                            key={`summary-${box.id}-${item.itemId}`}
                            className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200"
                          >
                            <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`}></div>
                            <img 
                              src={itemData?.spriteUrl || itemData?.imageUrl || '/images/items/default.png'}
                              alt={item.name || '아이템'}
                              className="w-6 h-6 object-contain flex-shrink-0"
                              onError={(e) => {
                                e.target.src = '/images/items/default.png';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-800 truncate">
                                {item.name || '알 수 없음'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.minCount === item.maxCount 
                                  ? `${item.minCount}개` 
                                  : `${item.minCount}~${item.maxCount}개`}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-purple-600 flex-shrink-0">
                              {probability}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* ItemSelectorModal */}
      <ItemSelectorModal
        show={showItemSelector}
        onClose={() => {
          setShowItemSelector(false);
          setSelectedBoxId(null);
        }}
        onSelect={handleItemSelected}
        items={allItems}
        title="랜덤박스에 추가할 아이템 선택"
        multiSelect={false}
      />
    </div>
  );
}
