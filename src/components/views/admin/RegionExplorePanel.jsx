// src/components/views/admin/RegionExplorePanel.jsx
import React, { useState, useMemo } from 'react';
import { MapPin, Settings, Gift, Package, ChevronRight, Save, Coins, Apple, TreePine, Search, TrendingUp, Percent, X, Plus, Sparkles, ChevronDown } from 'lucide-react';
import { getItemPocket, getItemIcon, CATEGORIES, filterItemsByPocket } from '../../../utils/itemUtils';
import { useGame } from '../../../contexts/GameContext';
import { TYPE_NAMES_KR, TYPE_NAMES_EN, getTypeColor } from '../../../styles/theme';

export default function RegionExplorePanel({ 
  regions = [],
  allItems = [],
  onUpdateRegion,
  onUpdateRegionLootConfig
}) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [editMode, setEditMode] = useState(null);

  const handleRegionClick = (region) => {
    const sanitizedRegion = {
      ...region,
      pokemons: Array.isArray(region.pokemons) ? region.pokemons : []
    };
    setSelectedRegion(sanitizedRegion);
    setEditMode(null);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MapPin size={22} />
          지역 & 탐험 관리
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          각 지역의 출현 포켓몬과 탐험 보상을 설정합니다
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 지역 목록 */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b-2 border-gray-200 p-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin size={20} />
                지역 목록 ({regions.length})
              </h3>
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {regions.map(region => {
                const isSelected = selectedRegion?.id === region.id;
                const hasLootConfig = region.lootConfig && Object.keys(region.lootConfig).length > 0;
                
                return (
                  <button
                    key={region.id}
                    onClick={() => handleRegionClick(region)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 mb-1">{region.name}</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <Package size={12} />
                            포켓몬: {Array.isArray(region.pokemons) ? region.pokemons.length : 0}종
                          </div>
                          <div className="flex items-center gap-1">
                            <Percent size={12} />
                            조우율: {((region.encounterRate || 0.5)).toFixed(0)}%
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            레벨: Lv.{region.minLevel || 5}~{region.maxLevel || 20}
                          </div>
                          {hasLootConfig && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Gift size={12} />
                              <span>보상 설정됨</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 오른쪽: 상세 설정 */}
        <div className="col-span-8">
          {!selectedRegion ? (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-12 text-center">
              <MapPin size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">왼쪽에서 지역을 선택하세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 지역 정보 카드 */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{selectedRegion.name}</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Package size={16} />
                      출현 포켓몬
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedRegion.pokemons?.length || 0}종
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Percent size={16} />
                      조우율
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {((selectedRegion.encounterRate || 0.5)).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp size={16} />
                      레벨 범위
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {selectedRegion.minLevel || 5}~{selectedRegion.maxLevel || 20}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditMode('pokemon')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                      editMode === 'pokemon'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                  >
                    <Settings size={20} />
                    포켓몬 설정
                  </button>
                  
                  <button
                    onClick={() => setEditMode('loot')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                      editMode === 'loot'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Gift size={20} />
                    탐험 보상 설정
                  </button>
                </div>
              </div>

              {/* 포켓몬 설정 */}
              {editMode === 'pokemon' && (
                <PokemonSettingsPanel
                  region={selectedRegion}
                  onUpdateRegion={onUpdateRegion}
                />
              )}

              {/* 탐험 보상 설정 */}
              {editMode === 'loot' && (
                <LootSettingsPanel
                  region={selectedRegion}
                  allItems={allItems}
                  onUpdateRegionLootConfig={onUpdateRegionLootConfig}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// 포켓몬 설정 패널
function PokemonSettingsPanel({ region, onUpdateRegion }) {
  // ✅ GameContext에서 포켓몬 데이터 가져오기
  const { allPokemonMaster, gamePokedex } = useGame();
  
  const [encounterRate, setEncounterRate] = useState(
    region.encounterRate !== undefined ? region.encounterRate : 90
  );
  const [minLevel, setMinLevel] = useState(region.minLevel || 5);
  const [maxLevel, setMaxLevel] = useState(region.maxLevel || 20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(() => {
    const pokemons = region.pokemons;
    return Array.isArray(pokemons) ? pokemons : [];
  });
  const [pokemonRates, setPokemonRates] = useState(region.pokemonRates || {});
  const [shinyRate, setShinyRate] = useState(region.shinyRate || 4096);
  const [typeFilter, setTypeFilter] = useState('all');
  const [pokedexTab, setPokedexTab] = useState('game');
  const [allowNationalPokedex, setAllowNationalPokedex] = useState(
    region.allowNationalPokedex !== undefined ? region.allowNationalPokedex : false
  );

  // ✅ 타입 목록
  const pokemonTypes = [
    { id: 'all', name: '전체' },
    ...Object.entries(TYPE_NAMES_EN).map(([nameKr, nameEn]) => ({
      id: nameEn,
      name: nameKr
    }))
  ];

  // ✅ 실제 출현 가능한 포켓몬 필터링
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
  const totalWeight = availableEncounterPokemon.reduce((sum, id) => sum + (pokemonRates[id] || 10), 0);

  // ✅ 색상 팔레트
  const colorPalette = [
    '#6366f1', // indigo
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
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

    await onUpdateRegion(region.id, updatedRegion);
    alert('✅ 지역 설정이 저장되었습니다!');
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

  const currentPokedex = pokedexTab === 'game' ? gamePokedex : allPokemonMaster;

  // ✅ useMemo 밖에 함수 선언
const getKoreanTypeName = (englishType) => {
  const entry = Object.entries(TYPE_NAMES_EN).find(([kr, en]) => 
    en.toLowerCase() === englishType.toLowerCase()
  );
  return entry ? entry[0] : null;
};

const filteredPokemon = useMemo(() => {
  if (!currentPokedex) return [];
  
  return currentPokedex.filter(p => {
    // 이름 검색
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // 타입 필터
    if (typeFilter !== 'all') {
      // ✅ 영어 타입을 한글로 변환
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
      
      // ✅ 한글 타입으로 비교
      const hasType = pokemonTypes.some(t => t === targetTypeKr);
      
      if (!hasType) return false;
    }
    
    return true;
  });
}, [currentPokedex, searchQuery, typeFilter, pokedexTab]);

  return (
    <div className="bg-white rounded-lg border-2 border-indigo-200 p-6 space-y-6">
      {/* ✅ 제목 + 전국도감 스위치 */}
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={24} />
          포켓몬 출현 설정
        </h4>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">전국도감</span>
          <button
            onClick={() => setAllowNationalPokedex(!allowNationalPokedex)}
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

      {/* 기본 설정 */}
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

      {/* ✅ 확률 분포 바 */}
      {availableEncounterPokemon.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            확률 분포
          </h5>
          
          {/* ✅ 통합 확률 바 */}
          <div className="w-full h-8 flex rounded-lg overflow-hidden border-2 border-gray-300">
            {/* 미조우 */}
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-all"
              style={{ width: `${100 - encounterRate}%` }}
              title={`미조우: ${(100 - encounterRate).toFixed(1)}%`}
            >
              {(100 - encounterRate) >= 5 && '미조우'}
            </div>
            
            {/* 각 포켓몬 */}
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
          
          {/* ✅ 범례 */}
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

   {/* 선택된 포켓몬 리스트 */}
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
      {/* ✅ 출현 가능 여부로 정렬 */}
      {selectedPokemon
        .map(pokemonId => {
          const pokemon = allPokemonMaster?.find(p => p.id === pokemonId || p.number === pokemonId);
          if (!pokemon) return null;
          
          const canEncounter = availableEncounterPokemon.includes(pokemonId);
          const prob = probabilities.find(p => p.pokemonId === pokemonId);
          
          return {
            pokemonId,
            pokemon,
            canEncounter,
            prob
          };
        })
        .filter(item => item !== null)
        // ✅ 출현 가능한 포켓몬 먼저, 그 다음 이름순
        .sort((a, b) => {
          if (a.canEncounter && !b.canEncounter) return -1;
          if (!a.canEncounter && b.canEncounter) return 1;
          // 둘 다 같은 상태면 확률 높은 순
          if (a.canEncounter && b.canEncounter) {
            return (b.prob?.actualProb || 0) - (a.prob?.actualProb || 0);
          }
          // 둘 다 출현 불가면 이름순
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

      {/* 포켓몬 추가 */}
      <div>
        <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Plus size={20} />
          포켓몬 추가
        </h5>
        
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setPokedexTab('game')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'game'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            게임 도감 ({gamePokedex?.length || 0})
          </button>
          <button
            onClick={() => setPokedexTab('national')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'national'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전국 도감 ({allPokemonMaster?.length || 0})
          </button>
        </div>
        
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="포켓몬 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-40 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none bg-white cursor-pointer"
          >
            {pokemonTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
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


// 탐험 보상 설정 패널
function LootSettingsPanel({ region, allItems, onUpdateRegionLootConfig }) {
  const getDefaultLootConfig = () => ({
    money: { min: 50, max: 200 },
    itemCount: { min: 0, max: 2 },        // 일반 아이템 (베리/식재료 제외)
    ingredientCount: { min: 0, max: 1 },  // 식재료만
    berryCount: { min: 0, max: 1 },       // 나무열매만
    itemPool: [],                         // 일반 아이템 풀
    ingredientPool: [],                   // 식재료 풀
    berryPool: []                         // 나무열매 풀
  });

  const [lootConfig, setLootConfig] = useState(region.lootConfig || getDefaultLootConfig());
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (itemCategory !== 'all') {
      items = filterItemsByPocket(items, itemCategory);
    }

    if (itemSearch) {
      const query = itemSearch.toLowerCase();
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.nameEn?.toLowerCase().includes(query)
      );
    }

    const uniqueItems = Array.from(
      new Map(items.map(item => [item.id, item])).values()
    );

    return uniqueItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allItems, itemCategory, itemSearch]);

  const poolCounts = {
    normalItems: (lootConfig.itemPool || []).length,
    ingredients: (lootConfig.ingredientPool || []).length,
    berries: (lootConfig.berryPool || []).length
  };

  const toggleItem = (itemId, item) => {
    const pocket = getItemPocket(item);
    let poolName = 'itemPool';
    
    if (pocket === 'berries') {
      poolName = 'berryPool';
    } else if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
      poolName = 'ingredientPool';
    }

    const current = lootConfig[poolName] || [];
    setLootConfig({
      ...lootConfig,
      [poolName]: current.includes(itemId) 
        ? current.filter(id => id !== itemId)
        : [...current, itemId]
    });
  };

  const isItemSelected = (itemId, item) => {
    const pocket = getItemPocket(item);
    
    if (pocket === 'berries') {
      return (lootConfig.berryPool || []).includes(itemId);
    } else if (item.cooking?.isIngredient || item.category?.includes('ingredient')) {
      return (lootConfig.ingredientPool || []).includes(itemId);
    }
    return (lootConfig.itemPool || []).includes(itemId);
  };

  const updateCount = (type, field, value) => {
    setLootConfig({
      ...lootConfig,
      [type]: { ...lootConfig[type], [field]: parseInt(value) || 0 }
    });
  };

  const handleSave = async () => {
    await onUpdateRegionLootConfig(region.id, lootConfig);
    alert('✅ 탐험 보상이 저장되었습니다!');
  };

  return (
    <div className="bg-white rounded-lg border-2 border-green-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Gift size={24} />
          탐험 보상 설정
        </h4>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          총 {poolCounts.normalItems + poolCounts.ingredients + poolCounts.berries}개 선택됨
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package size={24} className="text-blue-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <div className="font-bold mb-1 flex items-center gap-2">
              <Gift size={16} />
              보상 구조
            </div>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <Coins size={12} className="text-yellow-600" />
                <strong>골드</strong>: 항상 지급
              </li>
              <li className="flex items-center gap-2">
                <Package size={12} className="text-blue-600" />
                <strong>아이템</strong>: 일반 아이템 (몬스터볼, 회복약 등) 
                <span className="text-blue-600 font-semibold">{poolCounts.normalItems}개 풀</span>
              </li>
              <li className="flex items-center gap-2">
                <Apple size={12} className="text-red-600" />
                <strong>식재료</strong>: 요리 재료 전용 
                <span className="text-red-600 font-semibold">{poolCounts.ingredients}개 풀</span>
              </li>
              <li className="flex items-center gap-2">
                <TreePine size={12} className="text-green-600" />
                <strong>나무열매</strong>: 베리 전용 
                <span className="text-green-600 font-semibold">{poolCounts.berries}개 풀</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 상단: 골드 + 개수 설정 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 골드 설정 */}
        <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="text-yellow-600" size={20} />
            <h4 className="font-bold text-gray-800">골드 (필수)</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.money.min}
                onChange={(e) => updateCount('money', 'min', e.target.value)}
                className="w-full border-2 border-yellow-300 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.money.max}
                onChange={(e) => updateCount('money', 'max', e.target.value)}
                className="w-full border-2 border-yellow-300 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
            <TrendingUp size={12} />
            {lootConfig.money.min}~{lootConfig.money.max}원 사이 랜덤 지급
          </div>
        </div>

        {/* 아이템 개수 설정 */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="text-blue-600" size={20} />
              <h4 className="font-bold text-gray-800">일반 아이템</h4>
            </div>
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Package size={10} />
              {poolCounts.normalItems}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.itemCount.min}
                onChange={(e) => updateCount('itemCount', 'min', e.target.value)}
                className="w-full border-2 border-blue-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.itemCount.max}
                onChange={(e) => updateCount('itemCount', 'max', e.target.value)}
                className="w-full border-2 border-blue-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.itemCount.min}~{lootConfig.itemCount.max}개 (베리/식재료 제외)
          </div>
        </div>

        {/* 식재료 개수 설정 */}
        <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Apple className="text-red-600" size={20} />
              <h4 className="font-bold text-gray-800">식재료</h4>
            </div>
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <Apple size={10} />
              {poolCounts.ingredients}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.ingredientCount.min}
                onChange={(e) => updateCount('ingredientCount', 'min', e.target.value)}
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.ingredientCount.max}
                onChange={(e) => updateCount('ingredientCount', 'max', e.target.value)}
                className="w-full border-2 border-red-300 rounded px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.ingredientCount.min}~{lootConfig.ingredientCount.max}개 (별도 지급)
          </div>
        </div>

        {/* 나무열매 개수 설정 */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TreePine className="text-green-600" size={20} />
              <h4 className="font-bold text-gray-800">나무열매</h4>
            </div>
            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full flex items-center gap-1">
              <TreePine size={10} />
              {poolCounts.berries}개 풀
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최소</label>
              <input
                type="number"
                value={lootConfig.berryCount.min}
                onChange={(e) => updateCount('berryCount', 'min', e.target.value)}
                className="w-full border-2 border-green-300 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">최대</label>
              <input
                type="number"
                value={lootConfig.berryCount.max}
                onChange={(e) => updateCount('berryCount', 'max', e.target.value)}
                className="w-full border-2 border-green-300 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                min="0"
              />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {lootConfig.berryCount.min}~{lootConfig.berryCount.max}개 (별도 지급)
          </div>
        </div>
      </div>

      {/* 아이템 선택 영역 */}
      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-800">획득 가능 아이템 선택</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
              <Package size={12} />
              일반 {poolCounts.normalItems}
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1">
              <Apple size={12} />
              식재료 {poolCounts.ingredients}
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
              <TreePine size={12} />
              베리 {poolCounts.berries}
            </span>
          </div>
        </div>

        {/* 검색창 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="아이템 검색..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                onClick={() => setItemCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  itemCategory === cat.id
                    ? cat.color + ' shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* 필터링된 아이템 개수 */}
        <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
          <Package size={14} />
          {filteredItems.length}개의 아이템
        </div>
        
        {/* 아이템 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              const isSelected = isItemSelected(item.id, item);
              const ItemIcon = getItemIcon(item);
              const pocket = getItemPocket(item);
              const isIngredient = item.cooking?.isIngredient || item.category?.includes('ingredient');
              const isBerry = pocket === 'berries';
              
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id, item)}
                  className={`flex flex-col border-2 rounded-xl transition-all group bg-white overflow-hidden relative ${
                    isSelected
                      ? 'border-green-500 shadow-lg'
                      : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  {/* 선택 표시 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center z-10">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}

                  {/* 아이템 이미지 */}
                  <div className="aspect-square bg-gray-50 p-6 flex items-center justify-center relative">
                    {item.spriteUrl ? (
                      <img 
                        src={item.spriteUrl} 
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                        style={{ 
                          imageRendering: 'pixelated',
                          transform: isIngredient ? 'scale(1)' : 'scale(2)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div style={{ display: item.spriteUrl ? 'none' : 'flex' }} className="w-full h-full items-center justify-center absolute inset-0">
                      <ItemIcon size={48} className="text-gray-300" />
                    </div>
                  </div>
                  
                  {/* 아이템 정보 */}
                  <div className="p-2 bg-white border-t border-gray-200">
                    <div className={`text-xs font-semibold text-center truncate ${
                      isSelected ? 'text-green-700' : 'text-gray-800 group-hover:text-green-700'
                    }`}>
                      {item.name}
                    </div>
                    
                    {/* 카테고리 표시 */}
                    {isIngredient && (
                      <div className="text-[10px] text-center text-red-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <Apple size={10} />
                        식재료
                      </div>
                    )}
                    {isBerry && (
                      <div className="text-[10px] text-center text-green-600 mt-0.5 flex items-center justify-center gap-0.5">
                        <TreePine size={10} />
                        베리
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Search size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        보상 저장
      </button>
    </div>
  );
}