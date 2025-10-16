import React, { useState } from 'react';
import { Package, X } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext'; 
import PartySlot from '../pokemon/PartySlot'; 
import BoxPokemon from '../pokemon/BoxPokemon'; 
import PokemonDetailPanel from '../pokemon/PokemonDetailPanel';

export default function MobilePokemonView() {
  const {
    caughtPokemon = [],
    items = [],
    allItems = [],
    gamePokedex = [],
    allPokemonMaster = [],
    movePokemonToParty,
    movePokemonToBox,
    releasePokemon,
    useRareCandy: onUseRareCandy,
    updatePokemonNickname,
    giveItemToPokemon,
    takeItemFromPokemon,
    setPartnerPokemon,
    forgetMove,
    learnMove,
    currentUser,
    allMoves = [],
    pokemonLearnsets = {},
    useItemOnPokemon
  } = useGame();

  const isAdmin = currentUser?.isAdmin || false;

  const [selectedPokemonId, setSelectedPokemonId] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const partySlots = caughtPokemon.slice(0, 6);
  while (partySlots.length < 6) partySlots.push(null);
  
  const box = caughtPokemon.slice(6).filter(p => p !== null);
  
  const rareCandy = items?.find(item => 
    item.name === '이상한사탕' || 
    item.nameEn?.toLowerCase().includes('rare candy')
  );
  const hasRareCandy = rareCandy && rareCandy.count > 0;
  const rareCandyImage = rareCandy?.imageUrl;

  const selectedPokemon = selectedPokemonId 
    ? caughtPokemon.find(p => p && p.uniqueId === selectedPokemonId)
    : null;

  const selectedPokemonIndex = selectedPokemon 
    ? caughtPokemon.findIndex(p => p && p.uniqueId === selectedPokemon.uniqueId)
    : -1;
  const isSelectedInParty = selectedPokemonIndex >= 0 && selectedPokemonIndex < 6;

  const handlePokemonClick = (pokemon) => {
    if (!pokemon) return;
    setSelectedPokemonId(pokemon.uniqueId);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedPokemonId(null);
  };

  const handleUseCandy = (uniqueId, onLevelUpCallback) => {
    if (!hasRareCandy) return;
    
    const pokemon = caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    if (window.confirm(`${pokemon.nickname || pokemon.name}에게 이상한사탕을 사용하시겠습니까?`)) {
      onUseRareCandy(uniqueId, onLevelUpCallback);
    }
  };

  const handleMove = () => {
    if (!selectedPokemon) return;
    
    if (isSelectedInParty) {
      movePokemonToBox(selectedPokemon.uniqueId);
    } else {
      movePokemonToParty(selectedPokemon.uniqueId);
    }
    handleCloseDetail();
  };

  const handleRelease = () => {
    if (!selectedPokemon) return;
    if (window.confirm(`정말 ${selectedPokemon.nickname || selectedPokemon.name}을(를) 방생하시겠습니까?\n되돌릴 수 없습니다!`)) {
      releasePokemon(selectedPokemon.uniqueId);
      handleCloseDetail();
    }
  };

  return (
    <div className="relative pb-4">
      {/* 파티 슬롯 */}
      <div className="px-4 py-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          파티 ({partySlots.filter(p => p !== null).length}/6)
        </h3>
        
        <div className="grid grid-cols-1 gap-3">  {/* ⭐ grid-cols-2 → grid-cols-1 */}
		  {partySlots.map((pokemon, index) => (
			<div key={`party-${index}`}>
			  <PartySlot
				pokemon={pokemon}
				index={index}
				isSelected={selectedPokemonId === pokemon?.uniqueId}
				onClick={() => handlePokemonClick(pokemon)}
				gamePokedex={gamePokedex}
				allPokemonMaster={allPokemonMaster}
				allItems={allItems}
			  />
			</div>
		  ))}
		</div>
      </div>

      {/* 플로팅 박스 버튼 */}
      <button
        onClick={() => setShowBox(true)}
        className="fixed right-4 bottom-20 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all z-30 flex items-center gap-2"
      >
        <Package size={24} />
        <span className="font-bold">{box.length}</span>
      </button>

      {/* 박스 모달 */}
      {showBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex flex-col">
          {/* 헤더 */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">
              보관함 ({box.length}마리)
            </h3>
            <button
              onClick={() => setShowBox(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* 박스 내용 */}
          <div className="flex-1 overflow-y-auto bg-white p-4">
            {box.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {box.map(pokemon => (
                  <div key={pokemon.uniqueId} onClick={() => {
                    setShowBox(false);
                    handlePokemonClick(pokemon);
                  }}>
                    <BoxPokemon
                      pokemon={pokemon}
                      isSelected={selectedPokemonId === pokemon.uniqueId}
                      gamePokedex={gamePokedex}
                      allPokemonMaster={allPokemonMaster}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">📦</div>
                <p>보관함이 비어있습니다</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 디테일 모달 */}
      {showDetail && selectedPokemon && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {selectedPokemon.nickname || selectedPokemon.name}
            </h3>
            <button
              onClick={handleCloseDetail}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 디테일 패널 */}
          <div className="flex-1 overflow-y-auto">
            <PokemonDetailPanel
              pokemon={selectedPokemon}
              hasRareCandy={hasRareCandy}
              rareCandyImage={rareCandyImage}
              isInParty={isSelectedInParty}
              allItems={allItems}
              gamePokedex={gamePokedex}
              items={items}
              onClose={handleCloseDetail}
              onUseCandy={handleUseCandy}
              onMove={handleMove}
              onRelease={handleRelease}
              onUpdateNickname={updatePokemonNickname}
              onGiveItem={giveItemToPokemon}
              onTakeItem={takeItemFromPokemon}
              onSetPartner={setPartnerPokemon}
              onForgetMove={forgetMove}
              isAdmin={isAdmin}
              onLearnMove={learnMove}
              allMoves={allMoves}
              pokemonLearnsets={pokemonLearnsets}
            />
          </div>
        </div>
      )}
    </div>
  );
}