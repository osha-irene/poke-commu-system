// src/components/views/pokemon/LearnMoveModal.jsx
import React, { useState } from 'react';
import { X, AlertCircle, Zap, Shield, Star } from 'lucide-react';
import { getTypeNameKr, getTypeColor } from '../../../styles/theme';

const CATEGORY_NAMES_KR = {
  'physical': '물리',
  'special': '특수',
  'status': '변화'
};

const getCategoryIcon = (category) => {
  const categoryKr = CATEGORY_NAMES_KR[category] || category;
  switch (categoryKr) {
    case '물리': return <Zap size={14} className="text-orange-500" />;
    case '특수': return <Star size={14} className="text-purple-500" />;
    case '변화': return <Shield size={14} className="text-blue-500" />;
    default: return null;
  }
};

export default function LearnMoveModal({
  pokemon,
  newLevel,
  learnableMoves = [],
  currentMoves = [],
  onLearn,
  onConfirm,
  onSkip,
  onCancel
}) {
  const [selectedNewMove] = useState(learnableMoves[0]);
  const [selectedOldMove, setSelectedOldMove] = useState(null);

  const isFull = currentMoves.length >= 4;

  // 첫 번째 배울 기술 (한글 변환)
  const newMove = selectedNewMove ? {
    ...selectedNewMove,
    type: getTypeNameKr(selectedNewMove.type) || selectedNewMove.type,
    category: CATEGORY_NAMES_KR[selectedNewMove.category] || selectedNewMove.category
  } : null;

  // 현재 기술들 (한글 변환)
  const displayCurrentMoves = currentMoves.map(move => ({
    ...move,
    type: getTypeNameKr(move.type) || move.type,
    category: CATEGORY_NAMES_KR[move.category] || move.category
  }));

  const handleConfirm = () => {
    if (isFull && !selectedOldMove) {
      alert('교체할 기술을 선택해주세요!');
      return;
    }
    
    console.log('=== 기술 교체 시작 ===');
    console.log('새 기술:', selectedNewMove);
    console.log('잊을 기술 ID:', selectedOldMove);
    console.log('현재 기술들:', currentMoves);
    console.log('=====================');
    
    const callback = onLearn || onConfirm;
    if (callback) {
      callback(selectedNewMove, selectedOldMove);
    } else {
      console.error('⚠️ onLearn 또는 onConfirm 콜백이 없습니다!');
      alert('오류: 기술을 배울 수 없습니다. 콘솔을 확인해주세요.');
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onSkip) {
      onSkip();
    }
  };

  if (!newMove) {
    return null;
  }

  const newMoveTypeColors = getTypeColor(newMove.type);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-green-950">새로운 기술!</h2>
              <p className="text-green-800">
                {pokemon.nickname || pokemon.name}이(가) {newMove.name}을(를) 배우려고 합니다
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-green-950 hover:text-lime-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {/* 새로운 기술 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">🆕 배울 기술</h3>
            <div className="bg-white/40 border-2 border-lime-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-gray-800">{newMove.name}</span>
                <span
                  className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center min-w-[3rem]"
                  style={{ 
                    backgroundColor: newMoveTypeColors.bg,
                    color: newMoveTypeColors.text
                  }}
                >
                  {newMove.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  {getCategoryIcon(newMove.category)}
                  <span className="font-medium">{newMove.category}</span>
                </span>
              </div>
              
              <div className="flex gap-4 text-sm">
                {newMove.power > 0 && (
                  <span className="text-gray-700">
                    <span className="text-gray-500">위력</span>{' '}
                    <span className="font-bold text-orange-600">{newMove.power}</span>
                  </span>
                )}
                <span className="text-gray-700">
                  <span className="text-gray-500">명중</span>{' '}
                  <span className="font-bold text-blue-600">{newMove.accuracy}</span>
                </span>
                <span className="text-gray-700">
                  <span className="text-gray-500">PP</span>{' '}
                  <span className="font-bold text-green-600">{newMove.pp}</span>
                </span>
              </div>

              {newMove.description && (
                <p className="text-sm text-gray-600 mt-2 border-t border-yellow-200 pt-2">
                  {newMove.description}
                </p>
              )}
            </div>
          </div>

          {/* 현재 기술 */}
          {isFull ? (
            <>
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">
                  기술이 가득 찼습니다! 잊을 기술을 선택해주세요.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">현재 기술 (교체할 기술 선택)</h3>
                <div className="space-y-2">
                  {displayCurrentMoves.map((move) => {
                    const moveTypeColors = getTypeColor(move.type);
                    
                    return (
                      <button
                        key={move.moveId}
                        onClick={() => setSelectedOldMove(move.moveId)}
                        className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                          selectedOldMove === move.moveId
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-800">{move.name}</span>
                              <span
                                className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center min-w-[3rem]"
                                style={{ 
                                  backgroundColor: moveTypeColors.bg,
                                  color: moveTypeColors.text
                                }}
                              >
                                {move.type}
                              </span>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-600">
                              {move.power > 0 && (
                                <span>
                                  <span className="text-gray-500">위력</span>{' '}
                                  <span className="font-bold text-orange-600">{move.power}</span>
                                </span>
                              )}
                              <span>
                                <span className="text-gray-500">명중</span>{' '}
                                <span className="font-bold text-blue-600">{move.accuracy}</span>
                              </span>
                              <span>
                                <span className="text-gray-500">PP</span>{' '}
                                <span className="font-bold text-green-600">{move.pp}</span>
                              </span>
                            </div>
                          </div>
                          {selectedOldMove === move.moveId && (
                            <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ 빈 슬롯이 있어 바로 배울 수 있습니다! ({currentMoves.length}/4)
              </p>
            </div>
          )}

          {/* 버튼 */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-gray-200 bg-white/95 p-4">
            <button
              onClick={() => {
                console.log('🔘 기술 교체하기 버튼 클릭!');
                console.log('🔘 isFull:', isFull);
                console.log('🔘 selectedOldMove:', selectedOldMove);
                console.log('🔘 selectedNewMove:', selectedNewMove);
                handleConfirm();
              }}
              disabled={isFull && !selectedOldMove}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                isFull && !selectedOldMove
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isFull ? '기술 교체하기' : '기술 배우기'}
            </button>
            <button
              onClick={() => {
                console.log('🔘 배우지 않기 버튼 클릭!');
                handleCancel();
              }}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              배우지 않기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
