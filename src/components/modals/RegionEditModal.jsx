import React, { useState, useMemo } from 'react';

export default function RegionEditModal({ region, allPokemon, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // 포켓몬별 출현 확률 (기본값 1)
  const [pokemonRates, setPokemonRates] = useState(() => {
    const rates = {};
    region.pokemons.forEach(id => {
      rates[id] = region.pokemonRates?.[id] || 1;
    });
    return rates;
  });
  
  const [selectedPokemon, setSelectedPokemon] = useState(new Set(region.pokemons));

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

  // 현재 등장 포켓몬 목록
  const currentPokemonList = useMemo(() => {
    return allPokemon.filter(p => 
      selectedPokemon.has(p.id) || selectedPokemon.has(p.number)
    );
  }, [allPokemon, selectedPokemon]);

  // 필터링된 전체 포켓몬 리스트 (편집 탭용)
  const filteredPokemon = useMemo(() => {
    return allPokemon
      .filter(p => {
        if (typeFilter !== 'all' && p.type !== typeFilter && p.type2 !== typeFilter) {
          return false;
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(query) ||
            p.nameEn?.toLowerCase().includes(query) ||
            (p.newNumber && p.newNumber.toString().includes(query)) ||
            (p.originalNumber && p.originalNumber.toString().includes(query))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aSelected = selectedPokemon.has(a.id) || selectedPokemon.has(a.number);
        const bSelected = selectedPokemon.has(b.id) || selectedPokemon.has(b.number);
        
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        
        return (a.newNumber || a.number) - (b.newNumber || b.number);
      });
  }, [allPokemon, typeFilter, searchQuery, selectedPokemon]);

  const togglePokemon = (pokemon) => {
    const id = pokemon.id || pokemon.number;
    const newSelected = new Set(selectedPokemon);
    
    if (newSelected.has(id)) {
      newSelected.delete(id);
      // 확률도 삭제
      const newRates = { ...pokemonRates };
      delete newRates[id];
      setPokemonRates(newRates);
    } else {
      newSelected.add(id);
      // 기본 확률 1 설정
      setPokemonRates({ ...pokemonRates, [id]: 1 });
    }
    
    setSelectedPokemon(newSelected);
  };

  const updateRate = (pokemonId, rate) => {
    setPokemonRates({ ...pokemonRates, [pokemonId]: parseFloat(rate) || 1 });
  };

  const toggleAll = () => {
    if (selectedPokemon.size === allPokemon.length) {
      setSelectedPokemon(new Set());
      setPokemonRates({});
    } else {
      const newSelected = new Set(allPokemon.map(p => p.id || p.number));
      const newRates = {};
      allPokemon.forEach(p => {
        const id = p.id || p.number;
        newRates[id] = pokemonRates[id] || 1;
      });
      setSelectedPokemon(newSelected);
      setPokemonRates(newRates);
    }
  };

  const handleSave = () => {
    onSave(region.id, Array.from(selectedPokemon), pokemonRates);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-indigo-600 text-white p-6 flex-shrink-0">
          <h2 className="text-2xl font-bold">{region.name} - 포켓몬 설정</h2>
          <p className="text-sm text-indigo-100 mt-1">
            등장 포켓몬: {selectedPokemon.size}종
          </p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            등장 포켓몬 목록 & 확률
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'edit'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            포켓몬 추가/제거
          </button>
        </div>

        {/* 등장 포켓몬 목록 탭 */}
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto p-4">
            {currentPokemonList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                등장하는 포켓몬이 없습니다. "포켓몬 추가/제거" 탭에서 추가하세요.
              </div>
            ) : (
              <div className="space-y-2">
                {currentPokemonList.map((pokemon) => {
                  const id = pokemon.id || pokemon.number;
                  const rate = pokemonRates[id] || 1;
                  
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
                    >
                      {/* 포켓몬 아이콘 */}
                      <div
                        className="w-14 h-14 flex-shrink-0"
                        style={{
                          backgroundImage: `url(${pokemon.iconUrl || pokemon.imageUrl})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center'
                        }}
                      />
                      
                      {/* 포켓몬 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">
                            No.{String(pokemon.newNumber || pokemon.number).padStart(3, '0')}
                          </span>
                          {pokemon.newNumber && pokemon.originalNumber && (
                            <span className="text-xs text-gray-500">
                              (전국 No.{String(pokemon.originalNumber).padStart(3, '0')})
                            </span>
                          )}
                          <span className="font-semibold">{pokemon.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`text-white text-xs px-2 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                            {pokemon.type}
                          </span>
                          {pokemon.type2 && (
                            <span className={`text-white text-xs px-2 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                              {pokemon.type2}
                            </span>
                          )}
                          <span className="text-xs text-gray-600 px-2 py-0.5 bg-gray-100 rounded ml-1">
                            포획률 {Math.round((pokemon.catchRate || 0.5) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* 출현 확률 설정 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="text-sm font-semibold text-gray-700">출현 가중치:</label>
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={rate}
                          onChange={(e) => updateRate(id, e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* 제거 버튼 */}
                      <button
                        onClick={() => togglePokemon(pokemon)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm font-semibold flex-shrink-0"
                      >
                        제거
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 포켓몬 추가/제거 탭 */}
        {activeTab === 'edit' && (
          <>
            {/* 검색 및 필터 */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="이름 또는 번호로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                />
                
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

                <button
                  onClick={toggleAll}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold whitespace-nowrap"
                >
                  {selectedPokemon.size === allPokemon.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>

      {/* 포켓몬 그리드 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-6 gap-2">
                {filteredPokemon.map((pokemon) => {
                  const id = pokemon.id || pokemon.number;
                  const isSelected = selectedPokemon.has(id);
                  
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={(e) => togglePokemon(pokemon, e)}
                      className={`border-2 rounded-lg p-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="w-full h-14 mb-1"
                          style={{
                            backgroundImage: `url(${pokemon.imageUrl})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center'
                          }}
                        />
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">
                          #{pokemon.newNumber || pokemon.number}
                        </div>
                        <div className="font-semibold text-xs truncate">{pokemon.name}</div>
                        <div className="flex gap-0.5 justify-center mt-1">
                          <span className={`text-white text-xs px-1 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                            {pokemon.type}
                          </span>
                          {pokemon.type2 && (
                            <span className={`text-white text-xs px-1 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                              {pokemon.type2}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {Math.round((pokemon.catchRate || 0.5) * 100)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            💡 출현 가중치: 높을수록 자주 등장합니다 (기본값: 1)
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}