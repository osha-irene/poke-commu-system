import React, { useState } from 'react';
import { Package } from 'lucide-react';
import PartySlot from './pokemon/PartySlot';
import BoxPokemon from './pokemon/BoxPokemon';
import PokemonDetailPanel from './pokemon/PokemonDetailPanel';

export default function PokemonView({ 
  caughtPokemon, 
  items = [],
  onMoveToParty,
  onMoveToBox,
  onReleasePokemon,
  onUseRareCandy,
  onUpdateNickname
}) {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [draggedPokemon, setDraggedPokemon] = useState(null);
  
  const partySlots = caughtPokemon.slice(0, 6);
  while (partySlots.length < 6) partySlots.push(null);
  
  const box = caughtPokemon.slice(6).filter(p => p !== null);
  const rareCandy = items?.find(item => item.name === '이상한사탕');
  const hasRareCandy = rareCandy && rareCandy.count > 0;

  const handleDragStart = (e, pokemon, isInParty) => {
    setDraggedPokemon({ pokemon, isInParty });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToParty = (e) => {
    e.preventDefault();
    if (draggedPokemon && !draggedPokemon.isInParty) {
      onMoveToParty(draggedPokemon.pokemon.uniqueId);
      setDraggedPokemon(null);
    }
  };

  const handleDropToBox = (e) => {
    e.preventDefault();
    if (draggedPokemon && draggedPokemon.isInParty) {
      onMoveToBox(draggedPokemon.pokemon.uniqueId);
      setDraggedPokemon(null);
    }
  };

  const handlePokemonClick = (pokemon, isInParty) => {
    if (!pokemon) return;
    setSelectedPokemon({ ...pokemon, isInParty });
  };

  const handleUseCandy = () => {
    if (!hasRareCandy || !selectedPokemon) return;
    if (window.confirm(`${selectedPokemon.name}에게 이상한사탕을 사용하시겠습니까?`)) {
      onUseRareCandy(selectedPokemon.uniqueId);
      setSelectedPokemon(prev => ({ ...prev, level: prev.level + 1 }));
    }
  };

  const handleMove = () => {
    if (!selectedPokemon) return;
    selectedPokemon.isInParty 
      ? onMoveToBox(selectedPokemon.uniqueId) 
      : onMoveToParty(selectedPokemon.uniqueId);
    setSelectedPokemon(null);
  };

  const handleRelease = () => {
    if (!selectedPokemon) return;
    if (window.confirm(`정말 ${selectedPokemon.name}을(를) 방생하시겠습니까?\n되돌릴 수 없습니다!`)) {
      onReleasePokemon(selectedPokemon.uniqueId);
      setSelectedPokemon(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* 왼쪽: 포켓몬 리스트 */}
      <div className="space-y-6 overflow-y-auto">
        {/* 엔트리 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            메인 엔트리 ({partySlots.filter(p => p !== null).length}/6)
          </h3>
          
          <div className="space-y-2" onDragOver={handleDragOver} onDrop={handleDropToParty}>
            {partySlots.map((pokemon, index) => (
              <PartySlot
                key={pokemon?.uniqueId || `empty-${index}`}
                pokemon={pokemon}
                index={index}
                isSelected={selectedPokemon?.uniqueId === pokemon?.uniqueId}
                onDragStart={(e) => handleDragStart(e, pokemon, true)}
                onClick={() => handlePokemonClick(pokemon, true)}
              />
            ))}
          </div>
        </div>

        {/* 박스 토글 */}
        <button
          onClick={() => setShowBox(!showBox)}
          className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Package size={24} className="text-gray-600" />
            <span className="font-bold text-lg">보관함 ({box.length}마리)</span>
          </div>
          <span className="text-gray-500">{showBox ? '▲ 닫기' : '▼ 열기'}</span>
        </button>

        {/* 박스 */}
        {showBox && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {box.length > 0 ? (
              <div className="grid grid-cols-6 gap-3" onDragOver={handleDragOver} onDrop={handleDropToBox}>
                {box.map(pokemon => (
                  <BoxPokemon
                    key={pokemon.uniqueId}
                    pokemon={pokemon}
                    isSelected={selectedPokemon?.uniqueId === pokemon.uniqueId}
                    onDragStart={(e) => handleDragStart(e, pokemon, false)}
                    onClick={() => handlePokemonClick(pokemon, false)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">보관함이 비어있습니다</div>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 상세 정보 */}
      <div className="overflow-y-auto">
        {selectedPokemon ? (
          <PokemonDetailPanel
            pokemon={selectedPokemon}
            hasRareCandy={hasRareCandy}
            onClose={() => setSelectedPokemon(null)}
            onUseCandy={handleUseCandy}
            onMove={handleMove}
            onRelease={handleRelease}
            onUpdateNickname={(uniqueId, nickname) => {
              onUpdateNickname(uniqueId, nickname);
              setSelectedPokemon(prev => ({ ...prev, nickname }));
            }}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">👆</div>
              <p>포켓몬을 선택하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}