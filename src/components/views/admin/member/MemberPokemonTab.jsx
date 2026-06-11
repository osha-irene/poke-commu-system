import React, { useState, useMemo } from 'react';
import MoveSelectModal from '../../pokemon/MoveSelectModal';
import ItemSelectorModal from '../../../modals/ItemSelectorModal';
import MemberPokemonViewMode from './MemberPokemonViewMode';
import MemberPokemonEditMode from './MemberPokemonEditMode';
import MemberPokemonGiveMode from './MemberPokemonGiveMode';
import MemberPokemonTransferMode from './MemberPokemonTransferMode';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../../../utils/pokemonLearnsets';

function MemberPokemonTab({ 
  member, 
  members = {},
  trainer,
  allPokemonMaster = [], 
  allMoves = [], 
  allItems = [],
  pokemonLearnsets = {},
  onGivePokemon,
  onEditPokemon,
  getPokemonFormCandidates,
  onDeletePokemon,
  onHatchEgg,
  onTransferPokemon
}) {
  const [mode, setMode] = useState('view');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showGiveMoveModal, setShowGiveMoveModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showGiveItemModal, setShowGiveItemModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  
  const [editData, setEditData] = useState({
    level: 5,
    nickname: '',
    spriteUrl: '',
    ballImage: '',
    isShiny: false,
    heldItem: null,
    ability: '',
    isHiddenAbility: false,
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

  const normalizeKey = (value) => String(value || '').toLowerCase();

  const getPokemonTemplate = (pokemon) => {
    if (!pokemon) return null;
    const pokemonRegionalForm = normalizeKey(pokemon.regionalForm);
    const pokemonFormVariant = normalizeKey(pokemon.formVariant);
    const pokemonNameEn = normalizeKey(pokemon.nameEn);
    const pokemonNumber = Number(pokemon.number);
    const pokemonOriginalNumber = Number(pokemon.originalNumber || pokemon.number);
    const pokemonId = Number(pokemon.pokemonId || pokemon.id);

    const candidates = (allPokemonMaster || [])
      .map(template => {
        const templateRegionalForm = normalizeKey(template.regionalForm);
        const templateFormVariant = normalizeKey(template.formVariant);
        const templateNameEn = normalizeKey(template.nameEn);
        const templateNumber = Number(template.number);
        const templateOriginalNumber = Number(template.originalNumber || template.number);
        const templateId = Number(template.id);
        let score = 0;

        if (pokemonFormVariant && templateFormVariant === pokemonFormVariant) score += 100;
        if (pokemonNameEn && templateNameEn === pokemonNameEn) score += 90;
        if (pokemonId && templateId === pokemonId) score += 80;
        if (pokemonRegionalForm && templateRegionalForm === pokemonRegionalForm) score += 40;
        if (pokemonNumber && templateNumber === pokemonNumber) score += 20;
        if (pokemonOriginalNumber && templateOriginalNumber === pokemonOriginalNumber) score += 10;
        if (!pokemonRegionalForm && !templateRegionalForm && pokemonNumber && templateNumber === pokemonNumber) score += 30;
        if (template.name === pokemon.name) score += 5;

        return { template, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.template || null;
  };

  const withPokemonTemplateData = (pokemon) => {
    const template = getPokemonTemplate(pokemon);
    return template ? { ...pokemon, ...template } : pokemon;
  };

  const buildFormChangeUpdates = (pokemon, template) => ({
    pokemonId: template.id || pokemon.pokemonId,
    number: template.number,
    originalNumber: template.originalNumber || template.number,
    displayNumber: template.displayNumber || pokemon.displayNumber,
    name: template.name || pokemon.name,
    nameEn: template.nameEn || pokemon.nameEn,
    species: template.species || template.nameEn || pokemon.species,
    type: template.type || pokemon.type,
    type2: template.type2 || null,
    abilities: template.abilities || pokemon.abilities,
    abilitiesEn: template.abilitiesEn || pokemon.abilitiesEn,
    ability: template.abilities?.[0] || pokemon.ability,
    abilityEn: template.abilitiesEn?.[0] || pokemon.abilityEn,
    hiddenAbility: template.hiddenAbility ?? pokemon.hiddenAbility,
    hiddenAbilityEn: template.hiddenAbilityEn ?? pokemon.hiddenAbilityEn,
    baseHp: template.baseHp ?? pokemon.baseHp,
    baseAttack: template.baseAttack ?? pokemon.baseAttack,
    baseDefense: template.baseDefense ?? pokemon.baseDefense,
    baseSpAttack: template.baseSpAttack ?? pokemon.baseSpAttack,
    baseSpDefense: template.baseSpDefense ?? pokemon.baseSpDefense,
    baseSpeed: template.baseSpeed ?? pokemon.baseSpeed,
    imageUrl: template.imageUrl || pokemon.imageUrl,
    spriteUrl: template.spriteUrl || template.imageUrl || pokemon.spriteUrl,
    iconUrl: template.iconUrl || pokemon.iconUrl,
    shinySprite: template.shinySprite || pokemon.shinySprite,
    isRegionalForm: Boolean(template.isRegionalForm),
    regionalForm: template.regionalForm || null,
    formVariant: template.formVariant || null,
    baseSpecies: template.baseSpecies || pokemon.baseSpecies,
    baseSpeciesEn: template.baseSpeciesEn || pokemon.baseSpeciesEn,
  });

  const handleChangePokemonForm = (pokemon, form) => {
    if (!pokemon || !form || !trainer?.isAdmin) return;
    const formName = form.name || form.nameEn;
    if (!window.confirm(`${pokemon.nickname || pokemon.name}을(를) ${formName} 폼으로 변경하시겠습니까?`)) return;
    onEditPokemon(member.id, pokemon.uniqueId, buildFormChangeUpdates(pokemon, form));
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
      ability: pokemon.ability || '',
      isHiddenAbility: pokemon.isHiddenAbility || false,
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
    const pokemonTemplate = getPokemonTemplate(selectedPokemon);
    const finalAbility = editData.ability || pokemonTemplate?.abilities?.[0] || selectedPokemon.ability || '없음';

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
      ability: finalAbility,
      isHiddenAbility: Boolean(pokemonTemplate?.hiddenAbility && finalAbility === pokemonTemplate.hiddenAbility),
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

  const handleStartTransferPokemon = (pokemon) => {
    setTransferTarget({ type: 'pokemon', pokemon });
    setShowMoveModal(false);
    setShowEditItemModal(false);
    setShowGiveMoveModal(false);
    setShowGiveItemModal(false);
    setMode('transfer');
  };

  const handleStartTransferEgg = () => {
    setTransferTarget({ type: 'egg', egg: member.egg });
    setShowMoveModal(false);
    setShowEditItemModal(false);
    setShowGiveMoveModal(false);
    setShowGiveItemModal(false);
    setMode('transfer');
  };

  const handleTransfer = async (targetMemberId, target) => {
    const success = await onTransferPokemon?.(member.id, targetMemberId, target);
    if (success) {
      setTransferTarget(null);
      setMode('view');
    }
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
      {member?.egg && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-amber-700">보유 알</div>
            <div className="text-lg font-bold text-gray-800">
              {member.egg.species || member.egg.name || '포켓몬'} 알
            </div>
            <div className="text-xs text-gray-600">
              관리자 확인 후 부화하거나 다른 멤버에게 이전할 수 있습니다.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onHatchEgg?.(member.id)}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
            >
              부화 처리
            </button>
            <button
              type="button"
              onClick={handleStartTransferEgg}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors"
            >
              알 이전
            </button>
          </div>
        </div>
      )}

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
          getPokemonFormCandidates={getPokemonFormCandidates}
          onStartEdit={handleStartEdit}
          onChangeForm={handleChangePokemonForm}
          onDelete={(uniqueId) => onDeletePokemon(uniqueId)}
          onStartGive={() => {
            setShowGiveMoveModal(false);
            setShowGiveItemModal(false);
            setMode('give');
          }}
          onStartTransfer={handleStartTransferPokemon}
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

      {mode === 'transfer' && transferTarget && (
        <MemberPokemonTransferMode
          member={member}
          members={members}
          transferTarget={transferTarget}
          onTransfer={handleTransfer}
          onCancel={() => {
            setTransferTarget(null);
            setMode('view');
          }}
        />
      )}
    </div>
  );
}

export default MemberPokemonTab;

