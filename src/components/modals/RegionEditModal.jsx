import React, { useState, useMemo } from 'react';
import { getPokemonDisplayParts } from '../../utils/pokemonDisplayName';

export default function RegionEditModal({ region, allPokemon, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('rates'); // 'rates' or 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [minLevel, setMinLevel] = useState(region.minLevel || 5);
  const [maxLevel, setMaxLevel] = useState(region.maxLevel || 20);
  
  // ⭐ 포켓몬 출현율 (0~100%)
  const [encounterRate, setEncounterRate] = useState(region.encounterRate !== undefined ? region.encounterRate : 80);
  
  // ⭐ 포켓몬별 출현 확률 (퍼센트 단위)
  const [pokemonRates, setPokemonRates] = useState(() => {
    const rates = {};
    region.pokemons.forEach(id => {
      rates[id] = region.pokemonRates?.[id] || 10; // 기본 10%
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

  // ⭐ 전체 확률 합계 계산
  const totalRate = useMemo(() => {
    return Object.values(pokemonRates).reduce((sum, rate) => sum + parseFloat(rate || 0), 0);
  }, [pokemonRates]);

  // ⭐ 실제 출현 확률 계산 (출현율 × 개별 확률 비율)
  const getActualRate = (pokemonRate) => {
    if (totalRate === 0) return 0;
    return (encounterRate * (pokemonRate / totalRate)).toFixed(2);
  };

  const togglePokemon = (pokemon) => {
    const id = pokemon.id || pokemon.number;
    const newSelected = new Set(selectedPokemon);
    
    if (newSelected.has(id)) {
      newSelected.delete(id);
      const newRates = { ...pokemonRates };
      delete newRates[id];
      setPokemonRates(newRates);
    } else {
      newSelected.add(id);
      setPokemonRates({ ...pokemonRates, [id]: 10 }); // 기본 10%
    }
    
    setSelectedPokemon(newSelected);
  };

  const updateRate = (pokemonId, rate) => {
    const newRate = parseFloat(rate) || 0;
    
    // ⭐ 확률 합계가 100을 넘지 않도록 제한
    const currentTotal = Object.entries(pokemonRates)
      .filter(([id]) => id !== String(pokemonId))
      .reduce((sum, [, r]) => sum + parseFloat(r || 0), 0);
    
    if (currentTotal + newRate > 100) {
      alert('⚠️ 모든 포켓몬 확률의 합은 100%를 넘을 수 없습니다!');
      return;
    }
    
    setPokemonRates({ ...pokemonRates, [pokemonId]: newRate });
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
        newRates[id] = pokemonRates[id] || 10;
      });
      setSelectedPokemon(newSelected);
      setPokemonRates(newRates);
    }
  };

  const handleSave = () => {
    // ⭐ encounterRate도 함께 저장
    onSave(region.id, Array.from(selectedPokemon), pokemonRates, encounterRate, minLevel, maxLevel);
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
          <h2 className="text-3xl font-bold">{region.name} - 포켓몬 출현 설정</h2>
          <p className="text-base text-indigo-100 mt-1">
            등장 포켓몬: {selectedPokemon.size}종 | 포켓몬 출현율: {encounterRate}% | 미출현: {100 - encounterRate}%
          </p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'rates'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎲 출현율 & 확률 설정
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'edit'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ➕ 포켓몬 추가/제거
          </button>
        </div>
      
      <div className="bg-white/40 rounded-lg p-6 mb-6 border-2 border-lime-200">
  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
    📊 야생 포켓몬 레벨 범위
  </h3>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-base font-semibold text-gray-700 mb-2 block">최소 레벨</label>
      <input
        type="number"
        min="1"
        max="100"
        value={minLevel}
        onChange={(e) => {
          const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
          if (val <= maxLevel) {
            setMinLevel(val);
          } else {
            alert('최소 레벨은 최대 레벨보다 작아야 합니다!');
          }
        }}
        className="w-full border-2 border-orange-300 rounded-lg px-4 py-2 text-center font-bold text-xl focus:border-orange-500 focus:outline-none"
      />
    </div>
    <div>
      <label className="text-base font-semibold text-gray-700 mb-2 block">최대 레벨</label>
      <input
        type="number"
        min="1"
        max="100"
        value={maxLevel}
        onChange={(e) => {
          const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
          if (val >= minLevel) {
            setMaxLevel(val);
          } else {
            alert('최대 레벨은 최소 레벨보다 커야 합니다!');
          }
        }}
        className="w-full border-2 border-orange-300 rounded-lg px-4 py-2 text-center font-bold text-xl focus:border-orange-500 focus:outline-none"
      />
    </div>
  </div>
  <div className="mt-3 text-base text-gray-600 text-center">
    💡 이 지역에서 나타나는 야생 포켓몬의 레벨: Lv.{minLevel} ~ Lv.{maxLevel}
  </div>
</div>

        {/* 출현율 & 확률 설정 탭 */}
        {activeTab === 'rates' && (
          <div className="flex-1 overflow-y-auto p-4">
            {/* ⭐ 전체 출현율 설정 */}
            <div className="bg-white/40 rounded-lg p-6 mb-6 border-2 border-lime-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🌟 포켓몬 출현율 설정
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={encounterRate}
                      onChange={(e) => setEncounterRate(parseFloat(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={encounterRate}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                      setEncounterRate(val);
                    }}
                    className="w-20 border-2 border-indigo-300 rounded-lg px-3 py-2 text-center font-bold text-xl focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-xl font-bold text-gray-700">%</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-base">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-green-700 font-semibold mb-1">✅ 포켓몬 출현</div>
                    <div className="text-3xl font-bold text-green-600">{encounterRate}%</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-gray-700 font-semibold mb-1">❌ 미출현 (아이템만)</div>
                    <div className="text-3xl font-bold text-gray-600">{100 - encounterRate}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ⭐ 개별 포켓몬 확률 설정 */}
            {currentPokemonList.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                등장하는 포켓몬이 없습니다. "포켓몬 추가/제거" 탭에서 추가하세요.
              </div>
            ) : (
              <>
                {/* 확률 합계 표시 */}
                <div className={`mb-4 p-4 rounded-lg border-2 ${
                  totalRate > 100 
                    ? 'bg-red-50 border-red-300' 
                    : totalRate === 100 
                    ? 'bg-green-50 border-green-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700">📊 전체 확률 합계:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-bold ${
                        totalRate > 100 ? 'text-red-600' : totalRate === 100 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {totalRate.toFixed(1)}%
                      </span>
                      {totalRate > 100 && <span className="text-red-600 text-base font-semibold">⚠️ 100% 초과!</span>}
                      {totalRate === 100 && <span className="text-green-600 text-base font-semibold">✅ 완벽!</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {currentPokemonList.map((pokemon) => {
                    const id = pokemon.id || pokemon.number;
                    const rate = pokemonRates[id] || 0;
                    const actualRate = getActualRate(rate);
                    
                    return (
                      <div
                        key={id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* 포켓몬 아이콘 */}
                          <div
                            className="w-16 h-16 flex-shrink-0"
                            style={{
                              backgroundImage: `url(${pokemon.iconUrl || pokemon.imageUrl})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }}
                          />
                          
                          {/* 포켓몬 정보 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-base">
                                No.{String(pokemon.newNumber || pokemon.number).padStart(3, '0')}
                              </span>
                              {pokemon.newNumber && pokemon.originalNumber && (
                                <span className="text-sm text-gray-500">
                                  (전국 No.{String(pokemon.originalNumber).padStart(3, '0')})
                                </span>
                              )}
                              <span className="font-semibold text-xl">{pokemon.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <span className={`text-white text-sm px-2 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                                {pokemon.type}
                              </span>
                              {pokemon.type2 && (
                                <span className={`text-white text-sm px-2 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                                  {pokemon.type2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 확률 설정 */}
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-1">상대 확률</div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={rate}
                                  onChange={(e) => updateRate(id, e.target.value)}
                                  className="w-20 border-2 border-gray-300 rounded-lg px-2 py-1 text-center font-bold focus:border-indigo-500 focus:outline-none"
                                />
                                <span className="font-bold text-gray-700">%</span>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-sm text-gray-500 mb-1">실제 출현율</div>
                              <div className="bg-indigo-50 px-3 py-1 rounded-lg">
                                <span className="font-bold text-indigo-600 text-xl">{actualRate}%</span>
                              </div>
                            </div>

                            {/* 제거 버튼 */}
                            <button
                              onClick={() => togglePokemon(pokemon)}
                              className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 text-base font-semibold"
                            >
                              제거
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
                  const displayNameParts = getPokemonDisplayParts(pokemon);
                  
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePokemon(pokemon)}
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
                          <div className="absolute top-0 right-0 bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-sm">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">
                          #{pokemon.newNumber || pokemon.number}
                        </div>
                        <div className="font-semibold text-sm truncate">{displayNameParts.name}</div>
                        {displayNameParts.formLabel && (
                          <div className="text-[10px] text-gray-500 truncate">{displayNameParts.formLabel}</div>
                        )}
                        <div className="flex gap-0.5 justify-center mt-1">
                          <span className={`text-white text-sm px-1 py-0.5 rounded ${typeColors[pokemon.type] || 'bg-gray-400'}`}>
                            {pokemon.type}
                          </span>
                          {pokemon.type2 && (
                            <span className={`text-white text-sm px-1 py-0.5 rounded ${typeColors[pokemon.type2] || 'bg-gray-400'}`}>
                              {pokemon.type2}
                            </span>
                          )}
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
          <div className="text-base text-gray-600">
            💡 실제 출현율 = 포켓몬 출현율 × (개별 확률 ÷ 전체 확률 합계)
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
              disabled={totalRate > 100}
              className={`px-6 py-2 rounded-lg font-semibold ${
                totalRate > 100
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

