// ============================================
// src/components/modals/AddItemSettingsModal.jsx 로 저장
// ============================================

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';


export default function AddItemSettingsModal({ 
  show, 
  selectedItem, 
  onClose, 
  onAdd
}) {
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(99);
  const [maxPurchasePerMember, setMaxPurchasePerMember] = useState(0);

  useEffect(() => {
    if (selectedItem) {
      setPrice(selectedItem.cost || 100);
      setMaxPurchasePerMember(Number(selectedItem.maxPurchasePerMember) || 0);
    }
  }, [selectedItem]);

  if (!show || !selectedItem) return null;

  const handleSubmit = () => {
    onAdd({
      itemId: selectedItem.id,
      price,
      stock,
      isPersistent: false,
      itemType: 'permanent',
      // 0(무제한)이면 슬롯에 아예 필드를 안 실어서, 아이템 자체에 설정된 값(있다면)이
      // 그대로 통과되게 한다 - 상점 슬롯 값은 있을 때만 아이템 기본값을 덮어쓴다.
      ...(maxPurchasePerMember > 0 ? { maxPurchasePerMember } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-3xl font-bold text-gray-800">상품 설정</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded flex items-center justify-center">
                {(selectedItem.spriteUrl || selectedItem.imageUrl) && (
                  <img 
                    src={selectedItem.spriteUrl || selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className={selectedItem.isCustom ? 'custom-item-image-64' : 'max-w-full max-h-full object-contain'}
                    style={{ imageRendering: 'pixelated', transform: selectedItem.isCustom ? 'none' : 'scale(2)' }}
                  />
                )}
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-xl text-gray-800">{selectedItem.name}</h5>
                <p className="text-base text-gray-600 mt-1">{selectedItem.effect || selectedItem.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                가격
              </label>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                재고
              </label>
              <input 
                type="number" 
                value={stock} 
                onChange={(e) => setStock(parseInt(e.target.value) || 0)} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                인당 최대 구매 개수 (평생 누적, 0이면 무제한)
              </label>
              <input
                type="number"
                min="0"
                value={maxPurchasePerMember}
                onChange={(e) => setMaxPurchasePerMember(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              추가하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

