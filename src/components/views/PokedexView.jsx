import React, { useState } from 'react';
import { Search, Lock, CheckCircle, Edit2, MapPin } from 'lucide-react';
import { COLORS } from '../../styles/theme';

const TYPE_COLORS = COLORS.types;

export default function PokedexView({ 
  pokedex = [],           // 게임 도감
  allPokedex = [],        // 전체 도감 (리전폼 포함)
  caughtPokemon = [],
  pokedexData = {},
  regions = [],
  currentUser = null,
  onUpdateMemo,
  onUpdatePokedexRegions
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [isEditingRegions, setIsEditingRegions] = useState(false);
  const [editableRegions, setEditableRegions] = useState([]);

  const myCaughtNumbers = new Set(caughtPokemon.map(p => p?.number).filter(Boolean));
  const unlockedNumbers = new Set(Object.keys(pokedexData).map(num => parseInt(num)));
  
  // 원종 또는 리전폼 중 하나라도 해금되면 카드 표시
  const unlockedPokedex = pokedex.filter(pokemon => {
    const isRegionalForm = pokemon.originalNumber && pokemon.originalNumber !== pokemon.number;
    
    if (isRegionalForm) {
      // 리전폼은 카드로 표시 안 함 (원종 카드에서 탭으로 확인)
      return false;
    }
    
    // 원종 카드: 원종 자체가 해금되었거나, 해당 원종의 리전폼 중 하나라도 해금되면 표시
    const isOriginalUnlocked = unlockedNumbers.has(pokemon.number);
    const hasUnlockedRegionalForm = allPokedex.some(p => 
      p.originalNumber === pokemon.number && 
      unlockedNumbers.has(p.number)
    );
    
    return isOriginalUnlocked || hasUnlockedRegionalForm;
  });

  const filteredPokedex = unlockedPokedex.filter(pokemon => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      pokemon.name.toLowerCase().includes(query) ||
      pokemon.nameEn?.toLowerCase().includes(query) ||
      (pokemon.newNumber && pokemon.newNumber.toString().includes(query)) ||
      (pokemon.originalNumber && pokemon.originalNumber.toString().includes(query))
    );
  });

  const unlockedCount = unlockedPokedex.length;
  const totalCount = pokedex.length;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const getPokemonRegions = (pokemon) => {
    // 리전폼은 자신의 number로 먼저 확인, 없으면 originalNumber로 확인
    const pokemonNumber = pokemon.number;
    const pokemonOriginalNumber = pokemon.originalNumber || pokemon.number;
    
    console.log('🗺️ 출현 지역 검색:', pokemon.name, 'number:', pokemon.number, 'originalNumber:', pokemon.originalNumber);
    
    // 1. 수동 등록: 리전폼 자체 번호로 먼저 확인
    const entryByNumber = pokedexData[pokemonNumber];
    if (entryByNumber?.regions && entryByNumber.regions.length > 0) {
      console.log('  → 수동 등록된 지역 (자체 번호):', entryByNumber.regions);
      return entryByNumber.regions;
    }
    
    // 2. 수동 등록: 원종 번호로 확인 (폴백)
    const entryByOriginal = pokedexData[pokemonOriginalNumber];
    if (entryByOriginal?.regions && entryByOriginal.regions.length > 0) {
      console.log('  → 수동 등록된 지역 (원종 번호):', entryByOriginal.regions);
      return entryByOriginal.regions;
    }
    
    if (!regions || regions.length === 0) return [];
    
    // 3. 자동 검색: 리전폼 자체 번호로 검색
    const foundRegions = regions
      .filter(region => {
        const hasInPokemons = region.pokemons.includes(pokemon.id) || 
               region.pokemons.includes(pokemonNumber) || // 리전폼 자체 번호
               region.pokemons.includes(pokemonOriginalNumber); // 원종 번호
        
        if (hasInPokemons) {
          console.log('  → 지역 발견:', region.name, 'pokemons:', region.pokemons.slice(0, 5), '...');
        }
        
        return hasInPokemons;
      })
      .map(region => region.name);
    
    console.log('  → 최종 출현 지역:', foundRegions);
    return foundRegions;
  };

  // 리전폼 검색 (전체 도감에서, 해금된 것만)
  const getRegionalForms = (pokemon) => {
    if (!pokemon || !allPokedex || allPokedex.length === 0) return [];
    
    const baseNumber = pokemon.originalNumber || pokemon.number;
    
    const forms = allPokedex.filter(p => {
      // 리전폼 조건: originalNumber를 가지고 있고, 원종과 다른 번호
      const isRegionalForm = p.originalNumber && p.originalNumber !== p.number;
      // 같은 원종 가족
      const isSameFamily = p.originalNumber === baseNumber || (p.originalNumber && p.originalNumber === pokemon.number);
      // 자기 자신 제외
      const isDifferent = p.number !== pokemon.number;
      // 해금 여부
      const isUnlocked = unlockedNumbers.has(p.number);
      
      return isRegionalForm && isSameFamily && isDifferent && isUnlocked;
    });
    
    console.log('🔍 리전폼 검색:', pokemon.name, 'baseNumber:', baseNumber, 'forms:', forms.map(f => `${f.name}(${f.number})`));
    return forms;
  };

  // 원종 찾기 (전체 도감에서, 해금된 것만)
  const getOriginalForm = (pokemon) => {
    if (!pokemon || !allPokedex || allPokedex.length === 0) return null;
    
    // 현재 포켓몬이 리전폼인 경우에만 원종 찾기
    const isRegionalForm = pokemon.originalNumber && pokemon.originalNumber !== pokemon.number;
    
    if (isRegionalForm) {
      const original = allPokedex.find(p => 
        p.number === pokemon.originalNumber &&
        unlockedNumbers.has(p.number) // 원종도 해금되어야 탭 표시
      );
      console.log('🔍 원종 검색:', pokemon.name, '→', original?.name, '해금:', original ? unlockedNumbers.has(original.number) : false);
      return original;
    }
    
    return null;
  };

  const handlePokemonClick = (pokemon) => {
    const pokemonOriginalNumber = pokemon.originalNumber || pokemon.number;
    if (!unlockedNumbers.has(pokemonOriginalNumber)) return;
    
    setSelectedPokemon(pokemon);
    
    // ⭐ 원종이 해금되어 있으면 원종부터, 아니면 해금된 첫 번째 리전폼
    if (unlockedNumbers.has(pokemon.number)) {
      setSelectedForm(pokemon);
    } else {
      // 원종이 해금 안 됐으면 리전폼 중 해금된 것 찾기
      const unlockedRegionalForm = allPokedex.find(p => 
        p.originalNumber === pokemon.number && 
        unlockedNumbers.has(p.number)
      );
      setSelectedForm(unlockedRegionalForm || pokemon);
    }
    
    setIsEditingMemo(false);
    setIsEditingRegions(false);
    
    const entry = pokedexData[pokemonOriginalNumber];
    setMemoText(entry?.memo || '');
  };

  const handleSaveMemo = () => {
    if (!selectedPokemon || !onUpdateMemo) return;
    
    const pokemonOriginalNumber = selectedPokemon.originalNumber || selectedPokemon.number;
    const entry = pokedexData[pokemonOriginalNumber];
    
    if (entry && entry.firstCatcher === currentUser?.name) {
      onUpdateMemo(pokemonOriginalNumber, memoText);
      setIsEditingMemo(false);
    } else {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
    }
  };

  const handleEditMemo = () => {
    const pokemonOriginalNumber = selectedPokemon.originalNumber || selectedPokemon.number;
    const entry = pokedexData[pokemonOriginalNumber];
    if (entry && entry.firstCatcher === currentUser?.name) {
      setIsEditingMemo(true);
    } else {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
    }
  };

  const handleStartEditRegions = () => {
    const pokemonRegions = getPokemonRegions(selectedPokemon);
    setEditableRegions(pokemonRegions);
    setIsEditingRegions(true);
  };

  const toggleRegion = (regionName) => {
    setEditableRegions(prev => 
      prev.includes(regionName)
        ? prev.filter(r => r !== regionName)
        : [...prev, regionName]
    );
  };

  const handleSaveRegions = () => {
    const pokemonOriginalNumber = selectedPokemon.originalNumber || selectedPokemon.number;
    if (onUpdatePokedexRegions) {
      onUpdatePokedexRegions(pokemonOriginalNumber, editableRegions);
    }
    setIsEditingRegions(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">포켓몬 도감</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">{unlockedCount}/{totalCount}</div>
            <div className="text-sm text-gray-500">발견 {percentage}%</div>
            <div className="text-xs text-gray-400 mt-1">
              내가 잡은 포켓몬: {myCaughtNumbers.size}마리
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="해금된 포켓몬 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 도감 그리드 */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
        {filteredPokedex.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Lock size={64} className="mb-4" />
            <p className="text-lg font-semibold">
              {searchTerm ? '검색 결과가 없습니다' : '아직 발견된 포켓몬이 없습니다'}
            </p>
            <p className="text-sm mt-2">모험을 떠나 새로운 포켓몬을 만나보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {filteredPokedex.map((pokemon) => {
              const originalNumber = pokemon.originalNumber || pokemon.number;
              const isMyCaught = myCaughtNumbers.has(originalNumber);
              const isUnlocked = unlockedNumbers.has(originalNumber);
              const entry = pokedexData[originalNumber];
              const hasNote = entry?.memo;

              // ⭐ 카드에 표시할 포켓몬 결정: 원종이 해금되면 원종, 아니면 해금된 첫 리전폼
              let displayPokemon = pokemon;
              if (!unlockedNumbers.has(pokemon.number)) {
                // 원종이 해금 안 됐으면 리전폼 중 해금된 것 찾기
                const unlockedRegionalForm = allPokedex.find(p => 
                  p.originalNumber === pokemon.number && 
                  unlockedNumbers.has(p.number)
                );
                if (unlockedRegionalForm) {
                  displayPokemon = unlockedRegionalForm;
                }
              }

              return (
                <div
                  key={pokemon.number}
                  onClick={() => handlePokemonClick(pokemon)}
                  className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                    isUnlocked
                      ? 'border-indigo-300 bg-white cursor-pointer hover:shadow-lg hover:scale-105' 
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  {isMyCaught && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                      보유
                    </div>
                  )}

                  <div className="text-xs font-bold text-gray-500 mb-2">
                    No.{(pokemon.newNumber || pokemon.number).toString().padStart(3, '0')}
                  </div>

                  <div 
                    className="w-full h-24 mb-2"
                    style={{
                      backgroundImage: isUnlocked
                        ? `url(https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${displayPokemon.number}.png)`
                        : 'none',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      imageRendering: 'pixelated'
                    }}
                  >
                    {!isUnlocked && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Lock size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="text-sm font-bold text-gray-700 truncate">
                    {isUnlocked ? displayPokemon.name : '???'}
                  </div>

                  {isUnlocked && (
                    <div className="flex gap-1 justify-center mt-2">
                      <span 
                        className="text-xs px-2 py-0.5 rounded font-bold text-white"
                        style={{ backgroundColor: TYPE_COLORS[displayPokemon.type]?.bg || '#777' }}
                      >
                        {displayPokemon.type}
                      </span>
                      {displayPokemon.type2 && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded font-bold text-white"
                          style={{ backgroundColor: TYPE_COLORS[displayPokemon.type2]?.bg || '#777' }}
                        >
                          {displayPokemon.type2}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-1">
                    {entry?.firstCatcher && (
                      <div className="relative group">
                        <CheckCircle size={16} className="text-yellow-500" />
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          최초 포획: {entry.firstCatcher}
                        </div>
                      </div>
                    )}
                    {hasNote && (
                      <Edit2 size={14} className="text-blue-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 상세 정보 모달 */}
      {selectedPokemon && selectedForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedPokemon(null);
            setSelectedForm(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              {/* 도감 번호 - 리전폼도 원종 번호 표시 */}
              <div className="text-sm text-gray-500 mb-2">
                {(() => {
                  const displayNumber = selectedForm.originalNumber || selectedForm.number;
                  const baseForm = selectedForm.originalNumber 
                    ? allPokedex.find(p => p.number === selectedForm.originalNumber && !p.originalNumber)
                    : selectedForm;
                  
                  return (
                    <>
                      No.{displayNumber.toString().padStart(3, '0')}
                      {baseForm?.newNumber && (
                        <span className="ml-2 text-xs">
                          (게임도감 No.{baseForm.newNumber.toString().padStart(3, '0')})
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* 리전폼 탭 */}
              {(() => {
                // 현재 선택된 포켓몬이 원종인지 리전폼인지 확인
                const isCurrentRegionalForm = selectedPokemon.originalNumber && 
                                              selectedPokemon.originalNumber !== selectedPokemon.number;
                
                let originalForm = null;
                let regionalForms = [];
                
                if (isCurrentRegionalForm) {
                  // 리전폼 카드 클릭: 원종 + 다른 리전폼들
                  originalForm = getOriginalForm(selectedPokemon);
                  regionalForms = getRegionalForms(selectedPokemon);
                } else {
                  // 원종 카드 클릭: 원종 자신 + 리전폼들
                  originalForm = selectedPokemon;
                  regionalForms = allPokedex.filter(p => 
                    p.originalNumber === selectedPokemon.number && 
                    p.originalNumber !== p.number &&
                    unlockedNumbers.has(p.number)
                  );
                }
                
                const hasForms = (originalForm && unlockedNumbers.has(originalForm.number)) || regionalForms.length > 0;

                return hasForms && (
                  <div className="mb-4 flex flex-wrap gap-2 justify-center">
                    {/* 원종 버튼 */}
                    {originalForm && unlockedNumbers.has(originalForm.number) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForm(originalForm);
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedForm.number === originalForm.number
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        원종
                      </button>
                    )}

                    {/* 리전폼 버튼들 */}
                    {regionalForms.map(form => {
                      const regionName = form.name.match(/\(([^)]+)\)/)?.[1] || form.name;
                      
                      return (
                        <button
                          key={form.number}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForm(form);
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            selectedForm.number === form.number
                              ? 'bg-indigo-600 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {regionName}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 포켓몬 이미지 */}
              <img 
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedForm.number}.png`}
                alt={selectedForm.name}
                className="w-48 h-48 mx-auto mb-4"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* 이름 */}
              <h3 className="text-2xl font-bold mb-2">{selectedForm.name}</h3>
              <div className="text-sm text-gray-500 mb-4">{selectedForm.nameEn}</div>
              
              {/* 타입 */}
              <div className="flex gap-2 justify-center mb-4">
                <span 
                  className="px-3 py-1 rounded font-bold text-white"
                  style={{ backgroundColor: TYPE_COLORS[selectedForm.type]?.bg || '#777' }}
                >
                  {selectedForm.type}
                </span>
                {selectedForm.type2 && (
                  <span 
                    className="px-3 py-1 rounded font-bold text-white"
                    style={{ backgroundColor: TYPE_COLORS[selectedForm.type2]?.bg || '#777' }}
                  >
                    {selectedForm.type2}
                  </span>
                )}
              </div>

              {/* 출현 지역 */}
              <div className="text-left mb-4 p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-green-600" />
                    <div className="text-sm font-semibold text-gray-700">출현 지역</div>
                  </div>
                  {currentUser?.isAdmin && !isEditingRegions && (
                    <button
                      onClick={handleStartEditRegions}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 font-semibold"
                    >
                      편집
                    </button>
                  )}
                </div>
                
                {isEditingRegions ? (
                  <div className="space-y-2">
                    {regions.map(region => (
                      <label key={region.id} className="flex items-center gap-2 cursor-pointer hover:bg-green-100 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={editableRegions.includes(region.name)}
                          onChange={() => toggleRegion(region.name)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="text-sm text-gray-700">{region.name}</span>
                      </label>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSaveRegions}
                        className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-semibold"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setIsEditingRegions(false)}
                        className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 font-semibold"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {(() => {
                      // 현재 선택된 폼의 출현 지역 표시
                      const pokemonRegions = getPokemonRegions(selectedForm);
                      return pokemonRegions.length > 0 
                        ? pokemonRegions.join(', ')
                        : '출현 지역 정보가 없습니다';
                    })()}
                  </div>
                )}
              </div>

              {/* 최초 포획자/조우자 정보 & 메모 */}
              {(() => {
                const originalNumber = selectedPokemon.originalNumber || selectedPokemon.number;
                const entry = pokedexData[originalNumber];
                
                if (!entry || (!entry.firstCatcher && !entry.firstEncounter)) return null;
                
                if (entry.firstCatcher) {
                  return (
                    <div className="text-left p-4 bg-yellow-50 rounded border border-yellow-200 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-700">
                          🏆 최초 포획: {entry.firstCatcher}
                        </div>
                        {entry.firstCatcher === currentUser?.name && !isEditingMemo && (
                          <button
                            onClick={handleEditMemo}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>

                      {isEditingMemo ? (
                        <div>
                          <textarea
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="이 포켓몬에 대한 메모를 남겨보세요..."
                            className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows="3"
                            maxLength="200"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleSaveMemo}
                              className="flex-1 bg-indigo-600 text-white py-1 rounded text-sm hover:bg-indigo-700 font-semibold"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingMemo(false);
                                setMemoText(entry?.memo || '');
                              }}
                              className="flex-1 bg-gray-300 text-gray-700 py-1 rounded text-sm hover:bg-gray-400 font-semibold"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        entry.memo && (
                          <div className="text-sm text-gray-600 italic bg-white p-2 rounded">
                            "{entry.memo}"
                          </div>
                        )
                      )}

                      {!entry.memo && !isEditingMemo && 
                       entry.firstCatcher === currentUser?.name && (
                        <div className="text-xs text-gray-500 italic">
                          메모를 남겨보세요!
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="text-left p-4 bg-blue-50 rounded border border-blue-200 mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      👀 최초 조우: {entry.firstEncounter}
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded flex items-start gap-2">
                      <span>💡</span>
                      <span>아직 아무도 포획하지 않았습니다. 첫 포획자가 되어보세요!</span>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={() => {
                  setSelectedPokemon(null);
                  setSelectedForm(null);
                }}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-semibold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}