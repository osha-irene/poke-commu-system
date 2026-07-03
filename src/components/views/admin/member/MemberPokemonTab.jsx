import React, { useState, useMemo } from 'react';
import MoveSelectModal from '../../pokemon/MoveSelectModal';
import ItemSelectorModal from '../../../modals/ItemSelectorModal';
import PokemonPickerModal from '../../../modals/PokemonPickerModal';
import MemberPokemonViewMode from './MemberPokemonViewMode';
import MemberPokemonEditMode from './MemberPokemonEditMode';
import MemberPokemonGiveMode from './MemberPokemonGiveMode';
import MemberPokemonTransferMode from './MemberPokemonTransferMode';
import { getLearnsetTmMoves, getPokemonLearnset } from '../../../../utils/pokemonLearnsets';
import { DEFAULT_IVS, normalizeIVs } from '../../../../utils/pokemonIndividualValues';
import { getPokemonGenderOptions } from '../../../../utils/pokemonGender';
import { getPokemonDisplayParts } from '../../../../utils/pokemonDisplayName';
import evolutionsData from '../../../../data/evolutions.json';
import { getBaseStatPatch } from '../../../../utils/pokemonBaseStats';
import { getAbilityEnglishName } from '../../../../utils/abilityUtils';

const emptyEffort = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
const emptyCondition = { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 };

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
  onTransferPokemon,
  maxNonPartnerPokemon = 18,
}) {
  const [mode, setMode] = useState('view');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showGiveMoveModal, setShowGiveMoveModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showGiveItemModal, setShowGiveItemModal] = useState(false);
  const [showGivePokemonPicker, setShowGivePokemonPicker] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  
  const [editData, setEditData] = useState({
    level: 5,
    nickname: '',
    spriteUrl: '',
    spriteSize: null,
    ballImage: '',
    isShiny: false,
    isPartner: false,
    heldItem: null,
    ability: '',
    isHiddenAbility: false,
    moves: [],
    ivs: DEFAULT_IVS,
    effort: emptyEffort,
    condition: emptyCondition
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
  ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
  effort: emptyEffort,
  condition: emptyCondition,
  asEgg: false,
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
    abilitiesEn: template.abilitiesEn || pokemon.abilitiesEn,
    ability: template.abilitiesEn?.[0] || pokemon.abilityEn || pokemon.ability,
    abilityEn: template.abilitiesEn?.[0] || pokemon.abilityEn,
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
      spriteSize: pokemon.spriteSize || null,
      ballImage: pokemon.ballImageUrl || '',
      caughtWithBall: pokemon.caughtWithBall || '몬스터볼',
      isShiny: pokemon.isShiny || false,
      isPartner: pokemon.isPartner || false,
      heldItem: pokemon.heldItem || null,
      ability: pokemon.ability || '',
      isHiddenAbility: pokemon.isHiddenAbility || false,
      friendship: pokemon.friendship || 0,
     gender: pokemon.gender || 'random', 
    sizeRank: pokemon.sizeRank || 'M', 
    heightVariation: pokemon.heightVariation || 100, 
    weightVariation: pokemon.weightVariation || 100, 
      moves: pokemon.moves || [],
      ivs: normalizeIVs(pokemon.ivs, DEFAULT_IVS),
      effort: pokemon.effort || emptyEffort,
      condition: pokemon.condition || emptyCondition
    });
    setMode('edit');
  };

  const handleSaveEdit = () => {
    if (!selectedPokemon) return;
    const pokemonTemplate = getPokemonTemplate(selectedPokemon);
    const finalAbility = editData.ability || pokemonTemplate?.abilitiesEn?.[0] || selectedPokemon.abilityEn || selectedPokemon.ability || '';
    const finalAbilityEn = getAbilityEnglishName(finalAbility) || finalAbility || '';

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
      spriteSize: editData.spriteSize || null,
      ballImage: editData.ballImage,
      caughtWithBall: editData.caughtWithBall, 
      isShiny: editData.isShiny,
      isPartner: editData.isPartner,
      heldItem: editData.heldItem,
      ability: finalAbility,
      abilityEn: finalAbilityEn,
      isHiddenAbility: Boolean(pokemonTemplate?.hiddenAbilityEn && finalAbilityEn === pokemonTemplate.hiddenAbilityEn),
      friendship: editData.friendship,
       gender: editData.gender, 
    sizeRank: editData.sizeRank,  
    heightVariation: editData.heightVariation,
    weightVariation: editData.weightVariation,  
      moves: editData.moves,
      ivs: normalizeIVs(editData.ivs, DEFAULT_IVS),
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

  // 어드민 강제 진화
  const getEvolutionCandidates = (pokemon) => {
    if (!pokemon) return [];
    const candidates = new Set(
      [pokemon.number, pokemon.originalNumber, pokemon.pokemonId]
        .map(v => Number(v))
        .filter(n => Number.isFinite(n) && n > 0)
    );
    return evolutionsData.evolutions.filter(evo => candidates.has(Number(evo.from)));
  };

  const handleAdminEvolve = (evolutionEntry) => {
    if (!selectedPokemon || !evolutionEntry) return;
    const evolvedTemplate = allPokemonMaster.find(p =>
      Number(p.number) === Number(evolutionEntry.to) ||
      Number(p.originalNumber) === Number(evolutionEntry.to)
    );
    if (!evolvedTemplate) {
      alert('진화 대상 포켓몬 데이터를 찾을 수 없습니다.');
      return;
    }
    const fromName = selectedPokemon.nickname || getPokemonDisplayParts(selectedPokemon).name;
    const toName = getPokemonDisplayParts(evolvedTemplate).name;
    if (!window.confirm(`${fromName}을(를) ${toName}(으)로 진화시키겠습니까?`)) return;

    const basePatch = getBaseStatPatch(evolvedTemplate);
    const newName = getPokemonDisplayParts(evolvedTemplate).name;
    const oldName = getPokemonDisplayParts(selectedPokemon).name;
    const currentNickname = selectedPokemon.nickname;
    // 닉네임이 없거나 종족명과 같으면 null로 초기화 (진화 후 새 이름으로 표시)
    const isCustomNickname = currentNickname &&
      currentNickname !== oldName &&
      currentNickname !== selectedPokemon.name &&
      currentNickname !== selectedPokemon.nameEn;
    const updates = {
      number: evolvedTemplate.number,
      originalNumber: evolvedTemplate.originalNumber || evolvedTemplate.number,
      pokemonId: evolvedTemplate.number,
      name: newName,
      nameEn: evolvedTemplate.nameEn,
      type: evolvedTemplate.type,
      type2: evolvedTemplate.type2 || null,
      ...basePatch,
      imageUrl: evolvedTemplate.imageUrl,
      iconUrl: (() => {
        const orig = evolvedTemplate.originalNumber;
        const n = (orig === 710 || orig === 711) ? orig : evolvedTemplate.number;
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${n}.png`;
      })(),
      spriteUrl: selectedPokemon.isShiny
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${evolvedTemplate.number}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvedTemplate.number}.png`,
      nickname: isCustomNickname ? currentNickname : null,
      evolutionCancelled: false,
      evolutionReady: false,
    };

    onEditPokemon(member.id, selectedPokemon.uniqueId, updates);
    setMode('view');
    setSelectedPokemon(null);
    alert(`✅ ${fromName}이(가) ${toName}(으)로 진화했습니다!`);
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

  const resetGiveData = () => setGiveData({
    searchQuery: '',
    selectedPokemon: null,
    level: 5,
    nickname: '',
    caughtWithBall: '몬스터볼',
    customBallImage: null,
    isShiny: false,
    isPartner: false,
    heldItem: null,
    selectedMoves: [],
    randomMoves: false,
    gender: 'random',
    ability: '',
    sizeRank: 'M',
    heightVariation: 100,
    weightVariation: 100,
    ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    effort: emptyEffort,
    condition: emptyCondition,
    asEgg: false,
  });

  const handleGivePokemon = () => {
    if (!giveData.selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }

    // 알로 지급
    if (giveData.asEgg) {
      const p = giveData.selectedPokemon;
      const eggData = {
        species: p.name,
        speciesEn: p.nameEn || null,
        speciesNumber: p.number,
        speciesOriginalNumber: p.originalNumber || p.number,
        regionalForm: p.regionalForm || null,
        formVariant: p.formVariant || null,
        isShiny: giveData.isShiny || false,
        gender: giveData.gender || null,
        ivs: giveData.ivs || null,
        caughtWithBall: giveData.caughtWithBall || '몬스터볼',
        ballImageUrl: null,
        heldItem: giveData.heldItem || null,
        friendship: giveData.friendship || 0,
        ability: giveData.ability || null,
        moves: (giveData.selectedMoves || []).map(m => ({ moveId: m.id, currentPp: m.pp, learnedAt: 1 })),
        givenAt: new Date().toISOString(),
      };
      onGivePokemon(member.id, giveData.selectedPokemon, { asEgg: true, eggData });
      resetGiveData();
      setMode('view');
      return;
    }

    const moves = giveData.randomMoves ? getRandomMoves() : giveData.selectedMoves;

    const FLAVORS = ['매운맛', '신맛', '단맛', '쓴맛', '짠맛'];
    const pokemonData = {
      level: giveData.level,
      nickname: giveData.nickname || giveData.selectedPokemon.name,
      isAdminGiven: true,
      favoriteFlavor: FLAVORS[Math.floor(Math.random() * FLAVORS.length)],
      caughtWithBall: giveData.caughtWithBall,
      customBallImage: giveData.customBallImage,
      isShiny: giveData.isShiny,
      isPartner: giveData.isPartner,
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
    resetGiveData();
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

      {showGivePokemonPicker && (
        <PokemonPickerModal
          allPokemon={allPokemonMaster}
          onSelect={(pokemon) => {
            const nextGenderOptions = getPokemonGenderOptions(pokemon);
            setGiveData(prev => ({
              ...prev,
              selectedPokemon: pokemon,
              nickname: getPokemonDisplayParts(pokemon).name || pokemon.name,
              selectedMoves: [],
              gender: nextGenderOptions.length === 1 && nextGenderOptions[0] === 'none' ? 'none' : 'random',
            }));
            setShowGivePokemonPicker(false);
            setMode('give');
          }}
          onClose={() => setShowGivePokemonPicker(false)}
        />
      )}

      {/* 화면 모드별 렌더링 */}
      {mode === 'view' && (
        <MemberPokemonViewMode
          member={member}
          allPokemonMaster={allPokemonMaster}
          getPokemonFormCandidates={getPokemonFormCandidates}
          onStartEdit={handleStartEdit}
          onChangeForm={handleChangePokemonForm}
          onDelete={(uniqueId) => onDeletePokemon(uniqueId)}
          onStartGive={() => {
            setShowGiveMoveModal(false);
            setShowGiveItemModal(false);
            setShowGivePokemonPicker(true);
          }}
          onStartTransfer={handleStartTransferPokemon}
          maxNonPartnerPokemon={maxNonPartnerPokemon}
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
          evolutionCandidates={getEvolutionCandidates(selectedPokemon)}
          onAdminEvolve={handleAdminEvolve}
          allPokemonMaster={allPokemonMaster}
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
          onOpenPokemonPicker={() => setShowGivePokemonPicker(true)}
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

