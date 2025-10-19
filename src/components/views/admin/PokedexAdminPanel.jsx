import React, { useState, useMemo } from 'react';
import { Globe } from 'lucide-react';

export default function PokedexAdminPanel({ allPokemonMaster, gamePokedex, updateGamePokedex }) {
  const [activeTab, setActiveTab] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [generationFilter, setGenerationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showRegionalForms, setShowRegionalForms] = useState(true);
  
  const [tempSelected, setTempSelected] = useState(new Set());

  const currentPokemonNumbers = useMemo(() => {
    const numbers = new Set();
    gamePokedex.forEach(p => {
      numbers.add(p.number);
    });
    return numbers;
  }, [gamePokedex]);

  const currentPokedex = useMemo(() => 
    gamePokedex.sort((a, b) => (a.newNumber || 0) - (b.newNumber || 0)),
    [gamePokedex]
  );

  const availableToAdd = useMemo(() => {
    const filtered = allPokemonMaster.filter(p => {
      if (currentPokemonNumbers.has(p.number)) {
        return false;
      }
      
      if (!showRegionalForms && p.isRegionalForm) {
        return false;
      }
      
      if (generationFilter !== 'all' && parseInt(p.generation) !== parseInt(generationFilter)) {
        return false;
      }
      
      if (typeFilter !== 'all' && p.type !== typeFilter && p.type2 !== typeFilter) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const number = p.number?.toString() || '';
        const originalNumber = p.originalNumber?.toString() || '';
        const name = p.name?.toLowerCase() || '';
        const nameEn = p.nameEn?.toLowerCase() || '';
        
        const matches = number.includes(query) ||
               originalNumber.includes(query) ||
               name.includes(query) ||
               nameEn.includes(query);
        
        // 🔍 디버그: "라이" 검색 시 어떤 포켓몬들이 걸리는지 확인
        if (query === '라이' && matches) {
          console.log('🔍 [ADD TAB] 검색 매칭:', {
            name: p.name,
            nameEn: p.nameEn,
            number: p.number,
            originalNumber: p.originalNumber,
            query: query
          });
        }
        
        return matches;
      }
      
      return true;
    });
    
    const sorted = filtered.sort((a, b) => {
      const aDisplay = a.displayNumber || a.originalNumber || a.number;
      const bDisplay = b.displayNumber || b.originalNumber || b.number;
      return aDisplay - bDisplay;
    });
    
    return sorted;
  }, [allPokemonMaster, currentPokemonNumbers, generationFilter, typeFilter, searchQuery, showRegionalForms]);

  const filteredCurrent = useMemo(() => {
    const result = currentPokedex.filter(p => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = (
          p.name.toLowerCase().includes(query) ||
          p.nameEn?.toLowerCase().includes(query) ||
          p.number.toString().includes(query) ||
          (p.newNumber && p.newNumber.toString().includes(query))
        );
        
        // 🔍 디버그: "라이" 검색 시 어떤 포켓몬들이 걸리는지 확인
        if (query === '라이') {
          console.log('🔍 [CURRENT TAB] 검색 확인:', {
            name: p.name,
            nameEn: p.nameEn,
            number: p.number,
            newNumber: p.newNumber,
            matches: matches,
            query: query
          });
        }
        
        return matches;
      }
      return true;
    });
    
    // 🔍 디버그: 최종 필터 결과 출력
    if (searchQuery === '라이') {
      console.log('🔍 [CURRENT TAB] 최종 필터 결과:', result.map(p => ({
        name: p.name,
        number: p.number
      })));
    }
    
    return result;
  }, [currentPokedex, searchQuery]);

  const toggleTempSelect = (pokemon) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(pokemon.number)) {
      newSelected.delete(pokemon.number);
    } else {
      newSelected.add(pokemon.number);
    }
    setTempSelected(newSelected);
  };

  const handleAddSelected = () => {
    if (tempSelected.size === 0) {
      alert('추가할 포켓몬을 선택해주세요!');
      return;
    }
    
    const newNumbers = Array.from(tempSelected);
    const existingNumbers = gamePokedex.map(p => p.number);
    const combined = [...existingNumbers, ...newNumbers];
    const uniqueNumbers = Array.from(new Set(combined)).sort((a, b) => a - b);
    
    updateGamePokedex(uniqueNumbers);
    setTempSelected(new Set());
  };

  const handleRemovePokemon = (pokemon) => {
    if (window.confirm(`${pokemon.name}을(를) 도감에서 제거하시겠습니까?`)) {
      const numbersToRemove = new Set([pokemon.number]);
      if (pokemon.originalNumber) numbersToRemove.add(pokemon.originalNumber);
      
      const updatedPokedex = gamePokedex.filter(p => 
        !numbersToRemove.has(p.number) && 
        !(p.originalNumber && numbersToRemove.has(p.originalNumber))
      );
      
      const newNumbers = updatedPokedex.map(p => p.originalNumber || p.number);
      updateGamePokedex(newNumbers.sort((a, b) => a - b));
    }
  };

  const handleRemoveAll = () => {
    if (window.confirm('모든 포켓몬을 도감에서 제거하시겠습니까?')) {
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
      <div className="flex gap-2 border-b border-gray-300">
        <button
          onClick={() => { 
            console.log('🔄 현재 도감 탭으로 전환');
            setActiveTab('current'); 
            setTempSelected(new Set()); 
          }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'current'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          현재 도감 ({currentPokedex.length}종)
        </button>
        <button
          onClick={() => { 
            console.log('🔄 포켓몬 추가 탭으로 전환, 검색어 초기화');
            setActiveTab('add'); 
            setSearchQuery(''); 
          }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'add'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          포켓몬 추가 {tempSelected.size > 0 && `(${tempSelected.size}개 선택됨)`}
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="이름 또는 번호로 검색..."
          value={searchQuery}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 검색어 변경:', newValue);
            setSearchQuery(newValue);
          }}
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

            <button
              onClick={() => setShowRegionalForms(!showRegionalForms)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                showRegionalForms
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Globe size={18} />
              {showRegionalForms ? '리전폼 포함' : '원종만'}
            </button>
          </>
        )}
      </div>

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
                      <div className="text-xs text-gray-500">
                        #{pokemon.newNumber || pokemon.displayNumber || pokemon.number}
                        {pokemon.originalNumber && pokemon.originalNumber !== pokemon.number && (
                          <span className="text-gray-400"> (#{pokemon.originalNumber})</span>
                        )}
                      </div>
                      <div className="font-semibold text-xs truncate">
                        {pokemon.name}
                        {pokemon.isRegionalForm && (
                          <span className={`ml-1 px-1 py-0.5 text-[10px] rounded ${
                            pokemon.regionalForm === 'alola' ? 'bg-yellow-200 text-yellow-800' :
                            pokemon.regionalForm === 'galar' ? 'bg-blue-200 text-blue-800' :
                            pokemon.regionalForm === 'hisui' ? 'bg-green-200 text-green-800' :
                            'bg-purple-200 text-purple-800'
                          }`}>
                            {pokemon.regionalForm?.toUpperCase()}
                          </span>
                        )}
                      </div>
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