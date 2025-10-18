// src/components/views/pokemon/PokemonDetailPanel.jsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trash2, 
  Heart, 
  X, 
  Edit2, 
  Check,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { getTypeColor } from '../../../styles/theme';
import MovesList from './MovesList';
import MoveSelectModal from './MoveSelectModal';
import LevelUpMoveModal from './LevelUpMoveModal';

const getPokemonSpriteUrl = (number) => 
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;

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
  onSetPartner,
  onForgetMove,
  onLearnMove,   
  isAdmin = false,
  allMoves = [],      
  pokemonLearnsets = {},
  onUseItemOnPokemon,
  checkEvolution,
  manualEvolve,
  allPokemonMaster = []
}) {
  // State
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(pokemon.nickname || pokemon.name);
  const [showMoveSelectModal, setShowMoveSelectModal] = useState(false);
  const [showLevelUpMoveModal, setShowLevelUpMoveModal] = useState(false); 
  const [levelUpData, setLevelUpData] = useState(null);
  
  // 툴팁용 state 추가
  const [hoveredCondition, setHoveredCondition] = useState(null);
  const [hoveredEffort, setHoveredEffort] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tooltipType, setTooltipType] = useState(''); 

  // 진화 가능 여부 체크
  const canEvolve = checkEvolution && checkEvolution(pokemon);
  const isHoldingEverstone = pokemon.heldItem?.toLowerCase() === 'everstone' || 
                              pokemon.heldItem?.toLowerCase() === '변함없는돌';

  // 파트너 여부 확인 (파일 상단 어딘가에 추가)
const isThisPartner = currentUser?.partnerPokemon?.uniqueId === pokemon.uniqueId;

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
        fill="#581C87"
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
        fill="#1E3A8A"
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

  // 게임 도감
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
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

  const pokeballData = pokemon.caughtWithBall && typeof pokemon.caughtWithBall === 'string'
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const ballName = pokemon.caughtWithBall.toLowerCase();
        return itemName === ballName || 
               itemNameEn === ballName ||
               itemName?.includes(ballName) ||
               itemNameEn?.includes(ballName);
      })
    : null;

  // 타입 색상
  const typeColors = getTypeColor(pokemon.type);
  const type2Colors = pokemon.type2 ? getTypeColor(pokemon.type2) : null;

  // HP 계산
  const hpPercent = Math.min(100, Math.max(0, (pokemon.hp / pokemon.maxHp) * 100));
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  // 진화 후 포켓몬 정보 가져오기
  const getEvolvedPokemon = () => {
    if (!canEvolve || !allPokemonMaster) return null;
    return allPokemonMaster.find(p => p.number === canEvolve.to);
  };

  const evolvedPokemon = getEvolvedPokemon();

  // Effects
  useEffect(() => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
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

  const handleLearnMove = (newMove, oldMoveId) => {
    if (typeof onLearnMove !== 'function') {
      alert('⚠️ 기술을 배울 수 없습니다!');
      return;
    }
    
    onLearnMove(pokemon.uniqueId, newMove, oldMoveId);
    setShowLevelUpMoveModal(false);
    setLevelUpData(null);
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
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-6">
        {/* 포켓몬 이미지 */}
        <div className="flex-shrink-0">
          <div 
            className="w-36 h-36 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 pokemon-bg-sprite"
            style={{
              backgroundImage: `url(${pokemon.spriteUrl || getPokemonSpriteUrl(originalNumber)})`,
              backgroundSize: '75%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat' 
            }}
          />
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 flex flex-col gap-3">
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
                <button
                  onClick={() => {
                    if (!hasRareCandy) return;
                    onUseCandy(pokemon.uniqueId, (pokemonId, newLevel, newMoves) => {
                      setLevelUpData({ pokemonId, newLevel, newMoves });
                      setShowLevelUpMoveModal(true);
                    });
                  }}
                  disabled={!hasRareCandy}
                  className={`p-2 rounded-lg transition-colors ${
                    hasRareCandy
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title={hasRareCandy ? '이상한사탕 사용' : '이상한사탕이 없습니다'}
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

                <button
                  onClick={() => {
                    const newStatus = !isThisPartner;
                    if (newStatus) {
                      if (window.confirm(`${pokemon.nickname || pokemon.name}를 파트너 포켓몬으로 설정하시겠습니까?\n\n파트너는 방생할 수 없으며, 1마리만 설정 가능합니다.`)) {
                        onSetPartner(pokemon.uniqueId, true);
                      }
                    } else {
                      if (window.confirm(`${pokemon.nickname || pokemon.name}의 파트너 설정을 해제하시겠습니까?`)) {
                        onSetPartner(pokemon.uniqueId, false);
                      }
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isThisPartner
                      ? 'text-pink-600 hover:bg-pink-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                  title={isThisPartner ? '파트너 해제' : '파트너 설정'}
                >
                  <Heart size={20} fill={pokemon.isPartner ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={onMove}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title={isInParty ? '박스로 이동' : '엔트리로 이동'}
                >
                  {isInParty ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </button>

                <button
                  onClick={onRelease}
                  disabled={pokemon.isPartner}
                  className={`p-2 rounded-lg transition-colors ${
                    pokemon.isPartner
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                  title={pokemon.isPartner ? '파트너 포켓몬은 방생할 수 없습니다' : '포켓몬 방생'}
                >
                  <Trash2 size={20} />
                </button>
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
                {pokeballData && (
                  <div 
                    className="item-sprite"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundImage: `url(${pokeballData.spriteUrl})`,
                      backgroundSize: '110%',
                      backgroundPosition: 'center'
                    }}
                  />
                )}
                <h2 className="text-2xl font-bold text-gray-800">{nickname}</h2>
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
          </div>

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
                      stroke="#9333EA"
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
                      stroke="#A855F7"
                      strokeWidth={1} 
                      fill="#A855F7" 
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
                      style={{ backgroundColor: '#A855F7' }}
                    >
                      {hoveredCondition}
                    </div>
                    <div 
                      className="w-0 h-0 mx-auto"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #A855F7',
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
                      stroke="#2563EB"
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
                      stroke="#3B82F6"
                      strokeWidth={1} 
                      fill="#3B82F6" 
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
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      {hoveredEffort}
                    </div>
                    <div 
                      className="w-0 h-0 mx-auto"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #3B82F6',
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
          pokemon={pokemon}
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
          pokemon={pokemon}
          newLevel={levelUpData.newLevel}
          learnableMoves={levelUpData.newMoves}
          currentMoves={pokemon.moves?.map(m => {
            const moveData = allMoves.find(move => move.id === m.moveId);
            return moveData ? { ...moveData, currentPp: m.currentPp, learnedAt: m.learnedAt } : null;
          }).filter(Boolean) || []}
          onLearn={handleLearnMove}
          onSkip={() => {
            setShowLevelUpMoveModal(false);
            setLevelUpData(null);
            alert(`${pokemon.nickname || pokemon.name}은(는) ${levelUpData.newMoves[0]?.name}을(를) 배우지 않았습니다.`);
          }}
        />
      )}
    </div>
  );
}