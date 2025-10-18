import React, { useState } from 'react';
import { Plus, Gift, Settings } from 'lucide-react';

export default function AdminItemPanel({
  trainer,
  members,
  allItems,
  onAddItemToSelf,
  onGiveItemToMember,
  onToggleItemManagement
}) {
  const [selectedTab, setSelectedTab] = useState('self'); // 'self' | 'give'
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);

  // 아이템 카테고리 필터
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ball', name: '포획' },
    { id: 'medicine', name: '회복' },
    { id: 'vitamin', name: '영양' },
    { id: 'berry', name: '나무열매' },
  ];

  const filteredItems = (allItems || [])
  .filter(item => item && item.id)  // ✅ undefined 항목 제거
  .filter(item => {
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

  const handleAddToSelf = () => {
    if (!selectedItem || itemCount < 1) {
      alert('아이템과 개수를 선택해주세요.');
      return;
    }
    onAddItemToSelf(selectedItem, itemCount);
    setSelectedItem(null);
    setItemCount(1);
  };

  const handleGiveToMember = () => {
    if (!selectedMember || !selectedItem || itemCount < 1) {
      alert('회원, 아이템, 개수를 모두 선택해주세요.');
      return;
    }
    onGiveItemToMember(selectedMember, selectedItem, itemCount);
    setSelectedMember(null);
    setSelectedItem(null);
    setItemCount(1);
  };

  // 아이템 관리 권한 체크
  const canManageItems = trainer.isSuperAdmin || trainer.canManageItems;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">🎁 아이템 관리</h3>
        
        {/* 슈퍼 관리자: 일반 관리자 권한 설정 */}
        {trainer.isSuperAdmin && (
          <button
            onClick={() => setSelectedTab('settings')}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
          >
            <Settings size={16} />
            권한 설정
          </button>
        )}
      </div>

      {/* 탭 메뉴 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedTab('self')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
            selectedTab === 'self'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Plus size={16} className="inline mr-2" />
          내 아이템 추가
        </button>
        <button
          onClick={() => setSelectedTab('give')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
            selectedTab === 'give'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Gift size={16} className="inline mr-2" />
          회원에게 지급
        </button>
      </div>

      {/* 내 아이템 추가 */}
      {selectedTab === 'self' && (
        <div>
          {!canManageItems ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-2">아이템 관리 권한이 없습니다.</p>
              <p className="text-sm">슈퍼 관리자에게 권한을 요청하세요.</p>
            </div>
          ) : (
            <>
              {/* 카테고리 필터 */}
              <div className="flex gap-2 mb-4">
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
              <div className="grid grid-cols-6 gap-2 mb-4 max-h-60 overflow-y-auto p-2">
                {filteredItems
                .filter(item => item && item.id) 
                .map(item => (
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
                    <div className="w-full h-16 flex items-center justify-center">
                      <img 
                        src={item.spriteUrl} 
                        alt={item.name}
                        className="w-15 h-15"
                        style={{ 
                          imageRendering: 'pixelated',
                          imageRendering: '-moz-crisp-edges'
                        }}
                      />
                    </div>
                    <div className="text-xs text-center truncate mt-1">{item.name}</div>
                  </button>
                ))}
              </div>

              {/* 선택된 아이템 정보 */}
              {selectedItem && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={selectedItem.spriteUrl} 
                      alt={selectedItem.name}
                      className="w-20 h-20"
                      style={{ imageRendering: 'pixelated', imageRendering: '-moz-crisp-edges' }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                      <p className="text-sm text-gray-600">{selectedItem.effect?.replace(/\n/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 개수 입력 */}
              <div className="flex items-center gap-4 mb-4">
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
                  onClick={handleAddToSelf}
                  disabled={!selectedItem}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  내 인벤토리에 추가
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 회원에게 지급 */}
      {selectedTab === 'give' && (
        <div>
          {/* 회원 선택 */}
          <div className="mb-4">
            <label className="block font-semibold mb-2">회원 선택:</label>
            <select
              value={selectedMember || ''}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">선택하세요</option>
              {Object.values(members)
                .filter(m => !m.isAdmin) // 일반 회원만
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.id})
                  </option>
                ))}
            </select>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mb-4">
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
          <div className="grid grid-cols-6 gap-2 mb-4 max-h-60 overflow-y-auto p-2">
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
              onClick={handleGiveToMember}
              disabled={!selectedMember || !selectedItem}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              지급하기
            </button>
          </div>
        </div>
      )}

      {/* 권한 설정 (슈퍼 관리자 전용) */}
      {selectedTab === 'settings' && trainer.isSuperAdmin && (
        <div>
          <h4 className="font-semibold mb-4">일반 관리자 아이템 관리 권한</h4>
          <div className="space-y-2">
            {Object.values(members)
              .filter(m => m.isAdmin && !m.isSuperAdmin)
              .map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-sm text-gray-600">({member.id})</div>
                  </div>
                  <button
                    onClick={() => onToggleItemManagement(member.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      member.canManageItems
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {member.canManageItems ? '✓ 권한 있음' : '권한 부여'}
                  </button>
                </div>
              ))}
            {Object.values(members).filter(m => m.isAdmin && !m.isSuperAdmin).length === 0 && (
              <div className="text-center py-8 text-gray-400">
                일반 관리자가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}