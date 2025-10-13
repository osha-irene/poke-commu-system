// src/components/views/admin/member/MemberPokemonTab.jsx
import React, { useState } from 'react';
import { POKEBALL_LIST, getButtonClass, getTypeColor } from '../../../../styles/theme';

function MemberPokemonTab({ 
  member, 
  allPokemonMaster,
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
  
  const filteredPokemon = allPokemonMaster.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.nameEn?.toLowerCase().includes(query) ||
      p.number.toString().includes(query)
    );
  }).slice(0, 50);

  const handleGivePokemon = () => {
    if (!selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    const options = {
      level: level,
      friendship: friendship,
      nickname: nickname || null,
      heldItem: heldItemName || null,
      caughtWithBall: caughtWithBall,
      moves: []
    };
    
    onGivePokemon(member.id, selectedPokemon, options);
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
    setCaughtWithBall('몬스터볼');
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
            <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {filteredPokemon.map(pokemon => (
                <button
                  key={pokemon.id}
                  onClick={() => setSelectedPokemon(pokemon)}
                  className="bg-white border border-gray-200 rounded-lg p-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                >
                  <div 
                    className="w-full h-20 mb-1"
                    style={{
                      backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png)`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
                  <div className="text-xs font-semibold text-center truncate">{pokemon.name}</div>
                  <div className="text-xs text-gray-500 text-center">No.{pokemon.number}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
              <button
                onClick={() => setSelectedPokemon(null)}
                className="text-sm text-indigo-600 hover:text-indigo-700 mb-4 font-semibold"
              >
                ← 다른 포켓몬 선택
              </button>

              <div className="bg-white rounded-lg p-4 mb-4 flex items-center gap-4 shadow-sm">
                <div 
                  className="w-24 h-24 flex-shrink-0"
                  style={{
                    backgroundImage: `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokemon.number}.png)`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <div className="flex-1">
                  <div className="text-xl font-bold text-gray-800">{selectedPokemon.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <span>No.{selectedPokemon.number}</span>
                    <span 
                      className="text-xs px-2 py-1 rounded font-bold"
                      style={{
                        backgroundColor: getTypeColor(selectedPokemon.type).bg,
                        color: getTypeColor(selectedPokemon.type).text
                      }}
                    >
                      {selectedPokemon.type}
                    </span>
                    {selectedPokemon.type2 && (
                      <span 
                        className="text-xs px-2 py-1 rounded font-bold"
                        style={{
                          backgroundColor: getTypeColor(selectedPokemon.type2).bg,
                          color: getTypeColor(selectedPokemon.type2).text
                        }}
                      >
                        {selectedPokemon.type2}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">레벨</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">친밀도 (0-255)</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={friendship}
                    onChange={(e) => setFriendship(parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">닉네임 (선택)</label>
                  <input
                    type="text"
                    placeholder="닉네임 없음"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">지니고 있는 도구</label>
                  <input
                    type="text"
                    placeholder="도구 없음"
                    value={heldItemName}
                    onChange={(e) => setHeldItemName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* 몬스터볼 선택 */}
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">잡은 몬스터볼</label>
                <select
                  value={caughtWithBall}
                  onChange={(e) => setCaughtWithBall(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                >
                  {POKEBALL_LIST.map(ball => (
                    <option key={ball.name} value={ball.name}>
                      {ball.name} ({ball.nameEn})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleGivePokemon}
                className={`w-full ${getButtonClass('success', 'lg')}`}
              >
                지급하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 편집 모드 */}
      {pokemonMode === 'edit' && (
        <div className="space-y-4">
          {!editingPokemon ? (
            <div className="space-y-2">
              <p className="text-gray-600 mb-3">편집할 포켓몬을 선택하세요:</p>
              {member.caughtPokemon && member.caughtPokemon.length > 0 ? (
                member.caughtPokemon.map((pokemon, idx) => pokemon && (
                  <button
                    key={idx}
                    onClick={() => handleEditPokemon(pokemon)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:bg-purple-50 hover:border-purple-300 transition-all"
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
                    <div className="flex-1 text-left">
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
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
              <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                ✏️ {editingPokemon.nickname || editingPokemon.name} 편집
              </h4>

              {/* 포켓몬 미리보기 */}
              <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4 shadow-sm">
                <div 
                  className="w-24 h-24 flex-shrink-0"
                  style={{
                    backgroundImage: `url(${editSpriteUrl || editingPokemon.spriteUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated'
                  }}
                />
                <div className="flex-1">
                  <div className="text-xl font-bold text-gray-800">{editNickname || editingPokemon.name}</div>
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
    </div>
  );
}

export default MemberPokemonTab;