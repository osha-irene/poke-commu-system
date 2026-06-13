import React, { useState } from 'react';
import { Package, X } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import PartySlot, { PartnerSlot } from '../pokemon/PartySlot';
import BoxPokemon from '../pokemon/BoxPokemon';
import PokemonDetailPanel from '../pokemon/PokemonDetailPanel';
import { getRequiredExpForLevel } from '../../../utils/experience';

const isEmptyPokemonSlot = (pokemon) => (
  pokemon === null || pokemon === undefined || pokemon === 'null'
);

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
    getPokemonFormCandidates,
    changePokemonForm,
    giveItemToPokemon,
    takeItemFromPokemon,
    setPartnerPokemon,
    forgetMove,
    learnMove,
    currentUser,
    allMoves = [],
    pokemonLearnsets = {},  } = useGame();

  const isAdmin = currentUser?.isAdmin || false;

  const [selectedPokemonId, setSelectedPokemonId] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const partnerPokemon = currentUser?.partnerPokemon || null;

  const partySlots = caughtPokemon.slice(0, 6).map(pokemon => (
    isEmptyPokemonSlot(pokemon) ? null : pokemon
  ));
  while (partySlots.length < 6) partySlots.push(null);
  
  const partyCount = partySlots.filter(pokemon => !isEmptyPokemonSlot(pokemon)).length;
  const box = caughtPokemon.slice(6).filter(pokemon => !isEmptyPokemonSlot(pokemon));
  
  const rareCandy = items?.find(item => 
    item.name === '이상한사탕' || 
    item.nameEn?.toLowerCase().includes('rare candy')
  );
  const rareCandyImage = rareCandy?.imageUrl;

  const selectedPokemon = selectedPokemonId
    ? (caughtPokemon.find(p => p && p.uniqueId === selectedPokemonId) ||
       (partnerPokemon?.uniqueId === selectedPokemonId ? partnerPokemon : null))
    : null;
  const trainerExp = Number(currentUser?.trainerExp) || 0;
  const selectedRequiredExp = selectedPokemon ? getRequiredExpForLevel(selectedPokemon.level) : null;
  const hasRareCandy = selectedRequiredExp !== null && trainerExp >= selectedRequiredExp;

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

  const handleUseCandy = (uniqueId, onLevelUpCallback, expAmount = 0) => {
    const pokemon = caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;

    const requestedExp = Math.floor(Number(expAmount) || 0);
    const availableExp = Number(currentUser?.trainerExp) || 0;

    if (getRequiredExpForLevel(pokemon.level) === null) {
      alert('현재 레벨에서는 경험치 배분으로 더 이상 레벨업할 수 없습니다.');
      return;
    }

    if (requestedExp <= 0) {
      alert('배분할 경험치를 입력해주세요.');
      return;
    }

    if (requestedExp > availableExp) {
      alert(`경험치가 부족합니다!\n입력 경험치: ${requestedExp}\n보유 경험치: ${availableExp}`);
      return;
    }

    if (window.confirm(`${pokemon.nickname || pokemon.name}에게 경험치 ${requestedExp}을(를) 배분하시겠습니까?\n보유 경험치: ${availableExp}`)) {
      onUseRareCandy(uniqueId, onLevelUpCallback, requestedExp);
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
      {/* 파트너 포켓몬 */}
      <div className="px-4 pb-2" style={{ paddingTop: 64 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(170,210,125,0.8)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          파트너
        </h3>
        <div style={{
          background: 'rgba(255,245,248,1)',
          border: '1px solid rgba(240,140,160,0.5)',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <PartnerSlot
            pokemon={partnerPokemon}
            onClick={() => partnerPokemon && handlePokemonClick(partnerPokemon)}
            gamePokedex={gamePokedex}
            allPokemonMaster={allPokemonMaster}
            allItems={allItems}
            mobile
          />
        </div>
      </div>

      {/* 파티 슬롯 */}
      <div className="px-4 py-4">
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(170,210,125,0.8)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          파티 ({partyCount}/6)
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
          <div className="border-b-2 border-lime-300 bg-white/95 text-green-950 px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {selectedPokemon.nickname || selectedPokemon.name}
            </h3>
            <button
              onClick={handleCloseDetail}
              className="p-2 hover:bg-lime-100/70 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 디테일 패널 */}
          <div className="flex-1 overflow-y-auto mobile-detail-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
              allPokemonMaster={allPokemonMaster}
              getPokemonFormCandidates={getPokemonFormCandidates}
              onChangeForm={changePokemonForm}
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
