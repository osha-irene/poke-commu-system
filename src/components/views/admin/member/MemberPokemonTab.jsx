import React, { useState, useMemo } from 'react';
import MoveSelectModal from '../../pokemon/MoveSelectModal';
import ItemSelectorModal from '../../../modals/ItemSelectorModal';
import MemberPokemonViewMode from './MemberPokemonViewMode';
import MemberPokemonEditMode from './MemberPokemonEditMode';
import MemberPokemonGiveMode from './MemberPokemonGiveMode';

function MemberPokemonTab({ 
  member, 
  trainer,
  allPokemonMaster = [], 
  allMoves = [], 
  allItems = [],
  pokemonLearnsets = {},
  onGivePokemon,
  onEditPokemon,
  onDeletePokemon
}) {
  const [mode, setMode] = useState('view');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showGiveMoveModal, setShowGiveMoveModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showGiveItemModal, setShowGiveItemModal] = useState(false);
  
  const [editData, setEditData] = useState({
    level: 5,
    nickname: '',
    spriteUrl: '',
    ballImage: '',
    isShiny: false,
    heldItem: null,
    moves: [],
    ivs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
  });

  const [giveData, setGiveData] = useState({
    searchQuery: '',
    selectedPokemon: null,
    level: 5,
    nickname: '',
    caughtWithBall: '몬스터볼',
    isShiny: false,
    heldItem: null,
    selectedMoves: [],
    randomMoves: false,
    ivs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
  });

  // 지급용 기술 목록
  const giveAvailableMoves = useMemo(() => {
    if (!giveData.selectedPokemon) return [];
    const learnset = pokemonLearnsets[giveData.selectedPokemon.number?.toString()];
    if (!learnset) return [];
    
    const levelMoves = learnset.levelUpMoves
      ?.filter(entry => entry.level <= giveData.level)
      .map(entry => allMoves.find(m => m.id === entry.moveId))
      .filter(Boolean) || [];
    
    const machineMoves = learnset.machineMoves
      ?.map(moveId => allMoves.find(m => m.id === moveId))
      .filter(Boolean) || [];
    
    return [...new Map([...levelMoves, ...machineMoves].map(m => [m.id, m])).values()];
  }, [giveData.selectedPokemon, giveData.level, pokemonLearnsets, allMoves]);

  const getRandomMoves = () => {
    if (giveAvailableMoves.length === 0) return [];
    const shuffled = [...giveAvailableMoves].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(4, shuffled.length));
  };

  const handleStartEdit = (pokemon) => {
    setShowMoveModal(false);
    setShowEditItemModal(false);
    
    setSelectedPokemon(pokemon);
    setEditData({
      level: pokemon.level || 5,
      nickname: pokemon.nickname || pokemon.name,
      spriteUrl: pokemon.spriteUrl || pokemon.sprite,
      ballImage: pokemon.ballImageUrl || '',
      isShiny: pokemon.isShiny || false,
      heldItem: pokemon.heldItem || null,
      moves: pokemon.moves || [],
      ivs: pokemon.ivs || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      effort: pokemon.effort || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      condition: pokemon.condition || { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
    });
    setMode('edit');
  };

  const handleSaveEdit = () => {
    if (!selectedPokemon) return;

    let finalSpriteUrl = editData.spriteUrl;
    if (editData.isShiny !== selectedPokemon.isShiny) {
      const baseSprite = selectedPokemon.sprite || selectedPokemon.spriteUrl;
      if (editData.isShiny) {
        finalSpriteUrl = baseSprite.replace('/pokemon/', '/pokemon/shiny/');
      } else {
        finalSpriteUrl = baseSprite.replace('/pokemon/shiny/', '/pokemon/');
      }
    }

    const updates = {
      level: parseInt(editData.level),
      nickname: editData.nickname,
      spriteUrl: finalSpriteUrl,
      ballImage: editData.ballImage,
      isShiny: editData.isShiny,
      heldItem: editData.heldItem,
      moves: editData.moves,
      ivs: editData.ivs,
      effort: editData.effort,
      condition: editData.condition
    };

    onEditPokemon(member.id, selectedPokemon.uniqueId, updates);
    
    setShowMoveModal(false);
    setShowEditItemModal(false);
    setMode('view');
    setSelectedPokemon(null);
  };

  const handleCancelEdit = () => {
    setShowMoveModal(false);
    setShowEditItemModal(false);
    setMode('view');
    setSelectedPokemon(null);
  };

  const handleGivePokemon = () => {
    if (!giveData.selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }

    const moves = giveData.randomMoves ? getRandomMoves() : giveData.selectedMoves;

    const pokemonData = {
      pokemon: giveData.selectedPokemon,
      level: giveData.level,
      nickname: giveData.nickname || giveData.selectedPokemon.name,
      caughtWithBall: giveData.caughtWithBall,
      isShiny: giveData.isShiny,
      heldItem: giveData.heldItem,
      ivs: giveData.ivs,
      effort: giveData.effort,
      condition: giveData.condition,
      moves: moves.map(m => ({
        moveId: m.id,
        currentPp: m.pp,
        learnedAt: giveData.level
      }))
    };

    onGivePokemon(member.id, pokemonData.pokemon, pokemonData);
    
    // 초기화
    setGiveData({
      searchQuery: '',
      selectedPokemon: null,
      level: 5,
      nickname: '',
      caughtWithBall: '몬스터볼',
      isShiny: false,
      heldItem: null,
      selectedMoves: [],
      randomMoves: false,
      ivs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
    });
    setMode('view');
  };

  return (
    <div className="space-y-4">
      {/* 모달들 */}
      {showMoveModal && selectedPokemon && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <MoveSelectModal
            show={true}
            onClose={() => setShowMoveModal(false)}
            onSelect={(move) => {
              if (editData.moves.length < 4 && !editData.moves.some(m => m.moveId === move.id)) {
                setEditData(prev => ({
                  ...prev,
                  moves: [...prev.moves, {
                    moveId: move.id,
                    currentPp: move.pp,
                    learnedAt: editData.level
                  }]
                }));
              }
              setShowMoveModal(false);
            }}
            pokemon={selectedPokemon}
            allMoves={allMoves}
            pokemonLearnsets={pokemonLearnsets}
            learnedMoveIds={editData.moves.map(m => m.moveId)}
          />
        </div>
      )}

      {showGiveMoveModal && giveData.selectedPokemon && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <MoveSelectModal
            show={true}
            onClose={() => setShowGiveMoveModal(false)}
            onSelect={(move) => {
              if (giveData.selectedMoves.length < 4 && !giveData.selectedMoves.some(m => m.id === move.id)) {
                setGiveData(prev => ({
                  ...prev,
                  selectedMoves: [...prev.selectedMoves, move]
                }));
              }
              setShowGiveMoveModal(false);
            }}
            pokemon={giveData.selectedPokemon}
            allMoves={allMoves}
            pokemonLearnsets={pokemonLearnsets}
            learnedMoveIds={giveData.selectedMoves.map(m => m.id)}
          />
        </div>
      )}

      {showEditItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <ItemSelectorModal
            show={true}
            onClose={() => setShowEditItemModal(false)}
            onSelect={(item) => {
              setEditData(prev => ({ ...prev, heldItem: item.name }));
              setShowEditItemModal(false);
            }}
            items={allItems || []}
            title="지닌 물건 선택"
            multiSelect={false}
          />
        </div>
      )}

      {showGiveItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <ItemSelectorModal
            show={true}
            onClose={() => setShowGiveItemModal(false)}
            onSelect={(item) => {
              setGiveData(prev => ({ ...prev, heldItem: item.name }));
              setShowGiveItemModal(false);
            }}
            items={allItems || []}
            title="지닌 물건 선택"
            multiSelect={false}
          />
        </div>
      )}

      {/* 화면 모드별 렌더링 */}
      {mode === 'view' && (
        <MemberPokemonViewMode
          member={member}
          onStartEdit={handleStartEdit}
          onDelete={onDeletePokemon}
          onStartGive={() => {
            setShowGiveMoveModal(false);
            setShowGiveItemModal(false);
            setMode('give');
          }}
        />
      )}

      {mode === 'edit' && selectedPokemon && (
        <MemberPokemonEditMode
          pokemon={selectedPokemon}
          editData={editData}
          setEditData={setEditData}
          allMoves={allMoves}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          onOpenItemModal={() => setShowEditItemModal(true)}
          onOpenMoveModal={() => setShowMoveModal(true)}
        />
      )}

      {mode === 'give' && (
        <MemberPokemonGiveMode
          allPokemonMaster={allPokemonMaster}
          giveData={giveData}
          setGiveData={setGiveData}
          onGive={handleGivePokemon}
          onCancel={() => {
            setShowGiveMoveModal(false);
            setShowGiveItemModal(false);
            setMode('view');
          }}
          onOpenItemModal={() => setShowGiveItemModal(true)}
          onOpenMoveModal={() => setShowGiveMoveModal(true)}
        />
      )}
    </div>
  );
}

export default MemberPokemonTab;