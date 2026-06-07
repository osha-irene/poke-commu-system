// src/components/views/admin/ShopAdminPanel.jsx
import React, { useState } from 'react';
import { Store, Star, CircleDot, RefreshCw, Gift, X } from 'lucide-react';
import ItemSelectorModal from '../../modals/ItemSelectorModal';
import AddItemSettingsModal from '../../modals/AddItemSettingsModal';
import CurrentShopTab from '../../shop/CurrentShopTab';
import TemplateTab from '../../shop/TemplateTab';
import RareItemPanel from '../../shop/RareItemPanel';
import GachaBallPanel from '../../shop/GachaBallPanel';
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
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRarePanel, setShowRarePanel] = useState(false);
  const [showGachaPanel, setShowGachaPanel] = useState(false);
  const [showRandomBoxPanel, setShowRandomBoxPanel] = useState(false);

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
      isPersistent: config.isPersistent
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
            초기 재고 템플릿
          </button>
          
          <button
            onClick={() => setShowRarePanel(true)}
            className="px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Star size={20} />
            희귀템 풀
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
