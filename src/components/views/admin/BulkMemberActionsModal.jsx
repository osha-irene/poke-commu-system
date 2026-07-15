// src/components/views/admin/BulkMemberActionsModal.jsx
// 선택한 회원 여러 명을 대상으로 파트너 포켓몬 레벨 조정 / 친밀도 증가 / 아이템·돈 지급 / 칭호 부여를 처리하는 모달
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, Square, TrendingUp, Heart, Gift, Coins, Award } from 'lucide-react';
import { getItemIcon, CATEGORIES, filterItemsByPocket } from '../../../utils/itemUtils';
import { getButtonClass } from '../../../styles/theme';

const ACTION_TABS = [
  { id: 'level', label: '레벨 조정', icon: TrendingUp },
  { id: 'friendship', label: '친밀도 증가', icon: Heart },
  { id: 'item', label: '아이템 지급', icon: Gift },
  { id: 'money', label: '돈 지급', icon: Coins },
  { id: 'title', label: '칭호 부여', icon: Award },
];

export default function BulkMemberActionsModal({
  show,
  onClose,
  members = {},
  allItems = [],
  titles = [],
  onBulkAdjustPartnerLevel,
  onBulkIncreaseFriendship,
  onBulkGiveItem,
  onBulkGiveMoney,
  onBulkGrantTitle,
}) {
  const [actionTab, setActionTab] = useState('level');
  const [selectedIds, setSelectedIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [levelDelta, setLevelDelta] = useState(1);
  const [friendshipAmount, setFriendshipAmount] = useState(1);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCount, setItemCount] = useState(1);
  const [moneyAmount, setMoneyAmount] = useState(1000);
  const [selectedTitleId, setSelectedTitleId] = useState('');

  const memberList = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return Object.values(members)
      .filter(m => m && !m.isNPC)
      .filter(m => !query || m.name?.toLowerCase().includes(query) || m.id?.toLowerCase().includes(query))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members, memberSearch]);

  const filteredItems = useMemo(() => {
    let items = filterItemsByPocket(Array.isArray(allItems) ? allItems : [], itemCategory);
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(q) || i.nameEn?.toLowerCase().includes(q));
    }
    return items.filter(i => i && i.id);
  }, [allItems, itemCategory, itemSearch]);

  const partnerCount = useMemo(
    () => selectedIds.filter(id => members[id]?.partnerPokemon).length,
    [selectedIds, members]
  );

  if (!show) return null;

  const toggleMember = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(memberList.map(m => m.id));
  const clearAll = () => setSelectedIds([]);

  const resetActionInputs = () => {
    setSelectedItem(null);
    setItemCount(1);
    setLevelDelta(1);
    setFriendshipAmount(1);
    setMoneyAmount(1000);
    setSelectedTitleId('');
  };

  const handleClose = () => {
    setSelectedIds([]);
    setActionTab('level');
    resetActionInputs();
    onClose?.();
  };

  const handleAdjustLevel = () => {
    if (selectedIds.length === 0) { alert('회원을 선택해주세요.'); return; }
    const delta = Number(levelDelta);
    if (!Number.isFinite(delta) || delta === 0) { alert('조정할 레벨 값을 입력해주세요.'); return; }
    if (partnerCount === 0) { alert('선택한 회원 중 파트너 포켓몬을 보유한 회원이 없습니다.'); return; }
    if (!window.confirm(`선택한 회원 중 파트너 포켓몬 보유자 ${partnerCount}명의 레벨을 ${delta > 0 ? '+' : ''}${delta} 조정하시겠습니까?`)) return;
    onBulkAdjustPartnerLevel?.(selectedIds, delta);
  };

  const handleIncreaseFriendship = () => {
    if (selectedIds.length === 0) { alert('회원을 선택해주세요.'); return; }
    const amount = Number(friendshipAmount);
    if (!Number.isFinite(amount) || amount <= 0) { alert('증가시킬 친밀도 값을 입력해주세요.'); return; }
    if (!window.confirm(`선택한 ${selectedIds.length}명의 보유 포켓몬 전원 친밀도를 ${amount}만큼 증가시키겠습니까?`)) return;
    onBulkIncreaseFriendship?.(selectedIds, amount);
  };

  const handleGiveItem = () => {
    if (selectedIds.length === 0) { alert('회원을 선택해주세요.'); return; }
    if (!selectedItem) { alert('지급할 아이템을 선택해주세요.'); return; }
    if (!itemCount || itemCount < 1) { alert('개수를 입력해주세요.'); return; }
    if (!window.confirm(`선택한 ${selectedIds.length}명에게 ${selectedItem.name} ${itemCount}개를 지급하시겠습니까?`)) return;
    onBulkGiveItem?.(selectedIds, selectedItem, itemCount);
  };

  const handleGiveMoney = () => {
    if (selectedIds.length === 0) { alert('회원을 선택해주세요.'); return; }
    const amount = Number(moneyAmount);
    if (!Number.isFinite(amount) || amount <= 0) { alert('지급할 금액을 입력해주세요.'); return; }
    if (!window.confirm(`선택한 ${selectedIds.length}명에게 ${amount.toLocaleString()}원을 지급하시겠습니까?`)) return;
    onBulkGiveMoney?.(selectedIds, amount);
  };

  const handleGrantTitle = () => {
    if (selectedIds.length === 0) { alert('회원을 선택해주세요.'); return; }
    if (!selectedTitleId) { alert('부여할 칭호를 선택해주세요.'); return; }
    const titleLabel = titles.find(t => t.id === selectedTitleId)?.label || selectedTitleId;
    if (!window.confirm(`선택한 ${selectedIds.length}명에게 "${titleLabel}" 칭호를 부여하시겠습니까?`)) return;
    onBulkGrantTitle?.(selectedIds, selectedTitleId);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">일괄 작업</h2>
            <p className="text-sm text-gray-500 mt-0.5">회원을 선택하고 파트너 포켓몬 레벨 조정 / 친밀도 증가 / 아이템·돈 지급 / 칭호 부여를 한 번에 처리합니다.</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 rounded"><X size={20} /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* 왼쪽: 회원 선택 */}
          <div className="w-64 border-r border-gray-200 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-100 space-y-2">
              <input
                type="text"
                placeholder="회원 검색..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{selectedIds.length}명 선택됨</span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-indigo-600 font-semibold hover:underline">전체선택</button>
                  <button onClick={clearAll} className="text-gray-500 font-semibold hover:underline">선택해제</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {memberList.map(m => {
                const checked = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${checked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {checked ? <CheckSquare size={16} className="shrink-0 text-indigo-600" /> : <Square size={16} className="shrink-0 text-gray-300" />}
                    <span className="truncate flex-1">{m.name}</span>
                    {m.partnerPokemon && <span className="text-[10px] text-amber-600 shrink-0">파트너</span>}
                  </button>
                );
              })}
              {memberList.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">검색 결과가 없습니다</p>
              )}
            </div>
          </div>

          {/* 오른쪽: 작업 패널 */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex gap-2 px-4 pt-3">
              {ACTION_TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActionTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${actionTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Icon size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {actionTab === 'level' && (
                <div className="space-y-4 max-w-md">
                  <p className="text-sm text-gray-600">
                    선택한 회원들의 <b>파트너 포켓몬</b> 레벨을 한 번에 증감시킵니다.
                    (파트너 포켓몬 보유 회원에게만 적용되며, 레벨 1~100 범위로 자동 보정됩니다)
                  </p>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">증감치</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={levelDelta}
                        onChange={e => setLevelDelta(e.target.value)}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-sm text-gray-500">(예: -1, +5)</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">선택된 회원 중 파트너 포켓몬 보유: {partnerCount}명</p>
                  <button onClick={handleAdjustLevel} className={getButtonClass('primary', 'lg')}>레벨 조정 적용</button>
                </div>
              )}

              {actionTab === 'friendship' && (
                <div className="space-y-4 max-w-md">
                  <p className="text-sm text-gray-600">
                    선택한 회원들의 <b>보유 포켓몬 전원</b>(파티+박스+파트너) 친밀도를 한 번에 증가시킵니다.
                    (255를 넘지 않습니다)
                  </p>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">증가량</label>
                    <input
                      type="number"
                      min="1"
                      value={friendshipAmount}
                      onChange={e => setFriendshipAmount(e.target.value)}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button onClick={handleIncreaseFriendship} className={getButtonClass('success', 'lg')}>친밀도 증가 적용</button>
                </div>
              )}

              {actionTab === 'item' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">선택한 회원 전원에게 특정 아이템을 동일한 개수만큼 지급합니다.</p>
                  <input
                    type="text"
                    placeholder="아이템 검색..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.Icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setItemCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${itemCategory === cat.id ? cat.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          <Icon size={14} /> {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                    {filteredItems.map(item => {
                      const ItemIcon = getItemIcon(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`p-2 rounded-lg border-2 transition-all hover:shadow-md ${selectedItem?.id === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                          title={item.name}
                        >
                          <div className="w-full h-10 flex items-center justify-center relative">
                            {item.spriteUrl || item.imageUrl ? (
                              <img src={item.spriteUrl || item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                            ) : (
                              <ItemIcon size={28} className="text-gray-300" />
                            )}
                          </div>
                          <div className="text-[11px] text-center truncate mt-1 text-gray-700">{item.name}</div>
                        </button>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <p className="col-span-5 text-center text-gray-400 text-sm py-6">검색 결과가 없습니다</p>
                    )}
                  </div>

                  {selectedItem && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center gap-4">
                      <span className="font-semibold text-gray-800 flex-1 truncate">{selectedItem.name}</span>
                      <label className="text-sm font-semibold text-gray-600">개수:</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={itemCount}
                        onChange={e => setItemCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-center focus:border-indigo-500 focus:outline-none"
                      />
                      <button onClick={handleGiveItem} className={getButtonClass('success', 'md')}>일괄 지급</button>
                    </div>
                  )}
                </div>
              )}

              {actionTab === 'money' && (
                <div className="space-y-4 max-w-md">
                  <p className="text-sm text-gray-600">
                    선택한 회원들에게 <b>소지금</b>을 한 번에 지급합니다. (기존 소지금에 더해집니다)
                  </p>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">지급 금액</label>
                    <input
                      type="number"
                      min="1"
                      value={moneyAmount}
                      onChange={e => setMoneyAmount(e.target.value)}
                      className="w-40 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button onClick={handleGiveMoney} className={getButtonClass('success', 'lg')}>돈 지급 적용</button>
                </div>
              )}

              {actionTab === 'title' && (
                <div className="space-y-4 max-w-md">
                  <p className="text-sm text-gray-600">
                    선택한 회원들에게 <b>칭호</b>를 한 번에 부여합니다. (이미 보유한 회원은 건너뜁니다)
                  </p>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">부여할 칭호</label>
                    <select
                      value={selectedTitleId}
                      onChange={e => setSelectedTitleId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">칭호 선택...</option>
                      {titles.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleGrantTitle} className={getButtonClass('success', 'lg')}>칭호 부여 적용</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
