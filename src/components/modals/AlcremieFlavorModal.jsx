import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ALCREMIE_FLAVORS, getAlcremieImage } from '../../utils/alcremieFlavors';

export default function AlcremieFlavorModal({ pokemon, shapeId, onConfirm, onCancel }) {
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const pokemonName = pokemon?.nickname || pokemon?.name || '마빌크';

  const handleConfirm = () => {
    if (!selectedFlavor) {
      alert('진화시킬 마휘핑을 선택해주세요!');
      return;
    }
    onConfirm(selectedFlavor);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b-2 border-lime-300 bg-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-green-950 flex items-center gap-2">
                <Sparkles size={22} className="text-lime-700" />
                진화!
              </h2>
              <p className="text-green-800">
                {pokemonName}이(가) 진화하려고 합니다! 어떤 마휘핑으로 진화할까?
              </p>
            </div>
            <button onClick={onCancel} className="text-green-950 hover:text-lime-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-3">
            {ALCREMIE_FLAVORS.map((flavor) => {
              const isSelected = selectedFlavor?.id === flavor.id;
              const imageUrl = getAlcremieImage(flavor.id, shapeId);
              return (
                <button
                  key={flavor.id}
                  onClick={() => setSelectedFlavor(flavor)}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">
                      ✓
                    </div>
                  )}
                  <div
                    className="w-16 h-16"
                    style={{
                      backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  />
                  <span className={`text-xs font-bold text-center leading-tight ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {flavor.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 bg-white p-4 rounded-b-xl">
          <button
            onClick={handleConfirm}
            disabled={!selectedFlavor}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              !selectedFlavor
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            진화!
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
