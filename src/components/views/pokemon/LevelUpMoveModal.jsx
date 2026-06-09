// src/components/views/pokemon/LevelUpMoveModal.jsx
import React, { useState } from 'react';
import { X, Zap, Shield, Star, TrendingUp } from 'lucide-react';

const TYPE_COLORS = {
  '노말': '#A8A878', '불꽃': '#F08030', '물': '#6890F0', '전기': '#F8D030',
  '풀': '#78C850', '얼음': '#98D8D8', '격투': '#C03028', '독': '#A040A0',
  '땅': '#E0C068', '비행': '#A890F0', '에스퍼': '#F85888', '벌레': '#A8B820',
  '바위': '#B8A038', '고스트': '#705898', '드래곤': '#7038F8', '악': '#705848',
  '강철': '#B8B8D0', '페어리': '#EE99AC'
};

const getCategoryIcon = (category) => {
  switch (category) {
    case '물리': return <Zap size={14} />;
    case '특수': return <Star size={14} />;
    case '변화': return <Shield size={14} />;
    default: return null;
  }
};

export default function LevelUpMoveModal({
  pokemon,
  newLevel,
  learnableMoves = [],
  currentMoves = [],
  onLearn,
  onSkip
}) {
  const [selectedNewMove, setSelectedNewMove] = useState(learnableMoves[0]);
  const [selectedOldMove, setSelectedOldMove] = useState(null);

  const isFull = currentMoves.length >= 4;

  const handleConfirm = () => {
    if (isFull && !selectedOldMove) {
      alert('교체할 기술을 선택해주세요!');
      return;
    }
    
    onLearn(selectedNewMove, selectedOldMove);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-lime-300">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="border-2 border-lime-300 bg-white/55 p-3 rounded-full">
                <TrendingUp size={32} className="text-lime-700" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-950">레벨 업!</h2>
                <p className="text-green-800 text-sm">
                  {pokemon.nickname || pokemon.name}이(가) Lv.{newLevel}이 되었습니다!
                </p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-green-950 hover:text-lime-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 새로 배울 수 있는 기술 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              ✨ 새로 배울 수 있는 기술
            </h3>
            <div className="space-y-2">
              {learnableMoves.map((move) => (
                <button
                  key={move.id}
                  onClick={() => setSelectedNewMove(move)}
                  className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                    selectedNewMove?.id === move.id
                      ? 'border-yellow-500 bg-yellow-100 shadow-lg'
                      : 'border-gray-300 bg-white hover:border-yellow-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-800">{move.name}</span>
                    <span
                      className="text-xs px-2 py-1 rounded font-bold text-white"
                      style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                    >
                      {move.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      {getCategoryIcon(move.category)}
                      {move.category}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-700 mb-2">
                    {move.power > 0 && <span>위력: <strong>{move.power}</strong></span>}
                    <span>명중: <strong>{move.accuracy}</strong></span>
                    <span>PP: <strong>{move.pp}</strong></span>
                  </div>

                  {move.description && (
                    <p className="text-sm text-gray-600 leading-tight">
                      {move.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 기술 슬롯 상태 */}
          {isFull ? (
            <>
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4 text-center">
                <p className="text-orange-800 font-semibold">
                  ⚠️ 기술이 가득 찼습니다! 잊을 기술을 선택해주세요.
                </p>
              </div>

              {/* 현재 기술 목록 */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">현재 기술 (교체할 기술 선택)</h3>
                <div className="space-y-2">
                  {currentMoves.map((move) => (
                    <button
                      key={move.id}
                      onClick={() => setSelectedOldMove(move.id)}
                      className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                        selectedOldMove === move.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{move.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded font-bold text-white"
                              style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                            >
                              {move.type}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600">
                            {move.power > 0 && <span>위력: {move.power}</span>}
                            <span>명중: {move.accuracy}</span>
                            <span>PP: {move.pp}</span>
                          </div>
                        </div>
                        {selectedOldMove === move.id && (
                          <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">
                ✅ 빈 슬롯이 있어 바로 배울 수 있습니다! ({currentMoves.length}/4)
              </p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={isFull && !selectedOldMove}
              className={`flex-1 py-3 rounded-lg font-bold text-lg transition-all ${
                isFull && !selectedOldMove
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'border-2 border-lime-300 bg-white/55 text-green-950 hover:bg-lime-100/70 shadow-sm'
              }`}
            >
              {isFull ? '기술 교체하기' : '기술 배우기'}
            </button>
            <button
              onClick={onSkip}
              className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-bold text-lg hover:bg-gray-400 transition-all"
            >
              배우지 않기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
