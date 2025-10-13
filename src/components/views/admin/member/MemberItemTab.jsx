// src/components/views/admin/member/MemberItemTab.jsx
import React, { useState } from 'react';
import { getButtonClass } from '../../../../styles/theme';

function MemberItemTab({ member, allItems, onGiveItem }) {
  const [itemMode, setItemMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ball', name: '포획' },
    { id: 'medicine', name: '회복' },
    { id: 'vitamin', name: '영양' },
    { id: 'berry', name: '나무열매' },
    { id: 'battle', name: '배틀' },
  ];
  
  const filteredItems = allItems.filter(item => {
    // 카테고리 필터
    if (categoryFilter !== 'all' && !item.category?.includes(categoryFilter)) {
      return false;
    }
    
    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const itemName = item.name?.toLowerCase() || '';
      const itemNameEn = item.nameEn?.toLowerCase() || '';
      
      return itemName.includes(query) || itemNameEn.includes(query);
    }
    
    return true;
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
            className={getButtonClass(itemMode === 'view' ? 'primary' : 'secondary', 'md')}
          >
            보기
          </button>
          <button
            onClick={() => setItemMode('give')}
            className={getButtonClass(itemMode === 'give' ? 'success' : 'secondary', 'md')}
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
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-10 h-10" 
                      style={{ imageRendering: 'pixelated' }} 
                    />
                    <span className="font-semibold text-gray-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-lg text-gray-700">{item.count}개</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 지급 모드 */}
      {itemMode === 'give' && (
        <div className="space-y-4">
          {/* 검색 바 */}
          <input
            type="text"
            placeholder="아이템 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
          />

          {/* 카테고리 필터 */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={getButtonClass(
                  categoryFilter === cat.id ? 'primary' : 'secondary',
                  'sm'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 아이템 그리드 */}
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${
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
                <div className="text-xs text-center truncate mt-1 text-gray-700">{item.name}</div>
              </button>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              검색 결과가 없습니다
            </div>
          )}

          {/* 선택된 아이템 정보 */}
          {selectedItem && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
              <div className="flex items-center gap-4 mb-3">
                <img 
                  src={selectedItem.spriteUrl} 
                  alt={selectedItem.name}
                  className="w-20 h-20"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-800">{selectedItem.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedItem.effect?.replace(/\n/g, ' ')}</p>
                </div>
              </div>

              {/* 개수 입력 & 지급 */}
              <div className="flex items-center gap-4">
                <label className="font-semibold text-gray-700">개수:</label>
                <input
                  type="number"
                  value={itemCount}
                  onChange={(e) => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="999"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                />
                <button
                  onClick={handleGiveItem}
                  className={`flex-1 ${getButtonClass('success', 'lg')}`}
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