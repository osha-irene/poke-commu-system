// src/components/views/admin/member/MemberItemTab.jsx
import React, { useState } from 'react';
import { getButtonClass } from '../../../../styles/theme';

function MemberItemTab({ member, allItems, onGiveItem }) {
  const [itemMode, setItemMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // ItemsView와 동일한 pocket 기준 카테고리
  const categories = [
    { id: 'all', name: '전체', icon: '📦', color: 'bg-gray-100 text-gray-700' },
    { id: 'pokeballs', name: '포획', icon: '⚾', color: 'bg-red-100 text-red-700' },
    { id: 'medicine', name: '회복', icon: '💊', color: 'bg-green-100 text-green-700' },
    { id: 'vitamins', name: '영양', icon: '💪', color: 'bg-purple-100 text-purple-700' },
    { id: 'berries', name: '나무열매', icon: '🍇', color: 'bg-pink-100 text-pink-700' },
    { id: 'machines', name: '기술머신', icon: '💿', color: 'bg-blue-100 text-blue-700' },
    { id: 'held-items', name: '지니는도구', icon: '🎒', color: 'bg-orange-100 text-orange-700' },
    { id: 'evolution', name: '진화', icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'misc', name: '기타', icon: '📦', color: 'bg-gray-100 text-gray-700' }
  ];
  
  const filteredItems = allItems.filter(item => {
    // 카테고리 필터 (pocket 기준)
    if (categoryFilter !== 'all') {
      const pocket = item.categoryData?.pocket || item.pocket || 'misc';
      if (pocket !== categoryFilter) {
        return false;
      }
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
  };

  // pocket별 배지 색상
  const getPocketBadge = (item) => {
    const pocket = item.categoryData?.pocket || item.pocket || 'misc';
    if (pocket === 'pokeballs') return { text: '⚾ 포획', color: 'bg-red-100 text-red-700' };
    if (pocket === 'medicine') return { text: '💊 회복', color: 'bg-green-100 text-green-700' };
    if (pocket === 'vitamins') return { text: '💪 영양', color: 'bg-purple-100 text-purple-700' };
    if (pocket === 'berries') return { text: '🍇 나무열매', color: 'bg-pink-100 text-pink-700' };
    if (pocket === 'machines') return { text: '💿 기술머신', color: 'bg-blue-100 text-blue-700' };
    if (pocket === 'held-items') return { text: '🎒 지니는도구', color: 'bg-orange-100 text-orange-700' };
    if (pocket === 'evolution') return { text: '✨ 진화', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '📦 기타', color: 'bg-gray-100 text-gray-700' };
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  categoryFilter === cat.id
                    ? cat.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* 아이템 그리드 */}
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {filteredItems.map(item => {
              const badge = getPocketBadge(item);
              
              return (
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
                  <div className="relative">
                    <img 
                      src={item.spriteUrl} 
                      alt={item.name}
                      className="w-full h-12 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {/* 카테고리 뱃지 */}
                    <span className={`absolute top-0 right-0 text-[10px] px-1 py-0.5 rounded font-bold ${badge.color}`}>
                      {badge.text.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-xs text-center truncate mt-1 text-gray-700">{item.name}</div>
                </button>
              );
            })}
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
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-gray-800">{selectedItem.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getPocketBadge(selectedItem).color}`}>
                      {getPocketBadge(selectedItem).text}
                    </span>
                  </div>
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