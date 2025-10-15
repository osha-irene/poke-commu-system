// src/components/views/admin/member/MemberInfoTab.jsx
import React, { useState } from 'react';

function MemberInfoTab({ 
  member, 
  trainer, 
  regions,
  onResetWalk, 
  onToggleAdmin,
  onUpdateMoney, 
  onUpdateRegionAccess,
  onUpdateWalkCount,
  onUpdateMaxWalkCount  // ⭐ 최대 탐험횟수 업데이트 prop 추가
}) {
  const [moneyInput, setMoneyInput] = useState(member.money || 0);
  const [selectedRegions, setSelectedRegions] = useState(member.accessibleRegions || []);
  const [editWalkCount, setEditWalkCount] = useState(member.dailyWalks);
  const [editMaxWalkCount, setEditMaxWalkCount] = useState(member.maxDailyWalks); // ⭐ 추가

  const handleToggleRegion = (regionId) => {
    setSelectedRegions(prev => {
      if (prev.includes(regionId)) {
        return prev.filter(id => id !== regionId);
      } else {
        return [...prev, regionId];
      }
    });
  };

  const handleSelectAllRegions = () => {
    setSelectedRegions([]);
  };

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-bold text-lg mb-4">📋 기본 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">회원 ID:</span>
            <span className="ml-2 font-medium">{member.id}</span>
          </div>
          <div>
            <span className="text-gray-600">이름:</span>
            <span className="ml-2 font-medium">{member.name}</span>
          </div>
          <div>
            <span className="text-gray-600">포켓몬 수:</span>
            <span className="ml-2 font-medium">{member.caughtPokemon.filter(p => p !== null).length}마리</span>
          </div>

          {/* ⭐ 오늘의 탐험횟수 수정 */}
          <div className="col-span-2 space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              🚶 오늘의 탐험 횟수
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="999"
                value={editWalkCount}
                onChange={(e) => setEditWalkCount(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">/ {member.maxDailyWalks}회</span>
              <button
                onClick={() => {
                  if (onUpdateWalkCount) {
                    onUpdateWalkCount(member.id, editWalkCount);
                    alert(`${member.name}님의 탐험횟수가 ${editWalkCount}회로 변경되었습니다!`);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                적용
              </button>
            </div>
          </div>

          {/* ⭐ 최대 탐험횟수 수정 */}
          <div className="col-span-2 space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              ⚙️ 최대 탐험 횟수 (일일 제한)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="999"
                value={editMaxWalkCount}
                onChange={(e) => setEditMaxWalkCount(parseInt(e.target.value) || 5)}
                className="w-24 px-3 py-2 border border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">회</span>
              <button
                onClick={() => {
                  if (onUpdateMaxWalkCount) {
                    onUpdateMaxWalkCount(member.id, editMaxWalkCount);
                    alert(`${member.name}님의 최대 탐험횟수가 ${editMaxWalkCount}회로 변경되었습니다!`);
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                적용
              </button>
            </div>
            <p className="text-xs text-gray-500">
              💡 이 회원이 하루에 탐험할 수 있는 최대 횟수를 설정합니다
            </p>
          </div>
        </div>
      </div>

      {/* 소지금액 관리 */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          💰 소지금액 관리
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              현재 금액: <span className="text-yellow-600 font-bold text-lg">{member.money?.toLocaleString() || 0}원</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={moneyInput}
                onChange={(e) => setMoneyInput(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                placeholder="금액 입력"
                min="0"
              />
              <button
                onClick={() => {
                  onUpdateMoney(member.id, moneyInput);
                  alert(`${member.name}님의 소지금액이 ${moneyInput.toLocaleString()}원으로 변경되었습니다!`);
                }}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                변경
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMoneyInput(moneyInput + 1000)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              +1,000
            </button>
            <button
              onClick={() => setMoneyInput(moneyInput + 10000)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              +10,000
            </button>
            <button
              onClick={() => setMoneyInput(moneyInput + 100000)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              +100,000
            </button>
          </div>
        </div>
      </div>

      {/* 리전 접근 권한 관리 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          🗺️ 산책 구역 접근 권한
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {selectedRegions.length === 0 
            ? '✅ 현재 모든 구역에 접근 가능합니다.' 
            : `${selectedRegions.length}개 구역에만 접근 가능합니다.`}
        </p>
        
        <div className="mb-4">
          <button
            onClick={handleSelectAllRegions}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            모든 구역 허용
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
          {regions.map(region => {
            const isAccessible = selectedRegions.length === 0 || selectedRegions.includes(region.id);
            return (
              <button
                key={region.id}
                onClick={() => handleToggleRegion(region.id)}
                className={`p-3 rounded-lg border-2 transition-colors text-left ${
                  isAccessible
                    ? 'bg-blue-100 border-blue-400 text-blue-900'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{region.name}</span>
                  <span>{isAccessible ? '✅' : '❌'}</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            onUpdateRegionAccess(member.id, selectedRegions);
            alert(`${member.name}님의 구역 접근 권한이 업데이트되었습니다!`);
          }}
          className="w-full mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          권한 저장
        </button>
      </div>

      {/* 관리자 권한 */}
      <div className="space-y-3">
        <h3 className="font-bold">관리 기능</h3>
        <button 
          onClick={() => onResetWalk(member.id, member.name)} 
          className="w-full bg-green-100 text-green-700 py-3 rounded-lg hover:bg-green-200 font-semibold"
        >
          탐험 횟수 리셋
        </button>
        
        {trainer.isSuperAdmin && member.id !== 'admin' && (
          <button 
            onClick={() => onToggleAdmin(member.id, member.name)} 
            className={`w-full py-3 rounded-lg font-semibold ${
              member.isAdmin 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {member.isAdmin ? '관리자 권한 제거' : '관리자 권한 부여'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MemberInfoTab;