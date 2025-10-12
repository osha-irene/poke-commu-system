import React, { useState, useMemo } from 'react';

export default function PokedexAdminPanel({ allPokemonMaster, gamePokedex, updateGamePokedex }) {
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'add'
  const [searchQuery, setSearchQuery] = useState('');
  const [generationFilter, setGenerationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // 추가할 포켓몬 임시 선택
  const [tempSelected, setTempSelected] = useState(new Set());

  // 현재 도감에 있는 포켓몬 번호들
  const currentPokemonNumbers = useMemo(() => 
    new Set(gamePokedex.map(p => p.originalNumber || p.number)),
    [gamePokedex]
  );

  // 현재 탭: 도감에 있는 포켓몬
  const currentPokedex = useMemo(() => 
    gamePokedex.sort((a, b) => (a.newNumber || 0) - (b.newNumber || 0)),
    [gamePokedex]
  );

  // 추가 탭: 도감에 없는 포켓몬
  const availableToAdd = useMemo(() => {
    return allPokemonMaster
      .filter(p => !currentPokemonNumbers.has(p.number))
      .filter(p => {
        if (generationFilter !== 'all') {
          const gen = parseInt(p.generation);
          const targetGen = parseInt(generationFilter);
          if (gen !== targetGen) return false;
        }
        if (typeFilter !== 'all') {
          if (p.type !== typeFilter && p.type2 !== typeFilter) return false;
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(query) ||
            p.nameEn?.toLowerCase().includes(query) ||
            p.number.toString().includes(query)
          );
        }
        return true;
      });
  }, [allPokemonMaster, currentPokemonNumbers, generationFilter, typeFilter, searchQuery]);

  // 현재 탭 필터링
  const filteredCurrent = useMemo(() => {
    return currentPokedex.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.nameEn?.toLowerCase().includes(query) ||
          p.number.toString().includes(query) ||
          (p.newNumber && p.newNumber.toString().includes(query))
        );
      }
      return true;
    });
  }, [currentPokedex, searchQuery]);

  // 임시 선택 토글
  const toggleTempSelect = (pokemon) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(pokemon.number)) {
      newSelected.delete(pokemon.number);
    } else {
      newSelected.add(pokemon.number);
    }
    setTempSelected(newSelected);
  };

  // 선택된 포켓몬들 추가
  const handleAddSelected = () => {
    if (tempSelected.size === 0) {
      alert('추가할 포켓몬을 선택해주세요!');
      return;
    }
    
    const newNumbers = [...currentPokemonNumbers, ...Array.from(tempSelected)];
    updateGamePokedex(Array.from(new Set(newNumbers)).sort((a, b) => a - b));
    setTempSelected(new Set());
  };

  // 포켓몬 제거
  const handleRemovePokemon = (pokemon) => {
    if (window.confirm(`${pokemon.name}을(를) 도감에서 제거하시겠습니까?`)) {
      const newNumbers = Array.from(currentPokemonNumbers).filter(n => n !== (pokemon.originalNumber || pokemon.number));
      updateGamePokedex(newNumbers.sort((a, b) => a - b));
    }
  };

  const handleRemoveAll = () => {
    if (window.confirm('⚠️ 모든 포켓몬을 도감에서 제거하시겠습니까?')) {
      updateGamePokedex([]);
    }
  };

  const handleAddGeneration = (gen) => {
    const genPokemon = allPokemonMaster
      .filter(p => parseInt(p.generation) === gen && !currentPokemonNumbers.has(p.number))
      .map(p => p.number);
    
    if (genPokemon.length === 0) {
      alert(`${gen}세대 포켓몬이 이미 모두 추가되어 있습니다.`);
      return;
    }
    
    const newNumbers = [...currentPokemonNumbers, ...genPokemon];
    updateGamePokedex(Array.from(new Set(newNumbers)).sort((a, b) => a - b));
  };

  // 전체 선택/해제 (추가 탭)
  const toggleAllInAddTab = () => {
    if (tempSelected.size === availableToAdd.length && availableToAdd.length > 0) {
      setTempSelected(new Set());
    } else {
      setTempSelected(new Set(availableToAdd.map(p => p.number)));
    }
  };

  const typeColors = {
    '노말': 'bg-gray-400',
    '불꽃': 'bg-red-500',
    '물': 'bg-blue-500',
    '풀': 'bg-green-500',
    '전기': 'bg-yellow-400',
    '얼음': 'bg-cyan-300',
    '격투': 'bg-orange-600',
    '독': 'bg-purple-500',
    '땅': 'bg-yellow-600',
    '비행': 'bg-indigo-300',
    '에스퍼': 'bg-pink-500',
    '벌레': 'bg-lime-500',
    '바위': 'bg-yellow-700',
    '고스트': 'bg-purple-700',
    '드래곤': 'bg-indigo-600',
    '악': 'bg-gray-700',
    '강철': 'bg-gray-500',
    '페어리': 'bg-pink-300'
  };

  return (
    <div className="space-y-4">
      {/* 탭 선택 */}
      <div className="flex gap-2 border-b border-gray-300">
        <button
          onClick={() => { setActiveTab('current'); setTempSelected(new Set()); }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'current'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          현재 도감 ({currentPokedex.length}종)
        </button>
        <button
          onClick={() => { setActiveTab('add'); setSearchQuery(''); }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'add'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          포켓몬 추가 {tempSelected.size > 0 && `(${tempSelected.size}개 선택됨)`}
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="이름 또는 번호로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
        />
        
        {activeTab === 'add' && (
          <>
            <select
              value={generationFilter}
              onChange={(e) => setGenerationFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">전체 세대</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(gen => (
                <option key={gen} value={gen}>{gen}세대</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">전체 타입</option>
              {Object.keys(typeColors).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* 빠른 액션 버튼 */}
      {activeTab === 'current' && (
        <div className="flex gap-2">
          <button
            onClick={handleRemoveAll}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-semibold"
          >
            전체 제거
          </button>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-gray-600">빠른 추가:</span>
          {[1, 2, 3, 4, 5].map(gen => (
            <button
              key={gen}
              onClick={() => handleAddGeneration(gen)}
              className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200 text-sm font-semibold"
            >
              {gen}세대
            </button>
          ))}
          <button
            onClick={toggleAllInAddTab}
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 text-sm font-semibold ml-auto"
          >
            {tempSelected.size === availableToAdd.length && availableToAdd.length > 0 ? '전체 해제' : '전체 선택'}
          </button>
          <button
            onClick={handleAddSelected}
            disabled={tempSelected.size === 0}
            className="bg-green-600 text-white px-6 py-1 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
          >
            {tempSelected.size > 0 ? `${tempSelected.size}개 추가` : '추가'}
          </button>
        </div>
      )}

      {/* 포켓몬 리스트 */}
      <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto p-3">
        {activeTab === 'current' && (
          <div className="grid grid-cols-4 gap-2">
            {filteredCurrent.length === 0 ? (
              <div className="col-span-4 text-center py-12 text-gray-400">
                도감이 비어있습니다
              </div>
            ) : (
              filteredCurrent.map((pokemon) => (
                <div
                  key={pokemon.number}
                  className="bg-white border-2 border-gray-200 rounded-lg p-2 hover:border-red-400 transition-colors group"
                >
                  <div className="relative">
                    <div
                      className="w-full h-20 mb-2"
                      style={{
                        backgroundImage: `url(${pokemon.imageUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    />
                    <button
                      onClick={() => handleRemovePokemon(pokemon)}
                      className="absolute top-0 right-0 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">
                      #{pokemon.newNumber || pokemon.number} (#{pokemon.originalNumber || pokemon.number})
                    </div>
                    <div className="font-semibold text-xs truncate">{pokemon.name}</div>
                    <div className="flex gap-1 justify-center mt-1">
                      <span className={`text-white text-xs px-1.5 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                        {pokemon.type}
                      </span>
                      {pokemon.type2 && (
                        <span className={`text-white text-xs px-1.5 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                          {pokemon.type2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="grid grid-cols-4 gap-2">
            {availableToAdd.length === 0 ? (
              <div className="col-span-4 text-center py-12 text-gray-400">
                {searchQuery || generationFilter !== 'all' || typeFilter !== 'all' 
                  ? '검색 결과가 없습니다'
                  : '추가할 포켓몬이 없습니다'}
              </div>
            ) : (
              availableToAdd.slice(0, 100).map((pokemon) => {
                const isSelected = tempSelected.has(pokemon.number);
                
                return (
                  <button
                    key={pokemon.number}
                    onClick={() => toggleTempSelect(pokemon)}
                    className={`bg-white border-2 rounded-lg p-2 transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className="w-full h-20 mb-2"
                        style={{
                          backgroundImage: `url(${pokemon.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center'
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">#{pokemon.number}</div>
                      <div className="font-semibold text-xs truncate">{pokemon.name}</div>
                      <div className="flex gap-1 justify-center mt-1">
                        <span className={`text-white text-xs px-1.5 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                          {pokemon.type}
                        </span>
                        {pokemon.type2 && (
                          <span className={`text-white text-xs px-1.5 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                            {pokemon.type2}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}