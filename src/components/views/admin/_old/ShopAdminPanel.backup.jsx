import React, { useState } from 'react';
import { Plus, Trash2, Star, Calendar, Search, Package, X, Store, CircleDot, RefreshCw, Save, Lock, Clock, Gift } from 'lucide-react';
import { CATEGORIES, getItemPocket, filterItemsByPocket, getItemIcon } from '../../../utils/itemUtils';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import RandomBoxAdminPanel from './RandomBoxAdminPanel'; 

export default function ShopAdminPanel({ 
  shopData = {},
  allItems = [],
  onUpdateShop,
  onAddDailyItem,
  onRemoveDailyItem,
  onTogglePersistent
}) {
  const [activeTab, setActiveTab] = useState('current');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showRarePanel, setShowRarePanel] = useState(false);
  const [showGachaPanel, setShowGachaPanel] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(99);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemCategory, setItemCategory] = useState('all');
  const [itemType, setItemType] = useState('daily');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [filterDay, setFilterDay] = useState('all');
  const [isPersistent, setIsPersistent] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [tempTemplate, setTempTemplate] = useState(null);
  const [showRandomBoxPanel, setShowRandomBoxPanel] = useState(false);

  
  const [rareSearchQuery, setRareSearchQuery] = useState('');
  const [rareItemCategory, setRareItemCategory] = useState('all');
  const [gachaSearchQuery, setGachaSearchQuery] = useState('');
  
  const days = [
    { id: 'monday', name: '월요일' },
    { id: 'tuesday', name: '화요일' },
    { id: 'wednesday', name: '수요일' },
    { id: 'thursday', name: '목요일' },
    { id: 'friday', name: '금요일' },
    { id: 'saturday', name: '토요일' },
    { id: 'sunday', name: '일요일' }
  ];

  const startEdit = () => {
    setTempTemplate(JSON.parse(JSON.stringify(shopData.initialDailyItems || {})));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setTempTemplate(null);
    setEditMode(false);
  };

  const saveTemplate = async () => {
    try {
      const updatedShopData = {
        ...shopData,
        initialDailyItems: tempTemplate
      };
      await onUpdateShop(updatedShopData);
      alert('요일별 아이템이 저장되었습니다!\n다음 주 월요일부터 이 재고로 리셋됩니다.');
      setEditMode(false);
      setTempTemplate(null);
    } catch (error) {
      console.error('요일별 아이템 저장 실패:', error);
      alert('요일별 아이템 저장 중 오류가 발생했습니다.');
    }
  };

  const updateTemplateItem = (day, itemId, field, value) => {
    const updated = { ...tempTemplate };
    updated[day] = (updated[day] || []).map(item => 
      item.itemId === itemId ? { ...item, [field]: parseInt(value) || 0 } : item
    );
    setTempTemplate(updated);
  };

  const removeTemplateItem = (day, itemId) => {
    const updated = { ...tempTemplate };
    updated[day] = (updated[day] || []).filter(item => item.itemId !== itemId);
    setTempTemplate(updated);
  };

  const addTemplateItem = (day, itemId, price, stock) => {
    const updated = { ...tempTemplate };
    if (!updated[day]) updated[day] = [];
    
    if (updated[day].some(item => item.itemId === itemId)) {
      alert('이미 추가된 아이템입니다!');
      return;
    }
    
    updated[day].push({ itemId, price, stock });
    setTempTemplate(updated);
  };
  
  const getAllShopItems = () => {
    const items = [];
    
    Object.entries(shopData.dailyItems || {}).forEach(([day, dayItems]) => {
      dayItems.forEach(item => {
        items.push({ ...item, type: 'daily', day });
      });
    });
    
    (shopData.permanentItems || []).forEach(item => {
      items.push({ ...item, type: 'permanent' });
    });
    
    if (shopData.rareDailyItem?.itemId) {
      items.push({ 
        ...shopData.rareDailyItem, 
        type: 'rare',
        stock: 1 
      });
    }
    
    return items;
  };
  
  const getFilteredShopItems = () => {
    const items = getAllShopItems();
    
    let filtered = items;
    if (filterDay !== 'all') {
      filtered = items.filter(item => {
        if (item.type === 'daily') return item.day === filterDay;
        return item.type === 'permanent' || item.type === 'rare';
      });
    }
    
    const sorted = filtered.sort((a, b) => {
      const typeOrder = { rare: 0, daily: 1, permanent: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
    
    return sorted;
  };
  
  const handleAddItem = async () => {
    if (!selectedItem) {
      alert('아이템을 선택해주세요!');
      return;
    }
    
    const newItem = {
      itemId: selectedItem.id,
      price: price || selectedItem.cost || 100,
      stock: stock,
      isPersistent: isPersistent
    };
    
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (itemType === 'daily') {
      if (!selectedDay) {
        alert('요일을 선택해주세요!');
        return;
      }
      
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      
      const currentItems = updatedShopData.dailyItems[selectedDay] || [];
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.dailyItems[selectedDay] = [...currentItems, newItem];
      
    } else if (itemType === 'permanent') {
      const currentItems = updatedShopData.permanentItems || [];
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      updatedShopData.permanentItems = [...currentItems, newItem];
    }
    
    try {
      await onUpdateShop(updatedShopData);
      
      setSelectedItem(null);
      setPrice(0);
      setStock(99);
      setShowAddPanel(false);
      setSearchQuery('');
      setItemCategory('all');
      
      alert('아이템이 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('아이템 추가 실패:', error);
      alert('아이템 추가 중 오류가 발생했습니다: ' + error.message);
    }
  };
  
  const handleRemoveItem = async (itemId, type, day) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).filter(i => i.itemId !== itemId);
      
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).filter(i => i.itemId !== itemId);
      
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = { itemId: null, price: 0, lastRefresh: null };
    }
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('아이템 제거 완료');
    } catch (error) {
      console.error('아이템 제거 실패:', error);
    }
  };
  
  const handleUpdateItem = async (itemId, type, day, field, value) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (type === 'daily') {
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      updatedShopData.dailyItems[day] = (updatedShopData.dailyItems[day] || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
      );
      
    } else if (type === 'permanent') {
      updatedShopData.permanentItems = (updatedShopData.permanentItems || []).map(i => 
        i.itemId === itemId ? { ...i, [field]: parseInt(value) || 0 } : i
      );
      
    } else if (type === 'rare') {
      updatedShopData.rareDailyItem = {
        ...updatedShopData.rareDailyItem,
        [field]: parseInt(value) || 0
      };
    }
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('아이템 수정 실패:', error);
    }
  };

  const handleRemoveFromRarePool = async (itemId) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.rareItemPool = (updatedShopData.rareItemPool || []).filter(i => i.itemId !== itemId);
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('한정 아이템에서 제거 완료');
    } catch (error) {
      console.error('한정 아이템 제거 실패:', error);
    }
  };

  const handleToggleGacha = async (enabled) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    updatedShopData.gachaBall.enabled = enabled;
	
	   
    try {
      await onUpdateShop(updatedShopData);
      console.log('규토리볼 노출 상태 변경:', enabled);
    } catch (error) {
      console.error('규토리볼 노출 상태 변경 실패:', error);
    }
  };
  
  	const handleToggleRareItem = async (enabled) => {
		  let updatedShopData = JSON.parse(JSON.stringify(shopData));
		  
		  if (!updatedShopData.rareItemConfig) {
			updatedShopData.rareItemConfig = { enabled: false };
		  }
		  
		  updatedShopData.rareItemConfig.enabled = enabled;
		  
		  try {
			await onUpdateShop(updatedShopData);
			console.log('희귀템 노출 상태 변경:', enabled);
		  } catch (error) {
			console.error('희귀템 노출 상태 변경 실패:', error);
		  }
		};

  const handleAddGachaBall = async (item) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    if (updatedShopData.gachaBall.balls.some(b => b.itemId === item.id)) {
      updatedShopData.gachaBall.balls = updatedShopData.gachaBall.balls.filter(b => b.itemId !== item.id);
      
      try {
        await onUpdateShop(updatedShopData);
        console.log('규토리볼 제거 완료');
      } catch (error) {
        console.error('규토리볼 제거 실패:', error);
      }
      return;
    }
    
    if (updatedShopData.gachaBall.balls.length >= 2) {
      alert('최대 2개까지만 선택할 수 있습니다!');
      return;
    }
    
    updatedShopData.gachaBall.balls.push({ itemId: item.id });
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('규토리볼 추가 완료');
    } catch (error) {
      console.error('규토리볼 추가 실패:', error);
    }
  };

  const handleRemoveGachaBall = async (itemId) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (!updatedShopData.gachaBall) {
      updatedShopData.gachaBall = { enabled: false, balls: [] };
    }
    
    if (!Array.isArray(updatedShopData.gachaBall.balls)) {
      updatedShopData.gachaBall.balls = [];
    }
    
    updatedShopData.gachaBall.balls = updatedShopData.gachaBall.balls.filter(b => b.itemId !== itemId);
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('규토리볼 제거 완료');
    } catch (error) {
      console.error('규토리볼 제거 실패:', error);
    }
  };

  const handleQuickAddToRarePool = async (item) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    const rarePool = updatedShopData.rareItemPool || [];
    
    if (rarePool.some(i => i.itemId === item.id)) {
      updatedShopData.rareItemPool = rarePool.filter(i => i.itemId !== item.id);
      
      try {
        await onUpdateShop(updatedShopData);
        console.log('한정 아이템에서 제거 완료');
      } catch (error) {
        console.error('한정 아이템 제거 실패:', error);
        alert('한정 아이템 제거 중 오류가 발생했습니다.');
      }
      return;
    }
    
    const defaultPrice = item.cost || 100;
    updatedShopData.rareItemPool = [...rarePool, { itemId: item.id, price: defaultPrice }];
    
    try {
      await onUpdateShop(updatedShopData);
      console.log('한정 아이템에 추가 완료');
    } catch (error) {
      console.error('한정 아이템 추가 실패:', error);
      alert('한정 아이템 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateRarePoolPrice = async (itemId, newPrice) => {
    let updatedShopData = JSON.parse(JSON.stringify(shopData));
    updatedShopData.rareItemPool = (updatedShopData.rareItemPool || []).map(i => 
      i.itemId === itemId ? { ...i, price: parseInt(newPrice) || 0 } : i
    );
    
    try {
      await onUpdateShop(updatedShopData);
    } catch (error) {
      console.error('희귀템 가격 수정 실패:', error);
    }
  };

  const filteredItemsForRare = React.useMemo(() => {
    let filtered = allItems;

    if (rareItemCategory !== 'all') {
      filtered = filterItemsByPocket(filtered, rareItemCategory);
    }

    if (rareSearchQuery.trim()) {
      const query = rareSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query) ||
        item.effect?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allItems, rareItemCategory, rareSearchQuery]);

  const filteredGachaBalls = React.useMemo(() => {
    // category가 pokeballs 관련인 아이템 필터링
    let filtered = allItems.filter(item => {
      const category = item.category?.toLowerCase() || '';
      const categoryName = item.categoryData?.name?.toLowerCase() || '';
      
      return category === 'apricorn-balls' ||
         categoryName === '몬스터볼';
         {/*}   category === 'pokeballs' || 
             category === 'standard-balls' || 
             category === 'special-balls' ||  */} 
         
    });
    
    console.log('몬스터볼 필터링:', filtered.length);

    if (gachaSearchQuery.trim()) {
      const query = gachaSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query) ||
        item.effect?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allItems, gachaSearchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'current'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Store size={20} />
            현재 상점 관리
          </button>
          
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'template'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={20} />
            요일별 아이템
          </button>
          
          <button
            onClick={() => setShowRarePanel(true)}
            className="px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Star size={20} />
            한정 아이템
          </button>
          
          <button
            onClick={() => setShowGachaPanel(true)}
            className="px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700"
          >
            <CircleDot size={20} />
            규토리볼
          </button>
		  
		  <button
			  onClick={() => setShowRandomBoxPanel(true)}
			  className="px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
			>
			  <Gift size={20} />
			  랜덤박스
			</button>
        </div>
      </div>

      {activeTab === 'current' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Store size={24} />
            현재 상점 상품
          </h3>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterDay('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  filterDay === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => setFilterDay(day.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    filterDay === day.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            <button
              onClick={() => setShowAddPanel('selectItem')}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus size={48} className="text-indigo-600" />
              <span className="text-sm font-bold text-indigo-600">새 상품 추가</span>
            </button>

            {getFilteredShopItems().map((shopItem, index) => {
              const item = allItems.find(i => i.id === shopItem.itemId);
              if (!item) return null;
              
              const typeStyles = {
                daily: { 
                  border: 'border-blue-300',
                  bg: 'bg-blue-50',
                  labelBg: 'bg-blue-100',
                  labelText: 'text-blue-700'
                },
                permanent: { 
                  border: 'border-green-300',
                  bg: 'bg-green-50',
                  labelBg: 'bg-green-100',
                  labelText: 'text-green-700'
                },
                rare: { 
                  border: 'border-purple-300',
                  bg: 'bg-purple-50',
                  labelBg: 'bg-purple-100',
                  labelText: 'text-purple-700'
                }
              };
              const style = typeStyles[shopItem.type];
              
              return (
                <div 
                  key={`${shopItem.type}-${shopItem.itemId}-${index}`} 
                  className={`border-2 ${style.border} rounded-xl ${style.bg} flex flex-col relative group`}
                >
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`text-xs px-2 py-1 rounded ${style.labelBg} ${style.labelText} font-semibold`}>
                      {shopItem.type === 'daily' ? days.find(d => d.id === shopItem.day)?.name :
                       shopItem.type === 'permanent' ? '상시' : '한정'}
                    </span>
                  </div>

                  {shopItem.type === 'daily' && (
                    <button
                      onClick={() => onTogglePersistent(shopItem.day, shopItem.itemId)}
                      className={`absolute top-2 right-10 px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 ${
                        shopItem.isPersistent
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                      title={shopItem.isPersistent ? '주간 유지 ON' : '일회성 아이템'}
                    >
                      {shopItem.isPersistent ? <Lock size={12} /> : <Clock size={12} />}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemoveItem(shopItem.itemId, shopItem.type, shopItem.day)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="상품 삭제"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex items-center justify-center mb-3 h-24">
                      <img 
                        src={item.spriteUrl || item.imageUrl}                      
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                      />
                    </div>
                    
                    <div className="space-y-2 flex-1">
                      <div className="font-bold text-sm text-gray-800 text-center">{item.name}</div>
                      
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600 whitespace-nowrap">가격</span>
                          <input
                            type="number"
                            value={shopItem.price}
                            onChange={(e) => handleUpdateItem(shopItem.itemId, shopItem.type, shopItem.day, 'price', e.target.value)}
                            className="w-14 border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
                          />
                        </div>
                        {shopItem.type !== 'rare' && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 whitespace-nowrap">재고</span>
                            <input
                              type="number"
                              value={shopItem.stock}
                              onChange={(e) => handleUpdateItem(shopItem.itemId, shopItem.type, shopItem.day, 'stock', e.target.value)}
                              className="w-14 border border-gray-300 rounded px-1 py-1 text-xs text-center focus:border-indigo-500 focus:outline-none bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <RefreshCw size={28} />
                  요일별 아이템 관리
                </h3>
                <p className="text-blue-100">
                  매주 월요일 00:00에 요일별 아이템 재고가 자동 리셋됩니다
                </p>
              </div>
              <div className="flex gap-2">
                {!editMode ? (
                  <button
                    onClick={startEdit}
                    className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <Package size={20} />
                    편집하기
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveTemplate}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      <Save size={20} />
                      저장
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {editMode && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-gray-800 mb-1">편집 모드</div>
                  <div className="text-sm text-gray-600">
                    여기서 수정한 내용은 <strong>다음 주 월요일부터</strong> 적용됩니다.<br/>
                    현재 진행 중인 이번 주 재고에는 영향을 주지 않습니다.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {days.map((day) => {
              const displayData = editMode ? tempTemplate : (shopData.initialDailyItems || {});
              const dayItems = displayData[day.id] || [];
              
              return (
                <div key={day.id} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                  <div className="bg-blue-50 border-b-2 border-blue-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar size={24} className="text-blue-600" />
                      <h4 className="font-bold text-lg text-gray-800">{day.name}</h4>
                      <span className="text-sm text-gray-600">
                        ({dayItems.length}개 아이템)
                      </span>
                    </div>
                    
                    {editMode && (
                      <button
                        onClick={() => {
                          const itemName = prompt('아이템 이름을 입력하세요:\n(예: 상처약, 몬스터볼, 이상한사탕)');
                          if (!itemName) return;
                          
                          const foundItem = allItems.find(i => 
                            i.name === itemName || 
                            i.name.includes(itemName) || 
                            itemName.includes(i.name)
                          );
                          
                          if (!foundItem) {
                            alert(`"${itemName}" 아이템을 찾을 수 없습니다.\n정확한 이름을 입력해주세요.`);
                            return;
                          }
                          
                          const price = parseInt(prompt(`${foundItem.name}의 가격을 입력하세요:`, foundItem.cost || '100') || '0');
                          const stock = parseInt(prompt(`${foundItem.name}의 재고를 입력하세요:`, '10') || '0');
                          
                          addTemplateItem(day.id, foundItem.id, price, stock);
                          alert(`${foundItem.name}이(가) ${day.name}에 추가되었습니다!`);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Plus size={18} />
                        아이템 추가
                      </button>
                    )}
                  </div>

                  <div className="p-4">
                    {dayItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Package size={48} className="mx-auto mb-2 opacity-50" />
                        <p>등록된 아이템이 없습니다</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayItems.map((item) => {
                          const itemData = allItems.find(i => i.id === item.itemId);
                          
                          return (
                            <div
                              key={item.itemId}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="w-16 h-16 flex items-center justify-center bg-white rounded-lg border border-gray-300">
                                <img
                                  src={itemData?.spriteUrl || itemData?.imageUrl}
                                  alt={itemData?.name || item.itemId}
                                  className="max-w-full max-h-full"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                              </div>

                              <div className="flex-1">
                                <div className="font-bold text-gray-800">
                                  {itemData?.name || item.itemId}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {itemData?.effect || '설명 없음'}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">가격</span>
                                  <input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => updateTemplateItem(day.id, item.itemId, 'price', e.target.value)}
                                    disabled={!editMode}
                                    className={`w-20 border ${editMode ? 'border-gray-300' : 'border-transparent'} rounded px-2 py-1 text-sm text-center focus:border-indigo-500 focus:outline-none bg-white`}
                                  />
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600 whitespace-nowrap">재고</span>
                                  <input
                                    type="number"
                                    value={item.stock}
                                    onChange={(e) => updateTemplateItem(day.id, item.itemId, 'stock', e.target.value)}
                                    disabled={!editMode}
                                    className={`w-16 border ${editMode ? 'border-gray-300' : 'border-transparent'} rounded px-2 py-1 text-sm text-center focus:border-indigo-500 focus:outline-none bg-white`}
                                  />
                                </div>

                                {editMode && (
                                  <button
                                    onClick={() => removeTemplateItem(day.id, item.itemId)}
                                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddPanel === 'settings' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">상품 설정</h3>
              <button onClick={() => setShowAddPanel(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {selectedItem && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded flex items-center justify-center">
                      {selectedItem.spriteUrl && (
                        <img 
                          src={selectedItem.spriteUrl}
                          alt={selectedItem.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-lg text-gray-800">{selectedItem.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{selectedItem.effect}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">아이템 타입</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setItemType('daily')}
                        className={`flex-1 py-2 rounded-lg font-semibold ${itemType === 'daily' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        요일별
                      </button>
                      <button
                        onClick={() => setItemType('permanent')}
                        className={`flex-1 py-2 rounded-lg font-semibold ${itemType === 'permanent' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        상시 판매
                      </button>
                    </div>
                  </div>

                  {itemType === 'daily' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">요일 선택</label>
                      <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2">
                        {days.map(day => <option key={day.id} value={day.id}>{day.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">가격</label>
                    <input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">재고</label>
                    <input type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2" />
                  </div>

                  {itemType === 'daily' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={isPersistent} onChange={(e) => setIsPersistent(e.target.checked)} className="w-4 h-4" />
                      <label className="text-sm text-gray-700">매주 리셋 시 유지 (고정 상품)</label>
                    </div>
                  )}

                  <button onClick={handleAddItem} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700">
                    <Plus size={20} className="inline mr-2" />
                    추가하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ItemSelectorModal
        show={showAddPanel === 'selectItem'}
        onClose={() => setShowAddPanel(false)}
        onSelect={(item) => {
          setSelectedItem(item);
          setPrice(item.cost || 100);
          setShowAddPanel('settings');
        }}
        items={allItems}
        title="상점에 추가할 아이템 선택"
        multiSelect={false}
      />

      {showRarePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Star className="text-purple-600" size={24} />
                  한정 아이템 관리
                </h3>
                <p className="text-sm text-gray-600 mt-1">매일 랜덤으로 표시될 한정 아이템을 관리합니다</p>
              </div>
              <button
                onClick={() => {
                  setShowRarePanel(false);
                  setSelectedItem(null);
                  setPrice(0);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                <div className="flex flex-col border-2 border-gray-200 rounded-xl overflow-hidden h-full">
                  <div className="p-4 border-b border-gray-200 space-y-4 bg-gray-50 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="아이템 검색..."
                        value={rareSearchQuery}
                        onChange={(e) => setRareSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {CATEGORIES.map(cat => {
                        const IconComponent = cat.Icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setRareItemCategory(cat.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                              rareItemCategory === cat.id
                                ? cat.color + ' shadow-lg scale-105'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <IconComponent size={16} />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-sm text-gray-600">
                      {filteredItemsForRare.length}개의 아이템
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-white">
                    <div className="grid grid-cols-4 gap-3">
                      {filteredItemsForRare.map(item => {
                        const ItemIcon = getItemIcon(item);
                        const isInPool = (shopData.rareItemPool || []).some(ri => ri.itemId === item.id);

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleQuickAddToRarePool(item)}
                            className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                              isInPool
                                ? 'border-green-500 bg-green-50 shadow-md'
                                : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                            }`}
                          >
                            {isInPool && (
                              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 z-10">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <div className="aspect-square bg-gray-50 p-3 flex items-center justify-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="max-w-full max-h-full object-contain"
                                  style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                                />
                              ) : (
                                <ItemIcon size={32} className="text-gray-300" />
                              )}
                            </div>
                            <div className="p-2 bg-white border-t border-gray-200">
                              <div className={`text-xs font-semibold text-center truncate ${
                                isInPool ? 'text-green-700' : 'text-gray-800 group-hover:text-purple-700'
                              }`}>
                                {item.name}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col border-2 border-purple-200 rounded-xl overflow-hidden h-full">
                  <div className="bg-purple-50 p-4 border-b-2 border-purple-200 flex-shrink-0">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Star size={20} className="text-purple-600" />
                      현재 한정 아이템 ({(shopData.rareItemPool || []).length}개)
                    </h4>
                  </div>
				  
				   <div className="bg-white rounded-lg p-3 border-2 border-purple-200">
					  <div className="flex items-center justify-between">
						<span className="font-bold text-sm text-gray-800">상점 노출</span>
						<label className="relative inline-flex items-center cursor-pointer">
						  <input
							type="checkbox"
							checked={shopData.rareItemConfig?.enabled || false}
							onChange={(e) => handleToggleRareItem(e.target.checked)}
							className="sr-only peer"
						  />
						  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
						</label>
					  </div>
					</div>
				
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {(shopData.rareItemPool || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Star size={64} className="mb-4 text-gray-300" />
                        <p className="text-lg font-semibold">등록된 한정 아이템이 없습니다</p>
                        <p className="text-sm mt-2">왼쪽에서 아이템을 선택해주세요</p>
                      </div>
                    ) : (
                      (shopData.rareItemPool || []).map((rareItem) => {
                        const item = allItems.find(i => i.id === rareItem.itemId);
                        if (!item) return null;
                        
                        return (
                          <div key={rareItem.itemId} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded flex items-center justify-center flex-shrink-0">
                              {item.imageUrl && (
                                <img 
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="max-w-full max-h-full object-contain"
                                  style={{ imageRendering: 'pixelated' }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-sm truncate">{item.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="number"
                                  value={rareItem.price}
                                  onChange={(e) => handleUpdateRarePoolPrice(rareItem.itemId, e.target.value)}
                                  className="w-20 border border-purple-300 rounded px-2 py-1 text-xs text-center focus:border-purple-500 focus:outline-none bg-white"
                                  placeholder="가격"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveFromRarePool(rareItem.itemId)}
                              className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGachaPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <CircleDot className="text-orange-600" size={24} />
                  규토리볼 관리
                </h3>
                <p className="text-sm text-gray-600 mt-1">상점에서 판매할 몬스터볼 2종을 선택합니다</p>
              </div>
              <button
                onClick={() => {
                  setShowGachaPanel(false);
                  setGachaSearchQuery('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                <div className="flex flex-col border-2 border-gray-200 rounded-xl overflow-hidden h-full">
                  <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50 flex-shrink-0">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Package size={20} />
                      몬스터볼 선택
                    </h4>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="몬스터볼 검색..."
                        value={gachaSearchQuery}
                        onChange={(e) => setGachaSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div className="text-sm text-gray-600">
                      {filteredGachaBalls.length}개의 몬스터볼 • 최대 2개 선택 가능
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-white">
                    {filteredGachaBalls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <CircleDot size={64} className="mb-4 text-gray-300" />
                        <p className="text-lg font-semibold">몬스터볼을 찾을 수 없습니다</p>
                        <p className="text-sm mt-2">검색어를 확인해주세요</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        {filteredGachaBalls.map(item => {
                          const isSelected = (shopData.gachaBall?.balls || []).some(b => b.itemId === item.id);

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleAddGachaBall(item)}
                              className={`group relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50 shadow-md'
                                  : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1 z-10">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              <div className="aspect-square bg-gray-50 p-3 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                                  />
                                ) : (
                                  <CircleDot size={32} className="text-gray-300" />
                                )}
                              </div>
                              <div className="p-2 bg-white border-t border-gray-200">
                                <div className={`text-xs font-semibold text-center truncate ${
                                  isSelected ? 'text-orange-700' : 'text-gray-800 group-hover:text-orange-700'
                                }`}>
                                  {item.name}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-800">상점 노출</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shopData.gachaBall?.enabled || false}
                          onChange={(e) => handleToggleGacha(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="border-2 border-orange-500 rounded-2xl bg-white overflow-hidden flex flex-col flex-1">
                    <div className="bg-orange-50 p-4 border-b-2 border-orange-200 flex-shrink-0">
                      <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <CircleDot size={20} />
                        규토리볼 설정
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">선택한 볼 2종이 랜덤으로 나옵니다</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-3">
                        {(shopData.gachaBall?.balls || []).map((ballItem) => {
                          const item = allItems.find(i => i.id === ballItem.itemId);
                          if (!item) return null;
                          
                          return (
                            <div key={ballItem.itemId} className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 flex items-center gap-3">
                              <div className="w-16 h-16 bg-white rounded flex items-center justify-center">
                                {item.imageUrl && (
                                  <img 
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="max-w-full max-h-full object-contain"
                                    style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-lg text-gray-800">{item.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{item.effect}</div>
                              </div>
                              <button
                                onClick={() => handleRemoveGachaBall(ballItem.itemId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          );
                        })}
                        
                        {(shopData.gachaBall?.balls || []).length === 0 && (
                          <div className="text-center py-12 text-gray-400">
                            <CircleDot size={64} className="mx-auto mb-3 text-gray-300" />
                            <p>선택된 볼이 없습니다</p>
                            <p className="text-sm mt-1">왼쪽에서 몬스터볼을 선택해주세요</p>
                          </div>
                        )}
                        
                        {(shopData.gachaBall?.balls || []).length === 1 && (
                          <div className="text-center py-8 text-orange-600 bg-orange-50 rounded-lg border-2 border-dashed border-orange-300">
                            <p className="font-semibold">1개 더 선택해주세요!</p>
                            <p className="text-sm mt-1">총 2개의 볼이 필요합니다</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(shopData.gachaBall?.balls || []).length === 2 && (
                      <div className="p-4 border-t-2 border-orange-200 bg-orange-50 flex-shrink-0">
                        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 text-center">
                          <p className="font-bold text-green-800">규토리볼 설정 완료!</p>
                          <p className="text-sm text-green-700 mt-1">상점 노출 스위치를 켜면 판매가 시작됩니다</p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    
		{showRandomBoxPanel && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift className="text-purple-600" size={24} />
            랜덤박스 관리
          </h3>
          <p className="text-sm text-gray-600 mt-1">랜덤박스 상품 구성과 확률을 설정합니다</p>
        </div>
        <button
          onClick={() => setShowRandomBoxPanel(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <RandomBoxAdminPanel 
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={onUpdateShop}
        />
      </div>
    </div>
  </div>
)}
	</div>
	
  );
}
