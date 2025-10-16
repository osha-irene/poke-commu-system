// src/components/views/pokemon/MoveSelectModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Search, Zap, Shield, Star } from 'lucide-react';
import { getTypeNameKr, getTypeColor, COLORS } from '../../../styles/theme';

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

export default function MoveSelectModal({ 
  pokemon, 
  allMoves = [], 
  pokemonLearnsets = {},
  currentMoves = [],
  onSelect, 
  onClose 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showLearnableOnly, setShowLearnableOnly] = useState(true);
  const [selectedMove, setSelectedMove] = useState(null);

  const learnedMoveIds = useMemo(() => 
    currentMoves.map(m => m.moveId),
    [currentMoves]
  );

  const learnableMovesIds = useMemo(() => {
    const learnset = pokemonLearnsets[pokemon.number.toString()];
    if (!learnset) return [];
    return learnset.levelUpMoves.map(lm => lm.moveId);
  }, [pokemon.number, pokemonLearnsets]);

  const filteredMoves = useMemo(() => {
    let moves = allMoves;

    if (showLearnableOnly) {
      moves = moves.filter(m => learnableMovesIds.includes(m.id));
    }

    if (filterType !== 'all') {
      moves = moves.filter(m => {
        const typeKr = getTypeNameKr(m.type) || m.type;
        return typeKr === filterType || m.type === filterType;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      moves = moves.filter(m => 
        m.name?.toLowerCase().includes(term) ||
        m.nameEn?.toLowerCase().includes(term)
      );
    }

    return moves.map(move => ({
      ...move,
      type: getTypeNameKr(move.type) || move.type,
      category: CATEGORY_NAMES_KR[move.category] || move.category
    }));
  }, [allMoves, learnableMovesIds, showLearnableOnly, filterType, searchTerm]);

  const types = ['all', '노말', '불꽃', '물', '전기', '풀', '얼음', '격투', '독', '땅', '비행', '에스퍼', '벌레', '바위', '고스트', '드래곤', '악', '강철', '페어리'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">기술 선택</h2>
              <p className="text-indigo-100 mt-1">
                {pokemon.nickname || pokemon.name}이(가) 배울 기술을 선택하세요
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="기술 이름 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* 타입 필터 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {types.map(type => {
              const typeColors = type !== 'all' ? getTypeColor(type) : null;
              const isSelected = filterType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isSelected
                      ? 'text-white scale-105 shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={
                    isSelected && type !== 'all' && typeColors
                      ? { backgroundColor: typeColors.bg, color: typeColors.text }
                      : isSelected && type === 'all'
                      ? { backgroundColor: COLORS.brand.primary }
                      : {}
                  }
                >
                  {type === 'all' ? '전체' : type}
                </button>
              );
            })}
          </div>

          {/* 배울 수 있는 기술만 */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showLearnableOnly}
              onChange={(e) => setShowLearnableOnly(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span>이 포켓몬이 배울 수 있는 기술만 표시</span>
          </label>
        </div>

        {/* 기술 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMoves.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <p>조건에 맞는 기술이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMoves.map(move => {
                const isLearned = learnedMoveIds.includes(move.id);
                const typeColors = getTypeColor(move.type);
                
                return (
                  <button
                    key={move.id}
                    onClick={() => !isLearned && onSelect(move)}
                    disabled={isLearned}
                    className={`bg-white border-2 rounded-lg p-4 transition-all text-left ${
                      isLearned 
                        ? 'border-gray-200 opacity-50 cursor-not-allowed' 
                        : selectedMove?.id === move.id
                        ? 'border-indigo-400 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                    }`}
                    onMouseEnter={() => !isLearned && setSelectedMove(move)}
                    onMouseLeave={() => setSelectedMove(null)}
                  >
                    {/* 기술 이름 & 타입 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800 text-base">
                        {move.name}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded font-bold flex-shrink-0 inline-flex items-center justify-center min-w-[3rem]"
                        style={{ 
                          backgroundColor: typeColors.bg,
                          color: typeColors.text
                        }}
                      >
                        {move.type}
                      </span>
                      {isLearned && (
                        <span className="ml-auto text-xs text-gray-400 font-semibold">
                          ✓ 습득
                        </span>
                      )}
                    </div>

                    {/* 카테고리 & 스탯 */}
                    <div className="flex items-center gap-3 text-sm mb-2">
                      <span className="flex items-center gap-1 text-gray-600">
                        {getCategoryIcon(move.category)}
                        <span className="font-medium">{move.category}</span>
                      </span>
                      {move.power > 0 && (
                        <span className="text-gray-700">
                          <span className="text-gray-500">위력</span>{' '}
                          <span className="font-bold text-orange-600">{move.power}</span>
                        </span>
                      )}
                      <span className="text-gray-700">
                        <span className="text-gray-500">명중</span>{' '}
                        <span className="font-bold text-blue-600">{move.accuracy}</span>
                      </span>
                      <span className="text-gray-700">
                        <span className="text-gray-500">PP</span>{' '}
                        <span className="font-bold text-green-600">{move.pp}</span>
                      </span>
                    </div>

                    {/* 설명 */}
                    {move.description && (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {move.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {selectedMove && !learnedMoveIds.includes(selectedMove.id) && (
          <div className="p-4 bg-indigo-50 border-t border-indigo-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">선택된 기술</p>
                <p className="font-bold text-indigo-900">{selectedMove.name}</p>
              </div>
              <button
                onClick={() => onSelect(selectedMove)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                선택
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}