// src/components/views/pokemon/MoveSelectModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Search, Zap, Shield, Star } from 'lucide-react';
import { getTypeNameKr, getTypeColor, COLORS } from '../../../styles/theme';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../../utils/pokemonLearnsets';
import { getContestTypeColor, getContestEffectKo } from '../../../utils/contestMoveData';
import RibbonIcon from '../../icons/RibbonIcon';
import CrossedSwordsIcon from '../../icons/CrossedSwordsIcon';

const CATEGORY_NAMES_KR = {
  'physical': '물리',
  'special': '특수',
  'status': '변화'
};

const CONTEST_CATEGORY_ORDER = ['아름다움', '귀여움', '강인함', '근사함', '슬기로움'];

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

export default function MoveSelectModal({
  pokemon,
  allMoves = [],
  pokemonLearnsets = {},
  currentMoves = [],
  levelUpOnly = false,
  maxLevel,
  onSelect,
  onClose
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showLearnableOnly, setShowLearnableOnly] = useState(true);
  const [hoveredMove, setHoveredMove] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [moveViewMode, setMoveViewMode] = useState('battle');
  const [contestTypeFilter, setContestTypeFilter] = useState('all');

  const isContestMode = moveViewMode === 'contest';

  const learnedMoveIds = useMemo(() =>
    currentMoves.map(m => String(m.moveId ?? m.id)),
    [currentMoves]
  );

const learnableMovesIds = useMemo(() => {
  const learnset = getPokemonLearnset(pokemonLearnsets, pokemon);
  if (!learnset) return [];

  if (levelUpOnly) {
    // 레벨업 기술 중 maxLevel 이하만
    return [...new Set(
      (learnset.levelUpMoves || [])
        .filter(lm => maxLevel == null || lm.level <= maxLevel)
        .map(lm => lm.moveId)
    )];
  }

  // 모든 배울 수 있는 기술 통합
  const allLearnableMoves = [
    ...(learnset.levelUpMoves?.map(lm => lm.moveId) || []),
    ...getLearnsetTmMoves(learnset),
    ...(learnset.eggMoves || []),
    ...(learnset.tutorMoves || [])
  ];

  // 중복 제거
  return [...new Set(allLearnableMoves)];
}, [pokemon, pokemonLearnsets, levelUpOnly, maxLevel]);


  const filteredMoves = useMemo(() => {
    let moves = allMoves;

    if (levelUpOnly || showLearnableOnly) {
      moves = moves.filter(m => learnableMovesIds.includes(m.id));
    }

    if (isContestMode) {
      moves = moves.filter(m => !!m.contestEffect);
    }

    if (!isContestMode && filterType !== 'all') {
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
      category: CATEGORY_NAMES_KR[move.category] || move.category,
      contestType: move.contestType
    }));
  }, [allMoves, learnableMovesIds, showLearnableOnly, filterType, searchTerm, isContestMode]);

  const switchMoveViewMode = (mode) => {
    setMoveViewMode(mode);
    setSelectedMove(null);
    setHoveredMove(null);
    if (mode === 'contest') setFilterType('all');
    if (mode === 'battle') setContestTypeFilter('all');
  };

  const types = ['all', '노말', '불꽃', '물', '전기', '풀', '얼음', '격투', '독', '땅', '비행', '에스퍼', '벌레', '바위', '고스트', '드래곤', '악', '강철', '페어리'];

  const groupedContestMoves = useMemo(() => {
    const groups = new Map();
    filteredMoves.forEach((move) => {
      const key = move.contestType || '기타';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(move);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = CONTEST_CATEGORY_ORDER.indexOf(a);
      const bi = CONTEST_CATEGORY_ORDER.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      }
      return String(a).localeCompare(String(b), 'ko');
    });
  }, [filteredMoves]);

  const visibleContestMoves = useMemo(() => (
    contestTypeFilter === 'all'
      ? filteredMoves
      : filteredMoves.filter((move) => move.contestType === contestTypeFilter)
  ), [contestTypeFilter, filteredMoves]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] min-h-0 flex flex-col"
        onMouseLeave={() => { if (!selectedMove) setHoveredMove(null); }}
      >
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-green-950">기술 선택</h2>
              <p className="text-green-800 mt-1">
                {pokemon.nickname || pokemon.name}이(가) 배울 기술을 선택하세요
              </p>
            </div>
            <button onClick={onClose} className="text-green-950 hover:text-lime-700">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 grid grid-cols-[auto,1fr] items-center gap-x-2 gap-y-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => switchMoveViewMode('battle')}
              title="배틀 기술 보기"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                !isContestMode ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white grayscale opacity-50 hover:opacity-80'
              }`}
            >
              <CrossedSwordsIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => switchMoveViewMode('contest')}
              title="콘테스트 기술 보기"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                isContestMode ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-white grayscale opacity-50 hover:opacity-80'
              }`}
            >
              <RibbonIcon size={18} />
            </button>
          </div>
          {/* 검색 */}
          <div className="relative min-w-0">
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
          {!isContestMode && <div id="move-modal-type-filter" className="col-span-2 flex gap-2" style={{ overflowX: 'auto', paddingBottom: '6px' }}>
            {types.map(type => {
              const typeColors = type !== 'all' ? getTypeColor(type) : null;
              const isSelected = filterType === type;

              const selectedStyle = type === 'all'
                ? { backgroundColor: COLORS.brand.primary, color: '#fff' }
                : typeColors
                ? { backgroundColor: typeColors.bg, color: typeColors.text }
                : {};

              const unselectedStyle = type === 'all'
                ? { backgroundColor: 'rgba(134,188,87,0.15)', color: '#4a7a2a', border: '1.5px solid rgba(134,188,87,0.4)' }
                : typeColors
                ? { backgroundColor: typeColors.bg + '28', color: typeColors.bg, border: `1.5px solid ${typeColors.bg}55` }
                : {};

              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${isSelected ? 'scale-105 shadow-sm' : ''}`}
                  style={isSelected ? selectedStyle : unselectedStyle}
                >
                  {type === 'all' ? '전체' : type}
                </button>
              );
            })}
          </div>}

          {/* 배울 수 있는 기술만 */}
          {isContestMode && (
            <div className="col-span-2 flex gap-2" style={{ overflowX: 'auto', paddingBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setContestTypeFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  contestTypeFilter === 'all' ? 'bg-pink-500 text-white shadow-sm' : 'bg-pink-50 text-pink-700 border border-pink-200'
                }`}
              >
                전체 ({filteredMoves.length})
              </button>
              {groupedContestMoves.map(([contestType, moves]) => {
                const colors = getContestTypeColor(contestType);
                const isSelected = contestTypeFilter === contestType;
                return (
                  <button
                    key={contestType}
                    type="button"
                    onClick={() => setContestTypeFilter(contestType)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${isSelected ? 'scale-105 shadow-sm' : ''}`}
                    style={{
                      backgroundColor: isSelected ? colors.bg : `${colors.bg}66`,
                      color: colors.text,
                      border: `1.5px solid ${colors.bg}`
                    }}
                  >
                    {contestType} ({moves.length})
                  </button>
                );
              })}
            </div>
          )}

          {levelUpOnly ? (
            <p className="col-span-2 text-xs text-indigo-600 font-medium">
              현재 레벨({maxLevel}) 이하에서 배우는 레벨업 기술만 추가할 수 있습니다.
            </p>
          ) : (
            <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showLearnableOnly}
                onChange={(e) => setShowLearnableOnly(e.target.checked)}
                className="rounded cursor-pointer"
              />
              <span>이 포켓몬이 배울 수 있는 기술만 표시</span>
            </label>
          )}
        </div>

        {/* 기술 목록 */}
        <div id="move-modal-scroll-area" className="move-modal-scroll min-h-0 flex-1 p-4" style={{ overflowY: 'scroll' }}>
          {filteredMoves.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <p>조건에 맞는 기술이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(isContestMode ? visibleContestMoves : filteredMoves).map(move => {
                const isLearned = learnedMoveIds.includes(String(move.id));
                const typeColors = getTypeColor(move.type);
                const contestColors = getContestTypeColor(move.contestType);
                
                return (
                  <button
                    key={move.id}
                    onClick={() => { if (!isLearned) { setSelectedMove(move); setHoveredMove(null); } }}
                    disabled={isLearned}
                    className={`border-2 rounded-lg p-4 transition-all text-left ${isLearned ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={
                      isLearned
                        ? { background: '#fff', borderColor: '#e5e7eb' }
                        : selectedMove?.id === move.id
                        ? { background: '#e4eeec', borderColor: '#6a9e96' }
                        : hoveredMove?.id === move.id
                        ? { background: '#fff', borderColor: '#a8c5c0' }
                        : { background: '#fff', borderColor: '#e5e7eb' }
                    }
                    onMouseEnter={() => !isLearned && !selectedMove && setHoveredMove(move)}
                  >
                    {/* 기술 이름 & 타입 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800 text-base">
                        {move.name}
                      </span>
                      {isContestMode ? (
                        <span
                          className="text-xs px-2 py-1 rounded font-bold flex-shrink-0 inline-flex items-center justify-center min-w-[3rem]"
                          style={{
                            backgroundColor: contestColors.bg,
                            color: contestColors.text
                          }}
                        >
                          {move.contestType}
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-1 rounded font-bold flex-shrink-0 inline-flex items-center justify-center min-w-[3rem]"
                          style={{
                            backgroundColor: typeColors.bg,
                            color: typeColors.text
                          }}
                        >
                          {move.type}
                        </span>
                      )}
                      {isLearned && (
                        <span className="ml-auto text-xs text-gray-400 font-semibold">
                          ✓ 습득
                        </span>
                      )}
                    </div>

                    {/* 카테고리 & 스탯 */}
                    {isContestMode && (hasContestValue(move.contestAppeals) || hasContestValue(move.contestJam)) ? (
                      <div className="flex items-center gap-3 text-sm mb-2">
                        {hasContestValue(move.contestAppeals) && (
                          <span className="text-gray-700">
                            <span className="text-pink-500 font-bold">어필</span>{' '}
                            <span className="font-bold text-pink-500 tracking-wide">{repeatContestIcon(move.contestAppeals, '♥')}</span>
                          </span>
                        )}
                        {hasContestValue(move.contestJam) && (
                          <span className="text-gray-700">
                            <span className="text-indigo-400 font-bold">방해</span>{' '}
                            <span className="font-bold text-indigo-400 tracking-wide">{repeatContestIcon(move.contestJam, '♡')}</span>
                          </span>
                        )}
                      </div>
                    ) : !isContestMode && (
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
                    )}

                    {/* 설명 */}
                    {isContestMode ? (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {getContestEffectKo(move.contestEffect) || '효과 정보 없음'}
                      </p>
                    ) : move.description && (
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

        {/* 푸터 - 항상 영역 확보 */}
        {(() => {
          const displayMove = selectedMove || hoveredMove;
          const isEmpty = !displayMove || learnedMoveIds.includes(String(displayMove.id));
          return (
            <div className="p-4 bg-indigo-50 border-t border-indigo-200 flex-shrink-0" style={{ minHeight: '72px' }}>
              {!isEmpty && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{selectedMove ? '선택된 기술' : '미리보기'}</p>
                    <p className="font-bold text-indigo-900">{displayMove.name}</p>
                  </div>
                  {selectedMove && (
                    <button
                      onClick={() => onSelect(selectedMove)}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      선택
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
