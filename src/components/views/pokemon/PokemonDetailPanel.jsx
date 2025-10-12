import React, { useState, useEffect } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trash2, 
  Heart, 
  X, 
  Edit2, 
  Check 
} from 'lucide-react';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip 
} from 'recharts';
import MovesList from './MovesList';
import MoveSelectModal from './MoveSelectModal'; // 
import LevelUpMoveModal from './LevelUpMoveModal';

// 이미지 URL 생성 헬퍼
const getPokemonSpriteUrl = (number) => 
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;

// 타입별 색상
const TYPE_COLORS = {
  '노말': { bg: '#A8A878', text: '#FFF' },
  '불꽃': { bg: '#F08030', text: '#FFF' },
  '물': { bg: '#6890F0', text: '#FFF' },
  '전기': { bg: '#F8D030', text: '#FFF' },
  '풀': { bg: '#78C850', text: '#FFF' },
  '얼음': { bg: '#98D8D8', text: '#FFF' },
  '격투': { bg: '#C03028', text: '#FFF' },
  '독': { bg: '#A040A0', text: '#FFF' },
  '땅': { bg: '#E0C068', text: '#FFF' },
  '비행': { bg: '#A890F0', text: '#FFF' },
  '에스퍼': { bg: '#F85888', text: '#FFF' },
  '벌레': { bg: '#A8B820', text: '#FFF' },
  '바위': { bg: '#B8A038', text: '#FFF' },
  '고스트': { bg: '#705898', text: '#FFF' },
  '드래곤': { bg: '#7038F8', text: '#FFF' },
  '악': { bg: '#705848', text: '#FFF' },
  '강철': { bg: '#B8B8D0', text: '#FFF' },
  '페어리': { bg: '#EE99AC', text: '#FFF' }
};

// 그래프 툴팁 커스터마이징
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 p-3 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 mb-1">{payload[0].payload.subject}</p>
        <p className="text-indigo-600 text-sm">
          수치: {payload[0].value} / {payload[0].payload.fullMark}
        </p>
      </div>
    );
  }
  return null;
};

export default function PokemonDetailPanel({ 
  pokemon, 
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
  pokemonLearnsets = {} 
}) {

  console.log('🔍 isAdmin:', isAdmin);
console.log('🔍 pokemon.moves:', pokemon.moves);
console.log('🔍 pokemon.moves?.length:', pokemon.moves?.length);


const [isEditingNickname, setIsEditingNickname] = useState(false);
const [nickname, setNickname] = useState(pokemon.nickname || pokemon.name);
const [showMoveSelectModal, setShowMoveSelectModal] = useState(false);
const [showLevelUpMoveModal, setShowLevelUpMoveModal] = useState(false);  // ⭐ 추가
const [levelUpData, setLevelUpData] = useState(null);  // ⭐ 추가


  // 컨디션 및 노력치 데이터 준비
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
    { subject: '특수공격', A: pokemon.effort?.specialAttack || 0, fullMark: 255 },
    { subject: '특수방어', A: pokemon.effort?.specialDefense || 0, fullMark: 255 },
    { subject: '스피드', A: pokemon.effort?.speed || 0, fullMark: 255 }
  ];

  // 게임 도감 및 아이템 로직
  const pokedexEntry = gamePokedex?.find(p => 
    p.number === pokemon.number || p.originalNumber === pokemon.number
  );
  const displayNumber = pokedexEntry?.newNumber || pokemon.number;
  const originalNumber = pokedexEntry?.originalNumber || pokemon.number;

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

  // 포획한 몬스터볼 이미지 가져오기
  const pokeballData = pokemon.caughtWithBall 
    ? allItems.find(item => {
        const itemName = item.name?.toLowerCase();
        const itemNameEn = item.nameEn?.toLowerCase();
        const ballName = pokemon.caughtWithBall?.toLowerCase();
        
        return itemName === ballName || 
               itemNameEn === ballName ||
               itemName?.includes(ballName) ||
               itemNameEn?.includes(ballName);
      })
    : null;

  console.log('Pokemon data:', pokemon);
  console.log('Caught with ball:', pokemon.caughtWithBall);
  console.log('Pokeball data found:', pokeballData);

  // 타입 색상 처리
  const typeColors = TYPE_COLORS[pokemon.type] || { bg: '#A8A878', text: '#FFF' };
  const type2Colors = pokemon.type2 ? (TYPE_COLORS[pokemon.type2] || { bg: '#A8A878', text: '#FFF' }) : null;

  // HP 계산
  const hpPercent = Math.min(100, Math.max(0, (pokemon.hp / pokemon.maxHp) * 100));
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 20 ? 'bg-yellow-500' : 'bg-red-500';

  useEffect(() => {
    setNickname(pokemon.nickname || pokemon.name);
    setIsEditingNickname(false);
  }, [pokemon.uniqueId, pokemon.nickname, pokemon.name]);

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


  
  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
      {/* 상단 헤더 */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">포켓몬 정보</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>



      {/* 왼쪽 이미지 + 오른쪽 전체 정보 */}
      <div className="flex gap-6">
        {/* 포켓몬 이미지 */}
        <div className="flex-shrink-0">
          <div 
            className="w-36 h-36 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg"
            style={{
              backgroundImage: `url(${pokemon.spriteUrl || getPokemonSpriteUrl(originalNumber)})`,
              backgroundSize: '75%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* 오른쪽: 모든 정보 */}
        <div className="flex-1 flex flex-col gap-3">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                No.{displayNumber.toString().padStart(3, '0')}
              </span>
    
              <span 
                className="text-xs px-2 py-1 rounded font-bold shadow-sm"
                style={{ 
                  backgroundColor: typeColors.bg,
                  color: typeColors.text
                }}
              >
                {pokemon.type}
              </span>
              {pokemon.type2 && (
                <span 
                  className="text-xs px-2 py-1 rounded font-bold shadow-sm"
                  style={{ 
                    backgroundColor: type2Colors.bg,
                    color: type2Colors.text
                  }}
                >
                  {pokemon.type2}
                </span>
              )}
              <span className="text-xs text-gray-500">{pokemon.name}</span>
            </div>
            
            {/* 별명 편집 */}
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
                <button
                  onClick={handleSaveNickname}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                {/* 몬스터볼 이미지 */}
                {pokeballData && (
                  <div 
                    className="w-6 h-6 flex-shrink-0"
                    style={{
                      backgroundImage: `url(${pokeballData.spriteUrl})`,
                      backgroundSize: '125%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
                )}
                <h2 className="text-2xl font-bold">{nickname}</h2>
                {pokemon.isPartner && (
                    <span className="bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      💖 파트너
                    </span>
                  )}
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            
            <div className="text-lg text-gray-600">Lv. {pokemon.level}</div>
          </div>

          {/* 컨디션 & 노력치 그래프 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 컨디션 그래프 */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-xs font-semibold text-gray-700 mb-2 text-center">컨디션</div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={conditionData}>
                    <PolarGrid stroke="#E2E8F0" strokeOpacity={0.5} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#6B7280', fontSize: 8 }}
                    />
                    <Radar 
                      dataKey="A" 
                      stroke="#A855F7"  
                      fill="#A855F7"   
                      fillOpacity={0.5} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 노력치 그래프 */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs font-semibold text-gray-700 mb-2 text-center">노력치</div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={effortData}>
                    <PolarGrid stroke="#E2E8F0" strokeOpacity={0.5} />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#6B7280', fontSize: 8 }}
                    />
                    <Radar 
                      dataKey="A" 
                      stroke="#3B82F6"  
                      fill="#3B82F6"   
                      fillOpacity={0.5} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
         
          </div>

          

          {/* 기술 섹션 */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                ⚔️ 배운 기술 ({pokemon.moves?.length || 0}/4)
              </h3>
                        
              {/* ⭐ 관리자 전용 버튼 */}
              
              {isAdmin && (!pokemon.moves || pokemon.moves.length < 4) && (
                     <button
                  onClick={() => setShowMoveSelectModal(true)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
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
                <div className="text-xs text-gray-600">지니고 있는 도구</div>
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
                      className="w-6 h-6 flex-shrink-0"
                      style={{
                        backgroundImage: `url(${heldItemData.spriteUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated'
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
                  <div className="text-xs text-gray-400 italic">
                    정보 없음
                  </div>
                </div>
              ) : (
                <div>
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
                </div>
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

          {/* 액션 버튼 */}
          <div className="space-y-2">
           <button
  onClick={() => {
    if (!hasRareCandy) return;
    
    console.log('🍬 이상한사탕 버튼 클릭!');
    console.log('🍬 pokemon.uniqueId:', pokemon.uniqueId);
    console.log('🍬 onUseCandy 함수:', onUseCandy);
    
    // ⭐ 레벨업 콜백 전달
    onUseCandy(pokemon.uniqueId, (pokemonId, newLevel, newMoves) => {
      console.log('🎉 레벨업 콜백 실행!');
      console.log('🎉 pokemonId:', pokemonId);
      console.log('🎉 newLevel:', newLevel);
      console.log('🎉 newMoves:', newMoves);
      
      setLevelUpData({ pokemonId, newLevel, newMoves });
      setShowLevelUpMoveModal(true);
    });
  }}
  disabled={!hasRareCandy}
              className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                hasRareCandy
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              {rareCandyImage ? (
                <div 
                  className="w-5 h-5"
                  style={{
                    backgroundImage: `url(${rareCandyImage})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
              ) : (
                <span>🍬</span>
              )}
              <span>이상한사탕 사용</span>
            </button>
            
            <button
              onClick={() => {
                const newStatus = !pokemon.isPartner;
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
              className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border ${
                pokemon.isPartner
                  ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-300'
                  : 'bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200'
              }`}
            >
              <Heart size={18} fill={pokemon.isPartner ? 'currentColor' : 'none'} />
              <span>{pokemon.isPartner ? '💔 파트너 해제' : '💖 파트너 설정'}</span>
            </button>

            <button
              onClick={onMove}
              className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-semibold hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2 border border-indigo-300"
            >
              {isInParty ? (
                <>
                  <ArrowDownCircle size={18} />
                  <span>박스로 이동</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle size={18} />
                  <span>엔트리로 이동</span>
                </>
              )}
            </button>

           <button
              onClick={onRelease}
              disabled={pokemon.isPartner}  // ⭐ 추가
              className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border ${
                pokemon.isPartner
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'  // ⭐ 수정
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
              }`}
              title={pokemon.isPartner ? '파트너 포켓몬은 방생할 수 없습니다' : ''}  // ⭐ 추가
            >
              <Trash2 size={18} />
              <span>{pokemon.isPartner ? '🔒 방생 불가' : '포켓몬 방생'}</span>  {/* ⭐ 수정 */}
            </button>

            {/* ⭐ 방생 버튼 바로 아래에 경고 메시지 추가 */}
            {pokemon.isPartner && (
              <div className="text-xs text-pink-500 text-center mt-1">
                💖 파트너 포켓몬은 방생할 수 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
 
      {/* ⭐ 기술 선택 모달 */}
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

      {/* 레벨업 기술 학습 모달 */}
{showLevelUpMoveModal && levelUpData && (
  <LevelUpMoveModal
    pokemon={pokemon}
    newLevel={levelUpData.newLevel}
    learnableMoves={levelUpData.newMoves}
    currentMoves={pokemon.moves?.map(m => {
      const moveData = allMoves.find(move => move.id === m.moveId);
      return moveData ? { ...moveData, currentPp: m.currentPp, learnedAt: m.learnedAt } : null;
    }).filter(Boolean) || []}
onLearn={(newMove, oldMoveId) => {
  console.log('🔥 === LevelUpMoveModal onLearn 실행 ===');
  console.log('🔥 newMove:', newMove);
  console.log('🔥 oldMoveId:', oldMoveId);
  console.log('🔥 onLearnMove 함수:', onLearnMove);  // ⭐ 이미 있음
  console.log('🔥 typeof onLearnMove:', typeof onLearnMove);  // ⭐ 추가!
  
  if (typeof onLearnMove !== 'function') {
    alert('❌ onLearnMove 함수가 전달되지 않았습니다!');
    return;
  }
  console.log('🚀 onLearnMove 호출 직전!');
const result = onLearnMove(pokemon.uniqueId, newMove, oldMoveId);
console.log('🚀 onLearnMove 호출 완료! 결과:', result);
  
  onLearnMove(pokemon.uniqueId, newMove, oldMoveId);
  
  setShowLevelUpMoveModal(false);
  setLevelUpData(null);
}}
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