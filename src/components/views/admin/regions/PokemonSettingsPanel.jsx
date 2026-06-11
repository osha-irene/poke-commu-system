import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Percent, TrendingUp, Sparkles, Package, Plus, X, Save, ShieldCheck } from 'lucide-react';
import { useGame } from '../../../../contexts/GameContext';
import { getPokemonDisplayParts } from '../../../../utils/pokemonDisplayName';

const toPercent = (value, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed <= 1 ? Math.round(parsed * 100) : parsed;
};

const toRate = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed)) / 100;
};

const hasPokemonId = (pokemon, pokemonId) => (
  pokemon.id === pokemonId ||
  pokemon.number === pokemonId ||
  pokemon.originalNumber === pokemonId
);

export default function PokemonSettingsPanel({
  region,
  parentRegion = null,
  mode = 'place',
  onUpdateRegion
}) {
  const { allPokemonMaster = [], gamePokedex = [] } = useGame();
  const isRegionMode = mode === 'region';
  const regionPokemonPool = useMemo(
    () => (Array.isArray(parentRegion?.pokemons) ? parentRegion.pokemons : []),
    [parentRegion?.pokemons]
  );
  const parentEncounterRate = parentRegion?.encounterRate ?? 90;
  const parentMinLevel = parentRegion?.minLevel || 5;
  const parentMaxLevel = parentRegion?.maxLevel || 100;

  const [encounterRate, setEncounterRate] = useState(region.encounterRate !== undefined ? region.encounterRate : parentEncounterRate);
  const [minLevel, setMinLevel] = useState(region.minLevel || parentMinLevel);
  const [maxLevel, setMaxLevel] = useState(region.maxLevel || parentMaxLevel || 20);
  const [maxCatchRate, setMaxCatchRate] = useState(toPercent(region.maxCatchRate, 100));
  const [selectedPokemon, setSelectedPokemon] = useState(Array.isArray(region.pokemons) ? region.pokemons : []);
  const [pokemonRates, setPokemonRates] = useState(region.pokemonRates || {});
  const [shinyRate, setShinyRate] = useState(region.shinyRate || parentRegion?.shinyRate || 4096);
  const [pokemonSearchQuery, setPokemonSearchQuery] = useState('');
  const [allowNationalPokedex, setAllowNationalPokedex] = useState(
    region.allowNationalPokedex !== undefined
      ? region.allowNationalPokedex
      : false
  );
  const [pokedexTab, setPokedexTab] = useState(allowNationalPokedex ? 'national' : 'game');

  useEffect(() => {
    setEncounterRate(region.encounterRate !== undefined ? region.encounterRate : parentEncounterRate);
    setMinLevel(region.minLevel || parentMinLevel);
    setMaxLevel(region.maxLevel || parentMaxLevel || 20);
    setMaxCatchRate(toPercent(region.maxCatchRate, 100));
    setSelectedPokemon(Array.isArray(region.pokemons) ? region.pokemons : []);
    setPokemonRates(region.pokemonRates || {});
    setShinyRate(region.shinyRate || parentRegion?.shinyRate || 4096);

    const nationalPokedex = region.allowNationalPokedex !== undefined
      ? region.allowNationalPokedex
      : false;
    setAllowNationalPokedex(nationalPokedex);
    setPokedexTab(nationalPokedex ? 'national' : 'game');
  }, [
    region.id,
    region.encounterRate,
    region.minLevel,
    region.maxLevel,
    region.maxCatchRate,
    region.pokemons,
    region.pokemonRates,
    region.shinyRate,
    region.allowNationalPokedex,
    parentEncounterRate,
    parentMinLevel,
    parentMaxLevel,
    parentRegion?.shinyRate
  ]);

  const currentPokedex = allowNationalPokedex ? allPokemonMaster : gamePokedex;

  const selectablePokemon = useMemo(() => {
    if (!Array.isArray(currentPokedex)) return [];

    return currentPokedex.filter((pokemon) => {
      if (isRegionMode) return true;
      if (regionPokemonPool.length === 0) return false;
      return regionPokemonPool.some((pokemonId) => hasPokemonId(pokemon, pokemonId));
    });
  }, [currentPokedex, isRegionMode, regionPokemonPool]);

  const filteredSelectablePokemon = useMemo(() => {
    const query = pokemonSearchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!query) return selectablePokemon;

    return selectablePokemon.filter((pokemon) => {
      const number = String(pokemon.number ?? pokemon.id ?? '');
      const originalNumber = String(pokemon.originalNumber ?? '');
      const name = String(pokemon.name ?? '').toLowerCase();
      const englishName = String(pokemon.englishName ?? pokemon.nameEn ?? '').toLowerCase();

      return (
        number.includes(query) ||
        originalNumber.includes(query) ||
        name.includes(query) ||
        englishName.includes(query)
      );
    });
  }, [pokemonSearchQuery, selectablePokemon]);

  const availableEncounterPokemon = selectedPokemon.filter((pokemonId) => (
    selectablePokemon.some((pokemon) => hasPokemonId(pokemon, pokemonId))
  ));
  const displayedSelectedPokemon = isRegionMode ? selectedPokemon : regionPokemonPool;
  const isInGamePokedex = (pokemonId) => gamePokedex.some((pokemon) => hasPokemonId(pokemon, pokemonId));
  const selectedPokemonGroups = isRegionMode
    ? [
        { title: '영운 도감', ids: displayedSelectedPokemon.filter((pokemonId) => isInGamePokedex(pokemonId)) },
        { title: '전국 도감', ids: displayedSelectedPokemon.filter((pokemonId) => !isInGamePokedex(pokemonId)) }
      ]
    : [{ title: null, ids: displayedSelectedPokemon }];

  const probabilities = useMemo(() => {
    const totalWeight = availableEncounterPokemon.reduce((sum, pokemonId) => (
      sum + (pokemonRates[pokemonId] || 10)
    ), 0);

    return availableEncounterPokemon.map((pokemonId) => {
      const weight = pokemonRates[pokemonId] || 10;
      const relativeProb = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      const actualProb = (relativeProb / 100) * Number(encounterRate || 0);
      return { pokemonId, weight, relativeProb, actualProb };
    });
  }, [availableEncounterPokemon, encounterRate, pokemonRates]);

  const getPokemonById = (pokemonId) => (
    allPokemonMaster.find((pokemon) => hasPokemonId(pokemon, pokemonId))
  );

  const togglePokemon = (pokemon) => {
    const pokemonId = pokemon.number;

    setSelectedPokemon((prev) => {
      if (prev.includes(pokemonId)) {
        const nextRates = { ...pokemonRates };
        delete nextRates[pokemonId];
        setPokemonRates(nextRates);
        return prev.filter((id) => id !== pokemonId);
      }

      setPokemonRates((prevRates) => ({ ...prevRates, [pokemonId]: 10 }));
      return [...prev, pokemonId];
    });
  };

  const updateRate = (pokemonId, rate) => {
    setPokemonRates((prev) => ({ ...prev, [pokemonId]: parseInt(rate, 10) || 1 }));
  };

  const handleToggleNationalPokedex = () => {
    const nextValue = !allowNationalPokedex;
    setAllowNationalPokedex(nextValue);
    setPokedexTab(nextValue ? 'national' : 'game');
  };

  const handleSave = async () => {
    const cappedMaxLevel = isRegionMode
      ? parseInt(maxLevel, 10) || 1
      : Math.min(parseInt(maxLevel, 10) || 1, parentMaxLevel);
    const cappedMinLevel = Math.min(parseInt(minLevel, 10) || 1, cappedMaxLevel);

    const allowedSelectedPokemon = isRegionMode
      ? selectedPokemon
      : selectedPokemon.filter((pokemonId) => regionPokemonPool.includes(pokemonId));

    const nextRates = Object.fromEntries(
      Object.entries(pokemonRates).filter(([pokemonId]) => allowedSelectedPokemon.includes(Number(pokemonId)))
    );

    const updatedRegion = isRegionMode
      ? {
          ...region,
          pokemons: selectedPokemon,
          pokemonRates: {},
          encounterRate: parseFloat(encounterRate) || 0,
          minLevel: cappedMinLevel,
          maxLevel: cappedMaxLevel,
          maxCatchRate: toRate(maxCatchRate, 1),
          shinyRate: parseInt(shinyRate, 10) || 4096,
          allowNationalPokedex: false,
          places: Array.isArray(region.places)
            ? region.places.map((place) => ({
                ...place,
                pokemons: Array.isArray(place.pokemons)
                  ? place.pokemons.filter((pokemonId) => selectedPokemon.includes(pokemonId))
                  : [],
                encounterRate: place.encounterRate !== undefined ? place.encounterRate : parseFloat(encounterRate) || 0,
                maxLevel: Math.min(place.maxLevel || cappedMaxLevel, cappedMaxLevel),
                minLevel: Math.min(place.minLevel || cappedMinLevel, place.maxLevel || cappedMaxLevel)
              }))
            : []
        }
      : {
          ...region,
          pokemons: allowedSelectedPokemon,
          pokemonRates: nextRates,
          encounterRate: parseFloat(encounterRate) || 0,
          minLevel: cappedMinLevel,
          maxLevel: cappedMaxLevel,
          shinyRate: parseInt(shinyRate, 10) || parentRegion?.shinyRate || 4096,
          allowNationalPokedex
        };

    await onUpdateRegion(region.id, updatedRegion);
    alert(isRegionMode ? '지역 포켓몬 기준 설정이 저장되었습니다.' : '장소 출현 설정이 저장되었습니다.');
  };

  const colorPalette = ['#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];
  const renderPokemonSelectionCard = (pokemonId) => {
    const pokemon = getPokemonById(pokemonId);
    if (!pokemon) return null;

    const isSelected = selectedPokemon.includes(pokemonId);
    const existsInCurrentDex = isRegionMode || selectablePokemon.some((item) => hasPokemonId(item, pokemonId));
    const canEncounter = isRegionMode || (isSelected && existsInCurrentDex);
    const probability = probabilities.find((item) => item.pokemonId === pokemonId);

    return (
      <div
        key={pokemonId}
        onClick={isRegionMode ? undefined : () => togglePokemon(pokemon)}
        className={`relative min-h-[112px] items-center gap-2 border-2 rounded-lg p-2 transition-colors ${
          !isRegionMode && canEncounter
            ? 'grid grid-cols-[88px_minmax(0,1fr)] text-left'
            : 'flex flex-col justify-between text-center'
        } ${
          canEncounter
            ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
            : isSelected
              ? 'bg-gray-100 border-gray-200 text-gray-400'
              : 'bg-white border-lime-200 text-gray-700 hover:bg-lime-50'
        } ${!isRegionMode ? 'cursor-pointer' : ''}`}
      >
        {isSelected && !existsInCurrentDex && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/55 px-2">
            <span className="rounded-full bg-gray-700/80 px-2 py-0.5 text-[11px] font-bold text-white">
              출현 불가
            </span>
          </div>
        )}
        <div className="flex min-w-0 flex-col items-center justify-center text-center">
          <img
            src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
            alt={pokemon.name}
            className={`h-[72px] w-[72px] max-w-none object-contain ${isSelected || isRegionMode ? '' : 'opacity-45 grayscale'}`}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="w-full min-w-0">
            <div className="truncate text-sm font-bold text-gray-800">{pokemon.name}</div>
            <div className="text-xs text-gray-600">No.{pokemon.number}</div>
          </div>
        </div>

        {!isRegionMode && canEncounter && (
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-1.5 pr-3">
            <div className="flex min-w-0 flex-col justify-center rounded-lg bg-white/70 px-2 py-1.5 text-center">
              <div className="mb-0.5 whitespace-nowrap text-[11px] text-gray-500">실제 조우율</div>
              <div className="text-sm font-bold text-indigo-600">
                {(probability?.actualProb || 0).toFixed(2)}%
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-center rounded-lg bg-white/70 px-2 py-1.5 text-center">
              <div className="mb-0.5 whitespace-nowrap text-[11px] text-gray-600">가중치</div>
              <input
                type="number"
                value={pokemonRates[pokemonId] || 10}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => updateRate(pokemonId, event.target.value)}
                min="1"
                max="100"
                className="w-full min-w-0 border-2 border-indigo-300 rounded px-1 py-0.5 text-center text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {isRegionMode && (
          <button
            type="button"
            onClick={() => togglePokemon(pokemon)}
            className="absolute right-1 top-1 z-20 rounded p-1 text-red-600 transition-colors hover:bg-red-50"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border-2 border-indigo-200 p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={24} />
            {isRegionMode ? '지역 포켓몬 기준 설정' : '장소 출현 설정'}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {isRegionMode
              ? '이 지역 전체에서 사용할 포켓몬 풀과 최대값을 정합니다.'
              : '지역 포켓몬 풀 안에서 이 장소에 실제 등장할 포켓몬과 범위를 정합니다.'}
          </p>
        </div>

        {!isRegionMode && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">전국도감</span>
          <button
            type="button"
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
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Percent size={16} />
            조우율 (%)
          </label>
          <input
            type="number"
            value={encounterRate}
            onChange={(event) => setEncounterRate(parseFloat(event.target.value) || 0)}
            min="0"
            max="100"
            step="5"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
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
            onChange={(event) => setMinLevel(parseInt(event.target.value, 10) || 1)}
            min="1"
            max={isRegionMode ? 100 : parentMaxLevel}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {false && !isRegionMode && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Percent size={16} />
              조우율 (%)
            </label>
            <input
              type="number"
              value={encounterRate}
              onChange={(event) => setEncounterRate(parseFloat(event.target.value) || 0)}
              min="0"
              max="100"
              step="5"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {false && !isRegionMode && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
              <TrendingUp size={16} />
              최소 레벨
            </label>
            <input
              type="number"
              value={minLevel}
              onChange={(event) => setMinLevel(parseInt(event.target.value, 10) || 1)}
              min="1"
              max={parentMaxLevel}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <TrendingUp size={16} />
            {isRegionMode ? '지역 최대 레벨' : '최대 레벨'}
          </label>
          <input
            type="number"
            value={maxLevel}
            onChange={(event) => setMaxLevel(parseInt(event.target.value, 10) || 1)}
            min="1"
            max={isRegionMode ? 100 : parentMaxLevel}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
          {!isRegionMode && (
            <div className="mt-1 text-xs text-gray-500">지역 최대 레벨: {parentMaxLevel}</div>
          )}
        </div>

        {isRegionMode && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
              <ShieldCheck size={16} />
              최대 포획률 (%)
            </label>
            <input
              type="number"
              value={maxCatchRate}
              onChange={(event) => setMaxCatchRate(parseFloat(event.target.value) || 0)}
              min="1"
              max="100"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Sparkles size={16} />
            이로치 확률
          </label>
          <input
            type="number"
            value={shinyRate}
            onChange={(event) => setShinyRate(parseInt(event.target.value, 10) || 4096)}
            min="1"
            max="100000"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 text-xs text-gray-600">1/{shinyRate}</div>
        </div>
      </div>

      {!isRegionMode && regionPokemonPool.length === 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
          먼저 위의 지역 포켓몬 기준 설정에서 이 지역에 등장 가능한 포켓몬을 선택하세요.
        </div>
      )}

      {!isRegionMode && availableEncounterPokemon.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            확률 분포
          </h5>

          <div className="w-full h-8 flex rounded-lg overflow-hidden border-2 border-gray-300">
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-bold transition-all"
              style={{ width: `${Math.max(0, 100 - Number(encounterRate || 0))}%` }}
              title={`미조우 ${Math.max(0, 100 - Number(encounterRate || 0)).toFixed(1)}%`}
            >
              {Math.max(0, 100 - Number(encounterRate || 0)) >= 5 && '미조우'}
            </div>

            {probabilities
              .sort((a, b) => b.actualProb - a.actualProb)
              .map(({ pokemonId, actualProb }, index) => {
                const pokemon = getPokemonById(pokemonId);
                if (!pokemon) return null;
                const color = colorPalette[index % colorPalette.length];

                return (
                  <div
                    key={pokemonId}
                    className="flex items-center justify-center text-white text-xs font-bold transition-all hover:brightness-110"
                    style={{ width: `${actualProb}%`, backgroundColor: color }}
                    title={`${pokemon.name}: ${actualProb.toFixed(2)}%`}
                  >
                    {actualProb >= 5 && pokemon.name}
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
            {isRegionMode ? '선택된 포켓몬' : '포켓몬 선택'} ({selectedPokemon.length}종)
          </h5>
        </div>

        {displayedSelectedPokemon.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-2 text-gray-300" />
            <p>{isRegionMode ? '선택된 포켓몬이 없습니다.' : '지역에 등록된 포켓몬이 없습니다.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedPokemonGroups.map((group) => (
              group.ids.length > 0 && (
                <div key={group.title || 'place'}>
                  {group.title && (
                    <div className="mb-2 text-sm font-bold text-lime-800">
                      {group.title} ({group.ids.length}종)
                    </div>
                  )}
                  <div className={`grid gap-2 max-h-[420px] overflow-y-auto ${!isRegionMode && availableEncounterPokemon.length > 0 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {group.ids.map((pokemonId) => renderPokemonSelectionCard(pokemonId))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {isRegionMode && (
      <div>
        <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Plus size={20} />
          포켓몬 추가
        </h5>

        <input
          type="search"
          value={pokemonSearchQuery}
          onChange={(event) => setPokemonSearchQuery(event.target.value)}
          className="mb-3 w-full rounded-lg border-2 border-lime-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-lime-500"
          placeholder="포켓몬 이름 또는 번호 검색"
        />

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setPokedexTab('game');
              setAllowNationalPokedex(false);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'game' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            영운 도감 ({gamePokedex?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setPokedexTab('national');
              setAllowNationalPokedex(true);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              pokedexTab === 'national' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전국 도감 ({allPokemonMaster?.length || 0})
          </button>
        </div>

        <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <Package size={12} />
          {filteredSelectablePokemon.length}마리 표시 중
        </div>

        <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
          {filteredSelectablePokemon.length === 0 ? (
            <div className="col-span-5 py-8 text-center text-sm font-semibold text-gray-500">
              검색 결과가 없습니다.
            </div>
          ) : filteredSelectablePokemon.map((pokemon) => {
            const isSelected = selectedPokemon.includes(pokemon.number);
            const displayNameParts = getPokemonDisplayParts(pokemon);

            return (
              <button
                key={pokemon.id || pokemon.number}
                type="button"
                onClick={() => togglePokemon(pokemon)}
                className={`min-h-[124px] p-1 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-100'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
                title={pokemon.name}
              >
                <div className="flex h-24 w-full items-center justify-center overflow-visible">
                  <img
                    src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                    alt={pokemon.name}
                    className="h-24 w-24 max-w-none object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="text-xs text-center font-semibold truncate">{displayNameParts.name}</div>
                {displayNameParts.formLabel && (
                  <div className="text-[10px] text-center text-gray-500 truncate">{displayNameParts.formLabel}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        설정 저장
      </button>
    </div>
  );
}
