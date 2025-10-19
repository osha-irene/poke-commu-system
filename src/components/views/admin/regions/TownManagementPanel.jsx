// src/components/views/admin/regions/TownManagementPanel.jsx
import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Star, Eye, EyeOff } from 'lucide-react';

export default function TownManagementPanel({ towns, regions, onToggleVisibility, onCreateTown, onUpdateTown, onDeleteTown }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTown, setEditingTown] = useState(null);
  const [townForm, setTownForm] = useState({
    groupId: '',
    groupName: '',
    x: 50,
    y: 50,
    color: '#10b981',
    isDefaultTown: false
  });

  const handleCreateTown = () => {
    if (!townForm.groupId || !townForm.groupName) {
      alert('마을 ID와 이름을 입력해주세요!');
      return;
    }

    // 중복 체크
    const existingTown = towns.find(t => t.groupId === townForm.groupId);
    if (existingTown) {
      alert('이미 존재하는 마을 ID입니다!');
      return;
    }

    onCreateTown(townForm);
    setShowCreateModal(false);
    setTownForm({
      groupId: '',
      groupName: '',
      x: 50,
      y: 50,
      color: '#10b981',
      isDefaultTown: false
    });
  };

  const handleEditTown = (town) => {
    setEditingTown(town);
    setTownForm({
      groupId: town.groupId,
      groupName: town.groupName,
      x: town.x,
      y: town.y,
      color: town.color || '#10b981',
      isDefaultTown: town.isDefaultTown || false
    });
    setShowCreateModal(true);
  };

  const handleUpdateTown = () => {
    if (!townForm.groupId || !townForm.groupName) {
      alert('마을 ID와 이름을 입력해주세요!');
      return;
    }

    onUpdateTown(editingTown.groupId, townForm);
    setShowCreateModal(false);
    setEditingTown(null);
    setTownForm({
      groupId: '',
      groupName: '',
      x: 50,
      y: 50,
      color: '#10b981',
      isDefaultTown: false
    });
  };

  const handleDeleteTown = (town) => {
    const areaCount = regions.filter(r => r.groupId === town.groupId).length;
    
    if (areaCount > 0) {
      if (!window.confirm(`"${town.groupName}"에 ${areaCount}개의 구역이 연결되어 있습니다.\n마을을 삭제하면 모든 구역의 마을 연결이 해제됩니다.\n\n정말 삭제하시겠습니까?`)) {
        return;
      }
    } else {
      if (!window.confirm(`"${town.groupName}"을(를) 삭제하시겠습니까?`)) {
        return;
      }
    }

    onDeleteTown(town.groupId);
  };

  

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MapPin size={22} />
              마을 관리
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              마을을 생성하고 지도 표시 여부를 설정합니다
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTown(null);
              setShowCreateModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
          >
            <Plus size={18} />
            새 마을 만들기
          </button>
        </div>

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
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg text-gray-800">{town.groupName}</h4>
                    {town.isDefaultTown && (
                      <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {town.areaCount}개 구역 | ID: {town.groupId}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: town.color || '#e5e7eb' }}
                >
                  <MapPin size={20} className="text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onToggleVisibility(town.groupId)}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    town.visible
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-400 text-white hover:bg-gray-500'
                  }`}
                >
                  {town.visible ? (
                    <>
                      <Eye size={16} />
                      지도에 표시 중
                    </>
                  ) : (
                    <>
                      <EyeOff size={16} />
                      지도에서 숨김
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTown(town)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <Edit2 size={14} />
                    편집
                  </button>
                  <button
                    onClick={() => handleDeleteTown(town)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                좌표: ({town.x}%, {town.y}%)
              </div>
            </div>
          ))}

          {towns.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
              <p>설정된 마을이 없습니다.</p>
              <p className="text-sm mt-2">새 마을 만들기 버튼을 눌러 마을을 추가하세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 마을 생성/수정 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingTown ? '마을 수정' : '새 마을 만들기'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">마을 ID</label>
                <input
                  type="text"
                  value={townForm.groupId}
                  onChange={(e) => setTownForm({...townForm, groupId: e.target.value})}
                  disabled={!!editingTown}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                  placeholder="pallet_town"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingTown ? 'ID는 수정할 수 없습니다' : '영문, 숫자, 언더스코어만 사용'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">마을 이름</label>
                <input
                  type="text"
                  value={townForm.groupName}
                  onChange={(e) => setTownForm({...townForm, groupName: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="태초마을"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">지도 X좌표 (%)</label>
                  <input
                    type="number"
                    value={townForm.x}
                    onChange={(e) => setTownForm({...townForm, x: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">지도 Y좌표 (%)</label>
                  <input
                    type="number"
                    value={townForm.y}
                    onChange={(e) => setTownForm({...townForm, y: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">마을 색상</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={townForm.color}
                    onChange={(e) => setTownForm({...townForm, color: e.target.value})}
                    className="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={townForm.color}
                    onChange={(e) => setTownForm({...townForm, color: e.target.value})}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={townForm.isDefaultTown}
                    onChange={(e) => setTownForm({...townForm, isDefaultTown: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Star size={16} className={townForm.isDefaultTown ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">기본 마을로 설정</span>
                      <p className="text-xs text-gray-600">
                        마을 보기 모드에서 처음 표시되는 마을입니다
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingTown ? handleUpdateTown : handleCreateTown}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                {editingTown ? '수정' : '만들기'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTown(null);
                  setTownForm({
                    groupId: '',
                    groupName: '',
                    x: 50,
                    y: 50,
                    color: '#10b981',
                    isDefaultTown: false
                  });
                }}
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