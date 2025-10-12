// src/components/views/admin/member/MemberPokemonTab.jsx
import React, { useState } from 'react';

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
      moves: []
    };
    
    onGivePokemon(member.id, selectedPokemon, options);
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
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
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              pokemonMode === 'view'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            보기
          </button>
          <button
            onClick={() => setPokemonMode('give')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              pokemonMode === 'give'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎁 지급
          </button>
          <button
            onClick={() => setPokemonMode('edit')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              pokemonMode === 'edit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ✏️ 편집
          </button>
        </div>
      </div>

      {/* 보기 모드 */}
      {pokemonMode === 'view' && (
        <>
          {member.caughtPokemon.length === 0 ? (
            <div className="text-center py-12 text-gray-400">보유한 포켓몬이 없습니다</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {member.caughtPokemon.map((pokemon, idx) => pokemon && (
                <div key={pokemon.uniqueId} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-400 transition-colors">
                  <div className="text-xs text-gray-500 mb-1">#{idx + 1}</div>
                  <div 
                    className="w-full h-20 mb-2"
                    style={{
                      backgroundImage: `url(${pokemon.spriteUrl})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  />
                  <div className="font-bold">{pokemon.nickname || pokemon.name}</div>
                  <div className="text-sm text-gray-600">Lv.{pokemon.level}</div>
                  <div className="text-xs text-gray-500 mt-1">친밀도: {pokemon.friendship || 0}</div>
                  <button
                    onClick={() => handleEditPokemon(pokemon)}
                    className="w-full mt-2 bg-purple-100 text-purple-700 py-1 rounded hover:bg-purple-200 text-sm font-semibold"
                  >
                    ✏️ 편집
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 지급 모드 */}
      {pokemonMode === 'give' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              포켓몬 검색
            </label>
            <input
              type="text"
              placeholder="이름 또는 번호로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="border border-gray-300 rounded-lg h-64 overflow-y-auto">
            {searchQuery === '' ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                포켓몬을 검색하세요
              </div>
            ) : filteredPokemon.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPokemon.map((pokemon) => (
                  <button
                    key={pokemon.number}
                    onClick={() => setSelectedPokemon(pokemon)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      selectedPokemon?.number === pokemon.number
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="w-12 h-12 flex-shrink-0"
                      style={{
                        backgroundImage: `url(${pokemon.imageUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm">
                        #{pokemon.number} {pokemon.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {pokemon.type}{pokemon.type2 ? ` / ${pokemon.type2}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPokemon && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-20 h-20"
                  style={{
                    backgroundImage: `url(${selectedPokemon.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <div>
                  <div className="font-bold text-lg">
                    #{selectedPokemon.number} {selectedPokemon.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedPokemon.type}
                    {selectedPokemon.type2 ? ` / ${selectedPokemon.type2}` : ''}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">닉네임 (선택)</label>
                  <input
                    type="text"
                    placeholder="닉네임 없음"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">지니고 있는 도구</label>
                  <input
                    type="text"
                    placeholder="도구 없음"
                    value={heldItemName}
                    onChange={(e) => setHeldItemName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <button
                onClick={handleGivePokemon}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold transition-colors"
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
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">편집할 포켓몬을 선택해주세요</p>
              <button
                onClick={() => setPokemonMode('view')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                목록으로 돌아가기
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
              <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                ✏️ {editingPokemon.nickname || editingPokemon.name} 편집
              </h4>

              {/* 포켓몬 미리보기 */}
              <div className="bg-white rounded-lg p-4 mb-6 flex items-center gap-4">
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
                  <div className="text-xl font-bold">{editNickname || editingPokemon.name}</div>
                  <div className="text-sm text-gray-600">
                    Lv.{editLevel} | 친밀도 {editFriendship}
                  </div>
                  {editBallImage && (
                    <div className="flex items-center gap-2 mt-2">
                      <img src={editBallImage} alt="볼" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      <span className="text-xs text-gray-500">커스텀 볼</span>
                    </div>
                  )}
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">닉네임</label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder={editingPokemon.name}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">포켓몬 이미지 URL</label>
                  <input
                    type="text"
                    value={editSpriteUrl}
                    onChange={(e) => setEditSpriteUrl(e.target.value)}
                    placeholder={editingPokemon.spriteUrl}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">💡 커스텀 스프라이트 URL을 입력하면 이미지가 변경됩니다</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">포획 볼 이미지 URL (선택)</label>
                  <input
                    type="text"
                    value={editBallImage}
                    onChange={(e) => setEditBallImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">💡 커스텀 볼 이미지를 표시할 수 있습니다</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setEditingPokemon(null); setPokemonMode('view'); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold"
                >
                  💾 저장
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