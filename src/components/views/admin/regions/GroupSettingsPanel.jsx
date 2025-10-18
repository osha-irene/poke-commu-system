
import React, { useState } from 'react';
import { Save, Trash2, MapPin } from 'lucide-react';

export default function GroupSettingsPanel({ region, onUpdateRegion }) {
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
