// ============================================
// src/components/modals/AddItemSettingsModal.jsx 로 저장
// ============================================

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const DAYS = [
  { id: 'monday', name: '월요일' },
  { id: 'tuesday', name: '화요일' },
  { id: 'wednesday', name: '수요일' },
  { id: 'thursday', name: '목요일' },
  { id: 'friday', name: '금요일' },
  { id: 'saturday', name: '토요일' },
  { id: 'sunday', name: '일요일' }
];

export default function AddItemSettingsModal({ 
  show, 
  selectedItem, 
  onClose, 
  onAdd
}) {
  const [itemType] = useState('permanent');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(99);

  useEffect(() => {
    if (selectedItem) {
      setPrice(selectedItem.cost || 100);
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
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800">상품 설정</h3>
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
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'pixelated', transform: 'scale(2)' }}
                  />
                )}
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-lg text-gray-800">{selectedItem.name}</h5>
                <p className="text-sm text-gray-600 mt-1">{selectedItem.effect || selectedItem.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                재고
              </label>
              <input 
                type="number" 
                value={stock} 
                onChange={(e) => setStock(parseInt(e.target.value) || 0)} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
              />
            </div>

            <button 
              onClick={handleSubmit} 
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
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
