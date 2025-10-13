import React, { useState } from 'react';
import { Search, X, ShoppingCart, Trash2, Sparkles } from 'lucide-react';

export default function ItemsView({ 
  items = [], 
  allItems = [], 
  isSuperAdmin = false, 
  onSellItem, 
  onTrashItem, 
  onUseItem,
  trainer = {},
  caughtPokemon = []
}) {
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('category'); // 'category' | 'name'
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionMode, setActionMode] = useState(null); // 'use' | 'sell' | 'trash'
  const [quantity, setQuantity] = useState(1);
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  // items.json에서 상세 정보 가져오기
  const getItemDetails = (item) => {
    const itemData = allItems.find(i => 
      i.id === item.itemId || 
      i.name === item.name || 
      i.nameEn?.toLowerCase().includes(item.name.toLowerCase())
    );
    
    // pocket 기준으로 카테고리 결정
    const pocket = itemData?.categoryData?.pocket || 'misc';
    const category = itemData?.category || '';

    // 사용 가능 여부 판단: 열매(berries), 회복(medicine/pocket), 영양(vitamins/category), 진화의돌(evolution)
    const canUse = pocket === 'berries' || 
                   pocket === 'medicine' || 
                   category === 'vitamins' ||
                   category === 'medicine' ||
                   category?.includes('evolution') ||
                   category?.includes('berry') ||
                   itemData?.name?.includes('진화의돌') ||
                   itemData?.nameEn?.includes('stone') ||
                   itemData?.nameEn?.includes('berry');

    
    return {
      name: item.name,
      description: itemData?.effect?.replace(/\n/g, ' ') || '유용한 아이템',
      imageUrl: item.imageUrl || itemData?.spriteUrl || '/images/items/default.png',
      cost: itemData?.cost || 0,
      sellPrice: itemData?.sellPrice || 0,
      pocket: pocket,
      category: category,
      canSell: itemData?.canSell ?? true,
      canUse: canUse
    };
  };

  // pocket 기준 카테고리 정의
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

  // pocket별 색상
  const getPocketColor = (pocket) => {
    if (pocket === 'pokeballs') return 'bg-red-50 border-red-200';
    if (pocket === 'medicine') return 'bg-green-50 border-green-200';
    if (pocket === 'vitamins') return 'bg-purple-50 border-purple-200';
    if (pocket === 'berries') return 'bg-pink-50 border-pink-200';
    if (pocket === 'machines') return 'bg-blue-50 border-blue-200';
    if (pocket === 'held-items') return 'bg-orange-50 border-orange-200';
    if (pocket === 'evolution') return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getPocketBadge = (pocket) => {
    if (pocket === 'pokeballs') return { text: '포획', color: 'bg-red-100 text-red-700' };
    if (pocket === 'medicine') return { text: '회복', color: 'bg-green-100 text-green-700' };
    if (pocket === 'vitamins') return { text: '영양', color: 'bg-purple-100 text-purple-700' };
    if (pocket === 'berries') return { text: '나무열매', color: 'bg-pink-100 text-pink-700' };
    if (pocket === 'machines') return { text: '기술머신', color: 'bg-blue-100 text-blue-700' };
    if (pocket === 'held-items') return { text: '지니는도구', color: 'bg-orange-100 text-orange-700' };
    if (pocket === 'evolution') return { text: '진화', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '기타', color: 'bg-gray-100 text-gray-700' };
  };

  // 아이템 클릭 핸들러
  const handleItemClick = (item) => {
    const details = getItemDetails(item);
    
    console.log('🖱️ 아이템 클릭:', item.name);
    console.log('📋 상세 정보:', details);
    console.log('✅ canUse:', details.canUse);
    
    // 사용 불가능한 아이템
    if (!details.canUse) {
      console.log('❌ 사용 불가!');
      alert('이 아이템은 사용할 수 없습니다.');
      return;
    }
    
    console.log('✅ 사용 가능! 모달 열기');
    // 선택된 아이템 설정하고 액션 모달 표시
    setSelectedItem(item);
    setActionMode('use');
    setQuantity(1);
  };

  // 액션 처리
  const handleUse = () => {
    console.log('🚀 handleUse 실행!');
    console.log('📦 selectedItem:', selectedItem);
    console.log('🐾 selectedPokemon:', selectedPokemon);
    
    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    console.log('✅ onUseItem 호출 직전');
    
    if (onUseItem && selectedItem) {
      console.log('✅ onUseItem 함수 존재, 호출 중...');
      onUseItem(selectedItem, selectedPokemon);
      setSelectedItem(null);
      setActionMode(null);
      setQuantity(1);
      setSelectedPokemon(null);
      console.log('✅ onUseItem 호출 완료');
    } else {
      console.log('❌ onUseItem 함수가 없음!');
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

  // 카테고리별 필터링
  let filteredItems = items.filter(item => {
    // 카테고리 필터
    if (selectedCategory !== 'all') {
      const details = getItemDetails(item);
      if (details.pocket !== selectedCategory) {
        return false;
      }
    }
    
    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query);
    }
    
    return true;
  });

  // 정렬
  filteredItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'category') {
      const pocketA = getItemDetails(a).pocket;
      const pocketB = getItemDetails(b).pocket;
      if (pocketA !== pocketB) return pocketA.localeCompare(pocketB);
      return a.name.localeCompare(b.name, 'ko');
    } else {
      return a.name.localeCompare(b.name, 'ko');
    }
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* 헤더 */}
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
              <span className="text-lg font-bold text-yellow-600">₽{(trainer.money || 0).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-500">
              총 {items.reduce((sum, item) => sum + item.count, 0)}개
            </div>
          </div>
        </div>

        {/* 검색 & 정렬 */}
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

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? cat.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
        
        {/* 아이템 그리드 (2열) */}
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
              
              return (
                <div key={i} className="relative">
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-start gap-4 rounded-lg p-4 border-2 transition-all text-left ${pocketColor} ${
                      details.canUse 
                        ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' 
                        : 'cursor-default'
                    }`}
                  >
                    {/* 아이템 이미지 (고정 크기) */}
                    <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    
                    {/* 아이템 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-base text-gray-800 truncate">{details.name}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {details.description}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {details.cost > 0 && (
                            <div className="text-xs text-gray-500">
                              💰 ₽{details.cost.toLocaleString()}
                            </div>
                          )}
                          {details.canSell && details.sellPrice > 0 && (
                            <div className="text-xs text-green-600 font-semibold">
                              💵 ₽{details.sellPrice.toLocaleString()}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-2xl font-bold text-indigo-600">
                          {isSuperAdmin ? '∞' : `×${item.count}`}
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* 액션 버튼들 */}
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

      {/* 액션 모달 */}
      {selectedItem && actionMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedItem(null);
            setActionMode(null);
            setQuantity(1);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const details = getItemDetails(selectedItem);
              const isSelling = actionMode === 'sell';
              const isUsing = actionMode === 'use';
              const isTrashing = actionMode === 'trash';
              
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                      <img 
                        src={details.imageUrl}
                        alt={details.name}
                        className="max-w-full max-h-full object-contain"
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
                      <p className="text-gray-700 mb-3">아이템을 사용할 포켓몬을 선택하세요</p>
                      
                      {/* 포켓몬 선택 그리드 */}
                      <div className="max-h-96 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-3">
                        {caughtPokemon.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            보유한 포켓몬이 없습니다
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {caughtPokemon.map((pokemon) => (
                              <button
                                key={pokemon.uniqueId}
                                onClick={() => setSelectedPokemon(pokemon)}
                                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                                  selectedPokemon?.uniqueId === pokemon.uniqueId
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                                }`}
                              >
                                <img
                                  src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                                  alt={pokemon.name}
                                  className="w-16 h-16 mb-1"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                                <div className="text-xs font-bold text-gray-800 truncate w-full text-center">
                                  {pokemon.nickname || pokemon.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Lv.{pokemon.level}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(null);
                            setActionMode(null);
                            setSelectedPokemon(null);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleUse}
                          disabled={!selectedPokemon}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                            selectedPokemon
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Sparkles size={18} />
                          사용하기
                        </button>
                      </div>
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
                            총 판매 금액: ₽{(details.sellPrice * quantity).toLocaleString()}
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