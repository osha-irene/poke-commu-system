// src/components/views/_mobile/MobileItemsView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ShoppingCart, Trash2, Search, Package } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { getItemPocket, canUseItem, CATEGORIES, getItemIcon, POCKET_LABELS } from '../../../utils/itemUtils';
import { isSoyYYNItem } from '../../../utils/specialItemUtils';

const P = {
  card:     'rgba(255,255,255,0.90)',
  border:   'rgba(0,0,0,0.10)',
  text:     '#1a2e10',
  muted:    '#5a7a40',
  accent:   '#4a9a08',
  accentBg: 'rgba(74,154,8,0.15)',
  price:    '#a05000',
};

export default function MobileItemsView() {
  const {
    items = [],
    allItems = [],
    caughtPokemon = [],
    partnerPokemon = null,
    sellItem: onSellItem,
    useItemOnPokemon: onUseItem,
    currentUser: trainer,
  } = useGame();

  const allPokemonForItem = partnerPokemon
    ? [partnerPokemon, ...caughtPokemon.filter(p => p?.uniqueId !== partnerPokemon.uniqueId)]
    : caughtPokemon;

  const isSuperAdmin = trainer?.isSuperAdmin || false;

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null); // null | 'use' | 'sell' | 'trash'
  const [quantity, setQuantity] = useState(1);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      const d = y - lastScrollYRef.current;
      if (y < 24)      setIsNavHidden(false);
      else if (d > 8)  setIsNavHidden(true);
      else if (d < -8) setIsNavHidden(false);
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getItemDetails = (item) => {
    if (!item || !item.name) return { name: '알 수 없는 아이템', description: '', imageUrl: '', pocket: 'misc', canSell: true, canUse: false, sellPrice: 0 };
    let itemData = item.itemId ? allItems.find(i => i.id === item.itemId) : null;
    if (!itemData) itemData = allItems.find(i => i.name === item.name || i.nameEn === item.name || i.id === item.name);
    const pocket = getItemPocket(itemData || item);
    const description = itemData?.effect || itemData?.description || item.effect?.replace(/\n/g, ' ') || item.description || '';
    return {
      name: item.name,
      description,
      imageUrl: item.imageUrl || itemData?.spriteUrl || itemData?.imageUrl || '',
      cost: itemData?.cost ?? item.cost ?? 0,
      sellPrice: itemData?.sellPrice ?? item.sellPrice ?? 0,
      pocket,
      canSell: item.canSell !== undefined ? item.canSell : (itemData?.canSell ?? true),
      canUse: isSoyYYNItem(item) || isSoyYYNItem(itemData) ? true : canUseItem(itemData || item),
      specialEffect: item.specialEffect || itemData?.specialEffect || null,
      evBoost: item.evBoost || itemData?.evBoost,
      friendshipBoost: item.friendshipBoost || itemData?.friendshipBoost,
      conditionBoost: item.conditionBoost || itemData?.conditionBoost,
      boostAmount: item.boostAmount || itemData?.boostAmount,
      isCustom: Boolean(item.isCustom || itemData?.isCustom),
      itemData,
    };
  };

  const isSafariBallItem = (item) => {
    const names = [item?.name, item?.nameEn, item?.id, item?.itemId].map(v => String(v || '').toLowerCase().replace(/[\s-_]/g, ''));
    return names.includes('사파리볼') || names.includes('safariball');
  };

  const visibleBagItems = items.filter(item => !isSafariBallItem(item));

  let filteredItems = visibleBagItems.filter(item => {
    if (selectedCategory !== 'all' && getItemDetails(item).pocket !== selectedCategory) return false;
    if (searchQuery.trim()) return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return true;
  });

  filteredItems = [...filteredItems].sort((a, b) => {
    const pA = getItemDetails(a).pocket || 'misc';
    const pB = getItemDetails(b).pocket || 'misc';
    if (pA !== pB) return pA.localeCompare(pB);
    return (a?.name || '').localeCompare(b?.name || '', 'ko');
  });

  const handleItemClick = (item) => { setSelectedItem(item); setActionMode(null); };
  const closeAll = () => { setSelectedItem(null); setActionMode(null); setQuantity(1); setSelectedPokemon(null); };
  const closeAction = () => { setActionMode(null); setQuantity(1); setSelectedPokemon(null); };

  const handleUse = () => {
    if (!selectedPokemon) { alert('포켓몬을 선택해주세요!'); return; }
    if (onUseItem && selectedItem) {
      onUseItem(selectedItem, selectedPokemon);
      closeAll();
    }
  };

  const handleSell = () => {
    if (!selectedItem || quantity < 1) return;
    const details = getItemDetails(selectedItem);
    if (!details.canSell) { alert('이 아이템은 판매할 수 없습니다!'); return; }
    if (quantity > selectedItem.count) { alert('보유 수량보다 많이 판매할 수 없습니다!'); return; }
    if (onSellItem) { onSellItem(selectedItem, quantity); closeAll(); }
  };

  const handleTrash = () => {
    if (!selectedItem || quantity < 1) return;
    if (quantity > selectedItem.count) { alert('보유 수량보다 많이 버릴 수 없습니다!'); return; }
    if (window.confirm(`${selectedItem.name} ${quantity}개를 버리시겠습니까?`)) {
      if (onSellItem) onSellItem({ ...selectedItem, _isTrash: true }, quantity);
      closeAll();
    }
  };

  const selectedDetails = selectedItem ? getItemDetails(selectedItem) : null;

  return (
    <div style={{ paddingTop: 14, paddingBottom: 88, minHeight: '100%' }}>
      <style>{`
        @keyframes sheet-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes search-expand { from { width: 34px; opacity: 0.4; } to { width: 130px; opacity: 1; } }
        .item-sheet { animation: sheet-up 0.22s ease-out; }
        .search-expand { animation: search-expand 0.18s ease-out; }
      `}</style>

      {/* 잔액 + 아이템 수 — 우측 pill */}
      <div style={{ margin: '0 12px 10px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: P.price, borderRadius: 20, padding: '4px 10px' }}>{(trainer?.money || 0).toLocaleString()}원</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: P.accent, borderRadius: 20, padding: '4px 10px' }}>아이템 {visibleBagItems.reduce((s, i) => s + i.count, 0)}개</span>
      </div>

      {/* 카테고리 탭바 + 검색 아이콘 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
          <div style={{ flex: 1, overflowX: 'auto', scrollbarWidth: 'none', display: 'flex', gap: 6, paddingBottom: 2 }}>
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${active ? P.accent : P.border}`, background: active ? P.accent : 'rgba(255,255,255,0.90)', color: active ? '#fff' : P.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          {/* 검색 아이콘 — 클릭시 확장 */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {searchQuery ? (
              <div className="search-expand" style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${P.accent}`, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.97)' }}>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  style={{ width: 110, padding: '5px 8px', border: 'none', fontSize: 12, color: P.text, background: 'transparent', outline: 'none' }}
                />
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, padding: '4px 6px' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchQuery(' ')}
                style={{ width: 34, height: 34, borderRadius: 20, border: `1.5px solid ${P.border}`, background: 'rgba(255,255,255,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: P.muted }}
              >
                <Search size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 아이템 리스트 */}
      <div style={{ padding: '0 12px', paddingBottom: selectedItem && !actionMode ? 160 : 0 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <img src="/pokeball.png" alt="" style={{ width: 48, height: 48, opacity: 0.7 }} />
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600 }}>
              {searchQuery ? '검색 결과가 없습니다' : '보유한 아이템이 없습니다'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, overflow: 'hidden' }}>
            {filteredItems.map((item, i) => {
              const details = getItemDetails(item);
              const pocketName = POCKET_LABELS[details.pocket] || '기타';
              const isSelected = selectedItem?.name === item.name;
              return (
                <button
                  key={i}
                  onClick={() => handleItemClick(item)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '11px 11px', background: isSelected ? 'rgba(205,230,170,0.95)' : P.card, border: `1.5px solid ${isSelected ? 'rgba(80,150,20,0.7)' : P.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}
                >
                  {/* 상단: 이미지 + 이름 + 개수 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 34, height: 34, flexShrink: 0, background: 'rgba(245,250,238,0.9)', borderRadius: 8, border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {details.imageUrl
                        ? <img src={details.imageUrl} alt={details.name} className={details.isCustom ? 'custom-item-image-32' : ''} style={{ width: 26, height: 26, objectFit: 'contain', imageRendering: 'pixelated' }} />
                        : <span style={{ fontSize: 16 }}>📦</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: P.muted, background: P.accentBg, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{pocketName}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: P.accent, flexShrink: 0 }}>{isSuperAdmin ? '∞' : `×${item.count}`}</span>
                  </div>
                  {/* 하단: 설명 (이미지 왼쪽 기준) */}
                  {details.description && (
                    <div style={{ fontSize: 10, color: P.muted, lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {details.description}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 아이템 상세 바텀시트 */}
      {selectedItem && !actionMode && selectedDetails && (
        <div className="item-sheet" style={{
          position: 'fixed', bottom: isNavHidden ? 0 : 64, left: 0, right: 0, zIndex: 200,
          transition: 'bottom 0.28s ease',
          background: 'rgba(248,254,240,1)',
          borderTop: `1px solid rgba(90,160,30,0.2)`,
          padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* 아이템 정보 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: selectedDetails.isCustom ? 64 : 48, height: selectedDetails.isCustom ? 64 : 48, background: 'rgba(255,255,255,0.75)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {selectedDetails.imageUrl
                ? <img src={selectedDetails.imageUrl} alt={selectedDetails.name} className={selectedDetails.isCustom ? 'custom-item-image-64' : ''} style={{ width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' }} />
                : <span style={{ fontSize: 24 }}>📦</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 2 }}>{selectedDetails.name}</div>
              {selectedDetails.description && <div style={{ fontSize: 11, color: P.muted, lineHeight: 1.4, marginTop: 2 }}>{selectedDetails.description}</div>}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: P.accent }}>{isSuperAdmin ? '∞' : `×${selectedItem.count}`}</div>
            </div>
            <button onClick={closeAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: P.muted, padding: 4, flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>
          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedDetails.canUse && (
              <button onClick={() => setActionMode('use')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: 'none', background: '#7020c0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Sparkles size={15} /> 사용
              </button>
            )}
            {selectedDetails.canSell && selectedDetails.sellPrice > 0 && (
              <button onClick={() => { setActionMode('sell'); setQuantity(1); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: 'none', background: P.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <ShoppingCart size={15} /> 판매
              </button>
            )}
            <button onClick={() => { setActionMode('trash'); setQuantity(1); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 10, border: 'none', background: '#c03020', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Trash2 size={15} /> 버리기
            </button>
          </div>
        </div>
      )}

      {/* 사용 — 포켓몬 선택 바텀시트 (위에서 절반 차지) */}
      {selectedItem && actionMode === 'use' && selectedDetails && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 250 }} onClick={closeAction} />
          <div className="item-sheet" style={{ position: 'fixed', bottom: isNavHidden ? 0 : 64, left: 0, right: 0, zIndex: 300, maxHeight: '55vh', display: 'flex', flexDirection: 'column', background: 'rgba(248,254,240,1)', borderTop: `1px solid rgba(90,160,30,0.2)`, borderRadius: '16px 16px 0 0', transition: 'bottom 0.28s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>사용할 포켓몬 선택</span>
              <button onClick={closeAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: 12, scrollbarWidth: 'none', flex: 1 }}>
              {allPokemonForItem.filter(p => p && p !== 'null' && p.uniqueId).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: P.muted, fontSize: 13 }}>보유한 포켓몬이 없습니다</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {allPokemonForItem.filter(p => p && p !== 'null' && p.uniqueId).map(pokemon => (
                    <button
                      key={pokemon.uniqueId}
                      onClick={() => setSelectedPokemon(pokemon)}
                      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12, border: `2px solid ${selectedPokemon?.uniqueId === pokemon.uniqueId ? P.accent : P.border}`, background: selectedPokemon?.uniqueId === pokemon.uniqueId ? P.accentBg : P.card, cursor: 'pointer' }}
                    >
                      <img src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`} alt={pokemon.name} style={{ width: 44, height: 44, imageRendering: 'pixelated', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pokemon.nickname || pokemon.name}</div>
                        <div style={{ fontSize: 11, color: P.muted }}>Lv.{pokemon.level}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={closeAction} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${P.border}`, background: 'rgba(245,245,245,0.9)', color: P.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleUse} disabled={!selectedPokemon} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 800, cursor: selectedPokemon ? 'pointer' : 'not-allowed', color: '#fff', background: selectedPokemon ? '#7020c0' : '#ccc' }}>사용하기</button>
            </div>
          </div>
        </>
      )}

      {/* 판매/버리기 바텀시트 */}
      {selectedItem && (actionMode === 'sell' || actionMode === 'trash') && selectedDetails && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 250 }} onClick={closeAction} />
          <div className="item-sheet" style={{ position: 'fixed', bottom: isNavHidden ? 0 : 64, left: 0, right: 0, zIndex: 300, background: 'rgba(248,254,240,1)', borderTop: `1px solid rgba(90,160,30,0.2)`, borderRadius: '16px 16px 0 0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'bottom 0.28s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{actionMode === 'sell' ? '판매하기' : '버리기'}</span>
              <button onClick={closeAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${P.border}`, borderRadius: 10, overflow: 'hidden', background: P.card }}>
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 48, height: 48, background: 'transparent', border: 'none', color: P.text, fontSize: 22, cursor: 'pointer' }}>−</button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800, color: P.text }}>{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(selectedItem.count, q + 1))} style={{ width: 48, height: 48, background: 'transparent', border: 'none', color: P.text, fontSize: 22, cursor: 'pointer' }}>+</button>
            </div>
            {actionMode === 'sell' && selectedDetails.sellPrice > 0 && (
              <div style={{ fontSize: 14, fontWeight: 800, color: P.price }}>총 {(selectedDetails.sellPrice * quantity).toLocaleString()}원</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={closeAction} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${P.border}`, background: 'rgba(245,245,245,0.9)', color: P.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={actionMode === 'sell' ? handleSell : handleTrash} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', color: '#fff', background: actionMode === 'sell' ? P.accent : '#c03020' }}>
                {actionMode === 'sell' ? '판매하기' : '버리기'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
