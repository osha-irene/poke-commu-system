import React, { useState, useMemo } from 'react';
import MoveSelectModal from '../../pokemon/MoveSelectModal';
import ItemSelectorModal from '../../../modals/ItemSelectorModal';
import MemberPokemonViewMode from './MemberPokemonViewMode';
import MemberPokemonEditMode from './MemberPokemonEditMode';
import MemberPokemonGiveMode from './MemberPokemonGiveMode';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../../../utils/pokemonLearnsets';

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
  customBallImage: null, // 추가
  isShiny: false, 
  friendship: 0, 
  heldItem: null, 
  selectedMoves: [], 
  randomMoves: false,
  // ⭐ 여기부터 새로 추가된 필드들
  gender: 'random', 
  ability: '', 
  sizeRank: 'M', 
  heightVariation: 100, 
  weightVariation: 100, 
  ivs: { 
    hp: 0, 
    attack: 0, 
    defense: 0, 
    specialAttack: 0, 
    specialDefense: 0, 
    speed: 0 
  }, 
  effort: { 
    hp: 0, 
    attack: 0, 
    defense: 0, 
    specialAttack: 0, 
    specialDefense: 0, 
    speed: 0 
  }, 
  condition: { 
    elegance: 0, 
    beauty: 0, 
    cuteness: 0, 
    intelligence: 0, 
    strength: 0 
  } 
});

  const getPokemonTemplate = (pokemon) => {
    if (!pokemon) return null;
    return (allPokemonMaster || []).find(template =>
      template.number === pokemon.number ||
      template.id === pokemon.pokemonId ||
      template.nameEn === pokemon.nameEn ||
      template.name === pokemon.name
    ) || null;
  };

  const withPokemonTemplateData = (pokemon) => {
    const template = getPokemonTemplate(pokemon);
    return template ? { ...pokemon, ...template } : pokemon;
  };

  // 지급용 기술 목록
  const giveAvailableMoves = useMemo(() => {
  if (!giveData.selectedPokemon) return [];
  const learnset = getPokemonLearnset(pokemonLearnsets, giveData.selectedPokemon);
  if (!learnset) return [];
  
  // 1. 레벨업 기술
  const levelMoves = learnset.levelUpMoves
    ?.filter(entry => entry.level <= giveData.level)
    .map(entry => allMoves.find(m => m.id === entry.moveId))
    .filter(Boolean) || [];
  
  // 2. 기술머신 (TM/HM)
  const machineMoves = getLearnsetTmMoves(learnset)
    ?.map(moveId => allMoves.find(m => m.id === moveId))
    .filter(Boolean) || [];
  
  // 3. 알 기술
  const eggMoves = learnset.eggMoves
    ?.map(moveId => allMoves.find(m => m.id === moveId))
    .filter(Boolean) || [];
  
  // 4. 교배 기술
  const tutorMoves = learnset.tutorMoves
    ?.map(moveId => allMoves.find(m => m.id === moveId))
    .filter(Boolean) || [];
  
  // 중복 제거 후 반환
  return [...new Map([...levelMoves, ...machineMoves, ...eggMoves, ...tutorMoves].map(m => [m.id, m])).values()];
}, [giveData.selectedPokemon, giveData.level, pokemonLearnsets, allMoves]);



  const getRandomMoves = () => {
  if (giveAvailableMoves.length === 0) {
    console.log('⚠️ 배울 수 있는 기술이 없습니다');
    return [];
  }
  
  const shuffled = [...giveAvailableMoves].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(4, shuffled.length));
  
  console.log('🎲 랜덤 기술 생성:', selected.map(m => m.name));
  
  return selected;
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
      caughtWithBall: pokemon.caughtWithBall || '몬스터볼',
      isShiny: pokemon.isShiny || false,
      heldItem: pokemon.heldItem || null,
      friendship: pokemon.friendship || 0,
     gender: pokemon.gender || 'random', 
    sizeRank: pokemon.sizeRank || 'M', 
    heightVariation: pokemon.heightVariation || 100, 
    weightVariation: pokemon.weightVariation || 100, 
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
      caughtWithBall: editData.caughtWithBall, 
      isShiny: editData.isShiny,
      heldItem: editData.heldItem,
      friendship: editData.friendship,
       gender: editData.gender, 
    sizeRank: editData.sizeRank,  
    heightVariation: editData.heightVariation,
    weightVariation: editData.weightVariation,  
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

  // ⭐ 랜덤 기술 생성
  const moves = giveData.randomMoves ? getRandomMoves() : giveData.selectedMoves;

console.log('📋 최종 기술:', {
  randomMoves: giveData.randomMoves,
  moves: moves.map(m => m.name || m.id)
});

  const pokemonData = {
    level: giveData.level,
    nickname: giveData.nickname || giveData.selectedPokemon.name,
    caughtWithBall: giveData.caughtWithBall,
    customBallImage: giveData.customBallImage,
    isShiny: giveData.isShiny,
    isPartner: giveData.isPartner,  // ⭐ 추가
    friendship: giveData.friendship,
    heldItem: giveData.heldItem,
    gender: giveData.gender,
    ability: giveData.ability,
    sizeRank: giveData.sizeRank,
    heightVariation: giveData.heightVariation,
    weightVariation: giveData.weightVariation,
    ivs: giveData.ivs,
    effort: giveData.effort,
    condition: giveData.condition,
    moves: moves.map(m => ({
      moveId: m.id,
      currentPp: m.pp,
      learnedAt: giveData.level
    }))
  };

  onGivePokemon(member.id, giveData.selectedPokemon, pokemonData);
  
  // 초기화
  setGiveData({
    searchQuery: '',
    selectedPokemon: null,
    level: 5,
    nickname: '',
    caughtWithBall: '몬스터볼',
    customBallImage: null,
    isShiny: false,
    isPartner: false,  // ⭐ 추가
    heldItem: null,
    selectedMoves: [],
    randomMoves: false,
    gender: 'random',
    ability: '',
    sizeRank: 'M',
    heightVariation: 100,
    weightVariation: 100,
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
            pokemon={withPokemonTemplateData(selectedPokemon)}
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
          onDelete={(uniqueId) => onDeletePokemon(uniqueId)}
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
          pokemonTemplate={getPokemonTemplate(selectedPokemon)}
          editData={editData}
          setEditData={setEditData}
          allMoves={allMoves}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
            onDelete={(uniqueId) => {  // ⭐ 수정
              onDeletePokemon(uniqueId);
              setMode('view');  // ⭐ 삭제 후 목록으로
              setSelectedPokemon(null);
    }}
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
