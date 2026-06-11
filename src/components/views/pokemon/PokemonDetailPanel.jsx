// src/components/views/pokemon/PokemonDetailPanel.jsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Heart, 
  Trees,
  X, 
  Edit2, 
  Check,
  Sparkles,
  Zap,
  RefreshCw
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
  onChangeForm
}) {
  // State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname || pokemon.name);
  const [showMoveSelectModal, setShowMoveSelectModal] = useState(false);
  const [showLevelUpMoveModal, setShowLevelUpMoveModal] = useState(false); 
  const [levelUpData, setLevelUpData] = useState(null);
  const [expInput, setExpInput] = useState('');
  const [showExpPanel, setShowExpPanel] = useState(false);
  const [showFormPanel, setShowFormPanel] = useState(false);
  
  // 툴팁용 state 추가
  const [hoveredCondition, setHoveredCondition] = useState(null);
  const [hoveredEffort, setHoveredEffort] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tooltipType, setTooltipType] = useState(''); 

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
  const conditionData = [
    { subject: '근사함', A: pokemon.condition?.elegance || 0, fullMark: 100 },
    { subject: '아름다움', A: pokemon.condition?.beauty || 0, fullMark: 100 },
    { subject: '귀여움', A: pokemon.condition?.cuteness || 0, fullMark: 100 },
    { subject: '슬기로움', A: pokemon.condition?.intelligence || 0, fullMark: 100 },
    { subject: '강인함', A: pokemon.condition?.strength || 0, fullMark: 100 }
  ];

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
    
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#4f741f"
        fontSize={9}
        fontWeight={600}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          if (e && e.target) {
            const rect = e.target.getBoundingClientRect();
            setHoveredEffort(null);
            setHoveredCondition(item?.A || 0);
            setTooltipType('condition');
            setMousePos({ 
              x: rect.left + rect.width / 2,
              y: rect.top
            });
          }
        }}
        onMouseLeave={() => {
          setHoveredCondition(null);
          setTooltipType('');
          setMousePos({ x: 0, y: 0 });
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
        fill="#4f741f"
        fontSize={9}
        fontWeight={600}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          if (e && e.target) {
            const rect = e.target.getBoundingClientRect();
            setHoveredCondition(null);
            setHoveredEffort(item?.A || 0);
            setTooltipType('effort');
            setMousePos({ 
              x: rect.left + rect.width / 2,
              y: rect.top
            });
          }
        }}
        onMouseLeave={() => {
          setHoveredEffort(null);
          setTooltipType('');
          setMousePos({ x: 0, y: 0 });
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
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;
  const originalNumber = pokedexEntry?.originalNumber || pokemon.number;

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

  // Effects
  useEffect(() => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
    setExpInput('');
    setShowExpPanel(false);
    setShowFormPanel(false);
  }, [pokemon.uniqueId, pokemon.nickname, pokemon.name]);

  // Handlers
  const handleSaveNickname = () => {
    if (nickname.trim()) {
      onUpdateNickname(pokemon.uniqueId, nickname.trim());
      setIsEditingNickname(false);
    }
  };

  const handleCancelEdit = () => {
    setNickname(pokemon.nickname || pokemon.name);
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
    if (changed) setShowFormPanel(false);
  };

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
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-[#26351f]">포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="pokemon-detail-layout">
        {/* 포켓몬 이미지 */}
        <div className="pokemon-detail-art-wrap">
          <div 
            className="pokemon-detail-art pokemon-bg-sprite"
            style={{
              backgroundImage: `url(${pokemon.spriteUrl || getPokemonSpriteUrl(originalNumber)})`,
              backgroundSize: '75%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat' 
            }}
          />
        </div>

        {/* 정보 영역 */}
        <div className="pokemon-detail-content">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-gray-500">{pokemon.name}</span>
              </div>

              {/* 아이콘 버튼 그룹 */}
              <div className="flex items-center gap-2">
                {!pokemon.isPartner && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExpPanel((value) => !value)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title={levelExpTitle}
                  >
                    {rareCandyImage ? (
                      <div
                        className="w-6 h-6"
                        style={{
                          backgroundImage: `url(${rareCandyImage})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          imageRendering: 'pixelated'
                        }}
                      />
                    ) : (
                      <span className="text-xl">🍬</span>
                    )}
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
                      <div className="mt-2 text-xs font-semibold text-[#9a6b00]">
                        다음 레벨업까지 필요 경험치 {expToNextLevel ?? '-'}
                      </div>
                    </div>
                  )}
                </div>
                )}
                {!pokemon.isPartner && (
                  <>
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
                            <div className="mt-3 space-y-2">
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
                                    <span className="block truncate text-sm font-bold text-[#26351f]">{form.name}</span>
                                    <span className="block truncate text-xs text-[#6f8150]">
                                      {form.type}{form.type2 ? ` / ${form.type2}` : ''}
                                    </span>
                                  </span>
                                </button>
                              ))}
                            </div>
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
              <div className="flex items-center gap-2 mb-1">
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

                  {/* ⭐ 성별 아이콘 추가 */}
                  {(pokemon.gender === 'male' || pokemon.gender === 'female') && (
                    <span className={`text-2xl font-bold ${getGenderColor(pokemon.gender)}`}>
                      {getGenderIcon(pokemon.gender)}
                    </span>
                  )}
                {/* ✨ 반짝이 아이콘 */}
                {pokemon.isShiny && (
                  <Sparkles className="text-yellow-500 animate-pulse" size={20} />
                )}
                {pokemon.isPartner && (
                  <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    💖 파트너
                  </span>
                )}
                <button onClick={() => setIsEditingNickname(true)} className="text-gray-400 hover:text-gray-600">
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            
            <div className="text-lg text-gray-600">Lv. {pokemon.level}</div>
            <div className="text-xs font-semibold text-yellow-700">
              {expToNextLevel !== null ? `다음 레벨업까지 필요 경험치 ${expToNextLevel}` : '레벨업 불가'}
            </div>
          </div>
            {/* ⭐ 크기/특성 정보 추가 */}
{(pokemon.sizeRank || pokemon.ability) && (
  <div className="grid grid-cols-2 gap-3 mt-2">
    {/* 크기 정보 */}
    {pokemon.sizeRank && (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="text-xs text-gray-500 mb-1">크기</div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-lg font-bold ${getSizeColor(pokemon.sizeRank)}`}>
            {pokemon.sizeRank}
          </span>
          <span className="text-xs text-gray-500">
            {getSizeRarity(pokemon.sizeRank)}
          </span>
        </div>
      </div>
    )}

    {/* 특성 정보 */}
    {pokemon.ability && (
      <div className={`rounded-lg p-3 border-2 ${
        pokemon.isHiddenAbility 
          ? 'bg-yellow-50 border-yellow-400' 
          : 'bg-indigo-50 border-indigo-200'
      }`}>
        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          특성
          {pokemon.isHiddenAbility && (
            <span className="text-yellow-600 font-bold">⭐</span>
          )}
        </div>
        <div className={`font-bold text-sm ${
          pokemon.isHiddenAbility ? 'text-yellow-700' : 'text-indigo-700'
        }`}>
          {abilityData?.name || pokemon.ability}
        </div>
        {abilityDescription && (
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            {abilityDescription}
          </p>
        )}
      </div>
    )}
  </div>
)}

          {/* 진화 알림 */}
          {canEvolve && !isHoldingEverstone && evolvedPokemon && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border-2 border-yellow-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-600 animate-pulse" />
                  <div>
                    <div className="text-sm font-bold text-yellow-800">진화 가능!</div>
                    <div className="text-xs text-yellow-700">
                      {evolvedPokemon.name}(으)로 진화할 수 있습니다
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleEvolve}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Zap size={16} />
                  진화하기
                </button>
              </div>
            </div>
          )}

          {isHoldingEverstone && (
            <div className="bg-gray-50 rounded-lg p-3 border-2 border-gray-300">
              <div className="flex items-center gap-2">
                <div className="text-lg">🪨</div>
                <div>
                  <div className="text-sm font-bold text-gray-700">변함없는돌 착용 중</div>
                  <div className="text-xs text-gray-600">이 포켓몬은 진화하지 않습니다</div>
                </div>
              </div>
            </div>
          )}

          {/* 컨디션 & 노력치 그래프 */}
          <div className="grid grid-cols-2 gap-3 focus:ring-transparent focus:ring-0">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 focus:ring-transparent focus:ring-0"
                 onMouseLeave={() => {
                  setHoveredCondition(null);
                  setTooltipType('');
                }}>
              <div className="w-full h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={conditionData} tabIndex={-1}>
                    <PolarGrid 
                      stroke="#7fa438"
                      strokeWidth={1.5}
                      strokeOpacity={0.3}
                      radialLines={false}
                    />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={renderConditionTick}
                    />
                    <PolarRadiusAxis 
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                    />
                    <Radar 
                      dataKey="A" 
                      stroke="#7fa438"
                      strokeWidth={1} 
                      fill="#c7e57d"
                      fillOpacity={1}
                      activeDot={false}
                      dot={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                
                {hoveredCondition !== null && tooltipType === 'condition' && (
                  <div 
                    className="fixed z-50 pointer-events-none"
                    style={{ 
                      left: mousePos.x,
                      top: mousePos.y - 35,
                      transform: 'translateX(-50%)',
                      animation: 'none'
                    }}
                  >
                    <div 
                      className="px-2 py-1 rounded text-white text-xs font-semibold"
                      style={{ backgroundColor: '#6f8f25' }}
                    >
                      {hoveredCondition}
                    </div>
                    <div 
                      className="w-0 h-0 mx-auto"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #6f8f25',
                        marginTop: '-1px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 focus:outline-none focus:ring-0"
                 onMouseLeave={() => {
                  setHoveredEffort(null);
                  setTooltipType('');
                }}>
              <div className="w-full h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={effortData}>
                    <PolarGrid 
                      stroke="#7fa438"
                      strokeWidth={1.5}
                      strokeOpacity={0.3}
                      radialLines={false}
                      gridType="polygon"
                    />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={renderEffortTick}
                    />
                    <PolarRadiusAxis 
                      angle={90}
                      domain={[0, 255]}
                      tickCount={5}
                      tick={false}
                    />
                    <Radar 
                      dataKey="A" 
                      stroke="#4f741f"
                      strokeWidth={1} 
                      fill="#9fcf45"
                      fillOpacity={1}
                      activeDot={false}
                      dot={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                
                {hoveredEffort !== null && tooltipType === 'effort' && (
                  <div 
                    className="fixed z-50 pointer-events-none"
                    style={{ 
                      left: mousePos.x,
                      top: mousePos.y - 35,
                      transform: 'translateX(-50%)',
                      animation: 'none'
                    }}
                  >
                    <div 
                      className="px-2 py-1 rounded text-white text-xs font-semibold"
                      style={{ backgroundColor: '#4f741f' }}
                    >
                      {hoveredEffort}
                    </div>
                    <div 
                      className="w-0 h-0 mx-auto"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #4f741f',
                        marginTop: '-1px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 기술 섹션 */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                ⚔️ 배운 기술 ({pokemon.moves?.length || 0}/4)
              </h3>
              {isAdmin && (!pokemon.moves || pokemon.moves.length < 4) && (
                <button
                  onClick={() => setShowMoveSelectModal(true)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 font-semibold transition-colors"
                >
                  + 기술 추가
                </button>
              )}
            </div>
            <MovesList
              moves={pokemon.moves || []}
              onForgetMove={onForgetMove ? (moveId) => onForgetMove(pokemon.uniqueId, moveId) : undefined}
              canEdit={!!onForgetMove}
              allMoves={allMoves} 
            />
          </div>

          {/* 지니고 있는 도구 + 친밀도 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-600 font-semibold">지니고 있는 도구</div>
                {pokemon.heldItem && (
                  <button
                    onClick={() => onTakeItem(pokemon.uniqueId)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    회수
                  </button>
                )}
              </div>
              
              {heldItemData ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="item-sprite"
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundImage: `url(${heldItemData.spriteUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="text-sm font-bold text-blue-600 truncate">
                      {heldItemData.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 leading-tight">
                    {heldItemData.effect || '효과 정보 없음'}
                  </div>
                </div>
              ) : pokemon.heldItem ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-lg">🎒</div>
                    <div className="text-sm font-bold text-blue-600 truncate">
                      {pokemon.heldItem}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 italic">정보 없음</div>
                </div>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onGiveItem(pokemon.uniqueId, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">아이템 선택...</option>
                  {items.map((item, idx) => (
                    <option key={idx} value={item.name}>
                      {item.name} (×{item.count})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
              <div className="flex items-center gap-1 mb-2">
                <Heart size={12} className="text-pink-500" />
                <span className="text-xs font-semibold text-gray-700">친밀도</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all" 
                  style={{ width: `${((pokemon.friendship || 0) / 255) * 100}%` }} 
                />
              </div>
              <div className="text-xs text-gray-600 text-right">
                {pokemon.friendship || 0}/255
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {showMoveSelectModal && allMoves && (
        <MoveSelectModal
          pokemon={pokedexEntry ? { ...pokemon, ...pokedexEntry } : pokemon}
          allMoves={allMoves}
          pokemonLearnsets={pokemonLearnsets}
          currentMoves={pokemon.moves || []} 
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
