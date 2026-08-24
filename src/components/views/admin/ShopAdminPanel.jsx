// src/components/views/admin/ShopAdminPanel.jsx
import React, { useState } from 'react';
import { Store, Star, CircleDot, RefreshCw, Gift, X, CalendarClock, Snowflake } from 'lucide-react';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import AddItemSettingsModal from '../../modals/AddItemSettingsModal';
import CurrentShopTab from '../../shop/CurrentShopTab';
import TemplateTab from '../../shop/TemplateTab';
import RareItemPanel from '../../shop/RareItemPanel';
import PeriodItemPanel from '../../shop/PeriodItemPanel';
import GachaBallPanel from '../../shop/GachaBallPanel';
import RandomBoxAdminPanel from './RandomBoxAdminPanel';
import NunmegiRaceAdminPanel from './NunmegiRaceAdminPanel';

export default function ShopAdminPanel({
  shopData = {},
  allItems = [],
  onUpdateShop,
  onAddDailyItem,
  onRemoveDailyItem,
  onTogglePersistent,
  onResetCramorantBeak
}) {
  const [activeTab, setActiveTab] = useState('current');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRarePanel, setShowRarePanel] = useState(false);
  const [showPeriodPanel, setShowPeriodPanel] = useState(false);
  const [showGachaPanel, setShowGachaPanel] = useState(false);
  const [showRandomBoxPanel, setShowRandomBoxPanel] = useState(false);
  const [showRacePanel, setShowRacePanel] = useState(false);
  const [showBeakItemSelector, setShowBeakItemSelector] = useState(false);
  const [pendingBeakItemId, setPendingBeakItemId] = useState(null);
  const [isSavingBeakItem, setIsSavingBeakItem] = useState(false);

  const savedBeakItemId = shopData.cramorantBeakItem?.itemId ?? 17;
  const cramorantBeakItem = allItems.find(i => i.id === (pendingBeakItemId ?? savedBeakItemId));
  const hasPendingBeakChange = pendingBeakItemId !== null && pendingBeakItemId !== savedBeakItemId;

  const handleSelectBeakItem = (item) => {
    setPendingBeakItemId(item.id);
    setShowBeakItemSelector(false);
  };

  const handleSaveBeakItem = async () => {
    setIsSavingBeakItem(true);
    try {
      await onUpdateShop({ ...shopData, cramorantBeakItem: { itemId: pendingBeakItemId } });
      setPendingBeakItemId(null);
    } catch (error) {
      console.error('윽우지 부리 아이템 설정 실패:', error);
      alert('설정 저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSavingBeakItem(false);
    }
  };

  const handleCancelBeakItem = () => setPendingBeakItemId(null);

  const handleResetBeak = () => {
    if (window.confirm('모든 회원의 윽우지 부리 이스터에그를 다시 클릭할 수 있게 리셋할까요?')) {
      onResetCramorantBeak?.();
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setShowItemSelector(false);
    setShowSettingsModal(true);
  };

  const handleAddItem = async (config) => {
    const newItem = {
      itemId: config.itemId,
      price: config.price,
      stock: config.stock,
      isPersistent: config.isPersistent,
      ...(config.maxPurchasePerMember > 0 ? { maxPurchasePerMember: config.maxPurchasePerMember } : {}),
    };
    
    const updatedShopData = JSON.parse(JSON.stringify(shopData));
    
    if (config.itemType === 'daily') {
      if (!updatedShopData.dailyItems) {
        updatedShopData.dailyItems = {};
      }
      
      if (!updatedShopData.dailyItems[config.selectedDay]) {
        updatedShopData.dailyItems[config.selectedDay] = [];
      }
      
      const currentItems = updatedShopData.dailyItems[config.selectedDay];
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      
      updatedShopData.dailyItems[config.selectedDay] = [...currentItems, newItem];
      
    } else if (config.itemType === 'permanent') {
      if (!updatedShopData.permanentItems) {
        updatedShopData.permanentItems = [];
      }
      
      const currentItems = updatedShopData.permanentItems;
      
      if (currentItems.some(i => i.itemId === newItem.itemId)) {
        alert('이미 추가된 아이템입니다!');
        return;
      }
      
      updatedShopData.permanentItems = [...currentItems, newItem];
    }
    
    try {
      await onUpdateShop(updatedShopData);
      setSelectedItem(null);
      setShowSettingsModal(false);
      alert('아이템이 성공적으로 추가되었습니다!');
    } catch (error) {
      console.error('아이템 추가 실패:', error);
      alert('아이템 추가 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'current'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Store size={16} />
            현재 상점 관리
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'template'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={16} />
            요일별 아이템
          </button>

          <button
            onClick={() => setShowRarePanel(true)}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Star size={16} />
            한정 아이템
          </button>

          <button
            onClick={() => setShowPeriodPanel(true)}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 bg-cyan-600 text-white hover:bg-cyan-700"
          >
            <CalendarClock size={16} />
            기간한정 아이템
          </button>

          <button
            onClick={() => setShowGachaPanel(true)}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
          >
            <CircleDot size={16} />
            규토리볼
          </button>

          <button
            onClick={() => setShowRandomBoxPanel(true)}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 border-2 border-lime-300 bg-white/55 text-green-950 hover:bg-lime-100/70"
          >
            <Gift size={16} />
            랜덤박스
          </button>

          <button
            onClick={() => setShowRacePanel(true)}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
          >
            <Snowflake size={16} />
            누니머기 레이스
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 whitespace-nowrap">
          <Gift size={16} />
          윽우지 부리 이스터에그
        </div>
        <span className="text-sm text-gray-600">
          지급 아이템: <strong>{cramorantBeakItem?.name || '설정 안 됨'}</strong>
          {hasPendingBeakChange && <span className="text-orange-600 font-semibold"> (저장 안 됨)</span>}
        </span>
        <button
          onClick={() => setShowBeakItemSelector(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
        >
          아이템 변경
        </button>
        {hasPendingBeakChange && (
          <>
            <button
              onClick={handleSaveBeakItem}
              disabled={isSavingBeakItem}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSavingBeakItem ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleCancelBeakItem}
              disabled={isSavingBeakItem}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
            >
              취소
            </button>
          </>
        )}
        <button
          onClick={handleResetBeak}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
        >
          전체 리셋
        </button>
      </div>

      {activeTab === 'current' && (
        <CurrentShopTab 
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={onUpdateShop}
          onTogglePersistent={onTogglePersistent}
          onOpenAddModal={() => setShowItemSelector(true)}
        />
      )}

      {activeTab === 'template' && (
        <TemplateTab
          shopData={shopData}
          allItems={allItems}
          onUpdateShop={onUpdateShop}
        />
      )}

      <ItemSelectorModal
        show={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={handleItemSelect}
        items={allItems}
        title="상점에 추가할 아이템 선택"
      />

      <ItemSelectorModal
        show={showBeakItemSelector}
        onClose={() => setShowBeakItemSelector(false)}
        onSelect={handleSelectBeakItem}
        items={allItems}
        title="윽우지 부리 지급 아이템 선택"
      />

      <AddItemSettingsModal
        show={showSettingsModal}
        selectedItem={selectedItem}
        onClose={() => {
          setShowSettingsModal(false);
          setSelectedItem(null);
        }}
        onAdd={handleAddItem}
      />

      {showRarePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[90vh]">
            <div className="relative h-full">
              <button
                onClick={() => setShowRarePanel(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-lg"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <RareItemPanel
                shopData={shopData}
                allItems={allItems}
                onUpdateShop={onUpdateShop}
              />
            </div>
          </div>
        </div>
      )}

      {showPeriodPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[90vh]">
            <div className="relative h-full">
              <button
                onClick={() => setShowPeriodPanel(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-lg"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <PeriodItemPanel
                shopData={shopData}
                allItems={allItems}
                onUpdateShop={onUpdateShop}
              />
            </div>
          </div>
        </div>
      )}

      {showGachaPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-[90vh]">
            <div className="relative h-full">
              <button
                onClick={() => setShowGachaPanel(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-lg"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <GachaBallPanel
                shopData={shopData}
                allItems={allItems}
                onUpdateShop={onUpdateShop}
              />
            </div>
          </div>
        </div>
      )}

      {showRacePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="relative">
              <button
                onClick={() => setShowRacePanel(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-lg"
              >
                <X size={24} className="text-gray-600" />
              </button>
              <NunmegiRaceAdminPanel />
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
