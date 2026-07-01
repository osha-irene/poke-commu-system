// src/components/views/pokemon/PokemonDetailPanel.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Heart,
  Trees,
  X,
  Edit2,
  Check,
  Sparkles,
  Zap,
  RefreshCw,
  Sword,
  Info,
  FileText,
  Menu
} from 'lucide-react';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { getTypeColor, POKEBALL_LIST } from '../../../styles/theme';
import MovesList from './MovesList';
import MoveSelectModal from './MoveSelectModal';
import LevelUpMoveModal from './LevelUpMoveModal';
import FormIconSprite from './FormIconSprite';
import { getRequiredExpForLevel } from '../../../utils/experience';
import { getAbilityByName } from '../../../utils/abilityUtils';
import { getPokemonDisplayParts } from '../../../utils/pokemonDisplayName';
import { getGenderedSpriteUrl } from '../../../utils/pokemonImageUtils';

const getBaseName = (pokemon) => getPokemonDisplayParts(pokemon).name;

const getPokemonSpriteUrl = (number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;

// ⭐ 여기에 헬퍼 함수들 추가
const getGenderIcon = (gender) => {
  if (gender === 'male') return '♂';
  if (gender === 'female') return '♀';
  return null;
};

const getGenderColor = (gender) => {
  if (gender === 'male') return 'text-blue-600';
  if (gender === 'female') return 'text-pink-600';
  return 'text-gray-400';
};

const getSizeColor = (rank) => {
  const colors = {
    'XXXS': 'text-purple-700 font-extrabold',
    'XXS': 'text-purple-600 font-bold',
    'XS': 'text-blue-600',
    'M': 'text-gray-600',
    'XL': 'text-orange-600',
    'XXL': 'text-red-600 font-bold',
    'XXXL': 'text-red-700 font-extrabold'
  };
  return colors[rank] || 'text-gray-600';
};

const getSizeRarity = (rank) => {
  if (rank === 'XXXS' || rank === 'XXXL') return '✨ 극희귀';
  if (rank === 'XXS' || rank === 'XXL') return '⭐ 희귀';
  if (rank === 'XS' || rank === 'XL') return '🔹 레어';
  return '일반';
};

const getSizeDescription = (rank, formVariant) => {
  const sizeDesc = {
    'XXXS': '믿기 어려울 만큼 작은 크기인 것 같다.',
    'XXS': '매우 작은 크기인 것 같다.',
    'XS': '조금 작은 크기인 것 같다.',
    'M': '중간 정도의 크기인 것 같다.',
    'XL': '조금 큰 크기인 것 같다.',
    'XXL': '매우 큰 크기인 것 같다.',
    'XXXL': '믿기 어려울 만큼 큰 크기인 것 같다.',
  };
  const breedPrefix = {
    'pumpkaboo-super': '제일 큰 품종',
    'pumpkaboo-large': '큰 품종',
    'pumpkaboo-average': '평범한 품종',
    'pumpkaboo-small': '작은 품종',
    'gourgeist-super': '제일 큰 품종',
    'gourgeist-large': '큰 품종',
    'gourgeist-average': '평범한 품종',
    'gourgeist-small': '작은 품종',
  };
  if (formVariant && breedPrefix[formVariant]) {
    const rankDesc = sizeDesc[rank];
    if (rankDesc) return `${breedPrefix[formVariant]} 중에서도 ${rankDesc}`;
    return `${breedPrefix[formVariant]}인 것 같다.`;
  }
  return sizeDesc[rank] || '알 수 없는 크기인 것 같다.';
};


export default function PokemonDetailPanel({ 
  pokemon, 
  currentUser,
  hasRareCandy,
  rareCandyImage,
  isInParty,
  allItems = [],
  gamePokedex,
  items = [],
  onClose,
  onUseCandy,
  onMove,
  onRelease,
  onUpdateNickname,
  onUpdateMemo,
  onGiveItem,
  onTakeItem,
  onForgetMove,
  onLearnMove,   
  isAdmin = false,
  allMoves = [],      
  pokemonLearnsets = {},
  onUseItemOnPokemon,
  checkEvolution,
  manualEvolve,
  allPokemonMaster = [],
  getPokemonFormCandidates,
  onChangeForm,
  systemSettings = {},
  mobile = false
}) {
  // State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname || getBaseName(pokemon));
  const [showMoveSelectModal, setShowMoveSelectModal] = useState(false);
  const [showLevelUpMoveModal, setShowLevelUpMoveModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [expInput, setExpInput] = useState('');
  const [showExpPanel, setShowExpPanel] = useState(false);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // 툴팁용 state 추가
  const [hoveredCondition, setHoveredCondition] = useState(null);
  const [hoveredEffort, setHoveredEffort] = useState(null);
  const [masterSpriteSize, setMasterSpriteSize] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tooltipType, setTooltipType] = useState('');

  const [activeTab, setActiveTab] = useState('skills');
  const [memoText, setMemoText] = useState(pokemon.memo || '');
  const [isEditingMemo, setIsEditingMemo] = useState(false);

  const toPokemonNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const trainerExp = Number(currentUser?.trainerExp) || 0;
  const requiredLevelExp = getRequiredExpForLevel(pokemon.level);
  const expToNextLevel = requiredLevelExp === null
    ? null
    : Math.max(0, requiredLevelExp - (Number(pokemon.exp) || 0));
  const selectedExpAmount = Math.max(0, Math.floor(Number(expInput) || 0));
  const canAllocateExp = selectedExpAmount > 0 && trainerExp >= selectedExpAmount;
  const abilityData = getAbilityByName(pokemon.abilityEn || pokemon.ability);
  const abilityDescription = abilityData
    ? abilityData.effectKo ||
      abilityData.flavorTextKo ||
      abilityData.shortEffectKo ||
      abilityData.shortEffect ||
      abilityData.effect ||
      ''
    : '';
  const levelExpTitle = requiredLevelExp === null
    ? '현재 레벨에서는 경험치 배분으로 더 이상 레벨업할 수 없습니다'
    : canAllocateExp
      ? `경험치 배분: ${selectedExpAmount} / 보유 ${trainerExp}`
      : `배분할 경험치를 입력해주세요 / 보유 ${trainerExp}`;

  // 진화 가능 여부 체크
  const canEvolve = checkEvolution && checkEvolution(pokemon);
const isHoldingEverstone = pokemon.heldItem?.toLowerCase() === 'everstone' || 
                            pokemon.heldItem?.toLowerCase() === '변함없는돌';

  // 컨디션 및 노력치 데이터
  const condLimit = Number(systemSettings?.conditionMax) || 100;
  const cond = pokemon.condition || {};
  const conditionData = [
    { subject: '근사함',  A: Math.min(Number(cond.elegance    || 0), condLimit), fullMark: 100 },
    { subject: '귀여움',  A: Math.min(Number(cond.cuteness    || 0), condLimit), fullMark: 100 },
    { subject: '아름다움', A: Math.min(Number(cond.beauty      || 0), condLimit), fullMark: 100 },
    { subject: '슬기로움', A: Math.min(Number(cond.intelligence|| 0), condLimit), fullMark: 100 },
    { subject: '강인함',  A: Math.min(Number(cond.strength    || 0), condLimit), fullMark: 100 },
  ];
  const hasAnyCondition = conditionData.some(d => d.A > 0);

  const effortData = [
    { subject: 'HP', A: pokemon.effort?.hp || 0, fullMark: 255 },
    { subject: '공격', A: pokemon.effort?.attack || 0, fullMark: 255 },
    { subject: '방어', A: pokemon.effort?.defense || 0, fullMark: 255 },
    { subject: '특공', A: pokemon.effort?.specialAttack || 0, fullMark: 255 },
    { subject: '특방', A: pokemon.effort?.specialDefense || 0, fullMark: 255 },
    { subject: '스피드', A: pokemon.effort?.speed || 0, fullMark: 255 }
  ];

  // 커스텀 Tick 렌더링 함수들
  const renderConditionTick = (tickProps) => {
    const { x, y, payload, textAnchor } = tickProps;
    const item = conditionData.find(d => d.subject === payload.value);

    let ax = x, ay = y;
    if (payload.value === '강인함')  { ax += 6; ay -= 4; }
    if (payload.value === '귀여움')   { ax -= 6; ay -= 4; }
    if (payload.value === '슬기로움') { ax += 7; ay += 12; }
    if (payload.value === '아름다움') { ax -= 7; ay += 12; }

    return (
      <text
        x={ax}
        y={ay}
        textAnchor={textAnchor}
        fill="#ec4899"
        fontSize={11}
        fontWeight={600}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          setHoveredEffort(null);
          setHoveredCondition(item?.A || 0);
          setTooltipType('condition');
          setMousePos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => {
          setHoveredCondition(null);
          setTooltipType('');
        }}
      >
        {payload.value}
      </text>
    );
  };

  const renderEffortTick = (tickProps) => {
    const { x, y, payload, textAnchor } = tickProps;
    const item = effortData.find(d => d.subject === payload.value);
    
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#3b82f6"
        fontSize={11}
        fontWeight={600}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          setHoveredCondition(null);
          setHoveredEffort(item?.A || 0);
          setTooltipType('effort');
          setMousePos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => {
          setHoveredEffort(null);
          setTooltipType('');
        }}
      >
        {payload.value}
      </text>
    );
  };

  // 영운 도감
  const pokemonNumbers = new Set([
    toPokemonNumber(pokemon.number),
    toPokemonNumber(pokemon.originalNumber)
  ].filter(Boolean));
  const pokedexEntry = gamePokedex?.find(entry => {
    const entryNumbers = [
      toPokemonNumber(entry.number),
      toPokemonNumber(entry.originalNumber)
    ].filter(Boolean);

    return entryNumbers.some(number => pokemonNumbers.has(number));
  });
  const displayNumber = pokedexEntry?.newNumber || pokemon.originalNumber || pokemon.number;
  const originalNumber = pokedexEntry?.originalNumber || pokemon.number;
  const masterData = allPokemonMaster.find(p => p.number === pokemon.number || p.number === pokemon.originalNumber);
  // 우선순위: 암컷 스프라이트 > 커스텀(폼체인지) > masterData 기본 > 생성 URL
  const effectiveSpriteUrl = getGenderedSpriteUrl(pokemon, masterData) || pokemon.spriteUrl || masterData?.spriteUrl || getPokemonSpriteUrl(originalNumber);

  // 아이템 데이터
  const heldItemData = pokemon.heldItem 
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const heldItemName = pokemon.heldItem?.toLowerCase();
        return itemName === heldItemName || 
               itemNameEn === heldItemName ||
               itemName?.includes(heldItemName) ||
               itemNameEn?.includes(heldItemName);
      })
    : null;


const getBallImage = () => {
  // 1순위: allItems
  if (pokemon.caughtWithBall && allItems && allItems.length > 0) {
    const pokeballItem = allItems.find(item => {
      const itemName = item.name?.toLowerCase();
      const itemNameEn = item.nameEn?.toLowerCase();
      const ballName = pokemon.caughtWithBall.toLowerCase();
      
      return itemName === ballName || 
             itemNameEn === ballName ||
             itemName?.includes(ballName) ||
             itemNameEn?.includes(ballName);
    });
    
    if (pokeballItem) {
      return pokeballItem.spriteUrl || pokeballItem.imageUrl;
    }
  }
  
  // 2순위: POKEBALL_LIST
  if (pokemon.caughtWithBall) {
    const ballInfo = POKEBALL_LIST.find(ball => 
      ball.name === pokemon.caughtWithBall || 
      ball.nameEn === pokemon.caughtWithBall.toLowerCase()
    );
    
    if (ballInfo) {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballInfo.nameEn}.png`;
    }
  }
  
  // 3순위: ballImageUrl
  if (pokemon.ballImageUrl) {
    return pokemon.ballImageUrl;
  }
  
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
};
const ballImage = getBallImage();

  // 타입 색상
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;

  // HP 계산

  // 진화 후 포켓몬 정보 가져오기
  const getEvolvedPokemon = () => {
    if (!canEvolve || !allPokemonMaster) return null;
    const targetNumber = toPokemonNumber(canEvolve.to);
    return allPokemonMaster.find((p) =>
      toPokemonNumber(p.number) === targetNumber ||
      toPokemonNumber(p.originalNumber) === targetNumber
    );
  };

  const evolvedPokemon = getEvolvedPokemon();
  const formCandidates = typeof getPokemonFormCandidates === 'function'
    ? getPokemonFormCandidates(pokemon)
    : [];
  const currentFormKey = pokemon.pokemonId || pokemon.id || pokemon.nameEn || pokemon.name;
  const availableForms = formCandidates.filter(form => (
    (form.id || form.nameEn || form.name) !== currentFormKey &&
    form.nameEn !== pokemon.nameEn &&
    form.name !== pokemon.name
  ));
  const canChangeForm = isAdmin && availableForms.length > 0 && typeof onChangeForm === 'function';
  const isOwner = !isAdmin && currentUser && (
    (currentUser.caughtPokemon || []).some(p => p && p.uniqueId === pokemon.uniqueId) ||
    currentUser.partnerPokemon?.uniqueId === pokemon.uniqueId
  );

  // Effects
  useEffect(() => {
    setNickname(pokemon.nickname || getBaseName(pokemon));
    setIsEditingNickname(false);
    setExpInput('');
    setShowExpPanel(false);
    setShowFormPanel(false);
    setShowMobileMenu(false);
  }, [pokemon.uniqueId, pokemon.nickname, pokemon.name]);

  useEffect(() => {
    const url = effectiveSpriteUrl;
    if (!url || !masterData?.spriteUrl || masterData.spriteUrl === getPokemonSpriteUrl(originalNumber) || pokemon.spriteSize) {
      setMasterSpriteSize(null);
      return;
    }
    setMasterSpriteSize(null);
    const img = new Image();
    img.onload = () => {
      setMasterSpriteSize({ w: Math.round(img.naturalWidth * 1.05), h: Math.round(img.naturalHeight * 1.05) });
    };
    img.src = url;
  }, [effectiveSpriteUrl, masterData?.spriteUrl, pokemon.spriteSize]);

  // Handlers
  const handleSaveNickname = async () => {
    if (nickname.trim()) {
      const saved = await onUpdateNickname(pokemon.uniqueId, nickname.trim());
      if (saved !== false) setIsEditingNickname(false);
    }
  };

  const handleCancelEdit = () => {
    setNickname(pokemon.nickname || getBaseName(pokemon));
    setIsEditingNickname(false);
  };

  const buildCurrentMoveData = () => (
    pokemon.moves?.map((moveEntry) => {
      const moveData = allMoves.find(move => move.id === moveEntry.moveId);
      return moveData ? { ...moveData, moveId: moveEntry.moveId, currentPp: moveEntry.currentPp, learnedAt: moveEntry.learnedAt } : null;
    }).filter(Boolean) || []
  );

  const openLevelUpMoveQueue = (pokemonId, newLevel, newMoves = []) => {
    const moves = newMoves.filter(Boolean);
    if (!moves.length) return;
    setLevelUpData({
      pokemonId,
      newLevel,
      pendingMoves: moves,
      currentMove: moves[0],
      currentMoves: buildCurrentMoveData(),
    });
    setShowLevelUpMoveModal(true);
  };

  const advanceLevelUpMoveQueue = (nextCurrentMoves = levelUpData?.currentMoves || []) => {
    const remainingMoves = levelUpData?.pendingMoves?.slice(1) || [];
    if (!remainingMoves.length) {
      setShowLevelUpMoveModal(false);
      setLevelUpData(null);
      return;
    }

    setLevelUpData({
      ...levelUpData,
      pendingMoves: remainingMoves,
      currentMove: remainingMoves[0],
      currentMoves: nextCurrentMoves,
    });
  };

  const handleLearnMove = (newMove, oldMoveId) => {
    if (typeof onLearnMove !== 'function') {
      alert('⚠️ 기술을 배울 수 없습니다!');
      return;
    }
    
    onLearnMove(pokemon.uniqueId, newMove, oldMoveId);

    const currentMoves = levelUpData?.currentMoves || [];
    const nextMove = { ...newMove, moveId: newMove.moveId || newMove.id };
    const nextCurrentMoves = oldMoveId
      ? currentMoves.map(move => ((move.moveId || move.id) === oldMoveId ? nextMove : move))
      : [...currentMoves, nextMove].slice(0, 4);

    advanceLevelUpMoveQueue(nextCurrentMoves);
  };

  const handleChangeForm = (form) => {
    if (!isAdmin || !form || !onChangeForm) return;
    const formName = form.name || form.nameEn;
    if (!window.confirm(`${pokemon.nickname || pokemon.name}을(를) ${formName} 폼으로 변경하시겠습니까?`)) return;
    const changed = onChangeForm(pokemon.uniqueId, form.id || form.nameEn || form.name);
    if (changed) {
      setShowFormPanel(false);
      setShowMobileMenu(false);
    }
  };

  const renderExpAllocationBody = () => (
    <>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="1"
          max={trainerExp}
          value={expInput}
          onChange={(event) => {
            const value = event.target.value;
            if (value === '') {
              setExpInput('');
              return;
            }
            setExpInput(String(Math.max(0, Math.floor(Number(value) || 0))));
          }}
          className="h-9 w-24 rounded-lg border border-[#a7c86f] bg-[#f8fbef] px-2 text-sm font-bold text-[#2f4a24] focus:border-[#7fa438] focus:outline-none"
          placeholder="EXP"
        />
        <button
          type="button"
          onClick={() => {
            if (!canAllocateExp) return;
            onUseCandy(pokemon.uniqueId, openLevelUpMoveQueue, selectedExpAmount);
            setExpInput('');
            setShowExpPanel(false);
            setShowMobileMenu(false);
          }}
          disabled={!canAllocateExp}
          className={`h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
            canAllocateExp
              ? 'bg-[#6f8f25] text-white hover:bg-[#4f741f]'
              : 'bg-[#dbeabf] text-[#7f9360] cursor-not-allowed'
          }`}
        >
          배분
        </button>
      </div>
      <div className="mt-2 space-y-0.5 text-xs font-semibold text-[#9a6b00]">
        <div>나의 남은 경험치: {trainerExp - (selectedExpAmount || 0) < 0 ? 0 : trainerExp - (selectedExpAmount || 0)} <span className="text-[#b0b0b0] font-normal">(보유 {trainerExp})</span></div>
        <div>다음 레벨업까지 필요 경험치: {expToNextLevel ?? '-'}</div>
      </div>
    </>
  );

  const renderFormListBody = () => (
    <div className="mt-2 space-y-2">
      {availableForms.map((form) => (
        <button
          key={form.id || form.nameEn || form.name}
          type="button"
          onClick={() => handleChangeForm(form)}
          className="flex w-full items-center gap-3 rounded-lg border border-[#c8dda4] bg-[#f8fbef] px-3 py-2 text-left transition-colors hover:bg-[#eef7df]"
        >
          <FormIconSprite
            form={form}
            size={36}
            fallbackUrl={form.iconUrl || form.spriteUrl || form.imageUrl || getPokemonSpriteUrl(form.originalNumber || form.number)}
            className="h-9 w-9"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[#26351f]">{getBaseName(form)}</span>
            <span className="block truncate text-xs text-[#6f8150]">
              {form.type}{form.type2 ? ` / ${form.type2}` : ''}
            </span>
          </span>
        </button>
      ))}
    </div>
  );

  const handleEvolve = () => {
    if (!manualEvolve) return;
    
    const confirmMessage = evolvedPokemon 
      ? `${pokemon.nickname || pokemon.name}을(를) ${evolvedPokemon.name}(으)로 진화시키시겠습니까?`
      : '이 포켓몬을 진화시키시겠습니까?';
    
    if (window.confirm(confirmMessage)) {
      manualEvolve(pokemon);
    }
  };

  return (
    <div className="pokemon-detail-card w-full rounded-lg p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-[#26351f]" style={{ position: 'relative', top: 5 }}>포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="pokemon-detail-layout">
        {/* 포켓몬 이미지 */}
        <div className="pokemon-detail-art-wrap relative">
          <div
            className="pokemon-detail-art pokemon-bg-sprite"
            style={{
              backgroundImage: (masterData?.spriteUrl && masterData.spriteUrl !== getPokemonSpriteUrl(originalNumber) && !pokemon.spriteSize) ? 'none' : `url(${effectiveSpriteUrl})`,
              backgroundSize: pokemon.spriteSize ? `${pokemon.spriteSize}%` : '80%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
            }}
          >
            {(masterData?.spriteUrl && masterData.spriteUrl !== getPokemonSpriteUrl(originalNumber) && !pokemon.spriteSize && masterSpriteSize) && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={effectiveSpriteUrl}
                  alt=""
                  style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    width: masterSpriteSize.w,
                    height: masterSpriteSize.h,
                  }}
                />
              </div>
            )}
            {canEvolve && !isHoldingEverstone && evolvedPokemon && (
              <div className="absolute top-2 left-2" style={{ zIndex: 10 }}>
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow flex items-center gap-1">
                  <Sparkles size={12} className="text-white animate-pulse" />
                  진화 가능
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 정보 영역 */}
        <div className="pokemon-detail-content">
          {/* 기본 정보 */}
          <div style={pokemon.isPartner ? { paddingTop: 15 } : undefined}>
            <div className="flex items-center mb-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded font-semibold">
                  No.{displayNumber.toString().padStart(3, '0')}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded font-bold shadow-sm"
                  style={{ backgroundColor: typeColors.bg, color: typeColors.text }}
                >
                  {pokemon.type}
                </span>
                {pokemon.type2 && (
                  <span
                    className="text-xs px-2 py-1 rounded font-bold shadow-sm"
                    style={{ backgroundColor: type2Colors.bg, color: type2Colors.text }}
                  >
                    {pokemon.type2}
                  </span>
                )}
                <span className="text-xs text-gray-500">{getBaseName(pokemon)}</span>
              </div>

              {/* 아이콘 버튼 그룹 */}
              <div className="flex items-center gap-2">
                {!pokemon.isPartner && (
                  mobile ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMobileMenu((value) => !value)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="메뉴"
                      >
                        <Menu size={20} />
                      </button>

                      {showMobileMenu && (
                        <div className="pokemon-detail-exp-popover right-0 left-auto w-64 p-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[#dfe9c8]">
                            <strong>메뉴</strong>
                            <button
                              type="button"
                              onClick={() => setShowMobileMenu(false)}
                              className="text-[#789252] hover:text-[#2f4a24]"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="border-b border-[#eef3e0]">
                            <button
                              type="button"
                              onClick={() => setShowExpPanel((value) => !value)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#2f4a24] hover:bg-[#f2f8e6]"
                              title={levelExpTitle}
                            >
                              <ArrowUp size={18} />
                              레벨업
                            </button>
                            {showExpPanel && (
                              <div className="px-3 pb-3">
                                {renderExpAllocationBody()}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => { onMove(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#2f4a24] hover:bg-[#f2f8e6] border-b border-[#eef3e0]"
                          >
                            {isInParty ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                            {isInParty ? '박스로 이동' : '엔트리로 이동'}
                          </button>

                          {canChangeForm && (
                            <div className="border-b border-[#eef3e0]">
                              <button
                                type="button"
                                onClick={() => setShowFormPanel((value) => !value)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#2f4a24] hover:bg-[#f2f8e6]"
                              >
                                <RefreshCw size={18} />
                                폼체인지
                              </button>
                              {showFormPanel && (
                                <div className="px-3 pb-3">
                                  {renderFormListBody()}
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => { onRelease(); setShowMobileMenu(false); }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#6f8f25] hover:bg-[#f2f8e6]"
                          >
                            <Trees size={18} />
                            방생
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowExpPanel((value) => !value)}
                          className="rounded-lg transition-colors hover:bg-yellow-50"
                          style={{ width: 36, height: 36, padding: 0, overflow: 'hidden', '--serebii-item-image-size': '22px' }}
                          title={levelExpTitle}
                        >
                          <img
                            src="https://www.serebii.net/itemdex/sprites/sv/exp.candyxl.png"
                            alt="경험사탕 XL"
                            width={22}
                            height={22}
                            style={{ width: 22, height: 22, margin: '5px 3px 1px 3px', imageRendering: 'pixelated', display: 'block' }}
                          />
                        </button>

                        {showExpPanel && (
                          <div className="pokemon-detail-exp-popover">
                            <div className="flex items-center justify-between gap-3">
                              <strong>경험치 배분</strong>
                              <button
                                type="button"
                                onClick={() => setShowExpPanel(false)}
                                className="text-[#789252] hover:text-[#2f4a24]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            {renderExpAllocationBody()}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={onMove}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={isInParty ? '박스로 이동' : '엔트리로 이동'}
                      >
                        {isInParty ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                      </button>

                      {canChangeForm && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowFormPanel((value) => !value)}
                            className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="폼체인지"
                          >
                            <RefreshCw size={20} />
                          </button>

                          {showFormPanel && (
                            <div className="pokemon-detail-exp-popover right-0 left-auto w-60">
                              <div className="flex items-center justify-between gap-3">
                                <strong>폼체인지</strong>
                                <button
                                  type="button"
                                  onClick={() => setShowFormPanel(false)}
                                  className="text-[#789252] hover:text-[#2f4a24]"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              {renderFormListBody()}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={onRelease}
                        className="p-2 rounded-lg transition-colors text-[#6f8f25] hover:bg-[#eef7df]"
                        title="포켓몬 방생"
                      >
                        <Trees size={20} />
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
            
            {/* 닉네임 편집 */}
            {isEditingNickname ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="text-2xl font-bold border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveNickname()}
                />
                <button onClick={handleSaveNickname} className="text-green-600 hover:text-green-700">
                  <Check size={20} />
                </button>
                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: -4 }}>
                {ballImage && (
                    <div
                      className="item-sprite"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundImage: `url(${ballImage})`,
                        backgroundSize: '110%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  )}
                  <h2 className="flex min-w-0 items-baseline gap-1 text-2xl font-bold text-gray-800">
                    <span className="truncate">{nickname}</span>
                  </h2>
                {/* ✨ 반짝이 아이콘 */}
                {pokemon.isShiny && (
                  <Sparkles className="text-yellow-500 animate-pulse" size={20} />
                )}
                {pokemon.isPartner && (
                  <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Heart size={12} fill="currentColor" /> 파트너
                  </span>
                )}
                <button onClick={() => setIsEditingNickname(true)} className="text-gray-400 hover:text-gray-600">
                  <Edit2 size={16} />
                </button>
                {/* 성별 아이콘 */}
                {pokemon.gender === 'male' && (
                  <svg className="ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/>
                  </svg>
                )}
                {pokemon.gender === 'female' && (
                  <svg className="ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
                  </svg>
                )}
              </div>
              {/* 레벨 */}
              <div className="mt-3">
                <div className="text-lg font-bold text-gray-600">Lv. {pokemon.level}</div>
                <div className="text-xs font-semibold text-gray-500">
                  {expToNextLevel !== null ? `다음 레벨까지 ${expToNextLevel} 경험치` : 'MAX'}
                </div>
              </div>
              </>
            )}

          </div>

          {/* 탭 바 */}
          <div className="flex justify-end border-b border-gray-200 mt-3">
            {[
              { key: 'skills', label: '기술', icon: <Sword size={14} /> },
              { key: 'info', label: '정보', icon: <Info size={14} /> },
              { key: 'memo', label: '메모', icon: <FileText size={14} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-base font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === key
                    ? 'border-gray-500 text-gray-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center gap-1">{icon} {label}</span>
              </button>
            ))}
          </div>

          {/* 기술 탭 */}
          {activeTab === 'skills' && (
            <div className="space-y-3 mt-3">
              {/* 기술 */}
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">배운 기술 ({pokemon.moves?.length || 0}/4)</h3>
                  {(isAdmin || isOwner) && (!pokemon.moves || pokemon.moves.length < 4) && (
                    <button onClick={() => setShowMoveSelectModal(true)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 font-semibold transition-colors">+ 기술 추가</button>
                  )}
                </div>
                <MovesList moves={pokemon.moves || []} onForgetMove={(isAdmin || isOwner) && onForgetMove ? (moveId) => onForgetMove(pokemon.uniqueId, moveId) : undefined} canEdit={(isAdmin || isOwner) && !!onForgetMove} allMoves={allMoves} />
              </div>
            </div>
          )}

          {/* 정보 탭 */}
          {activeTab === 'info' && (
            <div className="space-y-3 mt-3">
              {/* 친밀도 한 줄 */}
              <div className="bg-pink-50 rounded-lg px-3 py-2 border border-pink-200 flex items-center gap-3">
                <Heart size={12} className="text-pink-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">친밀도</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-pink-500 h-2 rounded-full transition-all" style={{ width: `${((pokemon.friendship || 0) / 255) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-500 flex-shrink-0">{pokemon.friendship || 0}/255</span>
              </div>

              {/* 도구 + 특성 2열 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-600 font-semibold">지니고 있는 도구</div>
                    {pokemon.heldItem && (
                      <button onClick={() => onTakeItem(pokemon.uniqueId)} className="text-xs text-gray-500 hover:text-gray-700 font-semibold">회수</button>
                    )}
                  </div>
                  {heldItemData ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="item-sprite" style={{ width: '24px', height: '24px', backgroundImage: `url(${heldItemData.spriteUrl})`, backgroundSize: 'contain', backgroundPosition: 'center' }} />
                        <div className="text-sm font-bold text-gray-700 truncate">{heldItemData.name}</div>
                      </div>
                      <div className="text-sm text-gray-600 leading-tight">{heldItemData.effect || '효과 정보 없음'}</div>
                    </div>
                  ) : pokemon.heldItem ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-lg">🎒</div>
                        <div className="text-sm font-bold text-gray-700 truncate">{pokemon.heldItem}</div>
                      </div>
                      <div className="text-xs text-gray-400 italic">정보 없음</div>
                    </div>
                  ) : (
                    <select onChange={(e) => { if (e.target.value) { onGiveItem(pokemon.uniqueId, e.target.value); e.target.value = ''; } }} className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none">
                      <option value="">아이템 선택...</option>
                      {items.map((item, idx) => <option key={idx} value={item.name}>{item.name} (×{item.count})</option>)}
                    </select>
                  )}
                </div>
                <div className={`rounded-lg border p-3 ${pokemon.isHiddenAbility ? 'bg-yellow-50 border-yellow-200' : 'bg-indigo-50 border-indigo-100'}`}>
                  {pokemon.ability ? (
                    <>
                      <div className="flex items-center gap-1 mb-1">
                        {pokemon.isHiddenAbility && <span className="text-yellow-500">⭐</span>}
                        <span className={`text-base font-bold ${pokemon.isHiddenAbility ? 'text-yellow-700' : 'text-indigo-700'}`}>{abilityData?.name || pokemon.ability}</span>
                      </div>
                      {abilityDescription && <div className="text-sm text-gray-500 leading-relaxed">{abilityDescription}</div>}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 italic">특성 없음</div>
                  )}
                </div>
              </div>

              {/* 진화 알림 */}
              {canEvolve && !isHoldingEverstone && evolvedPokemon && (
                <div className="bg-green-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={20} className="text-white animate-pulse" />
                      <div>
                        <div className="text-sm font-bold text-white">진화 가능!</div>
                        <div className="text-xs text-white/80">{getBaseName(evolvedPokemon)}(으)로 진화할 수 있습니다</div>
                      </div>
                    </div>
                    <button onClick={handleEvolve} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2">
                      <Zap size={16} />진화하기
                    </button>
                  </div>
                </div>
              )}

              {isHoldingEverstone && (
                <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300">
                  <div className="flex items-center gap-2">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/everstone.png" alt="변함없는돌" style={{ width: 36, height: 36, imageRendering: 'pixelated' }} />
                    <div>
                      <div className="text-sm font-bold text-gray-700">변함없는돌 착용 중</div>
                      <div className="text-xs text-gray-600">이 포켓몬은 진화하지 않습니다</div>
                    </div>
                  </div>
                </div>
              )}


              {/* 컨디션 & 노력치 그래프 */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="bg-purple-50 rounded-lg p-3 pt-6 border border-purple-200 flex flex-col justify-center" onMouseLeave={() => { setHoveredCondition(null); setTooltipType(''); }}>
                  <div className="w-full h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={hasAnyCondition ? conditionData : conditionData.map(d => ({ ...d, A: 0.01 }))} tabIndex={-1}>
                        <PolarGrid stroke="#f472b6" strokeWidth={1.5} strokeOpacity={0.3} radialLines={false} />
                        <PolarAngleAxis dataKey="subject" tick={renderConditionTick} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                        <Radar dataKey="A" stroke="#f472b6" strokeWidth={1} fill="#f472b6" fillOpacity={hasAnyCondition ? 0.5 : 0} activeDot={false} dot={false} isAnimationActive={false} />
                      </RadarChart>
                    </ResponsiveContainer>
                    {hoveredCondition !== null && tooltipType === 'condition' && ReactDOM.createPortal(
                      <div className="fixed z-[9999] pointer-events-none" style={{ left: mousePos.x, top: mousePos.y - 36, transform: 'translateX(-50%)', animation: 'none' }}>
                        <div className="px-2 py-1 rounded text-white text-xs font-semibold" style={{ backgroundColor: '#ec4899' }}>{hoveredCondition}</div>
                        <div className="w-0 h-0 mx-auto" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #ec4899', marginTop: '-1px' }} />
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 pt-6 border border-blue-200 flex flex-col justify-center" onMouseLeave={() => { setHoveredEffort(null); setTooltipType(''); }}>
                  <div className="w-full h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={effortData}>
                        <PolarGrid stroke="#60a5fa" strokeWidth={1.5} strokeOpacity={0.3} radialLines={false} gridType="polygon" />
                        <PolarAngleAxis dataKey="subject" tick={renderEffortTick} />
                        <PolarRadiusAxis angle={90} domain={[0, 255]} tickCount={5} tick={false} />
                        <Radar dataKey="A" stroke="#60a5fa" strokeWidth={1} fill="#60a5fa" fillOpacity={0.5} activeDot={false} dot={false} isAnimationActive={false} />
                      </RadarChart>
                    </ResponsiveContainer>
                    {hoveredEffort !== null && tooltipType === 'effort' && ReactDOM.createPortal(
                      <div className="fixed z-[9999] pointer-events-none" style={{ left: mousePos.x, top: mousePos.y - 36, transform: 'translateX(-50%)', animation: 'none' }}>
                        <div className="px-2 py-1 rounded text-white text-xs font-semibold" style={{ backgroundColor: '#3b82f6' }}>{hoveredEffort}</div>
                        <div className="w-0 h-0 mx-auto" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #3b82f6', marginTop: '-1px' }} />
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 메모 탭 */}
          {activeTab === 'memo' && (
            <div className="space-y-3 mt-3">
              <div className="rounded-lg bg-gray-50 border border-gray-200 py-3 px-4 relative">
                {!isEditingMemo && (
                  <button
                    onClick={() => { setMemoText(pokemon.memo || ''); setIsEditingMemo(true); }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    title="메모 편집"
                    type="button"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {!pokemon.isPartner && pokemon.sizeRank && (
                  <div className="text-base text-gray-500 leading-relaxed italic mb-2">
                    <div>
                      {pokemon.isFromEgg
                        ? (pokemon.parents?.parent1 || pokemon.parents?.parent2)
                          ? `캠핑에서 생긴 알이 레벨 ${pokemon.level}로 부화했다.`
                          : `특별한 만남을 가지고 레벨 ${pokemon.level}로 알에서 부화했다.`
                        : pokemon.isAdminGiven
                          ? `레벨 ${pokemon.level}에 특별한 만남을 가졌다.`
                          : `레벨 ${pokemon.level}에 ${pokemon.caughtLocation || pokemon.metLocation || '야생'}에서 만났다.`
                      }
                    </div>
                    {pokemon.isFromEgg && (pokemon.parents?.parent1 || pokemon.parents?.parent2) && (
                      <div>
                        {(() => {
                          const p = pokemon.parents;
                          const p1 = p.trainer1 ? `${p.trainer1}의 ${p.parent1}` : p.parent1;
                          const p2 = p.trainer2 ? `${p.trainer2}의 ${p.parent2}` : p.parent2;
                          if (p1 && p2) return `${p1}와(과) ${p2}와(과) 성격이 닮은 것 같다.`;
                          return `${p1 || p2}와 성격이 닮은 것 같다.`;
                        })()}
                      </div>
                    )}
                    <div>{getSizeDescription(pokemon.sizeRank, pokemon.formVariant)}{pokemon.favoriteFlavor ? ` ${pokemon.favoriteFlavor}을 좋아한다.` : ''}</div>
                  </div>
                )}
                {isEditingMemo ? (
                  <div className="mt-1">
                    <textarea
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      placeholder="메모를 입력하세요..."
                      autoFocus
                      className="w-full h-20 rounded border border-gray-200 bg-white p-2 text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:border-gray-400"
                    />
                    <div className="flex gap-2 mt-1 justify-end">
                      <button
                        onClick={() => setIsEditingMemo(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                        type="button"
                      >취소</button>
                      <button
                        onClick={() => { onUpdateMemo && onUpdateMemo(pokemon.uniqueId, memoText); setIsEditingMemo(false); }}
                        className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                        type="button"
                      >저장</button>
                    </div>
                  </div>
                ) : (
                  pokemon.memo && <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap mt-1">{pokemon.memo}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모달들 */}
      {showMoveSelectModal && allMoves && (
        <MoveSelectModal
          pokemon={pokedexEntry ? { ...pokemon, ...pokedexEntry } : pokemon}
          allMoves={allMoves}
          pokemonLearnsets={pokemonLearnsets}
          currentMoves={pokemon.moves || []}
          levelUpOnly={!isAdmin}
          maxLevel={!isAdmin ? (pokemon.level || 100) : undefined}
          onSelect={(move) => {
            if (onLearnMove) {
              onLearnMove(pokemon.uniqueId, move);
            }
            setShowMoveSelectModal(false);
          }}
          onClose={() => setShowMoveSelectModal(false)}
        />
      )}

      {showLevelUpMoveModal && levelUpData && (
        <LevelUpMoveModal
          key={levelUpData.currentMove?.id || levelUpData.currentMove?.moveId || levelUpData.pendingMoves?.length}
          pokemon={pokemon}
          newLevel={levelUpData.newLevel}
          learnableMoves={[levelUpData.currentMove].filter(Boolean)}
          remainingCount={levelUpData.pendingMoves?.length || 1}
          currentMoves={levelUpData.currentMoves || []}
          onLearn={handleLearnMove}
          onSkip={() => {
            alert(`${pokemon.nickname || pokemon.name}은(는) ${levelUpData.currentMove?.name}을(를) 배우지 않았습니다.`);
            advanceLevelUpMoveQueue(levelUpData.currentMoves || []);
          }}
        />
      )}
    </div>
  );
}
