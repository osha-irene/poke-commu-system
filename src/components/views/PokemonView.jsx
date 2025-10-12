import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import PartySlot from './pokemon/PartySlot';
import BoxPokemon from './pokemon/BoxPokemon';
import PokemonDetailPanel from './pokemon/PokemonDetailPanel';

export default function PokemonView({ 
  caughtPokemon = [],
  items = [],
  allItems = [],
  gamePokedex = [],
  allPokemonMaster = [],
  onMoveToParty,
  onMoveToBox,
  onReleasePokemon,
  onUseRareCandy,
  onUpdateNickname,
  onGiveItem,      // ⭐ 추가
  onTakeItem,
  onSetPartner,
  onForgetMove,    // ⭐ 추가
  onLearnMove,     // ⭐ 추가
  isAdmin = false,
  allMoves = [],
  pokemonLearnsets = {}
}) {
  const [selectedPokemonId, setSelectedPokemonId] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [draggedPokemon, setDraggedPokemon] = useState(null);
  
  const partySlots = caughtPokemon.slice(0, 6);
  while (partySlots.length < 6) partySlots.push(null);
  
  const box = caughtPokemon.slice(6).filter(p => p !== null);
  
  // 이상한사탕 찾기
  const rareCandy = items?.find(item => 
    item.name === '이상한사탕' || 
    item.nameEn?.toLowerCase().includes('rare candy')
  );
  const hasRareCandy = rareCandy && rareCandy.count > 0;
  const rareCandyImage = rareCandy?.imageUrl;

  // 선택된 포켓몬 찾기 (항상 최신 데이터)
  const selectedPokemon = selectedPokemonId 
    ? caughtPokemon.find(p => p && p.uniqueId === selectedPokemonId)
    : null;

  // 선택된 포켓몬의 인덱스
  const selectedPokemonIndex = selectedPokemon 
    ? caughtPokemon.findIndex(p => p && p.uniqueId === selectedPokemon.uniqueId)
    : -1;
  const isSelectedInParty = selectedPokemonIndex >= 0 && selectedPokemonIndex < 6;

  // 포켓몬이 삭제되면 선택 해제
  useEffect(() => {
    if (selectedPokemonId && !selectedPokemon) {
      setSelectedPokemonId(null);
    }
  }, [selectedPokemonId, selectedPokemon]);

  const handleDragStart = (e, pokemon, isInParty, slotIndex) => {
    setDraggedPokemon({ pokemon, isInParty, slotIndex });
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

  const handlePokemonClick = (pokemon) => {
    if (!pokemon) return;
    setSelectedPokemonId(pokemon.uniqueId);
  };

  const handleUseCandy = (uniqueId, onLevelUpCallback) => {
  if (!hasRareCandy) return;
  
  const pokemon = caughtPokemon.find(p => p && p.uniqueId === uniqueId);
  if (!pokemon) return;
  
  if (window.confirm(`${pokemon.nickname || pokemon.name}에게 이상한사탕을 사용하시겠습니까?`)) {
    console.log('🎯 PokemonView: onUseRareCandy 호출');
    console.log('🎯 uniqueId:', uniqueId);
    console.log('🎯 콜백:', onLevelUpCallback);
    
    onUseRareCandy(uniqueId, onLevelUpCallback);  // ⭐ 콜백 전달!
  }
};

  const handleMove = () => {
    if (!selectedPokemon) return;
    if (isSelectedInParty) {
      onMoveToBox(selectedPokemon.uniqueId);
    } else {
      onMoveToParty(selectedPokemon.uniqueId);
    }
  };

  const handleRelease = () => {
    if (!selectedPokemon) return;
    if (window.confirm(`정말 ${selectedPokemon.nickname || selectedPokemon.name}을(를) 방생하시겠습니까?\n되돌릴 수 없습니다!`)) {
      onReleasePokemon(selectedPokemon.uniqueId);
      setSelectedPokemonId(null);
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
                isSelected={selectedPokemonId === pokemon?.uniqueId}
                onDragStart={(e) => handleDragStart(e, pokemon, true, index)}
                onClick={() => handlePokemonClick(pokemon)}
                gamePokedex={gamePokedex}
                allPokemonMaster={allPokemonMaster}
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
                    isSelected={selectedPokemonId === pokemon.uniqueId}
                    onDragStart={(e) => handleDragStart(e, pokemon, false)}
                    onClick={() => handlePokemonClick(pokemon)}
                    gamePokedex={gamePokedex}
                    allPokemonMaster={allPokemonMaster}
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
            rareCandyImage={rareCandyImage}
            isInParty={isSelectedInParty}
            allItems={allItems}
            gamePokedex={gamePokedex}
            items={items}
            onClose={() => setSelectedPokemonId(null)}
            onUseCandy={handleUseCandy}
            onMove={handleMove}
            onRelease={handleRelease}
            onUpdateNickname={onUpdateNickname}
            onGiveItem={onGiveItem}
            onTakeItem={onTakeItem}
            onSetPartner={onSetPartner}
            onForgetMove={onForgetMove}
            isAdmin={isAdmin}
            onLearnMove={onLearnMove}    
            allMoves={allMoves} 
            pokemonLearnsets={pokemonLearnsets}
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