
import React from 'react';
import { MapPin } from 'lucide-react';

export default function TownManagementPanel({ towns, onToggleVisibility }) {
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
