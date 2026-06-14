import React, { useState, useEffect } from 'react';
import { MapPin, Map as MapIcon, Building2, X } from 'lucide-react';

const toDexNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getTooltipSpeciesKey = (pokemon = {}) => {
  const speciesNumber = pokemon.originalNumber || pokemon.displayNumber || pokemon.number;
  const formGroup = pokemon.regionalForm
    ? `regional:${pokemon.regionalForm}`
    : 'base';

  return `${speciesNumber || pokemon.baseSpecies || pokemon.name || pokemon.id}:${formGroup}`;
};

export default function MapView({
  regions,
  onRegionClick,
  gamePokedex = [],
  allPokemonMaster = [],
  pokedexData = {},
  caughtPokemon = []
}) {
  const [viewMode, setViewMode] = useState('default');
  const [selectedTown, setSelectedTown] = useState(null);
  const [placeSelectRegion, setPlaceSelectRegion] = useState(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState(null);

  useEffect(() => {
    const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
    if (defaultTown) {
      setSelectedTown(defaultTown.groupId);
    }
  }, [regions]);

  const visibleRegions = (() => {
    if (viewMode === 'all') {
      // 전체 보기: 마을에 속한 모든 구역 표시 (마을 메타 제외, 미분류 제외)
      return regions.filter(r => !r.isTownMeta && r.groupId && r.groupVisible !== false);
    } else {
      // 기본 보기: 선택된 마을의 구역만 표시
      if (selectedTown) {
        return regions.filter(r => 
          r.groupId === selectedTown && 
          !r.isTownMeta &&
          r.groupVisible !== false
        );
      }
      // 선택된 마을 없으면 마을에 속한 모든 구역
      return regions.filter(r => !r.isTownMeta && r.groupId && r.groupVisible !== false);
    }
  })();

  const towns = (() => {
    const townMap = new Map();
    regions.forEach(region => {
      if (region.groupId && region.groupName && !region.isTownMeta) {
        if (!townMap.has(region.groupId)) {
          townMap.set(region.groupId, {
            groupId: region.groupId,
            groupName: region.groupName,
            isDefaultTown: region.isDefaultTown || false,
            color: region.color
          });
        }
      }
    });
    return Array.from(townMap.values());
  })();

  const currentTown = towns.find(t => t.groupId === selectedTown);
  const caughtNumbers = new Set(
    caughtPokemon
      .flatMap(pokemon => pokemon ? [pokemon.number, pokemon.originalNumber] : [])
      .map(toDexNumber)
      .filter(Boolean)
  );
  const unlockedNumbers = new Set([
    ...Object.keys(pokedexData || {}).map(toDexNumber).filter(Boolean),
    ...caughtNumbers
  ]);
  const gamePokedexNumbers = new Set(
    gamePokedex.map(pokemon => toDexNumber(pokemon.number)).filter(Boolean)
  );

  const isPokemonUnlocked = (pokemon = {}) => {
    const number = toDexNumber(pokemon.number);
    const originalNumber = toDexNumber(pokemon.originalNumber);

    if (number && unlockedNumbers.has(number)) return true;
    if (originalNumber && unlockedNumbers.has(originalNumber)) return true;

    return allPokemonMaster.some(form => (
      form.originalNumber === pokemon.number &&
      gamePokedexNumbers.has(toDexNumber(form.number)) &&
      unlockedNumbers.has(toDexNumber(form.number))
    ));
  };

  const getPlacePokemonList = (place = {}) => {
    const pokemonIds = Array.isArray(place.pokemons) ? place.pokemons : [];
    const pokemonBySpecies = new Map();

    pokemonIds.forEach((pokemonId) => {
      const pokemon = allPokemonMaster.find(candidate => (
        String(candidate.number) === String(pokemonId) ||
        String(candidate.originalNumber) === String(pokemonId) ||
        candidate.id === pokemonId
      ));

      if (!pokemon) {
        pokemonBySpecies.set(`unknown:${pokemonId}`, '??');
        return;
      }

      const speciesKey = getTooltipSpeciesKey(pokemon);
      if (!pokemonBySpecies.has(speciesKey)) {
        pokemonBySpecies.set(speciesKey, isPokemonUnlocked(pokemon) ? pokemon.name : '??');
      }
    });

    return Array.from(pokemonBySpecies.values());
  };

  const handleRegionButtonClick = (region) => {
    const places = Array.isArray(region.places) ? region.places.filter(place => place?.name) : [];

    if (places.length > 0) {
      setPlaceSelectRegion({ ...region, places });
      return;
    }

    onRegionClick(region);
  };

  const handlePlaceClick = (region, place) => {
    onRegionClick({
      ...region,
      ...place,
      id: `${region.id}__place__${place.id}`,
      baseRegionId: region.id,
      regionId: region.id,
      regionName: region.name,
      regionMaxLevel: region.maxLevel,
      lootConfig: place.lootConfig || region.lootConfig,
      placeId: place.id,
      placeName: place.name,
      name: `${region.name} - ${place.name}`
    });
    setPlaceSelectRegion(null);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                탐험할 구역을 선택하세요
              </h3>
              <p className="text-gray-600 flex items-center gap-2">
                {currentTown && viewMode === 'default' && (
                  <>
                    <Building2 size={16} />
                    <span className="font-semibold" style={{ color: currentTown.color }}>
                      {currentTown.groupName}
                    </span>
                  </>
                )}
                {viewMode === 'all' && '모든 구역 표시 중'}
              </p>
            </div>
            
            <div className="flex gap-2 items-center">
              {towns.length > 0 && viewMode === 'default' && (
                <select
                  value={selectedTown || ''}
                  onChange={(e) => setSelectedTown(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-purple-500 focus:outline-none"
                >
                  {towns.map(town => (
                    <option key={town.groupId} value={town.groupId}>
                      {town.groupName}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  if (viewMode === 'all') {
                    setViewMode('default');
                    const defaultTown = regions.find(r => r.groupId && r.isDefaultTown === true);
                    if (defaultTown) {
                      setSelectedTown(defaultTown.groupId);
                    }
                  } else {
                    setViewMode('all');
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MapIcon size={18} />
                {viewMode === 'all' ? '마을 보기' : '전체 보기'}
              </button>
            </div>
          </div>
          
          <div 
            className="relative bg-green-100 rounded-lg border-2 border-gray-300" 
            style={{ 
              height: '70vh', 
              minHeight: '500px',
              backgroundImage: 'url("/images/regions/map-background.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {visibleRegions.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold">탐험 가능한 구역이 없습니다</p>
                </div>
              </div>
            ) : (
              visibleRegions.map(region => (
                <button
                  key={region.id}
                  onClick={() => handleRegionButtonClick(region)}
                  className="absolute hover:opacity-90 active:scale-95 transition-all 
                           rounded-lg px-4 py-2 flex items-center justify-center 
                           text-white font-bold border-2 border-white shadow-lg 
                           overflow-hidden group"
                  style={{ 
                    left: `${region.x}%`, 
                    top: `${region.y}%`, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: region.color || '#10b981',
                    minWidth: '100px'
                  }}
                >
                  <div className="relative z-10 text-center">
                    <span className="text-sm">
                      {region.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            표시 중: {visibleRegions.length}개 구역
            {viewMode === 'default' && currentTown && (
              <span className="ml-2">
                ({currentTown.groupName})
              </span>
            )}
          </div>
        </div>
      </div>

      {placeSelectRegion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border-2 border-lime-300 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {placeSelectRegion.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">탐험할 장소를 선택하세요</p>
              </div>
              <button
                type="button"
                onClick={() => setPlaceSelectRegion(null)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-2">
              {placeSelectRegion.places.map((place) => (
                <div key={place.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handlePlaceClick(placeSelectRegion, place)}
                    onMouseEnter={() => setHoveredPlaceId(place.id)}
                    onMouseLeave={() => setHoveredPlaceId(null)}
                    onFocus={() => setHoveredPlaceId(place.id)}
                    onBlur={() => setHoveredPlaceId(null)}
                    className="flex w-full items-center justify-between rounded-lg border-2 border-lime-200 bg-lime-50 px-4 py-3 text-left font-bold text-lime-950 transition-colors hover:border-lime-600 hover:bg-white"
                  >
                    <span>{place.name}</span>
                    <span className="text-xs font-semibold text-lime-800">
                      {(place.pokemons || []).length}종 / {place.encounterRate ?? 0}%
                    </span>
                  </button>
                  {hoveredPlaceId === place.id && (
                    <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-lg border border-lime-300 bg-white p-3 text-xs text-gray-700 shadow-xl">
                      <div className="mb-2 font-bold text-lime-900">출현 포켓몬</div>
                      <div className="flex flex-wrap gap-1.5">
                        {getPlacePokemonList(place).length > 0 ? (
                          getPlacePokemonList(place).map((name, index) => (
                            <span key={`${place.id}-${index}`} className="rounded border border-lime-200 bg-lime-50 px-2 py-1 font-semibold">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">등록된 포켓몬 없음</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
