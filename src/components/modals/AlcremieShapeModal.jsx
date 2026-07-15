import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ALCREMIE_SHAPES, getAlcremieImage } from '../../utils/alcremieFlavors';

const PREVIEW_FLAVOR = 'vanilla';

export default function AlcremieShapeModal({ pokemon, onConfirm, onCancel }) {
  const [selectedShape, setSelectedShape] = useState(null);
  const pokemonName = pokemon?.nickname || pokemon?.name || '마빌크';

  const handleConfirm = () => {
    if (!selectedShape) {
      alert('사용할 사탕공예를 선택해주세요!');
      return;
    }
    onConfirm(selectedShape);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b-2 border-lime-300 bg-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-green-950 flex items-center gap-2">
                <Sparkles size={22} className="text-lime-700" />
                강제 진화
              </h2>
              <p className="text-green-800">
                {pokemonName}에게 어떤 사탕공예를 사용할까요?
              </p>
            </div>
            <button onClick={onCancel} className="text-green-950 hover:text-lime-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-3">
            {ALCREMIE_SHAPES.map((shape) => {
              const isSelected = selectedShape?.id === shape.id;
              const imageUrl = getAlcremieImage(PREVIEW_FLAVOR, shape.id);
              return (
                <button
                  key={shape.id}
                  onClick={() => setSelectedShape(shape)}
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
                    {shape.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 bg-white p-4 rounded-b-xl">
          <button
            onClick={handleConfirm}
            disabled={!selectedShape}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              !selectedShape
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            다음
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
