// src/components/views/admin/member/MemberItemTab.jsx
import React, { useMemo, useState } from 'react';
import { Trash2, Minus, Plus, ArrowRightLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getButtonClass } from '../../../../styles/theme';
import { getItemPocket, CATEGORIES, getItemIcon, getItemColor, filterItemsByPocket } from '../../../../utils/itemUtils';

// 아이템 이름 비교용 정규화: 공백 유무나 유니코드 정규화 형태(NFC/NFD) 차이로 같은
// 이름인데 문자열이 달라 매칭에 실패하는 걸 막는다 (예: "식용얼음" vs "식용 얼음").
const normalizeItemName = (name) => (name || '').normalize('NFC').replace(/\s+/g, '');

// "이름*개수" 형식(줄바꿈 또는 쉼표 구분)을 [{ raw, name, count, error }]로 파싱
const parseItemEntries = (text) => (
  (text || '')
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(raw => {
      const match = raw.match(/^(.+?)\s*\*\s*(\d+)\s*$/);
      if (!match) return { raw, name: null, count: null, error: '형식 오류 (이름*개수)' };
      const count = parseInt(match[2], 10);
      if (!count || count < 1) return { raw, name: null, count: null, error: '개수는 1 이상이어야 합니다' };
      return { raw, name: match[1].trim(), count };
    })
);

function MemberItemTab({ member, allItems, onGiveItem, onDeleteItem, onAdjustItemCount, onExchangeItems }) {
  const [itemMode, setItemMode] = useState('view');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editCount, setEditCount] = useState(1);
  const [deductText, setDeductText] = useState('');
  const [giveText, setGiveText] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);

  // ✅ allItems 안전 처리
  const safeAllItems = Array.isArray(allItems) ? allItems : [];

  // 차감 목록 검증: 인벤토리에 실제로 그만큼 있는지 확인
  // 커스텀 재료는 과거 itemId 체계 변경 등으로 같은 이름이 여러 항목에 나뉘어
  // 저장돼 있을 수 있으므로, 하나만 찾지 않고 같은 이름의 항목을 모두 합산한다.
  const deductEntries = useMemo(() => {
    const inventory = Array.isArray(member?.inventory) ? member.inventory : [];
    return parseItemEntries(deductText).map(entry => {
      if (entry.error) return entry;
      const target = normalizeItemName(entry.name);
      const totalOwned = inventory.reduce((sum, i) => sum + (normalizeItemName(i.name) === target ? (i.count || 0) : 0), 0);
      if (totalOwned <= 0) return { ...entry, error: '보유하고 있지 않은 아이템입니다' };
      if (totalOwned < entry.count) {
        return { ...entry, error: `재고 부족 (보유 ${totalOwned}개)` };
      }
      return entry;
    });
  }, [deductText, member?.inventory]);

  // 지급 목록 검증: 아이템 카탈로그에 존재하는지 확인
  const giveEntries = useMemo(() => {
    const catalog = Array.isArray(allItems) ? allItems : [];
    return parseItemEntries(giveText).map(entry => {
      if (entry.error) return entry;
      const target = normalizeItemName(entry.name);
      const found = catalog.find(i => normalizeItemName(i.name) === target);
      if (!found) return { ...entry, error: '카탈로그에 없는 아이템입니다' };
      return entry;
    });
  }, [giveText, allItems]);

  const deductTotal = deductEntries.reduce((sum, e) => sum + (e.count || 0), 0);
  const giveTotal = giveEntries.reduce((sum, e) => sum + (e.count || 0), 0);
  const canExchange = deductEntries.length > 0 && giveEntries.length > 0
    && deductEntries.every(e => !e.error) && giveEntries.every(e => !e.error);

  const handleExchange = async () => {
    if (!canExchange || exchangeLoading) return;
    if (!window.confirm(
      `차감 ${deductEntries.length}종 (총 ${deductTotal}개)을 지급 ${giveEntries.length}종 (총 ${giveTotal}개)으로 교환하시겠습니까?`
    )) return;

    setExchangeLoading(true);
    try {
      const result = await onExchangeItems?.(
        member.id,
        deductEntries.map(({ name, count }) => ({ name, count })),
        giveEntries.map(({ name, count }) => ({ name, count }))
      );
      if (result?.success) {
        alert('교환이 완료되었습니다!');
        setDeductText('');
        setGiveText('');
      } else {
        alert(result?.reason || '교환에 실패했습니다.');
      }
    } finally {
      setExchangeLoading(false);
    }
  };
  
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
          {itemMode === 'view' ? '보유 아이템' : itemMode === 'give' ? '아이템 지급' : '아이템 교환'}
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
          <button
            onClick={() => setItemMode('exchange')}
            className={getButtonClass(itemMode === 'exchange' ? 'success' : 'secondary', 'md')}
          >
            <ArrowRightLeft size={14} className="inline mr-1" />교환
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

      {/* 교환 모드 */}
      {itemMode === 'exchange' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            한 줄에 하나씩 <span className="font-mono font-semibold">이름*개수</span> 형식으로 입력하세요. (예: 감자샐러드*10)
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* 차감 목록 */}
            <div>
              <label className="font-semibold text-gray-700 text-sm mb-1 block">차감할 아이템 (보유 인벤토리에서 소모)</label>
              <textarea
                value={deductText}
                onChange={(e) => setDeductText(e.target.value)}
                placeholder={'감자샐러드*10\n굵은대파*11'}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-all"
              />
              <div className="mt-1 text-xs space-y-0.5">
                {deductEntries.map((e, idx) => (
                  <div key={idx} className={`flex items-center gap-1 ${e.error ? 'text-red-500' : 'text-emerald-600'}`}>
                    {e.error ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    <span>{e.raw}</span>
                    {e.error && <span className="text-gray-500">— {e.error}</span>}
                  </div>
                ))}
              </div>
              {deductEntries.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">총 차감: {deductTotal}개 ({deductEntries.length}종)</p>
              )}
            </div>

            {/* 지급 목록 */}
            <div>
              <label className="font-semibold text-gray-700 text-sm mb-1 block">지급할 아이템 (교환으로 새로 받음)</label>
              <textarea
                value={giveText}
                onChange={(e) => setGiveText(e.target.value)}
                placeholder={'밀가루*30\n콩통조림*20'}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
              />
              <div className="mt-1 text-xs space-y-0.5">
                {giveEntries.map((e, idx) => (
                  <div key={idx} className={`flex items-center gap-1 ${e.error ? 'text-red-500' : 'text-emerald-600'}`}>
                    {e.error ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    <span>{e.raw}</span>
                    {e.error && <span className="text-gray-500">— {e.error}</span>}
                  </div>
                ))}
              </div>
              {giveEntries.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">총 지급: {giveTotal}개 ({giveEntries.length}종)</p>
              )}
            </div>
          </div>

          <button
            onClick={handleExchange}
            disabled={!canExchange || exchangeLoading}
            className={`w-full ${getButtonClass('success', 'lg')} ${(!canExchange || exchangeLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exchangeLoading ? '처리 중...' : '교환 실행'}
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberItemTab;
