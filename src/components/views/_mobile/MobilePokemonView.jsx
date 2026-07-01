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

const S = {
  card:    'rgba(255,255,255,0.90)',
  border:  'rgba(0,0,0,0.08)',
  text:    '#1a2e10',
  muted:   '#5a7a40',
  accent:  '#4a9a08',
  accentBg:'rgba(74,154,8,0.15)',
  section: { padding: '0 14px', marginBottom: 10 },
};

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
    pokemonLearnsets = {},
    systemSettings = {},
  } = useGame();

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
    if (getRequiredExpForLevel(pokemon.level) === null) { alert('현재 레벨에서는 경험치 배분으로 더 이상 레벨업할 수 없습니다.'); return; }
    if (requestedExp <= 0) { alert('배분할 경험치를 입력해주세요.'); return; }
    if (requestedExp > availableExp) { alert(`경험치가 부족합니다!\n입력 경험치: ${requestedExp}\n보유 경험치: ${availableExp}`); return; }
    if (window.confirm(`${pokemon.nickname || pokemon.name}에게 경험치 ${requestedExp}을(를) 배분하시겠습니까?\n보유 경험치: ${availableExp}`)) {
      onUseRareCandy(uniqueId, onLevelUpCallback, requestedExp);
    }
  };

  const handleMove = () => {
    if (!selectedPokemon) return;
    if (isSelectedInParty) movePokemonToBox(selectedPokemon.uniqueId);
    else movePokemonToParty(selectedPokemon.uniqueId);
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
    <div style={{ paddingTop: 14, paddingBottom: 88, minHeight: '100%' }}>

      {/* 파트너 */}
      <div style={S.section}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8, background: '#c0507a', borderRadius: 6, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>♥ 파트너</span>
        </div>
        <div style={{ background: 'rgba(255,240,246,0.92)', border: '1.5px solid rgba(210,120,160,0.3)', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <PartnerSlot
            pokemon={partnerPokemon}
            isSelected={partnerPokemon && selectedPokemonId === partnerPokemon.uniqueId}
            onClick={() => partnerPokemon && handlePokemonClick(partnerPokemon)}
            gamePokedex={gamePokedex}
            allPokemonMaster={allPokemonMaster}
            allItems={allItems}
            mobile
          />
        </div>
      </div>

      {/* 엔트리 */}
      <div style={S.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#4a9a08', borderRadius: 6, padding: '4px 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>엔트리</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: S.accent, background: S.accentBg, borderRadius: 20, padding: '2px 10px' }}>{partyCount}/6</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {partySlots.map((pokemon, index) => (
            <div key={`party-${index}`} style={{ background: selectedPokemonId === pokemon?.uniqueId ? 'rgba(205,235,170,0.92)' : pokemon ? 'rgba(255,255,255,0.90)' : S.card, border: `1.5px solid ${selectedPokemonId === pokemon?.uniqueId ? 'rgba(80,150,20,0.7)' : pokemon ? 'rgba(120,180,60,0.18)' : S.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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

      {/* 박스 버튼 */}
      <button
        onClick={() => setShowBox(true)}
        style={{
          position: 'fixed', right: 16, bottom: 80, zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px', borderRadius: 30,
          background: S.accent, color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(74,154,8,0.35)',
        }}
      >
        <Package size={20} />
        <span>{box.length}</span>
      </button>

      {/* 박스 모달 */}
      {showBox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'rgba(255,255,255,0.97)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${S.border}` }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: S.text }}>보관함 ({box.length}마리)</span>
            <button onClick={() => setShowBox(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 4 }}>
              <X size={22} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(245,250,238,0.97)', padding: 14, scrollbarWidth: 'none' }}>
            {box.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {box.map(pokemon => (
                  <div key={pokemon.uniqueId} onClick={() => { setShowBox(false); handlePokemonClick(pokemon); }}
                    style={{ background: S.card, border: `1.5px solid ${selectedPokemonId === pokemon.uniqueId ? 'rgba(80,150,20,0.7)' : S.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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
              <div style={{ textAlign: 'center', padding: '48px 0', color: S.muted, fontSize: 14 }}>보관함이 비어있습니다</div>
            )}
          </div>
        </div>
      )}

      {/* 디테일 모달 */}
      {showDetail && selectedPokemon && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(245,250,238,0.98)', zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.97)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: S.text }}>{selectedPokemon.nickname || selectedPokemon.name}</span>
            <button onClick={handleCloseDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 4 }}>
              <X size={22} />
            </button>
          </div>
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
              systemSettings={systemSettings}
              mobile
            />
          </div>
        </div>
      )}
    </div>
  );
}
