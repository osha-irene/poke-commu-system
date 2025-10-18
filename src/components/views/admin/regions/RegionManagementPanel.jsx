// src/components/views/admin/panels/RegionManagementPanel.jsx
import React, { useState } from 'react';
import { MapPin, Settings, Gift, Package, ChevronRight, Percent, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import GroupSettingsPanel from './GroupSettingsPanel';
import PokemonSettingsPanel from './PokemonSettingsPanel';
import LootSettingsPanel from './LootSettingsPanel';

export default function RegionManagementPanel({ 
  regions,
  groupedRegions, 
  selectedRegion, 
  editMode,
  allItems,
  onRegionClick, 
  onUpdateRegion,
  onUpdateRegionLootConfig,
  onAddRegion,
  onDeleteRegion,
  setEditMode 
}) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRegionForm, setNewRegionForm] = useState({
    name: '',
    description: '',
    encounterRate: 90,
    minLevel: 5,
    maxLevel: 20,
    x: 50,
    y: 50,
    color: '#87CEEB'
  });

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleAddRegion = () => {
    if (!newRegionForm.name) {
      alert('지역 이름을 입력해주세요!');
      return;
    }

    const newRegion = {
      id: `region_${Date.now()}`,
      ...newRegionForm,
      pokemons: [],
      pokemonRates: {},
      shinyRate: 4096
    };

    onAddRegion(newRegion);
    setShowAddModal(false);
    setNewRegionForm({
      name: '',
      description: '',
      encounterRate: 90,
      minLevel: 5,
      maxLevel: 20,
      x: 50,
      y: 50,
      color: '#87CEEB'
    });
    alert('새 지역이 추가되었습니다!');
  };

  const handleDeleteRegion = (region) => {
    if (window.confirm(`"${region.name}" 지역을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      onDeleteRegion(region.id);
      alert('지역이 삭제되었습니다.');
    }
  };

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b-2 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MapPin size={20} />
                  지역 목록 ({regions.length})
                </h3>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                  title="새 지역 추가"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedRegions).map(([groupName, groupRegions]) => {
                const isExpanded = expandedGroups[groupName] !== false;
                
                return (
                  <div key={groupName}>
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700 sticky top-0 z-10 hover:bg-gray-200 transition-colors flex items-center justify-between"
                    >
                      <span>{groupName} ({groupRegions.length})</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {isExpanded && groupRegions.map(region => {
                      const isSelected = selectedRegion?.id === region.id;
                      const hasLootConfig = region.lootConfig && Object.keys(region.lootConfig).length > 0;
                      
                      return (
                        <div
                          key={region.id}
                          className={`relative group ${
                            isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                          }`}
                        >
                          <button
                            onClick={() => onRegionClick(region)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
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
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRegion(region);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-1.5 rounded hover:bg-red-700"
                            title="지역 삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
                  <h3 className="text-2xl font-bold text-gray-800">{selectedRegion.name}</h3>
                  <button
                    onClick={() => handleDeleteRegion(selectedRegion)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    지역 삭제
                  </button>
                </div>
                
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
                <PokemonSettingsPanel
                  region={selectedRegion}
                  onUpdateRegion={onUpdateRegion}
                />
              )}

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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Plus size={24} />
              새 지역 추가
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">지역 이름 *</label>
                <input
                  type="text"
                  value={newRegionForm.name}
                  onChange={(e) => setNewRegionForm({...newRegionForm, name: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="예: 상록숲"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">설명</label>
                <input
                  type="text"
                  value={newRegionForm.description}
                  onChange={(e) => setNewRegionForm({...newRegionForm, description: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="예: 울창한 숲"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">조우율 (%)</label>
                  <input
                    type="number"
                    value={newRegionForm.encounterRate}
                    onChange={(e) => setNewRegionForm({...newRegionForm, encounterRate: parseInt(e.target.value)})}
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
                    onChange={(e) => setNewRegionForm({...newRegionForm, color: e.target.value})}
                    className="w-full h-10 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">최소 레벨</label>
                  <input
                    type="number"
                    value={newRegionForm.minLevel}
                    onChange={(e) => setNewRegionForm({...newRegionForm, minLevel: parseInt(e.target.value)})}
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
                    onChange={(e) => setNewRegionForm({...newRegionForm, maxLevel: parseInt(e.target.value)})}
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
                    onChange={(e) => setNewRegionForm({...newRegionForm, x: parseInt(e.target.value)})}
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
                    onChange={(e) => setNewRegionForm({...newRegionForm, y: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddRegion}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                추가
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}