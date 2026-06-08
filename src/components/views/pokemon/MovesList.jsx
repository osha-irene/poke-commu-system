// src/components/views/pokemon/MovesList.jsx
import React from 'react';
import { Zap, Shield, Star, Trash2 } from 'lucide-react';
import { getTypeNameKr, getTypeColor } from '../../../styles/theme';

// ✅ 카테고리 영문→한글 매핑
const CATEGORY_NAMES_KR = {
  'physical': '물리',
  'special': '특수',
  'status': '변화'
};

const getCategoryIcon = (category) => {
  switch (category) {
    case '물리':
    case 'physical':
      return <Zap size={14} className="text-orange-500" />;
    case '특수':
    case 'special':
      return <Star size={14} className="text-purple-500" />;
    case '변화':
    case 'status':
      return <Shield size={14} className="text-blue-500" />;
    default: 
      return null;
  }
};

export default function MovesList({ 
  moves = [],
  allMoves = [],
  onForgetMove,
  canEdit = true 
}) {
  
  const displayMoves = moves.map((m, idx) => {
    // 여러 방법으로 찾아보기
    const moveData1 = allMoves.find(move => move.id === m.moveId);
    const moveData2 = allMoves.find(move => String(move.id) === String(m.moveId));
    const moveData3 = allMoves.find(move => move.id === String(m.moveId));
    const moveData4 = allMoves.find(move => move.id === Number(m.moveId));
    
    const moveData = moveData1 || moveData2 || moveData3 || moveData4;
    
    if (!moveData) {
      console.error(`❌ moveId ${m.moveId}를 찾을 수 없습니다!`);
      return null;
    }
    
    // ✅ 영문 타입/카테고리를 한글로 변환
    const displayType = getTypeNameKr(moveData.type) || moveData.type;
    const displayCategory = CATEGORY_NAMES_KR[moveData.category] || moveData.category;
    
    return {
      ...moveData,
      type: displayType,
      category: displayCategory,
      currentPp: m.currentPp !== null ? m.currentPp : moveData.pp,
      learnedAt: m.learnedAt
    };
  }).filter(Boolean);

  
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
      {displayMoves.map((move, index) => {
        const typeColors = getTypeColor(move.type);
        
        return (
          <div
            key={`${move.id}-${index}`}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all w-full"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-gray-800 text-base">
                {move.name}
              </span>
              <span
                className="text-xs px-2 py-1 rounded font-bold inline-flex items-center justify-center min-w-[3rem]"
                style={{ 
                  backgroundColor: typeColors.bg,
                  color: typeColors.text
                }}
              >
                {move.type}
              </span>
              {canEdit && onForgetMove && (
                <button
                  onClick={() => {
                    if (window.confirm(`${move.name}을(를) 잊게 하시겠습니까?`)) {
                      onForgetMove(move.id);
                    }
                  }}
                  className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="기술 잊기"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs text-gray-600">
                {getCategoryIcon(move.category)}
                <span className="font-medium">{move.category}</span>
              </span>
              {move.power > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500">위력</span>
                  <span className="text-orange-600 font-bold">{move.power}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-xs">
                <span className="text-gray-500">명중</span>
                <span className="text-blue-600 font-bold">{move.accuracy}</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="text-gray-500">PP</span>
                <span className="text-green-600 font-bold">{move.pp || move.currentPp}</span>
              </span>
            </div>
            {move.description && (
              <div className="text-xs text-gray-600 w-full leading-relaxed">
                {move.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}