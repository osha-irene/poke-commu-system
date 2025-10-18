// src/components/views/admin/regions/GroupSettingsPanel.jsx
import React, { useState, useEffect } from 'react';
import { Save, Trash2, MapPin } from 'lucide-react';

export default function GroupSettingsPanel({ region, towns = [], onUpdateRegion }) {
  const [groupForm, setGroupForm] = useState({
    groupId: region.groupId || '',
    areaName: region.areaName || ''
  });

  useEffect(() => {
    setGroupForm({
      groupId: region.groupId || '',
      areaName: region.areaName || ''
    });
  }, [region]);

  // 안전한 체크 추가
  const selectedTown = Array.isArray(towns) 
    ? towns.find(t => t.groupId === groupForm.groupId) 
    : null;

  const handleSave = async () => {
    if (!groupForm.groupId) {
      alert('마을을 선택해주세요!');
      return;
    }

    // 안전한 체크 추가
    const town = Array.isArray(towns) 
      ? towns.find(t => t.groupId === groupForm.groupId)
      : null;
      
    if (!town) {
      alert('선택한 마을을 찾을 수 없습니다!');
      return;
    }

    const updatedRegion = {
      ...region,
      groupId: town.groupId,
      groupName: town.groupName,
      areaName: groupForm.areaName || region.name,
      x: town.x,
      y: town.y,
      color: town.color,
      isDefaultTown: town.isDefaultTown,
      groupVisible: town.visible,
      name: groupForm.areaName 
        ? `${town.groupName} - ${groupForm.areaName}`
        : region.name
    };

    await onUpdateRegion(region.id, updatedRegion);
    alert('마을/구역 설정이 저장되었습니다!');
  };

  const handleRemoveGroup = async () => {
    if (!window.confirm('정말 마을 연결을 해제하시겠습니까?\n지도의 마을 모드에서 이 구역이 표시되지 않습니다.')) {
      return;
    }

    const updatedRegion = {
      ...region,
      groupId: null,
      groupName: null,
      areaName: null,
      isDefaultTown: false,
      groupVisible: true
    };

    await onUpdateRegion(region.id, updatedRegion);
    setGroupForm({ groupId: '', areaName: '' });
    alert('마을 연결이 해제되었습니다!');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-700">
            소속 마을 선택
          </label>
          <select
            value={groupForm.groupId}
            onChange={(e) => setGroupForm({...groupForm, groupId: e.target.value})}
            className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
          >
            <option value="">마을 선택...</option>
            {Array.isArray(towns) && towns.map(town => (
              <option key={town.groupId} value={town.groupId}>
                {town.groupName} {town.isDefaultTown ? '⭐' : ''}
              </option>
            ))}
          </select>
          {(!towns || towns.length === 0) && (
            <p className="text-xs text-red-600 mt-1">
              마을을 먼저 생성해주세요
            </p>
          )}
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
          <p className="text-xs text-gray-500 mt-1">
            비워두면 원래 이름 사용
          </p>
        </div>
      </div>

      {selectedTown && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedTown.color }}
            >
              <MapPin size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {selectedTown.groupName}
                {selectedTown.isDefaultTown && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    기본 마을
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                좌표: ({selectedTown.x}%, {selectedTown.y}%) | 
                구역: {selectedTown.areaCount || 0}개 | 
                {selectedTown.visible ? '지도 표시 중' : '지도에서 숨김'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!groupForm.groupId}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-bold text-sm
                   hover:bg-purple-700 transition-colors flex items-center justify-center gap-2
                   disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            연결 해제
          </button>
        )}
      </div>

      {region.groupId && (
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <p className="text-xs text-green-800">
            현재: {region.groupName} - {region.areaName || region.name}
          </p>
        </div>
      )}
    </div>
  );
}