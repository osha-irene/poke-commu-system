// src/components/views/pokemon/MoveSelectModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Search, Zap, Shield, Star } from 'lucide-react';

const TYPE_COLORS = {
  '노말': '#A8A878', '불꽃': '#F08030', '물': '#6890F0', '전기': '#F8D030',
  '풀': '#78C850', '얼음': '#98D8D8', '격투': '#C03028', '독': '#A040A0',
  '땅': '#E0C068', '비행': '#A890F0', '에스퍼': '#F85888', '벌레': '#A8B820',
  '바위': '#B8A038', '고스트': '#705898', '드래곤': '#7038F8', '악': '#705848',
  '강철': '#B8B8D0', '페어리': '#EE99AC'
};

const getCategoryIcon = (category) => {
  switch (category) {
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
  currentMoves = [],  // 현재 배운 기술들
  onSelect, 
  onClose 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showLearnableOnly, setShowLearnableOnly] = useState(true);
  const [selectedMove, setSelectedMove] = useState(null);

  // ⭐ 현재 배운 기술의 ID 목록
  const learnedMoveIds = useMemo(() => 
    currentMoves.map(m => m.moveId),
    [currentMoves]
  );

  // 이 포켓몬이 배울 수 있는 기술 ID 목록
  const learnableMovesIds = useMemo(() => {
    const learnset = pokemonLearnsets[pokemon.number.toString()];
    if (!learnset) return [];
    return learnset.levelUpMoves.map(lm => lm.moveId);
  }, [pokemon.number, pokemonLearnsets]);

  // 필터링된 기술 목록
  const filteredMoves = useMemo(() => {
    let moves = allMoves;

    // 배울 수 있는 기술만
    if (showLearnableOnly) {
      moves = moves.filter(m => learnableMovesIds.includes(m.id));
    }

    // 타입 필터
    if (filterType !== 'all') {
      moves = moves.filter(m => m.type === filterType);
    }

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      moves = moves.filter(m => 
        m.name.toLowerCase().includes(term) ||
        m.nameEn.toLowerCase().includes(term)
      );
    }

    return moves;
  }, [allMoves, learnableMovesIds, showLearnableOnly, filterType, searchTerm]);

  // 타입 목록
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
          <div className="flex gap-2 overflow-x-auto pb-2">
            {types.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === type
                    ? 'text-white scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={
                  filterType === type && type !== 'all'
                    ? { backgroundColor: TYPE_COLORS[type] }
                    : {}
                }
              >
                {type === 'all' ? '전체' : type}
              </button>
            ))}
          </div>

          {/* 배울 수 있는 기술만 */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showLearnableOnly}
              onChange={(e) => setShowLearnableOnly(e.target.checked)}
              className="rounded"
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
                const isLearned = learnedMoveIds.includes(move.id);  // ⭐ 이미 배운 기술인지
                
                return (
                  <button
                    key={move.id}
                    onClick={() => !isLearned && onSelect(move)}
                    disabled={isLearned}
                    className={`bg-white border border-gray-200 rounded-lg p-3 transition-all text-left ${
                      isLearned 
                        ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                        : 'hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-bold text-gray-800">{move.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold text-white"
                          style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                        >
                          {move.type}
                        </span>
                        {isLearned && (
                          <span className="text-red-600 text-xs font-bold">✓ 습득됨</span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        {getCategoryIcon(move.category)}
                        {move.category}
                      </span>
                    </div>

                    <div className="flex gap-3 text-xs text-gray-600 mb-2">
                      {move.power > 0 && (
                        <span>위력: <span className="font-bold text-orange-600">{move.power}</span></span>
                      )}
                      <span>명중: <span className="font-bold text-blue-600">{move.accuracy}</span></span>
                      <span>PP: <span className="font-bold text-green-600">{move.pp}</span></span>
                    </div>

                    {move.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {move.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            총 {filteredMoves.length}개의 기술
          </p>
        </div>
      </div>
    </div>
  );
}