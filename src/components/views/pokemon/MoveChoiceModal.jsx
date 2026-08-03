// src/components/views/pokemon/MoveChoiceModal.jsx
import React, { useState } from 'react';
import { X, AlertCircle, Zap, Shield, Star } from 'lucide-react';
import { getTypeNameKr, getTypeColor } from '../../../styles/theme';
import { getContestTypeColor, getContestEffectKo } from '../../../utils/contestMoveData';
import RibbonIcon from '../../icons/RibbonIcon';
import CrossedSwordsIcon from '../../icons/CrossedSwordsIcon';

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

const repeatContestIcon = (value, icon) => {
  const count = Number(value) || 0;
  return icon.repeat(count);
};

const hasContestValue = (value) => Number(value) > 0;

const KIND_LABEL = {
  tm: '기술머신',
  egg: '유전 기술'
};

export default function MoveChoiceModal({
  pokemon,
  kind = 'tm',
  options = [],
  currentMoves = [],
  allMoves = [],
  onConfirm,
  onCancel
}) {
  const [selectedNewMove, setSelectedNewMove] = useState(null);
  const [selectedOldMove, setSelectedOldMove] = useState(null);
  const [contestMode, setContestMode] = useState(false);

  // currentMoves는 { moveId, currentPp, learnedAt }만 들고 있어서, 이름/타입 등
  // 표시에 필요한 정보는 allMoves에서 찾아 합쳐야 한다 (MovesList.jsx와 동일한 방식).
  const resolvedCurrentMoves = currentMoves
    .map((entry) => {
      const moveData = allMoves.find((m) => String(m.id) === String(entry.moveId));
      if (!moveData) return null;
      return { ...moveData, ...entry };
    })
    .filter(Boolean);

  const isFull = resolvedCurrentMoves.length >= 4;
  const pokemonName = pokemon?.nickname || pokemon?.name || '포켓몬';

  const handleConfirm = () => {
    if (!selectedNewMove) {
      alert('배울 기술을 선택해주세요!');
      return;
    }
    if (isFull && !selectedOldMove) {
      alert('교체할 기술을 선택해주세요!');
      return;
    }
    onConfirm(selectedNewMove, selectedOldMove);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-green-950">{KIND_LABEL[kind] || '기술 선택'}</h2>
              <p className="text-green-800">
                {pokemonName}에게 가르칠 기술을 골라주세요
              </p>
            </div>
            <button onClick={onCancel} className="text-green-950 hover:text-lime-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {/* 배울 기술 목록 */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
              배울 기술 선택 ({options.length}개 중)
              <button
                type="button"
                onClick={() => setContestMode(false)}
                title="배틀 정보 보기"
                className={`p-1 rounded transition-all ${
                  !contestMode ? 'bg-indigo-100' : 'grayscale opacity-40 hover:opacity-70'
                }`}
              >
                <CrossedSwordsIcon size={15} />
              </button>
              <button
                type="button"
                onClick={() => setContestMode(true)}
                title="콘테스트 정보 보기"
                className={`p-1 rounded transition-all ${
                  contestMode ? 'bg-pink-100' : 'grayscale opacity-40 hover:opacity-70'
                }`}
              >
                <RibbonIcon size={15} />
              </button>
            </h3>
            <div className="space-y-2">
              {options.map((move) => {
                const typeKr = getTypeNameKr(move.type) || move.type;
                const typeColors = getTypeColor(typeKr);
                const categoryKr = CATEGORY_NAMES_KR[move.category] || move.category;
                const isSelected = selectedNewMove?.id === move.id;
                const hasContestData = !!move.contestType;
                const contestColors = getContestTypeColor(move.contestType);

                return (
                  <button
                    key={move.id}
                    onClick={() => setSelectedNewMove(move)}
                    className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                      isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{move.name}</span>
                          <span
                            className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center min-w-[3rem]"
                            style={{ backgroundColor: typeColors.bg, color: typeColors.text }}
                          >
                            {typeKr}
                          </span>
                          {!contestMode && (
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              {getCategoryIcon(move.category)}
                              <span className="font-medium">{categoryKr}</span>
                            </span>
                          )}
                        </div>
                        {contestMode ? (
                          hasContestData ? (
                            <>
                              <div className="flex items-center gap-3 mb-1">
                                <span
                                  className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center"
                                  style={{ backgroundColor: contestColors.bg, color: contestColors.text }}
                                >
                                  {move.contestType}
                                </span>
                                {hasContestValue(move.contestAppeals) && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <span className="text-pink-500 font-bold">어필</span>
                                    <span className="text-pink-500 font-bold tracking-wide">{repeatContestIcon(move.contestAppeals, '♥')}</span>
                                  </span>
                                )}
                                {hasContestValue(move.contestJam) && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <span className="text-indigo-400 font-bold">방해</span>
                                    <span className="text-indigo-400 font-bold tracking-wide">{repeatContestIcon(move.contestJam, '♡')}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {getContestEffectKo(move.contestEffect) || '효과 정보 없음'}
                              </p>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400 italic">콘테스트 데이터 없음</div>
                          )
                        ) : (
                          <>
                            <div className="flex gap-3 text-xs text-gray-600 mb-1">
                              {move.power > 0 && (
                                <span><span className="text-gray-500">위력</span> <span className="font-bold text-orange-600">{move.power}</span></span>
                              )}
                              <span><span className="text-gray-500">명중</span> <span className="font-bold text-blue-600">{move.accuracy}</span></span>
                              <span><span className="text-gray-500">PP</span> <span className="font-bold text-green-600">{move.pp}</span></span>
                            </div>
                            {move.description && (
                              <p className="text-xs text-gray-500 leading-relaxed">{move.description}</p>
                            )}
                          </>
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
          </div>

          {/* 현재 기술 (꽉 찼을 때 교체 대상 선택) */}
          {isFull ? (
            <>
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">기술이 가득 찼습니다! 잊을 기술을 선택해주세요.</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">현재 기술 (교체할 기술 선택)</h3>
                <div className="space-y-2">
                  {resolvedCurrentMoves.map((move) => {
                    const typeKr = getTypeNameKr(move.type) || move.type;
                    const moveTypeColors = getTypeColor(typeKr);
                    const hasContestData = !!move.contestType;
                    const contestColors = getContestTypeColor(move.contestType);
                    return (
                      <button
                        key={move.moveId}
                        onClick={() => setSelectedOldMove(move.moveId)}
                        className={`w-full text-left border-2 rounded-lg p-3 transition-all ${
                          selectedOldMove === move.moveId ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-800">{move.name}</span>
                              <span
                                className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center min-w-[3rem]"
                                style={{ backgroundColor: moveTypeColors.bg, color: moveTypeColors.text }}
                              >
                                {typeKr}
                              </span>
                              {!contestMode && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  {getCategoryIcon(move.category)}
                                  <span className="font-medium">{CATEGORY_NAMES_KR[move.category] || move.category}</span>
                                </span>
                              )}
                            </div>
                            {contestMode ? (
                              hasContestData ? (
                                <>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span
                                      className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center"
                                      style={{ backgroundColor: contestColors.bg, color: contestColors.text }}
                                    >
                                      {move.contestType}
                                    </span>
                                    {hasContestValue(move.contestAppeals) && (
                                      <span className="flex items-center gap-1 text-xs">
                                        <span className="text-pink-500 font-bold">어필</span>
                                        <span className="text-pink-500 font-bold tracking-wide">{repeatContestIcon(move.contestAppeals, '♥')}</span>
                                      </span>
                                    )}
                                    {hasContestValue(move.contestJam) && (
                                      <span className="flex items-center gap-1 text-xs">
                                        <span className="text-indigo-400 font-bold">방해</span>
                                        <span className="text-indigo-400 font-bold tracking-wide">{repeatContestIcon(move.contestJam, '♡')}</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed">
                                    {getContestEffectKo(move.contestEffect) || '효과 정보 없음'}
                                  </p>
                                </>
                              ) : (
                                <div className="text-xs text-gray-400 italic">콘테스트 데이터 없음</div>
                              )
                            ) : (
                              <>
                                <div className="flex gap-3 text-xs text-gray-600 mb-1">
                                  {move.power > 0 && (
                                    <span><span className="text-gray-500">위력</span> <span className="font-bold text-orange-600">{move.power}</span></span>
                                  )}
                                  <span><span className="text-gray-500">명중</span> <span className="font-bold text-blue-600">{move.accuracy}</span></span>
                                  <span><span className="text-gray-500">PP</span> <span className="font-bold text-green-600">{move.pp}</span></span>
                                </div>
                                {move.description && (
                                  <p className="text-xs text-gray-500 leading-relaxed">{move.description}</p>
                                )}
                              </>
                            )}
                          </div>
                          {selectedOldMove === move.moveId && (
                            <div className="flex-shrink-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">✓</div>
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
              <p className="text-sm text-green-800">✅ 빈 슬롯이 있어 바로 배울 수 있습니다! ({resolvedCurrentMoves.length}/4)</p>
            </div>
          )}
        </div>

        {/* 버튼 - 스크롤 영역 밖의 고정 푸터라 항상 하단에 딱 붙는다 */}
        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 bg-white p-4 rounded-b-xl">
          <button
            onClick={handleConfirm}
            disabled={!selectedNewMove || (isFull && !selectedOldMove)}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              !selectedNewMove || (isFull && !selectedOldMove)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isFull ? '기술 교체하기' : '기술 배우기'}
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
