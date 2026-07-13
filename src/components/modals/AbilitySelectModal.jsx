import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function AbilitySelectModal({ pokemon, options = [], onConfirm, onCancel }) {
  const [selectedAbility, setSelectedAbility] = useState(null);
  const pokemonName = pokemon?.nickname || pokemon?.name || '포켓몬';

  const handleConfirm = () => {
    if (!selectedAbility) {
      alert('바꿀 특성을 선택해주세요!');
      return;
    }
    onConfirm(selectedAbility);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b-2 border-lime-300 bg-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-green-950">특성패치</h2>
              <p className="text-green-800">
                {pokemonName}의 특성을 무엇으로 바꿀까요?
              </p>
            </div>
            <button onClick={onCancel} className="text-green-950 hover:text-lime-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-2">
          {options.map((ability) => {
            const isSelected = selectedAbility?.nameEn === ability.nameEn;
            return (
              <button
                key={ability.nameEn}
                onClick={() => setSelectedAbility(ability)}
                className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                  isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{ability.name}</span>
                      {ability.isHidden && (
                        <span className="text-xs px-2 py-1 rounded font-bold bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <Sparkles size={12} /> 숨겨진 특성
                        </span>
                      )}
                    </div>
                    {(ability.effectKo || ability.shortEffectKo || ability.effect) && (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {ability.effectKo || ability.shortEffectKo || ability.effect}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center">✓</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 bg-white p-4 rounded-b-xl">
          <button
            onClick={handleConfirm}
            disabled={!selectedAbility}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              !selectedAbility
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            특성 바꾸기
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
