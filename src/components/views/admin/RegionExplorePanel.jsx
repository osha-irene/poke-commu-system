// src/components/views/admin/RegionExplorePanel.jsx
import React, { useState, useMemo } from 'react';
import { MapPin, Settings, Gift, Package, ChevronRight, Save, Coins, Apple, TreePine, Search, TrendingUp, Percent, X, Plus, Sparkles, ChevronDown, Trash2 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('regions');

  const handleRegionClick = (region) => {
    const sanitizedRegion = {
      ...region,
      pokemons: Array.isArray(region.pokemons) ? region.pokemons : []
    };
    setSelectedRegion(sanitizedRegion);
    setEditMode(null);
  };

  const groupedRegions = useMemo(() => {
    return regions.reduce((acc, region) => {
      const group = region.groupName || '미분류';
      if (!acc[group]) acc[group] = [];
      acc[group].push(region);
      return acc;
    }, {});
  }, [regions]);

  const towns = useMemo(() => {
    const townMap = new Map();
    regions.forEach(region => {
      if (region.groupId && region.groupName) {
        if (!townMap.has(region.groupId)) {
          townMap.set(region.groupId, {
            groupId: region.groupId,
            groupName: region.groupName,
            visible: region.groupVisible !== false,
            areaCount: 0,
            x: region.x,
            y: region.y,
            color: region.color
          });
        }
        townMap.get(region.groupId).areaCount++;
      }
    });
    return Array.from(townMap.values());
  }, [regions]);

  const handleToggleTownVisibility = async (groupId) => {
    const town = towns.find(t => t.groupId === groupId);
    const newVisibility = !town.visible;

    const townRegions = regions.filter(r => r.groupId === groupId);
    for (const region of townRegions) {
      await onUpdateRegion(region.id, {
        ...region,
        groupVisible: newVisibility
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={22} />
              지역 & 탐험 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              각 지역의 그룹 설정, 출현 포켓몬, 탐험 보상을 관리합니다
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('regions')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'regions'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              지역별 관리
            </button>
            <button
              onClick={() => setViewMode('towns')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'towns'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              마을별 관리
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'towns' ? (
        <TownManagementView 
          towns={towns}
          onToggleVisibility={handleToggleTownVisibility}
        />
      ) : (
        <RegionManagementView
          groupedRegions={groupedRegions}
          selectedRegion={selectedRegion}
          editMode={editMode}
          onRegionClick={handleRegionClick}
          onUpdateRegion={onUpdateRegion}
          onUpdateRegionLootConfig={onUpdateRegionLootConfig}
          setEditMode={setEditMode}
        />
      )}
    </div>
  );
}

function TownManagementView({ towns, onToggleVisibility }) {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MapPin size={22} />
        마을 표시 관리
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        지도에서 표시할 마을을 선택하세요. 숨김 처리된 마을은 지도에 나타나지 않습니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {towns.map(town => (
          <div
            key={town.groupId}
            className={`border-2 rounded-lg p-4 transition-all ${
              town.visible
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-800">{town.groupName}</h4>
                <p className="text-sm text-gray-600">
                  {town.areaCount}개 구역 | ID: {town.groupId}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: town.color || '#e5e7eb' }}
              >
                <MapPin size={20} className="text-white" />
              </div>
            </div>

            <button
              onClick={() => onToggleVisibility(town.groupId)}
              className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                town.visible
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              {town.visible ? '✓ 지도에 표시 중' : '✕ 지도에서 숨김'}
            </button>

            <div className="mt-2 text-xs text-gray-500">
              좌표: ({town.x}%, {town.y}%)
            </div>
          </div>
        ))}

        {towns.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
            <p>설정된 마을이 없습니다.</p>
            <p className="text-sm mt-2">지역별 관리에서 마을 그룹을 설정해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RegionManagementView({ 
  groupedRegions, 
  selectedRegion, 
  editMode,
  onRegionClick, 
  onUpdateRegion,
  onUpdateRegionLootConfig,
  setEditMode 
}) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b-2 border-gray-200 p-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <MapPin size={20} />
              지역 목록 ({Object.values(groupedRegions).flat().length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {Object.entries(groupedRegions).map(([groupName, groupRegions]) => (
              <div key={groupName}>
                <div className="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700 sticky top-0 z-10">
                  {groupName} ({groupRegions.length})
                </div>
                {groupRegions.map(region => {
                  const isSelected = selectedRegion?.id === region.id;
                  const hasLootConfig = region.lootConfig && Object.keys(region.lootConfig).length > 0;
                  
                  return (
                    <button
                      key={region.id}
                      onClick={() => onRegionClick(region)}
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
                              조우율: {region.encounterRate || 0}%
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
            ))}
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
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{selectedRegion.name}</h3>
              
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <MapPin size={18} />
                  마을/구역 설정
                </h4>
                <GroupSettingsPanel
                  region={selectedRegion}
                  onUpdateRegion={onUpdateRegion}
                />
              </div>

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
                    {selectedRegion.encounterRate || 0}%
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
                  탐험 보상
                </button>
              </div>
            </div>

            {editMode === 'pokemon' && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <p className="text-gray-600">PokemonSettingsPanel 컴포넌트가 여기 들어갑니다</p>
              </div>
            )}

            {editMode === 'loot' && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <p className="text-gray-600">LootSettingsPanel 컴포넌트가 여기 들어갑니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupSettingsPanel({ region, onUpdateRegion }) {
  const [groupForm, setGroupForm] = useState({
    groupId: region.groupId || '',
    groupName: region.groupName || '',
    areaName: region.areaName || ''
  });

  const handleSave = async () => {
    if (!groupForm.groupId || !groupForm.groupName || !groupForm.areaName) {
      alert('모든 필드를 입력해주세요!');
      return;
    }

    const updatedRegion = {
      ...region,
      groupId: groupForm.groupId,
      groupName: groupForm.groupName,
      areaName: groupForm.areaName,
      name: `${groupForm.groupName} - ${groupForm.areaName}`
    };

    await onUpdateRegion(region.id, updatedRegion);
    alert('그룹 설정이 저장되었습니다!');
  };

  const handleRemoveGroup = async () => {
    if (!window.confirm('정말 그룹을 해제하시겠습니까?\n지도에서 이 지역이 표시되지 않습니다.')) {
      return;
    }

    const updatedRegion = {
      ...region,
      groupId: null,
      groupName: null,
      areaName: null
    };

    await onUpdateRegion(region.id, updatedRegion);
    setGroupForm({ groupId: '', groupName: '', areaName: '' });
    alert('그룹이 해제되었습니다!');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">
            마을 ID
          </label>
          <input
            type="text"
            value={groupForm.groupId}
            onChange={(e) => setGroupForm({...groupForm, groupId: e.target.value})}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            placeholder="pallet_town"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">
            마을 이름
          </label>
          <input
            type="text"
            value={groupForm.groupName}
            onChange={(e) => setGroupForm({...groupForm, groupName: e.target.value})}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            placeholder="태초마을"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">
            구역 이름
          </label>
          <input
            type="text"
            value={groupForm.areaName}
            onChange={(e) => setGroupForm({...groupForm, areaName: e.target.value})}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            placeholder="초원"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-bold text-sm
                   hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} />
          저장
        </button>

        {region.groupId && (
          <button
            onClick={handleRemoveGroup}
            className="px-4 bg-red-600 text-white py-2 rounded-lg font-bold text-sm
                     hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            해제
          </button>
        )}
      </div>

      {region.groupId && (
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <p className="text-xs text-green-800">
            현재: {region.groupName} - {region.areaName}
          </p>
        </div>
      )}
    </div>
  );
}