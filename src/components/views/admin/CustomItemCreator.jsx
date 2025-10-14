// src/components/views/admin/CustomItemCreator.jsx
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

function CustomItemCreator({ onCreateItem, allItems, trainer }) {
  const [showModal, setShowModal] = useState(false);
  const [itemData, setItemData] = useState({
    name: '',
    category: 'misc',
	pocket: 'misc',
    cost: 0,
    sellPrice: 0,
    canSell: true,
    effect: '',
    spriteUrl: '',
    // 특수 효과 추가
    specialEffect: null, // 'iv' | 'ev' | 'friendship' | 'condition' | null
    ivBoost: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    evBoost: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    friendshipBoost: 0, // 친밀도 증가량 (0-255)
    conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 } // 컨디션 증가량
  });

  // ItemsView와 정확히 동일한 pocket 기준 카테고리
  const categories = [
    { id: 'pokeballs', name: '포획', icon: '⚾', color: 'bg-red-100 text-red-700' },
    { id: 'medicine', name: '회복', icon: '💊', color: 'bg-green-100 text-green-700' },
    { id: 'vitamins', name: '영양', icon: '💪', color: 'bg-purple-100 text-purple-700' },
    { id: 'berries', name: '나무열매', icon: '🍇', color: 'bg-pink-100 text-pink-700' },
    { id: 'machines', name: '기술머신', icon: '💿', color: 'bg-blue-100 text-blue-700' },
    { id: 'held-items', name: '지니는도구', icon: '🎒', color: 'bg-orange-100 text-orange-700' },
    { id: 'evolution', name: '진화', icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'misc', name: '기타', icon: '📦', color: 'bg-gray-100 text-gray-700' }
  ];

const handleSubmit = () => {
  if (!itemData.name.trim()) {
    alert('아이템 이름을 입력해주세요!');
    return;
  }
  
  const itemToCreate = {
    ...itemData,
    pocket: itemData.pocket || itemData.category,
    sellPrice: itemData.sellPrice || Math.floor(itemData.cost * 0.5)
  };
  
  console.log('🎨 생성할 아이템 데이터:', itemToCreate);
  console.log('🎨 pocket 값:', itemToCreate.pocket);
  console.log('🎨 category 값:', itemToCreate.category);
  
  const success = onCreateItem?.(itemToCreate);
  
  console.log('🎨 생성 결과:', success);
  
  if (success) {
    // localStorage에서 바로 확인
    const saved = JSON.parse(localStorage.getItem('poke_customItems') || '[]');
    console.log('💾 저장된 커스텀 아이템들:', saved);
    console.log('💾 방금 저장된 아이템:', saved[saved.length - 1]);
    
    setItemData({
      name: '',
      category: 'misc',
      pocket: 'misc',
      cost: 0,
      sellPrice: 0,
      canSell: true,
      effect: '',
      spriteUrl: '',
      specialEffect: null,
      ivBoost: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      evBoost: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      friendshipBoost: 0,
      conditionBoost: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
    });
    setShowModal(false);
  }
};

  const selectedCategory = categories.find(c => c.id === itemData.category);

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
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles size={24} />
                커스텀 아이템 생성
              </h2>
              <p className="text-purple-100 text-sm mt-1">
                나만의 독특한 아이템을 만들어보세요!
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* 아이템 이름 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  아이템 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemData.name}
                  onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="예: 마스터볼, 신비한 사탕"
                />
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setItemData({ 
									  ...itemData, 
									  category: cat.id,
									  pocket: cat.id  // ✅ 이 줄이 빠져있었습니다!
									})}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                        itemData.category === cat.id
                          ? cat.color + ' ring-2 ring-offset-2 ring-purple-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    구매 가격 (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemData.cost}
                    onChange={(e) => setItemData({ ...itemData, cost: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    판매 가격 (₽)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemData.sellPrice}
                    onChange={(e) => setItemData({ ...itemData, sellPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={`자동: ${Math.floor(itemData.cost * 0.5)}`}
                  />
                </div>
              </div>

              {/* 판매 가능 여부 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canSell"
                  checked={itemData.canSell}
                  onChange={(e) => setItemData({ ...itemData, canSell: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="canSell" className="text-sm font-semibold text-gray-700">
                  판매 가능한 아이템
                </label>
              </div>

              {/* 특수 효과 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  특수 효과 (선택)
                </label>
                <select
                  value={itemData.specialEffect || ''}
                  onChange={(e) => setItemData({ ...itemData, specialEffect: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">없음</option>
                  <option value="iv">기초 포인트(개체값) 상승</option>
                  <option value="ev">노력치 상승</option>
                  <option value="friendship">친밀도 상승</option>
                  <option value="condition">컨디션 상승</option>
                </select>
              </div>

              {/* 기초 포인트 설정 */}
              {itemData.specialEffect === 'iv' && (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span>💎</span>
                    <span>기초 포인트 상승량 (0-31)</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(itemData.ivBoost).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {stat === 'hp' ? 'HP' : 
                           stat === 'attack' ? '공격' :
                           stat === 'defense' ? '방어' :
                           stat === 'specialAttack' ? '특수공격' :
                           stat === 'specialDefense' ? '특수방어' : '스피드'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="31"
                          value={itemData.ivBoost[stat]}
                          onChange={(e) => setItemData({
                            ...itemData,
                            ivBoost: {
                              ...itemData.ivBoost,
                              [stat]: Math.min(31, Math.max(0, parseInt(e.target.value) || 0))
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 현재 개체값에 추가됩니다 (최대 31)
                  </p>
                </div>
              )}

              {/* 노력치 설정 */}
              {itemData.specialEffect === 'ev' && (
                <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                    <span>⚡</span>
                    <span>노력치 상승량 (0-252)</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(itemData.evBoost).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {stat === 'hp' ? 'HP' : 
                           stat === 'attack' ? '공격' :
                           stat === 'defense' ? '방어' :
                           stat === 'specialAttack' ? '특수공격' :
                           stat === 'specialDefense' ? '특수방어' : '스피드'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="252"
                          value={itemData.evBoost[stat]}
                          onChange={(e) => setItemData({
                            ...itemData,
                            evBoost: {
                              ...itemData.evBoost,
                              [stat]: Math.min(252, Math.max(0, parseInt(e.target.value) || 0))
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    💡 현재 노력치에 추가됩니다 (최대 252, 총합 510)
                  </p>
                </div>
              )}

              {/* 친밀도 설정 */}
              {itemData.specialEffect === 'friendship' && (
                <div className="bg-pink-50 rounded-lg p-4 border-2 border-pink-200">
                  <h4 className="font-bold text-pink-800 mb-3 flex items-center gap-2">
                    <span>💖</span>
                    <span>친밀도 상승량</span>
                  </h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={itemData.friendshipBoost}
                      onChange={(e) => setItemData({
                        ...itemData,
                        friendshipBoost: Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                    />
                    <span className="text-gray-600 font-semibold">/ 255</span>
                  </div>
                  <div className="mt-3 bg-pink-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 transition-all"
                      style={{ width: `${(itemData.friendshipBoost / 255) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-pink-600 mt-2">
                    💡 현재 친밀도에 추가됩니다 (최대 255)
                  </p>
                </div>
              )}

              {/* 컨디션 설정 */}
              {itemData.specialEffect === 'condition' && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                    <span>✨</span>
                    <span>컨디션 상승량 (0-100)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(itemData.conditionBoost).map(stat => (
                      <div key={stat}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {stat === 'elegance' ? '근사함' : 
                           stat === 'beauty' ? '아름다움' :
                           stat === 'cuteness' ? '귀여움' :
                           stat === 'intelligence' ? '슬기로움' : '강인함'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={itemData.conditionBoost[stat]}
                          onChange={(e) => setItemData({
                            ...itemData,
                            conditionBoost: {
                              ...itemData.conditionBoost,
                              [stat]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    💡 현재 컨디션에 추가됩니다 (최대 100)
                  </p>
                </div>
              )}
			  
			           {/* 효과 설명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  효과 설명
                </label>
                <textarea
                  value={itemData.effect}
                  onChange={(e) => setItemData({ ...itemData, effect: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="아이템의 효과를 설명해주세요"
                />
              </div>


              {/* 이미지 URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이미지 URL (선택)
                </label>
                <input
                  type="text"
                  value={itemData.spriteUrl}
                  onChange={(e) => setItemData({ ...itemData, spriteUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://..."
                />
                {itemData.spriteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">미리보기:</span>
                    <img 
                      src={itemData.spriteUrl} 
                      alt="preview" 
                      className="w-12 h-12"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all shadow-lg"
                >
                  생성하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomItemCreator;