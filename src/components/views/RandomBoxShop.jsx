import React, { useState } from 'react';
import { Gift, Sparkles, Coins } from 'lucide-react';

export default function RandomBoxShop({ shopData, currentUser, allItems, onBuyRandomBox, selectedItem, onSelectBox }) {
  const [showResultModal, setShowResultModal] = useState(false);
  const [rewardResult, setRewardResult] = useState(null);

  const randomBoxes = (shopData?.randomBoxes || []).filter(box => box.enabled);

  const handleBuyBox = () => {
    const selectedBox = selectedItem;
    if (!selectedBox || selectedBox.type !== 'randombox') return;

    if (currentUser.money < selectedBox.price) {
      alert('골드가 부족합니다!');
      return;
    }

    if (selectedBox.items.length === 0) {
      alert('이 랜덤박스에는 아이템이 없습니다!');
      return;
    }

    if (!window.confirm(`${selectedBox.name}을(를) ${selectedBox.price.toLocaleString()}G에 구매하시겠습니까?`)) {
      return;
    }

    const result = selectRandomItem(selectedBox);
    onBuyRandomBox(selectedBox, result);
    setRewardResult(result);
    setShowResultModal(true);
    onSelectBox(null);
  };

  const selectRandomItem = (box) => {
    const totalWeight = box.items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of box.items) {
      random -= item.weight;
      if (random <= 0) {
        const count = Math.floor(
          Math.random() * (item.maxCount - item.minCount + 1)
        ) + item.minCount;
        
        return {
          itemId: item.itemId,
          name: item.name,
          count: count
        };
      }
    }
    
    const firstItem = box.items[0];
    return {
      itemId: firstItem.itemId,
      name: firstItem.name,
      count: firstItem.minCount
    };
  };

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
              
              return (
                <div key={box.id} className="space-y-3">
                  <button
                    onClick={() => onSelectBox({ ...box, type: 'randombox' })}
                    className={`w-full relative border-2 rounded-lg overflow-hidden transition-all ${
                      isSelected
                        ? 'border-yellow-400 shadow-lg scale-105 bg-white'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-102 bg-white'
                    }`}
                  >
                    <div className="absolute -top-0 left-4 bg-pink-600 text-white text-xs px-3 py-1 font-bold flex items-center gap-1 rounded-b-lg shadow-md z-10">
                      <Gift size={12} />
                      랜덤박스
                    </div>
                    
                    <div className="p-4 pt-8">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-20 h-20 flex items-center justify-center bg-pink-50 rounded-lg">
                          <Gift size={40} className="text-pink-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-lg text-gray-800">{box.name}</div>
                          <div className="text-sm text-gray-600">{box.items.length}종류의 아이템</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t-2 border-white">
                        <div className="flex items-center gap-1 text-yellow-600 font-bold text-xl">
                          <Coins size={20} />
                          ₽{box.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 font-semibold">
                          무제한
                        </div>
                      </div>
                    </div>
                  </button>

                  <details className="bg-gray-50 rounded-lg border border-gray-200">
                    <summary className="px-4 py-2 text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-semibold">
                      포함 아이템 보기
                    </summary>
                    <div className="px-4 pb-4 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        {box.items.map(item => {
                          const itemInfo = allItems.find(i => i.id === item.itemId);
                          const totalWeight = box.items.reduce((sum, i) => sum + i.weight, 0);
                          const probability = ((item.weight / totalWeight) * 100).toFixed(1);
                          
                          return (
                            <div key={item.itemId} className="flex items-center gap-2 text-xs bg-white rounded p-2 border border-gray-200">
                              <img 
                                src={itemInfo?.spriteUrl || '/images/items/default.png'}
                                alt={item.name}
                                className="w-8 h-8"
                                style={{ imageRendering: 'pixelated' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-700 truncate">{item.name}</div>
                                <div className="text-pink-600">
                                  {probability}% / {item.minCount}~{item.maxCount}개
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 구매 패널 */}
      {selectedItem?.type === 'randombox' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-pink-600 shadow-2xl p-6 z-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 flex items-center justify-center bg-pink-50 rounded-lg">
                <Gift size={48} className="text-pink-500" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">{selectedItem.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{selectedItem.items.length}종류의 아이템 중 랜덤 획득</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-yellow-600 font-bold text-xl">
                    <Coins size={20} />
                    ₽{selectedItem.price.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBuyBox}
                  className="bg-pink-600 text-white px-8 py-4 rounded-lg hover:bg-pink-700 font-bold text-lg shadow-lg transition-all hover:scale-105"
                >
                  구매하기
                </button>
                
                <button
                  onClick={() => onSelectBox(null)}
                  className="bg-gray-200 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 결과 모달 */}
      {showResultModal && rewardResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-6 text-white text-center">
              <Sparkles size={48} className="mx-auto mb-3" />
              <h3 className="text-2xl font-bold mb-2">축하합니다!</h3>
              <p className="text-pink-100">다음 아이템을 획득했습니다</p>
            </div>

            <div className="p-8 text-center">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 mb-6 border-2 border-yellow-200">
                {(() => {
                  const itemInfo = allItems.find(i => i.id === rewardResult.itemId);
                  return (
                    <>
                      <img 
                        src={itemInfo?.spriteUrl || itemInfo?.imageUrl || '/images/items/default.png'}
                        alt={rewardResult.name}
                        className="w-24 h-24 mx-auto mb-4 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <h4 className="text-2xl font-bold text-gray-800 mb-2">
                        {rewardResult.name}
                      </h4>
                      <div className="text-3xl font-bold text-purple-600">
                        × {rewardResult.count}
                      </div>
                    </>
                  );
                })()}
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