// src/components/views/admin/member/MemberItemTab.jsx
import React, { useState } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { getButtonClass } from '../../../../styles/theme';
import { getItemPocket, CATEGORIES, getItemIcon, getItemColor, filterItemsByPocket } from '../../../../utils/itemUtils';

function MemberItemTab({ member, allItems, onGiveItem, onDeleteItem, onAdjustItemCount }) {
  const [itemMode, setItemMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editCount, setEditCount] = useState(1);
  
  // ✅ allItems 안전 처리
  const safeAllItems = Array.isArray(allItems) ? allItems : [];
  
  // ✅ filteredItems - itemUtils의 filterItemsByPocket 사용
  const filteredItems = (() => {
    let items = filterItemsByPocket(safeAllItems, categoryFilter);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        if (!item || !item.id) return false;
        const itemName = item.name?.toLowerCase() || '';
        const itemNameEn = item.nameEn?.toLowerCase() || '';
        return itemName.includes(query) || itemNameEn.includes(query);
      });
    }
    
    return items.filter(item => item && item.id);
  })();

  const handleGiveItem = () => {
    if (!selectedItem || itemCount < 1) {
      alert('아이템과 개수를 선택해주세요.');
      return;
    }
    onGiveItem(member.id, selectedItem, itemCount);
    setSelectedItem(null);
    setItemCount(1);
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
              {member.inventory
                .filter(item => item && item.name)
                .map((item, idx) => {
                  const ItemIcon = getItemIcon(item);
                  const isEditing = editingItem === (item.itemId || item.name);

                  return (
                    <div key={item.itemId || idx} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center relative">
                            {item.imageUrl || item.spriteUrl ? (
                              <img
                                src={item.imageUrl || item.spriteUrl}
                                alt={item.name || 'Item'}
                                className="w-10 h-10"
                                style={{ imageRendering: 'pixelated' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={{ display: (item.imageUrl || item.spriteUrl) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                              <ItemIcon size={24} className="text-gray-400" />
                            </div>
                          </div>
                          <span className="font-semibold text-gray-800">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-gray-700">{item.count || 0}개</span>
                          <button
                            onClick={() => { setEditingItem(item.itemId || item.name); setEditCount(item.count || 1); }}
                            className="p-1.5 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                            title="갯수 조정"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`${item.name}을(를) 삭제하시겠습니까?`)) {
                                onDeleteItem?.(member.id, item.name);
                              }
                            }}
                            className="p-1.5 rounded bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex items-center gap-2 pl-13">
                          <button onClick={() => setEditCount(c => Math.max(1, c - 1))} className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"><Minus size={12} /></button>
                          <input
                            type="number"
                            value={editCount}
                            onChange={e => setEditCount(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                          />
                          <button onClick={() => setEditCount(c => c + 1)} className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"><Plus size={12} /></button>
                          <button
                            onClick={() => { onAdjustItemCount?.(member.id, item.name, editCount); setEditingItem(null); }}
                            className="px-3 py-1 rounded bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600"
                          >
                            저장
                          </button>
                          <button onClick={() => setEditingItem(null)} className="px-3 py-1 rounded bg-gray-200 text-gray-600 text-sm hover:bg-gray-300">취소</button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            {CATEGORIES.map(cat => {
              const Icon = cat.Icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    categoryFilter === cat.id
                      ? cat.color
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* 아이템 그리드 */}
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {filteredItems.map(item => {
              if (!item || !item.id) return null;
              
              const ItemIcon = getItemIcon(item);
              const itemColor = getItemColor(item);
              
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedItem?.id === item.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  title={item.name || 'Unknown'}
                >
                  <div className="relative">
                    <div className="w-full h-12 flex items-center justify-center relative">
                      {item.spriteUrl || item.imageUrl ? (
                        <img 
                          src={item.spriteUrl || item.imageUrl} 
                          alt={item.name || 'Item'}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ display: (item.spriteUrl || item.imageUrl) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                        <ItemIcon size={32} className="text-gray-300" />
                      </div>
                    </div>
                    
                    {/* 카테고리 아이콘 뱃지 */}
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${itemColor}`}>
                      <ItemIcon size={12} />
                    </div>
                  </div>
                  <div className="text-xs text-center truncate mt-1 text-gray-700">{item.name || 'Unknown'}</div>
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
            <div className="bg-white/40 rounded-lg p-4 border-2 border-lime-200">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-20 h-20 flex items-center justify-center relative bg-white rounded-lg">
                  {selectedItem.spriteUrl || selectedItem.imageUrl ? (
                    <img 
                      src={selectedItem.spriteUrl || selectedItem.imageUrl} 
                      alt={selectedItem.name || 'Item'}
                      className="max-w-full max-h-full"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{ display: (selectedItem.spriteUrl || selectedItem.imageUrl) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                    {(() => {
                      const SelectedIcon = getItemIcon(selectedItem);
                      return <SelectedIcon size={48} className="text-gray-300" />;
                    })()}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-gray-800">{selectedItem.name}</h4>
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${getItemColor(selectedItem)}`}>
                      {(() => {
                        const SelectedIcon = getItemIcon(selectedItem);
                        const category = CATEGORIES.find(c => c.id === getItemPocket(selectedItem));
                        return (
                          <>
                            <SelectedIcon size={12} />
                            <span>{category?.name || '기타'}</span>
                          </>
                        );
                      })()}
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
