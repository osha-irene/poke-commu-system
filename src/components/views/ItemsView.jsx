import useMediaQuery from '../../hooks/useMediaQuery';
import MobileItemsView from './_mobile/MobileItemsView';
import { getItemPocket, canUseItem, CATEGORIES } from '../../utils/itemUtils';
import { canUseItemOnPokemonTarget, FORM_CHANGE_ITEM_POKEMON } from '../../utils/itemUsageRules';
import { isSoyYYNItem } from '../../utils/specialItemUtils';
import { getItemEffectBadges } from '../../utils/itemEffectBadges';
import { Package, Circle, Heart, Dumbbell, Apple, Disc, Backpack, Sparkles, Sword, Key, Search, X,Trash2, ShoppingCart } from 'lucide-react'; 
import React, { useState } from 'react';


import { useGame } from '../../contexts/GameContext';

function DesktopItemsView() {
  const {
    items = [],
    allItems = [],
    caughtPokemon = [],
    partnerPokemon = null,
    allMoves = [],
    pokemonLearnsets = {},
    sellItem: onSellItem,
    useItemOnPokemon: onUseItem,
    currentUser: trainer,
    getPokemonFormCandidates,
    systemSettings = {},
  } = useGame();

  // 파트너 포켓몬을 아이템 대상 목록 맨 앞에 포함
  const allPokemonForItem = partnerPokemon
    ? [partnerPokemon, ...caughtPokemon.filter(p => p?.uniqueId !== partnerPokemon.uniqueId)]
    : caughtPokemon;

  const isSuperAdmin = trainer?.isSuperAdmin || false;
  const onTrashItem = null;

  const NECTAR_FORM_MAP = {
    'red-nectar': 'oricorio-baile',
    'yellow-nectar': 'oricorio-pom-pom',
    'pink-nectar': 'oricorio-pau',
    'purple-nectar': 'oricorio-sensu',
  };

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('category');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);

  // items.json에서 상세 정보 가져오기 (완전 수정)
  const getItemDetails = (item) => {
  if (!item || !item.name) {
    console.warn('⚠️ Invalid item:', item);
    return {
      name: '알 수 없는 아이템',
      description: '아이템 정보가 없습니다',
      imageUrl: '/images/items/default.png',
      cost: 0,
      sellPrice: 0,
      pocket: 'misc',
      category: 'misc',
      canSell: true,
      canUse: false
    };
  }

  let itemData = null;
  if (item.itemId) {
    itemData = allItems.find(i => i.id === item.itemId);
  }
  
  if (!itemData) {
    itemData = allItems.find(i => 
      i.name === item.name || 
      i.nameEn === item.name ||
      i.id === item.name
    );
  }

  // itemData가 없으면 getItemPocket(null)이 곧바로 'misc'를 반환해버려서(진짜 값인 'misc'와
  // "못 찾음"을 구분 못 함) ||로는 item 쪽 category까지 못 내려간다. itemData 존재 여부로 직접 분기.
  const pocket = itemData ? getItemPocket(itemData) : getItemPocket(item);
  
  const category = item.category || itemData?.category || '';

  const description = itemData?.effect || 
                     itemData?.description || 
                     item.effect?.replace(/\n/g, ' ') || 
                     item.description || 
                     '유용한 아이템';

  const canUse = isSoyYYNItem(item) || isSoyYYNItem(itemData)
    ? true
    : item.canUse !== undefined ? item.canUse : canUseItem(itemData || item);

  return {
    name: item.name,
    description: description,
    imageUrl: item.imageUrl || itemData?.spriteUrl || itemData?.imageUrl || '/images/items/default.png',
    cost: itemData?.cost ?? item.cost ?? 0,
    sellPrice: itemData?.sellPrice ?? item.sellPrice ?? 0,
    pocket: pocket,
    category: category,
    canSell: item.canSell !== undefined ? item.canSell : (itemData?.canSell ?? true),
    canUse: canUse,
    specialEffect: item.specialEffect || itemData?.specialEffect || null,
    ivBoost: item.ivBoost || itemData?.ivBoost,
    evBoost: item.evBoost || itemData?.evBoost,
    friendshipBoost: item.friendshipBoost || itemData?.friendshipBoost,
    conditionBoost: item.conditionBoost || itemData?.conditionBoost,
    boostAmount: item.boostAmount || itemData?.boostAmount,
    isCustom: Boolean(item.isCustom || itemData?.isCustom),
    itemData: itemData
  };
};

const getPocketColor = (pocket) => {
  const colors = {
    'pokeballs': 'bg-red-50 border-red-200',
    'medicine': 'bg-green-50 border-green-200',
    'vitamins': 'bg-purple-50 border-purple-200',
    'berries': 'bg-pink-50 border-pink-200',
    'machines': 'bg-blue-50 border-blue-200',
    'held-items': 'bg-orange-50 border-orange-200',
    'evolution': 'bg-yellow-50 border-yellow-200',
    'battle-items': 'bg-red-50 border-red-200',
    'ingredients': 'bg-amber-50 border-amber-200',
    'key-items': 'bg-indigo-50 border-indigo-200'
  };
  return colors[pocket] || 'bg-gray-50 border-gray-200';
};

const getPocketBadge = (pocket) => {
  const badges = {
    'pokeballs': { text: '포획', color: 'bg-red-100 text-red-700' },
    'medicine': { text: '회복', color: 'bg-green-100 text-green-700' },
    'vitamins': { text: '영양', color: 'bg-purple-100 text-purple-700' },
    'berries': { text: '나무열매', color: 'bg-pink-100 text-pink-700' },
    'machines': { text: '기술머신', color: 'bg-blue-100 text-blue-700' },
    'held-items': { text: '도구', color: 'bg-orange-100 text-orange-700' },
    'evolution': { text: '진화', color: 'bg-yellow-100 text-yellow-700' },
    'battle-items': { text: '배틀', color: 'bg-red-100 text-red-700' },
    'ingredients': { text: '식재료', color: 'bg-amber-100 text-amber-700' },
    'key-items': { text: '중요', color: 'bg-indigo-100 text-indigo-700' }
  };
  return badges[pocket] || { text: '기타', color: 'bg-gray-100 text-gray-700' };
};


  const categoryIcons = {
  'all': Package,
  'pokeballs': Circle,
  'medicine': Heart,
  'vitamins': Dumbbell,
  'berries': Apple,
  'machines': Disc,
  'held-items': Backpack,
  'evolution': Sparkles,
  'battle-items': Sword,
  'ingredients': Apple,
  'key-items': Key,
  'misc': Package
};

const categories = CATEGORIES.map(cat => {
  const colorMap = {
    'all': 'bg-gray-100 text-gray-700',
    'pokeballs': 'bg-red-100 text-red-700',
    'medicine': 'bg-green-100 text-green-700',
    'vitamins': 'bg-purple-100 text-purple-700',
    'berries': 'bg-pink-100 text-pink-700',
    'machines': 'bg-blue-100 text-blue-700',
    'held-items': 'bg-orange-100 text-orange-700',
    'evolution': 'bg-yellow-100 text-yellow-700',
    'battle-items': 'bg-red-100 text-red-700',
    'ingredients': 'bg-amber-100 text-amber-700',
    'key-items': 'bg-indigo-100 text-indigo-700',
    'misc': 'bg-gray-100 text-gray-700'
  };
  
  return {
    ...cat,
    Icon: categoryIcons[cat.id] || Package,
    color: colorMap[cat.id] || 'bg-gray-100 text-gray-700'
  };
});

  const isSafariBallItem = (item) => {
    const normalizedNames = [item?.name, item?.nameEn, item?.id, item?.itemId]
      .map(value => String(value || '').toLowerCase().replace(/[\s-_]/g, ''));
    return normalizedNames.includes('사파리볼') || normalizedNames.includes('safariball');
  };

  const visibleBagItems = items.filter(item => !isSafariBallItem(item));

  const mergeItemStacks = (inventoryItems) => {
    const mergedMap = new Map();

    inventoryItems.forEach((item) => {
      const details = getItemDetails(item);
      const key = details.itemData?.id != null
        ? `id:${details.itemData.id}`
        : `name:${item.nameEn || item.name || item.itemId}`;
      const existing = mergedMap.get(key);

      if (existing) {
        mergedMap.set(key, {
          ...existing,
          count: Number(existing.count || 0) + Number(item.count || 0)
        });
      } else {
        mergedMap.set(key, {
          ...item,
          itemId: item.itemId ?? details.itemData?.id,
          nameEn: item.nameEn ?? details.itemData?.nameEn,
          imageUrl: item.imageUrl || details.imageUrl,
          count: Number(item.count || 0)
        });
      }
    });

    return Array.from(mergedMap.values());
  };

  const handleItemClick = (item) => {
    const details = getItemDetails(item);

    if (!details.canUse) {
      alert('이 아이템은 사용할 수 없습니다.');
      return;
    }

    // 볼 변경 티켓 / 미용실 이용권: 포켓몬 선택 없이 바로 QnA "아이템" 탭 작성 모달을 띄운다
    if (details.specialEffect === 'qnaItemPermit') {
      onUseItem?.({ ...item, specialEffect: 'qnaItemPermit', permitKind: details.itemData?.permitKind }, null);
      return;
    }

    if (isFormChangeItem(item)) {
      const itemNameEn = getItemNameEn(item);
      const eligibleNumbers = FORM_CHANGE_ITEM_POKEMON[itemNameEn] || [];
      const eligible = caughtPokemon.filter(p =>
        p && p !== 'null' && p.uniqueId &&
        eligibleNumbers.includes(Number(p.originalNumber || p.number))
      );
      if (eligible.length === 0) {
        alert('이 아이템을 사용할 수 있는 포켓몬이 없습니다.');
        return;
      }
      setSelectedItem(item);
      setActionMode('use');
      setSelectedForm(null);
      // 대상 1마리면 바로 폼 선택 단계
      if (eligible.length === 1) {
        setSelectedPokemon(eligible[0]);
      } else {
        setSelectedPokemon(null);
      }
      return;
    }

    setSelectedItem(item);
    setActionMode('use');
    setQuantity(1);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setActionMode(null);
    setQuantity(1);
    setSelectedPokemon(null);
    setSelectedForm(null);
  };

  const getItemNameEn = (item) => {
    if (!item) return '';
    const details = getItemDetails(item);
    return details.itemData?.nameEn || item.nameEn || item.name || '';
  };

  const isFormChangeItem = (item) => Boolean(FORM_CHANGE_ITEM_POKEMON[getItemNameEn(item)]);

  const getAvailableForms = (item, pokemon) => {
    if (!getPokemonFormCandidates || !pokemon) return [];
    const itemNameEn = getItemNameEn(item);
    const nectarForm = NECTAR_FORM_MAP[itemNameEn];
    if (nectarForm) {
      // 꿀: 현재 폼 제외한 특정 폼만
      const forms = getPokemonFormCandidates(pokemon);
      return forms.filter(f => f.nameEn !== pokemon.nameEn);
    }
    const forms = getPokemonFormCandidates(pokemon);
    return forms.filter(f => f.nameEn !== pokemon.nameEn);
  };

  const handleUse = () => {
    const details = getItemDetails(selectedItem);

    // 멤버(트레이너) 본인 대상 효과: 포켓몬 선택 없이 바로 사용
    if (details.specialEffect === 'trainerExp') {
      if (onUseItem && selectedItem) {
        // resolveItemData의 name/nameEn 기반 매칭이 다른 아이템으로 오매칭되는 경우가 있어,
        // 화면에서 이미 정확히 찾아낸 specialEffect/boostAmount를 직접 실어 보냄
        onUseItem({ ...selectedItem, specialEffect: 'trainerExp', boostAmount: details.boostAmount }, null);
        closeModal();
      } else {
        alert('아이템 사용 기능이 연결되지 않았습니다.');
      }
      return;
    }

    // 최대 포켓몬 슬롯 상승 아이템: 포켓몬 선택 없이 바로 사용
    if (details.specialEffect === 'maxPokemonSlots') {
      if (onUseItem && selectedItem) {
        onUseItem({ ...selectedItem, specialEffect: 'maxPokemonSlots', boostAmount: details.boostAmount }, null);
        closeModal();
      } else {
        alert('아이템 사용 기능이 연결되지 않았습니다.');
      }
      return;
    }

    // 나무열매플랜터 슬롯 추가 아이템: 포켓몬 선택 없이 바로 사용
    if (details.specialEffect === 'unlockBerryPlanter') {
      if (onUseItem && selectedItem) {
        onUseItem({ ...selectedItem, specialEffect: 'unlockBerryPlanter' }, null);
        closeModal();
      } else {
        alert('아이템 사용 기능이 연결되지 않았습니다.');
      }
      return;
    }

    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }

    const itemNameEn = getItemNameEn(selectedItem);
    const isFormItem = isFormChangeItem(selectedItem);

    // 폼체인지 아이템: 폼 선택 단계 필요
    if (isFormItem) {
      if (!selectedForm) {
        alert('폼을 선택해주세요!');
        return;
      }
      const nectarForm = NECTAR_FORM_MAP[itemNameEn];
      const targetFormNameEn = nectarForm || selectedForm.nameEn || selectedForm.id || selectedForm.name;
      if (onUseItem) {
        onUseItem(selectedItem, selectedPokemon, targetFormNameEn);
        closeModal();
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
      closeModal();
    } else {
      alert('아이템 사용 기능이 연결되지 않았습니다.');
    }
  };

  const handleSell = () => {
    if (!selectedItem || quantity < 1) return;
    
    const details = getItemDetails(selectedItem);
    if (!details.canSell) {
      alert('이 아이템은 판매할 수 없습니다!');
      return;
    }
    
    if (quantity > selectedItem.count) {
      alert('보유 수량보다 많이 판매할 수 없습니다!');
      return;
    }
    
    if (onSellItem) {
      onSellItem(selectedItem, quantity);
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
    }
  };

  const handleTrash = () => {
    if (!selectedItem || quantity < 1) return;
    
    if (quantity > selectedItem.count) {
      alert('보유 수량보다 많이 버릴 수 없습니다!');
      return;
    }
    
    if (window.confirm(`${selectedItem.name} ${quantity}개를 버리시겠습니까?`)) {
      if (onTrashItem) {
        onTrashItem(selectedItem, quantity);
      } else if (onSellItem) {
        const trashItem = { ...selectedItem, _isTrash: true };
        onSellItem(trashItem, quantity);
      }
      
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
    }
  };

  let filteredItems = visibleBagItems.filter(item => {
    if (selectedCategory !== 'all') {
      const details = getItemDetails(item);
      if (details.pocket !== selectedCategory) {
        return false;
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query);
    }
    
    return true;
  });

  filteredItems = mergeItemStacks(filteredItems).sort((a, b) => {
    if (sortBy === 'category') {
      const detailsA = getItemDetails(a);
      const detailsB = getItemDetails(b);
      const pocketA = detailsA?.pocket || 'misc';
      const pocketB = detailsB?.pocket || 'misc';
      
      if (pocketA !== pocketB) {
        return pocketA.localeCompare(pocketB);
      }
      
      return (a?.name || '').localeCompare(b?.name || '', 'ko');
    } else {
      return (a?.name || '').localeCompare(b?.name || '', 'ko');
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">보유 아이템</h3>
            {isSuperAdmin && (
              <p className="text-sm text-yellow-600 font-semibold mt-1">
                ⭐ 슈퍼 관리자: 아이템 무한 사용 가능
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold text-yellow-700">💰 보유 금액: </span>
              <span className="text-lg font-bold text-yellow-600">{(trainer.money || 0).toLocaleString()}원</span>
            </div>
            <div className="text-sm text-gray-500">
              총 {visibleBagItems.reduce((sum, item) => sum + item.count, 0)}개
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="아이템 검색..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="category">카테고리순</option>
            <option value="name">ㄱㄴㄷ순</option>
          </select>
        </div>

        <div id="item-category-filter" className="flex gap-2 mb-6 pb-2" style={{ overflowX: 'auto' }}>
          {categories.map(cat => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id ? cat.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? '검색 결과가 없습니다' : '보유한 아이템이 없습니다'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item, i) => {
              const details = getItemDetails(item);
              const pocketColor = getPocketColor(details.pocket);
              const badge = getPocketBadge(details.pocket);
              const effectBadges = getItemEffectBadges(details);

              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`relative w-full min-h-32 flex items-start gap-4 rounded-lg p-4 border-2 transition-all text-left ${pocketColor} ${
                      details.canUse ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'
                    }`}
                  >
                    <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className={details.isCustom ? 'custom-item-image-64' : 'item-sprite item-sprite-2x object-contain'}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-base text-gray-800 truncate">{details.name}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {details.description}
                      </div>

                      {effectBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {details.cost > 0 && (
                            <div className="text-xs text-gray-500">
                              💰 {details.cost.toLocaleString()}원
                            </div>
                          )}
                          {details.canSell && details.sellPrice > 0 && (
                            <div className="text-xs text-green-600 font-semibold">
                              💵 {details.sellPrice.toLocaleString()}원
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-4 text-2xl font-bold leading-none text-indigo-600">
                      {isSuperAdmin ? '∞' : `×${item.count}`}
                    </div>
                  </button>
                  
                  <div className="absolute top-2 right-2 flex gap-1">
                    {details.canSell && details.sellPrice > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setActionMode('sell');
                          setQuantity(1);
                        }}
                        className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        title="판매"
                      >
                        <ShoppingCart size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setActionMode('trash');
                        setQuantity(1);
                      }}
                      className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      title="버리기"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItem && actionMode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const details = getItemDetails(selectedItem);
              const isSelling = actionMode === 'sell';
              const isUsing = actionMode === 'use';
              
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className={details.isCustom ? 'custom-item-image-64' : 'max-w-full max-h-full object-contain'}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{details.name}</h3>
                      <p className="text-sm text-gray-600">보유: {selectedItem.count}개</p>
                    </div>
                  </div>

                  {isUsing ? (
                    <>
                      {(() => {
                        const itemNameEn = getItemNameEn(selectedItem);
                        const isNectar = Boolean(NECTAR_FORM_MAP[itemNameEn]);
                        const eligibleNumbers = FORM_CHANGE_ITEM_POKEMON[itemNameEn] || [];
                        const eligible = caughtPokemon.filter(p =>
                          p && p !== 'null' && p.uniqueId &&
                          eligibleNumbers.includes(Number(p.originalNumber || p.number))
                        );

                        // 멤버(트레이너) 본인 대상 효과: 포켓몬 선택 없이 바로 확인만
                        if (details.specialEffect === 'trainerExp') {
                          return (
                            <>
                              <p className="text-gray-700 mb-4 text-center">
                                <span className="text-purple-700 font-semibold">본인의 경험치</span>가 {details.boostAmount}점 상승합니다.
                              </p>
                              <div className="flex gap-2">
                                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                  취소
                                </button>
                                <button
                                  onClick={handleUse}
                                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Sparkles size={18} />
                                  사용하기
                                </button>
                              </div>
                            </>
                          );
                        }

                        // 최대 포켓몬 슬롯 상승 아이템: 포켓몬 선택 없이 바로 확인만
                        if (details.specialEffect === 'maxPokemonSlots') {
                          return (
                            <>
                              <p className="text-gray-700 mb-4 text-center">
                                <span className="text-teal-700 font-semibold">{details.name}</span>을(를) 사용하시겠습니까?
                              </p>
                              <div className="flex gap-2">
                                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                  취소
                                </button>
                                <button
                                  onClick={handleUse}
                                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Sparkles size={18} />
                                  사용하기
                                </button>
                              </div>
                            </>
                          );
                        }

                        // 나무열매플랜터 슬롯 추가: 포켓몬 선택 없이 바로 확인만
                        if (details.specialEffect === 'unlockBerryPlanter') {
                          return (
                            <>
                              <p className="text-gray-700 mb-4 text-center">
                                <span className="text-lime-700 font-semibold">{details.name}</span>을(를) 사용하시겠습니까?
                              </p>
                              <div className="flex gap-2">
                                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                  취소
                                </button>
                                <button
                                  onClick={handleUse}
                                  className="flex-1 bg-lime-600 text-white py-3 rounded-lg font-semibold hover:bg-lime-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Sparkles size={18} />
                                  사용하기
                                </button>
                              </div>
                            </>
                          );
                        }

                        // 꿀: 포켓몬 선택됐으면 확인 UI
                        if (isNectar && selectedPokemon) {
                          const targetFormNameEn = NECTAR_FORM_MAP[itemNameEn];
                          const allForms = getPokemonFormCandidates ? getPokemonFormCandidates(selectedPokemon) : [];
                          const targetForm = allForms.find(f => f.nameEn === targetFormNameEn);
                          const formLabel = targetForm?.name || targetFormNameEn;
                          return (
                            <>
                              {eligible.length > 1 && (
                                <button
                                  onClick={() => setSelectedPokemon(null)}
                                  className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
                                >
                                  ← 포켓몬 다시 선택
                                </button>
                              )}
                              <div className="flex flex-col items-center gap-3 py-4">
                                <img
                                  src={selectedPokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${selectedPokemon.number}.png`}
                                  alt={selectedPokemon.name}
                                  className="w-20 h-20"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                                <p className="text-gray-800 font-semibold text-center">
                                  {selectedPokemon.nickname || selectedPokemon.name}을(를)<br />
                                  <span className="text-teal-700">{formLabel}</span>으로 바꾸겠습니까?
                                </p>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                  취소
                                </button>
                                <button
                                  onClick={handleUse}
                                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Sparkles size={18} />
                                  변경
                                </button>
                              </div>
                            </>
                          );
                        }

                        // 꿀: 춤추새 여러 마리면 선택
                        if (isNectar && !selectedPokemon) {
                          return (
                            <>
                              <p className="text-gray-700 mb-3">춤추새를 선택하세요</p>
                              <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-3">
                                <div className="grid grid-cols-3 gap-2">
                                  {eligible.map((pokemon) => (
                                    <button
                                      key={pokemon.uniqueId}
                                      onClick={() => setSelectedPokemon(pokemon)}
                                      className="item-use-pokemon-card flex flex-col items-center p-3 rounded-lg transition-all"
                                    >
                                      <img
                                        src={pokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`}
                                        alt={pokemon.name}
                                        className="w-16 h-16 mb-1"
                                        style={{ imageRendering: 'pixelated' }}
                                      />
                                      <div className="text-xs font-bold text-gray-800 truncate w-full text-center">
                                        {pokemon.nickname || pokemon.name}
                                      </div>
                                      <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button onClick={closeModal} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                취소
                              </button>
                            </>
                          );
                        }

                        // 일반 폼체인지 (로토무카탈로그 등): 포켓몬 선택 후 폼 그리드
                        if (selectedPokemon && isFormChangeItem(selectedItem)) {
                          const availableForms = getAvailableForms(selectedItem, selectedPokemon);
                          return (
                            <>
                              {eligible.length > 1 && (
                                <button
                                  onClick={() => { setSelectedPokemon(null); setSelectedForm(null); }}
                                  className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
                                >
                                  ← 포켓몬 다시 선택
                                </button>
                              )}
                              <p className="text-gray-700 mb-2 font-semibold">
                                {selectedPokemon.nickname || selectedPokemon.name}의 폼을 선택하세요
                              </p>
                              {availableForms.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 border border-gray-200 rounded-lg mb-4">
                                  변경 가능한 폼이 없습니다
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                  {availableForms.map((form) => (
                                    <button
                                      key={form.id || form.nameEn}
                                      onClick={() => setSelectedForm(form)}
                                      className={`item-use-pokemon-card flex flex-col items-center p-3 rounded-lg transition-all ${
                                        selectedForm?.nameEn === form.nameEn ? 'is-selected' : ''
                                      }`}
                                    >
                                      <img
                                        src={form.spriteUrl || form.imageUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${form.number}.png`}
                                        alt={form.name}
                                        className="w-14 h-14 mb-1"
                                        style={{ imageRendering: 'pixelated' }}
                                      />
                                      <div className="text-xs font-bold text-gray-800 text-center leading-tight">{form.name || form.nameEn}</div>
                                      <div className="text-xs text-gray-500 text-center">{form.type}{form.type2 ? `/${form.type2}` : ''}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                  취소
                                </button>
                                <button
                                  onClick={handleUse}
                                  disabled={!selectedForm}
                                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                                    selectedForm ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  <Sparkles size={18} />
                                  폼 변경
                                </button>
                              </div>
                            </>
                          );
                        }

                        // 일반 폼체인지: 포켓몬 여러 마리 선택
                        if (isFormChangeItem(selectedItem)) {
                          return (
                            <>
                              <p className="text-gray-700 mb-3">포켓몬을 선택하세요</p>
                              <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-3">
                                <div className="grid grid-cols-3 gap-2">
                                  {eligible.map((pokemon) => (
                                    <button
                                      key={pokemon.uniqueId}
                                      onClick={() => { setSelectedPokemon(pokemon); setSelectedForm(null); }}
                                      className={`item-use-pokemon-card flex flex-col items-center p-3 rounded-lg transition-all ${
                                        selectedPokemon?.uniqueId === pokemon.uniqueId ? 'is-selected' : ''
                                      }`}
                                    >
                                      <img
                                        src={pokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`}
                                        alt={pokemon.name}
                                        className="w-16 h-16 mb-1"
                                        style={{ imageRendering: 'pixelated' }}
                                      />
                                      <div className="text-xs font-bold text-gray-800 truncate w-full text-center">
                                        {pokemon.nickname || pokemon.name}
                                      </div>
                                      <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button onClick={closeModal} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                취소
                              </button>
                            </>
                          );
                        }

                        // 일반 아이템: 전체 포켓몬 선택
                        return (
                          <>
                            <p className="text-gray-700 mb-3">아이템을 사용할 포켓몬을 선택하세요</p>
                            <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-3">
                              {allPokemonForItem.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">보유한 포켓몬이 없습니다</div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {allPokemonForItem.filter(p => p && p !== 'null' && p.uniqueId).map((pokemon) => {
                                    const canUseTarget = canUseItemOnPokemonTarget({
                                      item: selectedItem,
                                      itemData: details.itemData,
                                      pokemon,
                                      allMoves,
                                      pokemonLearnsets,
                                      systemSettings
                                    });
                                    return (
                                      <button
                                        key={pokemon.uniqueId}
                                        onClick={() => { if (canUseTarget) setSelectedPokemon(pokemon); }}
                                        disabled={!canUseTarget}
                                        className={`item-use-pokemon-card flex flex-col items-center p-3 rounded-lg transition-all ${
                                          selectedPokemon?.uniqueId === pokemon.uniqueId ? 'is-selected' : ''
                                        } ${!canUseTarget ? 'is-disabled' : ''}`}
                                      >
                                        <img
                                          src={pokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`}
                                          alt={pokemon.name}
                                          className="w-16 h-16 mb-1"
                                          style={{ imageRendering: 'pixelated' }}
                                        />
                                        <div className="text-xs font-bold text-gray-800 truncate w-full text-center">{pokemon.nickname || pokemon.name}</div>
                                        <div className="text-xs text-gray-500">Lv.{pokemon.level}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={closeModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                                취소
                              </button>
                              <button
                                onClick={handleUse}
                                disabled={!selectedPokemon}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                                  selectedPokemon ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <Sparkles size={18} />
                                사용하기
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {isSelling ? '판매' : '버리기'} 개수
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.count}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                        />
                        {isSelling && details.sellPrice > 0 && (
                          <p className="text-sm text-green-600 font-semibold mt-2">
                            총 판매 금액: {(details.sellPrice * quantity).toLocaleString()}원
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(null);
                            setActionMode(null);
                            setQuantity(1);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={isSelling ? handleSell : handleTrash}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                            isSelling 
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isSelling ? '판매하기' : '버리기'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemsView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return isMobile ? <MobileItemsView /> : <DesktopItemsView />;
}
