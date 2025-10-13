import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { getAllAvailableEffects } from '../../../utils/itemEffectHelper';

export default function CustomItemCreator({ onCreateItem, allItems, trainer }) {
  const [showModal, setShowModal] = useState(false);
  const [itemData, setItemData] = useState({
    name: '',
    nameEn: '',
    category: 'misc',
    cost: 0,
    sellPrice: 0,
    canSell: true,
    effect: '',
    description: '',
    spriteUrl: '',
    onUse: null // 여기에 효과 저장
  });

  const [selectedEffect, setSelectedEffect] = useState(null);

  const categories = [
    { id: 'ball', name: '포획용 볼' },
    { id: 'medicine', name: '회복 아이템' },
    { id: 'vitamin', name: '영양 아이템' },
    { id: 'berry', name: '나무열매' },
    { id: 'battle', name: '배틀 아이템' },
    { id: 'key', name: '중요 아이템' },
    { id: 'misc', name: '기타' }
  ];

  // 사용 가능한 모든 효과 목록
  const availableEffects = getAllAvailableEffects();

  // 카테고리별로 그룹화
  const groupedEffects = availableEffects.reduce((acc, effect) => {
    if (!acc[effect.category]) {
      acc[effect.category] = [];
    }
    acc[effect.category].push(effect);
    return acc;
  }, {});

  const handleSubmit = () => {
    if (!itemData.name.trim()) {
      alert('아이템 이름을 입력해주세요!');
      return;
    }

    // onUse에 효과 저장
    const finalItemData = {
      ...itemData,
      sellPrice: itemData.sellPrice || Math.floor(itemData.cost * 0.5),
      onUse: selectedEffect ? {
        effect: selectedEffect.effect,
        effectLabel: selectedEffect.label
      } : null,
      isCustom: true,
      createdBy: trainer.name,
      createdAt: new Date().toISOString()
    };
    
    const success = onCreateItem?.(finalItemData);
    
    if (success) {
      // 초기화
      setItemData({
        name: '',
        nameEn: '',
        category: 'misc',
        cost: 0,
        sellPrice: 0,
        canSell: true,
        effect: '',
        description: '',
        spriteUrl: '',
        onUse: null
      });
      setSelectedEffect(null);
      setShowModal(false);
      alert('✨ 커스텀 아이템이 생성되었습니다!');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all shadow-lg"
      >
        <Sparkles size={18} />
        커스텀 아이템 생성
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles size={24} />
                    커스텀 아이템 생성
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">
                    나만의 독특한 아이템을 만들어보세요!
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-purple-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    아이템 이름 (한글) *
                  </label>
                  <input
                    type="text"
                    value={itemData.name}
                    onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    placeholder="예: 초고급 영양제"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    아이템 이름 (영문)
                  </label>
                  <input
                    type="text"
                    value={itemData.nameEn}
                    onChange={(e) => setItemData({ ...itemData, nameEn: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    placeholder="예: Super Vitamin"
                  />
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  value={itemData.category}
                  onChange={(e) => setItemData({ ...itemData, category: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* 아이템 효과 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎯 아이템 효과 (포켓몬 사용 시)
                </label>
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 max-h-80 overflow-y-auto">
                  {Object.entries(groupedEffects).map(([category, effects]) => (
                    <div key={category} className="mb-4">
                      <div className="font-bold text-gray-700 mb-2 pb-2 border-b border-purple-200">
                        {category}
                      </div>
                      <div className="space-y-2">
                        {effects.map(effect => (
                          <label
                            key={effect.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              selectedEffect?.id === effect.id
                                ? 'bg-purple-200 border-2 border-purple-500'
                                : 'bg-white border-2 border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="effect"
                              checked={selectedEffect?.id === effect.id}
                              onChange={() => setSelectedEffect(effect)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-800">
                              {effect.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedEffect === null
                        ? 'bg-gray-200 border-2 border-gray-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="effect"
                      checked={selectedEffect === null}
                      onChange={() => setSelectedEffect(null)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-600">
                      효과 없음 (일반 아이템)
                    </span>
                  </label>
                </div>
                
                {selectedEffect && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-semibold text-green-800">
                      선택된 효과: {selectedEffect.label}
                    </div>
                  </div>
                )}
              </div>

              {/* 가격 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    구매 가격 (₽)
                  </label>
                  <input
                    type="number"
                    value={itemData.cost}
                    onChange={(e) => setItemData({ ...itemData, cost: parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    판매 가격 (₽)
                  </label>
                  <input
                    type="number"
                    value={itemData.sellPrice}
                    onChange={(e) => setItemData({ ...itemData, sellPrice: parseInt(e.target.value) || 0 })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                    placeholder={`기본값: ${Math.floor(itemData.cost * 0.5)}`}
                    min="0"
                  />
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  아이템 설명
                </label>
                <textarea
                  value={itemData.description}
                  onChange={(e) => setItemData({ ...itemData, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  rows="3"
                  placeholder="아이템에 대한 설명을 입력하세요..."
                />
              </div>

              {/* 이미지 URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이미지 URL
                </label>
                <input
                  type="text"
                  value={itemData.spriteUrl}
                  onChange={(e) => setItemData({ ...itemData, spriteUrl: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  placeholder="https://example.com/item.png"
                />
                {itemData.spriteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img 
                      src={itemData.spriteUrl} 
                      alt="미리보기"
                      className="w-12 h-12 border border-gray-300 rounded"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-gray-500">이미지 미리보기</span>
                  </div>
                )}
              </div>

              {/* 판매 가능 여부 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemData.canSell}
                    onChange={(e) => setItemData({ ...itemData, canSell: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    상점에 판매 가능
                  </span>
                </label>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="p-6 bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                ✨ 아이템 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}