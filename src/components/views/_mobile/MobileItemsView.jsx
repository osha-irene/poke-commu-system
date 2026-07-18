// src/components/views/_mobile/MobileItemsView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, ShoppingCart, Trash2, Search } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { getItemPocket, canUseItem, CATEGORIES, POCKET_LABELS } from '../../../utils/itemUtils';
import { isSoyYYNItem } from '../../../utils/specialItemUtils';
import { getOwnedPokemonSpriteUrl } from '../../../utils/pokemonImageUtils';
import { getItemEffectBadges } from '../../../utils/itemEffectBadges';
import { canUseItemOnPokemonTarget, FORM_CHANGE_ITEM_POKEMON } from '../../../utils/itemUsageRules';

const NECTAR_FORM_MAP = {
  'red-nectar': 'oricorio-baile',
  'yellow-nectar': 'oricorio-pom-pom',
  'pink-nectar': 'oricorio-pau',
  'purple-nectar': 'oricorio-sensu',
};

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
    allMoves = [],
    pokemonLearnsets = {},
    systemSettings = {},
    getPokemonFormCandidates,
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
  const [selectedForm, setSelectedForm] = useState(null);
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

  const getItemNameEn = (item) => {
    const details = getItemDetails(item);
    return details.itemData?.nameEn || item.nameEn || item.name || '';
  };

  const isFormChangeItem = (item) => Boolean(FORM_CHANGE_ITEM_POKEMON[getItemNameEn(item)]);

  const getAvailableForms = (item, pokemon) => {
    if (!getPokemonFormCandidates || !pokemon) return [];
    const forms = getPokemonFormCandidates(pokemon);
    return forms.filter(f => f.nameEn !== pokemon.nameEn);
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

  const handleItemClick = (item) => {
    const details = getItemDetails(item);
    // 볼 변경 티켓 / 미용실 이용권: 포켓몬 선택 없이 바로 QnA "아이템" 탭 작성 모달을 띄운다
    if (details.specialEffect === 'qnaItemPermit') {
      onUseItem?.({ ...item, specialEffect: 'qnaItemPermit', permitKind: details.itemData?.permitKind }, null);
      return;
    }
    setSelectedItem(item);
    setActionMode(null);
  };
  const closeAll = () => { setSelectedItem(null); setActionMode(null); setQuantity(1); setSelectedPokemon(null); setSelectedForm(null); };
  const closeAction = () => { setActionMode(null); setQuantity(1); setSelectedPokemon(null); setSelectedForm(null); };

  const handleUse = () => {
    const details = selectedItem ? getItemDetails(selectedItem) : null;
    if (details?.specialEffect === 'trainerExp') {
      if (onUseItem && selectedItem) {
        // resolveItemData의 name/nameEn 기반 매칭이 다른 아이템으로 오매칭되는 경우가 있어,
        // 화면에서 이미 정확히 찾아낸 specialEffect/boostAmount를 직접 실어 보냄
        onUseItem({ ...selectedItem, specialEffect: 'trainerExp', boostAmount: details.boostAmount }, null);
        closeAll();
      }
      return;
    }
    if (!selectedPokemon) { alert('포켓몬을 선택해주세요!'); return; }

    const itemNameEn = getItemNameEn(selectedItem);
    const isFormItem = isFormChangeItem(selectedItem);

    // 폼체인지 아이템: 대상 폼을 targetFormNameEn으로 명시해서 넘겨야 실제로 폼이 바뀐다
    // (데스크톱 ItemsView.jsx와 동일한 흐름 - 이게 없으면 예전 window.prompt() 폴백으로 빠짐)
    if (isFormItem) {
      const nectarForm = NECTAR_FORM_MAP[itemNameEn];
      if (!nectarForm && !selectedForm) { alert('폼을 선택해주세요!'); return; }
      const targetFormNameEn = nectarForm || selectedForm.nameEn || selectedForm.id || selectedForm.name;
      if (onUseItem) {
        onUseItem(selectedItem, selectedPokemon, targetFormNameEn);
        closeAll();
      }
      return;
    }

    if (!canUseItemOnPokemonTarget({
      item: selectedItem,
      itemData: details.itemData,
      pokemon: selectedPokemon,
      allMoves,
      pokemonLearnsets,
      systemSettings
    })) {
      return;
    }

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
              const effectBadges = getItemEffectBadges(details);
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
                    <div style={{ fontSize: 10, color: P.muted, lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                      {details.description}
                    </div>
                  )}
                  {effectBadges.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {effectBadges.map((effectBadge, badgeIndex) => (
                        <span
                          key={badgeIndex}
                          title={effectBadge.title || effectBadge.label}
                          className={`item-effect-pill item-effect-pill--${effectBadge.tone || 'default'}`}
                        >
                          {effectBadge.label}
                        </span>
                      ))}
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
      {selectedItem && actionMode === 'use' && selectedDetails && (() => {
        const itemNameEn = getItemNameEn(selectedItem);
        const isNectar = Boolean(NECTAR_FORM_MAP[itemNameEn]);
        const isFormItem = isFormChangeItem(selectedItem);
        const eligibleNumbers = FORM_CHANGE_ITEM_POKEMON[itemNameEn] || [];
        const eligiblePokemon = allPokemonForItem.filter(p =>
          p && p !== 'null' && p.uniqueId &&
          eligibleNumbers.includes(Number(p.originalNumber || p.number))
        );

        let title = '사용할 포켓몬 선택';
        let showBack = false;
        let canConfirm = false;
        let confirmLabel = '사용하기';
        let body;

        const pokemonGrid = (list, onPick) => (
          <div style={{ overflowY: 'auto', padding: 12, scrollbarWidth: 'none', flex: 1 }}>
            {list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: P.muted, fontSize: 13 }}>대상 포켓몬이 없습니다</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {list.map(pokemon => {
                  const active = selectedPokemon?.uniqueId === pokemon.uniqueId;
                  return (
                    <button
                      key={pokemon.uniqueId}
                      onClick={() => onPick(pokemon)}
                      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12, border: `2px solid ${active ? P.accent : P.border}`, background: active ? P.accentBg : P.card, cursor: 'pointer' }}
                    >
                      <img src={getOwnedPokemonSpriteUrl(pokemon)} alt={pokemon.name} style={{ width: 44, height: 44, imageRendering: 'pixelated', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pokemon.nickname || pokemon.name}</div>
                        <div style={{ fontSize: 11, color: P.muted }}>Lv.{pokemon.level}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

        if (selectedDetails.specialEffect === 'trainerExp') {
          title = '아이템 사용';
          canConfirm = true;
          body = (
            <div style={{ padding: 20, textAlign: 'center', color: P.text, fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ color: '#7020c0', fontWeight: 700 }}>본인의 경험치</span>가 {selectedDetails.boostAmount}점 상승합니다.
            </div>
          );
        } else if (isNectar && selectedPokemon) {
          // 꿀: 대상 폼이 정해져 있어 확인만
          title = '폼 변경 확인';
          showBack = eligiblePokemon.length > 1;
          canConfirm = true;
          confirmLabel = '변경';
          const targetFormNameEn = NECTAR_FORM_MAP[itemNameEn];
          const allForms = getAvailableForms(selectedItem, selectedPokemon);
          const targetForm = allForms.find(f => f.nameEn === targetFormNameEn);
          const formLabel = targetForm?.name || targetFormNameEn;
          body = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 20 }}>
              <img src={getOwnedPokemonSpriteUrl(selectedPokemon)} alt={selectedPokemon.name} style={{ width: 64, height: 64, imageRendering: 'pixelated' }} />
              <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: P.text, fontWeight: 700 }}>
                {selectedPokemon.nickname || selectedPokemon.name}을(를)<br />
                <span style={{ color: '#0f766e' }}>{formLabel}</span>으로 바꾸겠습니까?
              </p>
            </div>
          );
        } else if (isNectar && !selectedPokemon) {
          title = '춤추새 선택';
          body = pokemonGrid(eligiblePokemon, (pokemon) => setSelectedPokemon(pokemon));
        } else if (isFormItem && selectedPokemon) {
          // 일반 폼체인지(로토무 도감 등): 대상 폼을 직접 골라야 함
          title = `${selectedPokemon.nickname || selectedPokemon.name}의 폼 선택`;
          showBack = eligiblePokemon.length > 1;
          canConfirm = Boolean(selectedForm);
          confirmLabel = '폼 변경';
          const availableForms = getAvailableForms(selectedItem, selectedPokemon);
          body = (
            <div style={{ overflowY: 'auto', padding: 12, scrollbarWidth: 'none', flex: 1 }}>
              {availableForms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: P.muted, fontSize: 13 }}>변경 가능한 폼이 없습니다</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {availableForms.map(form => {
                    const active = selectedForm?.nameEn === form.nameEn;
                    return (
                      <button
                        key={form.id || form.nameEn}
                        onClick={() => setSelectedForm(form)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', borderRadius: 12, border: `2px solid ${active ? P.accent : P.border}`, background: active ? P.accentBg : P.card, cursor: 'pointer' }}
                      >
                        <img src={form.spriteUrl || form.imageUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${form.number}.png`} alt={form.name} style={{ width: 44, height: 44, imageRendering: 'pixelated' }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: P.text, textAlign: 'center', lineHeight: 1.2 }}>{form.name || form.nameEn}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        } else if (isFormItem && !selectedPokemon) {
          title = '포켓몬 선택';
          body = pokemonGrid(eligiblePokemon, (pokemon) => { setSelectedPokemon(pokemon); setSelectedForm(null); });
        } else {
          // 일반 아이템: 조건에 안 맞는 포켓몬은 선택 자체를 막는다 (데스크톱과 동일)
          title = '사용할 포켓몬 선택';
          canConfirm = Boolean(selectedPokemon);
          const targets = allPokemonForItem.filter(p => p && p !== 'null' && p.uniqueId);
          body = (
            <div style={{ overflowY: 'auto', padding: 12, scrollbarWidth: 'none', flex: 1 }}>
              {targets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: P.muted, fontSize: 13 }}>보유한 포켓몬이 없습니다</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {targets.map(pokemon => {
                    const canUseTarget = canUseItemOnPokemonTarget({
                      item: selectedItem,
                      itemData: selectedDetails.itemData,
                      pokemon,
                      allMoves,
                      pokemonLearnsets,
                      systemSettings,
                    });
                    const active = selectedPokemon?.uniqueId === pokemon.uniqueId;
                    return (
                      <button
                        key={pokemon.uniqueId}
                        onClick={() => { if (canUseTarget) setSelectedPokemon(pokemon); }}
                        disabled={!canUseTarget}
                        style={{
                          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 12,
                          border: `2px solid ${active ? P.accent : P.border}`,
                          background: active ? P.accentBg : P.card,
                          cursor: canUseTarget ? 'pointer' : 'not-allowed',
                          opacity: canUseTarget ? 1 : 0.45,
                        }}
                      >
                        <img src={getOwnedPokemonSpriteUrl(pokemon)} alt={pokemon.name} style={{ width: 44, height: 44, imageRendering: 'pixelated', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pokemon.nickname || pokemon.name}</div>
                          <div style={{ fontSize: 11, color: P.muted }}>Lv.{pokemon.level}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 250 }} onClick={closeAction} />
            <div className="item-sheet" style={{ position: 'fixed', bottom: isNavHidden ? 0 : 64, left: 0, right: 0, zIndex: 300, maxHeight: '55vh', display: 'flex', flexDirection: 'column', background: 'rgba(248,254,240,1)', borderTop: `1px solid rgba(90,160,30,0.2)`, borderRadius: '16px 16px 0 0', transition: 'bottom 0.28s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0, gap: 8 }}>
                {showBack ? (
                  <button onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, fontSize: 12, fontWeight: 700, padding: 0, flexShrink: 0 }}>
                    ← 다시 선택
                  </button>
                ) : <span />}
                <span style={{ fontSize: 14, fontWeight: 700, color: P.text, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                <button onClick={closeAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, padding: 4, flexShrink: 0 }}><X size={20} /></button>
              </div>
              {body}
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${P.border}`, display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={closeAction} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${P.border}`, background: 'rgba(245,245,245,0.9)', color: P.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                <button onClick={handleUse} disabled={!canConfirm} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 800, cursor: canConfirm ? 'pointer' : 'not-allowed', color: '#fff', background: canConfirm ? '#7020c0' : '#ccc' }}>{confirmLabel}</button>
              </div>
            </div>
          </>
        );
      })()}

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
