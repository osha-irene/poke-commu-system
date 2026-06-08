import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Percent, TrendingUp, Sparkles, Package, Plus, X, Save } from 'lucide-react';
import { useGame } from '../../../../contexts/GameContext';
import { TYPE_NAMES_EN } from '../../../../styles/theme';

export default function PokemonSettingsPanel({ region, onUpdateRegion }) {
  const { allPokemonMaster, gamePokedex } = useGame();
  
  const [encounterRate, setEncounterRate] = useState(
    region.encounterRate !== undefined ? region.encounterRate : 90
  );
  const [minLevel, setMinLevel] = useState(region.minLevel || 5);
  const [maxLevel, setMaxLevel] = useState(region.maxLevel || 20);
  const [searchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(() => {
    const pokemons = region.pokemons;
    return Array.isArray(pokemons) ? pokemons : [];
  });
  const [pokemonRates, setPokemonRates] = useState(region.pokemonRates || {});
  const [shinyRate, setShinyRate] = useState(region.shinyRate || 4096);
  const [typeFilter] = useState('all');
  const [allowNationalPokedex, setAllowNationalPokedex] = useState(
    region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false
  );
  const [pokedexTab, setPokedexTab] = useState(
    region.allowNationalPokedex ? 'national' : 'game'
  );
  const [showRegionalForms] = useState(true);

  // region.id가 변경될 때만 초기화 (같은 지역 내 업데이트는 무시)
  useEffect(() => {
    setEncounterRate(region.encounterRate !== undefined ? region.encounterRate : 90);
    setMinLevel(region.minLevel || 5);
    setMaxLevel(region.maxLevel || 20);
    setSelectedPokemon(Array.isArray(region.pokemons) ? region.pokemons : []);
    setPokemonRates(region.pokemonRates || {});
    setShinyRate(region.shinyRate || 4096);
    const nationalPokedex = region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false;
    setAllowNationalPokedex(nationalPokedex);
    setPokedexTab(nationalPokedex ? 'national' : 'game');
  }, [region.id, region.encounterRate, region.minLevel, region.maxLevel, region.pokemons, region.pokemonRates, region.shinyRate, region.allowNationalPokedex]);

  const handleToggleNationalPokedex = () => {
    const newValue = !allowNationalPokedex;
    setAllowNationalPokedex(newValue);
    setPokedexTab(newValue ? 'national' : 'game');
  };

  const getAvailablePokemonForEncounter = () => {
    const targetPokedex = allowNationalPokedex ? allPokemonMaster : gamePokedex;
    
    return selectedPokemon.filter(pokemonId => {
      return targetPokedex.some(p => 
        p.id === pokemonId || 
        p.number === pokemonId || 
        p.originalNumber === pokemonId
      );
    });
  };

  const availableEncounterPokemon = getAvailablePokemonForEncounter();

  const calculateProbabilities = () => {
    const totalWeight = availableEncounterPokemon.reduce((sum, pokemonId) => {
      return sum + (pokemonRates[pokemonId] || 10);
    }, 0);

    return availableEncounterPokemon.map(pokemonId => {
      const weight = pokemonRates[pokemonId] || 10;
      const relativeProb = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      const actualProb = (relativeProb / 100) * encounterRate;
      return { pokemonId, weight, relativeProb, actualProb };
    });
  };

  const probabilities = calculateProbabilities();

  const colorPalette = [
    '#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'
  ];

  const handleSave = async () => {
    const updatedRegion = {
      ...region,
      pokemons: selectedPokemon,
      pokemonRates: pokemonRates,
      encounterRate: parseFloat(encounterRate),
      minLevel: parseInt(minLevel),
      maxLevel: parseInt(maxLevel),
      shinyRate: parseInt(shinyRate),
      allowNationalPokedex: allowNationalPokedex
    };

    console.log('저장할 지역 데이터:', updatedRegion);
    console.log('allowNationalPokedex 값:', allowNationalPokedex);

    await onUpdateRegion(region.id, updatedRegion);
    
    // 저장 후 로컬 상태도 강제로 업데이트
    setAllowNationalPokedex(updatedRegion.allowNationalPokedex);
    setPokedexTab(updatedRegion.allowNationalPokedex ? 'national' : 'game');
    
    alert('지역 설정이 저장되었습니다!');
  };

  const togglePokemon = (pokemon) => {
    const pokemonId = pokemon.number;
    
    setSelectedPokemon(prev => {
      if (prev.includes(pokemonId)) {
        const newRates = { ...pokemonRates };
        delete newRates[pokemonId];
        setPokemonRates(newRates);
        return prev.filter(id => id !== pokemonId);
      } else {
        setPokemonRates(prev => ({ ...prev, [pokemonId]: 10 }));
        return [...prev, pokemonId];
      }
    });
  };

  const updateRate = (pokemonId, rate) => {
    setPokemonRates(prev => ({ ...prev, [pokemonId]: parseInt(rate) || 1 }));
  };

  // allowNationalPokedex 기반으로 도감 결정
  const currentPokedex = allowNationalPokedex ? allPokemonMaster : gamePokedex;

  const getKoreanTypeName = (englishType) => {
    const entry = Object.entries(TYPE_NAMES_EN).find(([kr, en]) => 
      en.toLowerCase() === englishType.toLowerCase()
    );
    return entry ? entry[0] : null;
  };

  const filteredPokemon = useMemo(() => {
    if (!currentPokedex) return [];
    
    return currentPokedex.filter(p => {
      // 리전폼 필터
      if (!showRegionalForms && p.isRegionalForm) return false;
      
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (typeFilter !== 'all') {
        const targetTypeKr = getKoreanTypeName(typeFilter);
        
        let pokemonTypes = [];
        
        if (Array.isArray(p.types)) {
          pokemonTypes = p.types.map(t => {
            if (typeof t === 'string') return t;
            if (t.type?.name) return t.type.name;
            if (t.name) return t.name;
            return '';
          });
        } else {
          if (p.type) pokemonTypes.push(p.type);
          if (p.type2) pokemonTypes.push(p.type2);
        }
        
        const hasType = pokemonTypes.some(t => t === targetTypeKr);
        
        if (!hasType) return false;
      }
      
      return true;
    });
  }, [currentPokedex, searchQuery, typeFilter, showRegionalForms]);

  return (
    <div className="bg-white rounded-lg border-2 border-indigo-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={24} />
          포켓몬 출현 설정
        </h4>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">전국도감</span>
          <button
            onClick={handleToggleNationalPokedex}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              allowNationalPokedex ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                allowNationalPokedex ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Percent size={16} />
            조우율 (%)
          </label>
          <input
            type="number"
            value={encounterRate}
            onChange={(e) => setEncounterRate(parseFloat(e.target.value))}
            min="0"
            max="100"
            step="5"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <TrendingUp size={16} />
            최소 레벨
          </label>
          <input
            type="number"
            value={minLevel}
            onChange={(e) => setMinLevel(parseInt(e.target.value))}
            min="1"
            max="100"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <TrendingUp size={16} />
            최대 레벨
          </label>
          <input
            type="number"
            value={maxLevel}
            onChange={(e) => setMaxLevel(parseInt(e.target.value))}
            min="1"
            max="100"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Sparkles size={16} />
            이로치 확률
          </label>
          <input
            type="number"
            value={shinyRate}
            onChange={(e) => setShinyRate(parseInt(e.target.value) || 4096)}
            min="1"
            max="100000"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 text-xs text-gray-600">
            1/{shinyRate} ({(100/shinyRate).toFixed(3)}%)
          </div>
        </div>
      </div>

      {availableEncounterPokemon.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            확률 분포
          </h5>
          
          <div className="w-full h-8 flex rounded-lg overflow-hidden border-2 border-gray-300">
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-all"
              style={{ width: `${100 - encounterRate}%` }}
              title={`미조우: ${(100 - encounterRate).toFixed(1)}%`}
            >
              {(100 - encounterRate) >= 5 && '미조우'}
            </div>
            
            {probabilities
              .sort((a, b) => b.actualProb - a.actualProb)
              .map(({ pokemonId, actualProb }, index) => {
                const pokemon = allPokemonMaster?.find(p => p.id === pokemonId || p.number === pokemonId);
                if (!pokemon) return null;
                
                const color = colorPalette[index % colorPalette.length];
                
                return (
                  <div
                    key={pokemonId}
                    className="flex items-center justify-center text-white text-xs font-bold transition-all hover:brightness-110"
                    style={{ 
                      width: `${actualProb}%`,
                      backgroundColor: color
                    }}
                    title={`${pokemon.name}: ${actualProb.toFixed(2)}%`}
                  >
                    {actualProb >= 5 && pokemon.name}
                  </div>
                );
              })}
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-gray-700">
                미조우: <span className="font-bold">{(100 - encounterRate).toFixed(1)}%</span>
              </span>
            </div>
            
            {probabilities
              .sort((a, b) => b.actualProb - a.actualProb)
              .map(({ pokemonId, actualProb }, index) => {
                const pokemon = allPokemonMaster?.find(p => p.id === pokemonId || p.number === pokemonId);
                if (!pokemon) return null;
                
                const color = colorPalette[index % colorPalette.length];
                
                return (
                  <div key={pokemonId} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-gray-700 truncate">
                      {pokemon.name}: <span className="font-bold">{actualProb.toFixed(2)}%</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-bold text-gray-800 flex items-center gap-2">
            <Package size={20} />
            선택된 포켓몬 ({availableEncounterPokemon.length}/{selectedPokemon.length}종 출현)
          </h5>
        </div>
        
        {selectedPokemon.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-2 text-gray-300" />
            <p>선택된 포켓몬이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedPokemon
              .map(pokemonId => {
                const pokemon = allPokemonMaster?.find(p => p.id === pokemonId || p.number === pokemonId);
                if (!pokemon) return null;
                
                const canEncounter = availableEncounterPokemon.includes(pokemonId);
                const prob = probabilities.find(p => p.pokemonId === pokemonId);
                
                return { pokemonId, pokemon, canEncounter, prob };
              })
              .filter(item => item !== null)
              .sort((a, b) => {
                if (a.canEncounter && !b.canEncounter) return -1;
                if (!a.canEncounter && b.canEncounter) return 1;
                if (a.canEncounter && b.canEncounter) {
                  return (b.prob?.actualProb || 0) - (a.prob?.actualProb || 0);
                }
                return a.pokemon.name.localeCompare(b.pokemon.name);
              })
              .map(({ pokemonId, pokemon, canEncounter, prob }) => {
                const weight = pokemonRates[pokemonId] || 10;
                const relativeProb = prob?.relativeProb || 0;
                const actualProb = prob?.actualProb || 0;

                return (
                  <div
                    key={pokemonId}
                    className={`flex items-center gap-3 border-2 rounded-lg p-3 transition-colors ${
                      canEncounter
                        ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-red-50 border-red-200 opacity-60'
                    }`}
                  >
                    <img
                      src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                      alt={pokemon.name}
                      className="w-12 h-12"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 flex items-center gap-2">
                        {pokemon.name}
                        {!canEncounter && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            출현불가
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">No.{pokemon.number}</div>
                    </div>
                    
                    {canEncounter && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">실제 조우율:</div>
                          <div className="text-xl font-bold text-indigo-600">
                            {actualProb.toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">조우 시:</div>
                          <div className="text-lg font-semibold text-gray-600">
                            {relativeProb.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600">가중치</div>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => updateRate(pokemonId, e.target.value)}
                        min="1"
                        max="100"
                        className="w-16 border-2 border-indigo-300 rounded px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none"
                        disabled={!canEncounter}
                      />
                    </div>
                    
                    <button
                      onClick={() => togglePokemon(pokemon)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div>
        <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Plus size={20} />
          포켓몬 추가
        </h5>
        
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              setPokedexTab('game');
              setAllowNationalPokedex(false);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'game'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            게임 도감 ({gamePokedex?.length || 0})
          </button>
          <button
            onClick={() => {
              setPokedexTab('national');
              setAllowNationalPokedex(true);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'national'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전국 도감 ({allPokemonMaster?.length || 0})
          </button>
        </div>
        

        
        <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <Package size={12} />
          {filteredPokemon.length}마리 검색됨
        </div>
        
        <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
          {filteredPokemon.map(pokemon => {
            const isSelected = selectedPokemon.includes(pokemon.number);
            
            return (
              <button
                key={pokemon.id || pokemon.number}
                onClick={() => togglePokemon(pokemon)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-100'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
                title={pokemon.name}
              >
                <img
                  src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                  alt={pokemon.name}
                  className="w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="text-xs text-center truncate">{pokemon.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        설정 저장
      </button>
    </div>
  );
}