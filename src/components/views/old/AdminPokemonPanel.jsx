import React, { useState } from 'react';

export default function AdminPokemonPanel({
  trainer,
  members,
  allPokemonMaster,
  onGivePokemonToMember,
  onAddPokemonToSelf
}) {
  const [selectedMember, setSelectedMember] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  
  // 포켓몬 옵션
  const [level, setLevel] = useState(5);
  const [friendship, setFriendship] = useState(0);
  const [nickname, setNickname] = useState('');
  const [heldItemName, setHeldItemName] = useState('');

  // 포켓몬 검색
  const filteredPokemon = allPokemonMaster.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.nameEn?.toLowerCase().includes(query) ||
      p.number.toString().includes(query)
    );
  }).slice(0, 50); // 최대 50개만 표시

  const handleGivePokemon = () => {
    if (!selectedMember) {
      alert('회원을 선택해주세요!');
      return;
    }
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

    console.log('=== 포켓몬 지급 디버깅 ===');
    console.log('선택된 포켓몬:', selectedPokemon);
    console.log('옵션:', options);
    console.log('======================');

    onGivePokemonToMember(selectedMember, selectedPokemon, options);
    
    // 초기화
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
  };

  const handleAddToSelf = () => {
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

    console.log('=== 자신에게 포켓몬 추가 디버깅 ===');
    console.log('선택된 포켓몬:', selectedPokemon);
    console.log('옵션:', options);
    console.log('==============================');

    onAddPokemonToSelf(selectedPokemon, options);
    
    // 초기화
    setSelectedPokemon(null);
    setNickname('');
    setHeldItemName('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🎁 포켓몬 지급</h3>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 포켓몬 선택 */}
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

          <div className="border border-gray-300 rounded-lg h-96 overflow-y-auto">
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
        </div>

        {/* 오른쪽: 옵션 설정 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              지급 대상
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">회원 선택...</option>
              {Object.values(members).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.id})
                </option>
              ))}
            </select>
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

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    레벨
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    친밀도 (0-255)
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    닉네임 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="닉네임 없음"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    지니고 있는 도구 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="도구 없음"
                    value={heldItemName}
                    onChange={(e) => setHeldItemName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddToSelf}
              disabled={!selectedPokemon}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              내게 추가
            </button>
            <button
              onClick={handleGivePokemon}
              disabled={!selectedPokemon || !selectedMember}
              className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              지급하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}