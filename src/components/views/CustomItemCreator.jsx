import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function CustomItemCreator({ onCreateItem, allItems }) {
  const [showModal, setShowModal] = useState(false);
  const [itemData, setItemData] = useState({
    name: '',
    nameEn: '',
    category: 'misc',
    cost: 0,
    sellPrice: 0,
    canSell: true,
    effect: '',
    spriteUrl: ''
  });

  const categories = [
    { id: 'ball', name: '포획용 볼' },
    { id: 'medicine', name: '회복 아이템' },
    { id: 'vitamin', name: '영양 아이템' },
    { id: 'berry', name: '나무열매' },
    { id: 'battle', name: '배틀 아이템' },
    { id: 'key', name: '중요 아이템' },
    { id: 'misc', name: '기타' }
  ];

  const handleSubmit = () => {
    if (!itemData.name.trim()) {
      alert('아이템 이름을 입력해주세요!');
      return;
    }
    
    const success = onCreateItem?.({
      ...itemData,
      sellPrice: itemData.sellPrice || Math.floor(itemData.cost * 0.5)
    });
    
    if (success) {
      setItemData({
        name: '',
        nameEn: '',
        category: 'misc',
        cost: 0,
        sellPrice: 0,
        canSell: true,
        effect: '',
        spriteUrl: ''
      });
      setShowModal(false);
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
                    placeholder="예: 신비한 사탕"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
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
                    placeholder="예: Mysterious Candy"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* 가격 정보 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    구매 가격 (₽)
                  </label>
                  <input
                    type="number"
                    value={itemData.cost}
                    onChange={(e) => setItemData({ ...itemData, cost: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
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
                    min="0"
                    placeholder={Math.floor(itemData.cost * 0.5).toString()}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemData.canSell}
                      onChange={(e) => setItemData({ ...itemData, canSell: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">판매 가능</span>
                  </label>
                </div>
              </div>

              {/* 효과 설명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  효과 설명
                </label>
                <textarea
                  value={itemData.effect}
                  onChange={(e) => setItemData({ ...itemData, effect: e.target.value })}
                  placeholder="이 아이템의 효과를 자세히 설명해주세요..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none resize-none"
                  rows="3"
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
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                />
                {itemData.spriteUrl && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg flex items-center justify-center">
                    <img 
                      src={itemData.spriteUrl} 
                      alt="미리보기"
                      className="w-16 h-16"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all"
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