import React, { useState } from 'react';
import { BACKGROUND_TYPES, getPreviewBackground } from '../../utils/encounterBackground';

export default function RegionEditModal({ region, allPokemon, onClose, onSave }) {
  const [selectedBackground, setSelectedBackground] = useState(region.background || null);

  const handleSave = () => {
    onSave(region.id, region.pokemons || [], region.pokemonRates || {}, region.encounterRate, region.minLevel, region.maxLevel, selectedBackground);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-indigo-600 text-white p-5 flex-shrink-0">
          <h2 className="text-2xl font-bold">{region.name} — 인카운터 배경 설정</h2>
          <p className="text-sm text-indigo-200 mt-1">시간대에 맞춰 낮/밤 버전이 자동 선택됩니다. 낮 버전이 여러 개인 경우 랜덤 출력됩니다.</p>
        </div>

        {/* 배경 선택 그리드 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedBackground(null)}
              className={`relative rounded-lg overflow-hidden border-4 transition-all ${
                selectedBackground === null ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ aspectRatio: '16/9', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="text-white font-bold text-sm">없음 (기본)</span>
              {selectedBackground === null && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
              )}
            </button>

            {BACKGROUND_TYPES.map(({ key, label }) => {
              const preview = getPreviewBackground(key);
              const isSelected = selectedBackground === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedBackground(key)}
                  className={`relative rounded-lg overflow-hidden border-4 transition-all ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ aspectRatio: '16/9', padding: 0 }}
                >
                  {preview && <img src={preview} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '4px 8px' }}>
                    <span className="text-white font-bold text-sm">{label}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">
            취소
          </button>
          <button onClick={handleSave} className="px-6 py-2 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
