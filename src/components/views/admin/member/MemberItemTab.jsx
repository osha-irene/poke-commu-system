// src/components/views/admin/member/MemberItemTab.jsx
import React, { useState } from 'react';

function MemberItemTab({ member, allItems, onGiveItem }) {
  const [itemMode, setItemMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ball', name: '포획' },
    { id: 'medicine', name: '회복' },
    { id: 'vitamin', name: '영양' },
    { id: 'berry', name: '나무열매' },
  ];
  
  const filteredItems = allItems.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category?.includes(categoryFilter);
  });

  const handleGiveItem = () => {
    if (!selectedItem || itemCount < 1) {
      alert('아이템과 개수를 선택해주세요.');
      return;
    }
    onGiveItem(member.id, selectedItem, itemCount);
    setSelectedItem(null);
    setItemCount(1);
    alert(`${member.name}님에게 ${selectedItem.name} ${itemCount}개를 지급했습니다!`);
  };

  return (
    <div className="space-y-4">
      {/* 보기/지급 토글 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {itemMode === 'view' ? '보유 아이템' : '아이템 지급'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setItemMode('view')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              itemMode === 'view'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            보기
          </button>
          <button
            onClick={() => setItemMode('give')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              itemMode === 'give'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎁 지급
          </button>
        </div>
      </div>

      {/* 보기 모드 */}
      {itemMode === 'view' && (
        <>
          {!member.inventory || member.inventory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">보유한 아이템이 없습니다</div>
          ) : (
            <div className="space-y-2">
              {member.inventory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-10 h-10" 
                      style={{ imageRendering: 'pixelated' }} 
                    />
                    <span className="font-semibold">{item.name}</span>
                  </div>
                  <span className="font-bold text-lg">{item.count}개</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 지급 모드 */}
      {itemMode === 'give' && (
        <div className="space-y-4">
          {/* 카테고리 필터 */}
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 아이템 선택 */}
          <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedItem?.id === item.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
                title={item.name}
              >
                <img 
                  src={item.spriteUrl} 
                  alt={item.name}
                  className="w-full h-12 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="text-xs text-center truncate mt-1">{item.name}</div>
              </button>
            ))}
          </div>

          {/* 선택된 아이템 정보 */}
          {selectedItem && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-3">
                <img 
                  src={selectedItem.spriteUrl} 
                  alt={selectedItem.name}
                  className="w-20 h-20"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                  <p className="text-sm text-gray-600">{selectedItem.effect?.replace(/\n/g, ' ')}</p>
                </div>
              </div>

              {/* 개수 입력 & 지급 */}
              <div className="flex items-center gap-4">
                <label className="font-semibold">개수:</label>
                <input
                  type="number"
                  value={itemCount}
                  onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="999"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={handleGiveItem}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold transition-colors"
                >
                  지급하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MemberItemTab;