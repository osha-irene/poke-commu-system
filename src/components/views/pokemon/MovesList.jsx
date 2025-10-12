// src/components/pokemon/MovesList.jsx
import React from 'react';
import { Zap, Shield, Star, Trash2 } from 'lucide-react';

// 타입별 색상
const TYPE_COLORS = {
  '노말': '#A8A878',
  '불꽃': '#F08030',
  '물': '#6890F0',
  '전기': '#F8D030',
  '풀': '#78C850',
  '얼음': '#98D8D8',
  '격투': '#C03028',
  '독': '#A040A0',
  '땅': '#E0C068',
  '비행': '#A890F0',
  '에스퍼': '#F85888',
  '벌레': '#A8B820',
  '바위': '#B8A038',
  '고스트': '#705898',
  '드래곤': '#7038F8',
  '악': '#705848',
  '강철': '#B8B8D0',
  '페어리': '#EE99AC'
};

// 카테고리 아이콘
const getCategoryIcon = (category) => {
  switch (category) {
    case '물리': return <Zap size={14} className="text-orange-500" />;
    case '특수': return <Star size={14} className="text-purple-500" />;
    case '변화': return <Shield size={14} className="text-blue-500" />;
    default: return null;
  }
};

export default function MovesList({ 
  moves = [],
  allMoves = [],  // ⭐ 이게 있어야 함!
  onForgetMove,
  canEdit = true 
}) {
  // ⭐ 동적으로 합치기
  const displayMoves = moves.map(m => {
    const moveData = allMoves.find(move => move.id === m.moveId);
    
    console.log('🔍 찾는 moveId:', m.moveId, '→ 찾음:', !!moveData);
    
    if (!moveData) {
      console.warn('❌ moveId', m.moveId, '에 해당하는 기술을 찾을 수 없습니다!');
      return null;
    }
    
    return {
      ...moveData,
      currentPp: m.currentPp !== null ? m.currentPp : moveData.pp,
      learnedAt: m.learnedAt
    };
  }).filter(Boolean);

  console.log('✅ displayMoves:', displayMoves);
  
  if (displayMoves.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-2">🎯</div>
        <p className="text-gray-500 text-sm">배운 기술이 없습니다</p>
        <p className="text-gray-400 text-xs mt-1">레벨업하면 자동으로 기술을 배웁니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayMoves.map((move, index) => (
        <div
          key={`${move.id}-${index}`}
          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            {/* 왼쪽: 기술 정보 */}
            <div className="flex-1 min-w-0">
              {/* 기술명 & 타입 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-800 text-sm">
                  {move.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold text-white"
                  style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                >
                  {move.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  {getCategoryIcon(move.category)}
                  {move.category}
                </span>
              </div>

              {/* 기술 상세 정보 */}
              <div className="flex gap-3 text-xs text-gray-600">
                {move.power > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">위력</span>
                    <span className="text-orange-600 font-bold">{move.power}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="font-semibold">명중</span>
                  <span className="text-blue-600 font-bold">{move.accuracy}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold">PP</span>
                  <span className="text-green-600 font-bold">
                    {move.currentPp || move.pp}/{move.pp}
                  </span>
                </span>
              </div>

              {/* 기술 설명 */}
              {move.description && (
                <div className="text-xs text-gray-600 mt-1 leading-tight">
                  {move.description}
                </div>
              )}
            </div>

            {/* 오른쪽: 삭제 버튼 */}
            {canEdit && onForgetMove && (
              <button
                onClick={() => {
                  if (window.confirm(`${move.name}을(를) 잊게 하시겠습니까?`)) {
                    onForgetMove(move.id);  // ⭐ move.id로 수정
                  }
                }}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="기술 잊기"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}