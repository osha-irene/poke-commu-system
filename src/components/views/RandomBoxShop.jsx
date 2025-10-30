import React, { useState } from 'react';
import { Gift, Sparkles, Coins, Loader } from 'lucide-react';

export default function RandomBoxShop({ shopData, currentUser, allItems, onBuyRandomBox, selectedItem, onSelectBox }) {
  const [showResultModal, setShowResultModal] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);

  // ⭐ 안전하게 randomBoxes 가져오기
  const randomBoxes = React.useMemo(() => {
    if (!shopData || !shopData.randomBoxes) return [];
    
    return shopData.randomBoxes
      .filter(box => box.enabled)
      .map(box => ({
        ...box,
        items: Array.isArray(box.items) ? box.items : []
      }));
  }, [shopData]);

  // ⭐ 로딩 상태 체크
  if (!shopData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={48} className="text-purple-600 animate-spin" />
      </div>
    );
  }

  // ⭐ allItems 체크
  if (!allItems || allItems.length === 0) {
    return null;
  }

  const handleBuyBox = () => {
    const selectedBox = selectedItem;
    if (!selectedBox || selectedBox.type !== 'randombox') return;

    if (currentUser.money < selectedBox.price) {
      alert('골드가 부족합니다!');
      return;
    }

    // ⭐ items 안전 체크
    const items = Array.isArray(selectedBox.items) ? selectedBox.items : [];
    if (items.length === 0) {
      alert('이 랜덤박스에는 아이템이 없습니다!');
      return;
    }

    if (!window.confirm(`${selectedBox.name}을(를) ${selectedBox.price.toLocaleString()}G에 구매하시겠습니까?`)) {
      return;
    }

    const result = selectRandomItem(selectedBox);
    if (!result) {
      alert('아이템 추첨에 실패했습니다!');
      return;
    }

    onBuyRandomBox(selectedBox, result);
    setRewardResult(result);
    setShowResultModal(true);
    onSelectBox(null);
  };

  const selectRandomItem = (box) => {
    // ⭐ items 안전 체크
    const items = Array.isArray(box.items) ? box.items : [];
    if (items.length === 0) return null;
    
    const totalWeight = items.reduce((sum, item) => sum + (parseInt(item.weight) || 0), 0);
    if (totalWeight === 0) return null;
    
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= (parseInt(item.weight) || 0);
      if (random <= 0) {
        const minCount = parseInt(item.minCount) || 1;
        const maxCount = parseInt(item.maxCount) || 1;
        const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
        
        return {
          itemId: item.itemId,
          name: item.name,
          count: count
        };
      }
    }
    
    // 폴백: 첫 번째 아이템
    const firstItem = items[0];
    return {
      itemId: firstItem.itemId,
      name: firstItem.name,
      count: parseInt(firstItem.minCount) || 1
    };
  };

  // ⭐ 랜덤박스가 없으면 렌더링하지 않음
  if (randomBoxes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg">
        <div className="border-b-2 border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Gift size={24} className="text-pink-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-800">랜덤박스</h3>
              <p className="text-sm text-gray-600">운을 시험해보세요!</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {randomBoxes.map((box) => {
              const isSelected = selectedItem?.id === box.id && selectedItem?.type === 'randombox';
              // ⭐ box.items 안전 체크
              const boxItems = Array.isArray(box.items) ? box.items : [];
              const totalWeight = boxItems.reduce((sum, i) => sum + (parseInt(i.weight) || 0), 0);
              
              return (
                <div key={box.id} className="space-y-3">
                  <button
                    onClick={() => onSelectBox({ ...box, type: 'randombox' })}
                    className={`w-full relative border-2 rounded-lg overflow-hidden transition-all ${
                      isSelected
                        ? 'border-pink-400 bg-pink-50 shadow-lg'
                        : 'border-gray-300 hover:border-pink-300 hover:shadow-md'
                    }`}
                  >
                    <div className="p-4">
                      <div className="text-center mb-3">
                        <Gift size={40} className="mx-auto text-pink-600" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-lg text-gray-800">{box.name}</h4>
                        <div className="flex items-center justify-center gap-1 mt-2 text-yellow-600">
                          <Coins size={16} />
                          <span className="font-bold">{box.price.toLocaleString()}G</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <details className="bg-gray-50 rounded-lg border border-gray-200">
                    <summary className="p-3 cursor-pointer hover:text-gray-800 font-semibold">
                      포함 아이템 보기
                    </summary>
                    <div className="px-4 pb-4 pt-2">
                      {/* ⭐ 106번째 줄 근처 - 안전한 map 처리 */}
                      <div className="grid grid-cols-2 gap-2">
                        {boxItems.length > 0 ? (
                          boxItems.map(item => {
                            const itemInfo = allItems.find(i => i.id === item.itemId);
                            const probability = totalWeight > 0 
                              ? ((parseInt(item.weight) / totalWeight) * 100).toFixed(1)
                              : '0.0';
                            
                            return (
                              <div 
                                key={`${box.id}-${item.itemId}`}
                                className="flex items-center gap-2 text-xs bg-white rounded p-2 border border-gray-200"
                              >
                                <img 
                                  src={itemInfo?.spriteUrl || '/images/items/default.png'}
                                  alt={item.name || '아이템'}
                                  className="w-8 h-8"
                                  style={{ imageRendering: 'pixelated' }}
                                  onError={(e) => {
                                    e.target.src = '/images/items/default.png';
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-700 truncate">
                                    {item.name || '알 수 없음'}
                                  </div>
                                  <div className="text-pink-600">
                                    {probability}% / {item.minCount}~{item.maxCount}개
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-2 text-center text-gray-500 py-4">
                            아이템이 없습니다
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 구매 버튼 */}
      {selectedItem?.type === 'randombox' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleBuyBox}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all flex items-center gap-3"
          >
            <Gift size={24} />
            <span>{selectedItem.name} 구매하기</span>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
              <Coins size={18} />
              {selectedItem.price.toLocaleString()}G
            </div>
          </button>
        </div>
      )}

      {/* 결과 모달 */}
      {showResultModal && rewardResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-bounce-in">
            <div className="text-center">
              <Sparkles size={64} className="mx-auto text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">획득 완료!</h3>
              
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-300 mb-6">
                <div className="text-xl font-bold text-gray-800 mb-2">
                  {rewardResult.name}
                </div>
                <div className="text-3xl font-bold text-pink-600">
                  x {rewardResult.count}개
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setRewardResult(null);
                }}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}