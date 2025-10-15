import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { POKEBALL_LIST, getButtonClass, getTypeColor } from '../../../../styles/theme';
import { X, Zap, Shield, Star } from 'lucide-react';

const TYPE_COLORS = {
  '노말': '#A8A878', '불꽃': '#F08030', '물': '#6890F0', '전기': '#F8D030',
  '풀': '#78C850', '얼음': '#98D8D8', '격투': '#C03028', '독': '#A040A0',
  '땅': '#E0C068', '비행': '#A890F0', '에스퍼': '#F85888', '벌레': '#A8B820',
  '바위': '#B8A038', '고스트': '#705898', '드래곤': '#7038F8', '악': '#705848',
  '강철': '#B8B8D0', '페어리': '#EE99AC'
};

const getCategoryIcon = (category) => {
  switch (category) {
    case '물리': return <Zap size={14} className="text-orange-500" />;
    case '특수': return <Star size={14} className="text-purple-500" />;
    case '변화': return <Shield size={14} className="text-blue-500" />;
    default: return null;
  }
};

function MemberPokemonTab({ 
  member, 
  allPokemonMaster,
  allMoves = [],
  pokemonLearnsets = {},
  onGivePokemon, 
  onEditPokemon 
}) {
  const [pokemonMode, setPokemonMode] = useState('view');
  
  // 편집 모드 상태
  const [editingPokemon, setEditingPokemon] = useState(null);
  const [editLevel, setEditLevel] = useState(5);
  const [editFriendship, setEditFriendship] = useState(0);
  const [editNickname, setEditNickname] = useState('');
  const [editSpriteUrl, setEditSpriteUrl] = useState('');
  const [editBallImage, setEditBallImage] = useState('');
  
  // 포켓몬 지급 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [level, setLevel] = useState(5);
  const [friendship, setFriendship] = useState(0);
  const [nickname, setNickname] = useState('');
  const [heldItemName, setHeldItemName] = useState('');
  const [caughtWithBall, setCaughtWithBall] = useState('몬스터볼');
  
  // 기술 설정 상태
  const [moveMode, setMoveMode] = useState('auto'); // 'auto' | 'manual'
  const [selectedMoves, setSelectedMoves] = useState([]);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  
  const filteredPokemon = allPokemonMaster.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.nameEn?.toLowerCase().includes(query) ||
      p.number.toString().includes(query)
    );
  }).slice(0, 50);

  // 현재 레벨 이하에서 배울 수 있는 모든 기술
  const availableMoves = useMemo(() => {
    if (!selectedPokemon) {
      console.log('❌ selectedPokemon 없음');
      return [];
    }
    
    if (!pokemonLearnsets || Object.keys(pokemonLearnsets).length === 0) {
      console.log('❌ pokemonLearnsets 없음');
      return [];
    }
    
    if (!allMoves || allMoves.length === 0) {
      console.log('❌ allMoves 없음');
      return [];
    }
    
    const learnset = pokemonLearnsets[selectedPokemon.number.toString()];
    console.log('🔍 learnset 확인:', selectedPokemon.number, learnset);
    
    if (!learnset || !learnset.levelUpMoves) {
      console.log('❌ learnset 또는 levelUpMoves 없음');
      return [];
    }
    
    const moves = learnset.levelUpMoves
      .filter(lm => lm.level <= level)
      .map(lm => {
        const move = allMoves.find(m => m.id === lm.moveId);
        return move ? { ...move, learnLevel: lm.level } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.learnLevel - a.learnLevel);
    
    console.log('✅ 사용 가능한 기술:', moves.length, '개');
    return moves;
  }, [selectedPokemon, level, pokemonLearnsets, allMoves]);

  // 자동 랜덤 기술 생성
  const getRandomMoves = () => {
    if (availableMoves.length === 0) return [];
    
    const shuffled = [...availableMoves].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(4, shuffled.length));
    
    return selected.map(move => ({
      moveId: move.id,
      currentPp: move.pp,
      learnedAt: move.learnLevel
    }));
  };

  const handleGivePokemon = () => {
    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    let moves = [];
    if (moveMode === 'auto') {
      moves = getRandomMoves();
    } else {
      moves = selectedMoves.map(move => ({
        moveId: move.id,
        currentPp: move.pp,
        learnedAt: move.learnLevel || level
      }));
    }
    
    const options = {
      level: level,
      friendship: friendship,
      nickname: nickname || null,
      heldItem: heldItemName || null,
      caughtWithBall: caughtWithBall,
      moves: moves
    };
    
    onGivePokemon(member.id, selectedPokemon, options);
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
    setCaughtWithBall('몬스터볼');
    setSelectedMoves([]);
    setMoveMode('auto');
    alert(`${member.name}님에게 ${selectedPokemon.name} (Lv.${level})을 지급했습니다!`);
  };

  const handleEditPokemon = (pokemon) => {
    setEditingPokemon(pokemon);
    setEditLevel(pokemon.level);
    setEditFriendship(pokemon.friendship || 0);
    setEditNickname(pokemon.nickname || '');
    setEditSpriteUrl(pokemon.spriteUrl || '');
    setEditBallImage(pokemon.ballImage || '');
    setPokemonMode('edit');
  };

  const handleSaveEdit = () => {
    if (!editingPokemon) return;
    
    const updates = {
      level: editLevel,
      friendship: editFriendship,
      nickname: editNickname || null,
      spriteUrl: editSpriteUrl || editingPokemon.spriteUrl,
      ballImage: editBallImage || null
    };
    
    onEditPokemon(member.id, editingPokemon.uniqueId, updates);
    
    setEditingPokemon(null);
    setPokemonMode('view');
    alert(`${editingPokemon.nickname || editingPokemon.name} 정보가 수정되었습니다!`);
  };

  const toggleMoveSelection = (move) => {
    setSelectedMoves(prev => {
      const exists = prev.find(m => m.id === move.id);
      if (exists) {
        return prev.filter(m => m.id !== move.id);
      } else if (prev.length < 4) {
        return [...prev, move];
      } else {
        alert('최대 4개까지 선택할 수 있습니다!');
        return prev;
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 보기/지급/편집 토글 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {pokemonMode === 'view' ? '보유 포켓몬' : pokemonMode === 'give' ? '포켓몬 지급' : '포켓몬 편집'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPokemonMode('view')}
            className={getButtonClass(pokemonMode === 'view' ? 'primary' : 'secondary', 'md')}
          >
            보기
          </button>
          <button
            onClick={() => setPokemonMode('give')}
            className={getButtonClass(pokemonMode === 'give' ? 'success' : 'secondary', 'md')}
          >
            지급
          </button>
          <button
            onClick={() => setPokemonMode('edit')}
            className={getButtonClass(pokemonMode === 'edit' ? 'warning' : 'secondary', 'md')}
          >
            편집
          </button>
        </div>
      </div>

      {/* 보기 모드 */}
      {pokemonMode === 'view' && (
        <div className="space-y-2">
          {member.caughtPokemon && member.caughtPokemon.length > 0 ? (
            member.caughtPokemon.map((pokemon, idx) => pokemon && (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div 
                  className="w-16 h-16 flex-shrink-0"
                  style={{
                    backgroundImage: `url(${pokemon.spriteUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{pokemon.nickname || pokemon.name}</div>
                  <div className="text-sm text-gray-600">Lv.{pokemon.level} | 친밀도: {pokemon.friendship || 0}</div>
                  {pokemon.heldItem && <div className="text-xs text-blue-600">도구: {pokemon.heldItem}</div>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">포켓몬이 없습니다</div>
          )}
        </div>
      )}

      {/* 지급 모드 */}
      {pokemonMode === 'give' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="포켓몬 이름 또는 번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
          />

          {!selectedPokemon ? (
            <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto bg-gray-50 p-3 rounded-lg">
              {filteredPokemon.map(pokemon => (
                <button
                  key={pokemon.number}
                  onClick={() => {
                    setSelectedPokemon(pokemon);
                    setSelectedMoves([]);
                  }}
                  className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md transition-all text-center"
                >
                  <div 
                    className="w-full h-20 mb-2"
                    style={{
                      backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png)`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
                  <div className="text-xs font-bold text-gray-700 truncate">
                    No.{pokemon.number.toString().padStart(3, '0')}
                  </div>
                  <div className="text-sm font-bold text-gray-800 truncate">{pokemon.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-indigo-300 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-24 h-24"
                  style={{
                    backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokemon.number}.png)`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <div>
                  <div className="text-2xl font-bold text-gray-800">{selectedPokemon.name}</div>
                  <div className="text-sm text-gray-600">No.{selectedPokemon.number.toString().padStart(3, '0')}</div>
                  <div className="flex gap-1 mt-2">
                    <span 
                      className="text-xs px-2 py-0.5 rounded font-bold text-white"
                      style={{ backgroundColor: TYPE_COLORS[selectedPokemon.type] || '#777' }}
                    >
                      {selectedPokemon.type}
                    </span>
                    {selectedPokemon.type2 && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded font-bold text-white"
                        style={{ backgroundColor: TYPE_COLORS[selectedPokemon.type2] || '#777' }}
                      >
                        {selectedPokemon.type2}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">레벨 (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">친밀도 (0-255)</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={friendship}
                    onChange={(e) => setFriendship(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임 (선택)</label>
                  <input
                    type="text"
                    placeholder="닉네임 없음"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">소지 도구 (선택)</label>
                  <input
                    type="text"
                    placeholder="소지 도구 이름"
                    value={heldItemName}
                    onChange={(e) => setHeldItemName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">포획한 볼</label>
                  <select
                    value={caughtWithBall}
                    onChange={(e) => setCaughtWithBall(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
                  >
                    {POKEBALL_LIST.map(ball => (
                      <option key={ball.name} value={ball.name}>{ball.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 기술 설정 */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">기술 설정</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMoveMode('auto')}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                        moveMode === 'auto'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      자동 랜덤
                    </button>
                    <button
                      onClick={() => setMoveMode('manual')}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                        moveMode === 'manual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      직접 선택
                    </button>
                  </div>
                </div>

                {moveMode === 'auto' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    🎲 현재 레벨 이하에서 배울 수 있는 기술 중 랜덤으로 최대 4개가 자동 설정됩니다.
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setShowMoveSelector(true)}
                      className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg hover:bg-indigo-200 font-semibold transition-colors mb-2"
                    >
                      기술 선택하기 ({selectedMoves.length}/4)
                    </button>
                    
                    {selectedMoves.length > 0 && (
                      <div className="space-y-2">
                        {selectedMoves.map((move, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{move.name}</span>
                              <span
                                className="text-xs px-2 py-0.5 rounded font-bold text-white"
                                style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                              >
                                {move.type}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                {getCategoryIcon(move.category)}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleMoveSelection(move)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedPokemon(null);
                    setSelectedMoves([]);
                    setMoveMode('auto');
                  }}
                  className={`flex-1 ${getButtonClass('secondary', 'lg')}`}
                >
                  취소
                </button>
                <button
                  onClick={handleGivePokemon}
                  className={`flex-1 ${getButtonClass('success', 'lg')}`}
                >
                  지급
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 편집 모드 */}
      {pokemonMode === 'edit' && (
        <div className="space-y-4">
          {!editingPokemon ? (
            <div className="space-y-2">
              {member.caughtPokemon && member.caughtPokemon.length > 0 ? (
                member.caughtPokemon.map((pokemon, idx) => pokemon && (
                  <button
                    key={idx}
                    onClick={() => handleEditPokemon(pokemon)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:shadow-md hover:border-yellow-400 transition-all text-left"
                  >
                    <div 
                      className="w-16 h-16 flex-shrink-0"
                      style={{
                        backgroundImage: `url(${pokemon.spriteUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        imageRendering: 'pixelated'
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{pokemon.nickname || pokemon.name}</div>
                      <div className="text-sm text-gray-600">Lv.{pokemon.level} | 친밀도: {pokemon.friendship || 0}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">포켓몬이 없습니다</div>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-yellow-300 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-24 h-24"
                  style={{
                    backgroundImage: `url(${editingPokemon.spriteUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {editingPokemon.nickname || editingPokemon.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Lv.{editLevel} | 친밀도 {editFriendship}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">레벨 (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editLevel}
                    onChange={(e) => setEditLevel(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">친밀도 (0-255)</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={editFriendship}
                    onChange={(e) => setEditFriendship(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임</label>
                  <input
                    type="text"
                    placeholder="닉네임 없음"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingPokemon(null);
                    setPokemonMode('view');
                  }}
                  className={`flex-1 ${getButtonClass('secondary', 'lg')}`}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className={`flex-1 ${getButtonClass('warning', 'lg')}`}
                >
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 기술 선택 모달 - Portal로 body에 직접 렌더링 */}
      {showMoveSelector && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-2xl flex flex-col"
            style={{ height: '80vh', maxHeight: '600px' }}
          >
            {/* 헤더 - 고정 */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-xl font-bold">기술 선택 ({selectedMoves.length}/4)</h3>
              <button onClick={() => setShowMoveSelector(false)} className="hover:bg-indigo-700 rounded p-1">
                <X size={24} />
              </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-sm text-gray-600 mb-3">
                Lv.{level} 이하에서 배울 수 있는 기술 ({availableMoves.length}개)
              </div>
              
              {availableMoves.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="font-semibold mb-2">배울 수 있는 기술이 없습니다</p>
                  <p className="text-sm">기술 데이터를 확인해주세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableMoves.map(move => {
                    const isSelected = selectedMoves.find(m => m.id === move.id);
                    
                    return (
                      <button
                        key={move.id}
                        onClick={() => toggleMoveSelection(move)}
                        className={`w-full border-2 rounded-lg p-3 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{move.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded font-bold text-white"
                              style={{ backgroundColor: TYPE_COLORS[move.type] || '#777' }}
                            >
                              {move.type}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              {getCategoryIcon(move.category)}
                              {move.category}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">Lv.{move.learnLevel}</span>
                        </div>
                        
                        <div className="flex gap-4 text-sm text-gray-600">
                          {move.power > 0 && <span>위력: {move.power}</span>}
                          <span>명중: {move.accuracy}</span>
                          <span>PP: {move.pp}</span>
                        </div>
                        
                        {move.description && (
                          <p className="text-xs text-gray-500 mt-1">{move.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 버튼 - 고정 */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
              <button
                onClick={() => setShowMoveSelector(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
              >
                선택 완료
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default MemberPokemonTab;