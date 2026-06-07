// src/components/views/pokemon/detail-tabs/MovesTab.jsx
// 기술 탭

import React, { useState } from 'react';
import { Swords, Plus, BookOpen } from 'lucide-react';
import MovesList from '../MovesList';
import MoveSelectModal from '../MoveSelectModal';

export default function MovesTab({
  pokemon,
  allMoves,
  pokemonLearnsets,
  isAdmin,
  onForgetMove,
  onLearnMove
}) {
  const [showMoveSelectModal, setShowMoveSelectModal] = useState(false);
  
  return (
    <div className="space-y-4">
      {/* 기술 목록 */}
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-700">
              배운 기술 ({pokemon.moves?.length || 0}/4)
            </h3>
          </div>
          {isAdmin && (!pokemon.moves || pokemon.moves.length < 4) && (
            <button
              onClick={() => setShowMoveSelectModal(true)}
              className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 font-semibold transition-colors"
            >
              <Plus size={12} />
              기술 추가
            </button>
          )}
        </div>
        
        {pokemon.moves && pokemon.moves.length > 0 ? (
          <MovesList
            moves={pokemon.moves}
            onForgetMove={onForgetMove ? (moveId) => onForgetMove(pokemon.uniqueId, moveId) : undefined}
            canEdit={!!onForgetMove}
            allMoves={allMoves}
          />
        ) : (
          <div className="text-center py-6 text-gray-400">
            <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">배운 기술이 없습니다</p>
          </div>
        )}
      </div>
      
      {/* 기술 정보 */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            <span>물리 기술</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span>특수 기술</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
            <span>변화 기술</span>
          </div>
        </div>
      </div>
      
      {/* 모달 */}
      {showMoveSelectModal && allMoves && (
        <MoveSelectModal
          pokemon={pokemon}
          allMoves={allMoves}
          pokemonLearnsets={pokemonLearnsets}
          currentMoves={pokemon.moves || []} 
          onSelect={(move) => {
            if (onLearnMove) {
              onLearnMove(pokemon.uniqueId, move);
            }
            setShowMoveSelectModal(false);
          }}
          onClose={() => setShowMoveSelectModal(false)}
        />
      )}
    </div>
  );
}
