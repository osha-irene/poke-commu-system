import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Settings,
  Gift,
  Package,
  ChevronRight,
  Percent,
  TrendingUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  EyeOff,
  Star,
  X,
  GripVertical
} from 'lucide-react';
import PokemonSettingsPanel from './PokemonSettingsPanel';
import LootSettingsPanel from './LootSettingsPanel';

export default function RegionManagementPanel({
  regions = [],
  towns = [],
  selectedRegion,
  editMode,
  allItems,
  onRegionClick,
  onUpdateRegion,
  onAddRegion,
  onDeleteRegion,
  onToggleTownVisibility,
  onCreateTown,
  onUpdateTown,
  onDeleteTown,
  setEditMode
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTownModal, setShowTownModal] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingTown, setEditingTown] = useState(null);
  const [editingPlace, setEditingPlace] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [detailSection, setDetailSection] = useState('region');
  const [draggingRegionId, setDraggingRegionId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRegionForm, setEditRegionForm] = useState({});
  const [townForm, setTownForm] = useState({
    groupId: '',
    groupName: '',
    x: 50,
    y: 50,
    color: '#10b981',
    isDefaultTown: false
  });
  const [newRegionForm, setNewRegionForm] = useState({
    name: '',
    description: '',
    encounterRate: 90,
    minLevel: 5,
    maxLevel: 20,
    x: 50,
    y: 50,
    color: '#87CEEB',
    groupId: '',
    maxCatchRate: 1,
    isCave: false,
    isWaterside: false,
    isSafari: false
  });
  const [placeForm, setPlaceForm] = useState({
    name: '',
    encounterRate: 90,
    minLevel: 5,
    maxLevel: 20,
    isCave: false,
    isWaterside: false,
    isSafari: false
  });

  const selectedRegionPlaces = Array.isArray(selectedRegion?.places) ? selectedRegion.places : [];
  const selectedPlace = selectedRegionPlaces.find((place) => place.id === selectedPlaceId) || selectedRegionPlaces[0] || null;

  useEffect(() => {
    if (selectedRegion?.id) {
      setEditMode('pokemon');
    }
  }, [selectedRegion?.id, setEditMode]);

  const getDefaultPlaceData = (overrides = {}) => {
    const mergedPlace = {
      id: `place_${Date.now()}`,
      name: '',
      encounterRate: selectedRegion?.encounterRate ?? 90,
      minLevel: selectedRegion?.minLevel || 5,
      maxLevel: selectedRegion?.maxLevel || 20,
      shinyRate: 4096,
      allowNationalPokedex: false,
      lootConfig: null,
      isCave: false,
      isWaterside: false,
      isSafari: false,
      ...overrides
    };

    return {
      ...mergedPlace,
      pokemons: Array.isArray(mergedPlace.pokemons) ? mergedPlace.pokemons : [],
      pokemonRates: mergedPlace.pokemonRates || {}
    };
  };

  const getPlaceEditTarget = () => {
    if (!selectedRegion || !selectedPlace) return null;

    return {
      ...selectedRegion,
      ...selectedPlace,
      id: `${selectedRegion.id}__place__${selectedPlace.id}`,
      baseRegionId: selectedRegion.id,
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      regionName: selectedRegion.name,
      name: `${selectedRegion.name} - ${selectedPlace.name}`,
      pokemons: Array.isArray(selectedPlace.pokemons) ? selectedPlace.pokemons : [],
      pokemonRates: selectedPlace.pokemonRates || {}
    };
  };

  const updateSelectedRegionPlaces = async (nextPlaces) => {
    if (!selectedRegion) return;
    await onUpdateRegion?.(selectedRegion.id, {
      ...selectedRegion,
      places: nextPlaces
    });
  };

  const handleSavePlace = async () => {
    if (!selectedRegion) return;
    const trimmedName = placeForm.name.trim();

    if (!trimmedName) {
      alert('장소 이름을 입력해주세요!');
      return;
    }

    const nextPlace = getDefaultPlaceData({
      ...(editingPlace || {}),
      name: trimmedName,
      encounterRate: parseFloat(placeForm.encounterRate) || 0,
      minLevel: parseInt(placeForm.minLevel, 10) || 1,
      maxLevel: parseInt(placeForm.maxLevel, 10) || 1,
      isCave: placeForm.isCave,
      isWaterside: placeForm.isWaterside,
      isSafari: placeForm.isSafari
    });

    const nextPlaces = editingPlace
      ? selectedRegionPlaces.map((place) => (place.id === editingPlace.id ? nextPlace : place))
      : [...selectedRegionPlaces, nextPlace];

    await updateSelectedRegionPlaces(nextPlaces);
    setSelectedPlaceId(nextPlace.id);
    setShowPlaceModal(false);
    setEditingPlace(null);
    setPlaceForm({ name: '', encounterRate: 90, minLevel: 5, maxLevel: 20, isCave: false, isWaterside: false, isSafari: false });
  };

  const openCreatePlaceModal = (targetRegion = selectedRegion) => {
    if (targetRegion && targetRegion.id !== selectedRegion?.id) {
      onRegionClick?.(targetRegion);
      setDetailSection('region');
      setEditMode('pokemon');
    }

    setEditingPlace(null);
    setPlaceForm({
      name: '',
      encounterRate: targetRegion?.encounterRate ?? 90,
      minLevel: targetRegion?.minLevel || 5,
      maxLevel: targetRegion?.maxLevel || 20,
      isCave: targetRegion?.isCave === true,
      isWaterside: targetRegion?.isWaterside === true,
      isSafari: targetRegion?.isSafari === true
    });
    setShowPlaceModal(true);
  };

  const openEditPlaceModal = (place) => {
    setEditingPlace(place);
    setPlaceForm({
      name: place.name || '',
      encounterRate: place.encounterRate ?? 90,
      minLevel: place.minLevel || selectedRegion?.minLevel || 5,
      maxLevel: place.maxLevel || selectedRegion?.maxLevel || 20,
      isCave: place.isCave === true,
      isWaterside: place.isWaterside === true,
      isSafari: place.isSafari === true
    });
    setShowPlaceModal(true);
  };

  const handleDeletePlace = async (place) => {
    if (!selectedRegion) return;
    if (!window.confirm(`"${place.name}" 장소를 삭제하시겠습니까?`)) return;

    const nextPlaces = selectedRegionPlaces.filter((item) => item.id !== place.id);
    await updateSelectedRegionPlaces(nextPlaces);
    if (selectedPlaceId === place.id) {
      setSelectedPlaceId(nextPlaces[0]?.id || null);
    }
  };

  const handleUpdateSelectedPlacePokemon = async (_placeTargetId, updatedPlaceData) => {
    if (!selectedRegion || !selectedPlace) return;

    const nextPlaces = selectedRegionPlaces.map((place) => (
      place.id === selectedPlace.id
        ? {
            ...place,
            pokemons: Array.isArray(updatedPlaceData.pokemons) ? updatedPlaceData.pokemons : [],
            pokemonRates: updatedPlaceData.pokemonRates || {},
            encounterRate: updatedPlaceData.encounterRate !== undefined ? updatedPlaceData.encounterRate : place.encounterRate,
            minLevel: updatedPlaceData.minLevel || place.minLevel,
            maxLevel: updatedPlaceData.maxLevel || place.maxLevel,
            shinyRate: updatedPlaceData.shinyRate || place.shinyRate || 4096,
            allowNationalPokedex: updatedPlaceData.allowNationalPokedex !== undefined
              ? updatedPlaceData.allowNationalPokedex
              : place.allowNationalPokedex || false
          }
        : place
    ));

    await updateSelectedRegionPlaces(nextPlaces);
  };

  const handleUpdateSelectedPlaceLoot = async (_placeTargetId, lootConfig) => {
    if (!selectedRegion || !selectedPlace) return;

    const nextPlaces = selectedRegionPlaces.map((place) => (
      place.id === selectedPlace.id ? { ...place, lootConfig } : place
    ));

    await updateSelectedRegionPlaces(nextPlaces);
  };

  const handleUpdateRegionLoot = async (_regionId, lootConfig) => {
    if (!selectedRegion) return;

    await onUpdateRegion?.(selectedRegion.id, {
      ...selectedRegion,
      lootConfig
    });
  };

  const resetTownForm = () => {
    setTownForm({
      groupId: '',
      groupName: '',
      x: 50,
      y: 50,
      color: '#10b981',
      isDefaultTown: false
    });
    setEditingTown(null);
  };

  const openCreateTownModal = () => {
    resetTownForm();
    setShowTownModal(true);
  };

  const openCreateRegionModal = (town = null) => {
    setNewRegionForm((prev) => ({
      ...prev,
      groupId: town?.groupId || '',
      groupName: town?.groupName || null
    }));
    setShowAddModal(true);
  };

  const openEditTownModal = (town) => {
    setEditingTown(town);
    setTownForm({
      groupId: town.groupId,
      groupName: town.groupName,
      x: town.x ?? 50,
      y: town.y ?? 50,
      color: town.color || '#10b981',
      isDefaultTown: town.isDefaultTown || false
    });
    setShowTownModal(true);
  };

  const handleSaveTown = () => {
    if (!townForm.groupId || !townForm.groupName) {
      alert('마을 ID와 이름을 입력해주세요!');
      return;
    }

    if (!editingTown && towns.some((town) => town.groupId === townForm.groupId)) {
      alert('이미 존재하는 마을 ID입니다.');
      return;
    }

    if (editingTown) {
      onUpdateTown?.(editingTown.groupId, townForm);
    } else {
      onCreateTown?.(townForm);
    }

    setShowTownModal(false);
    resetTownForm();
  };

  const handleDeleteTown = (town) => {
    const areaCount = regions.filter((region) => region.groupId === town.groupId && !region.isTownMeta).length;
    const message = areaCount > 0
      ? `"${town.groupName}"에 ${areaCount}개의 구역이 연결되어 있습니다.\n마을을 삭제하면 모든 구역의 마을 연결이 해제됩니다.\n\n정말 삭제하시겠습니까?`
      : `"${town.groupName}" 마을을 삭제하시겠습니까?`;

    if (window.confirm(message)) {
      onDeleteTown?.(town.groupId);
    }
  };

  const handleSetDefaultTown = (town) => {
    if (town.isDefaultTown) return;
    onUpdateTown?.(town.groupId, {
      ...town,
      isDefaultTown: true
    });
  };

  const townGroups = towns.map((town) => ({
    town,
    regions: regions.filter((region) => !region.isTownMeta && region.groupId === town.groupId)
  }));

  const ungroupedRegions = regions.filter((region) => !region.isTownMeta && !region.groupId);

  const handleRegionDragStart = (event, region) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(region.id));
    setDraggingRegionId(region.id);
  };

  const handleRegionDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDropRegionToTown = async (event, town = null) => {
    event.preventDefault();
    event.stopPropagation();
    const regionId = event.dataTransfer.getData('text/plain');
    const region = regions.find((item) => String(item.id) === String(regionId));

    setDraggingRegionId(null);
    if (!region || region.isTownMeta) return;

    const nextRegion = town
      ? {
          ...region,
          groupId: town.groupId,
          groupName: town.groupName,
          groupVisible: town.visible !== undefined ? town.visible : true,
          isDefaultTown: town.isDefaultTown || false,
          areaName: null
        }
      : {
          ...region,
          groupId: '',
          groupName: null,
          groupVisible: true,
          isDefaultTown: false,
          areaName: null
        };

    await onUpdateRegion?.(region.id, nextRegion);
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleAddRegion = () => {
    if (!newRegionForm.name.trim()) {
      alert('지역 이름을 입력해주세요!');
      return;
    }

    const selectedTown = towns.find((town) => town.groupId === newRegionForm.groupId);
    const newRegion = {
      id: `region_${Date.now()}`,
      ...newRegionForm,
      name: newRegionForm.name.trim(),
      description: newRegionForm.description.trim(),
      groupName: selectedTown?.groupName || null,
      groupVisible: selectedTown ? selectedTown.visible : true,
      pokemons: [],
      pokemonRates: {},
      shinyRate: 4096,
      places: []
    };

    onAddRegion?.(newRegion);
    setShowAddModal(false);
    setNewRegionForm({
      name: '',
      description: '',
      encounterRate: 90,
      minLevel: 5,
      maxLevel: 20,
      x: 50,
      y: 50,
      color: '#87CEEB',
      groupId: '',
      maxCatchRate: 1,
      isCave: false,
      isWaterside: false,
      isSafari: false
    });
    alert('지역이 추가되었습니다.');
  };

  const handleDeleteRegion = (region) => {
    if (window.confirm(`"${region.name}" 지역을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      onDeleteRegion?.(region.id);
      alert('지역이 삭제되었습니다.');
    }
  };

  const renderRegionRow = (region, targetTown = null) => {
    const isSelected = selectedRegion?.id === region.id;
    const hasLootConfig = region.lootConfig && Object.keys(region.lootConfig).length > 0;
    const places = Array.isArray(region.places) ? region.places : [];
    const pokemonCount = places.length > 0
      ? new Set(places.flatMap((place) => (Array.isArray(place.pokemons) ? place.pokemons : []))).size
      : 0;

    return (
      <div
        key={region.id}
        draggable
        onDragStart={(event) => handleRegionDragStart(event, region)}
        onDragOver={handleRegionDragOver}
        onDrop={(event) => handleDropRegionToTown(event, targetTown)}
        onDragEnd={() => setDraggingRegionId(null)}
        className={`relative group ${
          isSelected
            ? 'bg-lime-50 border-l-4 border-lime-700'
            : 'hover:bg-lime-50/70'
        } ${draggingRegionId === region.id ? 'opacity-50' : ''}`}
      >
        <button
          type="button"
          onClick={() => {
            onRegionClick?.(region);
            setDetailSection('region');
            setEditMode('pokemon');
          }}
          className="w-full px-4 py-3 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <GripVertical size={16} className="mr-2 shrink-0 text-gray-300" />
            <div className="flex-1">
              <div className="font-semibold text-gray-800 mb-1">{region.name}</div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Package size={12} />
                  {pokemonCount}종
                </div>
                <div className="flex items-center gap-1">
                  <Percent size={12} />
                  장소 {places.length}개
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} />
                  {region.minLevel || 5}~{region.maxLevel || 20}
                </div>
                {hasLootConfig && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Gift size={12} />
                    <span>보상 설정됨</span>
                  </div>
                )}
              </div>
            </div>
            <ChevronRight size={20} className={isSelected ? 'text-lime-700' : 'text-lime-500'} />
          </div>
        </button>

        {isSelected && (
          <div className="border-t border-lime-200 bg-lime-50/60 px-4 pb-3 pt-2">
            <div className="ml-6 space-y-1">
              {places.length > 0 && (
                places.map((place) => {
                  const isActivePlace = detailSection === 'places' && selectedPlace?.id === place.id;

                  return (
                  <div
                    key={place.id}
                    className={`flex w-full items-center gap-1 rounded-lg border px-2 py-1.5 text-sm font-bold transition-colors ${
                      isActivePlace
                        ? 'border border-lime-500 bg-lime-100 text-lime-950 shadow-sm'
                        : 'border border-lime-200 bg-white text-lime-900 hover:bg-lime-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedPlaceId(place.id);
                        setDetailSection('places');
                        setEditMode('pokemon');
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-1 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate">{place.name}</span>
                      <span className="shrink-0 text-xs opacity-70">
                        {(place.pokemons || []).length}종
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditPlaceModal(place);
                      }}
                      className="shrink-0 rounded p-1 text-lime-800 hover:bg-lime-200"
                      title="장소 수정"
                      aria-label="장소 수정"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeletePlace(place);
                      }}
                      className="shrink-0 rounded p-1 text-red-700 hover:bg-red-100"
                      title="장소 삭제"
                      aria-label="장소 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="absolute right-2 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openCreatePlaceModal(region);
            }}
            className="rounded bg-lime-700 p-1.5 text-white transition-colors hover:bg-lime-800"
            title="이 지역에 장소 추가"
            aria-label="이 지역에 장소 추가"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setEditRegionForm({
                name: region.name || '',
                description: region.description || '',
                encounterRate: region.encounterRate ?? 90,
                minLevel: region.minLevel || 5,
                maxLevel: region.maxLevel || 20,
                color: region.color || '#87CEEB',
                groupId: region.groupId || '',
                x: region.x ?? 50,
                y: region.y ?? 50,
                _region: region,
              });
              setShowEditModal(true);
            }}
            className="rounded bg-indigo-600 p-1.5 text-white transition-colors hover:bg-indigo-700"
            title="지역 수정"
            aria-label="지역 수정"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteRegion(region);
            }}
            className="rounded bg-red-600 p-1.5 text-white transition-colors hover:bg-red-700"
            title="지역 삭제"
            aria-label="지역 삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  const selectedPokemonCount = selectedPlace ? (selectedPlace.pokemons || []).length : 0;
  const selectedEncounterRate = selectedPlace ? (selectedPlace.encounterRate || 0) : '-';
  const selectedLevelRange = selectedPlace
    ? `${selectedPlace.minLevel || 5}~${selectedPlace.maxLevel || 20}`
    : '-';
  const regionPokemonCount = selectedRegion ? (selectedRegion.pokemons || []).length : 0;
  const regionEncounterRate = selectedRegion ? (selectedRegion.encounterRate ?? '-') : '-';
  const regionLevelRange = selectedRegion
    ? `${selectedRegion.minLevel || 1}~${selectedRegion.maxLevel || 20}`
    : '-';
  const displayPokemonCount = detailSection === 'places' ? selectedPokemonCount : regionPokemonCount;
  const displayEncounterRate = detailSection === 'places' ? selectedEncounterRate : regionEncounterRate;
  const displayLevelRange = detailSection === 'places' ? selectedLevelRange : regionLevelRange;
  const selectedTownName = selectedRegion?.groupName || selectedRegion?.townName || '';
  const selectedRegionDisplayName = (() => {
    const regionName = selectedRegion?.name || '';
    if (!selectedTownName) return regionName;

    const spacedPrefix = `${selectedTownName} - `;
    const compactPrefix = `${selectedTownName}-`;

    if (regionName.startsWith(spacedPrefix)) return regionName.slice(spacedPrefix.length);
    if (regionName.startsWith(compactPrefix)) return regionName.slice(compactPrefix.length).trim();
    return regionName;
  })();

  return (
    <React.Fragment>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b-2 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MapPin size={20} />
                  지역 목록 ({regions.filter((region) => !region.isTownMeta).length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCreateTownModal}
                    className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                    title="마을 카테고리 추가"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {townGroups.map(({ town, regions: townRegions }) => {
                const isExpanded = expandedGroups[town.groupId] === true;

                return (
                  <div
                    key={town.groupId}
                    onDragOver={handleRegionDragOver}
                    onDrop={(event) => handleDropRegionToTown(event, town)}
                    className={draggingRegionId ? 'ring-1 ring-inset ring-lime-300' : ''}
                  >
                    <div
                      className={`px-3 py-2 sticky top-0 z-10 border-b transition-colors ${
                        isExpanded
                          ? 'border-lime-900 bg-lime-900 text-white'
                          : 'border-lime-200 bg-white text-lime-950 hover:bg-lime-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultTown(town)}
                            className={`rounded p-1 transition-colors ${
                              town.isDefaultTown
                                ? 'text-yellow-500'
                                : isExpanded
                                  ? 'text-lime-100 hover:bg-white/10 hover:text-yellow-300'
                                  : 'text-lime-800 hover:bg-lime-100 hover:text-yellow-500'
                            }`}
                            title={town.isDefaultTown ? '기본 마을' : '기본 마을로 설정'}
                            aria-label={town.isDefaultTown ? '기본 마을' : '기본 마을로 설정'}
                          >
                            <Star size={14} className={town.isDefaultTown ? 'fill-yellow-500' : ''} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleTownVisibility?.(town.groupId)}
                            className={`rounded p-1 transition-colors ${
                              isExpanded
                                ? 'text-lime-100 hover:bg-white/10'
                                : 'text-lime-800 hover:bg-lime-100'
                            }`}
                            title={town.visible ? '지도에 표시 중' : '지도에서 숨김'}
                            aria-label={town.visible ? '지도에 표시 중' : '지도에서 숨김'}
                          >
                            {town.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGroup(town.groupId)}
                            className="min-w-0 flex-1 font-semibold text-sm transition-colors flex items-center gap-2 text-left"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            <span className="truncate">{town.groupName}</span>
                            <span className={`text-xs ${isExpanded ? 'text-lime-100' : 'text-lime-700'}`}>({townRegions.length})</span>
                            {draggingRegionId && <span className={`text-[11px] ${isExpanded ? 'text-lime-100' : 'text-lime-700'}`}>드롭해서 이동</span>}
                          </button>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openCreateRegionModal(town)}
                            className={`rounded p-1 transition-colors ${
                              isExpanded
                                ? 'text-lime-100 hover:bg-white/10'
                                : 'text-lime-800 hover:bg-lime-100'
                            }`}
                            title="이 마을에 지역 추가"
                            aria-label="이 마을에 지역 추가"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTownModal(town)}
                            className={`rounded p-1 transition-colors ${
                              isExpanded
                                ? 'text-lime-100 hover:bg-white/10'
                                : 'text-lime-800 hover:bg-lime-100'
                            }`}
                            title="마을 이름 수정"
                            aria-label="마을 이름 수정"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTown(town)}
                            className={`rounded p-1 transition-colors ${
                              isExpanded
                                ? 'text-lime-100 hover:bg-red-600 hover:text-white'
                                : 'text-lime-800 hover:bg-red-100 hover:text-red-700'
                            }`}
                            title="마을 삭제"
                            aria-label="마을 삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      townRegions.length > 0 ? (
                        townRegions.map((region) => renderRegionRow(region, town))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400">연결된 구역이 없습니다.</div>
                      )
                    )}
                  </div>
                );
              })}

              {(ungroupedRegions.length > 0 || draggingRegionId) && (
                <div
                  onDragOver={handleRegionDragOver}
                  onDrop={(event) => handleDropRegionToTown(event, null)}
                  className={draggingRegionId ? 'ring-1 ring-inset ring-gray-300' : ''}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup('__ungrouped__')}
                    className={`w-full px-4 py-2 font-semibold text-sm sticky top-0 z-10 transition-colors flex items-center justify-between ${
                      expandedGroups.__ungrouped__ === true
                        ? 'bg-lime-900 text-white'
                        : 'bg-white text-lime-950 hover:bg-lime-50'
                    }`}
                  >
                    <span>미분류 ({ungroupedRegions.length})</span>
                    {expandedGroups.__ungrouped__ === true ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedGroups.__ungrouped__ === true && (
                    ungroupedRegions.length > 0
                      ? ungroupedRegions.map((region) => renderRegionRow(region, null))
                      : <div className="px-4 py-3 text-sm text-gray-400">드롭하면 미분류로 이동합니다.</div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="col-span-8">
          {!selectedRegion ? (
            <div className="bg-white rounded-lg border-2 border-gray-200 p-12 text-center">
              <MapPin size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">왼쪽에서 지역을 선택하세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {detailSection === 'region' && selectedTownName && (
                      <p className="mb-1 text-xs font-bold text-lime-700">{selectedTownName}</p>
                    )}
                    {detailSection === 'places' && selectedPlace && (
                      <p className="mb-1 text-xs font-bold text-lime-700">{selectedRegionDisplayName}</p>
                    )}
                    <h3 className="text-2xl font-bold text-gray-800">
                      {detailSection === 'places' ? (selectedPlace?.name || '장소 선택') : selectedRegionDisplayName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {detailSection === 'region' ? (
                      <React.Fragment>
                      <button
                        type="button"
                        onClick={() => handleDeleteRegion(selectedRegion)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                        지역 삭제
                      </button>
                      </React.Fragment>
                    ) : selectedPlace ? (
                      <button
                        type="button"
                        onClick={() => handleDeletePlace(selectedPlace)}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                        title="장소 삭제"
                        aria-label="장소 삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>

                {detailSection === 'region' && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Package size={16} />
                      출현 포켓몬
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{displayPokemonCount}종</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Percent size={16} />
                      조우율
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {displayEncounterRate}{displayEncounterRate !== '-' ? '%' : ''}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp size={16} />
                      레벨 범위
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{displayLevelRange}</div>
                  </div>
                </div>
                )}

                {false && detailSection === 'places' && (
                <div className="bg-lime-50 border-2 border-lime-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-bold text-lime-950 flex items-center gap-2">
                        <MapPin size={18} />
                        장소 설정
                      </h4>
                      <p className="text-xs text-lime-800 mt-1">
                        {selectedRegion.name} 안에서 실제 탐험할 장소를 나눕니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreatePlaceModal}
                      className="bg-lime-700 text-white px-3 py-2 rounded-lg hover:bg-lime-800 transition-colors flex items-center gap-2 text-sm font-bold"
                    >
                      <Plus size={16} />
                      장소 추가
                    </button>
                  </div>

                  {selectedRegionPlaces.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedRegionPlaces.map((place) => {
                        const isActive = selectedPlace?.id === place.id;
                        const hasLootConfig = place.lootConfig && Object.keys(place.lootConfig).length > 0;

                        return (
                          <div
                            key={place.id}
                            className={`flex items-center gap-1 rounded-lg border-2 px-2 py-1.5 ${
                              isActive
                                ? 'border-lime-700 bg-white text-lime-950 shadow-sm'
                                : 'border-lime-200 bg-lime-100 text-lime-900'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedPlaceId(place.id)}
                              className="flex items-center gap-2 text-sm font-bold"
                            >
                              <span>{place.name}</span>
                              <span className="text-xs font-semibold opacity-70">
                                {(place.pokemons || []).length}종 / {place.encounterRate ?? 0}%
                              </span>
                              {hasLootConfig && <Gift size={13} className="text-emerald-700" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditPlaceModal(place)}
                              className="rounded p-1 text-lime-800 hover:bg-lime-200"
                              title="장소 이름/기본값 수정"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlace(place)}
                              className="rounded p-1 text-red-700 hover:bg-red-100"
                              title="장소 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-lime-300 bg-white/70 p-4 text-sm text-lime-900">
                      아직 장소가 없습니다. 풀숲, 물가, 바위틈처럼 장소를 추가한 뒤 장소별 포켓몬과 보상을 설정하세요.
                    </div>
                  )}
                </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
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
                    type="button"
                    onClick={() => setEditMode('loot')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                      editMode === 'loot'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Gift size={20} />
                    탐험보상 설정
                  </button>
                </div>
              </div>

              {editMode === 'pokemon' && (
                detailSection === 'region' ? (
                  <PokemonSettingsPanel
                    region={selectedRegion}
                    mode="region"
                    onUpdateRegion={onUpdateRegion}
                  />
                ) : (
                  selectedRegionPlaces.length > 0 ? (
                    selectedPlace ? (
                    <PokemonSettingsPanel
                      region={getPlaceEditTarget()}
                      parentRegion={selectedRegion}
                      mode="place"
                      onUpdateRegion={handleUpdateSelectedPlacePokemon}
                    />
                    ) : (
                      <div className="bg-white rounded-lg border-2 border-lime-200 py-10 text-center text-gray-500">
                        포켓몬을 설정할 장소를 선택하세요.
                      </div>
                    )
                  ) : (
                    <div className="bg-white rounded-lg border-2 border-lime-200 py-10 text-center text-gray-500">
                      장소를 먼저 추가하세요.
                    </div>
                  )
                )
              )}

              {editMode === 'loot' && (
                detailSection === 'region' ? (
                  <LootSettingsPanel
                    region={selectedRegion}
                    mode="region"
                    allItems={allItems}
                    onUpdateRegionLootConfig={handleUpdateRegionLoot}
                  />
                ) : (
                  <div className="bg-white rounded-lg border-2 border-green-200 p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-gray-800">장소별 세부 보상 설정</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        장소에서는 지역 보상 풀 안에서 실제 지급 범위와 아이템을 정합니다.
                      </p>
                    </div>

                    {selectedRegionPlaces.length > 0 ? (
                      selectedPlace ? (
                      <LootSettingsPanel
                        region={getPlaceEditTarget()}
                        parentRegion={selectedRegion}
                        mode="place"
                        allItems={allItems}
                        onUpdateRegionLootConfig={handleUpdateSelectedPlaceLoot}
                      />
                      ) : (
                        <div className="text-center text-gray-500 py-10">보상을 설정할 장소를 선택하세요.</div>
                      )
                    ) : (
                      <div className="text-center text-gray-500 py-10">
                        장소를 먼저 추가하세요. 탐험 보상은 각 장소에서 관리됩니다.
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {showTownModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingTown ? '마을 카테고리 수정' : '마을 카테고리 추가'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTownModal(false);
                  resetTownForm();
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {!editingTown && (
              <div>
                <label className="block text-sm font-semibold mb-2">마을 ID</label>
                <input
                  type="text"
                  value={townForm.groupId}
                  onChange={(event) => setTownForm({ ...townForm, groupId: event.target.value })}
                  disabled={!!editingTown}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                  placeholder="pallet_town"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingTown ? 'ID는 수정할 수 없습니다.' : '영문, 숫자, 언더스코어를 권장합니다.'}
                </p>
              </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">마을 이름</label>
                <input
                  type="text"
                  value={townForm.groupName}
                  onChange={(event) => setTownForm({ ...townForm, groupName: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="태초마을"
                />
              </div>

              {!editingTown && (
              <label className="flex items-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={townForm.isDefaultTown}
                  onChange={(event) => setTownForm({ ...townForm, isDefaultTown: event.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Star size={16} className={townForm.isDefaultTown ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                <span className="text-sm font-semibold text-gray-800">기본 마을로 설정</span>
              </label>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveTown}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
              >
                {editingTown ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTownModal(false);
                  resetTownForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingPlace ? '장소 수정' : '장소 추가'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPlaceModal(false);
                  setEditingPlace(null);
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">장소 이름</label>
                <input
                  type="text"
                  value={placeForm.name}
                  onChange={(event) => setPlaceForm({ ...placeForm, name: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-lime-600 focus:outline-none"
                  placeholder="예: 풀숲, 물가, 바위틈"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">기본 조우율 (%)</label>
                <input
                  type="number"
                  value={placeForm.encounterRate}
                  onChange={(event) => setPlaceForm({ ...placeForm, encounterRate: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-lime-600 focus:outline-none"
                  min="0"
                  max="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">최소 레벨</label>
                  <input
                    type="number"
                    value={placeForm.minLevel}
                    onChange={(event) => setPlaceForm({ ...placeForm, minLevel: event.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-lime-600 focus:outline-none"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">최대 레벨</label>
                  <input
                    type="number"
                    value={placeForm.maxLevel}
                    onChange={(event) => setPlaceForm({ ...placeForm, maxLevel: event.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-lime-600 focus:outline-none"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSavePlace}
                className="flex-1 bg-lime-700 text-white py-3 rounded-lg font-bold hover:bg-lime-800 transition-colors"
              >
                {editingPlace ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPlaceModal(false);
                  setEditingPlace(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">새 지역 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">지역 이름</label>
                <input
                  type="text"
                  value={newRegionForm.name}
                  onChange={(event) => setNewRegionForm({ ...newRegionForm, name: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="예: 상록숲"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">설명 (선택)</label>
                <input
                  type="text"
                  value={newRegionForm.description}
                  onChange={(event) => setNewRegionForm({ ...newRegionForm, description: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="예: 초보 트레이너를 위한 숲"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">마을 카테고리</label>
                <select
                  value={newRegionForm.groupId}
                  onChange={(event) => setNewRegionForm({ ...newRegionForm, groupId: event.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">미분류</option>
                  {towns.map((town) => (
                    <option key={town.groupId} value={town.groupId}>
                      {town.groupName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">조우율 (%)</label>
                  <input
                    type="number"
                    value={newRegionForm.encounterRate}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, encounterRate: parseInt(event.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">색상</label>
                  <input
                    type="color"
                    value={newRegionForm.color}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, color: event.target.value })}
                    className="w-full h-10 px-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">최소 레벨</label>
                  <input
                    type="number"
                    value={newRegionForm.minLevel}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, minLevel: parseInt(event.target.value, 10) || 1 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">최대 레벨</label>
                  <input
                    type="number"
                    value={newRegionForm.maxLevel}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, maxLevel: parseInt(event.target.value, 10) || 1 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">지도 X좌표 (%)</label>
                  <input
                    type="number"
                    value={newRegionForm.x}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, x: parseInt(event.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">지도 Y좌표 (%)</label>
                  <input
                    type="number"
                    value={newRegionForm.y}
                    onChange={(event) => setNewRegionForm({ ...newRegionForm, y: parseInt(event.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleAddRegion}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                추가
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">지역 수정</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">지역 이름</label>
                <input
                  type="text"
                  value={editRegionForm.name}
                  onChange={(e) => setEditRegionForm({ ...editRegionForm, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">설명 (선택)</label>
                <input
                  type="text"
                  value={editRegionForm.description}
                  onChange={(e) => setEditRegionForm({ ...editRegionForm, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">마을 카테고리</label>
                <select
                  value={editRegionForm.groupId}
                  onChange={(e) => setEditRegionForm({ ...editRegionForm, groupId: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">미분류</option>
                  {towns.map((town) => (
                    <option key={town.groupId} value={town.groupId}>{town.groupName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">조우율 (%)</label>
                  <input
                    type="number"
                    value={editRegionForm.encounterRate}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, encounterRate: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0" max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">색상</label>
                  <input
                    type="color"
                    value={editRegionForm.color}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, color: e.target.value })}
                    className="w-full h-10 px-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">최소 레벨</label>
                  <input
                    type="number"
                    value={editRegionForm.minLevel}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, minLevel: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="1" max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">최대 레벨</label>
                  <input
                    type="number"
                    value={editRegionForm.maxLevel}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, maxLevel: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="1" max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">지도 X좌표 (%)</label>
                  <input
                    type="number"
                    value={editRegionForm.x}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, x: parseFloat(e.target.value) || 50 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0" max="100" step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">지도 Y좌표 (%)</label>
                  <input
                    type="number"
                    value={editRegionForm.y}
                    onChange={(e) => setEditRegionForm({ ...editRegionForm, y: parseFloat(e.target.value) || 50 })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0" max="100" step="0.1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const { _region, ...fields } = editRegionForm;
                  onUpdateRegion?.(_region.id, { ..._region, ...fields });
                  setShowEditModal(false);
                }}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
